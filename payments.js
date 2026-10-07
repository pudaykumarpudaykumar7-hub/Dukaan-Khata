(function(){
const K="dukaan_khata_payments_v1";
const load=()=>{try{return JSON.parse(localStorage.getItem(K)||"{}")}catch(e){return{}}};
const save=x=>localStorage.setItem(K,JSON.stringify(x));
const state=()=>{try{return JSON.parse(localStorage.getItem("dukaan_khata_infinity_v2")||"{}")}catch(e){return{}}};
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const toast=m=>window.toast?.(m);

function settings(){
  const c=load();
  window.modal?.('<h2>📲 Razorpay UPI QR</h2><p class="muted">Smart Receive uses a secure backend to create a QR code. Your Razorpay Key ID and Secret stay on the server and are never entered here.</p><label>Secure backend HTTPS URL</label><input id="paymentApi" autocomplete="off" inputmode="url" placeholder="https://your-project.vercel.app" value="'+esc(c.backendUrl||"")+'"><div class="row"><button class="btn primary" id="saveGateway">💾 Save / Update</button><button class="btn" id="clearGateway">🗑 Clear URL</button></div><div class="card"><b>Current backend</b><small class="muted" id="currentBackend">'+esc(c.backendUrl||"Not configured")+'</small></div><p class="muted">Only Razorpay UPI QR is available here. Paytm has been removed.</p></div>');
  document.getElementById("saveGateway")?.addEventListener("click",()=>{
    const n=load();
    n.backendUrl=(document.getElementById("paymentApi")?.value.trim()||"").replace(/\/$/,"");
    delete n.razorpayKey;
    delete n.paytmUrl;
    save(n); window.closeModal?.(); toast("Razorpay UPI QR settings updated ✓");
  });
  document.getElementById("clearGateway")?.addEventListener("click",()=>{
    const n=load(); n.backendUrl=""; delete n.razorpayKey; delete n.paytmUrl; save(n);
    const el=document.getElementById("paymentApi"); if(el) el.value="";
    toast("Backend URL cleared");
  });
}

async function razorpayPay(){
  const c=load();
  const amount=Number(document.getElementById("gatewayAmount")?.value)||0;
  const customerId=document.getElementById("gatewayCustomer")?.value||"";
  if(amount<=0)return toast("Enter a valid amount");
  if(!c.backendUrl)return settings();

  const s=state();
  const customer=(s.customers||[]).find(x=>x.id===customerId);
  const backend=c.backendUrl.replace(/\/$/,"");
  const shopName=(s.shop||{}).name||"Dukaan Khata";

  const r=await fetch(backend+"/api/razorpay/qr",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      amount,
      customerId,
      customerName:customer?.name||"Customer",
      shopName
    })
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok||!data.imageUrl)throw Error(data.error||"Could not create Razorpay QR");

  const oldModal=document.getElementById("modalBody");
  window.modal?.('<div class="payment-qr-screen" style="text-align:center"><h2>📲 Scan & Pay</h2><p class="muted">Razorpay UPI QR • No card details</p><div style="font-size:28px;font-weight:800;margin:10px 0">₹'+amount.toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})+'</div><div class="card" style="display:flex;justify-content:center;padding:18px;background:#fff"><img src="'+esc(data.imageUrl)+'" alt="Razorpay UPI payment QR code" style="width:min(300px,75vw);height:auto;image-rendering:auto"></div><p><b>Customer:</b> '+esc(customer?.name||"Walk-in / Other")+'</p><p class="muted">Customer scans this QR with Google Pay, PhonePe, Paytm, BHIM or another UPI app and completes the payment with their UPI PIN.</p><div class="row"><button class="btn primary" id="checkRazorpayQr">✓ Check Payment</button><button class="btn" id="closeRazorpayQr">Close</button></div><div id="qrPaymentStatus" class="muted" style="margin-top:10px">Waiting for payment…</div></div>');

  let stopped=false;
  const close=()=>{
    stopped=true;
    window.closeModal?.();
  };
  document.getElementById("closeRazorpayQr")?.addEventListener("click",close);

  const recordPayment=payment=>{
    if(stopped)return;
    const current=state();
    current.tx=Array.isArray(current.tx)?current.tx:[];
    const already=current.tx.some(x=>x.paymentId===payment.id);
    if(already)return;
    current.tx.unshift({
      id:"rzp_qr_"+Date.now(),
      type:"payment",
      customerId,
      amount:payment.amount||amount,
      mode:"razorpay_qr",
      gateway:"razorpay",
      paymentId:payment.id,
      qrId:data.id,
      date:new Date().toISOString()
    });
    localStorage.setItem("dukaan_khata_infinity_v2",JSON.stringify(current));
    stopped=true;
    window.closeModal?.();
    window.render?.();
    toast("Razorpay UPI payment received ✓");
  };

  const check=async()=>{
    if(stopped)return;
    const status=document.getElementById("qrPaymentStatus");
    if(status)status.textContent="Checking Razorpay payment…";
    try{
      const pr=await fetch(backend+"/api/razorpay/qr/"+encodeURIComponent(data.id)+"/payments");
      const pd=await pr.json().catch(()=>({}));
      if(!pr.ok)throw Error(pd.error||"Could not check payment");
      const match=(pd.payments||[]).find(p=>Math.abs(Number(p.amount||0)-amount)<0.01);
      if(match){recordPayment(match);return true;}
      if(status)status.textContent="No payment detected yet. Customer can scan the QR.";
    }catch(e){
      if(status)status.textContent=e.message||"Could not check payment";
    }
    return false;
  };

  document.getElementById("checkRazorpayQr")?.addEventListener("click",check);
  const timer=setInterval(async()=>{
    const paid=await check();
    if(paid||stopped)clearInterval(timer);
  },5000);
  setTimeout(()=>clearInterval(timer),10*60*1000);
  await check();
}

