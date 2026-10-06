const PaytmChecksum = require("paytmchecksum");
const { cors, preflight } = require("../_cors");

function json(res, status, body) {
  res.status(status).json(body);
}

module.exports = async function handler(req, res) {
  cors(req, res);
  if (preflight(req, res)) return;
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const mid = process.env.PAYTM_MID;
  const merchantKey = process.env.PAYTM_MERCHANT_KEY;
  const env = String(process.env.PAYTM_ENV || "staging").toLowerCase();

  if (!mid || !merchantKey) {
    return json(res, 500, { error: "Paytm backend is not configured" });
  }

  try {
    const { orderId } = req.body || {};
    if (!orderId) return json(res, 400, { error: "orderId is required" });

    const body = { mid, orderId };
    const signature = await PaytmChecksum.generateSignature(JSON.stringify(body), merchantKey);
    const payload = { body, head: { signature } };

    const host = env === "production" ? "https://securegw.paytm.in" : "https://securegw-stage.paytm.in";
    const response = await fetch(host + "/v3/order/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return json(res, 502, { error: data.body?.resultInfo?.resultMsg || "Paytm status request failed" });
    }

    const result = data.body || {};
    return json(res, 200, {
      orderId: result.orderId || orderId,
      txnId: result.txnId || null,
      status: result.resultInfo?.resultStatus || null,
      amount: result.txnAmount?.value || null,
      response: result
    });
  } catch (error) {
    return json(res, 500, { error: "Unable to verify Paytm payment" });
  }
};
