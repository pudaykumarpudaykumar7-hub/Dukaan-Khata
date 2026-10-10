const KEY="dukaan_khata_infinity_v2";
let state=loadState(),khataFilter="all",longPress=null,suppressClickUntil=0;
Object.defineProperty(window,"state",{configurable:true,get:()=>state,set:v=>{state=v}});

function defaults(){return{shop:{name:"My Dukaan",owner:"Shop Owner",phone:"",upi:"",address:""},customers:[],tx:[],expenses:[],returns:[],reminders:[],settings:{theme:"light",language:"English"}}}
function loadState(){
  try{
    const raw=localStorage.getItem(KEY)||localStorage.getItem("dukaan_khata_infinity_v1");
    const x=raw?JSON.parse(raw):{};
    return {...defaults(),...x,shop:{...defaults().shop,...(x.shop||{})},settings:{...defaults().settings,...(x.settings||{})},
      customers:Array.isArray(x.customers)?x.customers:[],tx:Array.isArray(x.tx)?x.tx:[],
      expenses:Array.isArray(x.expenses)?x.expenses:[],returns:Array.isArray(x.returns)?x.returns:[],
      reminders:Array.isArray(x.reminders)?x.reminders:[]};
  }catch(e){return defaults()}
}
function saveState(){try{localStorage.setItem(KEY,JSON.stringify(state));if(window.dkQueueSync)window.dkQueueSync()}catch(e){toast("Could not save data")}}
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
function modal(html){const m=document.getElementById("modal"),b=document.getElementById("modalBody");if(!m||!b)return;b.innerHTML=html;m.classList.remove("hidden");if(!m.dataset.backdropClose){m.dataset.backdropClose="1";m.addEventListener("click",e=>{if(e.target===m)closeModal()})}}
function closeModal(){stopQRPaymentWatcher();document.getElementById("modal")?.classList.add("hidden");document.getElementById("modal")?.classList.remove("uvms-logo-modal");document.body.classList.remove("uvms-logo-open")}
function showPage(id){document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));const page=document.getElementById(id);if(!page)return;page.classList.add("active");document.querySelectorAll(".bottom-nav button,.top-menu button").forEach(b=>b.classList.toggle("active",b.dataset.page===id));window.scrollTo({top:0,behavior:"smooth"});try{render()}catch(e){console.error("Dukaan Khata render error:",e);toast("Page loaded. Please try again.")}}
function openSearch(){modal('<h2>Search</h2><input id="globalSearch" placeholder="Customer or phone..." autocomplete="off"><div id="globalResults"></div>');document.getElementById("globalSearch")?.addEventListener("input",globalResults);globalResults();document.getElementById("globalSearch")?.focus()}
function globalResults(){const q=(document.getElementById("globalSearch")?.value||"").toLowerCase();const box=document.getElementById("globalResults");if(!box)return;const a=state.customers.filter(c=>(c.name+" "+c.phone).toLowerCase().includes(q)).slice(0,10);box.innerHTML=a.map(c=>'<div class="customer" onclick="closeModal();customerView(\''+esc(c.id)+'\')"><div><b>'+esc(c.name)+'</b><small>'+esc(c.phone||"")+'</small></div><b>'+money(balance(c.id))+'</b></div>').join("")||'<p class="muted">No customers found.</p>'}

