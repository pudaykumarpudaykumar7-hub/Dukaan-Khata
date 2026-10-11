/* Dukaan Khata shared marketplace — Supabase-backed shops, products and orders */
(()=>{"use strict";
const URL="https://nzsldzyjpxwyyrdwkphp.supabase.co";
const KEY="sb_publishable_k3ZPG1Wuqm3KFzoQAXnByA_YTMLkUG-";
const $=id=>document.getElementById(id), esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>"₹"+Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2});
const sb=window.supabase?.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
if(!sb){const s=$("status")||$("shopNotice");if(s)s.textContent="Marketplace database library did not load. Refresh the page and try again.";return;}
let user=null,shops=[],products=[],cart=[],orders=[],activeShop=null,ownedShop=null;
const universe=location.pathname.endsWith("universe.html");
function status(msg){["status","shopNotice"].forEach(id=>{const e=$(id);if(e){e.textContent=msg;e.style.display="block";e.style.padding="10px";e.style.margin="10px 0";e.style.borderRadius="10px";e.style.background="#e8f7ef";e.style.color="#124b35";e.style.fontWeight="700";}})}
async function signIn(){const {error}=await sb.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.href,queryParams:{prompt:"select_account"}}});if(error)status("Google login failed: "+error.message)}
async function signOut(){await sb.auth.signOut();location.reload()}
function addAuthUI(){const head=document.querySelector(".top");if(!head)return;let box=document.createElement("div");box.style.cssText="display:flex;gap:8px;align-items:center;flex-wrap:wrap";box.innerHTML='<span id="marketUser" style="font-size:12px;color:inherit"></span><button class="btn" id="marketAuthBtn" type="button">Sign in with Google</button>';head.appendChild(box);$("marketAuthBtn").onclick=()=>user?signOut():signIn();paintAuth()}
function paintAuth(){const b=$("marketAuthBtn"),u=$("marketUser");if(b)b.textContent=user?"Sign out":"Sign in with Google";if(u)u.textContent=user?(user.user_metadata?.full_name||user.email||"Owner"):"Owner access"}
async function init(){status("Marketplace loading…");try{const {data,error}=await sb.auth.getSession();if(error)throw error;user=data.session?.user||null;addAuthUI();sb.auth.onAuthStateChange((_event,session)=>{user=session?.user||null;paintAuth();universe?loadShops():loadStore()});if(universe)setupUniverse();else setupStore();if(universe)status(user?"Signed in. You can register your shop.":"Please sign in with Google before registering your shop.");}catch(err){status("Marketplace startup problem: "+(err?.message||String(err))+". Refresh the page and try again.");if(universe)setupUniverse();}}
function setupUniverse(){
 const form=$("addForm");if(form){form.addEventListener("submit",async e=>{e.preventDefault();e.stopImmediatePropagation();const submit=form.querySelector("[type=submit]");if(submit)submit.disabled=true;try{if(!user){status("Please sign in with Google before registering a shop.");return}
 const name=$("shopName").value.trim(),owner=$("ownerName").value.trim(),phone=$("ownerPhone").value.trim(),area=$("shopArea").value.trim(),lat=$("shopLat").value.trim(),lon=$("shopLon").value.trim();
 if(!name||!owner||!phone||!$("products").value.trim()){status("Complete the required shop details.");return}
 const row={owner_id:user.id,name,owner_name:owner,phone,area,category:$("category").value,details:[$("details").value.trim(),"Products: "+$("products").value.trim(),"Hours: "+$("openTime").value+"-"+$("closeTime").value].filter(Boolean).join("\n"),lat:lat?Number(lat):null,lon:lon?Number(lon):null,active:true};
 if((lat&&!lon)||(!lat&&lon)|| (lat&&(!Number.isFinite(row.lat)||row.lat < -90||row.lat>90||!Number.isFinite(row.lon)||row.lon < -180||row.lon>180))){status("Enter valid latitude and longitude, or leave both blank.");return}
 const {error}=await sb.from("dk_shops").insert(row);if(error){status("Shop could not be registered: "+error.message);return}
 form.reset();if($("locationResults"))$("locationResults").innerHTML="";if($("locationPreview"))$("locationPreview").textContent="No location selected yet.";status("Shop registered successfully and is now available to customers.");await loadShops();
 }catch(err){status("Shop registration failed: "+(err?.message||String(err)));}finally{if(submit)submit.disabled=false}
 },true)}

 const locationInput=$("locationSearch"), locationResults=$("locationResults");
 let searchSequence=0;
 async function searchShopLocation(){
   const q=locationInput?.value.trim(); if(!q){status("Type a shop address, area, or landmark first.");return}
   if(locationResults)locationResults.innerHTML='<div class="distance">Searching locations…</div>';
   const seq=++searchSequence;
   try{
     const response=await fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&q="+encodeURIComponent(q),{headers:{Accept:"application/json"}});
     if(!response.ok)throw new Error("Location search service returned HTTP "+response.status);
     const results=await response.json(); if(seq!==searchSequence)return;
     if(!results.length){if(locationResults)locationResults.innerHTML='<div class="distance">No match found. Try a nearby landmark or a more specific address.</div>';return}
     if(locationResults)locationResults.innerHTML=results.map((r,i)=>'<button type="button" class="field location-result" data-location-index="'+i+'" style="text-align:left;margin:4px 0;cursor:pointer;background:white"><b>'+esc((r.name||r.display_name.split(",")[0]))+'</b><div class="distance" style="white-space:normal">'+esc(r.display_name)+'</div></button>').join("");
     locationResults.querySelectorAll("[data-location-index]").forEach(b=>b.onclick=()=>{
       const r=results[Number(b.dataset.locationIndex)];$("shopLat").value=String(r.lat);$("shopLon").value=String(r.lon);
       const addr=r.address||{};const area=[addr.neighbourhood,addr.suburb,addr.city_district,addr.town,addr.city,addr.village,addr.county,stateName(addr),addr.postcode].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(", ");
       if(area&&$("shopArea"))$("shopArea").value=area;
       if($("locationPreview"))$("locationPreview").textContent="Selected: "+r.display_name;
       if(locationInput)locationInput.value=r.display_name;
       locationResults.innerHTML="";status("Shop location selected. You can now submit the shop details.");
     });
   }catch(err){if(locationResults)locationResults.innerHTML='<div class="distance">Location search failed. Check your internet connection or use the live location button.</div>';status("Location search error: "+(err?.message||String(err)))}
 }
 function stateName(a){return a.state||a.region||""}
 $("searchLocation")?.addEventListener("click",searchShopLocation);
 locationInput?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();searchShopLocation()}});
 $("captureLocation")?.addEventListener("click",()=>{
   if(!navigator.geolocation){status("This browser does not support live location. Search for an address instead.");return}
   status("Getting your live location…");
   navigator.geolocation.getCurrentPosition(async p=>{
     $("shopLat").value=String(p.coords.latitude);$("shopLon").value=String(p.coords.longitude);
     if($("locationPreview"))$("locationPreview").textContent="Live coordinates selected. Searching for the readable address…";
     try{
       const res=await fetch("https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat="+encodeURIComponent(p.coords.latitude)+"&lon="+encodeURIComponent(p.coords.longitude)+"&zoom=18&addressdetails=1",{headers:{Accept:"application/json"}});
       const r=res.ok?await res.json():null;
       if(r){if(locationInput)locationInput.value=r.display_name||"Current location";if($("locationPreview"))$("locationPreview").textContent="Selected: "+(r.display_name||"Current location");const a=r.address||{};const area=[a.neighbourhood,a.suburb,a.city_district,a.town,a.city,a.village,a.county,a.state,a.postcode].filter(Boolean).filter((v,i,x)=>x.indexOf(v)===i).join(", ");if(area&&$("shopArea"))$("shopArea").value=area}
       status("Live shop location selected.");
     }catch(_){if($("locationPreview"))$("locationPreview").textContent="Live coordinates selected: "+p.coords.latitude.toFixed(5)+", "+p.coords.longitude.toFixed(5);status("Live location selected; readable address lookup was unavailable.")}
   },err=>status("Could not get live location: "+(err.code===1?"allow location permission in browser settings.":err.code===2?"location signal unavailable; search by address instead.":"location request timed out; try address search instead.")),{enableHighAccuracy:true,timeout:15000,maximumAge:60000});
 });

 $("search")?.addEventListener("input",()=>renderShops());
 $("nearby")?.addEventListener("click",()=>{if(!navigator.geolocation){status("Location is unavailable in this browser.");return}navigator.geolocation.getCurrentPosition(p=>{window.dkMarketplacePosition={lat:p.coords.latitude,lon:p.coords.longitude};renderShops()},()=>status("Allow location permission to find nearby shops."),{enableHighAccuracy:true,timeout:12000})});
 loadShops();
}
async function loadShops(){const {data,error}=await sb.from("dk_shops").select("*").eq("active",true).order("created_at",{ascending:false});if(error){status("Could not load shops: "+error.message);return}shops=data||[];renderShops()}
function distance(a,b){const r=Math.PI/180,dlat=(b.lat-a.lat)*r,dlon=(b.lon-a.lon)*r,x=Math.sin(dlat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dlon/2)**2;return 6371*2*Math.asin(Math.sqrt(x))}
function renderShops(){const box=$("shops");if(!box)return;let list=shops.filter(s=>(s.name+" "+(s.area||"")+" "+(s.category||"")).toLowerCase().includes(($("search")?.value||"").toLowerCase()));const pos=window.dkMarketplacePosition;if(pos)list.sort((a,b)=>{let da=a.lat!=null&&a.lon!=null?distance(pos,{lat:Number(a.lat),lon:Number(a.lon)}):99999,db=b.lat!=null&&b.lon!=null?distance(pos,{lat:Number(b.lat),lon:Number(b.lon)}):99999;return da-db});box.innerHTML=list.length?list.map(s=>'<article class="shop"><div style="min-width:0;flex:1"><b class="shopname">'+esc(s.name)+'</b><div class="distance">'+esc(s.category||"Local shop")+' • '+esc(s.area||"Area not added")+'</div><div class="distance">'+esc(s.owner_name||"Shop owner")+(s.phone?" • "+esc(s.phone):"")+'</div><div class="shop-actions"><a class="btn" href="./shop.html?shop='+encodeURIComponent(s.id)+'">Browse products</a>'+(s.phone?'<a class="btn secondary" href="tel:'+esc(s.phone)+'">Call</a>':"")+(user&&s.owner_id===user.id?'<button class="shop-delete" data-delete-shop="'+esc(s.id)+'">Delete my shop</button>':"")+'</div></div>'+(pos&&s.lat!=null&&s.lon!=null?'<span class="distance">'+distance(pos,{lat:Number(s.lat),lon:Number(s.lon)}).toFixed(1)+' km</span>':"")+'</article>').join(""):'<div class="empty">No registered shops found yet. Owners can sign in and add their shop.</div>';box.querySelectorAll("[data-delete-shop]").forEach(b=>b.onclick=async()=>{if(!confirm("Delete this shop and its products and orders?"))return;const {error}=await sb.from("dk_shops").delete().eq("id",b.dataset.deleteShop);status(error?"Could not delete shop: "+error.message:"Shop deleted.");await loadShops()});const details=document.querySelector(".add");if(details)details.querySelector("summary").textContent=user?"＋ Register your shop":"＋ Register a shop (Google sign-in required)"}
function setupStore(){
 const urlShop=new URLSearchParams(location.search).get("shop");
 const notice=$("shopNotice");if(notice)notice.textContent="Shared marketplace: shops and products are loaded from the Dukaan Khata database. Sign in with Google to manage your own shop.";
 const refresh=$("refresh");if(refresh)refresh.onclick=loadStore;
 $("search")?.addEventListener("input",renderCatalog);
 document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>tab(b.dataset.tab));
 $("form")?.addEventListener("submit",async e=>{e.preventDefault();if(!user){status("Sign in with Google to manage products.");return}if(!ownedShop){status("Register a shop first in Dukaan Universe.");return}
 const name=$("pname").value.trim(),price=Number($("price").value);if(!name||!Number.isFinite(price)||price<0){status("Enter a valid product name and price.");return}
 const id=$("pid").value,row={shop_id:ownedShop.id,name,price,unit:$("unit").value==="custom"?$("customUnit").value.trim():$("unit").value,image_url:$("image").value.trim()||null,category:$("category").value.trim()||"Other",description:$("desc").value.trim()||null,stock:$("stock").value===""?null:Number($("stock").value),active:true};
 const result=id?await sb.from("dk_products").update(row).eq("id",id):await sb.from("dk_products").insert(row);if(result.error){status("Could not save product: "+result.error.message);return}resetProductForm();status("Product saved to the shared marketplace.");await loadStore();tab("manage")
 });
 $("cancel")?.addEventListener("click",resetProductForm);
 $("sendOrder")?.addEventListener("click",placeOrder);
 $("method")?.addEventListener("change",()=>{$("addressBox")?.classList.toggle("hidden",$("method").value!=="Delivery")});
 $("clear")?.addEventListener("click",()=>{cart=[];renderCart()});
 loadStore(urlShop);
}
function tab(id){document.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("active",b.dataset.tab===id));["store","cart","orders","manage"].forEach(x=>$(x)?.classList.toggle("hidden",x!==id));if(id==="cart")renderCart();if(id==="orders")renderOrders();if(id==="manage")renderManage()}
async function loadStore(requestedShop){const {data:all,error}=await sb.from("dk_shops").select("*").eq("active",true).order("name");if(error){status("Could not load marketplace shops: "+error.message);return}shops=all||[];ownedShop=user?shops.find(s=>s.owner_id===user.id)||null:null;const chosen=requestedShop?shops.find(s=>s.id===requestedShop):null;activeShop=chosen||ownedShop||shops[0]||null;
 let sel=$("marketShopSelect");if(!sel){sel=document.createElement("select");sel.id="marketShopSelect";sel.className="field";sel.style.margin="8px 0 14px";$("store")?.insertBefore(sel,$("search"))}sel.innerHTML=shops.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.name)+(user&&s.owner_id===user.id?" (Your shop)":"")+'</option>').join("");if(activeShop)sel.value=activeShop.id;sel.onchange=()=>{activeShop=shops.find(s=>s.id===sel.value)||null;cart=[];loadProducts()};
 const h=$("shopName");if(h)h.textContent=activeShop?.name||"Dukaan Khata Online Shop";const info=$("shopInfo");if(info)info.textContent=activeShop?[activeShop.owner_name,activeShop.area,activeShop.phone].filter(Boolean).join(" • "):"No shops are registered yet. Register your shop in Dukaan Universe.";
 document.querySelectorAll(".owner-only").forEach(e=>e.classList.toggle("hidden",!(user&&ownedShop&&activeShop?.id===ownedShop.id)));
 const manageTab=document.querySelector('[data-tab="manage"]');if(manageTab)manageTab.classList.toggle("hidden",!(user&&ownedShop&&activeShop?.id===ownedShop.id));
 const ordersTab=document.querySelector('[data-tab="orders"]');if(ordersTab)ordersTab.classList.toggle("hidden",!(user&&ownedShop&&activeShop?.id===ownedShop.id));
 if($("seedKirana"))$("seedKirana").classList.add("hidden");
 await loadProducts();await loadOrders();
}
async function loadProducts(){if(!activeShop){products=[];renderCatalog();renderManage();return}const {data,error}=await sb.from("dk_products").select("*").eq("shop_id",activeShop.id).eq("active",true).order("name");if(error){status("Could not load products: "+error.message);return}products=(data||[]).map(p=>({...p,id:p.id,desc:p.description||"",image:p.image_url||"",unit:p.unit||"piece"}));renderCatalog();renderManage()}
function renderCatalog(){const q=($("search")?.value||"").toLowerCase(),list=products.filter(p=>(p.name+" "+(p.category||"")+" "+(p.description||"")).toLowerCase().includes(q)),box=$("catalog");if(!box)return;box.innerHTML=list.length?list.map(p=>'<article class="product"><div class="muted">'+esc(p.category||"Product")+'</div>'+(p.image_url&&/^https?:\/\//i.test(p.image_url)?'<img loading="lazy" src="'+esc(p.image_url)+'" alt="'+esc(p.name)+'" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:12px">':'<div style="height:120px;display:grid;place-items:center;background:#edf4ff;border-radius:12px;font-size:42px">🛍️</div>')+'<h3>'+esc(p.name)+'</h3><div class="price">'+money(p.price)+' / '+esc(p.unit)+'</div>'+(p.description?'<p class="muted">'+esc(p.description)+'</p>':"")+(p.stock!=null?'<small class="muted">'+(Number(p.stock)>0?esc(p.stock)+" available":"Out of stock")+'</small>':"")+'<button class="btn" data-add="'+esc(p.id)+'" '+(p.stock!=null&&Number(p.stock)<=0?"disabled":"")+'>Add to cart</button></article>').join(""):'<div class="empty">No products listed for this shop yet.</div>';box.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>addCart(b.dataset.add))}
function addCart(id){const p=products.find(x=>String(x.id)===String(id));if(!p)return;let raw=prompt("Quantity in "+(p.unit||"piece")+" (enter a number):","1");if(raw===null)return;const qty=Number(raw);if(!Number.isFinite(qty)||qty<=0){alert("Enter a quantity greater than zero.");return}let x=cart.find(x=>x.id===id);if(x)x.qty+=qty;else cart.push({id:p.id,name:p.name,price:Number(p.price),unit:p.unit||"piece",qty});renderCart();tab("cart")}
function renderCart(){const box=$("cartList");if(!box)return;box.innerHTML=cart.length?cart.map((x,i)=>'<div class="line row"><div><b>'+esc(x.name)+'</b><div class="muted">'+money(x.price)+' / '+esc(x.unit)+'</div></div><div class="row"><button class="btn secondary" data-minus="'+i+'">−</button><b>'+esc(x.qty)+' '+esc(x.unit)+'</b><button class="btn secondary" data-plus="'+i+'">+</button><button class="btn danger" data-remove="'+i+'">Remove</button></div><b>'+money(x.price*x.qty)+'</b></div>').join(""):'<div class="empty">Your cart is empty.</div>';box.querySelectorAll("[data-minus]").forEach(b=>b.onclick=()=>changeQty(+b.dataset.minus,-1));box.querySelectorAll("[data-plus]").forEach(b=>b.onclick=()=>changeQty(+b.dataset.plus,1));box.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{cart.splice(+b.dataset.remove,1);renderCart()});const total=cart.reduce((a,x)=>a+x.price*x.qty,0);if($("total"))$("total").textContent="Total: "+money(total);if($("count"))$("count").textContent=cart.reduce((a,x)=>a+x.qty,0)}
function changeQty(i,d){if(!cart[i])return;cart[i].qty+=d;if(cart[i].qty<=0)cart.splice(i,1);renderCart()}
async function placeOrder(){if(!activeShop||!cart.length){alert("Choose a shop and add products first.");return}const name=$("buyer").value.trim(),phone=$("phone").value.trim(),method=$("method").value,address=$("address").value.trim();if(!name||!phone){alert("Enter your name and phone number.");return}if(method==="Delivery"&&!address){alert("Enter delivery address.");return}
 const payload={p_shop_id:activeShop.id,p_customer_name:name,p_customer_phone:phone,p_delivery_method:method,p_delivery_address:address||null,p_note:$("note").value.trim()||null,p_items:cart.map(x=>({product_id:x.id,quantity:x.qty,unit:x.unit}))};
 const {data,error}=await sb.rpc("dk_place_order",payload);if(error){status("Order was not submitted. Database order validation needs setup: "+error.message);alert("Order not submitted yet. Please try again after marketplace setup is complete.");return}
 alert("Order placed successfully! Order reference: "+String(data||"").slice(0,8));cart=[];renderCart();await loadOrders();tab("orders")
}
function resetProductForm(){$("form")?.reset();if($("pid"))$("pid").value="";if($("customUnit"))$("customUnit").classList.add("hidden");if($("save"))$("save").textContent="Save Product"}
function renderManage(){const box=$("productList");if(!box)return;box.innerHTML=products.length?products.map(p=>'<div class="line row"><div><b>'+esc(p.name)+'</b><div class="muted">'+esc(p.category||"Other")+' • '+money(p.price)+' / '+esc(p.unit)+'</div></div><div><button class="btn secondary" data-edit="'+esc(p.id)+'">Edit</button> <button class="btn danger" data-delete="'+esc(p.id)+'">Delete</button></div></div>').join(""):'<div class="empty">No products in your shop yet.</div>';box.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>{const p=products.find(x=>x.id===b.dataset.edit);if(!p)return;$("pid").value=p.id;$("pname").value=p.name;$("price").value=p.price;$("category").value=p.category||"";$("stock").value=p.stock??"";$("desc").value=p.description||"";$("unit").value=["piece","mg","g","kg","ml","l","dozen","bunch"].includes(p.unit)?p.unit:"custom";if($("unit").value==="custom")$("customUnit").value=p.unit;$("image").value=p.image_url||"";$("save").textContent="Update Product";tab("manage")});box.querySelectorAll("[data-delete]").forEach(b=>b.onclick=async()=>{if(!confirm("Delete this product?"))return;const {error}=await sb.from("dk_products").delete().eq("id",b.dataset.delete);if(error){status("Delete failed: "+error.message);return}await loadProducts()})}
async function loadOrders(){if(!ownedShop||!activeShop||ownedShop.id!==activeShop.id){orders=[];renderOrders();return}const {data,error}=await sb.from("dk_orders").select("*").eq("shop_id",ownedShop.id).order("created_at",{ascending:false});if(error){status("Could not load orders: "+error.message);return}orders=data||[];renderOrders()}
function renderOrders(){const box=$("orderList");if(!box)return;box.innerHTML=orders.length?orders.map(o=>'<article class="order"><div class="row"><b>Order '+esc(String(o.id).slice(0,8))+' • '+esc(o.customer_name)+'</b><span class="status">'+esc(o.status)+'</span></div><p class="muted">'+esc(o.customer_phone)+' • '+esc(o.delivery_method)+' • '+esc(new Date(o.created_at).toLocaleString())+'</p>'+(o.delivery_address?'<p>'+esc(o.delivery_address)+'</p>':"")+'<ul>'+((Array.isArray(o.items)?o.items:[]).map(i=>'<li>'+esc(i.name||"Item")+' × '+esc(i.quantity??i.qty??1)+' '+esc(i.unit||"")+' — '+money(i.line_total??i.price*(i.quantity??i.qty??1))+'</li>').join(""))+'</ul><div class="row"><b>'+money(o.total)+'</b><span>'+(o.status==="Pending"?'<button class="btn" data-status="'+esc(o.id)+'" data-value="Accepted">Accept</button> <button class="btn danger" data-status="'+esc(o.id)+'" data-value="Rejected">Reject</button>':o.status==="Accepted"?'<button class="btn" data-status="'+esc(o.id)+'" data-value="Ready">Mark Ready</button>':o.status==="Ready"?'<button class="btn" data-status="'+esc(o.id)+'" data-value="Completed">Complete</button>':"")+'</span></div></article>').join(""):'<div class="empty">No orders received yet.</div>';box.querySelectorAll("[data-status]").forEach(b=>b.onclick=async()=>{const {error}=await sb.from("dk_orders").update({status:b.dataset.value}).eq("id",b.dataset.status);if(error){status("Order status update failed: "+error.message);return}await loadOrders()})}
init();
})();