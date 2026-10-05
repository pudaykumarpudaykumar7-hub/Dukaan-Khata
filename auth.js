// Dukaan Khata Public Role-Based Cloud Login
const SUPABASE_URL="https://nzsldzyjpxwyyrdwkphp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_k3ZPG1Wuqm3KFzoQAXnByA_YTMLkUG-";
const supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
window.dukaanSupabase=supabaseClient;

function authStyles(){
  if(document.getElementById("ownerAuthStyles"))return;
  const s=document.createElement("style");s.id="ownerAuthStyles";
  s.textContent=`
    #ownerAuth{position:fixed;inset:0;z-index:100;background:linear-gradient(135deg,#071019,#123b2d);display:flex;align-items:center;justify-content:center;padding:18px;overflow:auto}
    #ownerAuth.hidden{display:none!important}.auth-card{width:min(440px,100%);background:#fff;border-radius:24px;padding:25px;box-shadow:0 25px 70px #0007}
    .auth-logo{width:58px;height:58px;border-radius:18px;background:linear-gradient(135deg,#36c47b,#176b4d);color:#fff;display:grid;place-items:center;font-size:28px;font-weight:900;margin-bottom:14px}
    .auth-card h2{margin:0 0 5px}.auth-card p{color:#667085;font-size:13px;margin:0 0 18px}.auth-card input{width:100%;padding:13px;border:1px solid #dfe4ea;border-radius:12px;margin:0 0 9px}.auth-card button{width:100%;padding:13px;border:0;border-radius:12px;font-weight:800;margin-top:5px}.auth-primary{background:#176b4d;color:#fff}.auth-secondary{background:#eef2f6;color:#101828}.auth-msg{min-height:20px;margin:10px 0;font-size:12px;font-weight:700}.auth-switch{text-align:center;margin-top:12px;font-size:12px;color:#667085}.auth-switch button{display:inline;width:auto;background:none;color:#176b4d;padding:0;margin:0}
  `;document.head.appendChild(s);
}
function authUI(){
  authStyles();
  const d=document.createElement("div");d.id="ownerAuth";
  d.innerHTML=`<div class="auth-card">
    <div class="auth-logo">₹</div>
    <div class="role-tabs"><button id="roleOwner" class="role-tab active">Owner</button><button id="roleStaff" class="role-tab">Supervisor</button><button id="roleCustomer" class="role-tab">Customer</button></div><h2 id="authTitle">Owner Login</h2>
    <p id="authSub">Login to manage your Dukaan Khata shop.</p>
    <div id="signupFields" style="display:none">
      <input id="authShop" placeholder="Shop name" autocomplete="organization">
      <input id="authOwner" placeholder="Owner name" autocomplete="name">
      <input id="authPhone" placeholder="Phone number" inputmode="tel" autocomplete="tel">
    </div>
    <input id="authEmail" type="email" placeholder="Email address" autocomplete="email">
    <input id="authPassword" type="password" placeholder="Password (minimum 6 characters)" autocomplete="current-password">
    <div id="authMsg" class="auth-msg"></div>
    <button id="authMain" class="auth-primary">Login</button><div class="auth-divider">OR</div><button id="googleAuth" class="auth-google">🔵 Continue with Google</button><button id="phoneAuth" class="auth-otp">📱 Continue with Phone OTP</button>
    <div class="auth-switch"><span id="authSwitchText">New owner?</span> <button id="authSwitch">Create owner account</button></div>
  </div>`;
  document.body.appendChild(d);
}
let authSignup=false;let authRole="owner";
function authMsg(t,ok=false){const e=document.getElementById("authMsg");if(e){e.textContent=t;e.style.color=ok?"#176b4d":"#b42318"}}
function setAuthRole(role){
  authRole=role;authSignup=role==="owner"&&authSignup;
  document.querySelectorAll(".role-tab").forEach(b=>b.classList.remove("active"));
  document.getElementById(role==="owner"?"roleOwner":role==="staff"?"roleStaff":"roleCustomer").classList.add("active");
  document.getElementById("signupFields").style.display=role==="owner"&&authSignup?"block":"none";
  document.getElementById("authMain").style.display=role==="owner"?"block":"none";
  document.getElementById("authSwitch").parentElement.style.display=role==="owner"?"block":"none";
  document.getElementById("authTitle").textContent=role==="owner"?(authSignup?"Create Owner Account":"Owner Login"):role==="staff"?"Supervisor Login":"Customer Login";
  document.getElementById("authSub").textContent=role==="owner"?"Login or create your shop owner account.":role==="staff"?"Sign in to a shop account created by the owner.":"Sign in to view your own khata, bills and payments.";
  authMsg("");
}
function refreshAuthMode(){
  document.getElementById("authTitle").textContent=authSignup?"Create Owner Account":"Owner Login";
  document.getElementById("authSub").textContent=authSignup?"Create your shop owner account.":"Login to manage your Dukaan Khata shop.";
  document.getElementById("signupFields").style.display=authSignup?"block":"none";
  document.getElementById("authMain").textContent=authSignup?"Create Account":"Login";
  document.getElementById("authSwitchText").textContent=authSignup?"Already have an account?":"New owner?";
  document.getElementById("authSwitch").textContent=authSignup?"Login":"Create owner account";
  authMsg("");
}
async function loginWithGoogle(){
  authMsg("Opening Google login...",true);
  const {error}=await supabaseClient.auth.signInWithOAuth({provider:"google",options:{redirectTo:window.location.origin+window.location.pathname,data:{login_role:authRole}}});
  if(error)authMsg(error.message||"Google login is not available yet.");
}
async function loginWithPhone(){
  const phone=prompt("Enter your mobile number");
  if(!phone)return;
  authMsg("Sending OTP...",true);
  const {error}=await supabaseClient.auth.signInWithOtp({phone:phone.trim(),options:{data:{login_role:authRole}}});
  if(error)return authMsg(error.message||"Could not send OTP.");
  const otp=prompt("Enter the OTP you received");
  if(!otp)return;
  authMsg("Verifying OTP...",true);
  const {data,error:verifyError}=await supabaseClient.auth.verifyOtp({phone:phone.trim(),token:otp.trim(),type:"sms"});
  if(verifyError)return authMsg(verifyError.message||"Invalid OTP.");
  try{await routeUser(data.user)}catch(e){authMsg(e.message||"Login succeeded, but your account could not be loaded.")}
}