function addCustomer(mode=""){modal('<h2>New Customer</h2><input id="cname" placeholder="Customer name" autocomplete="name"><input id="cphone" inputmode="tel" placeholder="Mobile / WhatsApp number"><textarea id="caddress" placeholder="Address (optional)"></textarea><button class="btn primary" id="saveCustomerBtn">Save Customer</button>');document.getElementById("saveCustomerBtn")?.addEventListener("click",()=>saveCustomer(mode))}
function saveCustomer(mode=""){const name=(document.getElementById("cname")?.value||"").trim();if(!name)return toast("Enter customer name");const c={id:uid(),name,phone:(document.getElementById("cphone")?.value||"").trim(),address:(document.getElementById("caddress")?.value||"").trim(),created:new Date().toISOString()};state.customers.unshift(c);saveState();closeModal();render();toast("Customer added");if(mode==="many")openManyItems(c.id);if(mode==="many-picker")openManyItems()}
function editCustomer(id){const c=state.customers.find(x=>x.id===id);if(!c)return;modal('<h2>Edit Customer</h2><input id="editCName" value="'+esc(c.name)+'" placeholder="Customer name"><input id="editCPhone" value="'+esc(c.phone)+'" inputmode="tel" placeholder="Mobile number"><textarea id="editCAddress" placeholder="Address">'+esc(c.address)+'</textarea><button class="btn primary" id="editCustomerBtn">Save Customer</button>');document.getElementById("editCustomerBtn")?.addEventListener("click",()=>saveCustomerEdit(id))}
function saveCustomerEdit(id){const c=state.customers.find(x=>x.id===id);if(!c)return;const name=(document.getElementById("editCName")?.value||"").trim();if(!name)return toast("Enter customer name");c.name=name;c.phone=(document.getElementById("editCPhone")?.value||"").trim();c.address=(document.getElementById("editCAddress")?.value||"").trim();saveState();closeModal();render();toast("Customer updated")}
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
  modal('<div class="khata-entry-head"><div class="khata-entry-kicker">DUKAAN KHATA • NEW BILL</div><h2>🧾 Add items</h2><p>Customer: <b>'+esc(c.name)+'</b></p><button class="btn small khata-change-customer" id="changeSellCustomerBtn">↔ Change customer</button></div><div class="khata-entry-mode"><div><b>Enter items your way</b><small>Type each item or use the microphone</small></div><button class="khata-voice-all" id="voiceAllItemsBtn" type="button">🎙️ Speak items</button></div><div class="khata-voice-hint">Example: “Kurkure ten, spirit twenty.” Say one item and its amount, then the next item. Telugu voice mode is selected. Say each item with its amount, separated by a short pause or comma; check the result before saving.</div><div id="manyRows" class="khata-items-list"></div><button class="khata-add-row" id="addManyRowBtn" type="button">＋ Add another item manually</button><div class="khata-total-card"><span>Grand total</span><strong id="manyTotal">₹0.00</strong></div><button class="btn primary khata-save-bill" id="saveManyBtn">✓ Save bill to Khata</button><p class="khata-verify-note">Please check the item names and prices before saving.</p>');
  document.getElementById("changeSellCustomerBtn")?.addEventListener("click",()=>openManyItems());
  document.getElementById("addManyRowBtn")?.addEventListener("click",addManyRow);
  document.getElementById("voiceAllItemsBtn")?.addEventListener("click",speakAllManyItems);
  document.getElementById("saveManyBtn")?.addEventListener("click",()=>saveManyItems(customerId));
  addManyRow()
}
function addManyRow(name="",price=""){
 const box=document.getElementById("manyRows");if(!box)return;
 const row=document.createElement("div");row.className="khata-item-row many-row";
 row.innerHTML='<div class="khata-item-number"></div><div class="khata-item-fields"><label>Item name<input class="many-name" placeholder="e.g. Kurkure" autocomplete="off"></label><label>Amount (₹)<input class="many-price" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00"></label></div><button class="khata-row-mic many-mic" type="button" title="Speak this item">🎙️</button><button class="khata-row-remove many-remove" type="button" aria-label="Remove item">×</button>';
 box.appendChild(row);row.querySelector(".many-name").value=name;row.querySelector(".many-price").value=price;
 row.querySelector(".many-price")?.addEventListener("input",recalcManyItems);
 row.querySelector(".many-mic")?.addEventListener("click",()=>speakManyItem(row));
 row.querySelector(".many-remove")?.addEventListener("click",()=>{row.remove();renumberManyRows();recalcManyItems()});
 renumberManyRows();recalcManyItems()
}
function renumberManyRows(){document.querySelectorAll("#manyRows .many-row").forEach((r,i)=>{const n=r.querySelector(".khata-item-number");if(n)n.textContent=String(i+1).padStart(2,"0")})}
function speechLang(){return "te-IN"}
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
  const rec=new SR();rec.lang=speechLang();rec.interimResults=true;rec.continuous=false;rec.maxAlternatives=5;
  let finalText="",lastText="";
  if(button){button.disabled=true;button.classList.add("is-listening");button.dataset.oldText=button.textContent;button.textContent="🔴 Listening… Speak now"}
  rec.onresult=e=>{
    let interim="";
    for(let i=e.resultIndex;i<e.results.length;i++){
      const result=e.results[i];let best=result[0];
      for(let j=1;j<result.length;j++)if((result[j].confidence||0)>(best.confidence||0))best=result[j];
      if(result.isFinal)finalText+=(finalText?" ":"")+String(best?.transcript||"").trim();
      else interim=String(best?.transcript||"").trim();
    }
    lastText=(finalText+" "+interim).trim();
    if(button)button.title=lastText||"Listening for Telugu speech";
  };
  rec.onerror=e=>toast(e.error==="not-allowed"?"Allow microphone access for this website, then try again.":e.error==="no-speech"?"No speech detected. Tap the mic and speak closer to the phone.":"Speech recognition had trouble. You can type the item and amount instead.");
  rec.onend=()=>{
    const text=(finalText||lastText).trim();
    if(text)onTranscript(text);
    else if(!rec._errorShown)toast("No words captured. Tap the microphone and speak again, or type freely.");
    if(button){button.disabled=false;button.classList.remove("is-listening");button.textContent=button.dataset.oldText||"🎙️ Speak items";button.title="Speak item name and amount"}
  };
  rec.onerror=e=>{rec._errorShown=true;toast(e.error==="not-allowed"?"Allow microphone access for this website, then try again.":e.error==="no-speech"?"No speech detected. Tap the mic and speak closer to the phone.":"Speech recognition had trouble. You can type the item and amount instead.")};
  try{rec.start()}catch(e){if(button){button.disabled=false;button.classList.remove("is-listening");button.textContent=button.dataset.oldText||"🎙️ Speak items"}toast("Could not start microphone. Check browser microphone permission.")}
}
function speakManyItem(row){startKhataSpeech(text=>{const parsed=parseSpokenItems(text);if(parsed.length){row.querySelector(".many-name").value=parsed[0].name;row.querySelector(".many-price").value=parsed[0].price;for(const item of parsed.slice(1))addManyRow(item.name,item.price);recalcManyItems();toast("Captured: "+text+". Check the names and amounts before saving.");}else{row.querySelector(".many-name").value=text;row.querySelector(".many-name").focus();toast("Speech captured as item text. Enter or correct the amount, then save.")}},row.querySelector(".many-mic"))}
function speakAllManyItems(){const btn=document.getElementById("voiceAllItemsBtn");startKhataSpeech(text=>{const parsed=parseSpokenItems(text);if(!parsed.length){const rows=[...document.querySelectorAll("#manyRows .many-row")];if(rows[0])rows[0].querySelector(".many-name").value=text;toast("I heard: "+text+". Add/correct the price manually, or try saying “Kurkure ten, spirit twenty”.");return}const rows=[...document.querySelectorAll("#manyRows .many-row")];let idx=0;for(const item of parsed){if(idx<rows.length){rows[idx].querySelector(".many-name").value=item.name;rows[idx].querySelector(".many-price").value=item.price;idx++}else addManyRow(item.name,item.price)}renumberManyRows();recalcManyItems();toast(parsed.length+" item(s) captured. Please verify before saving.");},btn)}

function recalcManyItems(){let total=0;document.querySelectorAll("#manyRows .many-row").forEach(r=>total+=Math.max(0,Number(r.querySelector(".many-price")?.value)||0));const e=document.getElementById("manyTotal");if(e)e.textContent=money(total)}
function saveManyItems(customerId){const lines=[];document.querySelectorAll("#manyRows .many-row").forEach(r=>{const name=(r.querySelector(".many-name")?.value||"").trim(),price=Number(r.querySelector(".many-price")?.value)||0;if(name&&price>0)lines.push({name,qty:1,price,total:price})});if(!lines.length)return toast("Add item name and price");const total=lines.reduce((s,x)=>s+x.total,0);state.tx.unshift({id:uid(),type:"sale",customerId,total,paid:0,mode:"credit",lines,date:new Date().toISOString()});saveState();closeModal();render();toast("Items saved to Khata")}

