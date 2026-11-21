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
  const amount=Number(req.body?.amount);
  if(![4900,9900,14900].includes(amount))return res.status(400).json({error:"Only approved subscription amounts ₹49, ₹99 and ₹149 are accepted."});
  const receipt="dk_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,9);
  try{
    const response=await fetch("https://api.razorpay.com/v1/orders",{method:"POST",headers:{Authorization:"Basic "+Buffer.from(keyId+":"+keySecret).toString("base64"),"Content-Type":"application/json"},body:JSON.stringify({amount,currency:"INR",receipt,notes:{source:"uvms-dukaan-khata"}})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok){const authFailure=response.status===401;console.error("Razorpay order API error",response.status,data?.error?.code||"");return res.status(authFailure?401:502).json({error:authFailure?"Razorpay authentication failed. Check server credentials.":"Razorpay could not create the order."})}
    return res.status(200).json({order_id:data.id,amount:data.amount,currency:data.currency,key_id:keyId});
  }catch(e){console.error("Order create request failed",e?.message||"");return res.status(502).json({error:"Unable to contact Razorpay. Please try again."})}
}
