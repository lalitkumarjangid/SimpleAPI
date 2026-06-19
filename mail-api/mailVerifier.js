import dns from "node:dns/promises";
import net from "node:net";
import { randomUUID } from "node:crypto";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REACHER_URL = process.env.REACHER_URL ?? "http://localhost:8080";
const CHECK_TIMEOUT_MS = Number(process.env.MAIL_CHECK_TIMEOUT_MS ?? 45000);
const CONCURRENCY = Number(process.env.MAIL_CONCURRENCY ?? 3);

const ZOHO_MX = /(^|\.)zoho\.(com|in|eu|jp|com\.au|com\.cn)$/i;
const GOOGLE_MX =
  /(^|\.)(aspmx|alt\d\.aspmx|aspmx\d)\.(l\.google\.com|googlemail\.com)$/i;

let reacherAvailableCache = { value: null, checkedAt: 0 };
const REACH_CACHE_MS = 30_000;

function buildReacherPayload(email) {
  const payload = { to_email: email };

  const host = process.env.REACHER_PROXY_HOST;
  const port = process.env.REACHER_PROXY_PORT;
  if (host && port) {
    payload.proxy = {
      host,
      port: Number(port),
      ...(process.env.REACHER_PROXY_USERNAME && {
        username: process.env.REACHER_PROXY_USERNAME,
      }),
      ...(process.env.REACHER_PROXY_PASSWORD && {
        password: process.env.REACHER_PROXY_PASSWORD,
      }),
    };
  }

  return payload;
}

function toResult(email, tier, reason) {
  return {
    email,
    legit: tier === "verified",
    tier,
    reason,
  };
}

/**
 * @param {string[]} emails
 * @returns {Promise<{ results: object[], reacher: boolean }>}
 */
export async function checkEmails(emails) {
  const useReacher = await isReacherAvailable();
  const results = await mapConcurrent(emails, CONCURRENCY, async (input) => {
    const email = String(input).trim().toLowerCase();

    if (!email || !EMAIL_REGEX.test(email)) {
      return toResult(String(input), "invalid", "invalid format");
    }

    if (useReacher) {
      try {
        return await checkWithReacher(email);
      } catch {
        // fall through to SMTP
      }
    }

    return checkWithSmtp(email);
  });

  return { results, reacher: useReacher };
}

export async function isReacherHealthy() {
  return isReacherAvailable(true);
}

async function isReacherAvailable(force = false) {
  const now = Date.now();
  if (!force && reacherAvailableCache.value !== null && now - reacherAvailableCache.checkedAt < REACH_CACHE_MS) {
    return reacherAvailableCache.value;
  }

  try {
    const res = await fetch(`${REACHER_URL}/v0/check_email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildReacherPayload("ping@test.com")),
      signal: AbortSignal.timeout(5000),
    });
    const text = await res.text();
    const available = res.ok || text.includes("is_reachable");
    reacherAvailableCache = { value: available, checkedAt: now };
    return available;
  } catch {
    reacherAvailableCache = { value: false, checkedAt: now };
    return false;
  }
}

async function checkWithReacher(email) {
  const res = await fetch(`${REACHER_URL}/v0/check_email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildReacherPayload(email)),
    signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`Reacher HTTP ${res.status}`);
  }

  const data = await res.json();
  return mapReacherResult(email, data);
}

function mapReacherResult(email, data) {
  switch (data.is_reachable) {
    case "safe":
      return toResult(email, "verified", "mailbox verified");
    case "invalid":
      return toResult(email, "invalid", "mailbox not found");
    case "risky":
      if (data.smtp?.is_catch_all) {
        return toResult(email, "unknown", "catch-all domain");
      }
      if (data.misc?.is_disposable) {
        return toResult(email, "invalid", "disposable email");
      }
      if (data.misc?.is_role_account) {
        return toResult(email, "unknown", "role account");
      }
      return toResult(email, "unknown", "risky address");
    default:
      return toResult(email, "unknown", "could not verify");
  }
}

async function checkWithSmtp(email) {
  const domain = email.split("@")[1];

  let mxRecords;
  try {
    mxRecords = await dns.resolveMx(domain);
  } catch {
    return toResult(email, "invalid", "no mx records");
  }

  if (!mxRecords.length) {
    return toResult(email, "invalid", "no mx records");
  }

  const [row] = await verifyMailboxes(domain, [email], mxRecords);
  return row ?? toResult(email, "unknown", "smtp connection failed");
}

function isZohoMx(mxRecords) {
  return mxRecords.some(({ exchange }) => ZOHO_MX.test(exchange));
}

function isGoogleMx(mxRecords) {
  return mxRecords.some(({ exchange }) => GOOGLE_MX.test(exchange));
}

