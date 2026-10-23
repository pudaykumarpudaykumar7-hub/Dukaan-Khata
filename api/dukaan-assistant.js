// Home-screen AI assistant endpoint. Configure OPENAI_API_KEY in the hosting provider's server environment.
const recentRequests = new Map();
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST for the assistant." });
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "The AI service is not configured yet." });

  const now = Date.now();
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  const recent = (recentRequests.get(ip) || []).filter(t => now - t < 10 * 60 * 1000);
  if (recent.length >= 12) return res.status(429).json({ error: "Please wait a few minutes before sending more questions." });
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
        instructions: "You are Dukaan AI, a fast, friendly assistant shown on the home screen of a shop-management app in India. Answer the customer's latest question directly and briefly. Help with general app navigation, khata, reports, backups, language, shop profile, and basic shop questions. You cannot see private account data or perform app actions. Never ask for passwords, OTPs, card/bank secrets, or private customer lists. Never claim a payment is verified; tell the user to confirm it in their bank/UPI app or configured provider. If a question needs this particular shop's prices, stock, order status, account access, a decision by the owner, or you are unsure, say so plainly and recommend the visible 'Ask the owner' option. Do not pretend to transfer the chat, notify the owner, or connect them automatically. Do not invent shop details.",
        input: messages.map(m => ({ role: m.role, content: m.content })),
        max_output_tokens: 450
      })
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return res.status(502).json({ error: "AI could not answer right now. Please try again or ask the owner." });
    const reply = Array.isArray(data.output)
      ? data.output.flatMap(item => Array.isArray(item.content) ? item.content : []).filter(item => item.type === "output_text").map(item => item.text).join("\n").trim()
      : "";
    if (!reply) return res.status(502).json({ error: "AI returned an empty answer. Please try again or ask the owner." });
    return res.status(200).json({ reply });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Invalid assistant request." });
  }
};
