const SUPABASE_URL="https://nzsldzyjpxwyyrdwkphp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_k3ZPG1Wuqm3KFzoQAXnByA_YTMLkUG-";

let supabaseClient=null;
let currentUser=null,currentShopId=null,authStarting=false;
let authBusy=false;
let lastAuthAttempt=0;

function el(id){return document.getElementById(id)}
function authMsg(message,error=false){
  const x=el("authMessage");
  if(x){x.textContent=message;x.className="authMessage "+(error?"error":"success")}
}
function authStatus(message){
  const x=el("authStatus");if(x)x.textContent=message||"";
}
function friendlyAuthError(e){
  const m=(e?.message||String(e)||"Unknown error").toLowerCase();
  if(m.includes("email not confirmed"))return "Please confirm your email first, then login.";
  if(m.includes("invalid login credentials"))return "Email or password is incorrect.";
  if(m.includes("rate limit")||m.includes("too many requests"))return "Supabase temporarily limited requests. Stop retrying and wait before trying again.";
  if(m.includes("user already registered"))return "This email is already registered. Use the Login screen.";
  if(m.includes("password should be at least"))return "Password must be at least 6 characters.";
  if(m.includes("failed to fetch")||m.includes("network"))return "Internet or Supabase connection problem. Check your internet and try again.";
  return e?.message||String(e)||"Something went wrong.";
}
function canAttemptAuth(){
  const now=Date.now();
  if(authBusy)return false;
  if(now-lastAuthAttempt<3000){authMsg("Please wait a few seconds before trying again.",true);return false}
  lastAuthAttempt=now;return true;
}
function setBusy(busy){
  authBusy=busy;
  ["createOwnerBtn","loginOwnerBtn"].forEach(id=>{const b=el(id);if(b)b.disabled=busy});
}
function showLogin(){
  el("signupBox").classList.add("hidden");
  el("loginBox").classList.remove("hidden");
  el("authSubtitle").textContent="Owner • Email + Password";
  authMsg("");authStatus("");
}
function showSignup(){
  el("loginBox").classList.add("hidden");
  el("signupBox").classList.remove("hidden");
  el("authSubtitle").textContent="Create your cloud owner account";
  authMsg("");authStatus("");
}
function lockApp(){el("authGate").classList.remove("hidden");el("appShell").classList.add("appLocked")}
function unlockApp(){el("authGate").classList.add("hidden");el("appShell").classList.remove("appLocked")}

