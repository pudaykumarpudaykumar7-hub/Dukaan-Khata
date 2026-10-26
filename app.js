const KEY="dukaan_khata_infinity_v2";
// Remove legacy Cashfree/backend configuration without touching shop or transaction records.
try{localStorage.removeItem("dukaan_payment_api");localStorage.removeItem("dukaan_khata_payments_v1")}catch(e){}
let state=loadState(),khataFilter="all",customerStatusFilter="all",longPress=null,suppressClickUntil=0;
Object.defineProperty(window,"state",{configurable:true,get:()=>state,set:v=>{state=v}});

function defaults(){return{shop:{name:"My Dukaan",owner:"Shop Owner",phone:"",upi:"",address:""},customers:[],tx:[],expenses:[],returns:[],reminders:[],deletedCustomerIds:[],deletedRecordIds:{tx:[],expenses:[],returns:[],reminders:[]},settings:{theme:"light",language:"English"}}}
function loadState(){
  try{
    const raw=localStorage.getItem(KEY)||localStorage.getItem("dukaan_khata_infinity_v1");
    const x=raw?JSON.parse(raw):{};
    const savedTheme=localStorage.getItem("dukaan_khata_background_theme");
    const deletedCustomerIds=Array.from(new Set((Array.isArray(x.deletedCustomerIds)?x.deletedCustomerIds:[]).map(String)));
    const deleted=new Set(deletedCustomerIds);
    const deletedRecordIds={...(x.deletedRecordIds||{})};
    for(const k of ["tx","expenses","returns","reminders"])deletedRecordIds[k]=Array.from(new Set((Array.isArray(deletedRecordIds[k])?deletedRecordIds[k]:[]).map(String)));
    const customers=(Array.isArray(x.customers)?x.customers:[]).filter(c=>!deleted.has(String(c?.id)));
    const tx=(Array.isArray(x.tx)?x.tx:[]).filter(t=>!deleted.has(String(t?.customerId??t?.customer_id??"")));
    const reminders=(Array.isArray(x.reminders)?x.reminders:[]).filter(r=>!deleted.has(String(r?.customerId??r?.customer_id??"")));
    return {...defaults(),...x,shop:{...defaults().shop,...(x.shop||{})},settings:{...defaults().settings,...(x.settings||{}),theme:(savedTheme==="dark"||savedTheme==="light")?savedTheme:((x.settings||{}).theme==="dark"?"dark":"light")},customers,tx,
      expenses:(Array.isArray(x.expenses)?x.expenses:[]).filter(v=>!deletedRecordIds.expenses.includes(String(v?.id))),returns:(Array.isArray(x.returns)?x.returns:[]).filter(v=>!deletedRecordIds.returns.includes(String(v?.id))),reminders:reminders.filter(v=>!deletedRecordIds.reminders.includes(String(v?.id))),tx:tx.filter(v=>!deletedRecordIds.tx.includes(String(v?.id))),deletedRecordIds,deletedCustomerIds};
  }catch(e){return defaults()}
}
function markRecordDeleted(collection,id){const all=state.deletedRecordIds&&typeof state.deletedRecordIds==="object"?state.deletedRecordIds:{};const ids=new Set((Array.isArray(all[collection])?all[collection]:[]).map(String));ids.add(String(id));state.deletedRecordIds={...all,[collection]:Array.from(ids)}}
function saveState(){
  let previous=null;
  try{previous=JSON.parse(localStorage.getItem(KEY)||"null")}catch(e){}
  try{
    localStorage.setItem(KEY,JSON.stringify(state));
    // Publish only the customer portal projection; do not sync the full owner ledger.
    if(window.dkPublishCustomerPortalSnapshot)window.dkPublishCustomerPortalSnapshot(state);
    if(previous&&window.dkNotifyCustomerAccount){
      const customers=Array.isArray(state.customers)?state.customers:[];
      const oldCustomers=Array.isArray(previous.customers)?previous.customers:[];
      const allCustomers=new Map([...oldCustomers,...customers].map(c=>[String(c?.id),c]));
      const txs=x=>Array.isArray(x?.tx)?x.tx:[];
      const customerTx=(snapshot,id)=>txs(snapshot).filter(t=>String(t?.customerId??t?.customer_id??"")===String(id));
      const signature=items=>JSON.stringify(items.slice().sort((a,b)=>String(a?.id||"").localeCompare(String(b?.id||""))));
      const money=v=>"₹"+Number(v||0).toLocaleString("en-IN",{maximumFractionDigits:2});
      const shopName=String(state.shop?.name||"Dukaan Khata").slice(0,60);
      for(const [id,c] of allCustomers){
        if(!c)continue;
        const before=customerTx(previous,id),after=customerTx(state,id);
        if(signature(before)===signature(after))continue;
        const customer=customers.find(x=>String(x?.id)===id)||c;
        const phone=customer?.phone||c.phone;
        if(!phone)continue;
        const sales=after.filter(t=>t.type==="sale"),payments=after.filter(t=>t.type==="payment"&&Number(t.amount)>0);
        const total=sales.reduce((n,t)=>n+(Number(t.total)||0),0);
        const paid=payments.reduce((n,t)=>n+(Number(t.amount)||0),0);
        const due=Math.max(0,total-paid);
        const changedTx=after.find(t=>{const old=before.find(b=>String(b?.id)===String(t?.id));return !old||JSON.stringify(old)!==JSON.stringify(t)})||after[0];
        const changedType=changedTx?.type==="payment"?"Payment recorded":changedTx?.type==="sale"?"Bill updated":"Account updated";
        const lines=Array.isArray(changedTx?.lines)?changedTx.lines:[];
        const itemSummary=lines.slice(0,3).map(line=>{
          const name=String(line?.name||line?.itemName||line?.item||"Item").slice(0,36);
          const qty=Number(line?.qty??line?.quantity??1)||1;
          const amount=Number(line?.total??line?.price??0)||0;
          return name+" ×"+qty+" ("+money(amount)+")";
        }).join(", ");
        const latestAmount=changedTx?.type==="payment"?Number(changedTx.amount)||0:Number(changedTx?.total)||0;
        const details=[
          changedType+(latestAmount?" "+money(latestAmount):""),
          itemSummary?"Items: "+itemSummary:"",
          "Bill total: "+money(total),
          "Paid: "+money(paid),
          "Outstanding: "+money(due),
          "Shop: "+shopName
        ].filter(Boolean).join(" • ").slice(0,340);
        const title=String(customer?.name||"Customer").slice(0,70)+" • Account update";
        Promise.resolve().then(()=>window.dkNotifyCustomerAccount(phone,title,details)).catch(e=>console.warn("Customer notification failed",e));
      }
    }
    if(window.dkQueueSync)window.dkQueueSync();
  }catch(e){toast("Could not save data")}
}
function openUVMSLogo(){
  const m=document.getElementById("modal"),b=document.getElementById("modalBody");
  if(!m||!b)return;
  b.innerHTML='<div class="uvms-fullscreen-logo" role="dialog" aria-modal="true" aria-label="UVMS logo"><button class="uvms-fullscreen-close" type="button" aria-label="Close UVMS logo" onclick="closeUVMSLogo()">×</button><div class="uvms-popup-logo uvms-logo" aria-label="UVMS"><span class="uvms-crown">◆</span><strong>UVMS</strong><i></i></div><div class="uvms-popup-title">UVMS</div><div class="uvms-popup-sub">Dukaan Khata</div></div>';
  m.classList.remove("hidden");
  m.classList.add("uvms-logo-modal");
  document.body.classList.add("uvms-logo-open");
}
function closeUVMSLogo(){
  document.getElementById("modal")?.classList.add("hidden");
  document.getElementById("modal")?.classList.remove("uvms-logo-modal");
  document.body.classList.remove("uvms-logo-open");
}
function getPassProfile(){
  let p=JSON.parse(localStorage.getItem("dukaan_khata_pass_profile")||"null");
  if(!p){p={points:0,stamps:0,rewards:0,redeemed:0,referrals:0,visits:0};savePassProfile(p)}
  p.visits=Number(p.visits||0);p.referrals=Number(p.referrals||0);p.stamps=Number(p.stamps||0);p.points=Number(p.points||0);p.rewards=Number(p.rewards||0);p.redeemed=Number(p.redeemed||0);
  return p;
}
function savePassProfile(p){localStorage.setItem("dukaan_khata_pass_profile",JSON.stringify(p))}
function passTier(points){return points>=1000?"DIAMOND":points>=500?"GOLD":points>=200?"SILVER":"STARTER"}
function passQr(text,id){
  const box=document.getElementById(id);if(!box)return;
  box.innerHTML="";
  const value=String(text);
  try{
    if(window.QRCode)new QRCode(box,{text:value,width:150,height:150,colorDark:"#062b38",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.M});
    else box.innerHTML='<div style="padding:18px;color:#b00">QR library unavailable. Refresh and try again.</div>';
  }catch(e){box.innerHTML='<div style="padding:18px;color:#b00">QR could not be created.</div>'}
}
function passAddPoints(n){
  const p=getPassProfile();p.points=Math.max(0,p.points+(Number(n)||0));p.visits+=1;p.stamps=(p.stamps+1)%10;savePassProfile(p);openDigitalPassword();toast("Pass rewards updated ✓");
}
function passRedeem(){
  const p=getPassProfile();
  if(p.points<100){toast("Need 100 points to redeem");return}
  p.points-=100;p.rewards++;p.redeemed++;savePassProfile(p);openDigitalPassword();toast("Reward redeemed ✓");
}
function passShare(){
  const s=state.shop||{},p=getPassProfile();
  const text="Dukaan Club Pass — "+(s.name||"My Dukaan")+"\nTier: "+passTier(p.points)+"\nPoints: "+p.points+"\n";
  if(navigator.share)navigator.share({title:"Dukaan Club Pass",text}).catch(()=>{});
  else window.open("https://wa.me/?text="+encodeURIComponent(text),"_blank");
}
function openClubFeature(type){
  const p=getPassProfile(),tier=passTier(p.points),next=tier==="STARTER"?200:tier==="SILVER"?500:tier==="GOLD"?1000:1000;
  const data={
    wallet:["🎁 Rewards Wallet","Use your points for rewards.","Points: "+p.points,"You can redeem 100 points for one reward."],
    streak:["🔥 Visit Streak","Keep visiting to build your streak.","Stamps: "+p.stamps+"/10","Each recorded visit adds a stamp and points."],
    refer:["🤝 Refer & Earn","Invite customers and grow your club.","Referrals: "+p.referrals,"Tap Share & Invite to send your Club Pass."],
  }[type];
  modal('<div class="dk-club-feature-view"><div class="dk-club-feature-head"><span>'+data[0].split(" ")[0]+'</span><div><h2>'+esc(data[0].slice(data[0].indexOf(" ")+1))+'</h2><small>'+esc(data[1])+'</small></div></div><div class="dk-club-feature-card"><b>'+esc(data[2])+'</b><p>'+esc(data[3])+'</p></div><div class="dk-club-feature-actions">'+
    (type==="wallet"?'<button class="dk-pass-share" onclick="passRedeem()">🎁 Redeem 100 Points</button>':'')+
    (type==="streak"?'<button class="dk-pass-share" onclick="passAddPoints(25)">🔥 Record Visit +25 Points</button>':'')+
    (type==="offers"?'<button class="dk-pass-share" onclick="toast(\'Offer noted ✓\');closeModal()">🏷️ Claim Member Offer</button>':'')+
    (type==="special"?'<button class="dk-pass-share" onclick="passAddPoints(50)">🎂 Add 50 Bonus Points</button>':'')+
    (type==="refer"?'<button class="dk-pass-share" onclick="passShare();toast(\'Invite shared ✓\')">↗ Share & Invite</button>':'')+
    (type==="vip"?'<button class="dk-pass-share" onclick="openDigitalPassword()">⭐ View My Pass</button>':'')+
    '</div></div>');
}
function openDigitalPassword(){
  const s=state.shop||{},p=getPassProfile(),tier=passTier(p.points);
  const totalSales=state.customers.reduce((n,c)=>n+Math.max(0,Number(balance(c.id)||0)),0);
  const top=state.customers.slice().sort((a,b)=>(balance(b.id)||0)-(balance(a.id)||0))[0];
  const qrValue=location.origin+location.pathname+"?dukaanClub="+encodeURIComponent(s.name||"shop")+"#club-pass";
  modal('<div class="dk-pass-shell dk-club-pass">'+
    '<div class="dk-club-top"><div class="dk-club-mark">DK</div><div><span>DUKAAN KHATA</span><h2>Dukaan Club Pass</h2><small>Your shop membership & rewards hub</small></div><b>PREMIUM</b></div>'+
    '<div class="dk-club-card"><div class="dk-club-ribbon">'+tier+' MEMBER</div><div class="dk-club-shop">'+esc(s.name||"My Dukaan")+'</div><div class="dk-club-number">DK • '+String((s.name||"DUKAAN").replace(/\s+/g,"").slice(0,5)).toUpperCase()+' • MEMBER</div><div class="dk-club-stats"><div><small>POINTS</small><strong>'+p.points+'</strong></div><div><small>STAMPS</small><strong>'+p.stamps+'/10</strong></div><div><small>REWARDS</small><strong>'+p.rewards+'</strong></div></div><div class="dk-club-progress"><span style="width:'+Math.min(100,(p.points%500)/5)+'%"></span></div><small class="dk-club-next">'+(tier==="DIAMOND"?"Top tier reached":"Next tier: "+(tier==="STARTER"?"SILVER":tier==="SILVER"?"GOLD":"DIAMOND"))+'</small></div>'+
    '<div class="dk-club-tabs"><button class="active" id="clubMemberTab">🎟️ My Pass</button><button id="clubOwnerTab">🏪 Owner Hub</button></div>'+
    '<div id="clubMemberView"><div class="dk-club-qrrow"><div id="clubPassQr" class="dk-pass-qr"></div><div><b>Scan at the counter</b><p>Scan this QR with any phone camera/QR scanner to open the Dukaan Club page.</p><button class="dk-pass-share" onclick="passShare()">↗ Share Pass</button></div></div><div class="dk-club-features"><button type="button" onclick="openClubFeature(\'wallet\')">🎁<b>Rewards Wallet</b><small>Redeem every 100 points</small></button><button type="button" onclick="openClubFeature(\'streak\')">🔥<b>Visit Streak</b><small>Build 10 stamps for a bonus</small></button><button type="button" onclick="openClubFeature(\'offers\')">🏷️<b>Member Offers</b><small>Exclusive shop deals</small></button><button type="button" onclick="openClubFeature(\'special\')">🎂<b>Special Days</b><small>Birthday & festival offers</small></button><button type="button" onclick="openClubFeature(\'refer\')">🤝<b>Refer & Earn</b><small>Invite customers to the club</small></button><button type="button" onclick="openClubFeature(\'vip\')">⭐<b>VIP Tier</b><small>Starter • Silver • Gold • Diamond</small></button></div><div class="dk-club-actions"><button class="dk-pass-share" onclick="passRedeem()">🎁 Redeem 100 Points</button><button class="dk-pass-mini" onclick="closeModal();openCustomerHub()">👥 Customer Hub</button></div></div>'+
    '<div id="clubOwnerView" hidden><div class="dk-owner-dashboard"><div><small>CONNECTED CUSTOMERS</small><b>'+state.customers.length+'</b></div><div><small>KHATA DUE</small><b>'+money(totalSales)+'</b></div><div><small>TOP CUSTOMER</small><b>'+esc(top?.name||"—")+'</b></div></div><div class="dk-owner-actions"><button onclick="passAddPoints(50)">＋ Add 50 Points</button><button onclick="passAddPoints(100)">🎟️ Give Stamp</button><button onclick="passRedeem()">🎁 Redeem Reward</button><button onclick="closeModal();addCustomer()">＋ Invite Customer</button></div><p class="dk-club-note">Owner Hub is a quick rewards control panel. Existing Khata and payment records remain unchanged.</p></div>'+
    '<div class="dk-club-footer">🛡️ Membership pass • Rewards • Offers • Customer engagement</div><button class="dk-pass-close" onclick="closeModal()">Close</button></div>');
  passQr(qrValue,"clubPassQr");
  const mt=document.getElementById("clubMemberTab"),ot=document.getElementById("clubOwnerTab"),mv=document.getElementById("clubMemberView"),ov=document.getElementById("clubOwnerView");
  mt?.addEventListener("click",()=>{mt.classList.add("active");ot?.classList.remove("active");mv.hidden=false;ov.hidden=true});
  ot?.addEventListener("click",()=>{ot.classList.add("active");mt?.classList.remove("active");mv.hidden=true;ov.hidden=false});
}
function openDigitalPassColor(){
  const saved=localStorage.getItem("dukaan_khata_pass_color")||"#4f46e5";
  const colors=["#111827","#176b4d","#1d4ed8","#4f46e5","#7c3aed","#b45309","#be123c","#0f766e","#334155"];
  modal('<div class="outstanding-color-editor"><span class="eyebrow">DIGITAL APP PASS</span><h2>🎨 Pass Background</h2><p class="muted">Choose the background color for your Digital App Pass.</p><div class="color-preview" id="passColorPreview"><span>🎫 DIGITAL APP PASS</span><strong>Shop & Owner Profile</strong></div><div class="color-swatches">'+colors.map(c=>'<button type="button" class="color-swatch" data-color="'+c+'" style="background:'+c+'" aria-label="Choose '+c+'"></button>').join("")+'</div><label class="color-custom-label">Custom color<input type="color" id="passColorInput" value="'+saved+'"></label><div class="logo-editor-actions"><button class="btn" id="resetPassColor" type="button">↩ Default</button><button class="primary" id="savePassColor" type="button">✓ Save Color</button></div></div>');
  let selected=saved,preview=document.getElementById("passColorPreview");
  const update=()=>{if(preview)preview.style.background=selected};
  document.querySelectorAll(".color-swatch").forEach(b=>b.addEventListener("click",()=>{selected=b.dataset.color;document.getElementById("passColorInput").value=selected;update()}));
  document.getElementById("passColorInput")?.addEventListener("input",e=>{selected=e.target.value;update()});
  document.getElementById("resetPassColor")?.addEventListener("click",()=>{selected="linear-gradient(135deg,#111827,#4f46e5,#06b6d4)";update()});
  document.getElementById("savePassColor")?.addEventListener("click",()=>{localStorage.setItem("dukaan_khata_pass_color",selected);closeModal();toast("Digital App Pass color updated");});
  update();
}
function openOutstandingColor(){
  const saved=localStorage.getItem("dukaan_khata_outstanding_color")||"";
  const colors=["#0b1220","#176b4d","#1d4ed8","#7c3aed","#b45309","#be123c","#0f766e","#334155"];
  modal('<div class="outstanding-color-editor"><span class="eyebrow">HOMEPAGE STYLE</span><h2>🎨 Outstanding Color</h2><p class="muted">Choose the background color for “Outstanding to receive”.</p>'+
    '<div class="color-preview" id="outstandingColorPreview"><span>Outstanding to receive</span><strong>₹12,500</strong></div>'+
    '<div class="color-swatches">'+colors.map(c=>'<button type="button" class="color-swatch" data-color="'+c+'" style="background:'+c+'" aria-label="Choose '+c+'"></button>').join("")+'</div>'+
    '<label class="color-custom-label">Custom color<input type="color" id="outstandingColorInput" value="'+(saved||"#0b1220")+'"></label>'+
    '<div class="logo-editor-actions"><button class="btn" id="resetOutstandingColor" type="button">↩ Default</button><button class="primary" id="saveOutstandingColor" type="button">✓ Save Color</button></div>'+
    '</div>');
  let selected=saved||"";
  const preview=document.getElementById("outstandingColorPreview");
  const update=()=>{if(preview)preview.style.background=selected||"linear-gradient(135deg,#0b1220,#153a2d)"};
  document.querySelectorAll(".color-swatch").forEach(b=>b.addEventListener("click",()=>{selected=b.dataset.color;const i=document.getElementById("outstandingColorInput");if(i)i.value=selected;update()}));
  document.getElementById("outstandingColorInput")?.addEventListener("input",e=>{selected=e.target.value;update()});
  document.getElementById("resetOutstandingColor")?.addEventListener("click",()=>{selected="";update();const i=document.getElementById("outstandingColorInput");if(i)i.value="#0b1220"});
  document.getElementById("saveOutstandingColor")?.addEventListener("click",()=>{if(selected)localStorage.setItem("dukaan_khata_outstanding_color",selected);else localStorage.removeItem("dukaan_khata_outstanding_color");applyOutstandingColor();closeModal();toast("Outstanding color updated")});
  update();
}
function applyOutstandingColor(){
  const card=document.querySelector(".balance-hero");
  if(!card)return;
  const color=localStorage.getItem("dukaan_khata_outstanding_color")||"";
  card.style.background=color||"";
}
function openLogoEditor(){
  const savedText=localStorage.getItem("dukaan_khata_logo_text")||"₹";
  const savedImage=localStorage.getItem("dukaan_khata_logo_image")||"";
  modal('<div class="logo-editor">'+
    '<div class="logo-editor-hero"><div class="logo-editor-preview" id="logoPreview">'+
    (savedImage?'<img src="'+savedImage+'" alt="Logo preview">':'<span>₹</span>')+
    '</div><div><span class="eyebrow">HOME BRAND</span><h2>✨ Custom Logo</h2><p class="muted">Upload your own image or use a unique Rupee logo.</p></div></div>'+
    '<label class="logo-upload"><input type="file" id="logoImageInput" accept="image/png,image/jpeg,image/webp,image/svg+xml"><span>📷 Choose image from device</span><small>PNG • JPG • WEBP • SVG</small></label>'+
    '<div class="logo-editor-or">OR</div>'+
    '<input class="input" id="logoText" maxlength="4" value="'+esc(savedText)+'" placeholder="₹K">'+
    '<div class="logo-presets">'+
    ['₹','₹K','D₹','DK','🛍️'].map(x=>'<button class="btn logo-choice" type="button" data-logo="'+x+'">'+x+'</button>').join("")+
    '</div>'+
    '<div class="logo-editor-actions"><button class="btn" id="removeLogoImage" type="button">↩ Use text logo</button><button class="primary" id="saveLogo" type="button">✓ Save Logo</button></div>'+
    '</div>');
  let selectedImage=savedImage;
  const preview=document.getElementById("logoPreview");
  document.querySelectorAll(".logo-choice").forEach(b=>b.addEventListener("click",()=>{
    document.getElementById("logoText").value=b.dataset.logo;
    selectedImage="";
    if(preview)preview.innerHTML='<span>'+esc(b.dataset.logo)+'</span>';
  }));
  document.getElementById("removeLogoImage")?.addEventListener("click",()=>{
    selectedImage="";
    if(preview)preview.innerHTML='<span>'+esc((document.getElementById("logoText")?.value||"₹"))+'</span>';
    const input=document.getElementById("logoImageInput");if(input)input.value="";
  });
  document.getElementById("logoImageInput")?.addEventListener("change",e=>{
    const file=e.target.files?.[0];if(!file)return;
    if(file.size>2*1024*1024){toast("Choose an image under 2 MB");e.target.value="";return}
    const reader=new FileReader();
    reader.onload=()=>{
      selectedImage=String(reader.result||"");
      if(preview)preview.innerHTML='<img class="logo-crop-preview" src="'+selectedImage+'" alt="Logo preview">';
    };
    reader.readAsDataURL(file);
  });
  document.getElementById("saveLogo")?.addEventListener("click",()=>{
    const v=(document.getElementById("logoText")?.value||"₹").trim().slice(0,4)||"₹";
    if(selectedImage)localStorage.setItem("dukaan_khata_logo_image",selectedImage);
    else localStorage.removeItem("dukaan_khata_logo_image");
    localStorage.setItem("dukaan_khata_logo_text",v);
    applyHomeLogo();
    closeModal();toast("Home logo updated");
  });
}
function applyHomeLogo(){
  const el=document.getElementById("brandLogo");
  const img=document.getElementById("brandLogoImage");
  const mark=el?.querySelector(".brand-logo-mark");
  const image=localStorage.getItem("dukaan_khata_logo_image")||"";
  const text=localStorage.getItem("dukaan_khata_logo_text")||"₹";
  if(!el)return;
  if(image){
    if(img){img.src=image;img.hidden=false;img.classList.add("brand-logo-image")}
    if(mark)mark.hidden=true;
  }else{
    if(img){img.hidden=true;img.removeAttribute("src")}
    if(mark){mark.hidden=false;mark.textContent=text}
  }
}

