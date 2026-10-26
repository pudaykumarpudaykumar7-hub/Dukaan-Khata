const {PLANS,RAZORPAY_KEY_ID,cors,fail,jsonError,requireOwner,requirePaymentConfig,razorpay}=require("./_shared");
export default async function handler(req,res){
 if(cors(req,res))return;if(req.method!=="POST")return res.status(405).json({error:"POST required."});
 try{
  const {user}=await requireOwner(req);requirePaymentConfig();const planId=String(req.body?.planId||""),plan=PLANS[planId];if(!plan)fail(400,"Choose a valid paid plan.");
  const razorpayPlanId=process.env[plan.env];if(!razorpayPlanId)fail(503,"Razorpay monthly plan ID for "+plan.name+" is not configured.");
  const sub=await razorpay("/subscriptions","POST",{plan_id:razorpayPlanId,total_count:120,quantity:1,customer_notify:1,notes:{owner_id:user.id,plan_id:planId,app:"dukaan-khata"}});
  return res.status(200).json({keyId:RAZORPAY_KEY_ID,subscriptionId:sub.id,planId,planName:plan.name,amountPaise:plan.pricePaise,currency:"INR",checkoutName:"Dukaan Khata",description:plan.name+" monthly subscription"});
 }catch(e){return jsonError(res,e)}
}