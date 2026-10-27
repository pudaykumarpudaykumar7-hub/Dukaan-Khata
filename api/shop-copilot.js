// Dukaan Khata Shop Copilot — server-only OpenAI Responses API proxy.
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method not allowed" }); }
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: "Shop Copilot is not configured yet. Add OPENAI_API_KEY in Vercel Project Settings → Environment Variables, then redeploy." });
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const language = typeof body.language === "string" ? body.language.slice(0, 60) : "the language used by the owner";
  const history = Array.isArray(body.history) ? body.history.slice(-8).map(m => ({ role: m && m.role === "assistant" ? "assistant" : "user", content: typeof (m && m.content) === "string" ? m.content.slice(0, 1800) : "" })).filter(m => m.content) : [];
  if (!message) return res.status(400).json({ error: "Please type or speak a request." });
  if (message.length > 1800) return res.status(413).json({ error: "Please keep each request under 1,800 characters." });
  try {
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": "Bearer " + process.env.OPENAI_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        instructions: [
          "You are Dukaan Khata Shop Copilot, a practical assistant for an Indian shop owner.",
          "Always reply in " + language + " or match the language/script used by the owner.",
          "Help with stock planning, item/price lists, daily sales routines, customer follow-ups, WhatsApp draft messages, and bookkeeping workflows.",
          "Be concise and ask for missing details before proposing consequential changes.",
          "This preview has no connected app tools and cannot change records, add/delete items, record payments, call customers, or send WhatsApp messages.",
          "Never claim an action was performed. State that real changes require owner confirmation and app integration.",
          "Never request passwords, OTPs, payment PINs, or full bank credentials. Treat customer information as private."
        ].join("\n"),
        input: [...history, { role: "user", content: message }],
        max_output_tokens: 700
      })
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("Shop Copilot upstream error", upstream.status, data && data.error && data.error.code);
      return res.status(502).json({ error: "The AI service could not answer. Check the API key, billing, and model access in OpenAI Platform." });
    }
    const answer = (data.output || []).flatMap(item => item.content || []).filter(part => part.type === "output_text").map(part => part.text || "").join("\n").trim();
    if (!answer) return res.status(502).json({ error: "The AI service returned an empty reply. Please try again." });
    return res.status(200).json({ answer });
  } catch (error) {
    console.error("Shop Copilot request failed", error && error.name);
    return res.status(502).json({ error: "Could not reach the AI service. Please try again shortly." });
  }
};