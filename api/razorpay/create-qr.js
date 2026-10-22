// Vercel serverless endpoint: create a single-use, fixed-amount Razorpay UPI QR.
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return res.status(503).json({ error: "Razorpay is not configured on the server yet." });

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const amount = Number(body.amount);
  const customerId = typeof body.customerId === "string" ? body.customerId.slice(0, 100) : "";
  const shopName = typeof body.shopName === "string" ? body.shopName.trim().slice(0, 80) : "Dukaan Khata";
  if (!Number.isFinite(amount) || amount < 1 || amount > 1000000) {
    return res.status(400).json({ error: "Enter an amount between ₹1 and ₹10,00,000." });
  }
  const paise = Math.round(amount * 100);
  if (Math.abs(paise / 100 - amount) > 0.000001) return res.status(400).json({ error: "Amount can have at most two decimal places." });

  try {
    const auth = Buffer.from(keyId + ":" + keySecret).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/payments/qr_codes", {
      method: "POST",
      headers: { Authorization: "Basic " + auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "upi_qr", name: shopName || "Dukaan Khata", usage: "single_use",
        fixed_amount: true, payment_amount: paise, description: "Dukaan Khata payment",
        close_by: Math.floor(Date.now() / 1000) + 3600,
        notes: { source: "dukaan-khata", customer_id: customerId || "walk-in" }
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Razorpay QR creation failed", response.status, data?.error?.code || "");
      return res.status(502).json({ error: "Razorpay could not create the QR. Check account activation and QR Code API access." });
    }
    return res.status(200).json({
      qrId: data.id, imageUrl: data.image_url, amountPaise: data.payment_amount,
      amount: Number(data.payment_amount) / 100, status: data.status, expiresAt: data.close_by || null
    });
  } catch (error) {
    console.error("Razorpay QR request failed", error?.message || "unknown");
    return res.status(502).json({ error: "Could not reach Razorpay. Please try again." });
  }
}
