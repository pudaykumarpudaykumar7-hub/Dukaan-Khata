const SUPABASE_URL="https://nzsldzyjpxwyyrdwkphp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_k3ZPG1Wuqm3KFzoQAXnByA_YTMLkUG-";
const supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
let currentUser=null,currentShopId=null;
let authStarting=false;

function el(id){return document.getElementById(id)}
function authMsg(message,error=false){const x=el("authMessage");if(x){x.textContent=message;x.className="authMessage "+(error?"error":"success")}}
function friendlyAuthError(e){
  const m=(e?.message||String(e)||"Unknown error").toLowerCase();
  if(m.includes("email not confirmed")) return "Email not confirmed. Open the confirmation email from Supabase, confirm your email, then login again.";
  if(m.includes("invalid login credentials")) return "Email or password is incorrect.";
  if(m.includes("rate limit")) return "Too many attempts. Please wait a few minutes and try again.";
  if(m.includes("failed to fetch")||m.includes("network")) return "Internet connection or Supabase connection problem. Check your internet and try again.";
  return e?.message||String(e)||"Something went wrong."}
function showLogin(){el("signupBox").classList.add("hidden");el("loginBox").classList.remove("hidden");el("authSubtitle").textContent="Owner Login";authMsg("")}
function showSignup(){el("loginBox").classList.add("hidden");el("signupBox").classList.remove("hidden");el("authSubtitle").textContent="Cloud Owner Account";authMsg("")}
function lockApp(){el("authGate").classList.remove("hidden");el("appShell").classList.add("appLocked")}
function unlockApp(){el("authGate").classList.add("hidden");el("appShell").classList.remove("appLocked")}

async function getMyShop(){
  const {data,error}=await supabaseClient.from("shop_members").select("shop_id,role,display_name,phone").eq("user_id",currentUser.id).eq("active",true).limit(1).maybeSingle();
  if(error)throw error;
  if(!data)return null;
  currentShopId=data.shop_id;
  return data;
}

async function createShopForUser(){
  const meta=currentUser?.user_metadata||{};
  const shop=(meta.shop_name||"My Shop").trim();
  const name=(meta.owner_name||currentUser.email?.split("@")[0]||"Owner").trim();
  const phone=(meta.phone||"").trim()||null;
  const {data,error}=await supabaseClient.rpc("create_owner_shop",{p_shop_name:shop,p_owner_name:name,p_phone:phone});
  if(error)throw error;
  currentShopId=data;
  return data;
}

async function createOwner(){
  const shop=el("shopName").value.trim(),name=el("ownerName").value.trim(),phone=el("ownerPhone").value.trim(),email=el("ownerEmail").value.trim(),password=el("ownerPassword").value;
  if(!shop||!name||!email||!password)return authMsg("Please fill all required fields.",true);
  if(password.length<6)return authMsg("Password must be at least 6 characters.",true);
  authMsg("Creating your owner account...");
  const {data,error}=await supabaseClient.auth.signUp({
    email,password,
    options:{data:{owner_name:name,phone,shop_name:shop}}
  });
  if(error){authMsg(error.message,true);return}
  if(data.user){
    currentUser=data.user;
    if(data.session){
      try{await createShopForUser();await startApp();return}
      catch(e){authMsg("Account created, but shop setup failed: "+(e.message||e),true);return}
    }
    el("loginEmail").value=email;
    showLogin();
    authMsg("Account created. Confirm your email, then login here. Your shop information is saved.");
  }
}

async function loginOwner(){
  const email=el("loginEmail").value.trim(),password=el("loginPassword").value;
  if(!email||!password){authMsg("Enter your email and password.",true);return}
  authMsg("Signing in...");
  const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});
  if(error){authMsg(friendlyAuthError(error),true);return}
  currentUser=data.user;
  try{
    let member=await getMyShop();
    if(!member){
      authMsg("Finishing shop setup...");
      await createShopForUser();
      member=await getMyShop();
    }
    if(!member)throw new Error("Shop could not be linked to this account.");
    await startApp();
  }catch(e){
    console.error(e);
    authMsg("Login succeeded, but shop setup failed: "+friendlyAuthError(e),true);
  }
}

async function startApp(){
  if(!currentUser||authStarting)return;
  authStarting=true;
  try{
    let member=await getMyShop();
    if(!member)throw new Error("No shop is linked to this account. Please log out and log in again.");
    el("ownerHeader").textContent="Owner • "+(member.display_name||"Shop Owner");
    unlockApp();
    await initCloudApp(currentShopId,currentUser.id);
  }finally{authStarting=false}
}