function customerView(id){const c=state.customers.find(x=>x.id===id);if(!c)return;const b=balance(id),tx=state.tx.filter(t=>t.customerId===id).slice(0,50);const items=[];tx.filter(t=>t.type==="sale").forEach(t=>(t.lines||[]).forEach(l=>items.push('<div class="line"><span>🧾 '+esc(l.name)+' × '+(Number(l.qty)||1)+'</span><b>'+money(l.total)+'</b></div>')));const history=tx.map(t=>t.type==="sale"?'<div class="card" data-long-delete data-delete-type="transaction" data-delete-id="'+esc(t.id)+'"><div class="line"><span>Sale</span><b>'+money(t.total)+'</b></div><small>'+esc((t.lines||[]).map(l=>l.name+" × "+l.qty).join(" • "))+'</small></div>':'<div class="line" data-long-delete data-delete-type="transaction" data-delete-id="'+esc(t.id)+'"><span>Payment • '+esc(t.mode||"")+'</span><b>'+money(t.amount)+'</b></div>').join("")||'<p class="muted">No transactions yet.</p>';modal('<h2>'+esc(c.name)+'</h2><p>'+esc(c.phone||"No phone added")+'</p><div class="'+(b>0?"due":"paid")+'" style="font-size:28px;margin:10px 0">'+money(b)+' <small>'+(b>0?"due":"clear")+'</small></div><button class="btn primary" onclick="openManyItems(\''+esc(id)+'\')">＋ Add Items to Khata</button><h3>Items in Khata</h3>'+(items.join("")||'<p class="muted">No items yet.</p>')+'<div class="row"><button class="btn" onclick="editCustomer(\''+esc(id)+'\')">✎ Edit / Add Number</button><button class="btn" onclick="openReceive(\''+esc(id)+'\')">⌁ Receive</button></div><div class="row"><button class="btn" onclick="shareCustomer(\''+esc(id)+'\')">💬 WhatsApp</button><button class="btn" onclick="callCustomer(\''+esc(id)+'\')">☎ Call</button></div><h3>History</h3>'+history+'<button class="btn" style="background:#dc2626" onclick="deleteCustomer(\''+esc(id)+'\')">Delete Customer</button>')}
function deleteConfirm(message,onDelete){
  modal('<div class="delete-confirm"><h2>Delete?</h2><p>'+esc(message)+'</p><div class="delete-confirm-actions"><button class="btn" type="button" id="deleteCancelBtn">Cancel</button><button class="btn danger" type="button" id="deleteConfirmBtn">Delete</button></div></div>');
  document.getElementById("deleteCancelBtn")?.addEventListener("click",closeModal);
  document.getElementById("deleteConfirmBtn")?.addEventListener("click",()=>{closeModal();onDelete?.()});
}
function deleteCustomer(id){const c=state.customers.find(x=>x.id===id);if(!c)return;deleteConfirm("Delete "+c.name+" and its khata history?",()=>{state.customers=state.customers.filter(x=>x.id!==id);state.tx=state.tx.filter(x=>x.customerId!==id);state.reminders=state.reminders.filter(x=>x.customerId!==id);saveState();render();toast("Customer deleted")})}

