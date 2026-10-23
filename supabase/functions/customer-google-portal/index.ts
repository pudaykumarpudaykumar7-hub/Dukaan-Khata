// Customer Google OAuth portal with owner-approved links.
// Do not deploy before reviewing the companion SQL migration and frontend changes.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const allowedOrigins = new Set(["https://pudaykumarpudaykumar7-hub.github.io","http://localhost:4173","http://localhost:5173","http://127.0.0.1:5173"]);
function cors(req: Request) {
 const origin=req.headers.get("Origin")??"";
 const allowed=allowedOrigins.has(origin)||/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
 return {"Access-Control-Allow-Origin":allowed?origin:"https://pudaykumarpudaykumar7-hub.github.io","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Max-Age":"86400","Vary":"Origin","Content-Type":"application/json"};
}
function json(req:Request,body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:cors(req)});}
function normalizePhone(value:unknown){let d=String(value??"").replace(/\D/g,"");if(d.startsWith("0091")&&d.length===14)d=d.slice(4);if(d.startsWith("91")&&d.length===12)d=d.slice(2);return d;}
function customerIdOf(tx:any){return String(tx?.customerId??tx?.customer_id??"");}
function activeCustomer(state:any,id:string){const deleted=new Set((Array.isArray(state?.deletedCustomerIds)?state.deletedCustomerIds:[]).map(String));if(!id||deleted.has(id))return null;return (Array.isArray(state?.customers)?state.customers:[]).find((c:any)=>String(c?.id??"")===id)??null;}
function accountFromState(state:any,c:any){const id=String(c.id);return {customer:{id,name:String(c.name??"Customer"),phone:String(c.phone??"")},shop:{name:String(state.shop?.name??"Dukaan"),owner:String(state.shop?.owner??"Shop Owner"),phone:String(state.shop?.phone??""),address:String(state.shop?.address??"")},transactions:(Array.isArray(state.tx)?state.tx:[]).filter((t:any)=>customerIdOf(t)===id),reminders:(Array.isArray(state.reminders)?state.reminders:[]).filter((r:any)=>String(r?.customerId??r?.customer_id??"")===id)};}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors(req)});
 if(req.method!=="POST")return json(req,{error:"Method not allowed"},405);
 try{
  const token=(req.headers.get("Authorization")??"").replace(/^Bearer\s+/i,"").trim();
  if(!token)return json(req,{error:"Sign in first."},401);
  const url=Deno.env.get("SUPABASE_URL"),anonKey=Deno.env.get("SUPABASE_ANON_KEY"),serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!anonKey||!serviceKey)return json(req,{error:"Customer Google portal is not configured on the server."},503);
  const auth=createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await auth.auth.getUser(token);
  if(authError||!user)return json(req,{error:"Your session expired. Sign in again."},401);
  const email=String(user.email??"").trim().toLowerCase();
  const hasGoogleIdentity=Array.isArray(user.identities)&&user.identities.some((identity:any)=>identity?.provider==="google");
  if(!hasGoogleIdentity||!email||user.email_confirmed_at==null)return json(req,{error:"Sign in with a verified Google account to use this customer portal."},403);
  const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const body=await req.json().catch(()=>({}));
  const action=String(body?.action??"");
  if(action==="request_link"){
   const phone=normalizePhone(body?.phone);
   if(phone.length!==10)return json(req,{error:"Enter a valid 10-digit Indian mobile number."},400);
   const pageSize=250;
   for(let from=0;from<100000;from+=pageSize){
    const {data,error}=await admin.from("dukaan_khata_state").select("user_id,state").range(from,from+pageSize-1);
    if(error){console.error("Owner-state scan failed",error.message);return json(req,{error:"Could not submit the request. Please try again later."},503);}
    const rows=data??[];
    for(const row of rows){
     const state=row?.state&&typeof row.state==="object"?row.state:{};
     const deleted=new Set((Array.isArray(state.deletedCustomerIds)?state.deletedCustomerIds:[]).map(String));
     for(const c of (Array.isArray(state.customers)?state.customers:[])){
      const id=String(c?.id??"");
      if(!id||deleted.has(id)||normalizePhone(c?.phone)!==phone)continue;
      const {error:writeError}=await admin.from("customer_account_links").upsert({owner_user_id:row.user_id,customer_auth_user_id:user.id,customer_id:id,customer_phone:phone,customer_email:email,status:"pending",updated_at:new Date().toISOString(),approved_at:null},{onConflict:"owner_user_id,customer_auth_user_id,customer_id"});
      if(writeError){console.error("Link request write failed",writeError.message);return json(req,{error:"Could not submit the request. Please try again later."},503);}
     }
    }
    if(rows.length<pageSize)break;
   }
   return json(req,{ok:true,message:"Request submitted if a matching record exists. Each shop owner must approve access."});
  }
  if(action==="list_pending"){
   const {data,error}=await admin.from("customer_account_links").select("id,customer_id,customer_phone,customer_email,created_at").eq("owner_user_id",user.id).eq("status","pending").order("created_at",{ascending:true}).limit(100);
   if(error)return json(req,{error:"Could not load access requests."},503);
   const {data:ownerRow,error:ownerError}=await admin.from("dukaan_khata_state").select("state").eq("user_id",user.id).maybeSingle();
   if(ownerError)return json(req,{error:"Could not verify shop ownership."},503);
   const state=ownerRow?.state??{};
   const requests=(data??[]).flatMap((link:any)=>{const c=activeCustomer(state,String(link.customer_id));if(!c||normalizePhone(c.phone)!==String(link.customer_phone))return[];return[{id:link.id,customerName:String(c.name??"Customer"),customerPhone:String(c.phone??""),customerEmail:String(link.customer_email??""),requestedAt:link.created_at,shopName:String(state.shop?.name??"Your shop")}];});
   return json(req,{requests});
  }
  if(action==="approve"||action==="revoke"){
   const id=String(body?.link_id??"");if(!/^[0-9a-f-]{36}$/i.test(id))return json(req,{error:"Invalid request."},400);
   const {data:link,error:linkError}=await admin.from("customer_account_links").select("id,owner_user_id,customer_id,customer_phone").eq("id",id).eq("owner_user_id",user.id).maybeSingle();
   if(linkError||!link)return json(req,{error:"Request not found for your shop."},404);
   const {data:ownerRow,error:ownerError}=await admin.from("dukaan_khata_state").select("state").eq("user_id",user.id).maybeSingle();
   if(ownerError||!ownerRow)return json(req,{error:"Could not verify your shop record."},503);
   const c=activeCustomer(ownerRow.state,String(link.customer_id));
   if(!c||normalizePhone(c.phone)!==String(link.customer_phone)){await admin.from("customer_account_links").update({status:"revoked",updated_at:new Date().toISOString(),approved_at:null}).eq("id",id).eq("owner_user_id",user.id);return json(req,{error:"This customer record changed or was deleted. The request has been revoked."},409);}
   const status=action==="approve"?"approved":"revoked";
   const {error:updateError}=await admin.from("customer_account_links").update({status,updated_at:new Date().toISOString(),approved_at:status==="approved"?new Date().toISOString():null}).eq("id",id).eq("owner_user_id",user.id);
   if(updateError)return json(req,{error:"Could not update the access request."},503);
   return json(req,{ok:true,status});
  }
  if(action==="accounts"){
   const {data:links,error}=await admin.from("customer_account_links").select("owner_user_id,customer_id,customer_phone").eq("customer_auth_user_id",user.id).eq("status","approved").limit(100);
   if(error)return json(req,{error:"Could not load approved shops."},503);
   const accounts:any[]=[];
   for(const link of links??[]){
    const {data:ownerRow,error:ownerError}=await admin.from("dukaan_khata_state").select("state").eq("user_id",link.owner_user_id).maybeSingle();
    if(ownerError||!ownerRow)continue;
    const c=activeCustomer(ownerRow.state,String(link.customer_id));
    if(!c||normalizePhone(c.phone)!==String(link.customer_phone)){await admin.from("customer_account_links").update({status:"revoked",updated_at:new Date().toISOString(),approved_at:null}).eq("owner_user_id",link.owner_user_id).eq("customer_auth_user_id",user.id).eq("customer_id",link.customer_id);continue;}
    accounts.push(accountFromState(ownerRow.state,c));
   }
   return json(req,{accounts});
  }
  return json(req,{error:"Unsupported action."},400);
 }catch(error){console.error("Customer Google portal error",error);return json(req,{error:"Could not process your request. Please try again."},500);}
});
