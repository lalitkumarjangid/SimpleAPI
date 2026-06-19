const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REACHER_URL = process.env.REACHER_URL ?? "http://localhost:8080";
const CHECK_TIMEOUT_MS = Number(process.env.MAIL_CHECK_TIMEOUT_MS ?? 45000);
const CONCURRENCY = Number(process.env.MAIL_CONCURRENCY ?? 3);

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

/**
 * @param {string[]} emails
 * @returns {Promise<{ results: object[], reacher: boolean }>}
 */
export async function checkEmails(emails) {
  const reacherUp = await isReacherAvailable();

  if (!reacherUp) {
    throw new Error("Reacher is unavailable — start with: npm run reacher:up");
  }

  const results = await mapConcurrent(emails, CONCURRENCY, async (input) => {
    const email = String(input).trim().toLowerCase();

    if (!email || !EMAIL_REGEX.test(email)) {
      return formatInvalidSyntax(String(input));
    }

    return checkWithReacher(email);
  });

  return { results, reacher: true };
}

export async function isReacherHealthy() {
  return isReacherAvailable(true);
}

async function isReacherAvailable(force = false) {
  const now = Date.now();
  if (
    !force &&
    reacherAvailableCache.value !== null &&
    now - reacherAvailableCache.checkedAt < REACH_CACHE_MS
  ) {
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
    const body = await res.text();
    return {
      email,
      legit: null,
      reason: `Reacher HTTP ${res.status}`,
      reacher: { error: body },
    };
  }

  const data = await res.json();
  return mapReacherResult(email, data);
}

function mapReacherResult(email, data) {
  const reacher = pickReacherFields(data);

  return {
    email,
    legit: mapLegit(data.is_reachable),
    reason: buildReason(data),
    reacher,
  };
}

function formatInvalidSyntax(email) {
  return {
    email,
    legit: false,
    reason: "invalid syntax — not sent to Reacher",
    reacher: null,
  };
}

function mapLegit(isReachable) {
  if (isReachable === "safe") return true;
  if (isReachable === "invalid") return false;
  return null;
}

function buildReason(data) {
  const parts = [`is_reachable: ${data.is_reachable}`];

  if (data.smtp?.is_catch_all) parts.push("catch-all domain");
  if (data.smtp?.description) parts.push(data.smtp.description);
  if (data.smtp?.is_deliverable === false && data.smtp?.is_disabled) {
    parts.push("mailbox disabled");
  }
  if (data.smtp?.has_full_inbox) parts.push("inbox full");
  if (data.misc?.is_disposable) parts.push("disposable email");
  if (data.misc?.is_role_account) parts.push("role account");
  if (data.syntax && !data.syntax.is_valid_syntax) parts.push("invalid syntax");
  if (data.mx && !data.mx.accepts_mail) parts.push("no mx records");
  if (data.smtp?.is_deliverable === true && !data.smtp?.is_catch_all) {
    parts.push("mailbox deliverable");
  }
  const smtpErr = formatReacherError(data.smtp?.error);
  if (smtpErr) parts.push(smtpErr);
  const mxErr = formatReacherError(data.mx?.error);
  if (mxErr) parts.push(mxErr);

  return parts.join(" — ");
}

function formatReacherError(err) {
  if (!err) return null;
  if (typeof err === "string") return err;
  if (typeof err.message === "string") return err.message;
  if (typeof err.description === "string") return err.description;
  return null;
}

function pickReacherFields(data) {
  return {
    is_reachable: data.is_reachable,
    syntax: data.syntax ?? null,
    mx: data.mx ?? null,
    smtp: data.smtp ?? null,
    misc: data.misc ?? null,
  };
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
