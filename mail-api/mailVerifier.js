const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REACHER_URL = process.env.REACHER_URL ?? "http://localhost:8080";
const CHECK_TIMEOUT_MS = Number(process.env.MAIL_CHECK_TIMEOUT_MS ?? 45000);
const CONCURRENCY = Number(process.env.MAIL_CONCURRENCY ?? 3);

const MICROSOFT_MX =
  /mail\.protection\.outlook\.com|\.outlook\.com|\.ppe\.hosted\.protection\.outlook\.com/i;

let reacherAvailableCache = { value: null, checkedAt: 0 };
const REACH_CACHE_MS = 30_000;

function buildReacherPayload(email) {
  return { to_email: email };
}

/**
 * trust_level:
 *   verified   — high confidence (safe, or risky+deliverable on non-catch-all)
 *   invalid    — proven bad (does not exist, disposable)
 *   unverified — inconclusive (catch-all, M365 ambiguous, risky+not deliverable)
 *   blocked    — provider refused SMTP check
 *
 * legit (string):
 *   confirmed      — mailbox verified
 *   not_confirmed  — inconclusive (catch-all, M365, ambiguous SMTP)
 *   invalid        — proven bad (typo, doesn't exist, disposable)
 *   blocked        — provider refused the check
 *
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
      return resultRow(String(input), {
        legit: "invalid",
        reason: "invalid email syntax",
        reacher: null,
      });
    }

    const data = await fetchReacher(email);
    if (data.error) return data.result;

    return mapReacherResult(email, data);
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

async function fetchReacher(email) {
  try {
    const res = await fetch(`${REACHER_URL}/v0/check_email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildReacherPayload(email)),
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    });

    if (!res.ok) {
      const body = await res.text();
      return {
        error: true,
        result: resultRow(email, {
          legit: "blocked",
          reason: `Reacher HTTP ${res.status}`,
          reacher: { error: body },
        }),
      };
    }

    return await res.json();
  } catch (err) {
    return {
      error: true,
      result: resultRow(email, {
        legit: "blocked",
        reason: err.message ?? "Reacher request failed",
        reacher: null,
      }),
    };
  }
}

function mapReacherResult(email, data) {
  const trust_level = classifyTrust(data);
  const legit = trustToLegitLabel(trust_level);

  return resultRow(email, {
    legit,
    reason: buildReason(data, trust_level),
    reacher: pickReacherFields(data),
  });
}

function resultRow(email, fields) {
  return { email, ...fields };
}

function classifyTrust(data) {
  if (data.is_reachable === "invalid") return "invalid";
  if (data.misc?.is_disposable) return "invalid";
  if (data.smtp?.is_disabled && data.is_reachable === "invalid") return "invalid";

  if (isBlockedByProvider(data) || data.is_reachable === "unknown") {
    return "blocked";
  }

  if (data.is_reachable === "safe") return "verified";

  if (data.smtp?.is_catch_all) return "unverified";

  if (data.is_reachable === "risky" && data.smtp?.is_deliverable === true) {
    return "verified";
  }

  if (data.is_reachable === "risky") return "unverified";

  return "unverified";
}

function trustToLegitLabel(trust_level) {
  switch (trust_level) {
    case "verified":
      return "confirmed";
    case "invalid":
      return "invalid";
    case "blocked":
      return "blocked";
    default:
      return "not_confirmed";
  }
}

function buildReason(data, trust_level) {
  switch (trust_level) {
    case "verified":
      if (data.is_reachable === "safe") return "mailbox verified";
      if (data.misc?.is_role_account) return "role account — accepts mail";
      return "mailbox accepts mail";
    case "invalid":
      if (data.smtp?.is_disabled) return "mailbox disabled or does not exist";
      if (data.misc?.is_disposable) return "disposable email";
      return "mailbox does not exist";
    case "blocked":
      return "provider blocked verification";
    case "unverified":
      if (data.smtp?.is_catch_all) {
        return "catch-all domain — cannot verify this mailbox";
      }
      if (isMicrosoftMx(data)) {
        return "microsoft 365 — mailbox not confirmed via SMTP";
      }
      if (data.is_reachable === "risky" && data.smtp?.is_deliverable === false) {
        return "ambiguous SMTP response — mailbox not confirmed";
      }
      return "mailbox not confirmed";
    default:
      return "mailbox not confirmed";
  }
}

function isMicrosoftMx(data) {
  const records = data.mx?.records ?? [];
  return records.some((r) => MICROSOFT_MX.test(r));
}

function isBlockedByProvider(data) {
  const err = formatReacherError(data.smtp?.error) ?? "";
  return /policy reasons|dynamic ip|blacklist|do not accept email/i.test(err);
}

function formatReacherError(err) {
  if (!err) return null;
  if (typeof err === "string") return err;
  if (typeof err.message === "string") return err.message;
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
    { length: Math.min(concurrency, items.length || 1) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}
