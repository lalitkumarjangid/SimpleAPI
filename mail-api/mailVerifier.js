const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REACHER_URL = process.env.REACHER_URL ?? "http://localhost:8080";
const CHECK_TIMEOUT_MS = Number(process.env.MAIL_CHECK_TIMEOUT_MS ?? 45000);
const CONCURRENCY = Number(process.env.MAIL_CONCURRENCY ?? 3);

let reacherAvailableCache = { value: null, checkedAt: 0 };
const REACH_CACHE_MS = 30_000;

function buildReacherPayload(email) {
  return { to_email: email };
}

/**
 * legit = true  ONLY when Reacher confirms mailbox exists (is_reachable: safe)
 * legit = false → everything else (invalid, risky, catch-all, unknown, role accounts)
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
      return {
        email: String(input),
        legit: false,
        reason: "invalid email syntax",
        reacher: null,
      };
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
        result: {
          email,
          legit: false,
          reason: `Reacher HTTP ${res.status}`,
          reacher: { error: body },
        },
      };
    }

    return await res.json();
  } catch (err) {
    return {
      error: true,
      result: {
        email,
        legit: false,
        reason: err.message ?? "Reacher request failed",
        reacher: null,
      },
    };
  }
}

function mapReacherResult(email, data) {
  const legit = mapLegit(data);

  return {
    email,
    legit,
    reason: buildReason(data, legit),
    reacher: pickReacherFields(data),
  };
}

/**
 * Only Reacher "safe" means the mailbox is proven to exist.
 * Catch-all / risky / unknown may accept mail at SMTP layer but mailbox is NOT verified.
 */
function mapLegit(data) {
  return data.is_reachable === "safe";
}

function buildReason(data, legit) {
  if (legit) return "mailbox verified";

  if (data.is_reachable === "invalid") {
    if (data.smtp?.is_disabled) return "mailbox disabled or does not exist";
    if (data.misc?.is_disposable) return "disposable email";
    return "mailbox does not exist";
  }

  if (data.smtp?.is_catch_all) {
    return "catch-all domain — mailbox not verified";
  }
  if (data.misc?.is_role_account) {
    return "role account — mailbox not individually verified";
  }
  if (data.misc?.is_disposable) return "disposable email";
  if (isBlockedByProvider(data)) return "provider blocked verification";
  if (data.is_reachable === "unknown") return "could not verify";

  return `mailbox not verified (is_reachable: ${data.is_reachable})`;
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