function paymentApiBase(){let u=(localStorage.getItem("dukaan_payment_api")||"").trim();if(!u){try{u=(JSON.parse(localStorage.getItem("dukaan_khata_payments_v1")||"{}").backendUrl||"").trim()}catch(e){}}return u.endsWith("/")?u.slice(0,-1):u}
function paymentApiUrl(path){const base=paymentApiBase();return base?base+path:""}
function openPaymentSetup(){
  const current=paymentApiBase();
  modal('<h2>💳 Payment Center</h2><p class="muted">Connect your secure payment backend here. Never enter your Razorpay Secret Key in this website.</p><div class="payment-provider-grid"><div class="payment-provider"><b>📲 Razorpay UPI QR</b><small>Scan with any UPI app</small><span class="status-chip">QR ready</span></div></div><label>Secure payment backend URL<input id="paymentApiUrl" value="'+esc(current)+'" placeholder="https://your-vercel-app.vercel.app"></label><button class="btn primary" id="savePaymentApiBtn">Save Payment Connection</button><button class="btn" onclick="openReceive()">Open Smart Receive</button><p class="muted" style="font-size:11px;margin-top:12px">The GitHub Pages site cannot safely store gateway secret keys. The backend creates orders and verifies payments.</p>');
  document.getElementById("savePaymentApiBtn")?.addEventListener("click",()=>{
    const u=(document.getElementById("paymentApiUrl")?.value||"").trim();
    localStorage.setItem("dukaan_payment_api",u);closeModal();toast(u?"Payment backend connected":"Payment backend cleared")
  });
}
function stopQRPaymentWatcher(){if(window.__dukaanQRPoll){clearInterval(window.__dukaanQRPoll);window.__dukaanQRPoll=null}}
function showMoneyReceived(payment,customerId=""){
  const amount=Number(payment.amount)||0;
  const customer=state.customers.find(c=>c.id===customerId);
  const exists=state.tx.some(t=>t.type==="payment"&&t.gateway==="razorpay_qr"&&t.paymentId===payment.id);
  if(!exists){
    state.tx.unshift({id:uid(),type:"payment",customerId,amount,mode:"upi",gateway:"razorpay_qr",paymentId:payment.id,reference:payment.rrn||"",date:new Date().toISOString()});
    saveState();render();
  }
  const success='<div class="payment-success-card"><div class="payment-success-icon">✓</div><b>PAYMENT RECEIVED</b><strong>'+money(amount)+'</strong><span>'+esc(customer?.name||"Payment received")+'</span><small>Razorpay UPI payment confirmed automatically</small></div>';
  const qrBox=document.getElementById(window.__activePaymentQRBox||"qrBox");
  if(qrBox)qrBox.innerHTML=success;
  const cap=document.getElementById("qrCaption");if(cap)cap.textContent="✓ Payment received • "+money(amount);
  const box=document.getElementById("qrPaymentStatus");if(box)box.innerHTML=success;
  toast("Money received: "+money(amount));
}
function createTrackedQR(customerId){
  window.__activePaymentQRBox="qrBox";
  const box=document.getElementById("qrBox"),cap=document.getElementById("qrCaption"),status=document.getElementById("qrPaymentStatus");
  const amount=Number(document.getElementById("qrAmount")?.value)||0;
  const upi=(state.shop.upi||"").trim();
  stopQRPaymentWatcher();
  if(!upi){if(box)box.innerHTML='<div class="qr-empty">📱 UPI QR<br><br>Add your UPI ID in Shop Profile first.</div>';if(cap)cap.textContent="Add UPI ID to generate QR";if(status)status.innerHTML='<div class="qr-empty">Open More → Shop Profile and save your UPI ID.</div>';return}
  const link="upi://pay?pa="+encodeURIComponent(upi)+"&pn="+encodeURIComponent(state.shop.name||"Dukaan Khata")+"&cu=INR"+(amount>0?"&am="+amount.toFixed(2):"");
  if(box){box.innerHTML="";if(window.QRCode)new QRCode(box,{text:link,width:220,height:220});else box.innerHTML='<div class="qr-empty">QR library is loading. Please reopen Smart Receive.</div>';}
  if(cap)cap.textContent=amount>0?"Pay "+money(amount)+" • UPI QR":"UPI: "+upi;
  if(status)status.innerHTML='<div class="payment-waiting">🟢 UPI QR ready.<small>Customer scans with any UPI app. This QR pays directly to your saved UPI ID.</small></div>';
}
async function createRazorpayQR(customerId){
  window.__activePaymentQRBox="razorpayQrBox";
  const box=document.getElementById("razorpayQrBox"),cap=document.getElementById("razorpayQrCaption"),status=document.getElementById("razorpayQrPaymentStatus");
  const amount=Number(document.getElementById("razorpayQrAmount")?.value)||0;
  const customerIdValue=customerId||document.getElementById("qrCustomer")?.value||"";
  if(amount<=0){if(box)box.innerHTML='<div class="qr-empty">Enter the amount first.</div>';if(status)status.innerHTML='<div class="qr-empty">Enter an amount to create the Razorpay payment QR.</div>';return}
  const customer=state.customers.find(c=>c.id===customerIdValue);
  stopQRPaymentWatcher();
  if(box)box.innerHTML='<div class="qr-empty">Creating secure Razorpay payment…</div>';
  if(status)status.innerHTML='<div class="payment-waiting">Preparing payment QR…</div>';
  const base=paymentApiBase();
  if(!base){if(box)box.innerHTML='<div class="qr-empty">Razorpay backend is not connected.</div>';if(status)status.innerHTML='<div class="qr-empty">Open Payment Gateway Settings and save your Vercel backend URL.</div>';return}
  try{
    const r=await fetch(paymentApiUrl("/api/razorpay/payment-link"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount,customerId:customerIdValue,customerName:customer?.name||"Customer"})});
    const data=await r.json().catch(()=>({}));
    if(!(r.ok&&data.id&&data.shortUrl)){const msg=data.error||("HTTP "+r.status+" from Razorpay backend");if(box)box.innerHTML='<div class="qr-empty">Razorpay payment QR could not be generated.</div>';if(status)status.innerHTML='<div class="qr-empty"><b>Razorpay rejected the payment request.</b><br><small>'+esc(msg)+'</small></div>';return}
    const qrUrl="https://quickchart.io/qr?size=320&text="+encodeURIComponent(data.shortUrl);
    if(box)box.innerHTML='<a href="'+esc(data.shortUrl)+'" target="_blank" rel="noopener" style="display:block;text-align:center"><img src="'+qrUrl+'" alt="Razorpay UPI payment QR" style="width:220px;height:220px;max-width:100%;display:block;margin:auto"></a><small style="display:block;text-align:center;margin-top:8px">Scan with any UPI app</small>';
    if(cap)cap.textContent="Pay "+money(amount)+" • Razorpay";
    if(status)status.innerHTML='<div class="payment-waiting">🟡 Waiting for payment…<small>Scan the QR. Payment confirmation will happen automatically.</small></div>';
    window.__dukaanQRPoll=setInterval(async()=>{try{const pr=await fetch(paymentApiUrl("/api/razorpay/payment-link/"+encodeURIComponent(data.id)));const pd=await pr.json().catch(()=>({}));if(!pr.ok)return;if(pd.paid){stopQRPaymentWatcher();showMoneyReceived({id:data.id,amount:pd.amount,status:"captured"},customerIdValue)}}catch(e){}},3000);
  }catch(e){if(box)box.innerHTML='<div class="qr-empty">Razorpay payment QR could not be generated.</div>';if(status)status.innerHTML='<div class="qr-empty">'+esc(e.message||"Payment service unavailable")+'</div>'}
}
function openReceive(customerId=""){
  const opts=state.customers.map(c=>'<option value="'+esc(c.id)+'" '+(c.id===customerId?"selected":"")+'>'+esc(c.name)+'</option>').join("");
  modal('<div class="smart-receive-shell"><div class="smart-receive-head"><div class="smart-receive-icon">₹</div><div><span>PAYMENT CENTER</span><h2>Smart Receive</h2><small>Fast • Secure • UPI Ready</small></div><b>LIVE</b></div><div class="receive-tabs"><button class="active" id="qrTab">UPI QR</button><button id="recordTab">Record</button></div><div id="receiveQR"><select id="qrCustomer"><option value="">Walk-in / Other</option>'+opts+'</select><p class="muted">Enter an amount if you want it included in the QR. Payment goes directly to the shopkeeper\'s saved UPI ID.</p><input id="qrAmount" type="number" min="1" placeholder="Amount to collect (optional)"><div class="qr-card"><div id="qrBox"></div><b id="qrCaption">'+esc(state.shop.upi||"Add UPI ID in Shop Profile")+'</b></div><div id="qrPaymentStatus"></div><div class="row"><button class="btn primary" id="sharePayBtn">↗ Share QR</button><button class="btn" id="copyPayBtn">Copy UPI link</button></div></div><div id="receiveRecord" class="hidden"><select id="payCustomer"><option value="">Walk-in / Other</option>'+opts+'</select><input id="payAmount" type="number" min="1" placeholder="Amount received"><select id="payMode"><option value="cash">Cash</option><option value="upi">UPI</option><option value="bank">Bank</option><option value="card">Card</option></select><button class="btn primary" id="savePaymentBtn">Save Payment</button></div></div>');
  const qr=document.getElementById("qrTab"),rec=document.getElementById("recordTab"),a=document.getElementById("receiveQR"),b=document.getElementById("receiveRecord");
  const hide=()=>{a?.classList.add("hidden");b?.classList.add("hidden");qr?.classList.remove("active");rec?.classList.remove("active");stopQRPaymentWatcher()};
  qr?.addEventListener("click",()=>{hide();qr.classList.add("active");a?.classList.remove("hidden");createTrackedQR(document.getElementById("qrCustomer")?.value||customerId)});
  rec?.addEventListener("click",()=>{hide();rec.classList.add("active");b?.classList.remove("hidden")});
  document.getElementById("qrCustomer")?.addEventListener("change",()=>createTrackedQR(document.getElementById("qrCustomer").value));
  document.getElementById("qrAmount")?.addEventListener("input",()=>createTrackedQR(document.getElementById("qrCustomer")?.value||customerId));
  document.getElementById("sharePayBtn")?.addEventListener("click",()=>shareTrackedQR());
  document.getElementById("copyPayBtn")?.addEventListener("click",copyUPILink);
  document.getElementById("savePaymentBtn")?.addEventListener("click",savePayment);
  setTimeout(()=>createTrackedQR(customerId),50);
}
function shareTrackedQR(){const img=document.querySelector("#qrBox img");if(!img)return toast("Generate the QR first");const text="Scan this QR to pay "+state.shop.name+(document.getElementById("qrAmount")?.value?" — "+money(Number(document.getElementById("qrAmount").value)):"");if(navigator.share)navigator.share({title:"Dukaan Khata Payment QR",text}).catch(()=>{});else navigator.clipboard?.writeText(text).then(()=>toast("Payment message copied")).catch(()=>toast(text))}
async function startGatewayPayment(provider){if(provider==="razorpay"){document.getElementById("qrTab")?.click();return}return toast("Only Razorpay UPI QR is available")}
function loadScript(src){return new Promise((resolve,reject)=>{if(document.querySelector('script[src="'+src+'"]'))return resolve();const s=document.createElement("script");s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)})}
async function launchRazorpay(order,amount,customerId){
  if(!order.keyId||!order.orderId)return toast("Razorpay backend returned an incomplete order");
  try{await loadScript("https://checkout.razorpay.com/v1/checkout.js")}catch(e){return toast("Razorpay checkout could not load")}
  const r=new Razorpay({key:order.keyId,amount:order.amount,currency:"INR",name:state.shop.name,description:"Dukaan Khata payment",order_id:order.orderId,handler:async response=>{
    try{const vr=await fetch(paymentApiUrl("/api/razorpay/verify"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(response)});const vd=await vr.json();if(!vr.ok||!vd.verified)throw new Error("Verification failed");recordOnlinePayment(customerId,amount,"razorpay",response.razorpay_payment_id);toast("Razorpay payment verified ✓")}catch(e){toast("Payment received but verification failed — do not mark it paid yet")}}});r.on("payment.failed",()=>toast("Razorpay payment failed"));r.open()
}
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
function savePayment(){const amount=Number(document.getElementById("payAmount")?.value)||0;if(amount<=0)return toast("Enter a valid amount");state.tx.unshift({id:uid(),type:"payment",customerId:document.getElementById("payCustomer")?.value||"",amount,mode:document.getElementById("payMode")?.value||"cash",date:new Date().toISOString()});saveState();closeModal();render();toast("Payment recorded")}

