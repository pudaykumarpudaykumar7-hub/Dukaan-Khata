const express=require("express");
const cors=require("cors");
const crypto=require("crypto");
const Razorpay=require("razorpay");

const app=express();
app.use(cors({origin:true}));
app.use(express.json());

const PORT=process.env.PORT||3000;
const KEY_ID=process.env.RAZORPAY_KEY_ID;
const KEY_SECRET=process.env.RAZORPAY_KEY_SECRET;
const WEBHOOK_SECRET=process.env.RAZORPAY_WEBHOOK_SECRET;
const razorpay=new Razorpay({key_id:KEY_ID,key_secret:KEY_SECRET});

app.get("/health",(req,res)=>res.json({ok:true,service:"dukaan-khata-payment-api"}));

app.post("/api/razorpay/order",async(req,res)=>{
  try{
    const amount=Number(req.body.amount);
    if(!Number.isFinite(amount)||amount<=0)return res.status(400).json({error:"Invalid amount"});
    const order=await razorpay.orders.create({
      amount:Math.round(amount*100),
      currency:"INR",
      receipt:"dk_"+Date.now(),
      notes:{customerId:String(req.body.customerId||"")}
    });
    res.json({id:order.id,orderId:order.id,amount:order.amount,currency:order.currency,keyId:KEY_ID});
  }catch(e){res.status(500).json({error:"Order creation failed"})}
});

/* Dynamic Razorpay UPI QR. The secret stays on the backend. */
app.post("/api/razorpay/payment-link",async(req,res)=>{
  try{
    const amount=Number(req.body.amount||0);
    if(!Number.isFinite(amount)||amount<=0)return res.status(400).json({error:"Enter a valid amount of at least ₹1."});
    if(!KEY_ID||!KEY_SECRET)return res.status(500).json({error:"Razorpay environment variables are missing in Vercel."});
    const r=await fetch("https://api.razorpay.com/v1/payment_links",{
      method:"POST",
      headers:{
        "Authorization":"Basic "+Buffer.from(KEY_ID+":"+KEY_SECRET).toString("base64"),
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        amount:Math.round(amount*100),
        currency:"INR",
        accept_partial:false,
        upi_link:true,
        reference_id:"DK_"+Date.now(),
        expire_by:Math.floor(Date.now()/1000)+15*60,
        description:"Dukaan Khata payment",
        customer:{name:String(req.body.customerName||"Customer").slice(0,80)},
        notes:{customerId:String(req.body.customerId||"")}
      })
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok)return res.status(r.status||500).json({error:data.error?.description||data.error?.reason||"Razorpay Payment Link creation failed"});
    res.json({id:data.id,shortUrl:data.short_url,status:data.status,amount:amount});
  }catch(e){
    const er=e?.error||e?.response?.error||e;
    console.error("Razorpay Payment Link error:",er);
    res.status(Number(e?.statusCode)||500).json({error:er?.description||er?.message||e?.message||"Payment Link creation failed"});
  }
});

app.get("/api/razorpay/payment-link/:id",async(req,res)=>{
  try{
    const r=await fetch("https://api.razorpay.com/v1/payment_links/"+encodeURIComponent(req.params.id),{
      headers:{"Authorization":"Basic "+Buffer.from(KEY_ID+":"+KEY_SECRET).toString("base64")}
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok)return res.status(r.status||500).json({error:data.error?.description||"Could not check payment"});
    res.json({status:data.status,paid:data.status==="paid",amount:Number(data.amount||0)/100});
  }catch(e){res.status(500).json({error:"Could not check payment"})}
});

/* Poll the QR's actual captured payments.*/
app.get("/api/razorpay/qr/:qrId/payments",async(req,res)=>{
  try{
    const from=Math.floor((Date.now()-15*60*1000)/1000);
    const url="https://api.razorpay.com/v1/payments/qr_codes/"+encodeURIComponent(req.params.qrId)+"/payments?count=100&from="+from;
    const r=await fetch(url,{headers:{"Authorization":"Basic "+Buffer.from(KEY_ID+":"+KEY_SECRET).toString("base64")}});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)return res.status(r.status||500).json({error:data.error?.description||"Could not check QR payment"});
    const payments=(data.items||[]).filter(p=>p.status==="captured"&&p.captured!==false).map(p=>({
      id:p.id,
      amount:Number(p.amount||0)/100,
      status:p.status,
      method:p.method,
      vpa:p.vpa||p.upi?.vpa||"",
      contact:p.contact||"",
      createdAt:p.created_at,
      rrn:p.acquirer_data?.rrn||""
    }));
    res.json({payments});
  }catch(e){res.status(500).json({error:"Could not check QR payment"})}
});

app.post("/api/razorpay/verify",(req,res)=>{
  try{
    const {razorpay_order_id,razorpay_payment_id,razorpay_signature}=req.body;
    if(!razorpay_order_id||!razorpay_payment_id||!razorpay_signature)return res.status(400).json({verified:false});
    const expected=crypto.createHmac("sha256",KEY_SECRET).update(razorpay_order_id+"|"+razorpay_payment_id).digest("hex");
    const verified=crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(razorpay_signature));
    res.json({verified});
  }catch(e){res.status(400).json({verified:false})}
});

app.post("/api/razorpay/webhook",(req,res)=>{
  if(!WEBHOOK_SECRET)return res.status(503).json({error:"Webhook secret not configured"});
  const sig=req.headers["x-razorpay-signature"]||"";
  const expected=crypto.createHmac("sha256",WEBHOOK_SECRET).update(JSON.stringify(req.body)).digest("hex");
  if(sig!==expected)return res.status(401).json({error:"Invalid webhook signature"});
  res.json({received:true});
});

if (require.main === module) {
  app.listen(PORT,()=>console.log("Dukaan Khata payment API listening on "+PORT));
}

module.exports = app;