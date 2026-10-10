// Dukaan Khata — secure Google login + cross-device cloud sync via Supabase
(function(){
  const SUPABASE_URL="https://nzsldzyjpxwyyrdwkphp.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY="sb_publishable_k3ZPG1Wuqm3KFzoQAXnByA_YTMLkUG-";
  window.DukaanKhataMode="local";
  window.dkSupabase=null;
  window.DukaanKhataUser=null;
  let syncTimer=null, syncing=false, cloudPollTimer=null;

  function client(){
    if(window.dkSupabase)return window.dkSupabase;
    if(!window.supabase?.createClient)return null;
    window.dkSupabase=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return window.dkSupabase;
  }
  function accountFromUser(u){
    const identity=u?.identities?.find(x=>x?.provider==="google")?.identity_data||u?.identities?.[0]?.identity_data||{};
    const meta=u?.user_metadata||{};
    const picture=meta.avatar_url||meta.picture||meta.photo_url||identity.avatar_url||identity.picture||identity.photo_url||"";
    return u?{id:u.id,name:meta.full_name||meta.name||identity.full_name||identity.name||u.email?.split("@")[0]||"Google account",email:u.email||"",picture}:null;
  }
  function paintOwnerStartProfile(account){
    const img=document.getElementById("ownerStartPhoto"),initial=document.getElementById("ownerStartInitial"),btn=document.getElementById("ownerStartProfile");
    if(!img||!initial||!btn)return;
    const picture=String(account?.picture||"").trim();
    if(picture){img.src=picture;img.hidden=false;initial.hidden=true;img.onerror=()=>{img.hidden=true;initial.hidden=false;initial.textContent=(account?.name||"O").trim().charAt(0).toUpperCase()||"O"};}
    else{img.removeAttribute("src");img.hidden=true;initial.hidden=false;initial.textContent=(account?.name||"Owner").trim().charAt(0).toUpperCase()||"O";}
    btn.title=account?.name?("Owner: "+account.name):"Owner Google profile";
    btn.setAttribute("aria-label",account?.name?("Owner Google profile: "+account.name):"Owner Google profile");
  }
  function saveAccount(user){
    window.DukaanKhataUser=accountFromUser(user);
    localStorage.setItem("dukaan_khata_account",JSON.stringify(window.DukaanKhataUser||null));
    paintOwnerStartProfile(window.DukaanKhataUser);
  }
  try{paintOwnerStartProfile(JSON.parse(localStorage.getItem("dukaan_khata_account")||"null"))}catch(e){paintOwnerStartProfile(null)}
  function mergeStates(primary, secondary){
    const a=primary&&typeof primary==="object"?primary:{};
    const b=secondary&&typeof secondary==="object"?secondary:{};
    const out={...b,...a};
    for(const key of ["customers","tx","expenses","returns","reminders"]){
      const first=Array.isArray(a[key])?a[key]:[];
      const second=Array.isArray(b[key])?b[key]:[];
      const map=new Map();
      // Secondary first, then primary: primary wins if the same record ID exists.
      for(const item of second)map.set(String(item?.id??JSON.stringify(item)),item);
      for(const item of first)map.set(String(item?.id??JSON.stringify(item)),item);
      out[key]=Array.from(map.values());
    }
    out.shop={...(b.shop||{}),...(a.shop||{})};
    out.settings={...(b.settings||{}),...(a.settings||{})};
    return out;
  }
  function stateKey(){return "dukaan_khata_infinity_v2"}
  function same(a,b){try{return JSON.stringify(a)===JSON.stringify(b)}catch(e){return false}}
  function localState(){
    try{const v=JSON.parse(localStorage.getItem(stateKey())||"null");return v&&typeof v==="object"?v:null}catch(e){return null}
  }
  async function readCloud(sb,uid){
    const {data,error}=await sb.from("dukaan_khata_state").select("state,updated_at").eq("user_id",uid).maybeSingle();
    if(error)throw error;
    return data||null;
  }
  async function writeCloud(sb,uid,data){
    const {error}=await sb.from("dukaan_khata_state").upsert({user_id:uid,state:data,updated_at:new Date().toISOString()},{onConflict:"user_id"});
    if(error)throw error;
    const row=await readCloud(sb,uid);
    if(row?.updated_at)localStorage.setItem("dukaan_khata_cloud_updated_at",row.updated_at);
    localStorage.removeItem("dukaan_khata_local_dirty");
  }
  async function syncToCloud(){
    // Device-local mode: never merge, upload, or restore customer data from cloud.
    if(window.DukaanKhataMode==="local")return;
    const sb=client(),userId=window.DukaanKhataUser?.id;
    if(!sb||!userId||syncing)return;
    syncing=true;
    try{
      const local=localState()||window.state;
      if(!local||typeof local!=="object")return;
      const row=await readCloud(sb,userId);
      // Preserve unique records from both devices; local edits win same-ID conflicts.
      const merged=row?.state?mergeStates(local,row.state):local;
      await writeCloud(sb,userId,merged);
      localStorage.setItem(stateKey(),JSON.stringify(merged));
      if(!same(window.state,merged)){
        window.state=merged;
        try{if(typeof window.render==="function")window.render()}catch(e){console.warn("Could not redraw after cloud sync",e)}
      }
      localStorage.setItem("dukaan_khata_local_cloud_ready","1");
    }catch(e){
      console.error("Dukaan Khata database sync failed:",e);
      localStorage.setItem("dukaan_khata_local_dirty","1");
      if(window.toast)window.toast("Cloud sync failed. Check the Supabase database setup; this device's data is still saved.");
    }finally{syncing=false}
  }
  window.dkSyncNow=syncToCloud;
  window.dkQueueSync=function(){
    if(window.DukaanKhataMode==="local")return;
    localStorage.setItem("dukaan_khata_local_dirty","1");
    clearTimeout(syncTimer);
    syncTimer=setTimeout(syncToCloud,900);
  };
  async function pollCloud(){
    const sb=client(),userId=window.DukaanKhataUser?.id;
    if(!sb||!userId||syncing||localStorage.getItem("dukaan_khata_local_dirty")==="1")return;
    try{
      const row=await readCloud(sb,userId);
      if(!row?.state)return;
      const last=localStorage.getItem("dukaan_khata_cloud_updated_at")||"";
      if(row.updated_at&&row.updated_at!==last){
        const local=localState()||{};
        // The cloud copy wins conflicts on a clean device, while unique local records
        // are retained so a device with older data does not lose those records.
        const merged=mergeStates(row.state,local);
        localStorage.setItem(stateKey(),JSON.stringify(merged));
        localStorage.setItem("dukaan_khata_cloud_updated_at",row.updated_at);
        if(!same(merged,row.state)){
          localStorage.setItem("dukaan_khata_local_dirty","1");
          window.state=merged;
          try{if(typeof window.render==="function")window.render()}catch(e){console.warn("Could not redraw merged cloud data",e)}
          window.dkQueueSync();
        }else{
          localStorage.removeItem("dukaan_khata_local_dirty");
          if(!same(local,row.state)){
            window.state=row.state;
            try{if(typeof window.render==="function")window.render()}catch(e){console.warn("Could not redraw cloud data",e)}
          }
        }
      }
    }catch(e){console.error("Dukaan Khata cloud polling failed:",e)}
  }
  function startCloudPolling(){clearInterval(cloudPollTimer);cloudPollTimer=setInterval(pollCloud,5000)}
  async function restoreCloudState(user){
    const uid=user?.id;
    const restoredKey=uid?"dukaan_khata_restored_"+uid:"";
    if(!uid)return;
    if(restoredKey&&sessionStorage.getItem(restoredKey)==="1"){
      startCloudPolling();
      return;
    }
    try{
      const sb=client();
      const local=localState();
      const legacy=user?.user_metadata?.dukaan_khata;
      let row=await readCloud(sb,uid);
      if(!row){
        // One-time migration from the old metadata-based sync. Do not discard
        // records already stored locally on this phone/laptop.
        let initial=local||legacy||{};
        if(local&&legacy)initial=mergeStates(legacy,local);
        await writeCloud(sb,uid,initial);
        row=await readCloud(sb,uid);
      }else if(local){
        const dirty=localStorage.getItem("dukaan_khata_local_dirty")==="1";
        const merged=dirty?mergeStates(local,row.state):mergeStates(row.state,local);
        if(!same(merged,row.state))await writeCloud(sb,uid,merged);
        row=await readCloud(sb,uid);
      }
      if(row?.state){
        localStorage.setItem(stateKey(),JSON.stringify(row.state));
        localStorage.setItem("dukaan_khata_cloud_updated_at",row.updated_at||"");
        localStorage.removeItem("dukaan_khata_local_dirty");
        localStorage.setItem("dukaan_khata_local_cloud_ready","1");
        if(restoredKey)sessionStorage.setItem(restoredKey,"1");
        if(!same(localState(),row.state)){
          window.state=row.state;
          try{if(typeof window.render==="function")window.render()}catch(e){console.warn("Could not redraw restored cloud data",e)}
        }
      }
    }catch(e){
      console.error("Dukaan Khata initial database sync failed:",e);
      if(window.toast)window.toast("Cloud database is not ready yet. Your existing data remains saved on this device.");
    }
    startCloudPolling();
  }

  async function handleSession(session){
    const user=session?.user;
    const loginRole=sessionStorage.getItem("dk_login_role")||"owner";
    saveAccount(user);
    if(!user)return;
    if(loginRole==="customer"){
      sessionStorage.removeItem("dk_login_role");
      setTimeout(()=>openCustomerLogin(),250);
      return;
    }
    // Keep each browser/device independent. Do not restore or poll shared cloud state.
  }

  let initAttempts=0;
  async function init(){
    const sb=client();
    if(!sb){
      if(initAttempts++<20){setTimeout(init,500);return;}
      console.warn("Supabase client failed to load; app remains available without login.");
      return;
    }
    const {data:{session}}=await sb.auth.getSession();
    if(session)await handleSession(session);
    // getSession() handles the initial session; do not handle INITIAL_SESSION
    // again because that caused duplicate restore/reload cycles.
    sb.auth.onAuthStateChange((event,session)=>{
      if(event==="SIGNED_IN")setTimeout(()=>handleSession(session),0);
      if(event==="SIGNED_OUT")saveAccount(null);
    });
  }

  function openDukaanLogin(){
    if(!window.modal)return;
    modal('<div class="dk-access-shell">'+
      '<div class="dk-access-head"><div class="dk-access-icon">🔐</div><div><span class="dk-login-badge">LOGIN ACCESS</span><h2>Choose Access</h2><p>Choose how you want to enter Dukaan Khata.</p></div></div>'+
      '<div class="dk-access-grid">'+
      '<button type="button" class="dk-access-card owner" onclick="openOwnerLogin()"><span>🏪</span><div><b>Owner Login</b><small>Full Dukaan Khata • Customers • Bills • Payments • Reports • More</small></div><strong>→</strong></button>'+
      '<button type="button" class="dk-access-card customer" onclick="openCustomerLogin()"><span>👤</span><div><b>Customer Login</b><small>View your own Khata, Bills and Paid Payments by phone number</small></div><strong>→</strong></button>'+
      '</div>'+
      '<div class="dk-access-note">Owner access keeps the complete existing website. Customer access is read-only and shows only the customer selected by phone number.</div>'+
      '<button class="dk-login-close" onclick="closeModal()">× Close</button></div>');
  }
  async function openOwnerLogin(){
    const sb=client();
    if(!sb){toast("Cloud login is still loading. Try again.");return}
    const {data:{session}}=await sb.auth.getSession();
    if(session?.user){
      const u=accountFromUser(session.user);
      window.DukaanKhataUser=u;
      modal('<div class="dk-login-shell dk-login-signed">'+
        '<div class="dk-login-top"><div class="dk-login-icon dk-owner-profile-box">'+(u.picture?'<img src="'+esc(u.picture)+'" alt="Owner Google profile photo" referrerpolicy="no-referrer">':'👤')+'</div><span class="dk-login-badge">OWNER ACCOUNT</span></div>'+
        '<h2>Owner Account</h2><p class="dk-login-sub">Full Dukaan Khata access</p>'+
        '<div class="dk-account-card"><div class="dk-avatar">'+(u.picture?'<img src="'+esc(u.picture)+'" alt="">':'👤')+'</div><div><b>'+esc(u.name)+'</b><small>'+esc(u.email)+'</small></div><span class="dk-cloud">☁</span></div>'+
        '<button class="dk-login-action dk-login-primary" onclick="showPage(\'home\');closeModal()">⌂ Open Full Dashboard <span>→</span></button>'+
        '<button class="dk-login-action" onclick="startGoogleLogin()">⇄ Login with another owner account <span>→</span></button>'+
        '<button class="dk-login-action dk-logout" onclick="logoutDukaanKhata()">↪ Logout</button>'+
        '<button class="dk-login-close" onclick="closeModal()">× Close</button></div>');
      return;
    }
    modal('<div class="dk-login-shell">'+
      '<div class="dk-login-top"><div class="dk-login-icon">🏪</div><div><span class="dk-login-badge">OWNER LOGIN</span><h2>Full Access</h2></div></div>'+
      '<p class="dk-login-sub">Owner login opens the complete Dukaan Khata dashboard exactly as it works now.</p>'+
      '<button class="dk-login-action dk-google" id="googleLoginBtn"><span class="dk-google-logo">G</span><span><b>Continue with Google</b><small>Fast • Secure • No password</small></span><strong>→</strong></button>'+
      '<div class="dk-feature-row"><span>🏪</span><div><b>Full Owner Dashboard</b><small>Khata • Customers • Bills • Payments • Reports • More</small></div></div>'+
      '<p id="googleLoginMsg" class="dk-login-note">Use the owner Google account connected to this shop.</p>'+
      '<button class="dk-login-close" onclick="openDukaanLogin()">← Back</button></div>');
    document.getElementById("googleLoginBtn")?.addEventListener("click",startGoogleLogin);
  }
  function normPhone(v){
    let d=String(v??"").replace(/\D/g,"");
    // Treat Indian +91/0091 numbers consistently with locally saved 10-digit numbers.
    if(d.length===12&&d.startsWith("91"))d=d.slice(2);
    if(d.length===13&&d.startsWith("0091"))d=d.slice(4);
    return d;
  }
  function customerTransactions(c){
    return (state.tx||[]).filter(t=>String(t.customerId)===String(c.id));
  }
  function openCustomerLogin(){
    // Customer access is intentionally separate from Owner Google login.
    // It opens as a full-screen home-style customer area.
    const root=document.createElement("div");
    root.id="dkCustomerFullScreen";
    root.className="dk-customer-fullscreen";
    root.innerHTML='<div class="dk-customer-home">'+
      '<header class="dk-customer-home-head">'+
        '<button class="dk-customer-home-back" type="button" onclick="closeCustomerFullScreen()">←</button>'+
        '<div class="dk-customer-brand"><div class="dk-customer-brand-icon">👤</div><div><b>Dukaan Khata</b><small>Customer Space</small></div></div>'+
        '<span class="dk-customer-secure">🔒 Private</span>'+
      '</header>'+
      '<main class="dk-customer-home-main">'+
        '<div class="dk-customer-welcome"><span class="dk-login-badge">CUSTOMER ACCESS</span><h1>Welcome to <strong>My Khata</strong></h1><p>Enter your registered mobile number to securely view your Khata, Bills, Payments and Due.</p></div>'+
        '<section class="dk-customer-login-card">'+
          '<div class="dk-customer-card-icon">📱</div>'+
          '<h2>Find My Account</h2>'+
          '<p>Use the mobile number that your shopkeeper saved in Dukaan Khata.</p>'+
          '<label class="dk-customer-label">Registered mobile number<input id="customerLoginPhone" class="search dk-customer-phone-input" inputmode="tel" autocomplete="tel" placeholder="Enter mobile number"></label>'+
          '<button id="dkCustomerViewBtn" class="dk-login-action dk-login-primary dk-customer-view-btn" type="button">View My Khata <span>→</span></button>'+
          '<div class="dk-customer-home-features"><span>📒 Khata</span><span>🧾 Bills</span><span>💳 Payments</span><span>🔴 Due</span></div>'+
        '</section>'+
        '<div class="dk-customer-home-note">Read-only customer view • Your shopkeeper controls the account records</div>'+
      '</main>'+
    '</div>';
    document.body.appendChild(root);
    document.body.classList.add("dk-customer-mode");
    const viewBtn=document.getElementById("dkCustomerViewBtn");
    const phoneInput=document.getElementById("customerLoginPhone");
    viewBtn?.addEventListener("click",function(e){
      e.preventDefault();
      e.stopPropagation();
      const input=document.getElementById("customerLoginPhone");
      const q=normPhone(input?.value);
      if(!q){
        if(window.toast)toast("Please enter the customer mobile number");
        else alert("Please enter the customer mobile number");
        input?.focus();
        return;
      }
      const customers=Array.isArray(window.state?.customers)?window.state.customers:[];
      const matches=customers.filter(c=>normPhone(c.phone)===q);
      if(!matches.length){
        if(window.toast)toast("No customer found for this number");
        else alert("No customer found for this number");
        return;
      }
      if(matches.length===1){
        openCustomerPortal(matches[0].id);
        return;
      }
      modal('<div class="dk-customer-login"><div class="dk-customer-head"><div class="dk-customer-icon">👤</div><div><span class="dk-login-badge">CUSTOMER FOUND</span><h2>Select account</h2></div></div>'+
        matches.map(c=>'<button class="dk-access-card customer" type="button" data-customer-id="'+esc(c.id)+'" onclick="openCustomerPortal(this.dataset.customerId)"><span>👤</span><div><b>'+esc(c.name)+'</b><small>'+esc(c.phone||"")+'</small></div><strong>→</strong></button>').join("")+
        '<button class="dk-login-close" onclick="closeModal()">← Back</button></div>');
    });
    phoneInput?.addEventListener("keydown",function(e){
      if(e.key==="Enter"){e.preventDefault();findCustomerPortal();}
    });
    setTimeout(()=>phoneInput?.focus(),100);
  }
  function closeCustomerFullScreen(){
    document.getElementById("dkCustomerFullScreen")?.remove();
    document.body.classList.remove("dk-customer-mode");
    if(window.openDukaanLogin)openDukaanLogin();
  }
  function findCustomerPortal(){
    const q=normPhone(document.getElementById("customerLoginPhone")?.value);
    if(!q){toast("Enter the customer mobile number");return}
    const matches=(state.customers||[]).filter(c=>normPhone(c.phone)===q);
    if(!matches.length){
      toast("No customer found for this number");
      return;
    }
    if(matches.length===1){openCustomerPortal(matches[0].id);return}
    modal('<div class="dk-customer-login"><div class="dk-customer-head"><div class="dk-customer-icon">👤</div><div><span class="dk-login-badge">CUSTOMER FOUND</span><h2>Select account</h2></div></div>'+
        matches.map(c=>'<button class="dk-access-card customer" type="button" data-customer-id="'+esc(c.id)+'" onclick="openCustomerPortal(this.dataset.customerId)"><span>👤</span><div><b>'+esc(c.name)+'</b><small>'+esc(c.phone||"")+'</small></div><strong>→</strong></button>').join("")+
      '<button class="dk-login-close" onclick="openCustomerLogin()">← Back</button></div>');
  }
  function openCustomerPortal(customerId){
    const c=(state.customers||[]).find(x=>String(x.id)===String(customerId));
    if(!c){toast("Customer record not found");return}
    const tx=customerTransactions(c);
    const sales=tx.filter(t=>t.type==="sale");
    const payments=tx.filter(t=>t.type==="payment"&&Number(t.amount)>0);
    const due=Math.max(0,balance(c.id));
    const paid=payments.reduce((s,t)=>s+(Number(t.amount)||0),0);
    const salesTotal=sales.reduce((s,t)=>s+(Number(t.total)||0),0);
    const sorted=(arr)=>arr.slice().sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
    const billHtml=sales.length?sorted(sales).map(t=>{
      const items=Array.isArray(t.items)?t.items.map(i=>'<span>'+esc(i.name||"Item")+' × '+(Number(i.qty)||1)+' — '+money(Number(i.price)||0)+'</span>').join(""):"";
      return '<article class="dk-exec-record"><div class="dk-record-icon">🧾</div><div class="dk-record-main"><b>Bill '+esc(t.id||"")+'</b><small>'+new Date(t.date||Date.now()).toLocaleString()+'</small>'+(items?'<div class="dk-record-items">'+items+'</div>':"")+'</div><strong class="dk-record-amount">'+money(Number(t.total)||0)+'</strong></article>';
    }).join(""):'<div class="dk-empty">No bills available</div>';
    const payHtml=payments.length?sorted(payments).map(t=>'<article class="dk-exec-record"><div class="dk-record-icon">✓</div><div class="dk-record-main"><b>Payment received</b><small>'+new Date(t.date||Date.now()).toLocaleString()+' • '+esc(t.mode||"payment")+'</small></div><strong class="dk-customer-paid">+'+money(Number(t.amount)||0)+'</strong></article>').join(""):'<div class="dk-empty">No paid payments available</div>';
    const khataHtml=sorted(tx).map(t=>{
      const amount=t.type==="sale"?Number(t.total)||0:Number(t.amount)||0;
      return '<article class="dk-exec-record"><div class="dk-record-icon">'+(t.type==="payment"?"✓":"₹")+'</div><div class="dk-record-main"><b>'+esc(t.type==="sale"?"Khata Bill":"Paid Payment")+'</b><small>'+new Date(t.date||Date.now()).toLocaleString()+'</small></div><strong class="'+(t.type==="payment"?"dk-customer-paid":"dk-customer-due")+'">'+(t.type==="payment"?"+":"") +money(amount)+'</strong></article>';
    }).join("")||'<div class="dk-empty">No khata transactions available</div>';
    modal('<div class="dk-customer-portal dk-executive-portal">'+
      '<div class="dk-exec-hero"><button class="dk-exec-back" onclick="openCustomerLogin()">‹</button><div class="dk-exec-avatar">👤</div><div class="dk-exec-identity"><span>PRIVATE CUSTOMER ACCOUNT</span><h2>'+esc(c.name)+'</h2><small>📱 '+esc(c.phone||"")+'</small></div><div class="dk-exec-lock">🔒</div></div>'+
      '<div class="dk-exec-welcome"><b>Welcome back, '+esc(c.name)+'</b><small>Your personal Khata, bills and payment history</small></div>'+
      '<div class="dk-customer-summary dk-exec-summary"><div><small>KHATA / BILLS</small><b>'+money(salesTotal)+'</b></div><div><small>TOTAL PAID</small><b class="dk-customer-paid">'+money(paid)+'</b></div><div><small>OUTSTANDING DUE</small><b class="dk-customer-due">'+money(due)+'</b></div></div>'+
      '<div class="dk-exec-section"><div class="dk-exec-section-title"><span>📒</span><div><h3>My Khata</h3><small>Complete transaction history</small></div></div>'+khataHtml+'</div>'+
      '<div class="dk-exec-section"><div class="dk-exec-section-title"><span>🧾</span><div><h3>My Bills</h3><small>All bills linked to your account</small></div></div>'+billHtml+'</div>'+
      '<div class="dk-exec-section"><div class="dk-exec-section-title"><span>💚</span><div><h3>Paid Payments</h3><small>Payments recorded for this account</small></div></div>'+payHtml+'</div>'+
      '<div class="dk-exec-private">🔐 <span>This is a read-only private customer view. Owner controls and other customers are hidden.</span></div>'+
      '<button class="dk-login-close" onclick="closeModal()">× Close Customer View</button></div>');
  }
  async function startGoogleLogin(){
    const sb=client();
    if(!sb){toast("Cloud login is still loading. Try again.");return}
    const {error}=await sb.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.href}});
    if(error){console.error(error);toast("Google login could not start. Check Supabase Google provider settings.");}
  }

  async function logoutDukaanKhata(){
    const sb=client();
    if(sb)await sb.auth.signOut();
    saveAccount(null);
    closeModal();
    toast("Logged out");
  }

  window.openDukaanLogin=openDukaanLogin;
  window.openOwnerLogin=openOwnerLogin;
  window.openCustomerLogin=openCustomerLogin;
  window.findCustomerPortal=findCustomerPortal;
  window.openCustomerPortal=openCustomerPortal;
  window.closeCustomerFullScreen=closeCustomerFullScreen;
  window.openDukaanProfile=openDukaanLogin;
  window.logoutDukaanKhata=logoutDukaanKhata;
  window.startGoogleLogin=startGoogleLogin;

  function installCustomerClickFallback(){
    if(window.__dkCustomerClickFallback)return;
    window.__dkCustomerClickFallback=true;
    document.addEventListener("click",function(e){
      const btn=e.target?.closest?.("#dkCustomerViewBtn");
      if(!btn)return;
      // login-access.js owns the current full-screen customer flow and its status message.
      // Do not let this legacy capture-phase listener swallow its button click.
      if(document.getElementById("dkLoginAccessStandalone") || document.getElementById("dkCustomerStatus"))return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const input=document.getElementById("customerLoginPhone");
      const q=normPhone(input?.value);
      if(!q){
        if(window.toast)toast("Please enter the customer mobile number");
        else alert("Please enter the customer mobile number");
        input?.focus();
        return;
      }
      const customers=Array.isArray(window.state?.customers)?window.state.customers:[];
      const matches=customers.filter(c=>normPhone(c.phone)===q);
      if(matches.length===1){openCustomerPortal(matches[0].id);return}
      if(!matches.length){
        if(window.toast)toast("No customer found for this number");
        else alert("No customer found for this number");
        return;
      }
      modal('<div class="dk-customer-login"><div class="dk-customer-head"><div class="dk-customer-icon">👤</div><div><span class="dk-login-badge">CUSTOMER FOUND</span><h2>Select account</h2></div></div>'+
        matches.map(c=>'<button class="dk-access-card customer" type="button" data-customer-id="'+esc(c.id)+'" onclick="openCustomerPortal(this.dataset.customerId)"><span>👤</span><div><b>'+esc(c.name)+'</b><small>'+esc(c.phone||"")+'</small></div><strong>→</strong></button>').join("")+
        '<button class="dk-login-close" onclick="closeModal()">← Back</button></div>');
    },true);
  }

  function boot(){installCustomerClickFallback();init()}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();