function shareCustomer(id){const c=state.customers.find(x=>x.id===id),p=(c?.phone||"").replace(/\D/g,"");if(!p)return toast("Add customer phone first");window.open("https://wa.me/"+(p.length===10?"91":"")+p+"?text="+encodeURIComponent("Hello "+c.name+" 👋 Your Dukaan Khata balance is "+money(balance(id))+".") ,"_blank")}
function callCustomer(id){const p=(state.customers.find(x=>x.id===id)?.phone||"").replace(/\D/g,"");if(!p)return toast("Add customer phone first");location.href="tel:"+p}
function remindCustomer(id){const c=state.customers.find(x=>x.id===id);if(!c||balance(id)<=0)return toast("No due balance");const p=(c.phone||"").replace(/\D/g,"");state.reminders.unshift({id:uid(),customerId:id,amount:balance(id),date:new Date().toISOString()});saveState();if(p)window.open("https://wa.me/"+(p.length===10?"91":"")+p+"?text="+encodeURIComponent("Reminder from "+state.shop.name+": outstanding "+money(balance(id))),"_blank");toast("Reminder prepared")}
function openCustomerHub(){
  if(!state.customers.length){
    return modal('<div class="dk-modal dk-contact-theme"><div class="dk-modal-head"><div class="dk-modal-icon">👥</div><div><span>COMMUNICATION</span><h2>Customer Contact</h2><small>Connect with your customers</small></div><b>SYNC</b></div><div class="dk-modal-card"><h3>No customers yet</h3><p>Add a customer to start WhatsApp, calls and reminders.</p></div><button class="btn primary" onclick="closeModal();addCustomer()">＋ Add Customer</button><button class="btn primary" onclick="openReceive()">▣ Smart Receive QR</button></div>');
  }
  const opts=state.customers.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join("");
  modal('<div class="dk-modal dk-contact-theme"><div class="dk-modal-head"><div class="dk-modal-icon">👥</div><div><span>COMMUNICATION</span><h2>Customer Contact</h2><small>WhatsApp • Call • Reminder</small></div><b>SYNC</b></div><div class="dk-modal-card"><h3>Choose Customer</h3><p>Connect, call or send reminders instantly.</p></div><select id="hubCustomer">'+opts+'</select><div class="hub-actions"><button class="btn" onclick="shareCustomer(document.getElementById(\'hubCustomer\').value)">💬 WhatsApp</button><button class="btn" onclick="callCustomer(document.getElementById(\'hubCustomer\').value)">☎ Call</button><button class="btn" onclick="remindCustomer(document.getElementById(\'hubCustomer\').value)">🔔 Reminder</button><button class="btn" onclick="customerView(document.getElementById(\'hubCustomer\').value)">◉ Open Customer</button></div><button class="btn primary" onclick="openReceive(document.getElementById(\'hubCustomer\').value)">▣ Smart Receive QR</button></div>');
}
function openReminderCenter(){const a=state.customers.filter(c=>balance(c.id)>0);const history=state.reminders.slice(0,50).map(r=>{const c=state.customers.find(x=>x.id===r.customerId);return '<div class="activity" data-long-delete data-delete-type="reminder" data-delete-id="'+esc(r.id)+'"><div style="display:flex;justify-content:space-between;gap:10px"><span><b>'+esc(c?.name||"Customer")+'</b><small>'+new Date(r.date).toLocaleString("en-IN")+'</small></span><b>'+money(r.amount)+'</b></div><small class="muted">Reminder • Long press to delete</small></div>'}).join("");modal('<h2>Reminder Center</h2>'+(a.map(c=>'<div class="customer"><div><b>'+esc(c.name)+'</b><small>Due '+money(balance(c.id))+'</small></div><button class="btn small" onclick="remindCustomer(\''+esc(c.id)+'\')">🔔 Remind</button></div>').join("")||'<p class="muted">No outstanding customers.</p>')+'<h3>Reminder History</h3>'+(history||'<p class="muted">No reminders yet.</p>'))}
function openDigitalPass(){modal('<h2>✦ Digital Shop Pass</h2><div class="digital-pass"><div class="pass-logo">₹</div><h3>'+esc(state.shop.name)+'</h3><p>'+esc(state.shop.owner)+'</p><p>'+esc(state.shop.address||"Indian small business")+'</p><b>'+esc(state.shop.upi||"UPI not configured")+'</b></div><button class="btn primary" onclick="shareShopPass()">↗ Share Shop Pass</button>')}
function shareShopPass(){const text=state.shop.name+"\n"+(state.shop.address||"")+"\nUPI: "+(state.shop.upi||"Not configured");if(navigator.share)navigator.share({title:state.shop.name,text}).catch(()=>{});else window.open("https://wa.me/?text="+encodeURIComponent(text),"_blank")}