async function createOwnerAccount(){
  const shop=document.getElementById("authShop").value.trim(),owner=document.getElementById("authOwner").value.trim(),phone=document.getElementById("authPhone").value.trim(),email=document.getElementById("authEmail").value.trim(),password=document.getElementById("authPassword").value;
  if(!shop||!owner||!email||password.length<6)return authMsg("Enter shop name, owner name, email and a 6+ character password.");
  authMsg("Creating account...",true);document.getElementById("authMain").disabled=true;
  try{
    const {data,error}=await supabaseClient.auth.signUp({
      email,password,
      options:{data:{shop_name:shop,owner_name:owner,phone:phone||null}}
    });
    if(error)throw error;
    if(data.session){
      await ensureOwnerShop(data.user);
      await startOwner(data.user);
    }else{
      authMsg("Account created. Confirm your email, then return here and login.",true);
    }
  }catch(e){authMsg(e.message||"Could not create account.");}
  document.getElementById("authMain").disabled=false;
}
async function loginOwner(){
  const email=document.getElementById("authEmail").value.trim(),password=document.getElementById("authPassword").value;
  if(!email||!password)return authMsg("Enter your email and password.");
  authMsg("Logging in...",true);document.getElementById("authMain").disabled=true;
  try{
    const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});
    if(error)throw error;
    await ensureOwnerShop(data.user);
    await startOwner(data.user);
  }catch(e){
    authMsg(e.message||"Login failed.");
  }
  document.getElementById("authMain").disabled=false;
}
async function ensureOwnerShop(user){
  const {data,error}=await supabaseClient.from("shop_members")
    .select("shop_id,role,display_name,shops(*)")
    .eq("user_id",user.id).eq("active",true).limit(1).maybeSingle();
  if(error)throw error;
  if(data)return data;
  const meta=user.user_metadata||{};
  const shop=String(meta.shop_name||"").trim();
  const owner=String(meta.owner_name||"").trim();
  const phone=meta.phone?String(meta.phone).trim():null;
  if(!shop||!owner){
    throw new Error("Your account is confirmed, but shop details are missing. Please create the owner account again.");
  }
  const {error:createError}=await supabaseClient.rpc("create_owner_shop",{
    p_shop_name:shop,p_owner_name:owner,p_phone:phone||null
  });
  if(createError){
    throw new Error("Your account is confirmed, but the shop could not be linked. Please run the owner setup SQL in Supabase, then login again.");
  }
  return null;
}
async function routeUser(user){
  const role=authRole||user.user_metadata?.login_role||"owner";
  if(role==="owner"){await ensureOwnerShopForPublicOwner(user);return startOwner(user);}
  if(role==="staff"){return startStaff(user);}
  return startCustomer(user);
}
async function ensureOwnerShopForPublicOwner(user){
  const existing=await supabaseClient.from("shop_members").select("shop_id,role,display_name,shops(*)").eq("user_id",user.id).eq("active",true).limit(1).maybeSingle();
  if(existing.error)throw existing.error;
  if(existing.data)return existing.data;
  const meta=user.user_metadata||{};
  const owner=String(meta.full_name||meta.name||meta.owner_name||user.email?.split("@")[0]||"Owner").trim();
  const shop=String(meta.shop_name||"My Dukaan").trim();
  const phone=meta.phone?String(meta.phone).trim():null;
  const {error}=await supabaseClient.rpc("create_owner_shop",{p_shop_name:shop,p_owner_name:owner,p_phone:phone});
  if(error)throw new Error("Owner setup is not available yet. Please ask the shop owner to finish shop setup.");
}
async function startStaff(user){
  const {data,error}=await supabaseClient.from("shop_members").select("shop_id,role,display_name,shops(*)").eq("user_id",user.id).eq("active",true).limit(1).maybeSingle();
  if(error)throw error;
  if(!data)throw new Error("No supervisor account is linked to this shop. Ask the owner to add you.");
  if(data.role!=="supervisor"&&data.role!=="staff")throw new Error("This account is not a supervisor account.");
  window.DukaanKhataUser=user;window.DukaanKhataShop=data.shops;
  document.getElementById("ownerHeader").textContent=(data.shops?.name||"My Dukaan")+" • "+(data.display_name||"Supervisor");
  document.getElementById("ownerAuth").classList.add("hidden");
}
async function startCustomer(user){
  window.DukaanKhataUser=user;
  document.getElementById("ownerHeader").textContent="Customer";
  document.getElementById("ownerAuth").classList.add("hidden");
  if(window.showPage)showPage("home");
}
async function startOwner(user){
  let {data,error}=await supabaseClient.from("shop_members")
    .select("shop_id,role,display_name,shops(*)")
    .eq("user_id",user.id).eq("active",true).limit(1).maybeSingle();
  if(error)throw error;
  if(!data){
    await ensureOwnerShop(user);
    const retry=await supabaseClient.from("shop_members")
      .select("shop_id,role,display_name,shops(*)")
      .eq("user_id",user.id).eq("active",true).limit(1).maybeSingle();
    data=retry.data;error=retry.error;
    if(error)throw error;
  }
  if(!data)throw new Error("Owner account exists, but no shop is linked.");
  window.DukaanKhataUser=user;window.DukaanKhataShop=data.shops;
  if(window.state&&data.shops){
    state.shop.name=data.shops.name||state.shop.name;
    state.shop.phone=data.shops.phone||state.shop.phone;
    state.shop.address=data.shops.address||state.shop.address;
    state.shop.upi=data.shops.upi_id||state.shop.upi;
    state.shop.owner=data.display_name||state.shop.owner;
    saveState();
  }
  document.getElementById("ownerHeader").textContent=(data.shops.name||"My Dukaan")+" • "+(data.display_name||"Owner");
  document.getElementById("ownerAuth").classList.add("hidden");
  authMsg("");
}
async function initOwnerAuth(){
  authUI();refreshAuthMode();
  document.getElementById("roleOwner").onclick=()=>setAuthRole("owner");
  document.getElementById("roleStaff").onclick=()=>setAuthRole("staff");
  document.getElementById("roleCustomer").onclick=()=>setAuthRole("customer");
  document.getElementById("authSwitch").onclick=()=>{authSignup=!authSignup;refreshAuthMode()};
  document.getElementById("authMain").onclick=()=>authRole==="owner"?(authSignup?createOwnerAccount():loginOwner()):authRole==="staff"?authMsg("Supervisor accounts are created by the shop owner. Use Google or Phone OTP after the owner adds you.",true):authMsg("Use Google or Phone OTP to enter as a customer.",true);
  document.getElementById("googleAuth").onclick=loginWithGoogle;
  document.getElementById("phoneAuth").onclick=loginWithPhone;
  const {data}=await supabaseClient.auth.getSession();
  if(data.session){
    try{await routeUser(data.session.user)}
    catch(e){authMsg(e.message||"Your shop could not be loaded.")}
  }
  supabaseClient.auth.onAuthStateChange(async(event,session)=>{
    if(session&&!document.getElementById("ownerAuth").classList.contains("hidden")){
      try{await routeUser(session.user)}
      catch(e){authMsg(e.message||"Your shop could not be loaded.")}
    }
  });
}
window.addEventListener("DOMContentLoaded",initOwnerAuth);
