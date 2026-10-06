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
  const website = process.env.PAYTM_WEBSITE || "WEBSTAGING";
  const env = String(process.env.PAYTM_ENV || "staging").toLowerCase();

  if (!mid || !merchantKey) {
    return json(res, 500, { error: "Paytm backend is not configured" });
  }

  try {
    const body = req.body || {};
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) {
      return json(res, 400, { error: "Invalid amount" });
    }

    const orderId = "DK" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 7).toUpperCase();
    const callbackBase = process.env.PAYTM_CALLBACK_URL;
    const callbackUrl = callbackBase
      ? callbackBase.replace(/#OrderId#/g, encodeURIComponent(orderId)).replace(/\{ORDER_ID\}/g, encodeURIComponent(orderId))
      : (env === "production"
        ? "https://securegw.paytm.in/theia/paytmCallback?ORDER_ID=" + encodeURIComponent(orderId)
        : "https://securegw-stage.paytm.in/theia/paytmCallback?ORDER_ID=" + encodeURIComponent(orderId));

    const params = {
      body: {
        requestType: "Payment",
        mid,
        websiteName: website,
        orderId,
        txnAmount: {
          value: amount.toFixed(2),
          currency: "INR"
        },
        userInfo: {
          custId: String(body.customerId || ("DK_" + Date.now())).slice(0, 64),
          mobile: String(body.customerPhone || "").replace(/\D/g, "").slice(-10)
        },
        callbackUrl
      }
    };

    params.head = {
      signature: await PaytmChecksum.generateSignature(JSON.stringify(params.body), merchantKey)
    };

    const host = env === "production" ? "https://securegw.paytm.in" : "https://securegw-stage.paytm.in";
    const response = await fetch(host + "/theia/api/v1/initiateTransaction?mid=" + encodeURIComponent(mid) + "&orderId=" + encodeURIComponent(orderId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params)
    });

    const data = await response.json().catch(() => ({}));
    const resultInfo = data.body?.resultInfo;
    const txnToken = data.body?.txnToken;

    if (!response.ok || !txnToken) {
      return json(res, 502, {
        error: resultInfo?.resultMsg || "Paytm transaction initiation failed"
      });
    }

    return json(res, 200, {
      mid,
      orderId,
      txnToken,
      amount: amount.toFixed(2),
      customerPhone: String(body.customerPhone || "").replace(/\D/g, "").slice(-10),
      environment: env
    });
  } catch (error) {
    return json(res, 500, { error: "Unable to initiate Paytm payment" });
  }
};