function online(customerId){
  const s=state(),opts=(s.customers||[]).map(c=>'<option value="'+esc(c.id)+'" '+(c.id===customerId?"selected":"")+'>'+esc(c.name)+'</option>').join("");
  window.modal?.('<h2>💳 Collect Online Payment</h2><select id="gatewayCustomer"><option value="">Walk-in / Other</option>'+opts+'</select><input id="gatewayAmount" type="number" min="1" step=".01" placeholder="Amount ₹"><div class="row"><button class="btn primary" id="razorpayPayBtn">📲 Razorpay UPI QR</button></div><button class="btn" id="gatewaySettingsBtn">⚙ Payment Gateway Settings / Edit URL</button><p class="muted">Razorpay opens as a UPI QR only. No debit/credit card details or Paytm option.</p>');
  document.getElementById("razorpayPayBtn")?.addEventListener("click",()=>razorpayPay().catch(e=>toast(e.message||"Payment failed")));
  document.getElementById("gatewaySettingsBtn")?.addEventListener("click",settings);
}

function inject(){
  const grid=document.querySelector(".tools-grid");
  if(grid&&!document.getElementById("paymentGatewayTool")){
    const b=document.createElement("button");b.id="paymentGatewayTool";b.className="luxury-tool";b.innerHTML="💳<b>Payment Gateway</b><small>Razorpay • Paytm • UPI</small>";b.onclick=settings;grid.insertBefore(b,grid.firstChild);
  }
  
}
const original=window.openReceive;
window.openReceive=function(customerId=""){
  if(typeof original==="function")original(customerId);
  setTimeout(()=>{
    const host=document.getElementById("receiveQR");if(!host||document.getElementById("onlineGatewayBtn"))return;
    const b=document.createElement("button");b.id="onlineGatewayBtn";b.className="btn primary";b.textContent="📲 Pay Online — Razorpay UPI QR";b.onclick=()=>online(customerId);host.appendChild(b);
  },100);
};
window.openPaymentGatewaySettings=settings;window.openOnlinePayment=online;
document.addEventListener("DOMContentLoaded",()=>setTimeout(inject,150));
})();