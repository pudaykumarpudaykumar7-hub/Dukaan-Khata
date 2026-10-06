const { cors, preflight } = require("../_cors");

function json(res, status, body) {
  res.status(status).json(body);
}

module.exports = async function handler(req, res) {
  cors(req, res);
  if (preflight(req, res)) return;
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return json(res, 500, { error: "Razorpay backend is not configured" });

  try {
    const body = req.body || {};
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) {
      return json(res, 400, { error: "Invalid amount" });
    }

    const paise = Math.round(amount * 100);
    const receipt = "dk_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
    const auth = Buffer.from(keyId + ":" + keySecret).toString("base64");

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": "Basic " + auth,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: paise,
        currency: "INR",
        receipt,
        notes: {
          shopName: String(body.shopName || "Dukaan Khata").slice(0, 100),
          customerId: String(body.customerId || "").slice(0, 100)
        }
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return json(res, response.status >= 400 && response.status < 500 ? 400 : 502, {
        error: data.error?.description || data.error?.reason || "Razorpay order creation failed"
      });
    }

    return json(res, 200, {
      keyId,
      orderId: data.id,
      amount: data.amount,
      currency: data.currency
    });
  } catch (error) {
    return json(res, 500, { error: "Unable to create Razorpay order" });
  }
};
