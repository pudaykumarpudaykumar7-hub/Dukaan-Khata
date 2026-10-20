// Dukaan Shop shared multi-owner marketplace. Uses the same Supabase Google session as Dukaan Khata.
(function(){
"use strict";
const URL="https://nzsldzyjpxwyyrdwkphp.supabase.co",KEY="sb_publishable_k3ZPG1Wuqm3KFzoQAXnByA_YTMLkUG-";
const $=id=>document.getElementById(id), K={shop:"dk_market_shop_v1",products:"dk_market_products_v1",cart:"dk_market_cart_v1",orders:"dk_market_orders_v1"};
let sb=null,user=null,shopRow=null,remoteProducts=[],remoteShops=[];
const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||"null")??d}catch{return d}},write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
function status(t){let el=$("cloudNotice");if(el)el.textContent=t}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function ensureBar(){if(!$("dkCloudLogin")){let b=document.createElement("button");b.id="dkCloudLogin";b.className="btn";b.style.margin="12px 0";b.textContent="🔐 Sign in with Google to register/manage your shop";b.onclick=login;document.querySelector(".head")?.insertAdjacentElement("afterend",b)}}
async function login(){if(!sb)return alert("Cloud login is unavailable. Refresh and try again.");const {error}=await sb.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.href,queryParams:{prompt:"select_account"},scopes:"openid email profile"}});if(error)alert("Google sign-in failed: "+error.message)}
async function init(){
 if(!window.supabase?.createClient){await new Promise(resolve=>{let s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";s.onload=resolve;s.onerror=resolve;document.head.appendChild(s)});}
 if(!window.supabase?.createClient){status("Cloud service could not load. Your device-local preview is still available.");return}
 sb=window.dkSupabase||window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});window.dkSupabase=sb;
 ensureBar();const {data}=await sb.auth.getSession();user=data?.session?.user||null;paintLogin();
 sb.auth.onAuthStateChange((_event,session)=>{user=session?.user||null;paintLogin();if(user)loadAll()});
 await loadAll();
}
function paintLogin(){let b=$("dkCloudLogin");if(!b)return;b.textContent=user?"✓ Signed in: "+(user.email||"Google account")+" · Switch account / Sign out":"🔐 Sign in with Google to register/manage your shop";b.onclick=user?async()=>{if(confirm("Sign out of this Google account on this device?")){await sb.auth.signOut();user=null;paintLogin()}}:login}
async function loadAll(){
 if(!sb)return;
 try{
  const [sr,pr]=await Promise.all([sb.from("dk_market_shops").select("*").eq("published",true).order("created_at",{ascending:false}),sb.from("dk_market_products").select("*").eq("published",true)]);
  if(sr.error)throw sr.error;if(pr.error)throw pr.error;
  remoteShops=sr.data||[];remoteProducts=(pr.data||[]).map(p=>({...p,shop_id:p.shop_id,shop_name:remoteShops.find(s=>s.id===p.shop_id)?.name||"Local shop",owner_id:p.owner_id,desc:p.description||"",remote:true}));
  const local=read(K.products,[]).filter(p=>!p.remote);
  write(K.products,[...local,...remoteProducts]);
  shopRow=user?((await sb.from("dk_market_shops").select("*").eq("owner_id",user.id).maybeSingle()).data||null):null;
  if(shopRow){write(K.shop,{id:shopRow.id,owner_id:user.id,name:shopRow.name,owner:shopRow.owner,phone:shopRow.phone,category:shopRow.category,area:shopRow.area,delivery:shopRow.delivery});fillShop(shopRow)}
  const shopSelect=$("marketShopFilter");
  if(!shopSelect){const sel=document.createElement("select");sel.id="marketShopFilter";sel.style.margin="0 0 12px";sel.innerHTML='<option value="all">🛍️ All published shops</option>'+remoteShops.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.name)+' — '+esc(s.area)+'</option>').join("");$("categories")?.insertAdjacentElement("beforebegin",sel);sel.onchange=()=>{document.querySelectorAll("#catalog .product").forEach(card=>{card.style.display=sel.value==="all"||card.dataset.shopId===sel.value?"":"none"})}}
  $("search")?.dispatchEvent(new Event("input"));const cat=$("catalog");if(cat)paintCatalogWithShops();
  status("Shared marketplace connected: "+remoteShops.length+" shops and "+remoteProducts.length+" published products. Sign in with Google to manage your own shop.");
  if(user)await loadOwnerOrders();
 }catch(e){console.error("Dukaan Shop cloud:",e);status("Cloud database needs setup. Run supabase/dukaan-shop-marketplace.sql in Supabase SQL Editor. Current device preview remains available.")}
}
function fillShop(s){for(const [id,val] of [["shopName",s.name],["ownerName",s.owner],["shopPhone",s.phone],["shopCategory",s.category],["shopArea",s.area],["shopDelivery",s.delivery]])if($(id))$(id).value=val||""}
function paintCatalogWithShops(){
 const catalog=$("catalog");if(!catalog)return;
 // Existing renderer paints product cards; append shop attribution and a shop selector filter.
 catalog.querySelectorAll(".product").forEach(card=>{
  const title=card.querySelector("h3")?.textContent;
  const p=remoteProducts.find(x=>x.name===title);
  if(p){card.dataset.shopId=p.shop_id;const body=card.querySelector(".pbody");if(body&&!body.querySelector(".dk-shop-label")){const lab=document.createElement("div");lab.className="muted dk-shop-label";lab.style.color="#1769ff";lab.style.fontWeight="800";lab.textContent="🏪 "+p.shop_name+(remoteShops.find(s=>s.id===p.shop_id)?.area?" · "+remoteShops.find(s=>s.id===p.shop_id).area:"");body.insertBefore(lab,body.querySelector("h3"))}}
 }
 const sel=$("marketShopFilter");if(sel)sel.dispatchEvent(new Event("change"));
}
async function saveShop(e){
 if(!user){e.preventDefault();e.stopImmediatePropagation();alert("Please sign in with Google first. The shop will then be published to the shared marketplace.");return}
 e.preventDefault();e.stopImmediatePropagation();
 const row={owner_id:user.id,name:$("shopName").value.trim(),owner:$("ownerName").value.trim(),phone:$("shopPhone").value.trim(),category:$("shopCategory").value,area:$("shopArea").value.trim(),delivery:$("shopDelivery").value,published:true,updated_at:new Date().toISOString()};
 try{let q=shopRow?sb.from("dk_market_shops").update(row).eq("owner_id",user.id).select().single():sb.from("dk_market_shops").insert(row).select().single();const {data,error}=await q;if(error)throw error;shopRow=data;write(K.shop,{...data,owner_id:user.id});status("Your shop is published in Dukaan Shop ✓");await loadAll();alert("Shop published to the shared marketplace.");}catch(err){alert("Could not publish shop: "+err.message+". Confirm the Supabase SQL setup has been run.");}
}
async function saveProduct(e){
 if(!user){e.preventDefault();e.stopImmediatePropagation();alert("Sign in with Google and register your shop before adding products.");return}
 e.preventDefault();e.stopImmediatePropagation();
 if(!shopRow){alert("Please save/register your shop first.");return}
 const id=$("editId").value||"p"+Date.now().toString(36),p={id,owner_id:user.id,shop_id:shopRow.id,name:$("pName").value.trim(),category:$("pCategory").value.trim()||"General",price:Number($("pPrice").value),unit:$("pUnit").value,stock:$("pStock").value===""?null:Number($("pStock").value),image:$("pImage").value.trim()||null,description:$("pDesc").value.trim(),published:true,updated_at:new Date().toISOString()};
 try{const {error}=await sb.from("dk_market_products").upsert(p,{onConflict:"id"});if(error)throw error;let xs=read(K.products,[]).filter(x=>x.id!==id);xs.push({...p,desc:p.description,remote:true,shop_name:shopRow.name});write(K.products,xs);$("productForm").reset();$("editId").value="";await loadAll();alert("Product published to customers across devices.");}catch(err){alert("Could not publish product: "+err.message+". Check the database setup.");}
}
async function saveOrder(){
 if(!sb)return;const cart=read(K.cart,[]),products=read(K.products,[]);
 const rows=cart.map(x=>({x,p:products.find(p=>p.id===x.id)})).filter(z=>z.p?.remote&&z.p.shop_id);
 if(!rows.length)return;
 const name=$("buyer")?.value.trim(),phone=$("buyerPhone")?.value.trim();if(!name||!phone)return;
 const groups=new Map();rows.forEach(({x,p})=>{if(!groups.has(p.shop_id))groups.set(p.shop_id,[]);groups.get(p.shop_id).push({name:p.name,qty:x.qty,unit:p.unit||"piece",price:Number(p.price),subtotal:Number(p.price)*Number(x.qty)})});
 for(const [shopId,items] of groups){
  const shop=remoteShops.find(s=>s.id===shopId);if(!shop)continue;
  const order={id:"DKO"+Date.now().toString(36)+Math.random().toString(36).slice(2,5),shop_id:shopId,owner_id:shop.owner_id,buyer_name:name,buyer_phone:phone,delivery_method:$("delivery").value,address:$("address").value.trim()||null,payment_preference:$("payment").value,note:$("note").value.trim()||null,items,total:items.reduce((a,x)=>a+x.subtotal,0),status:"Placed"};
  const {error}=await sb.from("dk_market_orders").insert(order);if(error)throw error;
 }
}
async function loadOwnerOrders(){
 if(!user)return;
 const {data,error}=await sb.from("dk_market_orders").select("*").eq("owner_id",user.id).order("created_at",{ascending:false});
 if(error){console.warn(error);return}
 const area=$("myOrders");if(!area)return;
 if(data?.length){const old=area.innerHTML;area.innerHTML=data.map(o=>'<div class="itemrow"><div class="grow"><b>Order '+esc(o.id)+' · '+esc(o.buyer_name)+'</b><div class="muted">'+esc(o.buyer_phone)+' · '+esc(o.delivery_method)+' · '+esc(new Date(o.created_at).toLocaleString())+'</div><div>'+esc((o.items||[]).map(i=>i.name+" × "+i.qty+" "+i.unit).join(", "))+'</div><b>₹'+Number(o.total).toLocaleString("en-IN")+'</b></div><span class="status">'+esc(o.status)+'</span><button class="btn alt" data-order-status="'+esc(o.id)+'">Mark accepted</button></div>').join("")+old;
  area.querySelectorAll("[data-order-status]").forEach(b=>b.onclick=async()=>{const {error}=await sb.from("dk_market_orders").update({status:"Accepted"}).eq("id",b.dataset.orderStatus).eq("owner_id",user.id);if(error)alert(error.message);else{b.textContent="Accepted ✓";b.disabled=true}});
 }
}
function bind(){
 $("shopForm")?.addEventListener("submit",saveShop,true);
 $("productForm")?.addEventListener("submit",saveProduct,true);
 $("placeOrder")?.addEventListener("click",async e=>{try{await saveOrder()}catch(err){console.error(err);status("Order sync failed: "+err.message+". Please try again after database setup.")}},true);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{bind();init()},{once:true});else{bind();init()}
})();