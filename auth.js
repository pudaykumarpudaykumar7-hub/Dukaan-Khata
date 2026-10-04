const SUPABASE_URL="https://nzsldzyjpxwyyrdwkphp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_k3ZPG1Wuqm3KFzoQAXnByA_YTMLkUG-";
const supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
let currentUser=null,currentShopId=null;

function authMsg(message,error=false){const el=document.getElementById("authMessage");el.textContent=message;el.className="authMessage "+(error?"error":"success")}
function showLogin(){signupBox.classList.add("hidden");loginBox.classList.remove("hidden");authSubtitle.textContent="Owner Login";authMsg("")}
function showSignup(){loginBox.classList.add("hidden");signupBox.classList.remove("hidden");authSubtitle.textContent="Cloud Owner Account";authMsg("")}
function lockApp(){authGate.classList.remove("hidden");appShell.classList.add("appLocked")}
function unlockApp(){authGate.classList.add("hidden");appShell.classList.remove("appLocked")}
async function getMyShop(){
  const {data,error}=await supabaseClient.from("shop_members").select("shop_id,role,display_name").eq("user_id",currentUser.id).eq("active",true).limit(1).maybeSingle();
  if(error) throw error;
  if(!data) throw new Error("No shop is linked to this account.");
  currentShopId=data.shop_id;
  return data;
}
async function createOwner(){
  const shop=shopName.value.trim(),name=ownerName.value.trim(),phone=ownerPhone.value.trim(),email=ownerEmail.value.trim(),password=ownerPassword.value;
  if(!shop||!name||!email||!password)return authMsg("Please fill shop name, owner name, email and password.",true);
  if(password.length<6)return authMsg("Password must be at least 6 characters.",true);
  authMsg("Creating your owner account...");
  const {data,error}=await supabaseClient.auth.signUp({email,password,options:{data:{owner_name:name,phone}}});
  if(error)return authMsg(error.message,true);
  if(data.session){
    currentUser=data.user;
    try{
      const {error:e}=await supabaseClient.rpc("create_owner_shop",{p_shop_name:shop,p_owner_name:name,p_phone:phone||null});
      if(e)throw e;
      await startApp();
    }catch(e){authMsg(e.message||"Could not create shop.",true)}
  }else{
    authMsg("Account created. Check your email, confirm it, then return here and log in.");
    showLogin();loginEmail.value=email;
  }
}
async function loginOwner(){
  const email=loginEmail.value.trim(),password=loginPassword.value;
  if(!email||!password)return authMsg("Enter your email and password.",true);
  authMsg("Signing in...");
  const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});
  if(error)return authMsg(error.message,true);
  currentUser=data.user;
  try{await startApp()}catch(e){await supabaseClient.auth.signOut();authMsg(e.message||"No shop found for this account.",true)}
}
async function startApp(){
  const member=await getMyShop();
  ownerHeader.textContent="Owner • "+(member.display_name||"Shop Owner");
  unlockApp();
  await initCloudApp(currentShopId,currentUser.id);
}
async function ownerMenu(){
  const {data}=await supabaseClient.from("shop_members").select("display_name,phone,role,shop_id").eq("user_id",currentUser.id).eq("shop_id",currentShopId).maybeSingle();
  modal("<h2>Owner Account</h2><p><b>"+esc(data?.display_name||"Owner")+"</b></p><p>"+esc(data?.phone||"")+"</p><p>Role: "+esc(data?.role||"owner")+"</p><button class="btn" onclick="logoutOwner()">🔒 Logout</button>");
}
async function logoutOwner(){closeModal();await supabaseClient.auth.signOut();currentUser=null;currentShopId=null;db={customers:[],items:[],tx:[]};lockApp();showLogin();authMsg("You have been logged out.")}
supabaseClient.auth.onAuthStateChange(async (_event,session)=>{
  if(session){currentUser=session.user;try{await startApp()}catch(e){console.error(e);await supabaseClient.auth.signOut();lockApp();showLogin()}}
  else{lockApp();showLogin()}
});
lockApp();
