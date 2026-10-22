// Verify status against Razorpay's authenticated API, never against a browser callback.
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return res.status(503).json({ error: "Razorpay is not configured on the server yet." });

  const qrId = typeof req.query?.qrId === "string" ? req.query.qrId : "";
  if (!/^qr_[A-Za-z0-9]+$/.test(qrId)) return res.status(400).json({ error: "Invalid QR identifier." });

  const auth = "Basic " + Buffer.from(keyId + ":" + keySecret).toString("base64");
  const headers = { Authorization: auth };
  try {
    const qrResponse = await fetch("https://api.razorpay.com/v1/payments/qr_codes/" + encodeURIComponent(qrId), { headers });
    const qr = await qrResponse.json().catch(() => ({}));
    if (!qrResponse.ok) return res.status(qrResponse.status === 404 ? 404 : 502).json({ error: "QR status could not be verified with Razorpay." });

    const payResponse = await fetch("https://api.razorpay.com/v1/payments/qr_codes/" + encodeURIComponent(qrId) + "/payments", { headers });
    const payData = await payResponse.json().catch(() => ({}));
    if (!payResponse.ok) return res.status(502).json({ error: "Payment status could not be verified with Razorpay." });

    const items = Array.isArray(payData.items) ? payData.items : [];
    const expected = Number(qr.payment_amount);
    const captured = items.find(p => p && p.status === "captured" && Number(p.amount) === expected && (!p.qr_code_id || p.qr_code_id === qrId));
    if (captured) {
      const payerName = typeof captured.notes?.payer_name === "string" ? captured.notes.payer_name.trim().slice(0, 100) : "";
      return res.status(200).json({
        status: "paid", verified: true, amountPaise: Number(captured.amount),
        amount: Number(captured.amount) / 100, paymentId: captured.id,
        payerName: payerName || null, payerVpa: typeof captured.vpa === "string" ? captured.vpa : null,
        paidAt: captured.created_at || null
      });
    }
    return res.status(200).json({ status: qr.status === "closed" ? "closed" : "pending", verified: false, amountPaise: expected, amount: expected / 100 });
  } catch (error) {
    console.error("Razorpay status check failed", error?.message || "unknown");
    return res.status(502).json({ error: "Could not verify payment with Razorpay." });
  }
}
