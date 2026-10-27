// Dukaan Khata Shop Copilot — Vercel serverless proxy.
// OPENAI_API_KEY is read only by this server function; never expose it to the browser.
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method not allowed" }); }
  const openaiKey = process.env.OPENAI_API_KEY;
  const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!openaiKey) return res.status(503).json({ error: "Shop Copilot is not configured yet. Add OPENAI_API_KEY in Vercel Environment Variables and redeploy." });
  if (!supabaseUrl || !supabaseAnonKey) return res.status(503).json({ error: "Owner authentication is not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY in Vercel Environment Variables." });
  const auth = String(req.headers.authorization || "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return res.status(401).json({ error: "owner_sign_in_required" });
  try {
    // Validate the caller's Supabase session server-side; do not trust a client-supplied owner ID.
    const verified = await fetch(supabaseUrl + "/auth/v1/user", {
      headers: { "Authorization": "Bearer " + token, "apikey": supabaseAnonKey }
    });
    if (!verified.ok) return res.status(401).json({ error: "invalid_or_expired_session" });
    const user = await verified.json().catch(() => null);
    if (!user || !user.id) return res.status(401).json({ error: "invalid_or_expired_session" });

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const language = typeof body.language === "string" ? body.language.slice(0, 60) : "English";
    if (!message) return res.status(400).json({ error: "Please type or speak a request." });
    if (message.length > 1800) return res.status(413).json({ error: "Please keep each request under 1,800 characters." });

    const schema = {
      type: "object", additionalProperties: false,
      properties: {
        reply: { type: "string" },
        intent: { type: "string", enum: ["summary","dues","add_customer","add_items","record_payment","expenses","call_customer","whatsapp_customer","delete_record","chat"] },
        needs_confirmation: { type: "boolean" }
      },
      required: ["reply","intent","needs_confirmation"]
    };
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": "Bearer " + openaiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        instructions: [
          "You are Dukaan Khata Shop Copilot for an Indian shop owner.",
          "Reply in the user's selected language: " + language + ". Match the script and language of the request whenever possible.",
          "Classify the request into exactly one intent: summary (sales/report), dues (outstanding customer balances), add_customer, add_items (open Add Many Items form), record_payment (open payment form), expenses, call_customer, whatsapp_customer, delete_record, or chat.",
          "Use chat for questions, plans, drafts, and anything that does not clearly request one of those existing app workflows.",
          "Never claim you changed records, sent WhatsApp, placed a call, or completed a payment. The app only opens the relevant workflow; the owner must review and confirm.",
          "Set needs_confirmation=true for payments, deletions, customer contact or message sending, and other consequential actions.",
          "Never request passwords, OTPs, UPI PINs, or full bank credentials. Be concise, useful, and protect customer privacy."
        ].join("\n"),
        input: [{ role: "user", content: message }],
        text: { format: { type: "json_schema", name: "shop_copilot_result", strict: true, schema } },
        max_output_tokens: 700
      })
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("Shop Copilot upstream error", upstream.status, data && data.error && data.error.code);
      return res.status(502).json({ error: "The AI service could not answer. Check the API key, billing, and model access in OpenAI Platform." });
    }
    const text = (data.output || []).flatMap(item => item.content || []).filter(part => part.type === "output_text").map(part => part.text || "").join("\n").trim();
    let result;
    try { result = JSON.parse(text); } catch (_) { result = null; }
    if (!result || typeof result.reply !== "string" || !result.intent) return res.status(502).json({ error: "The AI service returned an invalid reply. Please try again." });
    return res.status(200).json({
      reply: result.reply.slice(0, 4000),
      intent: result.intent,
      needs_confirmation: Boolean(result.needs_confirmation)
    });
  } catch (error) {
    console.error("Shop Copilot request failed", error && error.name);
    return res.status(502).json({ error: "Could not reach the AI service. Please try again shortly." });
  }
};