// Dukaan Khata — secure Google login + cross-device cloud sync via Supabase
(function(){
  const SUPABASE_URL="https://nzsldzyjpxwyyrdwkphp.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY="sb_publishable_k3ZPG1Wuqm3KFzoQAXnByA_YTMLkUG-";
  window.DukaanKhataMode="cloud";
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
    return u?{id:u.id,name:u.user_metadata?.full_name||u.user_metadata?.name||u.email?.split("@")[0]||"Google account",email:u.email||"",picture:u.user_metadata?.avatar_url||""}:null;
  }
  function saveAccount(user){
    window.DukaanKhataUser=accountFromUser(user);
    localStorage.setItem("dukaan_khata_account",JSON.stringify(window.DukaanKhataUser||null));
  }
  async function syncToCloud(){
    const sb=client(); if(!sb||syncing||!window.DukaanKhataUser)return;
    syncing=true;
    try{
      const data=typeof window.state==="object"?JSON.parse(JSON.stringify(window.state)):null;
      if(data){const stamp=Date.now();await sb.auth.updateUser({data:{dukaan_khata:data,dukaan_khata_sync_at:stamp}});localStorage.setItem("dukaan_khata_local_sync_at",String(stamp))}
    }catch(e){console.warn("Dukaan Khata cloud sync:",e)}
    finally{syncing=false}
  }
  window.dkSyncNow=syncToCloud;
  window.dkQueueSync=function(){
    clearTimeout(syncTimer);
    syncTimer=setTimeout(syncToCloud,800);
  };
  async function pollCloud(){
    const sb=client(); if(!sb||!window.DukaanKhataUser||syncing)return;
    try{
      const {data:{user}}=await sb.auth.getUser();
      const remote=user?.user_metadata?.dukaan_khata;
      const remoteAt=Number(user?.user_metadata?.dukaan_khata_sync_at||0);
      const localAt=Number(localStorage.getItem("dukaan_khata_local_sync_at")||0);
      if(remote&&remoteAt>localAt){
        localStorage.setItem("dukaan_khata_infinity_v2",JSON.stringify(remote));
        localStorage.setItem("dukaan_khata_local_sync_at",String(remoteAt));
        location.reload();
      }
    }catch(e){console.warn("Dukaan Khata cloud refresh:",e)}
  }
  function startCloudPolling(){clearInterval(cloudPollTimer);cloudPollTimer=setInterval(pollCloud,4000)}

  async function restoreCloudState(user){
    const cloud=user?.user_metadata?.dukaan_khata;
    const uid=user?.id;
    const restoredKey=uid?"dukaan_khata_restored_"+uid:"";
    // Restore only once per browser session. This prevents an auth
    // INITIAL_SESSION/reload loop that makes the app flicker.
    if(restoredKey&&sessionStorage.getItem(restoredKey)==="1")return;
    if(cloud&&typeof cloud==="object"){
      try{
        localStorage.setItem("dukaan_khata_infinity_v2",JSON.stringify(cloud));
        localStorage.setItem("dukaan_khata_cloud_synced","1");
        if(restoredKey)sessionStorage.setItem(restoredKey,"1");
        location.reload();
        return;
      }catch(e){}
    }
    if(restoredKey)sessionStorage.setItem(restoredKey,"1");
    await syncToCloud();
    localStorage.setItem("dukaan_khata_cloud_synced","1");
  }

  async function handleSession(session){
    const user=session?.user;
    saveAccount(user);
    if(!user)return;
    await restoreCloudState(user);\n    startCloudPolling();
  }

  async function init(){
    const sb=client();
    if(!sb){console.warn("Supabase client failed to load");return}
    const {data:{session}}=await sb.auth.getSession();
    if(session)await handleSession(session);
    // getSession() handles the initial session; do not handle INITIAL_SESSION
    // again because that caused duplicate restore/reload cycles.
    sb.auth.onAuthStateChange((event,session)=>{
      if(event==="SIGNED_IN")setTimeout(()=>handleSession(session),0);
      if(event==="SIGNED_OUT")saveAccount(null);
    });
  }

  async function openDukaanLogin(){
    const sb=client();
    if(!sb||!window.modal)return;
    const {data:{session}}=await sb.auth.getSession();
    if(session?.user){
      const u=accountFromUser(session.user);
      window.DukaanKhataUser=u;
      modal('<div class="dk-login-shell dk-login-signed">'+
        '<div class="dk-login-top"><div class="dk-login-icon">👤</div><span class="dk-login-badge">ACCOUNT</span></div>'+
        '<h2>My Account</h2><p class="dk-login-sub">Your secure Dukaan Khata account</p>'+
        '<div class="dk-account-card"><div class="dk-avatar">'+(u.picture?'<img src="'+esc(u.picture)+'" alt="">':'👤')+'</div><div><b>'+esc(u.name)+'</b><small>'+esc(u.email)+'</small></div><span class="dk-cloud">☁</span></div>'+
        '<div class="dk-account-shop">🏪 <b>'+esc(state.shop?.name||"My Dukaan")+'</b><span>Cloud sync active</span></div>'+
        '<button class="dk-login-action dk-login-primary" onclick="showPage(\'home\');closeModal()">⌂ Dashboard <span>→</span></button>'+
        '<button class="dk-login-action" onclick="startGoogleLogin()">⇄ Login with another account <span>→</span></button>'+
        '<button class="dk-login-action dk-logout" onclick="logoutDukaanKhata()">↪ Logout</button>'+
        '<button class="dk-login-close" onclick="closeModal()">× Close</button></div>');
      return;
    }
    modal('<div class="dk-login-shell">'+
      '<div class="dk-login-top"><div class="dk-login-icon">🏪</div><div><span class="dk-login-badge">SECURE ACCESS</span><h2>Dukaan Khata</h2></div></div>'+
      '<p class="dk-login-sub">Sign in once and keep your shop, customers and khata synced across devices.</p>'+
      '<button class="dk-login-action dk-google" id="googleLoginBtn"><span class="dk-google-logo">G</span><span><b>Continue with Google</b><small>Fast • Secure • No password</small></span><strong>→</strong></button>'+
      '<div class="dk-or"><span>OR</span></div>'+
      '<div class="dk-feature-row"><span>☁️</span><div><b>Cloud Sync</b><small>Your data follows you on laptop & mobile</small></div></div>'+
      '<div class="dk-feature-row"><span>🔒</span><div><b>Private & Secure</b><small>Protected by Google sign-in</small></div></div>'+
      '<p id="googleLoginMsg" class="dk-login-note">Continue with your existing Google account.</p>'+
      '<button class="dk-login-close" onclick="closeModal()">× Close</button></div>');
    document.getElementById("googleLoginBtn")?.addEventListener("click",startGoogleLogin);
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
  window.openDukaanProfile=openDukaanLogin;
  window.logoutDukaanKhata=logoutDukaanKhata;
  window.startGoogleLogin=startGoogleLogin;

  function boot(){init()}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();