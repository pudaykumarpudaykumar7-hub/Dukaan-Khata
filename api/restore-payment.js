// Vercel serverless: securely restore a paid Dukaan Khata plan from a saved Razorpay payment ID.
const allowedOrigin = process.env.ALLOWED_ORIGIN || "https://pudaykumarpudaykumar7-hub.github.io";
function cors(req,res){const origin=req.headers.origin||"";if(origin===allowedOrigin){res.setHeader("Access-Control-Allow-Origin",origin);res.setHeader("Vary","Origin")}res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");res.setHeader("Access-Control-Allow-Headers","Content-Type")}
export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  cors(req,res);
  if(req.method==="OPTIONS")return res.status(204).end();
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  const keyId=process.env.RAZORPAY_KEY_ID,secret=process.env.RAZORPAY_KEY_SECRET;
  if(!keyId||!secret)return res.status(503).json({error:"Razorpay restore verification is not configured."});
  const paymentId=String(req.body?.payment_id||"").trim();
  if(!/^pay_[A-Za-z0-9]{8,40}$/.test(paymentId))return res.status(400).json({verified:false,error:"Invalid saved payment ID."});
  const auth="Basic "+Buffer.from(keyId+":"+secret).toString("base64");
  try{
    const paymentResponse=await fetch("https://api.razorpay.com/v1/payments/"+encodeURIComponent(paymentId),{headers:{Authorization:auth}});
    const payment=await paymentResponse.json().catch(()=>({}));
    if(!paymentResponse.ok||payment.status!=="captured"||!payment.order_id||payment.currency!=="INR")return res.status(400).json({verified:false,error:"No captured eligible payment was found for this payment ID."});
    const orderResponse=await fetch("https://api.razorpay.com/v1/orders/"+encodeURIComponent(payment.order_id),{headers:{Authorization:auth}});
    const order=await orderResponse.json().catch(()=>({}));
    if(!orderResponse.ok||order.id!==payment.order_id||order.notes?.source!=="uvms-dukaan-khata")return res.status(400).json({verified:false,error:"This payment is not a Dukaan Khata plan purchase."});
    const planId=String(order.notes?.plan_id||"");
    const billingPeriod=String(order.notes?.billing_period||"monthly")==="yearly"?"yearly":"monthly";
    const monthlyAmounts={pro:4900,premium:9900,"ultra-premium":14900};
    const baseAmount=monthlyAmounts[planId];
    const expectedAmount=baseAmount*(billingPeriod==="yearly"?12:1);
    const paidAt=Number(payment.created_at||0);
    const durationSeconds=billingPeriod==="yearly"?365*24*60*60:30*24*60*60;
    const expiresAt=paidAt?new Date((paidAt+durationSeconds)*1000).toISOString():null;
    if(!paidAt||Date.now()>=((paidAt+durationSeconds)*1000))return res.status(410).json({verified:false,expired:true,expires_at:expiresAt,error:"This subscription has expired. Restore is available only during the paid subscription period."});
    if(!expectedAmount||Number(payment.amount)!==expectedAmount||Number(order.amount)!==expectedAmount||order.currency!=="INR")return res.status(400).json({verified:false,error:"Payment amount does not match a valid Dukaan Khata plan."});
    return res.status(200).json({verified:true,plan_id:planId,billing_period:billingPeriod,payment_id:paymentId,paid_at:new Date(paidAt*1000).toISOString(),expires_at:expiresAt});
  }catch(error){console.error("Subscription restore check failed",error?.message||"");return res.status(502).json({verified:false,error:"Could not verify your payment with Razorpay right now."})}
}
