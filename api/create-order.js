// Vercel serverless: create a Razorpay Standard Checkout order.
const allowedOrigin = process.env.ALLOWED_ORIGIN || "https://pudaykumarpudaykumar7-hub.github.io";
function cors(req,res){const origin=req.headers.origin||"";if(origin===allowedOrigin){res.setHeader("Access-Control-Allow-Origin",origin);res.setHeader("Vary","Origin")}res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");res.setHeader("Access-Control-Allow-Headers","Content-Type")}
export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  cors(req,res);
  if(req.method==="OPTIONS")return res.status(204).end();
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  const keyId=process.env.RAZORPAY_KEY_ID, keySecret=process.env.RAZORPAY_KEY_SECRET;
  if(!keyId||!keySecret)return res.status(503).json({error:"Razorpay is not configured on the server."});
  const planId=String(req.body?.plan_id||"");
  const billingPeriod=String(req.body?.billing_period||"monthly")==="yearly"?"yearly":"monthly";
  const monthlyPlanAmounts={pro:4900,premium:9900,"ultra-premium":14900};
  const baseAmount=monthlyPlanAmounts[planId];
  const amount=Number(req.body?.amount);
  const expectedAmount=baseAmount*(billingPeriod==="yearly"?12:1);
  if(!baseAmount||amount!==expectedAmount)return res.status(400).json({error:"Plan amount does not match the selected billing period."});
  const receipt="dk_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,9);
  try{
    const response=await fetch("https://api.razorpay.com/v1/orders",{method:"POST",headers:{Authorization:"Basic "+Buffer.from(keyId+":"+keySecret).toString("base64"),"Content-Type":"application/json"},body:JSON.stringify({amount,currency:"INR",receipt,notes:{source:"uvms-dukaan-khata",plan_id:planId,billing_period:billingPeriod}})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok){const authFailure=response.status===401;console.error("Razorpay order API error",response.status,data?.error?.code||"");return res.status(authFailure?401:502).json({error:authFailure?"Razorpay authentication failed. Check server credentials.":"Razorpay could not create the order."})}
    return res.status(200).json({order_id:data.id,amount:data.amount,currency:data.currency,key_id:keyId});
  }catch(e){console.error("Order create request failed",e?.message||"");return res.status(502).json({error:"Unable to contact Razorpay. Please try again."})}
}