function uid(){return typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random().toString(16).slice(2)}
function money(n){return"₹"+Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2})}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function balance(id){return state.tx.filter(t=>String(t.customerId)===String(id)).reduce((s,t)=>s+(t.type==="sale"?Number(t.total)||0:-(Number(t.amount)||0)),0)}
function receivedTotal(id){return state.tx.filter(t=>String(t.customerId)===String(id)&&t.type==="payment"&&Number(t.amount)>0).reduce((s,t)=>s+(Number(t.amount)||0),0)}
function sales(){return state.tx.filter(t=>t.type==="sale")}
function payments(){return state.tx.filter(t=>t.type==="payment")}
function toast(msg){const e=document.getElementById("toast");if(!e)return;e.textContent=msg;e.classList.add("show");clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove("show"),2200)}
function modal(html){const m=document.getElementById("modal"),b=document.getElementById("modalBody");if(!m||!b)return;b.innerHTML=html;m.classList.remove("hidden");try{window.applyLanguage?.()}catch(e){}if(!m.dataset.backdropClose){m.dataset.backdropClose="1";m.addEventListener("click",e=>{if(e.target===m)closeModal()})}}
function closeModal(){stopQRPaymentWatcher();document.getElementById("modal")?.classList.remove("dk-subscription-fullscreen");document.getElementById("modal")?.classList.add("hidden");document.getElementById("modal")?.classList.remove("uvms-logo-modal");document.body.classList.remove("uvms-logo-open")}
function showPage(id){document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));const page=document.getElementById(id);if(!page)return;page.classList.add("active");document.querySelectorAll(".bottom-nav button,.top-menu button").forEach(b=>b.classList.toggle("active",b.dataset.page===id));window.scrollTo({top:0,behavior:"smooth"});try{render()}catch(e){console.error("Dukaan Khata render error:",e);toast("Page loaded. Please try again.")}}

/* CSV exports for business records. Text cells are formula-neutralized for spreadsheet safety. */
function dkCsvCell(value){
 if(typeof value==="number"&&Number.isFinite(value))return String(value);
 let s=String(value??"");
 if(/^[\s]*[=+@\-\t\r]/.test(s))s="'"+s;
 return '"'+s.replace(/"/g,'""')+'"';
}
function dkDownloadCsv(filename,rows){
 if(!Array.isArray(rows)||!rows.length)return toast("No records to export");
 const csv="\\uFEFF"+rows.map(row=>row.map(dkCsvCell).join(",")).join("\\r\\n");
 const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
 const a=document.createElement("a");a.href=url;a.download=filename;a.style.display="none";document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1500);toast("CSV export downloaded");
}
function exportTransactionsCsv(){
 const rows=[["Transaction ID","Date","Type","Customer","Phone","Amount / Sale Total (INR)","Payment Mode","Items"]];
 for(const t of state.tx){
  const c=state.customers.find(x=>String(x.id)===String(t.customerId));
  const items=Array.isArray(t.lines)?t.lines.map(l=>(l.name||"Item")+" x"+(Number(l.qty)||1)).join("; "):"";
  rows.push([t.id||"",t.date?new Date(t.date).toISOString():"",t.type||"",c?.name||"Walk-in / unassigned",c?.phone||"",Number(t.type==="sale"?t.total:t.amount)||0,t.mode||"",items]);
 }
 dkDownloadCsv("dukaan-khata-transactions.csv",rows);
}
function exportCustomerBalancesCsv(){
 const rows=[["Customer ID","Customer Name","Phone","Current Balance (INR)","Sales Count","Payments Count","Last Activity"]];
 for(const c of state.customers){
  const tx=state.tx.filter(t=>String(t.customerId)===String(c.id));
  const dates=tx.map(t=>t.date).filter(Boolean).sort((a,b)=>new Date(b)-new Date(a));
  rows.push([c.id||"",c.name||"",c.phone||"",Number(balance(c.id))||0,tx.filter(t=>t.type==="sale").length,tx.filter(t=>t.type==="payment").length,dates[0]?new Date(dates[0]).toISOString():""]);
 }
 dkDownloadCsv("dukaan-khata-customer-balances.csv",rows);
}

function openSearch(){modal('<h2>Search</h2><input id="globalSearch" placeholder="Customer or phone..." autocomplete="off"><div id="globalResults"></div>');document.getElementById("globalSearch")?.addEventListener("input",globalResults);globalResults();document.getElementById("globalSearch")?.focus()}
function globalResults(){const q=(document.getElementById("globalSearch")?.value||"").toLowerCase();const box=document.getElementById("globalResults");if(!box)return;const a=state.customers.filter(c=>(c.name+" "+c.phone).toLowerCase().includes(q)).slice(0,10);box.innerHTML=a.map(c=>'<div class="customer" onclick="closeModal();customerView(\''+esc(c.id)+'\')"><div><b>'+esc(c.name)+'</b><small>'+esc(c.phone||"")+'</small></div><b>'+money(balance(c.id))+'</b></div>').join("")||'<p class="muted">No customers found.</p>'}