async function ownerMenu(){
  if(!currentUser)return;
  const {data}=await supabaseClient.from("shop_members").select("display_name,phone,role").eq("user_id",currentUser.id).eq("shop_id",currentShopId).maybeSingle();
  modal("<h2>Owner Account</h2><p><b>"+esc(data?.display_name||"Owner")+"</b></p><p>"+esc(data?.phone||"")+"</p><p>Role: "+esc(data?.role||"owner")+"</p><button class=\"btn\" onclick=\"logoutOwner()\">🔒 Logout</button>");
}

async function logoutOwner(){
  closeModal();
  await supabaseClient.auth.signOut();
  currentUser=null;currentShopId=null;
  db={customers:[],items:[],tx:[]};
  lockApp();showLogin();authMsg("You have been logged out.");
}

supabaseClient.auth.onAuthStateChange(async (_event,session)=>{
  if(!session){currentUser=null;currentShopId=null;lockApp();return}
  currentUser=session.user;
});

(async function(){
  lockApp();
  const {data}=await supabaseClient.auth.getSession();
  if(data?.session){
    currentUser=data.session.user;
    try{
      let member=await getMyShop();
      if(!member){
        await createShopForUser();
        member=await getMyShop();
      }
      await startApp();
    }catch(e){
      console.error(e);
      authMsg(e.message||"Account setup failed.",true);
      showLogin();
    }
  }else showLogin();
})();
function normalizePhone(v){
  let p=(v||"").trim().replace(/[\s-]/g,"");
  if(/^\d{10}$/.test(p)) p="+91"+p;
  return p;
}
function showLogin(){
  el("signupBox").classList.add("hidden");
  el("loginBox").classList.remove("hidden");
  el("authSubtitle").textContent="Owner • Mobile OTP";
  authMsg("");
}
function showSignup(){
  el("loginBox").classList.add("hidden");
  el("signupBox").classList.remove("hidden");
  el("authSubtitle").textContent="Owner • Mobile OTP";
  authMsg("");
}
async function sendOwnerOTP(){
  const shop=el("shopName").value.trim(), name=el("ownerName").value.trim(), phone=normalizePhone(el("ownerPhone").value);
  if(!shop||!name||!phone){authMsg("Enter shop name, owner name and mobile number.",true);return}
  if(!/^\+91\d{10}$/.test(phone)){authMsg("Enter a valid Indian mobile number, e.g. +919876543210.",true);return}
  authMsg("Sending OTP...");
  const {error}=await supabaseClient.auth.signInWithOtp({
    phone,
    options:{data:{owner_name:name,phone,shop_name:shop}}
  });
  if(error){authMsg(friendlyAuthError(error),true);return}
  el("loginPhone").value=phone;
  el("otpBox").classList.remove("hidden");
  showLogin();
  el("loginPhone").value=phone;
  el("otpBox").classList.remove("hidden");
  authMsg("OTP sent. Enter the 6-digit code.");
}
async function sendLoginOTP(){
  const phone=normalizePhone(el("loginPhone").value);
  if(!/^\+91\d{10}$/.test(phone)){authMsg("Enter a valid Indian mobile number, e.g. +919876543210.",true);return}
  authMsg("Sending OTP...");
  const {error}=await supabaseClient.auth.signInWithOtp({phone});
  if(error){authMsg(friendlyAuthError(error),true);return}
  el("otpBox").classList.remove("hidden");
  authMsg("OTP sent. Enter the 6-digit code.");
}
async function verifyOwnerOTP(){
  const phone=normalizePhone(el("loginPhone").value);
  const token=el("otpCode").value.trim();
  if(!/^\+91\d{10}$/.test(phone)||!/^\d{6}$/.test(token)){authMsg("Enter the 6-digit OTP.",true);return}
  authMsg("Verifying OTP...");
  const {data,error}=await supabaseClient.auth.verifyOtp({phone,token,type:"sms"});
  if(error){authMsg(friendlyAuthError(error),true);return}
  currentUser=data.user;
  try{
    let member=await getMyShop();
    if(!member){
      authMsg("Creating your shop...");
      await createShopForUser();
      member=await getMyShop();
    }
    if(!member)throw new Error("Shop could not be linked to this mobile number.");
    await startApp();
  }catch(e){
    console.error(e);
    authMsg("OTP verified, but shop setup failed: "+friendlyAuthError(e),true);
  }
}
window.sendOwnerOTP=sendOwnerOTP;
window.sendLoginOTP=sendLoginOTP;
window.verifyOwnerOTP=verifyOwnerOTP;
window.showLogin=showLogin;
window.showSignup=showSignup;
window.ownerMenu=ownerMenu;
window.logoutOwner=logoutOwner;
