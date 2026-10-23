// Dukaan Khata — device-local mode; records stay in this browser/device
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
    const identities=Array.isArray(u?.identities)?u.identities:[];
    const googleIdentity=identities.find(x=>String(x?.provider||"").toLowerCase()==="google")||identities.find(x=>x?.identity_data?.picture||x?.identity_data?.avatar_url)||identities[0]||{};
    const identity=googleIdentity.identity_data||{};
    const meta=u?.user_metadata||{};
    const picture=meta.picture||meta.avatar_url||meta.photo_url||meta.profile_picture||identity.picture||identity.avatar_url||identity.photo_url||identity.profile_picture||"";
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
    // A deletion tombstone must win over stale copies on every device. Never use
    // a union-only merge for customers without carrying explicit deletion IDs.
    const deletedCustomerIds=Array.from(new Set([
      ...(Array.isArray(a.deletedCustomerIds)?a.deletedCustomerIds:[]),
      ...(Array.isArray(b.deletedCustomerIds)?b.deletedCustomerIds:[])
    ].map(String)));
    const deleted=new Set(deletedCustomerIds);
    out.deletedCustomerIds=deletedCustomerIds;
    for(const key of ["customers","tx","expenses","returns","reminders"]){
      const first=Array.isArray(a[key])?a[key]:[];
      const second=Array.isArray(b[key])?b[key]:[];
      const map=new Map();
      // Secondary first, then primary: primary wins if the same record ID exists.
      for(const item of second)map.set(String(item?.id??JSON.stringify(item)),item);
      for(const item of first)map.set(String(item?.id??JSON.stringify(item)),item);
      out[key]=Array.from(map.values());
    }
    out.customers=out.customers.filter(c=>!deleted.has(String(c?.id)));
    out.tx=out.tx.filter(t=>!deleted.has(String(t?.customerId)));
    out.reminders=out.reminders.filter(r=>!deleted.has(String(r?.customerId)));
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
    // Do not let startup/default local state upload before this exact account's
    // cloud snapshot has been restored. Queue remains dirty and restore merges it.
    if(localStorage.getItem("dukaan_khata_cloud_user_id")!==userId ||
       localStorage.getItem("dukaan_khata_local_cloud_ready")!=="1")return;
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
    if(localStorage.getItem("dukaan_khata_cloud_user_id")!==userId ||
       localStorage.getItem("dukaan_khata_local_cloud_ready")!=="1")return;
    try{
      const row=await readCloud(sb,userId);
      if(!row?.state)return;
      const last=localStorage.getItem("dukaan_khata_cloud_updated_at")||"";
      if(row.updated_at&&row.updated_at!==last){
        const local=localState()||{};
        // Polling runs only on a clean device. Treat the durable cloud snapshot as
        // authoritative so stale cached rows cannot resurrect a deleted customer.
        const merged=row.state;
        localStorage.setItem(stateKey(),JSON.stringify(merged));
        localStorage.setItem("dukaan_khata_cloud_updated_at",row.updated_at);
        localStorage.removeItem("dukaan_khata_local_dirty");
        if(!same(local,merged)){
          window.state=merged;
          try{if(typeof window.render==="function")window.render()}catch(e){console.warn("Could not redraw cloud data",e)}
        }
      }
    }catch(e){console.error("Dukaan Khata cloud polling failed:",e)}
  }
  function startCloudPolling(){clearInterval(cloudPollTimer);cloudPollTimer=setInterval(pollCloud,5000)}
  async function restoreCloudState(user){
    const uid=user?.id;
    const restoredKey=uid?"dukaan_khata_restored_"+uid:"";
    if(!uid)return;
    // Always verify the durable cloud row after a page reload. sessionStorage can
    // outlive a reload while the local state is missing/empty on some mobile browsers.
    try{
      const sb=client();
      const previousUid=localStorage.getItem("dukaan_khata_cloud_user_id");
      // Never copy one Google account's local shop records into another account.
      const local=(!previousUid||previousUid===uid)?localState():null;
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
        // Only merge local records when this device has unsynced edits. A clean but
        // stale/empty browser cache must never repopulate deleted customers or replace
        // a complete cloud account with an old snapshot.
        if(dirty){
          const merged=mergeStates(local,row.state);
          if(!same(merged,row.state))await writeCloud(sb,uid,merged);
          row=await readCloud(sb,uid);
        }
      }
      if(row?.state){
        const currentLocal=localState();
        localStorage.setItem(stateKey(),JSON.stringify(row.state));
        localStorage.setItem("dukaan_khata_cloud_updated_at",row.updated_at||"");
        localStorage.removeItem("dukaan_khata_local_dirty");
        localStorage.setItem("dukaan_khata_local_cloud_ready","1");
        localStorage.setItem("dukaan_khata_cloud_user_id",uid);
        if(restoredKey)sessionStorage.setItem(restoredKey,"1");
        if(!same(currentLocal,row.state)){
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
    // Google verifies owner identity only. All shop records remain local; never restore cloud state.
  }

  let initAttempts=0;
  async function init(){
    // Local-only data mode: allow Google identity login but never restore or sync cloud data.
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
    document.getElementById("dkChooseAccessOverlay")?.remove();
    if(window.closeModal)window.closeModal();
    const root=document.createElement("div");
    root.id="dkChooseAccessOverlay";
    root.style.cssText="position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(3,12,19,.78);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);overflow:auto";
    root.innerHTML='<style>'+
      '#dkChooseAccessOverlay *{box-sizing:border-box}'+
      '#dkChooseAccessOverlay .dk-choice-panel{width:min(440px,100%);max-height:calc(100dvh - 28px);overflow-y:auto;background:#f8f5e9;color:#18211c;padding:18px 0 15px;box-shadow:0 28px 90px #0007;border:1px solid #e7e0cf;border-radius:5px}'+
      '#dkChooseAccessOverlay .dk-choice-heading{display:flex;align-items:center;gap:14px;padding:0 18px 18px}'+
      '#dkChooseAccessOverlay .dk-choice-lock{width:60px;height:60px;flex:0 0 60px;display:grid;place-items:center;border-radius:19px;background:linear-gradient(145deg,#1c9b70,#087b59);font-size:30px;box-shadow:inset 0 1px 0 #ffffff55}'+
      '#dkChooseAccessOverlay .dk-choice-eyebrow{font:800 10px/1.3 Georgia,serif;letter-spacing:2px;color:#39443b;margin:0 0 7px}'+
      '#dkChooseAccessOverlay .dk-choice-title{font:700 clamp(25px,5vw,30px)/1.08 Georgia,serif;letter-spacing:-.5px;margin:0;color:#1c2921}'+
      '#dkChooseAccessOverlay .dk-choice-subtitle{font:14px/1.4 Georgia,serif;color:#51584e;margin:8px 0 0}'+
      '#dkChooseAccessOverlay .dk-choice-card{display:flex;align-items:center;gap:12px;width:calc(100% - 32px);min-height:92px;margin:0 16px;padding:14px 15px;text-align:left;border:1px solid #e5dece;border-radius:19px;background:linear-gradient(120deg,#fffefa,#f8f4e9);box-shadow:0 2px 0 #e9e2d4,0 5px 13px #51462a0a;color:#17211b;cursor:pointer;font-family:Georgia,serif;transition:transform .16s ease,box-shadow .16s ease}'+
      '#dkChooseAccessOverlay .dk-choice-card+.dk-choice-card{margin-top:14px}'+
      '#dkChooseAccessOverlay .dk-choice-card:active{transform:scale(.99)}'+
      '#dkChooseAccessOverlay .dk-choice-card.owner{border-left:6px solid #159875}'+
      '#dkChooseAccessOverlay .dk-choice-card.customer{border-left:6px solid #1685c3}'+
      '#dkChooseAccessOverlay .dk-choice-icon{width:40px;flex:0 0 40px;text-align:center;font-family:Arial,sans-serif;font-size:29px}'+
      '#dkChooseAccessOverlay .dk-choice-copy{min-width:0;flex:1}'+
      '#dkChooseAccessOverlay .dk-choice-copy b{display:block;font-size:21px;line-height:1.15;font-weight:700;letter-spacing:-.3px;margin-bottom:5px}'+
      '#dkChooseAccessOverlay .dk-choice-copy small{display:block;font-size:13px;line-height:1.35;color:#55574f}'+
      '#dkChooseAccessOverlay .dk-choice-arrow{font:29px/1 Arial,sans-serif;color:#148d68;flex:0 0 auto}'+
      '#dkChooseAccessOverlay .dk-choice-card.customer .dk-choice-arrow{color:#151b19}'+
      '#dkChooseAccessOverlay .dk-choice-note{margin:20px 16px 0;padding:12px 13px;background:#edf5ef;color:#6d756d;border-radius:12px;font:12px/1.4 Georgia,serif}'+
      '@media(max-width:420px){#dkChooseAccessOverlay .dk-choice-panel{width:min(360px,100%);padding-top:15px;padding-bottom:13px}#dkChooseAccessOverlay .dk-choice-heading{gap:11px;padding:0 14px 15px}#dkChooseAccessOverlay .dk-choice-lock{width:52px;height:52px;flex-basis:52px;border-radius:16px;font-size:26px}#dkChooseAccessOverlay .dk-choice-eyebrow{font-size:9px;letter-spacing:1.8px;margin-bottom:6px}#dkChooseAccessOverlay .dk-choice-title{font-size:26px}#dkChooseAccessOverlay .dk-choice-subtitle{font-size:12px;margin-top:6px}#dkChooseAccessOverlay .dk-choice-card{width:calc(100% - 26px);margin-left:13px;margin-right:13px;min-height:82px;padding:12px 10px;gap:8px;border-radius:16px}#dkChooseAccessOverlay .dk-choice-card+.dk-choice-card{margin-top:12px}#dkChooseAccessOverlay .dk-choice-icon{width:32px;flex-basis:32px;font-size:25px}#dkChooseAccessOverlay .dk-choice-copy b{font-size:19px;margin-bottom:4px}#dkChooseAccessOverlay .dk-choice-copy small{font-size:11px;line-height:1.3}#dkChooseAccessOverlay .dk-choice-arrow{font-size:25px}#dkChooseAccessOverlay .dk-choice-note{margin:15px 13px 0;padding:10px 11px;font-size:11px}}'+
      '</style>'+
      '<section class="dk-choice-panel" role="dialog" aria-modal="true" aria-labelledby="dkChoiceTitle">'+
        '<header class="dk-choice-heading"><div class="dk-choice-lock" aria-hidden="true">🔐</div><div><p class="dk-choice-eyebrow">LOGIN ACCESS</p><h2 class="dk-choice-title" id="dkChoiceTitle">Choose Access</h2><p class="dk-choice-subtitle">Choose how you want to enter Dukaan Khata.</p></div></header>'+
        '<button type="button" class="dk-choice-card owner" id="dkChooseOwner"><span class="dk-choice-icon" aria-hidden="true">🏪</span><span class="dk-choice-copy"><b>Owner Login</b><small>Full Dukaan Khata • Customers • Bills • Payments • Reports • More</small></span><span class="dk-choice-arrow" aria-hidden="true">→</span></button>'+
        '<button type="button" class="dk-choice-card customer" id="dkChooseCustomer"><span class="dk-choice-icon" aria-hidden="true">👤</span><span class="dk-choice-copy"><b>Customer Login</b><small>View your own Khata, Bills and Paid Payments by phone number</small></span><span class="dk-choice-arrow" aria-hidden="true">→</span></button>'+
        '<div class="dk-choice-note">Owner uses Google. Customer uses mobile number.</div>'+
      '</section>';
    document.body.appendChild(root);
    root.querySelector("#dkChooseOwner")?.addEventListener("click",()=>{root.remove();openOwnerLogin()});
    root.querySelector("#dkChooseCustomer")?.addEventListener("click",()=>{root.remove();openCustomerLogin()});
  }
  async function popupOwnerGooglePhoto(){let u=window.DukaanKhataUser||{};try{u={...JSON.parse(localStorage.getItem("dukaan_khata_account")||"{}"),...u}}catch(e){}const src=u.picture||u.avatar_url||u.photo_url||"";if(!src){toast("Google profile photo is not available for this account");return}modal('<div class="dk-google-photo-view" onclick="closeModal()"><img src="'+esc(src)+'" alt="Google account profile photo" referrerpolicy="no-referrer"><p>Touch anywhere to go back</p></div>')}
async function openOwnerLogin(){
    const sb=client();
    if(!sb){toast("Google sign-in is unavailable right now. Please refresh and try again.");return}
    const {data,error}=await sb.auth.getSession();
    if(error){toast("Could not check Google sign-in: "+error.message);return}
    if(data?.session?.user){
      saveAccount(data.session.user);
      if(window.showPage)window.showPage("home");
      if(window.closeModal)window.closeModal();
      toast("Signed in with Google. Your data stays on this device.");
      return;
    }
    modal('<div class="dk-login-shell"><div class="dk-login-top"><div class="dk-login-icon">🏪</div><div><span class="dk-login-badge">OWNER ACCESS</span><h2>Sign in with Google</h2></div></div><p class="dk-login-sub">Use your Google account to verify your owner identity. Shop records are saved on this device only; cross-device syncing is disabled.</p><button class="dk-login-action dk-login-primary" onclick="startGoogleLogin()">Continue with Google <span>→</span></button><button class="dk-login-close" onclick="closeModal()">Cancel</button></div>');
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
    // Match the previous compact popup style used by Owner Login.
    modal('<div class="dk-login-shell dk-customer-login">'+
      '<div class="dk-login-top"><div class="dk-login-icon">👤</div><div><span class="dk-login-badge">CUSTOMER ACCESS</span><h2>My Khata Login</h2></div></div>'+
      '<p class="dk-login-sub">Enter the mobile number saved by your shopkeeper and the common customer PIN to view your own Khata, bills and payments.</p>'+
      '<label class="dk-customer-label" for="customerLoginPhone">Registered mobile number<input id="customerLoginPhone" class="search dk-customer-phone-input" inputmode="tel" autocomplete="tel" placeholder="Enter mobile number"></label>'+
      '<label class="dk-customer-label" for="customerLoginPin">Customer PIN<input id="customerLoginPin" class="search dk-customer-phone-input" inputmode="numeric" type="password" maxlength="4" autocomplete="off" placeholder="Enter PIN"></label>'+
      '<button id="dkCustomerViewBtn" class="dk-login-action dk-login-primary dk-customer-view-btn" type="button">View My Khata <span>→</span></button>'+
      '<div class="dk-customer-home-features"><span>📒 Khata</span><span>🧾 Bills</span><span>💳 Payments</span><span>🔴 Due</span></div>'+
      '<button class="dk-login-close" type="button" onclick="openDukaanLogin()">← Back</button></div>');
    const viewBtn=document.getElementById("dkCustomerViewBtn");
    const phoneInput=document.getElementById("customerLoginPhone");
    const pinInput=document.getElementById("customerLoginPin");
    viewBtn?.addEventListener("click",function(e){
      e.preventDefault();
      const q=normPhone(phoneInput?.value);
      if(String(pinInput?.value||"").trim()!=="2007"){
        if(window.toast)toast("Incorrect customer PIN");else alert("Incorrect customer PIN");
        pinInput?.focus();return;
      }
      if(!q){
        if(window.toast)toast("Please enter the customer mobile number");else alert("Please enter the customer mobile number");
        phoneInput?.focus();return;
      }
      const customers=Array.isArray(window.state?.customers)?window.state.customers:[];
      const matches=customers.filter(c=>normPhone(c.phone)===q);
      if(!matches.length){
        if(window.toast)toast("No customer found for this number");else alert("No customer found for this number");
        return;
      }
      if(matches.length===1){openCustomerPortal(matches[0].id);return}
      modal('<div class="dk-customer-login"><div class="dk-customer-head"><div class="dk-customer-icon">👤</div><div><span class="dk-login-badge">CUSTOMER FOUND</span><h2>Select account</h2></div></div>'+
        matches.map(c=>'<button class="dk-access-card customer" type="button" data-customer-id="'+esc(c.id)+'" onclick="openCustomerPortal(this.dataset.customerId)"><span>👤</span><div><b>'+esc(c.name)+'</b><small>'+esc(c.phone||"")+'</small></div><strong>→</strong></button>').join("")+
        '<button class="dk-login-close" onclick="openCustomerLogin()">← Back</button></div>');
    });
    phoneInput?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();viewBtn?.click()}});
    pinInput?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();viewBtn?.click()}});
    setTimeout(()=>phoneInput?.focus(),120);
  }
  function closeCustomerFullScreen(){
    if(window.closeModal)closeModal();
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
    if(!sb){toast("Google sign-in is unavailable. Please refresh and try again.");return}
    const redirectTo=window.location.origin+window.location.pathname;
    const {error}=await sb.auth.signInWithOAuth({provider:"google",options:{redirectTo,queryParams:{prompt:"select_account"}}});
    if(error)toast("Google sign-in failed: "+error.message);
  }

  async function logoutDukaanKhata(){
    if(window.closeModal)window.closeModal();
    if(window.toast)window.toast("This app is using local-only access.");
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

  let launchLoginShown=false;
  function showLoginAfterLaunch(){
    if(launchLoginShown)return;
    launchLoginShown=true;
    // If Google has already authenticated the owner, keep the normal app open.
    const sb=client();
    if(sb){
      sb.auth.getSession().then(({data})=>{
        if(data?.session?.user){handleSession(data.session);return}
        if(window.openDukaanLogin)window.openDukaanLogin();
      }).catch(()=>{if(window.openDukaanLogin)window.openDukaanLogin()});
    }else if(window.openDukaanLogin)window.openDukaanLogin();
  }
  function boot(){
    init();
    window.addEventListener("uvms-launch-complete",showLoginAfterLaunch,{once:true});
    // Covers browsers where the splash finished before this script attached.
    if(!document.getElementById("uvmsLaunchSplash"))setTimeout(showLoginAfterLaunch,80);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();