function filterMxRecords(mxRecords) {
  const google = mxRecords.filter(({ exchange }) => GOOGLE_MX.test(exchange));
  if (google.length) return google;
  return mxRecords;
}

function resolveSmtpResults(emails, smtpResult) {
  if (smtpResult.catchAll) {
    return emails.map((addr) => {
      const smtp = smtpResult.perEmail.find((e) => e.email === addr);
      if (smtp && !smtp.accepted) {
        return toResult(addr, "invalid", "mailbox not found");
      }
      return toResult(addr, "unknown", "catch-all domain");
    });
  }

  return emails.map((addr) => {
    const smtp = smtpResult.perEmail.find((e) => e.email === addr);
    if (smtp?.accepted) {
      return toResult(addr, "verified", "mailbox verified");
    }
    return toResult(addr, "invalid", "mailbox not found");
  });
}

async function verifyMailboxes(domain, emails, mxRecords) {
  const filtered = filterMxRecords(mxRecords);
  const sorted = [...filtered].sort((a, b) => a.priority - b.priority);
  const zoho = isZohoMx(mxRecords);
  const google = isGoogleMx(mxRecords);

  for (const { exchange } of sorted) {
    try {
      const smtpResult = await smtpVerify(exchange, domain, emails, { zoho, google });

      if (smtpResult.policyBlocked && zoho) {
        return emails.map((addr) => toResult(addr, "unknown", "zoho blocked verification"));
      }

      return resolveSmtpResults(emails, smtpResult);
    } catch {
      continue;
    }
  }

  return emails.map((addr) => toResult(addr, "unknown", "smtp connection failed"));
}

function isZohoPolicyRejection(line) {
  return /policy reasons|dynamic ip|do not accept email from dynamic/i.test(line);
}

function smtpVerify(host, domain, emails, { zoho, google }) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port: 25 });
    let buffer = "";
    const perEmail = [];
    const useDomainIdentity = zoho || google;
    const helo = useDomainIdentity ? domain : "mailcheck.local";
    const mailFrom = useDomainIdentity ? `verify@${domain}` : "check@mailcheck.local";

    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error("timeout"));
    }, 15000);

    socket.setEncoding("utf8");
    socket.on("data", (chunk) => {
      buffer += chunk;
    });
    socket.on("error", reject);

    (async () => {
      try {
        await readResponse();
        await sendCommand(`EHLO ${helo}`);

        for (const addr of emails) {
          await sendCommand("RSET");
          await sendCommand(`MAIL FROM:<${mailFrom}>`);
          const { code, line } = await sendCommand(`RCPT TO:<${addr}>`);

          if (zoho && isZohoPolicyRejection(line)) {
            clearTimeout(timer);
            socket.destroy();
            return resolve({ perEmail: [], policyBlocked: true, catchAll: false });
          }

          perEmail.push({
            email: addr,
            accepted: code >= 200 && code < 300,
          });
        }

        const catchAll = await isCatchAllDomain(sendCommand, mailFrom, domain);

        try {
          await sendCommand("QUIT");
        } catch {
          // ignore
        }

        clearTimeout(timer);
        socket.destroy();
        resolve({ perEmail, policyBlocked: false, catchAll });
      } catch (err) {
        clearTimeout(timer);
        socket.destroy();
        reject(err);
      }
    })();

    function readResponse() {
      return new Promise((res) => {
        const onData = () => {
          const lines = buffer.split(/\r\n/).filter(Boolean);
          let lastCode = null;
          let consumed = 0;

          for (let i = 0; i < lines.length; i++) {
            const m = lines[i].match(/^(\d{3})([\s-])/);
            if (!m) continue;
            consumed = i + 1;
            if (m[2] === " ") lastCode = Number(m[1]);
          }

          if (lastCode === null) return;

          buffer = lines.slice(consumed).join("\r\n");
          if (buffer) buffer += "\r\n";
          socket.off("data", onData);
          res({ code: lastCode, line: lines[consumed - 1] ?? "" });
        };

        socket.on("data", onData);
        onData();
      });
    }

    async function sendCommand(cmd) {
      socket.write(`${cmd}\r\n`);
      return readResponse();
    }
  });
}

async function isCatchAllDomain(sendCommand, mailFrom, domain) {
  const probes = [`${randomUUID()}@${domain}`, `not-real-${Date.now()}@${domain}`];

  for (const probe of probes) {
    await sendCommand("RSET");
    await sendCommand(`MAIL FROM:<${mailFrom}>`);
    const { code } = await sendCommand(`RCPT TO:<${probe}>`);
    if (code < 200 || code >= 300) return false;
  }

  return true;
}

async function mapConcurrent(items, concurrency, fn) {
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}