/* Monthly subscription plans. Paid access is granted only after a server-verified gateway payment. */
function dkSubscriptionUsage(){
  const now=new Date(),month=now.getMonth(),year=now.getFullYear();
  const bills=(Array.isArray(state.tx)?state.tx:[]).filter(t=>t.type==="sale"&&(()=>{const d=new Date(t.date||0);return !Number.isNaN(d.getTime())&&d.getMonth()===month&&d.getFullYear()===year})()).length;
  const customers=(Array.isArray(state.customers)?state.customers:[]).length;
  const plan=String(state.settings?.subscriptionPlan||"free");
  const limits=plan==="pro"?{customers:100,bills:1500,price:49,label:"Pro"}:plan==="premium"?{customers:200,bills:2500,price:99,label:"Premium"}:plan==="ultra-premium"?{customers:Infinity,bills:Infinity,price:149,label:"VIP"}:{customers:50,bills:500,price:0,label:"Free"};
  return {customerCount:customers,billCount:bills,plan,customerLimit:limits.customers,billLimit:limits.bills,price:limits.price,label:limits.label};
}
function dkCheckSubscription(kind){
  const u=dkSubscriptionUsage(),limit=kind==="customer"?u.customerLimit:u.billLimit,used=kind==="customer"?u.customerCount:u.billCount;
  if(used<limit)return true;
  toast(kind==="customer"?"Free customer limit reached. Open Subscriptions to view plans.":"Monthly bill limit reached. Open Subscriptions to view plans.");
  openSubscriptionPlans();return false;
}
function dkStartSubscription(planId){
  const plan=String(planId||"");
  if(plan==="free"){
    state.settings=state.settings||{};
    state.settings.subscriptionPlan="free";
    saveState();
    closeModal();
    toast("Free plan selected.");
    return;
  }
  const names={"pro":"Pro","premium":"Premium","ultra-premium":"VIP"};
  const prices={"pro":49,"premium":99,"ultra-premium":149};
  if(!names[plan]){toast("Please select a valid plan.");return;}
  modal('<div style="padding:8px 2px;color:#202720"><h2 style="margin:0 0 10px"> '+names[plan]+' plan · ₹'+prices[plan]+'/month</h2><p style="line-height:1.6">Secure payment setup is not complete yet. This action will not charge you or activate a paid plan. Your current plan and records remain unchanged.</p><button type="button" class="btn primary" id="dkPaidPlanStatusClose">OK</button></div>');
  document.getElementById("dkPaidPlanStatusClose")?.addEventListener("click",closeModal);
}
function openSubscriptionPlans(){
  const u=dkSubscriptionUsage();
  const fmt=n=>n===Infinity?"Unlimited":String(n);
  const plans=[
    {id:"free",name:"FREE",price:0,customers:"50",bills:"500",tag:"START HERE",tone:"free",desc:"Perfect to get started",features:[["✓","Modern app layout & design","Basic theme"],["✓","All basic features","Customers, bills & payments"],["✓","Simple and clean interface",""],["✓","Basic reports & history",""],["×","Advanced analytics & insights",""],["×","Custom themes & premium looks",""],["×","Priority support",""],["×","Multi-device sync",""]]},
    {id:"pro",name:"PRO",price:49,customers:"100",bills:"1,500",tag:"MOST POPULAR",tone:"pro",desc:"More power for your business",features:[["✓","Stylish app layout & design","Professional look"],["✓","All basic features","Customers, bills & payments"],["✓","Advanced reports & analytics","Daily, weekly & monthly"],["✓","Custom themes & colour options","Multiple styles"],["✓","Faster support responses",""],["×","Premium silver appearance",""],["×","VIP black & gold appearance",""]]},
    {id:"premium",name:"PREMIUM",price:99,customers:"200",bills:"2,500",tag:"BEST VALUE",tone:"premium",desc:"Complete control for your shop",features:[["✓","Premium app layout & design","Black & platinum-silver appearance"],["✓","All Pro features","Plus advanced tools"],["✓","Advanced analytics & insights","Business growth tools"],["✓","Multi-device layout support","Where supported"],["✓","Data backup & restore tools","Availability depends on configured backup"],["✓","Premium themes & refined interface","Silver / graphite style"],["✓","Priority support",""]]},
    {id:"ultra-premium",name:"♛ VIP",price:149,customers:"Unlimited",bills:"Unlimited",tag:"♛ EXCLUSIVE",tone:"vip",desc:"The ultimate shop experience",features:[["✓","Full app appearance & layout","Exclusive black & gold design"],["✓","All Premium features","Everything in lower plans"],["✓","Advanced analytics & AI insights","Only where implemented"],["✓","VIP theme & gold interface","Exclusive premium styling"],["✓","Priority VIP support","Support availability applies"],["✓","Data backup & restore tools","Where configured"],["✓","Early access to new features","When offered"],["✓","Ad-free experience","Only if ads are enabled in the app"]]}
  ];
  const dark=t=>["pro","vip"].includes(t);
  const cards=plans.map(p=>{
    const current=p.id===u.plan;
    const bg=p.tone==="free"?"linear-gradient(155deg,#171c22,#080b0e)":p.tone==="pro"?"linear-gradient(155deg,#002d35,#001318)":p.tone==="premium"?"linear-gradient(155deg,#353b44,#11151b)": "linear-gradient(145deg,#17120a,#030303)";
    const accent=p.tone==="free"?"#aeb8c5":p.tone==="pro"?"#00e4ed":p.tone==="premium"?"#dce3ed":"#f3cf72";
    const ink=dark(p.tone)?"#f5f7fb":"#f5f7fb";
    const border=p.tone==="free"?"#66717f":accent;
    return '<article style="min-width:0;position:relative;overflow:hidden;border:1px solid '+border+';border-radius:18px;background:'+bg+';color:'+ink+';box-shadow:'+(p.tone==="vip"?"0 0 22px #d4a83b35":"0 12px 28px #0007")+';display:flex;flex-direction:column"><div style="padding:18px 16px 15px;background:linear-gradient(135deg,'+accent+'22,'+accent+'66);border-bottom:1px solid '+accent+'66;min-height:152px"><div style="display:flex;justify-content:space-between;gap:6px;align-items:center"><span style="font-size:9px;letter-spacing:1.3px;font-weight:900;color:'+accent+'">'+p.tag+'</span>'+(current?'<span style="font-size:9px;border:1px solid '+accent+';padding:4px 6px;border-radius:20px">CURRENT</span>':'')+'</div><div style="margin-top:13px;white-space:nowrap"><strong style="font-size:clamp(30px,4vw,42px);letter-spacing:-1.5px;color:'+accent+'">₹'+p.price+'</strong><span style="font-size:11px;color:#d6dce5"> /month</span></div><h3 style="margin:7px 0 4px;font-size:19px;letter-spacing:1.6px;color:#fff">'+p.name+'</h3><p style="font-size:11px;line-height:1.4;margin:0;color:#d9e0e8">'+p.desc+'</p></div><div style="padding:14px 15px 16px;display:flex;flex-direction:column;flex:1"><div style="display:grid;gap:7px;margin-bottom:13px;font-size:11px"><div style="display:flex;justify-content:space-between;gap:8px"><span style="color:#d7dee8">Customers</span><b>'+p.customers+'</b></div><div style="display:flex;justify-content:space-between;gap:8px"><span style="color:#d7dee8">Bills / month</span><b>'+p.bills+'</b></div></div><div style="height:1px;background:'+accent+'55;margin-bottom:13px"></div><div style="display:grid;gap:12px;flex:1">'+p.features.map(f=>'<div style="display:grid;grid-template-columns:17px minmax(0,1fr);gap:8px;align-items:start"><span style="font-size:17px;line-height:17px;font-weight:900;color:'+(f[0]==="×"?"#ff5c68":accent)+'">'+f[0]+'</span><div style="font-size:11px;line-height:1.4;color:#f2f4f7">'+f[1]+(f[2]?'<div style="font-size:10px;color:#aebdcb;margin-top:2px">('+f[2]+')</div>':'')+'</div></div>').join("")+'</div><button type="button" data-subscribe-plan="'+p.id+'" style="margin-top:18px;width:100%;padding:12px 8px;border-radius:10px;border:1px solid '+accent+';background:'+(current?"#303741":accent)+';color:'+(current?"#fff":"#080b0d")+';font-size:12px;font-weight:900;cursor:pointer">'+(current?"Your Current Plan":p.price===0?"Choose Free":"Subscribe Now →")+'</button><div style="margin-top:12px;padding-top:11px;border-top:1px solid #ffffff1b;font-size:10px;color:#c1cad5;line-height:1.5"><b style="color:'+accent+'">'+(p.tone==="vip"?"Exclusive Black & Gold":p.tone==="premium"?"Black & Platinum Silver":p.tone==="pro"?"Stylish Pro look":"Clean basic look")+'</b><br>Designed for your shop</div></div></article>';
  }).join("");
  modal('<div style="margin:-2px;color:#f5f7fb;background:#080a0d;border-radius:18px;padding:14px;max-height:78vh;overflow:auto"><div style="display:flex;justify-content:center;align-items:center;gap:10px;margin:0 0 17px;color:#e9edf5;font-size:12px;font-weight:800"><span>Monthly</span><span style="width:43px;height:24px;border:1px solid #8d98a8;border-radius:20px;display:inline-flex;align-items:center;padding:3px"><span style="width:16px;height:16px;border-radius:50%;background:#e4c779"></span></span><span style="color:#8d98a8">Annual</span><span style="font-size:9px;color:#aeb7c4;font-weight:500">(monthly billing shown)</span><button type="button" id="dkCloseSubscriptions" aria-label="Close subscriptions" style="margin-left:auto;border:1px solid #ffffff44;background:#161a20;color:#fff;border-radius:50%;width:30px;height:30px;font-size:18px;cursor:pointer">×</button></div><div style="text-align:center;margin-bottom:18px"><div style="font-size:10px;letter-spacing:2px;color:#e3c77b;font-weight:900">DUKAAN KHATA MEMBERSHIP</div><h2 style="font-size:25px;margin:6px 0;color:#fff">Choose Your Experience</h2><p style="font-size:12px;color:#aeb8c5;margin:0">Your existing customer and bill records stay accessible when you reach a plan limit.</p></div><div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;align-items:stretch">'+cards+'</div><div style="margin-top:14px;padding:13px;border:1px solid #333b45;border-radius:13px;background:#11151a"><div style="font-size:11px;font-weight:900;color:#e7c979;margin-bottom:7px">YOUR CURRENT USAGE · '+u.label.toUpperCase()+'</div><div style="display:flex;flex-wrap:wrap;gap:8px 18px;font-size:11px;color:#e2e7ee"><span>Customers: <b>'+u.customerCount+' / '+fmt(u.customerLimit)+'</b></span><span>Bills this month: <b>'+u.billCount+' / '+fmt(u.billLimit)+'</b></span></div></div><p style="font-size:10px;line-height:1.5;color:#929eac;margin:11px 2px 0">Paid checkout is not active until Razorpay plan IDs and payment verification are configured. Feature availability depends on implementation and configuration; this card does not activate features that are not yet built.</p></div>');
  const root=document.getElementById("modalBody");
  const panel=root?.firstElementChild;
  const modalEl=document.getElementById("modal");
  modalEl?.classList.add("dk-subscription-fullscreen");
  if(panel){panel.style.maxWidth="none";panel.style.width="100%";panel.style.height="100%";panel.style.maxHeight="100dvh";panel.style.margin="0";panel.style.borderRadius="0";panel.style.padding="0";panel.style.overflow="hidden";panel.style.boxShadow="none";}
  if(root){root.style.height="100%";root.style.maxHeight="100dvh";root.style.overflow="auto";root.style.overscrollBehavior="contain";root.style.paddingBottom="env(safe-area-inset-bottom)";}
  const grid=root?.querySelector("div[style*='grid-template-columns:repeat(4']");
  if(grid){grid.style.gridTemplateColumns="minmax(0,1fr)";grid.style.gap="14px";}
  document.getElementById("dkCloseSubscriptions")?.addEventListener("click",closeModal);
  document.querySelectorAll("[data-subscribe-plan]").forEach(button=>button.addEventListener("click",()=>dkStartSubscription(button.getAttribute("data-subscribe-plan"))));
}
function addCustomer(mode=""){if(!dkCheckSubscription("customer"))return;modal('<h2>New Customer</h2><form id="newCustomerForm" autocomplete="on"><input id="cname" name="name" placeholder="Customer name" autocomplete="name" enterkeyhint="next" required><input id="cphone" name="tel" type="tel" inputmode="tel" placeholder="Mobile / WhatsApp number" autocomplete="tel" enterkeyhint="next"><input id="caddress" name="address" type="text" placeholder="Address (optional)" autocomplete="street-address" enterkeyhint="done"><label style="display:flex;align-items:flex-start;gap:10px;margin:12px 0;padding:12px;border:1px solid var(--line,#ddd);border-radius:12px"><input id="cWeeklyReminder" type="checkbox" style="margin-top:3px"><span><b>Automatic reminder every 7 days</b><small style="display:block">Optional. Enable only if this customer agrees. Message delivery needs a configured messaging service.</small></span></label><button class="btn primary" id="saveCustomerBtn" type="submit">Save Customer</button></form>');const form=document.getElementById("newCustomerForm");form?.addEventListener("submit",e=>{e.preventDefault();saveCustomer(mode)});const name=document.getElementById("cname"),phone=document.getElementById("cphone"),address=document.getElementById("caddress");name?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();phone?.focus()}});phone?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();address?.focus()}});address?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();saveCustomer(mode)}});setTimeout(()=>name?.focus(),80)}
function saveCustomer(mode=""){const name=(document.getElementById("cname")?.value||"").trim();if(!name)return toast("Enter customer name");const weeklyReminder=!!document.getElementById("cWeeklyReminder")?.checked;const c={id:uid(),name,phone:(document.getElementById("cphone")?.value||"").trim(),address:(document.getElementById("caddress")?.value||"").trim(),created:new Date().toISOString(),weeklyReminderEnabled:weeklyReminder,nextWeeklyReminderAt:weeklyReminder?new Date(Date.now()+7*24*60*60*1000).toISOString():null};state.customers.unshift(c);saveState();closeModal();render();toast("Customer added");if(mode==="many")openManyItems(c.id);if(mode==="many-picker")openManyItems()}
function editCustomer(id){const c=state.customers.find(x=>x.id===id);if(!c)return;modal('<h2>Edit Customer</h2><form id="editCustomerForm" autocomplete="on"><input id="editCName" value="'+esc(c.name)+'" placeholder="Customer name" autocomplete="name" enterkeyhint="next" required><input id="editCPhone" value="'+esc(c.phone)+'" type="tel" inputmode="tel" placeholder="Mobile number" autocomplete="tel" enterkeyhint="next"><input id="editCAddress" type="text" value="'+esc(c.address)+'" placeholder="Address" autocomplete="street-address" enterkeyhint="done"><label style="display:flex;align-items:flex-start;gap:10px;margin:12px 0;padding:12px;border:1px solid var(--line,#ddd);border-radius:12px"><input id="editCWeeklyReminder" type="checkbox" style="margin-top:3px" '+(c.weeklyReminderEnabled?'checked':'')+'><span><b>Automatic reminder every 7 days</b><small style="display:block">Optional. Enable only if this customer agrees. Message delivery needs a configured messaging service.</small></span></label><button class="btn primary" id="editCustomerBtn" type="submit">Save Customer</button></form>');const form=document.getElementById("editCustomerForm"),name=document.getElementById("editCName"),phone=document.getElementById("editCPhone"),address=document.getElementById("editCAddress");form?.addEventListener("submit",e=>{e.preventDefault();saveCustomerEdit(id)});name?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();phone?.focus()}});phone?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();address?.focus()}});address?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();saveCustomerEdit(id)}});setTimeout(()=>name?.focus(),80)}
function saveCustomerEdit(id){const c=state.customers.find(x=>x.id===id);if(!c)return;const name=(document.getElementById("editCName")?.value||"").trim();if(!name)return toast("Enter customer name");c.name=name;c.phone=(document.getElementById("editCPhone")?.value||"").trim();c.address=(document.getElementById("editCAddress")?.value||"").trim();const weeklyReminder=!!document.getElementById("editCWeeklyReminder")?.checked;if(weeklyReminder&&!c.weeklyReminderEnabled)c.nextWeeklyReminderAt=new Date(Date.now()+7*24*60*60*1000).toISOString();if(!weeklyReminder)c.nextWeeklyReminderAt=null;c.weeklyReminderEnabled=weeklyReminder;saveState();closeModal();render();toast("Customer updated")}
function addCustomerNumber(id){editCustomer(id)}

