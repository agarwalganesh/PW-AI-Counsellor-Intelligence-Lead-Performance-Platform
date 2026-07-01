/**
 * AI Counsellor Intelligence — Backend Email Server
 * --------------------------------------------------
 * Serves the static dashboard AND exposes an email API so the dashboard can
 * send AI-generated performance feedback to a counsellor's email via SMTP.
 *
 * SECURITY: SMTP credentials are read from environment variables (.env) — they
 * are NEVER hardcoded and .env is git-ignored. The send endpoint renders the
 * email body server-side from structured fields (it does NOT accept raw HTML
 * from the browser), so it can't be abused as an open HTML relay.
 *
 * Run:  npm install   then   npm start
 */

require("dotenv").config();
const path = require("path");
const express = require("express");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 8081;

app.use(express.json({ limit: "256kb" }));
// Serve the dashboard (index.html, app.js, styles.css, ...) from this folder.
// Caching disabled so code edits always show on reload (avoids stale-asset confusion).
app.use(
  express.static(__dirname, {
    etag: false,
    lastModified: false,
    setHeaders: (res) => res.setHeader("Cache-Control", "no-store"),
  })
);

// ── SMTP transporter (lazily built so the server still boots without creds) ──
function getSmtpConfig() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return {
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    // secure=true for 465 (SSL), false for 587/25 (STARTTLS)
    secure: String(process.env.SMTP_SECURE).toLowerCase() === "true" || Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  };
}

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  const cfg = getSmtpConfig();
  if (!cfg) return null;
  transporter = nodemailer.createTransport(cfg);
  return transporter;
}

// ── Tiny in-memory rate limiter (per IP) to avoid accidental floods ──
const HITS = new Map(); // ip -> [timestamps]
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 20;
function rateLimited(ip) {
  const now = Date.now();
  const arr = (HITS.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  HITS.set(ip, arr);
  return arr.length > MAX_PER_WINDOW;
}

// ── Helpers ──
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const ZONE_COLORS = { Green: "#16a34a", Yellow: "#d97706", Red: "#dc2626" };
const PRIORITY_COLORS = { High: "#dc2626", Medium: "#d97706", Low: "#2563eb" };

/** Render the feedback email body from structured (already-validated) fields. */
function renderFeedbackEmail({ counsellorName, riskZone, riskScore, summary, items }) {
  const zoneColor = ZONE_COLORS[riskZone] || "#6b7280";
  const itemsHtml = (items || [])
    .map((it) => {
      const pColor = PRIORITY_COLORS[it.priority] || "#2563eb";
      return `
      <tr><td style="padding:12px 0;border-top:1px solid #eee;">
        <div style="font-weight:600;color:#111;">${escapeHtml(it.subject)}
          <span style="font-size:11px;color:#fff;background:${pColor};border-radius:10px;padding:2px 8px;margin-left:6px;">${escapeHtml(it.priority)} Priority</span>
        </div>
        <div style="color:#444;font-size:14px;margin:4px 0;">${escapeHtml(it.desc)}</div>
        ${it.actionText ? `<div style="color:${pColor};font-size:13px;font-weight:600;">⚡ ${escapeHtml(it.actionText)}</div>` : ""}
      </td></tr>`;
    })
    .join("");

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;background:#fff;color:#111;">
    <div style="background:#0f172a;padding:20px 24px;border-radius:8px 8px 0 0;">
      <div style="color:#fff;font-size:18px;font-weight:700;">Counsellor.AI — Performance Feedback</div>
    </div>
    <div style="padding:24px;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px;">
      <p style="font-size:15px;">Hi ${escapeHtml(counsellorName) || "there"},</p>
      <p style="font-size:14px;color:#333;">
        Here is your latest AI-generated performance review based on your current activity and pipeline.
      </p>
      <div style="margin:16px 0;padding:12px 16px;background:#f8fafc;border-left:4px solid ${zoneColor};border-radius:4px;">
        <span style="font-weight:700;color:${zoneColor};">${escapeHtml(riskZone || "—")} Zone</span>
        ${riskScore != null ? `<span style="color:#666;font-size:13px;"> · Target-miss risk: ${escapeHtml(String(riskScore))}%</span>` : ""}
      </div>
      <p style="font-size:14px;color:#222;line-height:1.6;">${escapeHtml(summary)}</p>
      ${
        itemsHtml
          ? `<h3 style="font-size:15px;margin:20px 0 4px;">Recommended Actions</h3>
             <table style="width:100%;border-collapse:collapse;">${itemsHtml}</table>`
          : `<p style="font-size:14px;color:#16a34a;">✅ No corrective actions needed — keep up the great work!</p>`
      }
      <p style="font-size:12px;color:#999;margin-top:24px;border-top:1px solid #eee;padding-top:12px;">
        This is an automated message from the AI Counsellor Intelligence platform.
      </p>
    </div>
  </div>`;
}

// ── Routes ──
app.get("/api/health", (req, res) => {
  res.json({ ok: true, smtpConfigured: !!getSmtpConfig() });
});

app.post("/api/send-email", async (req, res) => {
  try {
    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    if (rateLimited(ip)) {
      return res.status(429).json({ ok: false, error: "Too many requests, slow down." });
    }

    const transport = getTransporter();
    if (!transport) {
      return res.status(503).json({
        ok: false,
        error:
          "Email is not configured. Copy .env.example to .env and fill in your SMTP credentials, then restart the server.",
      });
    }

    const { to, counsellorName, riskZone, riskScore, summary, items, subject } = req.body || {};

    if (!to || !EMAIL_RE.test(String(to))) {
      return res.status(400).json({ ok: false, error: "A valid recipient email ('to') is required." });
    }
    if (!summary && !(Array.isArray(items) && items.length)) {
      return res.status(400).json({ ok: false, error: "Nothing to send: 'summary' or 'items' required." });
    }

    // Normalise items to a safe shape.
    const safeItems = (Array.isArray(items) ? items : []).slice(0, 20).map((it) => ({
      subject: String(it.subject || "").slice(0, 200),
      priority: ["High", "Medium", "Low"].includes(it.priority) ? it.priority : "Medium",
      desc: String(it.desc || "").slice(0, 1000),
      actionText: String(it.actionText || "").slice(0, 200),
    }));

    const html = renderFeedbackEmail({
      counsellorName: String(counsellorName || "").slice(0, 120),
      riskZone: ["Green", "Yellow", "Red"].includes(riskZone) ? riskZone : "",
      riskScore: riskScore,
      summary: String(summary || "").slice(0, 4000),
      items: safeItems,
    });

    const fromName = process.env.FROM_NAME || "Counsellor.AI";
    const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER;

    const info = await transport.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: String(to),
      subject: String(subject || `Your AI Performance Feedback — ${counsellorName || ""}`).slice(0, 200),
      html,
    });

    return res.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    console.error("send-email error:", err);
    return res.status(500).json({ ok: false, error: err.message || "Failed to send email." });
  }
});

app.listen(PORT, () => {
  const configured = !!getSmtpConfig();
  console.log(`\n  Counsellor.AI server running → http://localhost:${PORT}`);
  console.log(`  Email API: POST /api/send-email   SMTP configured: ${configured ? "yes" : "NO (see .env.example)"}\n`);
});