function openShopSettings(){const s=state.shop;modal('<div class="dk-modal dk-shop-theme"><div class="dk-modal-head"><div class="dk-modal-icon">🏪</div><div><span>YOUR SHOP</span><h2>Shop Profile</h2><small>Manage your shop identity</small></div><b>EDIT</b></div><div class="dk-modal-card"><h3>Shop Information</h3><p>Update your shop details, UPI and contact information.</p></div><h2 style="display:none">Shop Profile</h2><input id="shopName" value="'+esc(s.name)+'" placeholder="Shop name"><input id="shopOwner" value="'+esc(s.owner)+'" placeholder="Owner name"><input id="shopPhone" value="'+esc(s.phone)+'" placeholder="Shop phone"><input id="shopUpi" value="'+esc(s.upi)+'" placeholder="UPI ID e.g. shop@upi"><textarea id="shopAddress" placeholder="Shop address">'+esc(s.address)+'</textarea><button class="btn primary" onclick="saveShopSettings()">Save Profile</button>')}
function saveShopSettings(){state.shop={name:(document.getElementById("shopName")?.value||"").trim()||"My Dukaan",owner:(document.getElementById("shopOwner")?.value||"").trim()||"Shop Owner",phone:(document.getElementById("shopPhone")?.value||"").trim(),upi:(document.getElementById("shopUpi")?.value||"").trim(),address:(document.getElementById("shopAddress")?.value||"").trim()};saveState();closeModal();render();toast("Profile saved")}
function openExpenses(){const history=state.expenses.slice(0,50).map(x=>'<div class="activity" data-long-delete data-delete-type="expense" data-delete-id="'+esc(x.id)+'"><div style="display:flex;justify-content:space-between;gap:10px"><span><b>'+esc(x.name)+'</b><small>'+esc(x.mode||"cash")+' • '+new Date(x.date).toLocaleString("en-IN")+'</small></span><b>'+money(x.amount)+'</b></div><small class="muted">Long press to delete</small></div>').join("");modal('<h2>💸 Expenses</h2><p class="muted">Only shop expenses are shown here. Your owner/shop profile details are kept in Shop Profile.</p><input id="exName" placeholder="Expense name"><input id="exAmount" type="number" min="0.01" placeholder="Amount"><select id="exMode"><option>cash</option><option>upi</option><option>bank</option><option>card</option></select><button class="btn primary" onclick="saveExpense()">Save Expense</button><h3>Expense History</h3>'+(history||'<p class="muted">No expenses yet.</p>'))}
function saveExpense(){const n=(document.getElementById("exName")?.value||"").trim(),a=Number(document.getElementById("exAmount")?.value)||0;if(!n||a<=0)return toast("Enter expense details");state.expenses.unshift({id:uid(),name:n,amount:a,mode:document.getElementById("exMode")?.value,date:new Date().toISOString()});saveState();closeModal();render();toast("Expense saved")}
function openReturns(){const history=state.returns.slice(0,50).map(x=>'<div class="activity" data-long-delete data-delete-type="return" data-delete-id="'+esc(x.id)+'"><div style="display:flex;justify-content:space-between;gap:10px"><span><b>'+esc(x.name)+'</b><small>'+new Date(x.date).toLocaleString("en-IN")+'</small></span><b>'+money(x.amount)+'</b></div><small class="muted">Long press to delete</small></div>').join("");modal('<h2>Record Return</h2><input id="retName" placeholder="Item / customer"><input id="retAmount" type="number" min="0.01" placeholder="Return amount"><button class="btn primary" onclick="saveReturn()">Save Return</button><h3>Return History</h3>'+(history||'<p class="muted">No returns yet.</p>'))}
function saveReturn(){const n=(document.getElementById("retName")?.value||"").trim(),a=Number(document.getElementById("retAmount")?.value)||0;if(!n||a<=0)return toast("Enter return details");state.returns.unshift({id:uid(),name:n,amount:a,date:new Date().toISOString()});saveState();closeModal();render();toast("Return recorded")}
function openBackup(){modal('<h2>Backup & Restore</h2><p>Your data is stored on this device/browser.</p><button class="btn" onclick="exportData()">⇩ Download backup</button><label class="btn" style="display:block;text-align:center;margin-top:8px">⇧ Restore backup<input type="file" accept=".json,application/json" onchange="importData(event)" hidden></label>')}
function exportData(){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:"application/json"}));a.download="dukaan-khata-backup.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast("Backup downloaded")}
function importData(e){const f=e.target.files?.[0];if(!f)return;if(f.size>10*1024*1024){toast("Backup file is too large (10 MB max)");e.target.value="";return}const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!x||typeof x!=="object"||Array.isArray(x)||!Array.isArray(x.customers)||!Array.isArray(x.tx))throw new Error("Invalid backup structure");for(const k of ["expenses","returns","reminders"])if(x[k]!==undefined&&!Array.isArray(x[k]))throw new Error("Invalid backup section");if(x.shop!==undefined&&(typeof x.shop!=="object"||x.shop===null||Array.isArray(x.shop)))throw new Error("Invalid shop settings");if(x.settings!==undefined&&(typeof x.settings!=="object"||x.settings===null||Array.isArray(x.settings)))throw new Error("Invalid app settings");const safe={...defaults(),...x,shop:{...defaults().shop,...(x.shop||{})},settings:{...defaults().settings,...(x.settings||{})},customers:x.customers,tx:x.tx,expenses:Array.isArray(x.expenses)?x.expenses:[],returns:Array.isArray(x.returns)?x.returns:[],reminders:Array.isArray(x.reminders)?x.reminders:[]};localStorage.setItem(KEY,JSON.stringify(safe));state=loadState();if(window.dkQueueSync)window.dkQueueSync();closeModal();render();toast("Backup restored successfully")}catch(err){console.warn("Backup restore rejected:",err);toast("Invalid backup. Your current data was not changed.")}finally{e.target.value=""}};r.onerror=()=>{toast("Could not read backup file");e.target.value=""};r.readAsText(f)}
function openLanguage(){
  modal('<div class="dk-language-showcase">'+
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
    '<button class="dk-language-close" onclick="closeModal()">× Close</button></div>');
}
function voiceEntry(){const R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R)return toast("Voice input is not supported in this browser");const r=new R();r.lang=state.settings.language==="Telugu"?"te-IN":state.settings.language==="Hindi"?"hi-IN":"en-IN";r.onresult=e=>toast("Heard: "+e.results[0][0].transcript);r.start()}
function openAbout(){modal('<h2>✦ Dukaan Khata Infinity</h2><p>Simple digital tools for Indian shops.</p><div class="line"><span>Digital Khata</span><b>✓</b></div><div class="line"><span>Many items with individual prices</span><b>✓</b></div><div class="line"><span>UPI QR Receive</span><b>✓</b></div><div class="line"><span>Customer Connect</span><b>✓</b></div><div class="line"><span>Backup & Restore</span><b>✓</b></div>')}
function toggleTheme(){state.settings.theme=state.settings.theme==="dark"?"light":"dark";saveState();applyAppTheme();render()}
function applyAppTheme(){const mode=state?.settings?.theme==="dark"?"dark":"light";document.documentElement.dataset.dkTheme=mode;document.body.classList.toggle("darkmode",mode==="dark");document.body.dataset.dkTheme=mode;document.body.style.colorScheme=mode;}
function clearDemo(){if(confirm("Clear all Dukaan Khata data on this device?")){localStorage.removeItem(KEY);state=defaults();render();toast("Data reset")}}

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
function renderCustomers(){
  const box=document.getElementById("customerList");
  if(!box)return;
  const q=(document.getElementById("customerSearch")?.value||"").trim().toLowerCase();
  const customers=state.customers.filter(c=>(c.name+" "+c.phone).toLowerCase().includes(q));
  box.innerHTML=customers.map(c=>
    '<div class="customer" data-long-delete data-delete-type="customer" data-delete-id="'+esc(c.id)+'" onclick="customerView(\''+esc(c.id)+'\')">'+
      '<div><h3>'+esc(c.name)+'</h3><small>'+esc(c.phone||"No phone")+'</small></div>'+
    '</div>'
  ).join("") || '<p class="muted">No customers yet.</p>';
  const due=state.customers.filter(c=>balance(c.id)>0).length;
  document.getElementById("customerDueCount")&&(document.getElementById("customerDueCount").textContent=due);
  document.getElementById("customerPaidCount")&&(document.getElementById("customerPaidCount").textContent=state.customers.length-due);
}
function renderBills(){const box=document.getElementById("billList");if(!box)return;box.innerHTML=sales().slice(0,50).map(t=>{const c=state.customers.find(x=>x.id===t.customerId);return'<div class="bill" data-long-delete data-delete-type="sale" data-delete-id="'+esc(t.id)+'" onclick="billView(\''+esc(t.id)+'\')"><div><h3>'+esc(c?.name||"Walk-in")+'</h3><small>'+new Date(t.date).toLocaleString("en-IN")+'</small></div><b>'+money(t.total)+'</b></div>'}).join("")||'<p class="muted">No bills yet.</p>'}
function billView(id){const t=state.tx.find(x=>x.id===id);if(!t)return;const c=state.customers.find(x=>x.id===t.customerId);const lines=(t.lines||[]).map(l=>'<div class="line"><span>'+esc(l.name)+' × '+l.qty+'</span><b>'+money(l.total)+'</b></div>').join("");modal('<h2>Bill</h2><p><b>'+esc(c?.name||"Walk-in")+'</b><br><small>'+new Date(t.date).toLocaleString("en-IN")+'</small></p>'+lines+'<div class="line"><b>Total</b><b>'+money(t.total)+'</b></div><button class="btn" style="background:#dc2626" onclick="deleteSale(\''+esc(id)+'\')">Delete Bill</button>')}
function deleteSale(id){if(!state.tx.some(t=>t.id===id))return;deleteConfirm("Delete this bill?",()=>{state.tx=state.tx.filter(t=>t.id!==id);saveState();render();toast("Bill deleted")})}
function deleteTransaction(id){
  const t=state.tx.find(x=>x.id===id);if(!t)return;
  const label=t.type==="sale"?"sale/bill":"payment";
  deleteConfirm("Delete this "+label+" transaction?",()=>{state.tx=state.tx.filter(x=>x.id!==id);saveState();render();toast("Transaction deleted")})
}
function deleteExpense(id){const x=state.expenses.find(e=>e.id===id);if(!x)return;deleteConfirm("Delete this expense?",()=>{state.expenses=state.expenses.filter(e=>e.id!==id);saveState();render();toast("Expense deleted")})}
function deleteReturn(id){const x=state.returns.find(e=>e.id===id);if(!x)return;deleteConfirm("Delete this return?",()=>{state.returns=state.returns.filter(e=>e.id!==id);saveState();render();toast("Return deleted")})}
function deleteReminder(id){const x=state.reminders.find(e=>e.id===id);if(!x)return;deleteConfirm("Delete this reminder?",()=>{state.reminders=state.reminders.filter(e=>e.id!==id);saveState();render();toast("Reminder deleted")})}
function filterKhata(f,el){khataFilter=f;document.querySelectorAll(".khata-filter").forEach(x=>x.classList.remove("active"));el?.classList.add("active");renderKhata()}

