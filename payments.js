(function(){
const K="dukaan_khata_payments_v1";
const load=()=>{try{return JSON.parse(localStorage.getItem(K)||"{}")}catch(e){return{}}};
const save=x=>localStorage.setItem(K,JSON.stringify(x));
const state=()=>{try{return JSON.parse(localStorage.getItem("dukaan_khata_infinity_v2")||"{}")}catch(e){return{}}};
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const toast=m=>window.toast?.(m);

function settings(){
  const c=load();
  window.modal?.('<h2>💳 Payment Gateway</h2><p class="muted">You can change these settings anytime. Never enter your Razorpay Secret Key here.</p><h3>Razorpay</h3><label>Razorpay Key ID</label><input id="rzpKey" autocomplete="off" placeholder="rzp_test_..." value="'+esc(c.razorpayKey||"")+'"><label>Secure backend HTTPS URL</label><input id="paymentApi" autocomplete="off" inputmode="url" placeholder="https://your-project.vercel.app" value="'+esc(c.backendUrl||"")+'"><div class="row"><button class="btn primary" id="saveGateway">💾 Save / Update</button><button class="btn" id="clearGateway">🗑 Clear URL</button></div><h3>Paytm</h3><input id="paytmUrl" placeholder="Paytm payment/checkout URL (optional)" value="'+esc(c.paytmUrl||"")+'"><button class="btn" id="savePaytm">Save Paytm</button><div class="card"><b>Current backend</b><small class="muted" id="currentBackend">'+esc(c.backendUrl||"Not configured")+'</small></div>');
  document.getElementById("saveGateway")?.addEventListener("click",()=>{
    const n=load();
    n.razorpayKey=document.getElementById("rzpKey")?.value.trim()||"";
    n.backendUrl=(document.getElementById("paymentApi")?.value.trim()||"").replace(/\/$/,"");
    save(n); window.closeModal?.(); toast("Razorpay settings updated ✓");
  });
  document.getElementById("clearGateway")?.addEventListener("click",()=>{
    const n=load(); n.backendUrl=""; save(n);
    const el=document.getElementById("paymentApi"); if(el) el.value="";
    toast("Backend URL cleared — enter a new URL");
  });
  document.getElementById("savePaytm")?.addEventListener("click",()=>{
    const n=load(); n.paytmUrl=document.getElementById("paytmUrl")?.value.trim()||""; save(n);
    window.closeModal?.(); toast("Paytm setting saved");
  });
}

async function razorpayPay(){
  const c=load(),amount=Number(document.getElementById("gatewayAmount")?.value)||0,customerId=document.getElementById("gatewayCustomer")?.value||"";
  if(amount<=0)return toast("Enter a valid amount");
  if(!c.razorpayKey||!c.backendUrl)return settings();
  if(!window.Razorpay)return toast("Razorpay Checkout is loading. Try again.");
  const s=state(),customer=(s.customers||[]).find(x=>x.id===customerId);
  const r=await fetch(c.backendUrl.replace(/\/$/,"")+"/api/razorpay/order",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount,customerId,customerName:customer?.name||"Customer"})});
  if(!r.ok){const d=await r.json().catch(()=>({}));throw Error(d.error||"Could not create Razorpay order");}
  const order=await r.json();
  new window.Razorpay({key:c.razorpayKey,amount:order.amount,currency:order.currency||"INR",name:(s.shop||{}).name||"Dukaan Khata",description:"Khata payment",order_id:order.id,prefill:{name:customer?.name||""},theme:{color:"#176b4d"},handler:async response=>{
    const v=await fetch(c.backendUrl.replace(/\/$/,"")+"/api/razorpay/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...response,customerId,amount})});
    const result=await v.json().catch(()=>({}));
    if(!v.ok||!result.verified)throw Error("Payment verification failed");
    s.tx=Array.isArray(s.tx)?s.tx:[];s.tx.unshift({id:"rzp_"+Date.now(),type:"payment",customerId,amount,mode:"razorpay",gateway:"razorpay",paymentId:response.razorpay_payment_id,orderId:response.razorpay_order_id,date:new Date().toISOString()});
    localStorage.setItem("dukaan_khata_infinity_v2",JSON.stringify(s));window.closeModal?.();window.render?.();toast("Razorpay payment verified ✓");
  }}).open();
}

function online(customerId){
  const s=state(),opts=(s.customers||[]).map(c=>'<option value="'+esc(c.id)+'" '+(c.id===customerId?"selected":"")+'>'+esc(c.name)+'</option>').join("");
  window.modal?.('<h2>💳 Collect Online Payment</h2><select id="gatewayCustomer"><option value="">Walk-in / Other</option>'+opts+'</select><input id="gatewayAmount" type="number" min="1" step=".01" placeholder="Amount ₹"><div class="row"><button class="btn primary" id="razorpayPayBtn">Pay with Razorpay</button><button class="btn" id="paytmPayBtn">Paytm</button></div><button class="btn" id="gatewaySettingsBtn">⚙ Payment Gateway Settings / Edit URL</button><p class="muted">Payment is recorded only after secure verification.</p>');
  document.getElementById("razorpayPayBtn")?.addEventListener("click",()=>razorpayPay().catch(e=>toast(e.message||"Payment failed")));
  document.getElementById("paytmPayBtn")?.addEventListener("click",()=>{const c=load(),a=Number(document.getElementById("gatewayAmount")?.value)||0;if(a<=0)return toast("Enter a valid amount");if(!c.paytmUrl)return settings();window.open(c.paytmUrl,"_blank","noopener")});
  document.getElementById("gatewaySettingsBtn")?.addEventListener("click",settings);
}

function inject(){
  const grid=document.querySelector(".tools-grid");
  if(grid&&!document.getElementById("paymentGatewayTool")){
    const b=document.createElement("button");b.id="paymentGatewayTool";b.className="luxury-tool";b.innerHTML="💳<b>Payment Gateway</b><small>Razorpay • Paytm • UPI</small>";b.onclick=settings;grid.insertBefore(b,grid.firstChild);
  }
  if(!window.Razorpay){const s=document.createElement("script");s.src="https://checkout.razorpay.com/v1/checkout.js";s.async=true;document.head.appendChild(s)}
}
const original=window.openReceive;
window.openReceive=function(customerId=""){
  if(typeof original==="function")original(customerId);
  setTimeout(()=>{
    const host=document.getElementById("receiveQR");if(!host||document.getElementById("onlineGatewayBtn"))return;
    const b=document.createElement("button");b.id="onlineGatewayBtn";b.className="btn primary";b.textContent="💳 Pay Online — Razorpay / Paytm";b.onclick=()=>online(customerId);host.appendChild(b);
  },100);
};
window.openPaymentGatewaySettings=settings;window.openOnlinePayment=online;
document.addEventListener("DOMContentLoaded",()=>setTimeout(inject,150));
})();