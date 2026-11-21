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
  if(!secret)return res.status(503).json({error:"Razorpay verification is not configured on the server."});
  const orderId=String(req.body?.razorpay_order_id||"");
  const paymentId=String(req.body?.razorpay_payment_id||"");
  const signature=String(req.body?.razorpay_signature||"");
  if(!orderId||!paymentId||!signature)return res.status(400).json({error:"Missing payment verification fields."});
  const expected=crypto.createHmac("sha256",secret).update(orderId+"|"+paymentId).digest("hex");
  const a=Buffer.from(expected),b=Buffer.from(signature);
  if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return res.status(400).json({verified:false,error:"Payment signature did not match. Payment has not been verified."});
  return res.status(200).json({verified:true,order_id:orderId,payment_id:paymentId});
}
