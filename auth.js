// Dukaan Khata: no-login mode
// The app opens directly. Cloud data is accessed using the existing Supabase client.
const SUPABASE_URL="https://nzsldzyjpxwyyrdwkphp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_k3ZPG1Wuqm3KFzoQAXnByA_YTMLkUG-";
let supabaseClient=null,currentUser=null,currentShopId=null;

async function initAuth(){
  try{
    if(!window.supabase)throw new Error("Supabase library did not load.");
    supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
    window.supabaseClient=supabaseClient;
    const {data,error}=await supabaseClient.auth.getSession();
    if(error)console.warn("Cloud session unavailable:",error.message);
    currentUser=data?.session?.user||null;

    // No login, OTP, password, phone, or anonymous authentication.
    // Use a local browser shop identifier when no authenticated owner exists.
    currentShopId=localStorage.getItem("dukaan_khata_shop_id");
    if(!currentShopId){
      currentShopId=crypto.randomUUID();
      localStorage.setItem("dukaan_khata_shop_id",currentShopId);
    }

    const header=document.getElementById("ownerHeader");
    if(header)header.textContent="Shop • No Login";

    if(typeof initCloudApp==="function"){
      try{
        await initCloudApp(currentShopId,currentUser?.id||null);
      }catch(e){
        console.warn("Cloud data is unavailable in no-login mode:",e.message);
        if(header)header.textContent="Shop • Local Mode";
      }
    }
  }catch(e){
    console.error(e);
    const header=document.getElementById("ownerHeader");
    if(header)header.textContent="Shop • Local Mode";
  }
}
window.addEventListener("DOMContentLoaded",initAuth);