function openManyItems(customerId){
  if(!state.customers.length)return addCustomer("many-picker");
  if(!customerId){
    const cards=state.customers.map(c=>'<button type="button" class="customer sell-customer-choice" data-customer-id="'+esc(c.id)+'"><span><b>'+esc(c.name)+'</b><small>'+esc(c.phone||"No phone added")+'</small></span><strong>›</strong></button>').join("");
    modal('<h2>＋ New Sell</h2><p class="muted">Select a customer. All your customers are shown below.</p><div id="sellCustomerList">'+cards+'</div><button class="btn primary" id="addSellCustomerBtn">＋ Add New Customer</button>');
    document.querySelectorAll(".sell-customer-choice").forEach(btn=>btn.addEventListener("click",()=>showManyItemsForm(btn.dataset.customerId)));
    document.getElementById("addSellCustomerBtn")?.addEventListener("click",()=>addCustomer("many-picker"));
    return
  }
  showManyItemsForm(customerId)
}
function openSale(customerId){openManyItems(customerId)}
function showManyItemsForm(customerId){
  const c=state.customers.find(x=>x.id===customerId);if(!c)return;
  modal('<div class="khata-entry-head"><div class="khata-entry-kicker">DUKAAN KHATA • NEW BILL</div><h2>🧾 Add items</h2><p>Customer: <b>'+esc(c.name)+'</b></p><button class="btn small khata-change-customer" id="changeSellCustomerBtn">↔ Change customer</button></div><div class="khata-entry-mode"><div><b>Enter items your way</b><small>Type each item or use the microphone</small></div><button class="khata-voice-all" id="voiceAllItemsBtn" type="button">🎙️ Speak items</button></div><div class="khata-voice-hint"><label for="manySpeechLanguage">Speech language</label><select id="manySpeechLanguage" class="khata-speech-language"><option value="auto" selected>Auto (use phone language)</option><option value="te-IN">Telugu</option><option value="en-IN">English</option><option value="hi-IN">Hindi</option><option value="as-IN">Assamese</option><option value="bn-IN">Bengali</option><option value="brx-IN">Bodo</option><option value="doi-IN">Dogri</option><option value="gu-IN">Gujarati</option><option value="kn-IN">Kannada</option><option value="ks-IN">Kashmiri</option><option value="kok-IN">Konkani</option><option value="mai-IN">Maithili</option><option value="ml-IN">Malayalam</option><option value="mni-IN">Manipuri</option><option value="mr-IN">Marathi</option><option value="ne-IN">Nepali</option><option value="or-IN">Odia</option><option value="pa-IN">Punjabi</option><option value="sa-IN">Sanskrit</option><option value="sat-IN">Santali</option><option value="sd-IN">Sindhi</option><option value="ta-IN">Tamil</option><option value="ur-IN">Urdu</option></select><small>Auto uses your phone language. Speech support varies by browser; verify item names and amounts.</small></div><div id="manyRows" class="khata-items-list"></div><button class="khata-add-row" id="addManyRowBtn" type="button">＋ Add another item manually</button><div class="khata-total-card"><span>Grand total</span><strong id="manyTotal">₹0.00</strong></div><button class="btn primary khata-save-bill" id="saveManyBtn">✓ Save bill to Khata</button><p class="khata-verify-note">Please check the item names and prices before saving.</p>');
  document.getElementById("changeSellCustomerBtn")?.addEventListener("click",()=>openManyItems());
  document.getElementById("addManyRowBtn")?.addEventListener("click",addManyRow);
  document.getElementById("voiceAllItemsBtn")?.addEventListener("click",speakAllManyItems);
  document.getElementById("saveManyBtn")?.addEventListener("click",()=>saveManyItems(customerId));
  addManyRow()
}
function addManyRow(name="",price=""){
  name=typeof name==="string"?name:"";price=typeof price==="string"||typeof price==="number"?price:"";
 const box=document.getElementById("manyRows");if(!box)return;
 const row=document.createElement("div");row.className="khata-item-row many-row";
 row.innerHTML='<div class="khata-item-number"></div><div class="khata-item-fields"><label>Item name<input class="many-name" placeholder="Item name" autocomplete="off"></label><label>Amount (₹)<input class="many-price" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00"></label></div><button class="khata-row-mic many-mic" type="button" title="Speak this item">🎙️</button><button class="khata-row-remove many-remove" type="button" aria-label="Remove item">×</button>';
 box.appendChild(row);row.querySelector(".many-name").value=name;row.querySelector(".many-price").value=price;
 row.querySelector(".many-price")?.addEventListener("input",recalcManyItems);
 row.querySelector(".many-mic")?.addEventListener("click",()=>speakManyItem(row));
 row.querySelector(".many-remove")?.addEventListener("click",()=>{row.remove();renumberManyRows();recalcManyItems()});
 renumberManyRows();recalcManyItems()
}
function renumberManyRows(){document.querySelectorAll("#manyRows .many-row").forEach((r,i)=>{const n=r.querySelector(".khata-item-number");if(n)n.textContent=String(i+1).padStart(2,"0")})}
function speechLang(){const picker=document.getElementById("manySpeechLanguage");if(picker&&picker.value&&picker.value!=="auto")return picker.value;const device=(navigator.language||"").toLowerCase();if(device.startsWith("te"))return "te-IN";if(device.startsWith("en"))return "en-IN";if(device.startsWith("hi"))return "hi-IN";return "te-IN"}
function spokenNumber(s){
  const tel={"సున్నా":0,"ఒకటి":1,"ఒక":1,"ఒక్కటి":1,"రెండు":2,"మూడు":3,"నాలుగు":4,"ఐదు":5,"ఆరు":6,"ఏడు":7,"ఎనిమిది":8,"తొమ్మిది":9,"పది":10,"పదకొండు":11,"పన్నెండు":12,"పదమూడు":13,"పద్నాలుగు":14,"పదిహేను":15,"పదహారు":16,"పదిహేడు":17,"పద్దెనిమిది":18,"పంతొమ్మిది":19,"ఇరవై":20,"ముప్పై":30,"నలభై":40,"యాభై":50,"అరవై":60,"డెబ్బై":70,"ఎనభై":80,"తొంభై":90,"వంద":100,"నూరు":100};
  const en={"zero":0,"one":1,"a":1,"single":1,"two":2,"three":3,"four":4,"five":5,"six":6,"seven":7,"eight":8,"nine":9,"ten":10,"eleven":11,"twelve":12,"thirteen":13,"fourteen":14,"fifteen":15,"sixteen":16,"seventeen":17,"eighteen":18,"nineteen":19,"twenty":20,"thirty":30,"forty":40,"fifty":50,"sixty":60,"seventy":70,"eighty":80,"ninety":90,"hundred":100};
  const clean=String(s||"").trim().toLowerCase().replace(/[₹,]/g," ").replace(/(?:rupees?|rs\.?|రూపాయలు|రూపాయి|రూపాయ)/gi," ").trim();
  if(/^\d+(?:\.\d{1,2})?$/.test(clean))return Number(clean);
  const words=clean.split(/\s+/);let total=0,found=false;
  for(const w of words){if(/^\d+(?:\.\d{1,2})?$/.test(w)){total+=Number(w);found=true;continue}if(tel[w]!==undefined){total+=tel[w];found=true;continue}if(en[w]!==undefined){total+=en[w];found=true;continue}return null}
  return found?total:null;
}
function parseSpokenItems(transcript){
  const normalized=String(transcript||"").replace(/[।;\n]+/g,",").replace(/\s+(?:and|then|తర్వాత|మరియు)\s+/gi,",").trim();
  const parsed=[];
  const addChunk=chunk=>{
    chunk=chunk.replace(/(?:rupees?|rs\.?|₹|రూపాయలు|రూపాయి|రూపాయ)/gi," ").trim();
    const m=chunk.match(/^(.*?)\s+([\d]+(?:\.\d{1,2})?|[\u0C00-\u0C7F]+(?:\s+[\u0C00-\u0C7F]+)*|(?:zero|one|a|single|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)(?:\s+(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred))*)$/iu);
    if(!m)return false;
    const name=m[1].trim(),price=spokenNumber(m[2]);
    if(!name||price===null||!Number.isFinite(price)||price<=0)return false;
    parsed.push({name,price});return true;
  };
  const chunks=normalized.split(/[,]+/).map(x=>x.trim()).filter(Boolean);
  for(const chunk of chunks)if(!addChunk(chunk)) {
    // Fallback for natural speech without commas: detect price words/numbers as they are spoken.
    const tokens=chunk.split(/\s+/);let nameTokens=[];
    for(let i=0;i<tokens.length;){
      if(/^\d+(?:\.\d{1,2})?$/.test(tokens[i])){
        const name=nameTokens.join(" ").trim(),price=spokenNumber(tokens[i]);
        if(name&&price>0)parsed.push({name,price});
        nameTokens=[];i++;continue;
      }
      let matched=null,used=0;
      for(let len=Math.min(3,tokens.length-i);len>=1;len--){
        const phrase=tokens.slice(i,i+len).join(" "),n=spokenNumber(phrase);
        if(n!==null&&n>0){matched={n,len};break}
      }
      if(matched&&nameTokens.length){parsed.push({name:nameTokens.join(" ").trim(),price:matched.n});nameTokens=[];i+=matched.len}
      else{nameTokens.push(tokens[i]);i++}
    }
  }
  return parsed;
}
function startKhataSpeech(onTranscript,button){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){toast("Voice input is not supported here. Open this app in Chrome or type the item.");return}
  // Tapping again stops recognition immediately.
  if(button?.__khataRecognition){try{button.__khataRecognition.stop();button.textContent="⏹ Stopping…";button.title="Finishing speech recognition…"}catch(e){}return}
  if(button){button.dataset.oldText=button.dataset.oldText||button.textContent;button.classList.add("is-listening");button.textContent="⏹ Stop";button.title="Tap to stop listening";button.setAttribute("aria-live","polite")}
  const rec=new SR();rec.lang=speechLang();rec.interimResults=true;rec.continuous=false;rec.maxAlternatives=3;
  let finalText="",lastText="",deliveredFinal=false;
  if(button){button.__khataRecognition=rec;}
  rec.onstart=()=>{if(button){button.textContent="⏹ Stop";button.title="Tap to stop and finish speech recognition";}};
  rec.onresult=e=>{
    let interim="";
    for(let i=e.resultIndex;i<e.results.length;i++){
      const result=e.results[i];let best=result[0];
      for(let j=1;j<result.length;j++)if((result[j].confidence||0)>(best.confidence||0))best=result[j];
      const spoken=String(best?.transcript||"").trim();
      if(result.isFinal){if(spoken)finalText=(finalText+" "+spoken).trim()}
      else if(spoken)interim=spoken;
    }
    lastText=(finalText+" "+interim).trim();
    // Push partial words to the input immediately; don't wait for the browser's end-of-speech event.
    if(interim)onTranscript(interim,false);
    if(button)button.title=lastText||"Listening…";
    if(finalText&&!deliveredFinal){deliveredFinal=true;onTranscript(finalText,true)}
  };
  rec.onerror=e=>{
    rec._errorShown=true;
    toast(e.error==="not-allowed"?"Allow microphone access for this website, then try again.":e.error==="no-speech"?"No speech detected. Tap the mic and speak closer to the phone.":"Speech recognition had trouble. You can type the item and amount instead.")
  };
  rec.onend=()=>{
    const text=(finalText||lastText).trim();
    if(text&&!deliveredFinal)onTranscript(text,true);
    else if(!text&&!rec._errorShown)toast("No words captured. Tap the microphone and speak again, or type freely.");
    if(button){if(button.__khataRecognition===rec)delete button.__khataRecognition;button.classList.remove("is-listening");button.textContent=button.dataset.oldText||"🎙️";button.title="Tap to speak item name and amount";button.removeAttribute("aria-live")}
  };
  try{rec.start()}catch(e){if(button){delete button.__khataRecognition;button.classList.remove("is-listening");button.textContent=button.dataset.oldText||"🎙️"}toast("Could not start microphone. Check browser microphone permission.")}
}
function speakManyItem(row){
  startKhataSpeech((text,isFinal)=>{
    const name=row.querySelector(".many-name"),price=row.querySelector(".many-price");
    const parsed=parseSpokenItems(text);
    if(parsed.length){name.value=parsed[0].name;price.value=parsed[0].price;if(isFinal){for(const item of parsed.slice(1))addManyRow(item.name,item.price);toast("Voice entry ready. Check the item and amount.");}recalcManyItems();}
    else{name.value=text;if(isFinal){name.focus();toast("Item text captured. Enter or correct the amount, then save.");}}
  },row.querySelector(".many-mic"))
}
function speakAllManyItems(){
  const btn=document.getElementById("voiceAllItemsBtn");
  startKhataSpeech((text,isFinal)=>{
    const parsed=parseSpokenItems(text),rows=[...document.querySelectorAll("#manyRows .many-row")];
    if(!parsed.length){if(rows[0])rows[0].querySelector(".many-name").value=text;if(isFinal)toast("Speech captured. Correct the price if needed, then save.");return}
    let idx=0;
    for(const item of (isFinal?parsed:parsed.slice(0,1))){if(idx<rows.length){rows[idx].querySelector(".many-name").value=item.name;rows[idx].querySelector(".many-price").value=item.price;idx++}else if(isFinal)addManyRow(item.name,item.price)}
    renumberManyRows();recalcManyItems();if(isFinal)toast(parsed.length+" item(s) captured. Check before saving.");
  },btn)
}
function recalcManyItems(){let total=0;document.querySelectorAll("#manyRows .many-row").forEach(r=>total+=Math.max(0,Number(r.querySelector(".many-price")?.value)||0));const e=document.getElementById("manyTotal");if(e)e.textContent=money(total)}
function saveManyItems(customerId){if(!dkCheckSubscription("bill"))return;const lines=[];document.querySelectorAll("#manyRows .many-row").forEach(r=>{const name=(r.querySelector(".many-name")?.value||"").trim(),price=Number(r.querySelector(".many-price")?.value)||0;if(name&&price>0)lines.push({name,qty:1,price,total:price})});if(!lines.length)return toast("Add item name and price");const total=lines.reduce((s,x)=>s+x.total,0);state.tx.unshift({id:uid(),type:"sale",customerId,total,paid:0,mode:"credit",lines,date:new Date().toISOString()});saveState();closeModal();render();toast("Items saved to Khata");const billCustomer=state.customers.find(x=>x.id===customerId);window.dkNotify?.("New bill saved",(billCustomer?.name||"Customer")+" • "+money(total))}

function customerView(id){const c=state.customers.find(x=>x.id===id);if(!c)return;const b=balance(id),tx=state.tx.filter(t=>t.customerId===id).slice(0,50);const items=[];tx.filter(t=>t.type==="sale").forEach(t=>(t.lines||[]).forEach((l,i)=>items.push('<div class="line khata-deletable-item" data-long-delete data-delete-type="sale-item" data-delete-id="'+esc(t.id)+'" data-delete-index="'+i+'" title="Long press to delete this item"><span>🧾 '+esc(l.name)+' × '+(Number(l.qty)||1)+' <small class="muted">• long press to delete</small></span><b>'+money(l.total)+'</b></div>')));const history=tx.map(t=>t.type==="sale"?'<div class="card" data-long-delete data-delete-type="transaction" data-delete-id="'+esc(t.id)+'"><div class="line"><span>Sale</span><b>'+money(t.total)+'</b></div><small>'+esc((t.lines||[]).map(l=>l.name+" × "+l.qty).join(" • "))+'</small></div>':'<div class="line" data-long-delete data-delete-type="transaction" data-delete-id="'+esc(t.id)+'"><span>Payment • '+esc(t.mode||"")+'</span><b>'+money(t.amount)+'</b></div>').join("")||'<p class="muted">No transactions yet.</p>';modal('<h2>'+esc(c.name)+'</h2><p>'+esc(c.phone||"No phone added")+'</p><div class="'+(b>0?"due":"paid")+'" style="font-size:28px;margin:10px 0">'+money(b)+' <small>'+(b>0?"due":"clear")+'</small></div><button class="btn primary" onclick="openManyItems(\''+esc(id)+'\')">＋ Add Items to Khata</button><h3>Items in Khata</h3>'+(items.join("")||'<p class="muted">No items yet.</p>')+'<div class="row"><button class="btn" onclick="editCustomer(\''+esc(id)+'\')">✎ Edit / Add Number</button><button class="btn" onclick="openReceive(\''+esc(id)+'\')">⌁ Receive</button></div><div class="row"><button class="btn" onclick="shareCustomer(\''+esc(id)+'\')">💬 WhatsApp</button><button class="btn" onclick="callCustomer(\''+esc(id)+'\')">☎ Call</button></div><div class="card" style="margin:12px 0;padding:14px"><label style="display:flex;align-items:center;gap:10px;font-weight:700"><input id="dkAutoReminderToggle" type="checkbox" style="width:20px;height:20px" '+(c.autoReminderEnabled?'checked':'')+'> 🔔 Automatic reminder every 7 days</label><small class="muted">Weekly schedule is saved for this customer. Automatic WhatsApp/SMS delivery needs a connected messaging provider.</small></div><h3>History</h3>'+history+'<button class="btn" style="background:#dc2626" onclick="deleteCustomer(\''+esc(id)+'\')">Delete Customer</button>');document.getElementById("dkAutoReminderToggle")?.addEventListener("change",e=>{const current=state.customers.find(x=>String(x.id)===String(id));if(!current)return;current.autoReminderEnabled=!!e.target.checked;current.autoReminderNextAt=current.autoReminderEnabled?new Date(Date.now()+7*24*60*60*1000).toISOString():null;saveState();toast(current.autoReminderEnabled?"Weekly reminder enabled":"Weekly reminder disabled");})}
function deleteConfirm(message,onDelete){
  modal('<div class="delete-confirm"><h2>Delete?</h2><p>'+esc(message)+'</p><div class="delete-confirm-actions"><button class="btn" type="button" id="deleteCancelBtn">Cancel</button><button class="btn danger" type="button" id="deleteConfirmBtn">Delete</button></div></div>');
  document.getElementById("deleteCancelBtn")?.addEventListener("click",closeModal);
  document.getElementById("deleteConfirmBtn")?.addEventListener("click",()=>{closeModal();onDelete?.()});
}
function deleteCustomer(id){const customerId=String(id);const customer=state.customers.find(x=>String(x.id)===customerId);if(!customer)return;deleteConfirm("Delete "+customer.name+" and its khata history?",()=>{const deleted=new Set((Array.isArray(state.deletedCustomerIds)?state.deletedCustomerIds:[]).map(String));deleted.add(customerId);state.deletedCustomerIds=Array.from(deleted);state.customers=state.customers.filter(x=>String(x?.id)!==customerId);state.tx=state.tx.filter(x=>String(x?.customerId??x?.customer_id??"")!==customerId);state.reminders=state.reminders.filter(x=>String(x?.customerId??x?.customer_id??"")!==customerId);saveState();render();toast("Customer and linked bills deleted");if(typeof window.dkSyncNow==="function")window.dkSyncNow().catch(e=>console.error("Customer deletion cloud sync failed:",e))})}

