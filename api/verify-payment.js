// Vercel serverless: verify Standard Checkout payment signature.
import crypto from "node:crypto";
const allowedOrigin = process.env.ALLOWED_ORIGIN || "https://pudaykumarpudaykumar7-hub.github.io";
function cors(req,res){const origin=req.headers.origin||"";if(origin===allowedOrigin){res.setHeader("Access-Control-Allow-Origin",origin);res.setHeader("Vary","Origin")}res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");res.setHeader("Access-Control-Allow-Headers","Content-Type")}
export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  cors(req,res);
  if(req.method==="OPTIONS")return res.status(204).end();
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  const secret=process.env.RAZORPAY_KEY_SECRET;
  if(!secret||!process.env.RAZORPAY_KEY_ID)return res.status(503).json({error:"Razorpay verification is not configured on the server."});
  const planId=String(req.body?.plan_id||"");
  const billingPeriod=String(req.body?.billing_period||"monthly")==="yearly"?"yearly":"monthly";
  const monthlyPlanAmounts={pro:4900,premium:9900,"ultra-premium":14900};
  const basePlanAmount=monthlyPlanAmounts[planId];
  const expectedPlanAmount=basePlanAmount*(billingPeriod==="yearly"?12:1);
  if(!expectedPlanAmount)return res.status(400).json({error:"Invalid plan selected."});
  const orderId=String(req.body?.razorpay_order_id||"");
  const paymentId=String(req.body?.razorpay_payment_id||"");
  const signature=String(req.body?.razorpay_signature||"");
  if(!orderId||!paymentId||!signature)return res.status(400).json({error:"Missing payment verification fields."});
  const expected=crypto.createHmac("sha256",secret).update(orderId+"|"+paymentId).digest("hex");
  const a=Buffer.from(expected),b=Buffer.from(signature);
  if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return res.status(400).json({verified:false,error:"Payment signature did not match. Payment has not been verified."});
  try{
    const response=await fetch("https://api.razorpay.com/v1/payments/"+encodeURIComponent(paymentId),{headers:{Authorization:"Basic "+Buffer.from(process.env.RAZORPAY_KEY_ID+":"+secret).toString("base64")}});
    const payment=await response.json().catch(()=>({}));
    if(!response.ok||payment.status!=="captured"||payment.order_id!==orderId||Number(payment.amount)!==expectedPlanAmount)return res.status(400).json({verified:false,error:"Payment is not captured for a valid subscription order."});
    return res.status(200).json({verified:true,order_id:orderId,payment_id:paymentId,amount:payment.amount,currency:payment.currency});
  }catch(e){console.error("Payment API confirmation failed",e?.message||"");return res.status(502).json({verified:false,error:"Unable to confirm payment status with Razorpay."})}
}
