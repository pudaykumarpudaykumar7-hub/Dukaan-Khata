// Dukaan Khata — secure Google login + cross-device cloud sync via Supabase
(function(){
  const SUPABASE_URL="https://nzsldzyjpxwyyrdwkphp.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY="sb_publishable_k3ZPG1Wuqm3KFzoQAXnByA_YTMLkUG-";
  window.DukaanKhataMode="cloud";
  window.dkSupabase=null;
  window.DukaanKhataUser=null;
  let syncTimer=null, syncing=false;

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
      if(data)await sb.auth.updateUser({data:{dukaan_khata:data}});
    }catch(e){console.warn("Dukaan Khata cloud sync:",e)}
    finally{syncing=false}
  }
  window.dkSyncNow=syncToCloud;
  window.dkQueueSync=function(){
    clearTimeout(syncTimer);
    syncTimer=setTimeout(syncToCloud,800);
  };

  async function restoreCloudState(user){
    const cloud=user?.user_metadata?.dukaan_khata;
    if(cloud&&typeof cloud==="object"){
      try{
        localStorage.setItem("dukaan_khata_infinity_v2",JSON.stringify(cloud));
        localStorage.setItem("dukaan_khata_cloud_synced","1");
        location.reload();
        return;
      }catch(e){}
    }
    // First Google login on a device: upload existing local data so it follows the account.
    await syncToCloud();
    localStorage.setItem("dukaan_khata_cloud_synced","1");
  }

  async function handleSession(session){
    const user=session?.user;
    saveAccount(user);
    if(!user)return;
    await restoreCloudState(user);
  }

  async function init(){
    const sb=client();
    if(!sb){console.warn("Supabase client failed to load");return}
    const {data:{session}}=await sb.auth.getSession();
    if(session)await handleSession(session);
    sb.auth.onAuthStateChange((event,session)=>{
      if(event==="SIGNED_IN"||event==="INITIAL_SESSION")setTimeout(()=>handleSession(session),0);
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
      modal('<h2>🔐 Login Access</h2><div class="card"><div style="font-size:34px;text-align:center">👤</div><h3 style="text-align:center;margin:8px 0">'+esc(u.name)+'</h3><p class="muted" style="text-align:center">'+esc(u.email)+'</p><p class="muted" style="text-align:center">☁️ Cloud sync is active on all your signed-in devices.</p></div><button class="btn primary" onclick="logoutDukaanKhata()">Logout</button><button class="btn" onclick="closeModal()">Close</button>');
      return;
    }
    modal('<h2>🔐 Login Access</h2><p class="muted">Sign in once with Google. Your shop, customers, khata and settings can then follow you across mobile and laptop.</p><button class="btn primary" id="googleLoginBtn">🔵 Continue with Google</button><p id="googleLoginMsg" class="muted" style="font-size:12px;margin-top:10px">Secure Google sign-in • No password or OTP required.</p>');
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