function commissionSummary(){
  const rate=Math.max(0,Math.min(100,Number(state.settings.commissionRate??10)||0));
  const grossSales=sales().reduce((sum,t)=>sum+Math.max(0,Number(t.total)||0),0);
  const generated=grossSales*rate/100;
  return {rate,grossSales,generated,platform:generated*.8,owner:generated*.1,customer:generated*.1};
}
function openCommissionDashboard(){
  const x=commissionSummary();
  modal('<div class="dk-commission-view"><span class="eyebrow">DUKAAN KHATA • COMMISSION</span><h2>📊 Commission & Rewards</h2><p class="muted">The shop keeps 100% of its recorded sale amount. This preview calculates a separate commission from sales and allocates that commission 80% to the platform, 10% to the shop owner and 10% to the customer.</p><div style="padding:14px;border:1px solid var(--line);border-radius:16px;margin:14px 0"><label for="dkCommissionRate">Commission rate on recorded sales (%)</label><input id="dkCommissionRate" type="number" min="0" max="100" step="0.1" value="'+x.rate+'" style="width:100%;box-sizing:border-box;margin-top:6px"><small class="muted">Default is 10%. Change this only to the rate agreed with the shop owner.</small><button class="btn primary" id="dkSaveCommissionRate" style="width:100%;margin-top:10px">Save commission rate</button></div><div class="dk-commission-stat"><span>Recorded sales total</span><b>'+money(x.grossSales)+'</b></div><div class="dk-commission-stat"><span>Calculated commission ('+x.rate+'%)</span><b>'+money(x.generated)+'</b></div><div class="dk-commission-split"><div><span>Platform · 80%</span><b>'+money(x.platform)+'</b></div><div><span>Shop owner · 10%</span><b>'+money(x.owner)+'</b></div><div><span>Customer reward · 10%</span><b>'+money(x.customer)+'</b></div></div><p style="font-size:12px;line-height:1.5;color:var(--muted);margin-top:14px"><b>Important:</b> These are calculated amounts only. This screen does not charge a shop, move money, issue customer rewards, or transfer funds to a bank account. It uses sales saved on this device only. Real nationwide settlements require a secure shared database, verified shop onboarding, and approval from a marketplace payment provider.</p><button class="btn" onclick="closeModal()" style="width:100%">Close</button></div>');
  document.getElementById("dkSaveCommissionRate")?.addEventListener("click",()=>{
    const field=document.getElementById("dkCommissionRate"),rate=Number(field?.value);
    if(!Number.isFinite(rate)||rate<0||rate>100){toast("Enter a commission rate from 0 to 100");return}
    state.settings={...(state.settings||{}),commissionRate:rate};
    saveState();openCommissionDashboard();toast("Commission rate saved");
  });
}
function stopQRPaymentWatcher(){if(window.__dukaanQRPoll){clearInterval(window.__dukaanQRPoll);window.__dukaanQRPoll=null}}
function createTrackedQR(customerId){
  window.__activePaymentQRBox="qrBox";
  const box=document.getElementById("qrBox"),cap=document.getElementById("qrCaption"),status=document.getElementById("qrPaymentStatus");
  const amount=Number(document.getElementById("qrAmount")?.value)||0;
  const upi=(state.shop.upi||"").trim();
  stopQRPaymentWatcher();
  if(!upi){if(box)box.innerHTML='<div class="qr-empty">📱 UPI QR<br><br>Add your UPI ID in Shop Profile first.</div>';if(cap)cap.textContent="Add UPI ID to generate QR";if(status)status.innerHTML='<div class="qr-empty">Open More → Shop Profile and save your UPI ID.</div>';return}
  const link="upi://pay?pa="+encodeURIComponent(upi)+"&pn="+encodeURIComponent(state.shop.name||"Dukaan Khata")+"&cu=INR"+(amount>0?"&am="+amount.toFixed(2):"");
  if(box){box.innerHTML="";if(window.QRCode)new QRCode(box,{text:link,width:220,height:220});else box.innerHTML='<div class="qr-empty">QR library is loading. Please reopen Dukaan Pay.</div>';}
  if(cap)cap.textContent=amount>0?"Pay "+money(amount)+" • UPI QR":"UPI: "+upi;
  if(status)status.innerHTML='<div class="payment-waiting">🟢 UPI QR ready.<small>Customer scans with any UPI app. This QR pays directly to your saved UPI ID.</small></div>';
}
function createCashfreeQR(customerId){createTrackedQR(customerId)}
function openReceive(customerId=""){
  const opts=state.customers.map(c=>'<option value="'+esc(c.id)+'" '+(c.id===customerId?"selected":"")+'>'+esc(c.name)+'</option>').join("");
  modal('<div class="dukaan-pay-shell"><div class="dukaan-pay-head"><div class="dukaan-pay-icon">₹</div><div><h2>UPI Payment</h2></div></div><div class="receive-tabs"><button class="active" id="qrTab">UPI QR</button><button id="recordTab">Record</button></div><div id="receiveQR"><label for="qrCustomer" class="receive-customer-label">Select customer for QR</label><select id="qrCustomer"><option value="">General QR / No customer</option>'+opts+'</select><input id="qrAmount" type="number" min="1" inputmode="decimal" placeholder="Amount to collect (required for QR)"><div class="smart-receive-quick"><span class="smart-receive-label">Quick amount</span><div class="smart-receive-chips"><button type="button" data-smart-target="qrAmount" data-smart-amount="100">₹100</button><button type="button" data-smart-target="qrAmount" data-smart-amount="500">₹500</button><button type="button" data-smart-target="qrAmount" data-smart-amount="1000">₹1,000</button><button type="button" id="qrDueAmount" class="smart-receive-due">Full customer due ↗</button></div></div><div class="qr-card"><div id="qrBox"></div><b id="qrCaption">'+esc(state.shop.upi||"Add UPI ID in Shop Profile") + '</b></div><div id="qrPaymentStatus"></div><div class="row"><button class="btn primary" id="sharePayBtn">↗ Share QR</button><button class="btn" id="copyPayBtn">Copy UPI link</button></div></div><div id="receiveRecord" class="hidden"><select id="payCustomer"><option value="">Walk-in / Other</option>'+opts+'</select><input id="payAmount" type="number" min="1" inputmode="decimal" placeholder="Amount received"><div class="smart-receive-quick"><span class="smart-receive-label">Quick amount</span><div class="smart-receive-chips"><button type="button" data-smart-target="payAmount" data-smart-amount="100">₹100</button><button type="button" data-smart-target="payAmount" data-smart-amount="500">₹500</button><button type="button" data-smart-target="payAmount" data-smart-amount="1000">₹1,000</button><button type="button" id="recordDueAmount" class="smart-receive-due">Fill customer due ↗</button></div></div><select id="payMode"><option value="cash">Cash</option><option value="upi">UPI</option><option value="bank">Bank</option><option value="card">Card</option></select><button class="btn primary" id="savePaymentBtn">Save Payment</button></div></div>');
  const qr=document.getElementById("qrTab"),rec=document.getElementById("recordTab"),a=document.getElementById("receiveQR"),b=document.getElementById("receiveRecord");
  const hide=()=>{a?.classList.add("hidden");b?.classList.add("hidden");qr?.classList.remove("active");rec?.classList.remove("active");stopQRPaymentWatcher()};
  qr?.addEventListener("click",()=>{hide();qr.classList.add("active");a?.classList.remove("hidden");createCashfreeQR(customerId)});
  rec?.addEventListener("click",()=>{hide();rec.classList.add("active");b?.classList.remove("hidden")});
  const qrCustomer=document.getElementById("qrCustomer");
  qrCustomer?.addEventListener("change",()=>{const selected=state.customers.find(c=>c.id===qrCustomer.value);const status=document.getElementById("qrPaymentStatus");if(status)status.innerHTML=selected?'<div class="payment-waiting">QR for <b>'+esc(selected.name)+'</b><small>Payments still go directly to your shop UPI ID. Record the payment after you confirm receipt.</small></div>':"";const amount=Number(document.getElementById("qrAmount")?.value)||0;if(amount>0)createCashfreeQR(qrCustomer.value)});
  const amountInput=document.getElementById("qrAmount");
  let qrTypingTimer;
  amountInput?.addEventListener("input",()=>{
    clearTimeout(qrTypingTimer);
    const amount=Number(amountInput.value)||0;
    if(amount<=0){
      stopQRPaymentWatcher();window.__dukaanPaymentShortUrl="";
      const box=document.getElementById("qrBox"),status=document.getElementById("qrPaymentStatus"),cap=document.getElementById("qrCaption");
      if(box)box.innerHTML="<div class=\"qr-empty\">Enter an amount to generate the QR.</div>";
      if(status)status.innerHTML="";
      if(cap)cap.textContent=state.shop.upi||"Payment QR";
      return;
    }
    qrTypingTimer=setTimeout(()=>createCashfreeQR(document.getElementById("qrCustomer")?.value||""),350);
  });
  const applySmartAmount=(fieldId,value)=>{const input=document.getElementById(fieldId);if(!input)return;input.value=String(value);input.dispatchEvent(new Event("input",{bubbles:true}));};
  document.querySelectorAll(".smart-receive-chips [data-smart-target]").forEach(btn=>btn.addEventListener("click",()=>applySmartAmount(btn.dataset.smartTarget,Number(btn.dataset.smartAmount))));
  document.getElementById("qrDueAmount")?.addEventListener("click",()=>{const id=document.getElementById("qrCustomer")?.value;if(!id)return toast("Select a customer to use their outstanding due");const due=balance(id);if(due<=0)return toast("This customer has no outstanding due");applySmartAmount("qrAmount",due);});
  document.getElementById("recordDueAmount")?.addEventListener("click",()=>{const id=document.getElementById("payCustomer")?.value;if(!id)return toast("Select a customer to fill their outstanding due");const due=balance(id);if(due<=0)return toast("This customer has no outstanding due");applySmartAmount("payAmount",due);});
  const payCustomerSelect=document.getElementById("payCustomer");
  payCustomerSelect?.addEventListener("change",()=>{const dueButton=document.getElementById("recordDueAmount");if(dueButton){const due=payCustomerSelect.value?balance(payCustomerSelect.value):0;dueButton.textContent=due>0?"Fill due "+money(due)+" ↗":"Fill customer due ↗";}});
  qrCustomer?.addEventListener("change",()=>{const dueButton=document.getElementById("qrDueAmount");if(dueButton){const due=qrCustomer.value?balance(qrCustomer.value):0;dueButton.textContent=due>0?"Full due "+money(due)+" ↗":"Full customer due ↗";}});
  document.getElementById("sharePayBtn")?.addEventListener("click",()=>shareTrackedQR());
  document.getElementById("copyPayBtn")?.addEventListener("click",()=>copyUPILink());
  document.getElementById("savePaymentBtn")?.addEventListener("click",savePayment);
  setTimeout(()=>createCashfreeQR(document.getElementById("qrCustomer")?.value||customerId),50);
}
function shareTrackedQR(){sharePaymentLink()}
function startGatewayPayment(){return toast("Use the shop UPI QR or record a payment manually.")}
function loadScript(src){return new Promise((resolve,reject)=>{if(document.querySelector('script[src="'+src+'"]'))return resolve();const s=document.createElement("script");s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)})}
async function launchPaytm(data,amount,customerId){
  if(!data.mid||!data.orderId||!data.txnToken)return toast("Paytm backend returned an incomplete transaction");
  try{await loadScript("https://securegw.paytm.in/merchantpgpui/checkoutjs/merchants/"+encodeURIComponent(data.mid)+".js")}catch(e){return toast("Paytm checkout could not load")}
  if(!window.Paytm||!Paytm.CheckoutJS)return toast("Paytm checkout is unavailable");
  const config={root:"",flow:"DEFAULT",data:{orderId:data.orderId,token:data.txnToken,tokenType:"TXN_TOKEN",amount:String(amount),userDetail:{mobileNumber:data.customerPhone||""}}};
  try{await Paytm.CheckoutJS.init(config);await Paytm.CheckoutJS.invoke()}catch(e){toast("Paytm checkout could not start")}
}
function recordOnlinePayment(customerId,amount,mode,reference){
  state.tx.unshift({id:uid(),type:"payment",customerId,amount,mode,reference,date:new Date().toISOString()});saveState();closeModal();render()
}
function upiLink(){const id=(state.shop.upi||"").trim();if(!id)return"";const a=Number(document.getElementById("qrAmount")?.value||0);return"upi://pay?pa="+encodeURIComponent(id)+"&pn="+encodeURIComponent(state.shop.name)+"&cu=INR"+(a>0?"&am="+a:"")}
function refreshQR(){const box=document.getElementById("qrBox"),cap=document.getElementById("qrCaption");if(!box)return;box.innerHTML="";const link=upiLink();if(!link){box.innerHTML='<div class="qr-empty">📱 UPI QR<br><br>Add your UPI ID in Shop Profile to show the QR code here.</div>';if(cap)cap.textContent="QR ready after adding UPI ID";return}if(window.QRCode)new QRCode(box,{text:link,width:190,height:190});else box.innerHTML='<div class="qr-empty">📱 UPI QR<br><br>QR library unavailable.<br>Use Copy UPI link.</div>';if(cap)cap.textContent="UPI: "+state.shop.upi}
function copyUPILink(){const x=upiLink();if(!x)return toast("Add UPI ID first");if(navigator.clipboard?.writeText)navigator.clipboard.writeText(x).then(()=>toast("UPI link copied")).catch(()=>toast(x));else toast(x)}
function sharePaymentLink(){const x=upiLink();if(!x)return toast("Add UPI ID first");const text="Pay "+state.shop.name+"\n"+x;if(navigator.share)navigator.share({title:"Payment",text}).catch(()=>{});else window.open("https://wa.me/?text="+encodeURIComponent(text),"_blank")}
function savePayment(){const amount=Number(document.getElementById("payAmount")?.value)||0;if(amount<=0)return toast("Enter a valid amount");const paidCustomerId=document.getElementById("payCustomer")?.value||"";state.tx.unshift({id:uid(),type:"payment",customerId:paidCustomerId,amount,mode:document.getElementById("payMode")?.value||"cash",date:new Date().toISOString()});saveState();closeModal();render();toast("Payment recorded");const paidCustomer=state.customers.find(x=>x.id===paidCustomerId);window.dkNotify?.("Payment recorded",(paidCustomer?.name||"Customer")+" • "+money(amount))}

