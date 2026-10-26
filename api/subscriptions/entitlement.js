const {PLANS,cors,jsonError,requireOwner,requirePaymentConfig,dbRequest}=require("./_shared");
export default async function handler(req,res){
 if(cors(req,res))return;if(req.method!=="GET")return res.status(405).json({error:"GET required."});
 try{
  const {user}=await requireOwner(req);requirePaymentConfig();
  const rows=await dbRequest("owner_subscriptions?select=owner_id,plan_id,status,razorpay_subscription_id,current_period_end&owner_id=eq."+encodeURIComponent(user.id)+"&limit=1");
  const row=Array.isArray(rows)?rows[0]:null,valid=!!row&&row.status==="active"&&(!row.current_period_end||new Date(row.current_period_end).getTime()>Date.now())&&!!PLANS[row.plan_id];
  return res.status(200).json({planId:valid?row.plan_id:"free",planName:valid?PLANS[row.plan_id].name:"Starter",active:valid,currentPeriodEnd:valid?row.current_period_end:null});
 }catch(e){return jsonError(res,e)}
}