function renderReports(){const chart=document.getElementById("activityChart");if(chart){const days=[];for(let n=6;n>=0;n--){const d=new Date();d.setDate(d.getDate()-n);days.push({d,v:sales().filter(t=>new Date(t.date).toDateString()===d.toDateString()).reduce((a,t)=>a+(Number(t.total)||0),0)})}const max=Math.max(1,...days.map(x=>x.v));chart.innerHTML=days.map(x=>'<div class="bar" style="height:'+Math.max(7,x.v/max*125)+'px"><small>'+x.d.toLocaleDateString("en-IN",{weekday:"short"})+'</small></div>').join("")}const top=document.getElementById("topCustomers");if(top)top.innerHTML=state.customers.map(c=>({c,v:balance(c.id)})).sort((a,b)=>b.v-a.v).slice(0,5).map(x=>'<div class="line"><span>'+esc(x.c.name)+'</span><b class="'+(x.v>0?"due":"paid")+'">'+money(x.v)+'</b></div>').join("")||'<p class="muted">No customers yet.</p>'}
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
function render(){dkEnableLiveActionBackground();const now=new Date(),today=now.toDateString(),tod=state.tx.filter(t=>new Date(t.date).toDateString()===today);const revenue=sales().reduce((a,t)=>a+(Number(t.total)||0),0),received=payments().reduce((a,t)=>a+(Number(t.amount)||0),0),due=state.customers.reduce((a,c)=>a+Math.max(0,balance(c.id)),0),expenses=state.expenses.reduce((a,t)=>a+(Number(t.amount)||0),0);const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};set("ownerHeader",state.shop.name+" • Infinity");set("greeting",(now.getHours()<12?"Good morning":now.getHours()<17?"Good afternoon":"Good evening")+" 👋");set("todayLabel",now.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"}));set("totalDue",money(due));set("todaySales",money(tod.filter(t=>t.type==="sale").reduce((a,t)=>a+(Number(t.total)||0),0)));set("todaySalesCount",tod.filter(t=>t.type==="sale").length+" bills");set("todayPaid",money(tod.filter(t=>t.type==="payment").reduce((a,t)=>a+(Number(t.amount)||0),0)));set("customerCount",state.customers.length);set("newCustomers",state.customers.length+" active");set("overdueCount",state.customers.filter(c=>balance(c.id)>0).length+" with due");set("collectionRate",revenue?Math.round(received/revenue*100)+"% collected":"0% collected");set("rRevenue",money(revenue));set("rCredit",money(Math.max(0,revenue-received)));set("rPaid",money(received));set("rExpense",money(expenses));set("rTx",state.tx.length);const rec=document.getElementById("recent");if(rec)rec.innerHTML=state.tx.slice(0,6).map(t=>'<div class="activity" data-long-delete data-delete-type="transaction" data-delete-id="'+esc(t.id)+'"><div style="display:flex;justify-content:space-between"><span>'+(t.type==="sale"?"🧾":"💰")+' '+esc(state.customers.find(c=>c.id===t.customerId)?.name||"Customer")+'</span><b>'+money(t.type==="sale"?t.total:t.amount)+'</b></div><small class="muted">'+(t.type==="sale"?"Sale":"Payment")+' • Long press to delete</small></div>').join("")||'<p class="muted">No activity yet.</p>';renderKhata();renderCustomers();renderBills();renderReports();applyAppTheme();if(window.applyLanguage)setTimeout(window.applyLanguage,0)}

function setupLongPress(){
  document.addEventListener("pointerdown",e=>{
    const el=e.target.closest?.("[data-long-delete]");if(!el)return;
    clearTimeout(longPress?.t);
    longPress={el,fired:false,t:setTimeout(()=>{
      longPress.fired=true;suppressClickUntil=Date.now()+1000;el.classList.add("long-press-delete");
      const id=el.dataset.deleteId,type=el.dataset.deleteType;
      if(type==="customer")deleteCustomer(id);
      else if(type==="sale")deleteSale(id);
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
  try{localStorage.setItem(DK_GLOBAL_THEME_KEY,JSON.stringify(t));dkApplyGlobalTheme();document.body.classList.toggle("dk-live-background",!!dkGetGlobalTheme().live);toast("Background theme applied ✓")}
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
  p.dataset.previewTheme=t.mode||"futuristic";if(t.mode==="gradient")p.style.background="linear-gradient(135deg,"+(t.color1||"#7c3aed")+","+(t.color2||"#2563eb")+" 50%,"+(t.color3||"#09031b")+")";
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
function dkChooseGlobalPreset(mode){
  const t=dkGetGlobalTheme();t.mode=mode;t.image="";
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
