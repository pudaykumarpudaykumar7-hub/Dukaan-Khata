const SUPABASE_URL="https://nzsldzyjpxwyyrdwkphp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_k3ZPG1Wuqm3KFzoQAXnByA_YTMLkUG-";

let supabaseClient=null;
let currentUser=null,currentShopId=null,authStarting=false;

function friendlyError(e){
  const m=(e?.message||String(e)||"Unknown error").toLowerCase();
  if(m.includes("anonymous")||m.includes("signups not allowed"))return "Anonymous access is not enabled in Supabase. Turn on Authentication → Providers → Anonymous, then refresh.";
  if(m.includes("function")&&m.includes("create_owner_shop"))return "Shop setup is missing in Supabase. The create_owner_shop function must be enabled.";
  if(m.includes("permission denied")||m.includes("row-level security"))return "Cloud permission is not ready. Check the Supabase database policies.";
  return e?.message||String(e)||"Something went wrong.";
}
async function getMyShop(){
  const {data,error}=await supabaseClient.from("shop_members").select("shop_id,role,display_name,phone").eq("user_id",currentUser.id).eq("active",true).limit(1).maybeSingle();
  if(error)throw error;
  if(!data)return null;
  currentShopId=data.shop_id;return data;
}
async function createShopForGuest(){
  const {data,error}=await supabaseClient.rpc("create_owner_shop",{p_shop_name:"My Shop",p_owner_name:"Shop Owner",p_phone:null});
  if(error)throw error;
  currentShopId=data;
}
async function startApp(){
  if(!currentUser||authStarting)return;
  authStarting=true;
  try{
    let member=await getMyShop();
    if(!member){await createShopForGuest();member=await getMyShop()}
    if(!member)throw new Error("No shop is linked to this session.");
    document.getElementById("ownerHeader").textContent="Shop • "+(member.display_name||"Cloud");
    if(typeof initCloudApp==="function")await initCloudApp(currentShopId,currentUser.id);
  }catch(e){
    console.error(e);
    document.getElementById("ownerHeader").textContent="Cloud setup needed";
    alert(friendlyError(e));
  }finally{authStarting=false}
}
async function initAuth(){
  try{
    if(!window.supabase)throw new Error("Supabase library did not load.");
    supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
    window.supabaseClient=supabaseClient;
    const {data,error}=await supabaseClient.auth.getSession();
    if(error)throw error;
    if(data?.session){currentUser=data.session.user;await startApp();return}
    const {data:guest,error:guestError}=await supabaseClient.auth.signInAnonymously();
    if(guestError)throw guestError;
    currentUser=guest.user;
    await startApp();
  }catch(e){
    console.error(e);
    alert(friendlyError(e));
  }
}
window.addEventListener("DOMContentLoaded",initAuth);