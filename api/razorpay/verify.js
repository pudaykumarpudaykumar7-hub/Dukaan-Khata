const crypto = require("crypto");
const { cors, preflight } = require("../_cors");

function json(res, status, body) {
  res.status(status).json(body);
}

module.exports = async function handler(req, res) {
  cors(req, res);
  if (preflight(req, res)) return;
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return json(res, 500, { error: "Razorpay backend is not configured" });

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return json(res, 400, { verified: false, error: "Incomplete Razorpay response" });
    }

    const expected = crypto
      .createHmac("sha256", secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(String(razorpay_signature), "utf8");
    const verified = a.length === b.length && crypto.timingSafeEqual(a, b);

    return json(res, verified ? 200 : 400, { verified });
  } catch (error) {
    return json(res, 500, { verified: false, error: "Payment verification failed" });
  }
};
