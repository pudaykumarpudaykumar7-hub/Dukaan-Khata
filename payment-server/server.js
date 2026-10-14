const express=require("express");
const cors=require("cors");

const app=express();
app.use(cors({origin:true}));
app.use(express.json({limit:"32kb"}));

const PORT=process.env.PORT||3000;
const CLIENT_ID=process.env.CASHFREE_CLIENT_ID;
const CLIENT_SECRET=process.env.CASHFREE_CLIENT_SECRET;
const CASHFREE_ENV=(process.env.CASHFREE_ENV||"SANDBOX").toUpperCase();
const API_BASE=CASHFREE_ENV==="PRODUCTION"?"https://api.cashfree.com/pg":"https://sandbox.cashfree.com/pg";
const API_VERSION="2022-09-01";

app.get("/health",(req,res)=>res.json({ok:true,service:"dukaan-khata-cashfree-api",environment:CASHFREE_ENV,cashfreeConfigured:credentialsReady()}));

function credentialsReady(){return Boolean(CLIENT_ID&&CLIENT_SECRET)}
async function cashfreeRequest(path,options={}){
  const response=await fetch(API_BASE+path,{
    ...options,
    headers:{
      "x-client-id":CLIENT_ID,
      "x-client-secret":CLIENT_SECRET,
      "x-api-version":API_VERSION,
      "Content-Type":"application/json",
      ...(options.headers||{})
    }
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    const message=data.message||data.type||data.error_description||"Cashfree API request failed";
    const error=new Error(message);
    error.status=response.status;
    throw error;
  }
  return data;
}

app.post("/api/cashfree/payment-link",async(req,res)=>{
  if(!credentialsReady())return res.status(503).json({error:"Cashfree is not configured. Add CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET in Vercel."});
  const amount=Number(req.body?.amount);
  if(!Number.isFinite(amount)||amount<=0||amount>10000000)return res.status(400).json({error:"Enter a valid payment amount."});
  try{
    const customerName=String(req.body?.customerName||"Customer").trim().slice(0,100)||"Customer";
    const customerId=String(req.body?.customerId||"").slice(0,80);
    const linkId="dk_"+Date.now()+"_"+Math.random().toString(36).slice(2,8);
    const payload={
      link_id:linkId,
      link_amount:Math.round(amount*100)/100,
      link_currency:"INR",
      link_purpose:"Dukaan Khata customer payment",
      link_partial_payments:false,
      link_expiry_time:new Date(Date.now()+15*60*1000).toISOString(),
      customer_details:{customer_name:customerName},
      link_auto_reminders:false,
      link_notify:{send_sms:false,send_email:false},
      link_meta:{upi_intent:true,payment_methods:"upi"},
      link_notes:{customer_id:customerId,source:"dukaan-khata"}
    };
    const data=await cashfreeRequest("/links",{method:"POST",body:JSON.stringify(payload)});
    if(!data.link_id||!data.link_url)return res.status(502).json({error:"Cashfree did not return a payment link."});
    return res.json({id:data.link_id,linkUrl:data.link_url,amount:Number(data.link_amount||amount),status:data.link_status});
  }catch(error){
    return res.status(error.status&&error.status>=400&&error.status<500?error.status:502).json({error:error.message||"Cashfree payment link creation failed."});
  }
});

app.get("/api/cashfree/payment-link/:id",async(req,res)=>{
  if(!credentialsReady())return res.status(503).json({error:"Cashfree is not configured. Add CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET in Vercel."});
  const id=String(req.params.id||"");
  if(!/^[A-Za-z0-9_-]{3,50}$/.test(id))return res.status(400).json({error:"Invalid payment link ID."});
  try{
    const data=await cashfreeRequest("/links/"+encodeURIComponent(id),{method:"GET"});
    const amount=Number(data.link_amount||0);
    const amountPaid=Number(data.link_amount_paid||0);
    const paid=String(data.link_status||"").toUpperCase()==="PAID"||(amount>0&&amountPaid>=amount);
    return res.json({id:data.link_id||id,status:data.link_status,paid,amount:paid?(amountPaid||amount):amount,amountPaid});
  }catch(error){
    return res.status(error.status&&error.status>=400&&error.status<500?error.status:502).json({error:error.message||"Cashfree payment status check failed."});
  }
});

if(require.main===module)app.listen(PORT,()=>console.log("Dukaan Khata Cashfree API listening on "+PORT));
module.exports=app;