function shareCustomer(id){const c=state.customers.find(x=>x.id===id),p=(c?.phone||"").replace(/\D/g,"");if(!p)return toast("Add customer phone first");window.open("https://wa.me/"+(p.length===10?"91":"")+p+"?text="+encodeURIComponent("Hello "+c.name+" 👋 Your Dukaan Khata balance is "+money(balance(id))+".") ,"_blank")}
function callCustomer(id){const p=(state.customers.find(x=>x.id===id)?.phone||"").replace(/\D/g,"");if(!p)return toast("Add customer phone first");location.href="tel:"+p}
function remindCustomer(id){const c=state.customers.find(x=>x.id===id);if(!c||balance(id)<=0)return toast("No due balance");const p=(c.phone||"").replace(/\D/g,"");state.reminders.unshift({id:uid(),customerId:id,amount:balance(id),date:new Date().toISOString()});saveState();if(p)window.open("https://wa.me/"+(p.length===10?"91":"")+p+"?text="+encodeURIComponent("Reminder from "+state.shop.name+": outstanding "+money(balance(id))),"_blank");toast("Reminder prepared")}
function openCustomerHub(){
  document.getElementById("dkCustomerContactFullscreen")?.remove();
  const customers=Array.isArray(state.customers)?state.customers:[];
  const contactCard=c=>'<article class="dk-contact-person" data-contact-id="'+esc(c.id)+'"><div class="dk-contact-avatar" aria-hidden="true">'+esc((c.name||"?").trim().slice(0,1).toUpperCase())+'</div><div class="dk-contact-person-main"><b>'+esc(c.name||"Customer")+'</b><small>'+esc(c.phone||"No phone number")+'</small><span class="dk-contact-due">Outstanding: '+money(balance(c.id))+'</span></div><div class="dk-contact-person-actions"><button type="button" data-contact-action="call" aria-label="Phone call to '+esc(c.name)+'"><span aria-hidden="true">☎</span><small>Call</small></button><button type="button" data-contact-action="whatsapp" aria-label="WhatsApp '+esc(c.name)+'"><span class="dk-whatsapp-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path fill="#25D366" d="M12 2a9.8 9.8 0 0 0-8.42 14.82L2.2 21.8l5.12-1.34A9.8 9.8 0 1 0 12 2Z"/><path fill="#fff" d="M17.57 14.53c-.24-.12-1.43-.71-1.65-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.92-1.18-.71-.63-1.19-1.42-1.33-1.66-.14-.24-.01-.37.1-.49.11-.1.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.16 1.51.1.46-.07 1.43-.58 1.63-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z"/></svg></span><small>WhatsApp</small></button><button type="button" data-contact-action="remind" aria-label="Reminder for '+esc(c.name)+'"><span aria-hidden="true">🔔</span><small>Remind</small></button><button type="button" data-contact-action="open" aria-label="Open '+esc(c.name)+'"><span aria-hidden="true">›</span><small>Details</small></button></div></article>';
  const root=document.createElement("section");root.id="dkCustomerContactFullscreen";root.className="dk-contact-fullscreen";root.setAttribute("role","region");root.setAttribute("aria-label","Customer Contact");
  root.innerHTML='<header class="dk-contact-appbar"><button type="button" class="dk-contact-back" aria-label="Back to More">‹</button><div><span>COMMUNICATION</span><h1>Customer Contact</h1><small>Simple • Friendly • Organized</small></div><b>'+customers.length+'</b></header><label class="dk-contact-search-wrap"><span aria-hidden="true">⌕</span><input id="hubSearch" type="search" placeholder="Search customer name or phone..." autocomplete="off"></label><div class="dk-contact-stats"><span>👥 Total <b>'+customers.length+'</b></span><span>⭐ Regular <b>'+customers.filter(c=>balance(c.id)>0).length+'</b></span><span>✦ New <b>'+customers.filter(c=>!c.phone).length+'</b></span></div><div class="dk-contact-list" id="hubCustomerList">'+(customers.map(contactCard).join("")||'<div class="dk-contact-empty"><b>No customers yet</b><p>Add a customer to start WhatsApp, calls and reminders.</p><button class="btn primary" id="hubAddCustomer" type="button">＋ Add Customer</button></div>')+'</div><div class="dk-contact-bottom-actions"><button class="dk-contact-receive" id="hubReceiveBtn" type="button"><span>▣</span><span>Receive Payment / UPI QR<small>Open payment and QR options</small></span><span>›</span></button></div>';
  document.body.appendChild(root);document.body.classList.add("dk-contact-fullscreen-open");
  const list=document.getElementById("hubCustomerList"),search=document.getElementById("hubSearch");
  const close=()=>{root.remove();document.body.classList.remove("dk-contact-fullscreen-open")};
  root.querySelector(".dk-contact-back")?.addEventListener("click",close);
  const renderList=()=>{const q=(search?.value||"").trim().toLowerCase();const filtered=customers.filter(c=>String(c.name||"").toLowerCase().includes(q)||String(c.phone||"").toLowerCase().includes(q));if(list)list.innerHTML=filtered.map(contactCard).join("")||'<div class="dk-contact-empty">No matching customers found.</div>';};
  search?.addEventListener("input",renderList);
  list?.addEventListener("click",e=>{const button=e.target.closest("[data-contact-action]");if(!button)return;const card=button.closest("[data-contact-id]");const id=card?.dataset.contactId;if(!id)return;switch(button.dataset.contactAction){case"call":callCustomer(id);break;case"whatsapp":shareCustomer(id);break;case"remind":remindCustomer(id);break;case"open":close();customerView(id);break;}});
  document.getElementById("hubAddCustomer")?.addEventListener("click",()=>{close();addCustomer()});
  document.getElementById("hubReceiveBtn")?.addEventListener("click",()=>{close();openReceive()});
}
function openReminderCenter(){const a=state.customers.filter(c=>balance(c.id)>0);const history=state.reminders.slice(0,50).map(r=>{const c=state.customers.find(x=>x.id===r.customerId);return '<div class="activity" data-long-delete data-delete-type="reminder" data-delete-id="'+esc(r.id)+'"><div style="display:flex;justify-content:space-between;gap:10px"><span><b>'+esc(c?.name||"Customer")+'</b><small>'+new Date(r.date).toLocaleString("en-IN")+'</small></span><b>'+money(r.amount)+'</b></div><small class="muted">Reminder • Long press to delete</small></div>'}).join("");modal('<h2>Reminder Center</h2>'+(a.map(c=>'<div class="customer"><div><b>'+esc(c.name)+'</b><small>Due '+money(balance(c.id))+'</small></div><button class="btn small" onclick="remindCustomer(\''+esc(c.id)+'\')">🔔 Remind</button></div>').join("")||'<p class="muted">No outstanding customers.</p>')+'<h3>Reminder History</h3>'+(history||'<p class="muted">No reminders yet.</p>'))}
function openDigitalPass(){
  const shop=state.shop||{};
  const shopName=String(shop.name||"").trim()||"My Dukaan";
  const ownerName=String(shop.owner||"").trim()||"Shop Owner";
  const address=String(shop.address||"").trim()||"Indian small business";
  const passText=[shopName,ownerName,address,shop.phone||"",shop.upi||""].filter(Boolean).join("\n");
  modal('<div class="digital-pass-modal"><div class="digital-pass-heading"><span class="digital-pass-kicker">SHARE YOUR SHOP DETAILS</span><h2 class="digital-pass-title">✦ Digital Shop Pass</h2></div><div class="digital-pass" role="group" aria-label="Digital Shop Pass for '+esc(shopName)+'"><div class="digital-pass-topline"><div class="pass-logo" aria-hidden="true">₹</div><span class="digital-pass-verified">✓ Verified Shop</span></div><div class="digital-pass-main-details"><h3 class="digital-pass-shop-name">'+esc(shopName)+'</h3><p class="digital-pass-owner">'+esc(ownerName)+'</p><p class="digital-pass-address">'+esc(address)+'</p>'+(shop.phone?'<p class="digital-pass-phone">☎ '+esc(shop.phone)+'</p>':'')+(shop.upi?'<p class="digital-pass-upi">UPI: '+esc(shop.upi)+'</p>':'')+'</div><div class="digital-pass-qr-wrap"><div id="digitalPassQr" class="digital-pass-qr" aria-label="Shop details QR code"></div><small>SCAN SHOP DETAILS</small></div><p class="digital-pass-thanks">Thank You<br><small>For Supporting Local Business</small></p></div><button class="btn primary" id="shareDigitalPassBtn" type="button">↗ Share Shop Pass</button></div>');
  const box=document.getElementById("digitalPassQr");
  const drawQR=()=>{if(!box||!document.body.contains(box)||!window.QRCode)return false;box.innerHTML="";new window.QRCode(box,{text:passText,width:240,height:240,colorDark:"#102c28",colorLight:"#ffffff",correctLevel:window.QRCode.CorrectLevel?.H??2});return true;};
  if(!drawQR()){
    if(box)box.innerHTML='<span class="digital-pass-qr-fallback">Preparing QR…</span>';
    let script=document.querySelector('script[data-digital-pass-qr="true"]');
    if(!script){script=document.createElement("script");script.src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js";script.async=true;script.dataset.digitalPassQr="true";script.onload=()=>{if(!drawQR()&&box)box.innerHTML='<span class="digital-pass-qr-fallback">QR could not be created</span>';};script.onerror=()=>{if(box)box.innerHTML='<span class="digital-pass-qr-fallback">Connect to internet for QR</span>';};document.head.appendChild(script);}
    else{script.addEventListener("load",()=>drawQR(),{once:true});script.addEventListener("error",()=>{if(box)box.innerHTML='<span class="digital-pass-qr-fallback">Connect to internet for QR</span>';},{once:true});}
  }
  document.getElementById("shareDigitalPassBtn")?.addEventListener("click",()=>shareShopPass());
}
function shareShopPass(){const text=state.shop.name+"\n"+(state.shop.address||"")+"\nUPI: "+(state.shop.upi||"Not configured");if(navigator.share)navigator.share({title:state.shop.name,text}).catch(()=>{});else window.open("https://wa.me/?text="+encodeURIComponent(text),"_blank")}

function paintShopHeaderLogo(){const box=document.querySelector(".uvms-logo-button");if(!box)return;box.innerHTML='<span class="uvms-crown">◆</span><strong>UVMS</strong><i></i>';box.setAttribute("aria-label","Open UVMS logo");box.onclick=()=>openUVMSLogo()}
function openShopSettings(){const s=state.shop||{};modal('<div class="dk-modal dk-shop-theme dk-shop-theme-mint dk-shop-profile-all"><div class="dk-modal-head"><div class="dk-modal-icon">🏪</div><div><span>YOUR BUSINESS</span><h2>Shop Profile</h2><small>All details in one place</small></div><b>PROFILE</b></div><div class="dk-shop-profile-fields"><div class="dk-shop-profile-field"><label for="shopName">Shop name</label><input id="shopName" type="text" value="'+esc(s.name||"")+'" placeholder="e.g. Sri Lakshmi Stores" autocomplete="organization"></div><div class="dk-shop-profile-field"><label for="shopOwner">Owner name</label><input id="shopOwner" type="text" value="'+esc(s.owner||"")+'" placeholder="Enter owner name" autocomplete="name"></div><div class="dk-shop-profile-field"><label for="shopPhone">Shop phone</label><input id="shopPhone" type="tel" value="'+esc(s.phone||"")+'" placeholder="Enter phone number" autocomplete="tel" inputmode="tel"></div><div class="dk-shop-profile-field"><label for="shopUpi">UPI ID</label><input id="shopUpi" type="text" value="'+esc(s.upi||"")+'" placeholder="e.g. shop@upi" autocomplete="off"></div><div class="dk-shop-profile-field"><label for="shopAddress">Shop address</label><textarea id="shopAddress" placeholder="Enter full shop address" autocomplete="street-address">'+esc(s.address||"")+'</textarea></div></div><button type="button" class="btn primary dk-shop-profile-save" onclick="saveShopSettings()">✓ Save Profile</button><div class="dk-shop-step-foot">Your existing details are preserved until you tap Save Profile.</div></div>')}
function shopProfileStep(step){const fields=[{id:"shopName",key:"name",label:"Shop name",hint:"Enter your shop name",placeholder:"e.g. Sri Lakshmi Stores",type:"text",auto:"organization"},{id:"shopOwner",key:"owner",label:"Owner name",hint:"Who runs this shop?",placeholder:"Enter owner name",type:"text",auto:"name"},{id:"shopPhone",key:"phone",label:"Shop phone",hint:"Customer contact number",placeholder:"Enter phone number",type:"tel",auto:"tel"},{id:"shopUpi",key:"upi",label:"UPI ID",hint:"For receiving digital payments",placeholder:"e.g. shop@upi",type:"text",auto:"off"},{id:"shopAddress",key:"address",label:"Shop address",hint:"Where customers can find you",placeholder:"Enter full shop address",type:"textarea",auto:"street-address"}];const d=window.__shopProfileDraft||(window.__shopProfileDraft={name:state.shop.name||"",owner:state.shop.owner||"",phone:state.shop.phone||"",upi:state.shop.upi||"",address:state.shop.address||""});if(step<0||step>=fields.length)return;const old=fields[window.__shopProfileStep];if(old){const el=document.getElementById(old.id);if(el)d[old.key]=el.value}window.__shopProfileStep=step;const f=fields[step],value=d[f.key]||"",input=f.type==="textarea"?'<textarea id="'+f.id+'" placeholder="'+f.placeholder+'" autocomplete="'+f.auto+'">'+esc(value)+'</textarea>':'<input id="'+f.id+'" type="'+f.type+'" value="'+esc(value)+'" placeholder="'+f.placeholder+'" autocomplete="'+f.auto+'" '+(f.type==="tel"?'inputmode="tel"':'')+'>';const hidden=fields.filter(x=>x.id!==f.id).map(x=>'<input type="hidden" id="'+x.id+'" value="'+esc(d[x.key]||"")+'">').join("");modal('<div class="dk-modal dk-shop-theme dk-shop-theme-mint"><div class="dk-modal-head"><div class="dk-modal-icon">🏪</div><div><span>YOUR BUSINESS</span><h2>Shop Profile</h2><small>One detail at a time</small></div><b>'+(step+1)+' / '+fields.length+'</b></div><div class="dk-shop-progress" aria-label="Step '+(step+1)+' of '+fields.length+'"><span style="width:'+((step+1)/fields.length*100)+'%"></span></div><div class="dk-shop-step-card"><div class="dk-shop-step-kicker">DETAIL '+String(step+1).padStart(2,"0")+' OF 05</div><label for="'+f.id+'">'+f.label+'</label><p>'+f.hint+'</p>'+input+'<div class="dk-shop-step-nav">'+(step>0?'<button type="button" class="dk-shop-back" onclick="shopProfileStep('+(step-1)+')">← Back</button>':'<span class="dk-shop-nav-spacer"></span>')+(step<fields.length-1?'<button type="button" class="dk-shop-next" onclick="shopProfileStep('+(step+1)+')">Next →</button>':'<button type="button" class="dk-shop-next dk-shop-save" onclick="saveShopSettings()">✓ Save Profile</button>')+'</div></div><div class="dk-shop-step-foot">Your existing profile details stay saved until you tap Save Profile.</div>'+hidden+'</div>');const el=document.getElementById(f.id);if(el)el.focus({preventScroll:true})}
function popupShopProfilePic(){const src=window.__shopProfilePicDraft||state.shop.profilePic||"";if(!src)return toast("Choose or load a profile picture first");modal('<div class="dk-profile-photo-popup"><button class="dk-profile-photo-close" onclick="openShopSettings()" aria-label="Close photo">✕</button><img src="'+esc(src)+'" alt="Owner profile photo" referrerpolicy="no-referrer"><p>Owner / Shop Profile Picture</p></div>')}
function previewShopProfilePic(input){const file=input?.files?.[0];if(!file)return;if(!file.type.startsWith("image/")){toast("Please choose an image");return}if(file.size>3*1024*1024){toast("Choose an image smaller than 3 MB");input.value="";return}const reader=new FileReader();reader.onload=()=>{window.__shopProfilePicDraft=String(reader.result||"");const box=document.getElementById("shopProfilePicPreview");if(box)box.innerHTML='<img src="'+window.__shopProfilePicDraft+'" alt="Profile preview">'};reader.readAsDataURL(file)}
function saveShopSettings(){state.shop={...state.shop,name:(document.getElementById("shopName")?.value||"").trim()||"My Dukaan",owner:(document.getElementById("shopOwner")?.value||"").trim()||"Shop Owner",phone:(document.getElementById("shopPhone")?.value||"").trim(),upi:(document.getElementById("shopUpi")?.value||"").trim(),address:(document.getElementById("shopAddress")?.value||"").trim(),profilePic:window.__shopProfilePicDraft||state.shop.profilePic||""};saveState();closeModal();render();toast("Profile saved")}
function openExpenses(){const history=state.expenses.slice(0,50).map(x=>'<div class="activity" data-long-delete data-delete-type="expense" data-delete-id="'+esc(x.id)+'"><div style="display:flex;justify-content:space-between;gap:10px"><span><b>'+esc(x.name)+'</b><small>'+esc(x.mode||"cash")+' • '+new Date(x.date).toLocaleString("en-IN")+'</small></span><b>'+money(x.amount)+'</b></div><small class="muted">Long press to delete</small></div>').join("");modal('<h2>💸 Expenses</h2><p class="muted">Only shop expenses are shown here. Your owner/shop profile details are kept in Shop Profile.</p><input id="exName" placeholder="Expense name"><input id="exAmount" type="number" min="0.01" placeholder="Amount"><select id="exMode"><option>cash</option><option>upi</option><option>bank</option><option>card</option></select><button class="btn primary" onclick="saveExpense()">Save Expense</button><h3>Expense History</h3>'+(history||'<p class="muted">No expenses yet.</p>'))}
function saveExpense(){const n=(document.getElementById("exName")?.value||"").trim(),a=Number(document.getElementById("exAmount")?.value)||0;if(!n||a<=0)return toast("Enter expense details");state.expenses.unshift({id:uid(),name:n,amount:a,mode:document.getElementById("exMode")?.value,date:new Date().toISOString()});saveState();closeModal();render();toast("Expense saved")}
function openReturns(){const history=state.returns.slice(0,50).map(x=>'<div class="activity" data-long-delete data-delete-type="return" data-delete-id="'+esc(x.id)+'"><div style="display:flex;justify-content:space-between;gap:10px"><span><b>'+esc(x.name)+'</b><small>'+new Date(x.date).toLocaleString("en-IN")+'</small></span><b>'+money(x.amount)+'</b></div><small class="muted">Long press to delete</small></div>').join("");modal('<h2>Record Return</h2><input id="retName" placeholder="Item / customer"><input id="retAmount" type="number" min="0.01" placeholder="Return amount"><button class="btn primary" onclick="saveReturn()">Save Return</button><h3>Return History</h3>'+(history||'<p class="muted">No returns yet.</p>'))}
function saveReturn(){const n=(document.getElementById("retName")?.value||"").trim(),a=Number(document.getElementById("retAmount")?.value)||0;if(!n||a<=0)return toast("Enter return details");state.returns.unshift({id:uid(),name:n,amount:a,date:new Date().toISOString()});saveState();closeModal();render();toast("Return recorded")}
function openBackup(){modal('<h2>Backup & Restore</h2><p>Your data is stored on this device/browser.</p><button class="btn" onclick="exportData()">⇩ Download backup</button><label class="btn" style="display:block;text-align:center;margin-top:8px">⇧ Restore backup<input type="file" accept=".json,application/json" onchange="importData(event)" hidden></label>')}
function exportData(){const backup={format:"dukaan-khata-backup",version:2,exportedAt:new Date().toISOString(),state,passProfile:(()=>{try{return JSON.parse(localStorage.getItem("dukaan_khata_pass_profile")||"null")}catch(e){return null}})()};const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:"application/json"}));a.download="dukaan-khata-backup.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast("Backup downloaded")}
function importData(e){const f=e.target.files?.[0];if(!f)return;if(f.size>10*1024*1024){toast("Backup file is too large (10 MB max)");e.target.value="";return}const r=new FileReader();r.onload=()=>{let previousState=null,previousPass=null,hadState=false,hadPass=false;try{const raw=JSON.parse(r.result);if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new Error("Invalid backup structure");const x=raw.format==="dukaan-khata-backup"?raw.state:raw;if(!x||typeof x!=="object"||Array.isArray(x)||!Array.isArray(x.customers)||!Array.isArray(x.tx))throw new Error("Invalid backup structure");for(const k of ["expenses","returns","reminders"])if(x[k]!==undefined&&!Array.isArray(x[k]))throw new Error("Invalid backup section");if(x.shop!==undefined&&(typeof x.shop!=="object"||x.shop===null||Array.isArray(x.shop)))throw new Error("Invalid shop settings");if(x.settings!==undefined&&(typeof x.settings!=="object"||x.settings===null||Array.isArray(x.settings)))throw new Error("Invalid app settings");if(raw.passProfile!==undefined&&raw.passProfile!==null&&(typeof raw.passProfile!=="object"||Array.isArray(raw.passProfile)))throw new Error("Invalid Digital Shop Pass profile");const safe={...defaults(),...x,shop:{...defaults().shop,...(x.shop||{})},settings:{...defaults().settings,...(x.settings||{})},customers:x.customers,tx:x.tx,expenses:Array.isArray(x.expenses)?x.expenses:[],returns:Array.isArray(x.returns)?x.returns:[],reminders:Array.isArray(x.reminders)?x.reminders:[],deletedCustomerIds:Array.isArray(x.deletedCustomerIds)?x.deletedCustomerIds.map(String):[]};previousState=localStorage.getItem(KEY);hadState=previousState!==null;previousPass=localStorage.getItem("dukaan_khata_pass_profile");hadPass=previousPass!==null;localStorage.setItem(KEY,JSON.stringify(safe));if(raw.format==="dukaan-khata-backup"&&raw.passProfile!==undefined){if(raw.passProfile===null)localStorage.removeItem("dukaan_khata_pass_profile");else localStorage.setItem("dukaan_khata_pass_profile",JSON.stringify(raw.passProfile))}state=loadState();if(window.dkQueueSync)window.dkQueueSync();closeModal();render();toast("Backup restored successfully")}catch(err){try{if(hadState)localStorage.setItem(KEY,previousState);else localStorage.removeItem(KEY);if(hadPass)localStorage.setItem("dukaan_khata_pass_profile",previousPass);else localStorage.removeItem("dukaan_khata_pass_profile");state=loadState()}catch(rollbackErr){console.error("Backup rollback failed:",rollbackErr)}console.warn("Backup restore rejected:",err);toast("Invalid backup. Your current data was not changed.")}finally{e.target.value=""}};r.onerror=()=>{toast("Could not read backup file");e.target.value=""};r.readAsText(f)}
function openLanguage(){
  modal('<div class="dk-language-showcase dk-language-fullscreen">'+
    '<button type="button" class="dk-language-back" onclick="closeModal()">← Back</button>'+
    '<div class="dk-language-top"><div class="dk-language-brand"><span>PERSONALIZE</span><h2>Language</h2><small>Change app language</small></div><b class="dk-language-pro">✦ INDIA</b></div>'+
    '<div class="dk-language-world"><div class="dk-globe">🌍<i></i><em></em></div><div class="dk-orbit-label dk-orbit-en">🇬🇧 English</div><div class="dk-orbit-label dk-orbit-hi">🇮🇳 हिन्दी</div><div class="dk-orbit-label dk-orbit-te">🇮🇳 తెలుగు</div><div class="dk-orbit-label dk-orbit-kn">🇮🇳 ಕನ್ನಡ</div></div>'+
    '<div class="dk-language-panel"><div class="dk-language-panel-title"><span>🌐</span><div><b>Choose your language</b><small>Select one to personalize Dukaan Khata</small></div></div>'+
    '<div class="dk-language-list">'+
    '<button class="dk-lang-option" onclick="setLanguage(\'English\')"><span class="dk-lang-flag">🇬🇧</span><span><b>English</b><small>Default language</small></span><i>✓</i></button>'+
    '<button class="dk-lang-option" onclick="setLanguage(\'Hindi\')"><span class="dk-lang-flag">🇮🇳</span><span><b>हिन्दी</b><small>हिंदी में उपयोग करें</small></span><i>○</i></button>'+
    '<button class="dk-lang-option" onclick="setLanguage(\'Telugu\')"><span class="dk-lang-flag">🇮🇳</span><span><b>తెలుగు</b><small>తెలుగులో ఉపయోగించండి</small></span><i>○</i></button>'+
    '<button class="dk-lang-option" onclick="setLanguage(\'Kannada\')"><span class="dk-lang-flag">🇮🇳</span><span><b>ಕನ್ನಡ</b><small>ಕನ್ನಡದಲ್ಲಿ ಬಳಸಿ</small></span><i>○</i></button>'+
    '<button class="dk-lang-option" onclick="setLanguage(\'Marathi\')"><span class="dk-lang-flag">🇮🇳</span><span><b>मराठी</b><small>मराठीत वापरा</small></span><i>○</i></button>'+
    '</div></div>'+
    '<div class="dk-language-save">🌐 <span>Your preferred language<br>will be saved automatically</span><b>✓</b></div>'+
    '</div>');
}
function voiceEntry(){const R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R)return toast("Voice input is not supported in this browser");const r=new R();r.lang=state.settings.language==="Telugu"?"te-IN":state.settings.language==="Hindi"?"hi-IN":"en-IN";r.onresult=e=>toast("Heard: "+e.results[0][0].transcript);r.start()}
function openAbout(){modal('<h2>✦ Dukaan Khata Infinity</h2><p>Simple digital tools for Indian shops.</p><div class="line"><span>Digital Khata</span><b>✓</b></div><div class="line"><span>Many items with individual prices</span><b>✓</b></div><div class="line"><span>UPI QR Receive</span><b>✓</b></div><div class="line"><span>Customer Connect</span><b>✓</b></div><div class="line"><span>Backup & Restore</span><b>✓</b></div>')}
function toggleTheme(){state.settings.theme=state.settings.theme==="dark"?"light":"dark";try{localStorage.setItem("dukaan_khata_background_theme",state.settings.theme)}catch(e){}saveState();applyAppTheme();render()}
function applyAppTheme(){let mode="light";try{const saved=localStorage.getItem("dukaan_khata_background_theme");mode=(saved==="dark"||saved==="light")?saved:(state?.settings?.theme==="dark"?"dark":"light")}catch(e){mode=state?.settings?.theme==="dark"?"dark":"light"}if(state?.settings)state.settings.theme=mode;document.documentElement.dataset.dkTheme=mode;document.body.classList.toggle("darkmode",mode==="dark");document.body.dataset.dkTheme=mode;document.body.style.colorScheme=mode;}
function clearDemo(){
  if(!confirm("Clear all Dukaan Khata data on this device?"))return;
  // Keep deletion tombstones so cloud restoration cannot bring cleared records back.
  const next={...state,customers:[],tx:[],expenses:[],returns:[],reminders:[],
    deletedCustomerIds:Array.from(new Set([...(state.deletedCustomerIds||[]),...(state.customers||[]).map(x=>String(x.id))])),
    deletedRecordIds:{...(state.deletedRecordIds||{})}};
  for(const key of ["tx","expenses","returns","reminders"]){
    next.deletedRecordIds[key]=Array.from(new Set([...(next.deletedRecordIds[key]||[]),...(state[key]||[]).map(x=>String(x.id))]));
  }
  state=next;saveState();render();toast("Data cleared");
  if(typeof window.dkSyncNow==="function")window.dkSyncNow().catch(e=>console.error("Data clear sync failed:",e));
}

