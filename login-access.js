(function(){
  function getSB(){
    if(window.dkSupabase)return window.dkSupabase;
    if(window.supabase&&window.supabase.createClient){
      window.dkSupabase=window.supabase.createClient(
        "https://nzsldzyjpxwyyrdwkphp.supabase.co",
        "sb_publishable_k3ZPG1Wuqm3KFzoQAXnByA_YTMLkUG-",
        {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
      );
    }
    return window.dkSupabase;
  }
  // Customer auth uses its own storage key so OTP login never replaces an owner's session.
  function getCustomerSB(){
    if(window.dkCustomerSupabase)return window.dkCustomerSupabase;
    if(window.supabase&&window.supabase.createClient){
      window.dkCustomerSupabase=window.supabase.createClient(
        "https://nzsldzyjpxwyyrdwkphp.supabase.co",
        "sb_publishable_k3ZPG1Wuqm3KFzoQAXnByA_YTMLkUG-",
        {auth:{storageKey:"dk_customer_auth",persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}
      );
    }
    return window.dkCustomerSupabase;
  }
  function esc2(v){
    return String(v??"").replace(/[&<>"']/g,function(c){return({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])});
  }
  function phone2(v){
    let d=String(v??"").replace(/\D/g,"");
    if(d.length===12&&d.startsWith("91"))d=d.slice(2);
    if(d.length===13&&d.startsWith("0091"))d=d.slice(4);
    return d;
  }
  function money2(v){
    if(typeof window.money==="function")return window.money(v);
    return "₹"+Number(v||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
  }
  function closeCustomer2(){
    document.getElementById("dkCustomerFullScreen")?.remove();
    document.body.classList.remove("dk-customer-mode");
    if(typeof window.modal==="function"){
      window.modal('<div class="dk-access-shell"><div class="dk-access-head"><div class="dk-access-icon">🔐</div><div><span class="dk-login-badge">LOGIN ACCESS</span><h2>Choose Access</h2></div></div><div class="dk-access-grid"><button type="button" class="dk-access-card owner" id="dkOwnerAccessBtn"><span>🏪</span><div><b>Owner Login</b><small>Full Dukaan Khata access</small></div><strong>→</strong></button><button type="button" class="dk-access-card customer" id="dkCustomerAccessBtn"><span>👤</span><div><b>Customer Login</b><small>View your own Khata by mobile number</small></div><strong>→</strong></button></div><button class="dk-login-close" onclick="closeModal()">× Close</button></div>');
      document.getElementById("dkOwnerAccessBtn")?.addEventListener("click",window.openOwnerLogin);
      document.getElementById("dkCustomerAccessBtn")?.addEventListener("click",window.openCustomerLogin);
    }
  }

  function renderGlobalCustomerAccounts2(accounts){
    const root=document.getElementById("dkCustomerFullScreen");
    if(!root)return;
    const safe=Array.isArray(accounts)?accounts:[];
    const esc=esc2;
    const money=money2;
    const date=t=>{const d=new Date(t?.date||t?.created_at||Date.now());return Number.isNaN(d.getTime())?"—":d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})};
    const itemRows=t=>{
      let raw=t?.lines??t?.items??t?.itemLines??t?.products??t?.productItems??[];
      if(typeof raw==="string"){try{raw=JSON.parse(raw)}catch(e){raw=[]}}
      if(!Array.isArray(raw)&&raw&&typeof raw==="object")raw=[raw];
      if(!Array.isArray(raw)||!raw.length)return "";
      return raw.map(i=>'<div class="dk-exec-record"><div class="dk-record-icon">🛍️</div><div class="dk-record-main"><b>'+esc(i?.name??i?.itemName??i?.productName??i?.title??"Item")+'</b><small>Qty: '+Math.max(1,Number(i?.qty??i?.quantity??1)||1)+' • '+date(t)+'</small></div><strong>'+money(Number(i?.total??i?.amount)||((Number(i?.price??i?.rate??i?.unitPrice)||0)*(Number(i?.qty??i?.quantity)||1)))+'</strong></div>').join("");
    };
    const accountCards=safe.map((a,index)=>{
      const c=a.customer||{},shop=a.shop||{},tx=Array.isArray(a.transactions)?a.transactions:[];
      const sales=tx.filter(t=>t.type==="sale"),payments=tx.filter(t=>t.type==="payment"&&Number(t.amount)>0);
      const total=sales.reduce((n,t)=>n+(Number(t.total)||0),0),paid=payments.reduce((n,t)=>n+(Number(t.amount)||0),0),due=Math.max(0,total-paid);
      const normalized=phone2(shop.phone),tel=normalized.length===10?"+91"+normalized:(String(shop.phone||"").trim());
      const items=sales.slice().reverse().map(t=>itemRows(t)).join("")||'<div class="dk-empty">No item details recorded</div>';
      const bills=sales.slice().reverse().map(t=>'<div class="dk-exec-record"><div class="dk-record-icon">🧾</div><div class="dk-record-main"><b>Bill</b><small>'+date(t)+'</small></div><strong>'+money(Number(t.total)||0)+'</strong></div>').join("")||'<div class="dk-empty">No bills found</div>';
      const paymentRows=payments.slice().reverse().map(t=>'<div class="dk-exec-record"><div class="dk-record-icon">💳</div><div class="dk-record-main"><b>Payment received</b><small>'+date(t)+(t.mode?" • "+esc(t.mode):"")+'</small></div><strong class="dk-customer-paid">+'+money(Number(t.amount)||0)+'</strong></div>').join("")||'<div class="dk-empty">No payments recorded</div>';
      return '<section class="dk-customer-login-card" style="max-width:900px;text-align:left;margin:0 auto 18px"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><span class="dk-login-badge">REGISTERED SHOP '+(index+1)+'</span><h2 style="margin:8px 0 3px">'+esc(shop.name||"Dukaan")+'</h2><p style="margin:0;color:#64748b">'+esc(shop.address||"")+'</p><small>Customer: '+esc(c.name||"Customer")+'</small></div>'+(tel.replace(/\D/g,"").length>=10?'<a class="dk-customer-call-owner" href="tel:'+esc(tel)+'">☎ Call Owner</a>':'<span class="dk-customer-call-owner-unavailable">Owner phone not available</span>')+'</div><div class="dk-customer-summary dk-exec-summary"><div><small>TOTAL TAKEN</small><b>'+money(total)+'</b></div><div><small>TOTAL PAID</small><b class="dk-customer-paid">'+money(paid)+'</b></div><div><small>TOTAL DUE</small><b class="dk-customer-due">'+money(due)+'</b></div></div><div class="dk-exec-section"><div class="dk-exec-section-title"><span>🛍️</span><div><h3>Items Taken</h3></div></div>'+items+'</div><div class="dk-exec-section"><div class="dk-exec-section-title"><span>🧾</span><div><h3>My Bills</h3></div></div>'+bills+'</div><div class="dk-exec-section"><div class="dk-exec-section-title"><span>💳</span><div><h3>Payment History</h3></div></div>'+paymentRows+'</div></section>';
    }).join("");
    root.innerHTML='<div class="dk-customer-home"><header class="dk-customer-home-head"><button class="dk-customer-home-back" id="dkGlobalBack" type="button">←</button><div class="dk-customer-brand"><div class="dk-customer-brand-icon">👤</div><div><b>Dukaan Khata</b><small>My Customer Space</small></div></div><span class="dk-customer-secure">🔒 Read Only</span></header><main class="dk-customer-home-main" style="max-width:1000px"><div class="dk-customer-welcome"><span class="dk-login-badge">CUSTOMER ACCESS</span><h1>My <strong>Shops & Khata</strong></h1><p>'+safe.length+' registered shop account(s) found for your verified mobile number.</p></div>'+(safe.length?accountCards:'<section class="dk-customer-login-card"><h2>No shop records found</h2><p>No shop has registered this verified mobile number yet. Ask your shopkeeper to check the number saved in your customer record.</p></section>')+'<button type="button" class="dk-login-close" id="dkCustomerLogout2">↪ Sign out</button></main></div>';
    root.querySelector("#dkGlobalBack")?.addEventListener("click",()=>openCustomer2(true));
    root.querySelector("#dkCustomerLogout2")?.addEventListener("click",async()=>{try{await getCustomerSB()?.auth.signOut()}catch(e){};openCustomer2(true)});
  }
  function openCustomer2(hideBack){
    document.getElementById("modal")?.classList.add("hidden");
    document.getElementById("dkCustomerFullScreen")?.remove();
    
    const root=document.createElement("div");
    root.id="dkCustomerFullScreen";
    root.className="dk-customer-fullscreen";
    root.innerHTML='<div class="dk-customer-home"><header class="dk-customer-home-head"><button class="dk-customer-home-back" id="dkCustomerBack" type="button">←</button><div class="dk-customer-brand"><div class="dk-customer-brand-icon">👤</div><div><b>Dukaan Khata</b><small>Customer Space</small></div></div><span class="dk-customer-secure">🔒 Private</span></header><main class="dk-customer-home-main"><div class="dk-customer-welcome"><span class="dk-login-badge">CUSTOMER ACCESS</span><h1>Welcome to <strong>My Khata</strong></h1><p>Enter the mobile number registered by your shopkeeper.</p></div><section class="dk-customer-login-card"><div class="dk-customer-card-icon">📱</div><h2>Find My Account</h2><p>Use your registered mobile number to view your Khata.</p><label class="dk-customer-label">Registered mobile number<input id="customerLoginPhone" class="search dk-customer-phone-input" inputmode="tel" autocomplete="tel" placeholder="Enter mobile number"></label><button id="dkCustomerViewBtn" class="dk-login-action dk-login-primary dk-customer-view-btn" type="button">View My Khata <span>→</span></button><div id="dkCustomerStatus" style="margin-top:12px;min-height:20px;font-weight:700;font-size:13px"></div><div class="dk-customer-home-features"><span>📒 Khata</span><span>🧾 Bills</span><span>💳 Payments</span><span>🔴 Due</span></div></section><div class="dk-customer-home-note">Read-only customer view • Your shopkeeper controls the account records</div></main></div>';
    document.body.appendChild(root);
    document.body.classList.add("dk-customer-mode");
    const input=root.querySelector("#customerLoginPhone"),btn=root.querySelector("#dkCustomerViewBtn"),status=root.querySelector("#dkCustomerStatus");
    if(hideBack) root.querySelector("#dkCustomerBack")?.remove(); else if(hideBack){ root.querySelector("#dkCustomerBack")?.remove(); root.querySelector(".dk-customer-home-head")?.querySelector(".dk-customer-home-back")?.remove(); } else root.querySelector("#dkCustomerBack")?.addEventListener("click",closeCustomer2);
    let otpSent=false;
    const otpInput=document.createElement("input");
    otpInput.id="dkCustomerOtp";
    otpInput.className="search dk-customer-phone-input";
    otpInput.inputMode="numeric";
    otpInput.autocomplete="one-time-code";
    otpInput.placeholder="Enter SMS verification code";
    otpInput.maxLength=8;
    otpInput.style.display="none";
    input?.parentElement?.insertAdjacentElement("afterend",otpInput);
    async function lookup(){
      const q=phone2(input?.value);
      if(!q||q.length!==10){status.textContent="Enter a valid 10-digit Indian mobile number.";input?.focus();return}
      const sb=getCustomerSB();
      if(!sb){status.textContent="Secure login is loading. Refresh and try again.";return}
      btn.disabled=true;
      try{
        if(!otpSent){
          const {error}=await sb.auth.signInWithOtp({phone:"+91"+q});
          if(error)throw error;
          otpSent=true;
          otpInput.style.display="block";
          btn.innerHTML="Verify OTP & Find My Shops <span>→</span>";
          status.textContent="OTP sent if this mobile number can receive SMS. Enter the code to continue.";
          otpInput.focus();
          return;
        }
        const token=String(otpInput.value||"").trim();
        if(!token){status.textContent="Enter the OTP sent to your mobile.";otpInput.focus();return}
        const {data:authData,error:otpError}=await sb.auth.verifyOtp({phone:"+91"+q,token,type:"sms"});
        if(otpError||!authData?.session)throw otpError||new Error("OTP verification did not create a session.");
        status.textContent="Mobile verified. Finding your registered shops…";
        const {data,error}=await sb.functions.invoke("customer-portal",{body:{}});
        if(error)throw error;
        renderGlobalCustomerAccounts2(data?.accounts||[]);
      }catch(err){
        console.error("Customer OTP / portal lookup failed:",err);
        status.textContent=String(err?.message||"Could not verify your mobile number. Check the OTP and try again.");
      }finally{btn.disabled=false}
    }
    btn?.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();status.textContent=otpSent?"Verifying OTP…":"Sending verification OTP…";lookup()});
    input?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();lookup()}});

    setTimeout(()=>input.focus(),100);
  }
  async function owner2(){
    const sb=getSB();
    if(!sb){alert("Owner login is still loading. Please try again.");return}
    const {data:{session}}=await sb.auth.getSession();
    if(session?.user){
      const u=session.user, name=u.user_metadata?.full_name||u.user_metadata?.name||u.email?.split("@")[0]||"Owner";
      window.modal('<div class="dk-login-shell dk-login-signed"><div class="dk-login-top"><div class="dk-login-icon">👤</div><span class="dk-login-badge">OWNER ACCOUNT</span></div><h2>'+esc2(name)+'</h2><p class="dk-login-sub">'+esc2(u.email||"Google account")+'</p><button class="dk-login-action dk-login-primary" id="dkOpenDashboard">⌂ Open Full Dashboard <span>→</span></button><button class="dk-login-action" id="dkOtherOwner">⇄ Login with another owner account <span>→</span></button><button class="dk-login-action dk-logout" id="dkOwnerLogout">↪ Logout</button><button class="dk-login-close" onclick="closeModal()">× Close</button></div>');
      document.getElementById("dkOpenDashboard")?.addEventListener("click",()=>{window.showPage?.("home");window.closeModal?.()});
      document.getElementById("dkOtherOwner")?.addEventListener("click",()=>startOwnerGoogle2());
      document.getElementById("dkOwnerLogout")?.addEventListener("click",async()=>{await sb.auth.signOut();window.closeModal?.();window.toast?.("Logged out")});
      return;
    }
    window.modal('<div class="dk-login-shell"><div class="dk-login-top"><div class="dk-login-icon">🏪</div><div><span class="dk-login-badge">OWNER LOGIN</span><h2>Full Access</h2></div></div><p class="dk-login-sub">Sign in with the owner Google account to access the complete dashboard.</p><button class="dk-login-action dk-google" id="dkOwnerGoogle"><span class="dk-google-logo">G</span><span><b>Continue with Google</b><small>Fast • Secure • No password</small></span><strong>→</strong></button><button class="dk-login-close" onclick="openDukaanLogin()">← Back</button></div>');
    document.getElementById("dkOwnerGoogle")?.addEventListener("click",startOwnerGoogle2);
  }
  async function startOwnerGoogle2(){
    const sb=getSB();
    if(!sb){alert("Google login is still loading.");return}
    const {error}=await sb.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.href}});
    if(error)alert("Google login could not start: "+error.message);
  }

  function customerPortal2(customerId){
    const customers=Array.isArray(window.state?.customers)?window.state.customers:[];
    const c=customers.find(x=>String(x.id)===String(customerId));
    if(!c){alert("Customer record not found.");return}
    const tx=Array.isArray(window.state?.tx)?window.state.tx.filter(t=>String(t.customerId)===String(c.id)||String(t.customer_id)===String(c.id)):[];
    const sales=tx.filter(t=>t.type==="sale");
    const payments=tx.filter(t=>t.type==="payment"&&Number(t.amount)>0);
    const salesTotal=sales.reduce((s,t)=>s+(Number(t.total)||0),0);
    const paid=payments.reduce((s,t)=>s+(Number(t.amount)||0),0);
    const due=Math.max(0,salesTotal-paid);
    const date=t=>new Date(t.date||Date.now()).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});

    function itemList2(t){
      let raw=t?.lines??t?.items??t?.itemLines??t?.products??t?.productItems??[];
      if(typeof raw==="string"){
        try{raw=JSON.parse(raw)}catch(e){raw=[]}
      }
      if(!Array.isArray(raw)&&raw&&typeof raw==="object")raw=[raw];
      return Array.isArray(raw)?raw.filter(Boolean):[];
    }
    function itemName2(i){return i?.name??i?.itemName??i?.productName??i?.title??"Item"}
    function itemQty2(i){return Math.max(1,Number(i?.qty??i?.quantity??1)||1)}
    function itemUnit2(i){return Number(i?.price??i?.rate??i?.cost??i?.unitPrice??0)||0}
    function itemTotal2(i){
      const explicit=Number(i?.total??i?.amount);
      const unit=itemUnit2(i),qty=itemQty2(i);
      return Number.isFinite(explicit)&&explicit>0?explicit:unit*qty;
    }

    /* Allocate recorded payments FIFO across taken items so the customer can
       see which items are paid and which item value is still outstanding. */
    let paymentPool=paid;
    const takenItems=[];
    sales.slice().sort((a,b)=>new Date(a.date||0)-new Date(b.date||0)).forEach(t=>{
      // Dukaan Khata stores Add Many Items as t.lines. Keep t.items as a legacy fallback.
      const rawItems=itemList2(t);
      const items=rawItems.length?rawItems:[{name:"Items",qty:1,price:Number(t.total)||0,total:Number(t.total)||0}];
      items.forEach(i=>{
        const qty=itemQty2(i);
        const unit=itemUnit2(i);
        const itemTotal=itemTotal2(i);
        const value=itemTotal>0?itemTotal:0;
        const paidHere=Math.min(paymentPool,value);
        paymentPool=Math.max(0,paymentPool-paidHere);
        const remaining=Math.max(0,value-paidHere);
        takenItems.push({name:itemName2(i),qty,unit,value,paidHere,remaining,date:date(t)});
      });
    });
    const paidItems=takenItems.filter(i=>i.value>0&&i.paidHere>0);
    const dueItems=takenItems.filter(i=>i.value>0&&i.remaining>0);

    const itemRow=(i,mode)=>{
      const amount=mode==="paid"?i.paidHere:i.remaining;
      const unit=i.unit>0?money2(i.unit):"—";
      const title=esc2(i.name)+" "+unit;
      return '<div class="dk-exec-record"><div class="dk-record-icon">'+(mode==="paid"?"🟢":"🔴")+'</div><div class="dk-record-main"><b style="font-size:17px">'+title+'</b><small>Qty: '+i.qty+' • '+i.date+' • Item total: '+money2(i.value)+'</small></div><strong class="'+(mode==="paid"?"dk-customer-paid":"dk-customer-due")+'">'+money2(amount)+'</strong></div>';
    };

    const allItemRows=takenItems.length?takenItems.slice().reverse().map(i=>'<div class="dk-exec-record"><div class="dk-record-icon">🛍️</div><div class="dk-record-main"><b>'+esc2(i.name)+'</b><small>Qty: '+i.qty+' • Unit price: '+(i.unit>0?money2(i.unit):"—")+' • '+i.date+'</small></div><strong>'+money2(i.value)+'</strong></div>').join(""):'<div class="dk-empty">No items found</div>';
    const dueItemRows=dueItems.length?dueItems.slice().reverse().map(i=>itemRow(i,"due")).join(""):'<div class="dk-empty">No due items 🎉</div>';
    const paidItemRows=paidItems.length?paidItems.slice().reverse().map(i=>itemRow(i,"paid")).join(""):'<div class="dk-empty">No paid items yet</div>';

    const billRows=sales.length?sales.slice().reverse().map(t=>{
      const rawItems=itemList2(t);
      const items=rawItems.map(i=>esc2(itemName2(i))+" — "+money2(itemUnit2(i))).join(" • ");
      return '<div class="dk-exec-record"><div class="dk-record-icon">🧾</div><div class="dk-record-main"><b>Bill</b><small>'+date(t)+(items?" • "+items:"")+'</small></div><strong>'+money2(Number(t.total)||0)+'</strong></div>';
    }).join(""):'<div class="dk-empty">No bills found</div>';
    const khataItemRows=sales.slice().reverse().map(t=>{
      const rawItems=Array.isArray(t.lines)&&t.lines.length?t.lines:(Array.isArray(t.items)?t.items:[]);
      if(!rawItems.length)return '<div class="dk-exec-record"><div class="dk-record-icon">🧾</div><div class="dk-record-main"><b>Khata Bill</b><small>'+date(t)+'</small></div><strong>'+money2(Number(t.total)||0)+'</strong></div>';
      return rawItems.map(i=>'<div class="dk-exec-record"><div class="dk-record-icon">🛍️</div><div class="dk-record-main"><b>'+esc2(i.name||"Item")+'</b><small>Qty: '+(itemQty2(i))+' • '+date(t)+'</small></div><strong>'+money2(itemTotal2(i))+'</strong></div>').join("");
    }).join("")||'<div class="dk-empty">No khata items found</div>';
    const paymentRows=payments.length?payments.slice().reverse().map(t=>'<div class="dk-exec-record"><div class="dk-record-icon">✓</div><div class="dk-record-main"><b>Payment Received</b><small>'+date(t)+(t.mode?" • "+esc2(t.mode):"")+'</small></div><strong class="dk-customer-paid">+'+money2(Number(t.amount)||0)+'</strong></div>').join(""):'<div class="dk-empty">No paid payments found</div>';

    document.getElementById("dkCustomerFullScreen")?.remove();
    document.body.classList.remove("dk-customer-mode");
    const root=document.createElement("div");
    root.id="dkCustomerFullScreen";
    root.className="dk-customer-fullscreen";
    root.innerHTML='<div class="dk-customer-home"><header class="dk-customer-home-head"><button class="dk-customer-home-back" id="dkPortalBack" type="button">←</button><div class="dk-customer-brand"><div class="dk-customer-brand-icon">👤</div><div><b>Dukaan Khata</b><small>My Customer Khata</small></div></div><span class="dk-customer-secure">🔒 Read Only</span></header><main class="dk-customer-home-main"><div class="dk-customer-owner-contact">'+(function(){const raw=String(window.state?.shop?.phone||"").trim();const digits=raw.replace(/\D/g,"");const normalized=raw.startsWith("+")?"+"+digits:(digits.length===10?"+91"+digits:(digits.length===12&&digits.startsWith("91")?"+"+digits:digits));return digits.length>=7?'<a class="dk-customer-call-owner" href="tel:'+esc2(normalized)+'">☎ Call Shop Owner</a>':'<div class="dk-customer-call-owner-unavailable">☎ Call Shop Owner <small>Owner contact number has not been added in Shop Profile.</small></div>'})()+'</div><section class="dk-customer-login-card" style="max-width:900px;text-align:left"><div style="display:flex;align-items:center;gap:14px;margin-bottom:20px"><div class="dk-customer-card-icon" style="margin:0">👤</div><div><span class="dk-login-badge">MY KHATA</span><h2 style="margin:6px 0 3px">'+esc2(c.name)+'</h2><p style="margin:0;color:#64748b">📱 '+esc2(c.phone||"")+'</p></div></div><div class="dk-customer-summary dk-exec-summary"><div><small>TOTAL TAKEN</small><b>'+money2(salesTotal)+'</b></div><div><small>TOTAL PAID</small><b class="dk-customer-paid">'+money2(paid)+'</b></div><div><small>TOTAL DUE</small><b class="dk-customer-due">'+money2(due)+'</b></div></div><div class="dk-exec-section"><div class="dk-exec-section-title"><span>🛍️</span><div><h3>All Taken Items</h3><small>Every item taken, with quantity and price</small></div></div>'+allItemRows+'</div><div class="dk-exec-section"><div class="dk-exec-section-title"><span>🔴</span><div><h3>Due Items</h3><small>Items/value still outstanding</small></div></div>'+dueItemRows+'</div><div class="dk-exec-section"><div class="dk-exec-section-title"><span>🟢</span><div><h3>Paid Items</h3><small>Items/value covered by recorded payments</small></div></div>'+paidItemRows+'</div><div class="dk-exec-section"><div class="dk-exec-section-title"><span>📒</span><div><h3>My Khata</h3><small>Every product taken with its price</small></div></div>'+khataItemRows+(payments.length?payments.slice().reverse().map(t=>'<div class="dk-exec-record"><div class="dk-record-icon">✓</div><div class="dk-record-main"><b>Paid Payment</b><small>'+date(t)+(t.mode?" • "+esc2(t.mode):"")+'</small></div><strong class="dk-customer-paid">+'+money2(Number(t.amount)||0)+'</strong></div>').join(""):"")+'</div><div class="dk-exec-section"><div class="dk-exec-section-title"><span>🧾</span><div><h3>My Bills</h3><small>All bills linked to your account</small></div></div>'+billRows+'</div><div class="dk-exec-section"><div class="dk-exec-section-title"><span>💳</span><div><h3>Paid Payments</h3><small>Payments recorded for this account</small></div></div>'+paymentRows+'</div><div class="dk-exec-private">🔐 <span>This customer view is read-only. Other customers and owner controls are hidden.</span></div></section></main></div>';
    document.body.appendChild(root);
    document.body.classList.add("dk-customer-mode");
    root.querySelector("#dkPortalBack")?.addEventListener("click",openCustomer2);
  }

  function loginAccess2(){
    document.getElementById("dkLoginAccessStandalone")?.remove();
    document.getElementById("modal")?.classList.add("hidden");
    const root=document.createElement("div");
    root.id="dkLoginAccessStandalone";
    root.style.cssText="position:fixed;inset:0;z-index:2147483000;background:rgba(7,12,24,.78);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto";
    root.innerHTML='<div class="dk-access-shell" style="width:min(680px,100%);max-height:calc(100vh - 40px);overflow:auto;position:relative"><div class="dk-access-head"><div class="dk-access-icon">🔐</div><div><span class="dk-login-badge">LOGIN ACCESS</span><h2>Choose Access</h2><p>Choose how you want to enter Dukaan Khata.</p></div></div><div class="dk-access-grid"><button type="button" class="dk-access-card owner" id="dkOwnerAccessBtn"><span>🏪</span><div><b>Owner Login</b><small>Full Dukaan Khata • Customers • Bills • Payments • Reports • More</small></div><strong>→</strong></button><button type="button" class="dk-access-card customer" id="dkCustomerAccessBtn"><span>👤</span><div><b>Customer Login</b><small>View your own Khata, Bills and Paid Payments by phone number</small></div><strong>→</strong></button></div><div class="dk-access-note">Owner uses Google. Customer uses mobile number.</div></div>';
    document.body.appendChild(root);
    
    root.querySelector("#dkOwnerAccessBtn")?.addEventListener("click",()=>{root.remove();owner2()});
    root.querySelector("#dkCustomerAccessBtn")?.addEventListener("click",()=>{root.remove();openCustomer2(true)});
  }

  function startupLogin2(){
    if(document.getElementById("dkLoginAccessStandalone")||document.getElementById("dkCustomerFullScreen"))return;
    const splash=document.getElementById("uvmsLaunchSplash");
    if(splash && !splash.classList.contains("uvms-launch-hide")){
      if(!window.__dkLoginWaitingForLaunch){
        window.__dkLoginWaitingForLaunch=true;
        window.addEventListener("uvms-launch-complete",()=>{window.__dkLoginWaitingForLaunch=false;setTimeout(startupLogin2,50)},{once:true});
      }
      return;
    }
    loginAccess2();
  }
  window.openDukaanLogin=loginAccess2;
  window.openOwnerLogin=owner2;
  window.openCustomerLogin=openCustomer2;
  window.openCustomerPortal=customerPortal2;
  window.addEventListener("DOMContentLoaded",function(){setTimeout(startupLogin2,80)});
})();