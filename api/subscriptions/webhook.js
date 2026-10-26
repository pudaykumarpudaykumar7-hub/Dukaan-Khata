const {PLANS,RAZORPAY_KEY_SECRET,cors,fail,jsonError,requirePaymentConfig,saveEntitlement,validSignature,dbRequest}=require("./_shared");
export const config={api:{bodyParser:false}};
async function rawBody(req){if(Buffer.isBuffer(req.body))return req.body;if(typeof req.body==="string")return Buffer.from(req.body);const chunks=[];for await(const chunk of req)chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));return Buffer.concat(chunks)}
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store, max-age=0");if(req.method!=="POST")return res.status(405).json({error:"POST required."});
 try{
  requirePaymentConfig();const raw=await rawBody(req),secret=process.env.RAZORPAY_WEBHOOK_SECRET;if(!secret)fail(503,"Razorpay webhook secret is not configured.");
  if(!validSignature(raw,String(req.headers["x-razorpay-signature"]||""),secret))fail(401,"Invalid webhook signature.");
  const eventId=String(req.headers["x-razorpay-event-id"]||"");if(!eventId)fail(400,"Missing Razorpay event ID.");
  const event=JSON.parse(raw.toString("utf8")),kind=String(event.event||"");
  if(!["subscription.activated","subscription.charged","subscription.cancelled","subscription.halted"].includes(kind))return res.status(200).json({received:true,ignored:true});
  const sub=event.payload?.subscription?.entity;if(!sub?.id||!sub?.notes?.owner_id||!sub?.notes?.plan_id)return res.status(200).json({received:true,ignored:true});
  const planId=String(sub.notes.plan_id),ownerId=String(sub.notes.owner_id),plan=PLANS[planId];if(!plan||sub.plan_id!==process.env[plan.env])fail(400,"Webhook plan mismatch.");
  const inserted=await dbRequest("subscription_webhook_events","POST",{event_id:eventId,event_type:kind,received_at:new Date().toISOString()},"resolution=ignore-duplicates,return=representation");
  if(!Array.isArray(inserted)||!inserted.length)return res.status(200).json({received:true,duplicate:true});
  // Activation alone may only mean the mandate was authorised; a charged event proves a subscription payment succeeded.
  if(kind==="subscription.activated")return res.status(200).json({received:true,pendingFirstCharge:true});
  const end=sub.current_end?new Date(sub.current_end*1000).toISOString():null;
  if(kind==="subscription.charged"){
    const payment=event.payload?.payment?.entity;
    if(payment&&payment.status!=="captured")return res.status(200).json({received:true,ignored:true});
    await saveEntitlement({ownerId,planId,status:"active",subscriptionId:sub.id,paymentId:payment?.id||null,currentPeriodEnd:end});
  }else{
    const rows=await dbRequest("owner_subscriptions?select=razorpay_subscription_id&owner_id=eq."+encodeURIComponent(ownerId)+"&limit=1");
    if(Array.isArray(rows)&&rows[0]?.razorpay_subscription_id===sub.id)
      await saveEntitlement({ownerId,planId,status:"inactive",subscriptionId:sub.id,paymentId:event.payload?.payment?.entity?.id||null,currentPeriodEnd:end});
  }
  return res.status(200).json({received:true});
 }catch(e){return jsonError(res,e)}
}