function renderKhata(){
  const box=document.getElementById("khataList");if(!box)return;
  const q=(document.getElementById("khataSearch")?.value||"").toLowerCase();
  // Due = outstanding balance. Paid = ANY customer with at least one recorded payment.
  // A customer can appear in BOTH lists when they have paid something and still owe money.
  const dueCustomers=state.customers.filter(c=>balance(c.id)>0);
  const paidCustomers=state.customers.filter(c=>state.tx.some(t=>String(t.customerId)===String(c.id)&&t.type==="payment"&&Number(t.amount)>0));
  const paidTotal=paidCustomers.reduce((s,c)=>s+receivedTotal(c.id),0);
  const dueTotal=dueCustomers.reduce((s,c)=>s+balance(c.id),0);
  const allBtn=document.querySelector('.khata-filter[onclick*="filterKhata(\'all\'"]');
  const dueBtn=document.querySelector('.khata-filter[onclick*="filterKhata(\'due\'"]');
  const paidBtn=document.querySelector('.khata-filter[onclick*="filterKhata(\'paid\'"]');
  if(allBtn)allBtn.textContent="All ("+state.customers.length+")";
  if(dueBtn)dueBtn.innerHTML="Due ("+dueCustomers.length+") • <span class=\"khata-filter-due\" style=\"color:#dc2626!important;-webkit-text-fill-color:#dc2626!important;font-weight:900\">"+money(dueTotal)+"</span>";
  if(paidBtn)paidBtn.innerHTML="Paid ("+paidCustomers.length+") • <span class=\"khata-filter-paid\" style=\"color:#16a34a!important;-webkit-text-fill-color:#16a34a!important;font-weight:900\">"+money(paidTotal)+"</span>";
  box.innerHTML=state.customers.filter(c=>{
    const b=balance(c.id),received=receivedTotal(c.id),matches=(c.name+" "+c.phone).toLowerCase().includes(q);
    const show=khataFilter==="all"||(khataFilter==="due"&&b>0)||(khataFilter==="paid"&&received>0);
    return matches&&show;
  }).map(c=>{
    const b=balance(c.id),received=receivedTotal(c.id);
    let right="";
    if(khataFilter==="paid") right='<div class="khata-money-paid" style="color:#16a34a!important;-webkit-text-fill-color:#16a34a!important;font-weight:900;font-size:20px">Paid '+money(received)+'</div>';
    else if(khataFilter==="due") right='<div class="khata-money-due" style="color:#dc2626!important;-webkit-text-fill-color:#dc2626!important;font-weight:900;font-size:20px">Due '+money(b)+'</div>';
    else right=b>0?'<div class="khata-money-due" style="color:#dc2626!important;-webkit-text-fill-color:#dc2626!important;font-weight:900;font-size:20px">Due '+money(b)+'</div>':'<div class="khata-money-paid" style="color:#16a34a!important;-webkit-text-fill-color:#16a34a!important;font-weight:900;font-size:20px">Paid '+money(received)+'</div>';
    return '<div class="customer" data-long-delete data-delete-type="customer" data-delete-id="'+esc(c.id)+'"><div onclick="customerView(\''+esc(c.id)+'\')" style="flex:1;cursor:pointer"><h3>'+esc(c.name)+'</h3><small>'+esc(c.phone||"No phone added")+(received>0?" • Total paid "+money(received):"")+'</small></div><div style="text-align:right">'+right+(!c.phone?'<button class="btn small" onclick="event.stopPropagation();addCustomerNumber(\''+esc(c.id)+'\')">＋ Add Mobile</button>':"")+'</div></div>';
  }).join("")||'<p class="muted">No customers found.</p>';
}
function filterCustomers(status){
  customerStatusFilter=(customerStatusFilter===status)?"all":status;
  renderCustomers();
}
function renderCustomers(){
  const box=document.getElementById("customerList");
  if(!box)return;
  const q=(document.getElementById("customerSearch")?.value||"").trim().toLowerCase();
  const dueCount=state.customers.filter(c=>balance(c.id)>0).length;
  const clearCount=state.customers.length-dueCount;
  const dueBtn=document.getElementById("customerDueFilter");
  const clearBtn=document.getElementById("customerClearFilter");
  if(dueBtn){dueBtn.innerHTML='<b id="customerDueCount">'+dueCount+'</b> with due';dueBtn.classList.toggle("active",customerStatusFilter==="due");dueBtn.setAttribute("aria-pressed",String(customerStatusFilter==="due"))}
  if(clearBtn){clearBtn.innerHTML='<b id="customerPaidCount">'+clearCount+'</b> clear';clearBtn.classList.toggle("active",customerStatusFilter==="clear");clearBtn.setAttribute("aria-pressed",String(customerStatusFilter==="clear"))}
  const customers=state.customers.filter(c=>{
    const b=balance(c.id),matches=(c.name+" "+c.phone).toLowerCase().includes(q);
    return matches&&(customerStatusFilter==="all"||(customerStatusFilter==="due"&&b>0)||(customerStatusFilter==="clear"&&b<=0));
  });
  box.innerHTML=customers.map(c=>
    '<div class="customer" data-long-delete data-delete-type="customer" data-delete-id="'+esc(c.id)+'" data-customer-open="'+esc(c.id)+'">'+
      '<div><h3>'+esc(c.name)+'</h3><small>'+esc(c.phone||"No phone")+'</small></div>'+
      '<b class="'+(balance(c.id)>0?"due":"paid")+'">'+(balance(c.id)>0?"Due ":"Clear ")+money(Math.abs(balance(c.id)))+'</b>'+
    '</div>'
  ).join("") || '<p class="muted">'+(customerStatusFilter==="due"?"No customers with due.":customerStatusFilter==="clear"?"No clear customers found.":"No customers yet.")+'</p>';
  try{window.applyLanguage?.()}catch(e){}
  box.querySelectorAll("[data-customer-open]").forEach(el=>el.addEventListener("click",()=>customerView(el.dataset.customerOpen)));
}
function renderBills(){const box=document.getElementById("billList");if(!box)return;box.innerHTML=sales().slice(0,50).map(t=>{const c=state.customers.find(x=>x.id===t.customerId);return'<div class="bill" data-long-delete data-delete-type="sale" data-delete-id="'+esc(t.id)+'" onclick="billView(\''+esc(t.id)+'\')"><div><h3>'+esc(c?.name||"Walk-in")+'</h3><small>'+new Date(t.date).toLocaleString("en-IN")+'</small></div><b>'+money(t.total)+'</b></div>'}).join("")||'<p class="muted">No bills yet.</p>'}
function billView(id){const t=state.tx.find(x=>x.id===id);if(!t)return;const c=state.customers.find(x=>x.id===t.customerId);const lines=(t.lines||[]).map(l=>'<div class="line"><span>'+esc(l.name)+' × '+l.qty+'</span><b>'+money(l.total)+'</b></div>').join("");modal('<h2>Bill</h2><p><b>'+esc(c?.name||"Walk-in")+'</b><br><small>'+new Date(t.date).toLocaleString("en-IN")+'</small></p>'+lines+'<div class="line"><b>Total</b><b>'+money(t.total)+'</b></div><button class="btn" style="background:#dc2626" onclick="deleteSale(\''+esc(id)+'\')">Delete Bill</button>')}

function deleteSaleItem(id,index){
  const tx=state.tx.find(x=>x.id===id&&x.type==="sale");if(!tx||!Array.isArray(tx.lines)||!tx.lines[index])return;
  const item=tx.lines[index];
  deleteConfirm("Delete item “"+item.name+"” from this bill?",()=>{
    tx.lines.splice(index,1);
    if(!tx.lines.length){
      markRecordDeleted("tx",id);
      state.tx=state.tx.filter(x=>String(x.id)!==String(id));
    }else{
      tx.total=tx.lines.reduce((sum,line)=>sum+(Number(line.total)||((Number(line.price)||0)*(Number(line.qty)||1))),0);
    }
    saveState();render();
    const customerId=tx.customerId;
    toast("Item deleted");
    if(customerId&&state.customers.some(x=>x.id===customerId))customerView(customerId);
    if(typeof window.dkSyncNow==="function")window.dkSyncNow().catch(e=>console.error("Deleted bill item sync failed:",e));
  });
}

function deleteSale(id){if(!state.tx.some(t=>String(t.id)===String(id)))return;deleteConfirm("Delete this bill?",()=>{markRecordDeleted("tx",id);state.tx=state.tx.filter(t=>String(t.id)!==String(id));saveState();render();toast("Bill deleted");if(typeof window.dkSyncNow==="function")window.dkSyncNow().catch(e=>console.error("Bill deletion cloud sync failed:",e))})}
function deleteTransaction(id){
  const recordId=String(id);
  const t=state.tx.find(x=>String(x?.id)===recordId);if(!t)return;
  const label=t.type==="sale"?"sale/bill":"payment";
  deleteConfirm("Delete this "+label+" transaction?",()=>{
    // Recent Activity uses this handler. Persist a tombstone before removing the
    // row so a stale cloud snapshot cannot restore it after refresh.
    markRecordDeleted("tx",recordId);
    state.tx=state.tx.filter(x=>String(x?.id)!==recordId);
    saveState();render();toast("Transaction deleted");
    if(typeof window.dkSyncNow==="function")window.dkSyncNow().catch(e=>console.error("Recent Activity deletion cloud sync failed:",e));
  })
}
function deleteExpense(id){const x=state.expenses.find(e=>String(e.id)===String(id));if(!x)return;deleteConfirm("Delete this expense?",()=>{markRecordDeleted("expenses",id);state.expenses=state.expenses.filter(e=>String(e.id)!==String(id));saveState();render();toast("Expense deleted");if(typeof window.dkSyncNow==="function")window.dkSyncNow().catch(e=>console.error("Expense deletion cloud sync failed:",e))})}
function deleteReturn(id){const x=state.returns.find(e=>String(e.id)===String(id));if(!x)return;deleteConfirm("Delete this return?",()=>{markRecordDeleted("returns",id);state.returns=state.returns.filter(e=>String(e.id)!==String(id));saveState();render();toast("Return deleted");if(typeof window.dkSyncNow==="function")window.dkSyncNow().catch(e=>console.error("Return deletion cloud sync failed:",e))})}
function deleteReminder(id){const x=state.reminders.find(e=>String(e.id)===String(id));if(!x)return;deleteConfirm("Delete this reminder?",()=>{markRecordDeleted("reminders",id);state.reminders=state.reminders.filter(e=>String(e.id)!==String(id));saveState();render();toast("Reminder deleted");if(typeof window.dkSyncNow==="function")window.dkSyncNow().catch(e=>console.error("Reminder deletion cloud sync failed:",e))})}
function filterKhata(f,el){khataFilter=f;document.querySelectorAll(".khata-filter").forEach(x=>x.classList.remove("active"));el?.classList.add("active");renderKhata()}

function renderReports(){const chart=document.getElementById("activityChart");if(chart){const days=[];for(let n=6;n>=0;n--){const d=new Date();d.setDate(d.getDate()-n);days.push({d,v:sales().filter(t=>new Date(t.date).toDateString()===d.toDateString()).reduce((a,t)=>a+(Number(t.total)||0),0)})}const max=Math.max(1,...days.map(x=>x.v));chart.innerHTML=days.map(x=>'<div class="bar" style="height:'+Math.max(7,x.v/max*125)+'px"><small>'+x.d.toLocaleDateString("en-IN",{weekday:"short"})+'</small></div>').join("")}const top=document.getElementById("topCustomers");if(top)top.innerHTML=state.customers.map(c=>({c,v:balance(c.id)})).sort((a,b)=>b.v-a.v).slice(0,5).map(x=>'<div class="line"><span>'+esc(x.c.name)+'</span><b class="'+(x.v>0?"due":"paid")+'">'+money(x.v)+'</b></div>').join("")||'<p class="muted">No customers yet.</p>';renderDailyCoach()}
function renderDailyCoach(){
 const box=document.getElementById("dailyCoachInsights");if(!box)return;
 const now=new Date(),today=now.toDateString(),yesterday=new Date(now);yesterday.setDate(yesterday.getDate()-1);
 const todaySales=sales().filter(t=>new Date(t.date).toDateString()===today).reduce((n,t)=>n+(Number(t.total)||0),0);
 const yesterdaySales=sales().filter(t=>new Date(t.date).toDateString()===yesterday.toDateString()).reduce((n,t)=>n+(Number(t.total)||0),0);
 const dueCustomers=state.customers.map(c=>({c,v:balance(c.id)})).filter(x=>x.v>0).sort((a,b)=>b.v-a.v);
 const totalDue=dueCustomers.reduce((n,x)=>n+x.v,0);
 const oldDue=sales().filter(t=>t.date&&((now-new Date(t.date))/86400000)>=7&&balance(t.customerId)>0).length;
 const ideas=[];
 if(!state.customers.length)ideas.push({icon:"👋",title:"Add your first customer",body:"Save a customer name and phone number to organize khata and payment history."});
 else if(dueCustomers.length)ideas.push({icon:"💬",title:"Follow up on pending dues",body:dueCustomers.length+" customer"+(dueCustomers.length===1?" has":"s have")+" a pending balance. Total currently due: "+money(totalDue)+".",action:"openReminderCenter()"});
 else ideas.push({icon:"✅",title:"Your dues look clear",body:"No positive customer balances are recorded right now. Keep recording payments when received."});
 if(todaySales>0)ideas.push({icon:"📈",title:"Today's recorded sales",body:"You have recorded "+money(todaySales)+" in sales today."});
 else ideas.push({icon:"🧾",title:"Keep today's books up to date",body:"No sales are recorded for today yet. Add each sale to keep reports useful.",action:"openManyItems()"});
 if(yesterdaySales>0)ideas.push({icon:"📊",title:"Compare with yesterday",body:todaySales>=yesterdaySales?"Today's recorded sales have reached or passed yesterday's total of "+money(yesterdaySales)+".":"Yesterday's recorded sales were "+money(yesterdaySales)+". Today's total is "+money(todaySales)+" so far."});
 if(oldDue>0)ideas.push({icon:"⏰",title:"Review older unpaid sales",body:oldDue+" sale record"+(oldDue===1?" is":"s are")+" at least 7 days old and linked to a customer with a current due. Check the khata before contacting them.",action:"showPage('khata')"});
 if(!ideas.length)ideas.push({icon:"💡",title:"Your shop coach is ready",body:"As you record customers, sales, and payments, this area will show practical suggestions."});
 box.innerHTML=ideas.map(x=>'<div class="dk-coach-item"><span class="dk-coach-icon">'+x.icon+'</span><div><b>'+esc(x.title)+'</b><p>'+esc(x.body)+'</p>'+(x.action?'<button class="text-link" onclick="'+x.action+'">Take action →</button>':'')+'</div></div>').join("");
}

