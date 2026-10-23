// Vercel serverless endpoint for Dukaan Khata AI Help & Support.
// Set OPENAI_API_KEY in the Vercel project environment. Never place it in browser code.
const recentRequests = new Map();
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST for support chat." });
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "AI support is not configured yet." });

  const now = Date.now();
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  const bucket = recentRequests.get(ip) || [];
  const recent = bucket.filter(t => now - t < 10 * 60 * 1000);
  if (recent.length >= 12) return res.status(429).json({ error: "Too many messages. Please wait a few minutes and try again." });
  recent.push(now);
  recentRequests.set(ip, recent);

  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    if (!Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > 10) {
      return res.status(400).json({ error: "Send between 1 and 10 recent messages." });
    }
    const messages = body.messages.map(m => {
      if (!m || !["user", "assistant"].includes(m.role) || typeof m.content !== "string") throw new Error("Invalid message format.");
      const content = m.content.trim();
      if (!content || content.length > 1200) throw new Error("Each message must contain 1–1200 characters.");
      return { role: m.role, content };
    });
    if (messages[messages.length - 1].role !== "user") return res.status(400).json({ error: "The latest message must be from the user." });

    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        instructions: "You are Dukaan Khata's customer support assistant. Help with app navigation, customer Khata, reports, backups, language settings, shop profile, and general troubleshooting. Be clear, concise, and respectful. Never claim you can see the customer's account or records. Never request passwords, OTPs, full card or bank details, or private customer lists. Do not claim a payment is verified; direct users to their bank/UPI app and the configured payment provider. For account-specific, financial, legal, or unresolved issues, advise contacting the shop owner. Do not invent features or promise that an action was performed.",
        input: messages.map(m => ({ role: m.role, content: m.content })),
        max_output_tokens: 500
      })
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const status = upstream.status === 429 ? 429 : 502;
      return res.status(status).json({ error: upstream.status === 429 ? "AI service is busy. Please try again shortly." : "AI support could not answer right now." });
    }
    const reply = String(data.output_text || "").trim();
    if (!reply) return res.status(502).json({ error: "AI support returned no text." });
    return res.status(200).json({ reply });
  } catch (error) {
    const badRequest = /Invalid message|Each message/.test(String(error?.message || error));
    return res.status(badRequest ? 400 : 500).json({ error: badRequest ? String(error.message) : "AI support encountered an unexpected error." });
  }
};
