import "dotenv/config";
import express from "express";
import { checkEmails, isReacherHealthy } from "./mailVerifier.js";

const app = express();
const PORT = Number(process.env.MAIL_API_PORT ?? process.env.PORT ?? 3000);
const API_KEY = process.env.MAIL_API_KEY;
const MAX_BATCH = Number(process.env.MAIL_MAX_BATCH ?? 50);

app.use(express.json({ limit: "256kb" }));

app.get("/health", async (_req, res) => {
  const reacher = await isReacherHealthy();
  res.status(200).json({
    status: "ok",
    reacher,
  });
});

app.use((req, res, next) => {
  if (!API_KEY) {
    if (process.env.NODE_ENV === "production") {
      return res.status(503).json({ error: "MAIL_API_KEY is not configured" });
    }
    return next();
  }

  const key = req.headers["x-api-key"];
  if (key !== API_KEY) {
    return res.status(401).json({ error: "Invalid or missing x-api-key header" });
  }
  next();
});

/**
 * POST /verify
 * Body: { "emails": ["a@b.com", "c@d.com"] }
 *
 * Response:
 * {
 *   "results": [{ "email": "a@b.com", "legit": true, "reason": "mailbox verified", "reacher": {} }],
 *   "summary": { "total": 1, "legit": 1, "not_legit": 0 }
 * }
 */
app.post("/verify", async (req, res) => {
  try {
    const emails = normalizeEmailsInput(req.body);

    if (!emails.length) {
      return res.status(400).json({
        error: 'Request body must include a non-empty "emails" array',
      });
    }

    if (emails.length > MAX_BATCH) {
      return res.status(400).json({
        error: `Maximum ${MAX_BATCH} emails per request`,
      });
    }

    const { results } = await checkEmails(emails);

    const response = results.map(({ email, legit, reason, reacher }) => ({
      email,
      legit,
      reason,
      reacher,
    }));

    const legitCount = response.filter((r) => r.legit === true).length;

    res.status(200).json({
      results: response,
      summary: {
        total: response.length,
        legit: legitCount,
        not_legit: response.length - legitCount,
      },
    });
  } catch (err) {
    console.error("[mail-api] verify error:", err);
    if (err.message?.includes("Reacher is unavailable")) {
      return res.status(503).json({ error: err.message });
    }
    res.status(500).json({ error: "Email verification failed" });
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
  console.log(`Mail API listening on port ${PORT}`);
  if (!API_KEY) {
    console.warn("WARNING: MAIL_API_KEY not set — auth disabled (dev only)");
  }
});

function normalizeEmailsInput(body) {
  if (!body || typeof body !== "object") return [];

  const raw = body.emails ?? body.email;
  if (typeof raw === "string") return [raw];
  if (Array.isArray(raw)) return raw.filter((e) => e != null && String(e).trim());
  return [];
}