async function getMyShop(){
  if(!supabaseClient||!currentUser)throw new Error("Authentication is not ready.");
  const {data,error}=await supabaseClient.from("shop_members").select("shop_id,role,display_name,phone").eq("user_id",currentUser.id).eq("active",true).limit(1).maybeSingle();
  if(error)throw error;
  if(!data)return null;
  currentShopId=data.shop_id;return data;
}
async function createShopForUser(){
  const meta=currentUser?.user_metadata||{};
  const shop=(meta.shop_name||"My Shop").trim();
  const name=(meta.owner_name||currentUser?.email?.split("@")[0]||"Owner").trim();
  const phone=(meta.phone||"").trim()||null;
  const {data,error}=await supabaseClient.rpc("create_owner_shop",{p_shop_name:shop,p_owner_name:name,p_phone:phone});
  if(error)throw error;
  currentShopId=data;return data;
}
async function startApp(){
  if(!currentUser||authStarting)return;
  authStarting=true;
  try{
    let member=await getMyShop();
    if(!member){await createShopForUser();member=await getMyShop()}
    if(!member)throw new Error("No shop is linked to this owner account.");
    el("ownerHeader").textContent="Owner • "+(member.display_name||"Shop Owner");
    unlockApp();
    if(typeof initCloudApp==="function")await initCloudApp(currentShopId,currentUser.id);
  }finally{authStarting=false}
}
async function createOwnerAccount(){
  if(!canAttemptAuth())return;
  const shop=el("shopName").value.trim(),name=el("ownerName").value.trim(),phone=el("ownerPhone").value.trim(),email=el("ownerEmail").value.trim().toLowerCase(),password=el("ownerPassword").value;
  if(!shop||!name||!email||!password){authMsg("Please fill shop name, owner name, email and password.",true);return}
  if(password.length<6){authMsg("Password must be at least 6 characters.",true);return}
  if(!supabaseClient){authMsg("App connection is not ready. Refresh once.",true);return}
  setBusy(true);authMsg("Creating owner account...");authStatus("Please wait. Do not press the button again.");
  try{
    const {data,error}=await supabaseClient.auth.signUp({email,password,options:{data:{owner_name:name,phone,shop_name:shop}}});
    if(error){authMsg(friendlyAuthError(error),true);return}
    currentUser=data.user;
    if(!data.session){
      el("loginEmail").value=email;
      showLogin();
      authMsg("Account created. Confirm the email from Supabase, then login here.");
      return;
    }
    await startApp();
  }catch(e){console.error(e);authMsg("Account setup failed: "+friendlyAuthError(e),true)}
  finally{setBusy(false);authStatus("")}
}
async function loginOwnerAccount(){
  if(!canAttemptAuth())return;
  const email=el("loginEmail").value.trim().toLowerCase(),password=el("loginPassword").value;
  if(!email||!password){authMsg("Enter your email and password.",true);return}
  if(!supabaseClient){authMsg("App connection is not ready. Refresh once.",true);return}
  setBusy(true);authMsg("Logging in...");authStatus("Please wait. Do not press Login again.");
  try{
    const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});
    if(error){authMsg(friendlyAuthError(error),true);return}
    currentUser=data.user;
    await startApp();
  }catch(e){console.error(e);authMsg("Login succeeded, but shop setup failed: "+friendlyAuthError(e),true)}
  finally{setBusy(false);authStatus("")}
}
async function ownerMenu(){
  if(!currentUser||!supabaseClient)return;
  const {data}=await supabaseClient.from("shop_members").select("display_name,phone,role").eq("user_id",currentUser.id).eq("shop_id",currentShopId).maybeSingle();
  modal("<h2>Owner Account</h2><p><b>"+esc(data?.display_name||"Owner")+"</b></p><p>"+esc(data?.phone||"")+"</p><p>Role: "+esc(data?.role||"owner")+"</p><button class='btn' onclick='logoutOwner()'>🔒 Logout</button>");
}
async function logoutOwner(){
  if(supabaseClient)await supabaseClient.auth.signOut();
  currentUser=null;currentShopId=null;
  if(typeof db!=="undefined")db={customers:[],items:[],tx:[]};
  lockApp();showLogin();authMsg("You have been logged out.");
}
function initAuth(){
  lockApp();
  try{
    if(!window.supabase)throw new Error("Supabase library did not load.");
    supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
    window.supabaseClient=supabaseClient;
    authStatus("Cloud login ready.");
    supabaseClient.auth.onAuthStateChange(async (_event,session)=>{
      currentUser=session?.user||null;
    });
    supabaseClient.auth.getSession().then(async({data})=>{
      if(data?.session){
        currentUser=data.session.user;
        try{await startApp()}catch(e){console.error(e);authMsg(friendlyAuthError(e),true);showLogin()}
      }else showLogin();
    }).catch(e=>{console.error(e);authMsg("Could not connect to Supabase: "+friendlyAuthError(e),true);showLogin()});
  }catch(e){
    console.error(e);authMsg("App setup error: "+e.message,true);authStatus("Refresh the page after checking your internet connection.");
  }
}
window.createOwnerAccount=createOwnerAccount;
window.loginOwnerAccount=loginOwnerAccount;
window.showLogin=showLogin;
window.showSignup=showSignup;
window.ownerMenu=ownerMenu;
window.logoutOwner=logoutOwner;
window.addEventListener("DOMContentLoaded",initAuth);