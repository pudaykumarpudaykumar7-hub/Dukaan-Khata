const crypto=require("node:crypto");
const {PLANS,RAZORPAY_KEY_SECRET,cors,fail,jsonError,requireOwner,requirePaymentConfig,razorpay,saveEntitlement}=require("./_shared");
export default async function handler(req,res){
 if(cors(req,res))return;if(req.method!=="POST")return res.status(405).json({error:"POST required."});
 try{
  const {user}=await requireOwner(req);requirePaymentConfig();
  const sid=String(req.body?.razorpay_subscription_id||""),pid=String(req.body?.razorpay_payment_id||""),sig=String(req.body?.razorpay_signature||"");
  if(!/^sub_[A-Za-z0-9]+$/.test(sid)||!/^pay_[A-Za-z0-9]+$/.test(pid)||!sig)fail(400,"Missing or invalid checkout details.");
  const expected=crypto.createHmac("sha256",RAZORPAY_KEY_SECRET).update(pid+"|"+sid).digest("hex"),a=Buffer.from(expected),b=Buffer.from(sig);
  if(a.length!==b.length||!crypto.timingSafeEqual(a,b))fail(400,"Payment signature verification failed.");
  const sub=await razorpay("/subscriptions/"+encodeURIComponent(sid));if(sub.notes?.owner_id!==user.id)fail(403,"This payment belongs to a different owner.");
  const planId=String(sub.notes?.plan_id||""),plan=PLANS[planId];if(!plan)fail(400,"Subscription plan could not be matched.");
  if(sub.plan_id!==process.env[plan.env])fail(400,"The paid plan does not match the selected plan.");
  const payment=await razorpay("/payments/"+encodeURIComponent(pid));if(payment.status!=="captured"||payment.currency!=="INR")fail(402,"Payment is not captured yet. The plan has not been activated.");
  const end=sub.current_end?new Date(sub.current_end*1000).toISOString():new Date(Date.now()+30*86400000).toISOString();
  await saveEntitlement({ownerId:user.id,planId,status:"active",subscriptionId:sid,paymentId:pid,currentPeriodEnd:end});
  return res.status(200).json({verified:true,active:true,planId,planName:plan.name,currentPeriodEnd:end});
 }catch(e){return jsonError(res,e)}
}