/* Numeric keyboard helper: amount/price fields open the number keypad on phones. */
function enableNumericKeyboards(){
  document.querySelectorAll('input[type="number"]').forEach(el=>{
    el.setAttribute("inputmode","decimal");
    el.setAttribute("autocomplete","off");
  });
}
document.addEventListener("focusin",e=>{
  const el=e.target;
  if(el&&el.matches&&el.matches('input[type="number"]')){
    el.setAttribute("inputmode","decimal");
  }
});
function render(){dkEnableLiveActionBackground();const now=new Date(),today=now.toDateString(),tod=state.tx.filter(t=>new Date(t.date).toDateString()===today);const revenue=sales().reduce((a,t)=>a+(Number(t.total)||0),0),received=payments().reduce((a,t)=>a+(Number(t.amount)||0),0),due=state.customers.reduce((a,c)=>a+Math.max(0,balance(c.id)),0),expenses=state.expenses.reduce((a,t)=>a+(Number(t.amount)||0),0);const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};set("ownerHeader",state.shop.name+" • Infinity");paintShopHeaderLogo();set("greeting",(now.getHours()<12?"Good morning":now.getHours()<17?"Good afternoon":"Good evening")+" 👋");set("todayLabel",now.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"}));set("totalDue",money(due));set("todaySales",money(tod.filter(t=>t.type==="sale").reduce((a,t)=>a+(Number(t.total)||0),0)));set("todaySalesCount",tod.filter(t=>t.type==="sale").length+" bills");set("todayPaid",money(tod.filter(t=>t.type==="payment").reduce((a,t)=>a+(Number(t.amount)||0),0)));set("customerCount",state.customers.length);set("newCustomers",state.customers.length+" active");set("overdueCount",state.customers.filter(c=>balance(c.id)>0).length+" with due");set("collectionRate",revenue?Math.round(received/revenue*100)+"% collected":"0% collected");set("rRevenue",money(revenue));set("rCredit",money(Math.max(0,revenue-received)));set("rPaid",money(received));set("rExpense",money(expenses));set("rTx",state.tx.length);const rec=document.getElementById("recent");if(rec)rec.innerHTML=state.tx.slice(0,6).map(t=>'<div class="activity" data-long-delete data-delete-type="transaction" data-delete-id="'+esc(t.id)+'"><div style="display:flex;justify-content:space-between"><span>'+(t.type==="sale"?"🧾":"💰")+' '+esc(state.customers.find(c=>c.id===t.customerId)?.name||"Customer")+'</span><b>'+money(t.type==="sale"?t.total:t.amount)+'</b></div><small class="muted">'+(t.type==="sale"?"Sale":"Payment")+' • Long press to delete</small></div>').join("")||'<p class="muted">No activity yet.</p>';renderKhata();renderCustomers();renderBills();renderReports();applyAppTheme();if(window.applyLanguage)setTimeout(window.applyLanguage,0)}

function setupLongPress(){
  document.addEventListener("pointerdown",e=>{
    const el=e.target.closest?.("[data-long-delete]");if(!el)return;
    clearTimeout(longPress?.t);
    longPress={el,fired:false,t:setTimeout(()=>{
      longPress.fired=true;suppressClickUntil=Date.now()+1000;el.classList.add("long-press-delete");
      const id=el.dataset.deleteId,type=el.dataset.deleteType;
      if(type==="customer")deleteCustomer(id);
      else if(type==="sale")deleteSale(id);
       else if(type==="sale-item")deleteSaleItem(id,Number(el.dataset.deleteIndex));
      else if(type==="transaction")deleteTransaction(id);
      else if(type==="expense")deleteExpense(id);
      else if(type==="return")deleteReturn(id);
      else if(type==="reminder")deleteReminder(id);
    },750)}
  });
  document.addEventListener("pointerup",e=>{
    if(longPress){clearTimeout(longPress.t);if(longPress.fired)e.preventDefault();longPress.el?.classList.remove("long-press-delete");longPress=null}
  });
  document.addEventListener("pointercancel",()=>{if(longPress){clearTimeout(longPress.t);longPress.el?.classList.remove("long-press-delete");longPress=null}});
  document.addEventListener("click",e=>{
    if(Date.now()<suppressClickUntil && e.target.closest?.("[data-long-delete]")){e.preventDefault();e.stopPropagation();}
  },true);
}
document.addEventListener("click",e=>{
  const b=e.target.closest?.(".bottom-nav button[data-page]");
  if(b){const p=b.dataset.page;if(p&&typeof showPage==="function")showPage(p)}
},true);
document.addEventListener("DOMContentLoaded",()=>{
  try{
    setupLongPress();
    document.querySelectorAll(".bottom-nav button,.top-menu button").forEach(btn=>{
      btn.addEventListener("click",e=>{
        const page=btn.dataset.page;
        if(page&&typeof showPage==="function"){e.preventDefault();e.stopPropagation();showPage(page)}
      });
    });
    document.querySelectorAll(".khata-filter").forEach((btn,i)=>{
      btn.addEventListener("click",e=>{
        e.preventDefault();e.stopPropagation();
        const filters=["all","due","paid"];
        filterKhata(filters[i]||"all",btn);
      });
    });
    if(typeof applyAppTheme==="function")applyAppTheme();
    if(typeof dkApplyGlobalTheme==="function")dkApplyGlobalTheme();
    if(typeof render==="function")render();
    if(typeof applyHomeLogo==="function")applyHomeLogo();
    if(typeof applyOutstandingColor==="function")applyOutstandingColor();
    window.__DUKAAN_READY__=true;
  }catch(e){
    console.error("Dukaan Khata startup error:",e);
    window.__DUKAAN_READY__=false;
    try{toast("App startup error. Please reload.")}catch(_){}
  }
});





/* ===== GLOBAL BACKGROUND THEME EDITOR ===== */
const DK_GLOBAL_THEME_KEY="dukaan_khata_global_background_v1";
function dkGetGlobalTheme(){
  try{return JSON.parse(localStorage.getItem(DK_GLOBAL_THEME_KEY)||"null")||{mode:"futuristic",image:"",fit:"cover",position:"center",overlay:.18}}
  catch(e){return{mode:"futuristic",image:"",fit:"cover",position:"center",overlay:.18}}
}
function dkEnableLiveActionBackground(){document.body.classList.add("dk-live-background");}
function dkApplyGlobalTheme(){
  const t=dkGetGlobalTheme(),b=document.body;
  b.dataset.globalTheme=t.mode||"futuristic";b.classList.add("dk-live-background");b.style.setProperty("--dk-gradient-1",t.color1||"#6d28d9");b.style.setProperty("--dk-gradient-2",t.color2||"#0b0620");b.style.setProperty("--dk-gradient-3",t.color3||"#04020a");
  b.style.setProperty("--dk-global-image",t.image?"url("+JSON.stringify(t.image)+")":"none");
  b.style.setProperty("--dk-global-fit",t.fit||"cover");
  b.style.setProperty("--dk-global-position",t.position||"center");
  b.style.setProperty("--dk-global-overlay",String(Number(t.overlay??.18)));
}
function dkSaveGlobalTheme(t){
  try{localStorage.setItem(DK_GLOBAL_THEME_KEY,JSON.stringify(t));dkApplyGlobalTheme();document.body.classList.add("dk-live-background");toast("Background theme saved on this device ✓")}
  catch(e){toast("Could not save this theme")}
}
function openBackgroundTheme(){
  const t=dkGetGlobalTheme();
  modal('<div class="dk-bg-editor">'+
    '<div class="dk-bg-head"><div><span>GLOBAL APPEARANCE</span><h2>🎨 Background Theme</h2><small>One theme across Home • Khata • Customers • Bills • More</small></div><b>EDIT</b></div>'+
    '<div class="dk-bg-preview" id="dkBgPreview"><strong>Live Preview</strong><small>All pages use this background</small></div>'+
    '<div class="dk-bg-label">Choose a theme</div>'+
    '<div class="dk-color-title">Gradient colours</div>'+
    '<div class="dk-color-palette">'+
      '<button type="button" class="dk-color-dot" style="--dot:#7c3aed" aria-label="Purple gradient" onclick="dkSetGradientColor(\'#7c3aed\',\'#2563eb\',\'#09031b\')"></button>'+
      '<button type="button" class="dk-color-dot" style="--dot:#06b6d4" aria-label="Cyan gradient" onclick="dkSetGradientColor(\'#06b6d4\',\'#0f766e\',\'#02151d\')"></button>'+
      '<button type="button" class="dk-color-dot" style="--dot:#22c55e" aria-label="Green gradient" onclick="dkSetGradientColor(\'#22c55e\',\'#15803d\',\'#052e16\')"></button>'+
      '<button type="button" class="dk-color-dot" style="--dot:#f59e0b" aria-label="Gold gradient" onclick="dkSetGradientColor(\'#f59e0b\',\'#ea580c\',\'#431407\')"></button>'+
      '<button type="button" class="dk-color-dot" style="--dot:#ef4444" aria-label="Red gradient" onclick="dkSetGradientColor(\'#ef4444\',\'#be123c\',\'#3f0710\')"></button>'+
      '<button type="button" class="dk-color-dot" style="--dot:#ec4899" aria-label="Pink gradient" onclick="dkSetGradientColor(\'#ec4899\',\'#9333ea\',\'#2e1065\')"></button>'+
      '<button type="button" class="dk-color-dot" style="--dot:#3b82f6" aria-label="Blue gradient" onclick="dkSetGradientColor(\'#3b82f6\',\'#1d4ed8\',\'#172554\')"></button>'+
      '<button type="button" class="dk-color-dot" style="--dot:#14b8a6" aria-label="Teal gradient" onclick="dkSetGradientColor(\'#14b8a6\',\'#0f766e\',\'#042f2e\')"></button>'+
      '<button type="button" class="dk-color-dot" style="--dot:#f43f5e" aria-label="Rose gradient" onclick="dkSetGradientColor(\'#f43f5e\',\'#7f1d1d\',\'#2a0710\')"></button>'+
      '<button type="button" class="dk-color-dot" style="--dot:#ffffff" aria-label="Light gradient" onclick="dkSetGradientColor(\'#ffffff\',\'#e0e7ff\',\'#f5f3ff\')"></button>'+
    '</div>'+
    '<div class="dk-custom-colors"><div class="dk-color-title">Customize this theme — choose any colours</div><div class="dk-custom-color-grid">'+
      '<label>Glow colour <input id="dkThemeColor1" type="color" value="'+(t.color1||"#7c3aed")+'" oninput="dkSetPresetColor(1,this.value)"></label>'+
      '<label>Middle colour <input id="dkThemeColor2" type="color" value="'+(t.color2||"#2563eb")+'" oninput="dkSetPresetColor(2,this.value)"></label>'+
      '<label>Base colour <input id="dkThemeColor3" type="color" value="'+(t.color3||"#09031b")+'" oninput="dkSetPresetColor(3,this.value)"></label>'+
    '</div><small>Pick a preset first, then change any of its three colours. Your choices are saved automatically.</small></div>'+
    '<div class="dk-bg-presets">'+
      '<button type="button" onclick="dkChooseGlobalPreset(\'futuristic\')">✦<b>Futuristic</b><small>Purple AI</small></button>'+
      '<button type="button" onclick="dkChooseGlobalPreset(\'midnight\')">◐<b>Midnight</b><small>Deep dark</small></button>'+
      '<button type="button" onclick="dkChooseGlobalPreset(\'ocean\')">◈<b>Ocean</b><small>Blue glow</small></button>'+
      '<button type="button" onclick="dkChooseGlobalPreset(\'sunset\')">◉<b>Sunset</b><small>Warm gradient</small></button>'+
      '<button type="button" onclick="dkChooseGlobalPreset(\'light\')">☀<b>Light</b><small>Clean bright</small></button>'+
    '</div>'+
    '<label class="dk-bg-upload">🖼️ <b>Use your own background image</b><small>JPG, PNG or WebP • automatically fitted to screen<input id="dkBgFile" type="file" accept="image/png,image/jpeg,image/webp" onchange="dkGlobalImageSelected(event)" hidden></small></label>'+
    '<div class="dk-bg-controls"><label>Image fit<select id="dkBgFit"><option value="cover">Cover — fill screen</option><option value="contain">Contain — show full image</option><option value="auto">Original size</option></select></label><label>Position<select id="dkBgPosition"><option value="center">Center</option><option value="top">Top</option><option value="bottom">Bottom</option><option value="left">Left</option><option value="right">Right</option></select></label></div>'+
    '<label class="dk-bg-slider">Background overlay <input id="dkBgOverlay" type="range" min="0" max="0.55" step="0.05" value="'+Number(t.overlay??.18)+'"><span id="dkBgOverlayValue">'+Math.round(Number(t.overlay??.18)*100)+'%</span></label>'+
    '<div class="dk-bg-actions"><button class="btn" onclick="dkResetGlobalTheme()">↺ Reset</button><button class="btn primary" onclick="dkSaveGlobalThemeFromEditor()">✓ Apply Everywhere</button></div>'+
  '</div>');
  setTimeout(()=>{
    const f=document.getElementById("dkBgFit"),p=document.getElementById("dkBgPosition"),r=document.getElementById("dkBgOverlay");
    if(f)f.value=t.fit||"cover";if(p)p.value=t.position||"center";
    if(r)r.oninput=()=>{const x=document.getElementById("dkBgOverlayValue");if(x)x.textContent=Math.round(Number(r.value)*100)+"%"};
    dkUpdateGlobalPreview();
  },0);
}
function dkUpdateGlobalPreview(){
  const p=document.getElementById("dkBgPreview");if(!p)return;
  const t=dkGetGlobalTheme();
  p.dataset.previewTheme=t.mode||"futuristic";if(["futuristic","midnight","ocean","sunset","light","gradient"].includes(t.mode))p.style.background="radial-gradient(ellipse 80% 60% at 50% 0%,"+(t.color1||"#7c3aed")+"99,transparent 65%),linear-gradient(135deg,"+(t.color1||"#7c3aed")+","+(t.color2||"#2563eb")+" 50%,"+(t.color3||"#09031b")+")";
  p.style.backgroundImage=t.image?"linear-gradient(#0005,#0005),url("+JSON.stringify(t.image)+")":"";
  p.style.backgroundSize=t.fit||"cover";p.style.backgroundPosition=t.position||"center";
}
function dkToggleLiveBackground(){
  const t=dkGetGlobalTheme();
  t.live=!t.live;
  if(!t.mode)t.mode="gradient";
  dkSaveGlobalTheme(t);
  document.body.classList.toggle("dk-live-background",!!t.live);
  dkUpdateGlobalPreview();
}
const DK_PRESET_COLORS={
  futuristic:["#7c3aed","#2563eb","#09031b"],
  midnight:["#64748b","#1e293b","#020617"],
  ocean:["#06b6d4","#0f766e","#02151d"],
  sunset:["#fb7185","#f97316","#2a0710"],
  light:["#ffffff","#e0e7ff","#f5f3ff"]
};
function dkChooseGlobalPreset(mode){
  const t=dkGetGlobalTheme(),colors=DK_PRESET_COLORS[mode]||DK_PRESET_COLORS.futuristic;
  t.mode=mode;t.image="";t.color1=colors[0];t.color2=colors[1];t.color3=colors[2];
  dkSaveGlobalTheme(t);dkUpdateGlobalPreview();
  [1,2,3].forEach((n)=>{const el=document.getElementById("dkThemeColor"+n);if(el)el.value=t["color"+n]});
}
function dkSetPresetColor(slot,color){
  if(!/^#[0-9a-f]{6}$/i.test(color))return;
  const t=dkGetGlobalTheme();if(!["futuristic","midnight","ocean","sunset","light","gradient"].includes(t.mode))t.mode="futuristic";
  t.image="";t["color"+slot]=color;
  dkSaveGlobalTheme(t);dkUpdateGlobalPreview();
}
function dkSetGradientColor(a,b,c){const t=dkGetGlobalTheme();t.mode="gradient";t.image="";t.color1=a;t.color2=b;t.color3=c;dkSaveGlobalTheme(t);dkUpdateGlobalPreview();}
function dkGlobalImageSelected(e){
  const f=e.target.files?.[0];if(!f)return;
  if(f.size>12*1024*1024)return toast("Choose an image under 12 MB");
  const rd=new FileReader();
  rd.onload=()=>{const img=new Image();img.onload=()=>{
    const max=1800,s=Math.min(1,max/Math.max(img.width,img.height)),w=Math.max(1,Math.round(img.width*s)),h=Math.max(1,Math.round(img.height*s));
    const cv=document.createElement("canvas");cv.width=w;cv.height=h;cv.getContext("2d").drawImage(img,0,0,w,h);
    const t=dkGetGlobalTheme();t.mode="custom";t.image=cv.toDataURL("image/jpeg",.82);
    dkSaveGlobalTheme(t);dkUpdateGlobalPreview();toast("Your background is ready ✓");
  };img.src=rd.result};rd.readAsDataURL(f);
}
function dkSaveGlobalThemeFromEditor(){
  const t=dkGetGlobalTheme();
  t.fit=document.getElementById("dkBgFit")?.value||"cover";
  t.position=document.getElementById("dkBgPosition")?.value||"center";
  t.overlay=Number(document.getElementById("dkBgOverlay")?.value||.18);
  dkSaveGlobalTheme(t);closeModal();
}
function dkResetGlobalTheme(){
  localStorage.removeItem(DK_GLOBAL_THEME_KEY);dkApplyGlobalTheme();toast("Background reset ✓");openBackgroundTheme();
}
dkApplyGlobalTheme();


// Keep the home greeting in sync with the device's local clock, even while the app stays open.
function dkRefreshHomeGreeting(){
  const now=new Date();
  const greeting=document.getElementById("greeting");
  const today=document.getElementById("todayLabel");
  if(greeting)greeting.textContent=(now.getHours()<12?"Good morning":now.getHours()<17?"Good afternoon":"Good evening")+" 👋";
  if(today)today.textContent=now.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"});
}
setInterval(dkRefreshHomeGreeting,60000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)dkRefreshHomeGreeting()});
