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
function saveState(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){toast("Could not save data")}}
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
function openDigitalPassword(){
  if(typeof modal!=="function")return;
  const s=state.shop||{};
  const name=s.name||"My Dukaan", owner=s.owner||"Shop Owner", phone=s.phone||"Not added", upi=s.upi||"Not added", address=s.address||"Not added";
  const passBg=localStorage.getItem("dukaan_khata_pass_color")||"linear-gradient(135deg,#111827,#4f46e5,#06b6d4)";
  modal('<div class="digital-pass-shell" style="padding:2px;border-radius:24px;background:'+passBg+';box-shadow:0 20px 60px rgba(0,0,0,.35)">'+
    '<div style="background:rgba(255,255,255,.97);border-radius:22px;padding:22px">'+
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:18px"><div style="width:52px;height:52px;border-radius:16px;background:linear-gradient(135deg,#4f46e5,#06b6d4);color:#fff;display:grid;place-items:center;font-size:25px">🎫</div><div><div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.6">DIGITAL APP PASS</div><h2 style="margin:2px 0">Shop & Owner Profile</h2></div></div>'+
    '<div style="padding:16px;border-radius:18px;background:linear-gradient(135deg,#eef2ff,#ecfeff);margin-bottom:12px"><div style="font-size:12px;opacity:.6">SHOP</div><div style="font-size:22px;font-weight:800">'+esc(name)+'</div><div style="margin-top:8px">📍 '+esc(address)+'</div></div>'+
    '<div style="display:grid;gap:10px">'+
    '<div style="padding:13px;border:1px solid #e5e7eb;border-radius:14px">👤 <b>Owner</b><br><span style="margin-left:26px">'+esc(owner)+'</span></div>'+
    '<div style="padding:13px;border:1px solid #e5e7eb;border-radius:14px">📞 <b>Phone</b><br><span style="margin-left:26px">'+esc(phone)+'</span></div>'+
    '<div style="padding:13px;border:1px solid #e5e7eb;border-radius:14px">💳 <b>UPI ID</b><br><span style="margin-left:26px">'+esc(upi)+'</span></div>'+
    '<div style="padding:13px;border:1px solid #e5e7eb;border-radius:14px">🏠 <b>Shop Address</b><br><span style="margin-left:26px">'+esc(address)+'</span></div>'+
    '</div>'+
    ''+
    '</div></div>');
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
function balance(id){return state.tx.filter(t=>t.customerId===id).reduce((s,t)=>s+(t.type==="sale"?Number(t.total)||0:-(Number(t.amount)||0)),0)}
function receivedTotal(id){return state.tx.filter(t=>t.customerId===id&&t.type==="payment").reduce((s,t)=>s+(Number(t.amount)||0),0)}
function sales(){return state.tx.filter(t=>t.type==="sale")}
function payments(){return state.tx.filter(t=>t.type==="payment")}
function toast(msg){const e=document.getElementById("toast");if(!e)return;e.textContent=msg;e.classList.add("show");clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove("show"),2200)}
function modal(html){const m=document.getElementById("modal"),b=document.getElementById("modalBody");if(!m||!b)return;b.innerHTML=html;m.classList.remove("hidden")}
function closeModal(){document.getElementById("modal")?.classList.add("hidden");document.getElementById("modal")?.classList.remove("uvms-logo-modal");document.body.classList.remove("uvms-logo-open")}
function showPage(id){document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));document.getElementById(id)?.classList.add("active");document.querySelectorAll(".bottom-nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===id));render()}
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
  modal('<h2>＋ Add Items</h2><p><b>'+esc(c.name)+'</b></p><button class="btn small" id="changeSellCustomerBtn">↔ Change Customer</button><div id="manyRows"></div><button class="btn" id="addManyRowBtn">＋ Add another item</button><div class="line"><b>Total</b><b id="manyTotal">₹0</b></div><button class="btn primary" id="saveManyBtn">Save to Khata</button>');
  document.getElementById("changeSellCustomerBtn")?.addEventListener("click",()=>openManyItems());
  document.getElementById("addManyRowBtn")?.addEventListener("click",addManyRow);
  document.getElementById("saveManyBtn")?.addEventListener("click",()=>saveManyItems(customerId));addManyRow()
}
function addManyRow(){const box=document.getElementById("manyRows");if(!box)return;const row=document.createElement("div");row.className="row many-row";row.style.margin="8px 0";row.innerHTML='<input class="many-name" placeholder="Item name" autocomplete="off"><input class="many-price" type="number" min="0.01" step="0.01" placeholder="Price"><button class="btn small many-remove" type="button">✕</button>';box.appendChild(row);row.querySelector(".many-price")?.addEventListener("input",recalcManyItems);row.querySelector(".many-remove")?.addEventListener("click",()=>{row.remove();recalcManyItems()});recalcManyItems()}
function recalcManyItems(){let total=0;document.querySelectorAll("#manyRows .many-row").forEach(r=>total+=Math.max(0,Number(r.querySelector(".many-price")?.value)||0));const e=document.getElementById("manyTotal");if(e)e.textContent=money(total)}
function saveManyItems(customerId){const lines=[];document.querySelectorAll("#manyRows .many-row").forEach(r=>{const name=(r.querySelector(".many-name")?.value||"").trim(),price=Number(r.querySelector(".many-price")?.value)||0;if(name&&price>0)lines.push({name,qty:1,price,total:price})});if(!lines.length)return toast("Add item name and price");const total=lines.reduce((s,x)=>s+x.total,0);state.tx.unshift({id:uid(),type:"sale",customerId,total,paid:0,mode:"credit",lines,date:new Date().toISOString()});saveState();closeModal();render();toast("Items saved to Khata")}

function customerView(id){const c=state.customers.find(x=>x.id===id);if(!c)return;const b=balance(id),tx=state.tx.filter(t=>t.customerId===id).slice(0,50);const items=[];tx.filter(t=>t.type==="sale").forEach(t=>(t.lines||[]).forEach(l=>items.push('<div class="line"><span>🧾 '+esc(l.name)+' × '+(Number(l.qty)||1)+'</span><b>'+money(l.total)+'</b></div>')));const history=tx.map(t=>t.type==="sale"?'<div class="card" data-long-delete data-delete-type="transaction" data-delete-id="'+esc(t.id)+'"><div class="line"><span>Sale</span><b>'+money(t.total)+'</b></div><small>'+esc((t.lines||[]).map(l=>l.name+" × "+l.qty).join(" • "))+'</small></div>':'<div class="line" data-long-delete data-delete-type="transaction" data-delete-id="'+esc(t.id)+'"><span>Payment • '+esc(t.mode||"")+'</span><b>'+money(t.amount)+'</b></div>').join("")||'<p class="muted">No transactions yet.</p>';modal('<h2>'+esc(c.name)+'</h2><p>'+esc(c.phone||"No phone added")+'</p><div class="'+(b>0?"due":"paid")+'" style="font-size:28px;margin:10px 0">'+money(b)+' <small>'+(b>0?"due":"clear")+'</small></div><button class="btn primary" onclick="openManyItems(\''+esc(id)+'\')">＋ Add Items to Khata</button><h3>Items in Khata</h3>'+(items.join("")||'<p class="muted">No items yet.</p>')+'<div class="row"><button class="btn" onclick="editCustomer(\''+esc(id)+'\')">✎ Edit / Add Number</button><button class="btn" onclick="openReceive(\''+esc(id)+'\')">⌁ Receive</button></div><div class="row"><button class="btn" onclick="shareCustomer(\''+esc(id)+'\')">💬 WhatsApp</button><button class="btn" onclick="callCustomer(\''+esc(id)+'\')">☎ Call</button></div><h3>History</h3>'+history+'<button class="btn" style="background:#dc2626" onclick="deleteCustomer(\''+esc(id)+'\')">Delete Customer</button>')}
function deleteCustomer(id){const c=state.customers.find(x=>x.id===id);if(!c)return;if(!confirm("Delete "+c.name+" and its khata history?"))return;state.customers=state.customers.filter(x=>x.id!==id);state.tx=state.tx.filter(x=>x.customerId!==id);state.reminders=state.reminders.filter(x=>x.customerId!==id);saveState();closeModal();render();toast("Customer deleted")}

function paymentApiBase(){const u=(localStorage.getItem("dukaan_payment_api")||"").trim();return u.endsWith("/")?u.slice(0,-1):u}
function paymentApiUrl(path){const base=paymentApiBase();return base?base+path:""}
function openPaymentSetup(){
  const current=paymentApiBase();
  modal('<h2>💳 Payment Center</h2><p class="muted">Connect your secure payment backend here. Never enter Razorpay Secret or Paytm Merchant Key in this website.</p><div class="payment-provider-grid"><div class="payment-provider"><b>🟦 Razorpay</b><small>UPI • Cards • NetBanking</small><span class="status-chip">Gateway ready</span></div><div class="payment-provider"><b>🟦 Paytm</b><small>UPI • Cards • NetBanking</small><span class="status-chip">Gateway ready</span></div><div class="payment-provider"><b>🟩 UPI</b><small>Direct UPI QR</small><span class="status-chip">Works now</span></div></div><label>Secure payment backend URL<input id="paymentApiUrl" value="'+esc(current)+'" placeholder="https://your-vercel-app.vercel.app"></label><button class="btn primary" id="savePaymentApiBtn">Save Payment Connection</button><button class="btn" onclick="openReceive()">Open Smart Receive</button><p class="muted" style="font-size:11px;margin-top:12px">The GitHub Pages site cannot safely store gateway secret keys. The backend creates orders and verifies payments.</p>');
  document.getElementById("savePaymentApiBtn")?.addEventListener("click",()=>{
    const u=(document.getElementById("paymentApiUrl")?.value||"").trim();
    localStorage.setItem("dukaan_payment_api",u);closeModal();toast(u?"Payment backend connected":"Payment backend cleared")
  });
}
function openReceive(customerId=""){
  const opts=state.customers.map(c=>'<option value="'+esc(c.id)+'" '+(c.id===customerId?"selected":"")+'>'+esc(c.name)+'</option>').join("");
  modal('<h2>Smart Receive</h2><div class="receive-tabs"><button class="active" id="qrTab">UPI QR</button><button id="onlineTab">Online Pay</button><button id="recordTab">Record</button></div><div id="receiveQR"><p class="muted">Direct UPI QR for your shop.</p><input id="qrAmount" type="number" min="1" placeholder="Amount (optional)"><div class="qr-card"><div id="qrBox"></div><b id="qrCaption">'+esc(state.shop.upi||"Add UPI ID in Shop Profile")+'</b></div><div class="row"><button class="btn primary" id="sharePayBtn">↗ Share</button><button class="btn" id="copyPayBtn">Copy UPI link</button></div></div><div id="receiveOnline" class="hidden"><select id="onlineCustomer"><option value="">Walk-in / Other</option>'+opts+'</select><input id="onlineAmount" type="number" min="1" placeholder="Amount to collect"><div class="payment-provider-grid compact"><button class="payment-provider-button" id="razorpayPayBtn"><b>Razorpay</b><small>Pay securely online</small></button><button class="payment-provider-button" id="paytmPayBtn"><b>Paytm</b><small>Pay securely online</small></button></div><p id="onlinePayStatus" class="muted">Choose a gateway to start payment.</p></div><div id="receiveRecord" class="hidden"><select id="payCustomer"><option value="">Walk-in / Other</option>'+opts+'</select><input id="payAmount" type="number" min="1" placeholder="Amount received"><select id="payMode"><option value="cash">Cash</option><option value="upi">UPI</option><option value="bank">Bank</option><option value="card">Card</option></select><button class="btn primary" id="savePaymentBtn">Save Payment</button></div>');
  const qr=document.getElementById("qrTab"),online=document.getElementById("onlineTab"),rec=document.getElementById("recordTab"),a=document.getElementById("receiveQR"),o=document.getElementById("receiveOnline"),b=document.getElementById("receiveRecord");
  const hide=()=>{a?.classList.add("hidden");o?.classList.add("hidden");b?.classList.add("hidden");qr?.classList.remove("active");online?.classList.remove("active");rec?.classList.remove("active")};
  qr?.addEventListener("click",()=>{hide();qr.classList.add("active");a?.classList.remove("hidden");refreshQR()});
  online?.addEventListener("click",()=>{hide();online.classList.add("active");o?.classList.remove("hidden")});
  rec?.addEventListener("click",()=>{hide();rec.classList.add("active");b?.classList.remove("hidden")});
  document.getElementById("qrAmount")?.addEventListener("input",refreshQR);
  document.getElementById("sharePayBtn")?.addEventListener("click",sharePaymentLink);
  document.getElementById("copyPayBtn")?.addEventListener("click",copyUPILink);
  document.getElementById("razorpayPayBtn")?.addEventListener("click",()=>startGatewayPayment("razorpay"));
  document.getElementById("paytmPayBtn")?.addEventListener("click",()=>startGatewayPayment("paytm"));
  document.getElementById("savePaymentBtn")?.addEventListener("click",savePayment);
  setTimeout(refreshQR,50)
}
async function startGatewayPayment(provider){
  const amount=Number(document.getElementById("onlineAmount")?.value)||0,customerId=document.getElementById("onlineCustomer")?.value||"";
  const status=document.getElementById("onlinePayStatus");
  if(amount<=0)return toast("Enter a valid amount");
  const base=paymentApiBase();
  if(!base){openPaymentSetup();return}
  if(status)status.textContent="Creating secure payment order…";
  try{
    const endpoint=provider==="razorpay"?"/api/razorpay/order":"/api/paytm/initiate";
    const res=await fetch(paymentApiUrl(endpoint),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount,customerId,shopName:state.shop.name,customerPhone:state.customers.find(c=>c.id===customerId)?.phone||""})});
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.error||"Gateway setup error");
    if(provider==="razorpay")return launchRazorpay(data,amount,customerId);
    if(provider==="paytm")return launchPaytm(data,amount,customerId);
  }catch(e){if(status)status.textContent="Payment could not start: "+(e.message||"Please try again");toast(e.message||"Payment could not start")}
}
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
function openCustomerHub(){if(!state.customers.length)return modal('<h2>Customer Connect</h2><p>No customers yet.</p><button class="btn primary" onclick="closeModal();addCustomer()">＋ Add Customer</button><button class="btn primary" onclick="openReceive()">▣ Smart Receive QR</button>');const opts=state.customers.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join("");modal('<h2>Customer Connect</h2><p class="muted">WhatsApp, calls and reminders are ready for the selected customer.</p><select id="hubCustomer">'+opts+'</select><div class="hub-actions"><button class="btn" onclick="shareCustomer(document.getElementById(\'hubCustomer\').value)">💬 WhatsApp</button><button class="btn" onclick="callCustomer(document.getElementById(\'hubCustomer\').value)">☎ Call</button><button class="btn" onclick="remindCustomer(document.getElementById(\'hubCustomer\').value)">🔔 Reminder</button><button class="btn" onclick="customerView(document.getElementById(\'hubCustomer\').value)">◉ Open Customer</button></div><button class="btn primary" onclick="openReceive(document.getElementById(\'hubCustomer\').value)">▣ Smart Receive QR</button>')}
function openReminderCenter(){const a=state.customers.filter(c=>balance(c.id)>0);const history=state.reminders.slice(0,50).map(r=>{const c=state.customers.find(x=>x.id===r.customerId);return '<div class="activity" data-long-delete data-delete-type="reminder" data-delete-id="'+esc(r.id)+'"><div style="display:flex;justify-content:space-between;gap:10px"><span><b>'+esc(c?.name||"Customer")+'</b><small>'+new Date(r.date).toLocaleString("en-IN")+'</small></span><b>'+money(r.amount)+'</b></div><small class="muted">Reminder • Long press to delete</small></div>'}).join("");modal('<h2>Reminder Center</h2>'+(a.map(c=>'<div class="customer"><div><b>'+esc(c.name)+'</b><small>Due '+money(balance(c.id))+'</small></div><button class="btn small" onclick="remindCustomer(\''+esc(c.id)+'\')">🔔 Remind</button></div>').join("")||'<p class="muted">No outstanding customers.</p>')+'<h3>Reminder History</h3>'+(history||'<p class="muted">No reminders yet.</p>'))}
function openDigitalPass(){modal('<h2>✦ Digital Shop Pass</h2><div class="digital-pass"><div class="pass-logo">₹</div><h3>'+esc(state.shop.name)+'</h3><p>'+esc(state.shop.owner)+'</p><p>'+esc(state.shop.address||"Indian small business")+'</p><b>'+esc(state.shop.upi||"UPI not configured")+'</b></div><button class="btn primary" onclick="shareShopPass()">↗ Share Shop Pass</button>')}
function shareShopPass(){const text=state.shop.name+"\n"+(state.shop.address||"")+"\nUPI: "+(state.shop.upi||"Not configured");if(navigator.share)navigator.share({title:state.shop.name,text}).catch(()=>{});else window.open("https://wa.me/?text="+encodeURIComponent(text),"_blank")}

function openShopSettings(){const s=state.shop;modal('<h2>Shop Profile</h2><input id="shopName" value="'+esc(s.name)+'" placeholder="Shop name"><input id="shopOwner" value="'+esc(s.owner)+'" placeholder="Owner name"><input id="shopPhone" value="'+esc(s.phone)+'" placeholder="Shop phone"><input id="shopUpi" value="'+esc(s.upi)+'" placeholder="UPI ID e.g. shop@upi"><textarea id="shopAddress" placeholder="Shop address">'+esc(s.address)+'</textarea><button class="btn primary" onclick="saveShopSettings()">Save Profile</button>')}
function saveShopSettings(){state.shop={name:(document.getElementById("shopName")?.value||"").trim()||"My Dukaan",owner:(document.getElementById("shopOwner")?.value||"").trim()||"Shop Owner",phone:(document.getElementById("shopPhone")?.value||"").trim(),upi:(document.getElementById("shopUpi")?.value||"").trim(),address:(document.getElementById("shopAddress")?.value||"").trim()};saveState();closeModal();render();toast("Profile saved")}
function openExpenses(){const history=state.expenses.slice(0,50).map(x=>'<div class="activity" data-long-delete data-delete-type="expense" data-delete-id="'+esc(x.id)+'"><div style="display:flex;justify-content:space-between;gap:10px"><span><b>'+esc(x.name)+'</b><small>'+esc(x.mode||"cash")+' • '+new Date(x.date).toLocaleString("en-IN")+'</small></span><b>'+money(x.amount)+'</b></div><small class="muted">Long press to delete</small></div>').join("");modal('<h2>💸 Expenses</h2><p class="muted">Only shop expenses are shown here. Your owner/shop profile details are kept in Shop Profile.</p><input id="exName" placeholder="Expense name"><input id="exAmount" type="number" min="0.01" placeholder="Amount"><select id="exMode"><option>cash</option><option>upi</option><option>bank</option><option>card</option></select><button class="btn primary" onclick="saveExpense()">Save Expense</button><h3>Expense History</h3>'+(history||'<p class="muted">No expenses yet.</p>'))}
function saveExpense(){const n=(document.getElementById("exName")?.value||"").trim(),a=Number(document.getElementById("exAmount")?.value)||0;if(!n||a<=0)return toast("Enter expense details");state.expenses.unshift({id:uid(),name:n,amount:a,mode:document.getElementById("exMode")?.value,date:new Date().toISOString()});saveState();closeModal();render();toast("Expense saved")}
function openReturns(){const history=state.returns.slice(0,50).map(x=>'<div class="activity" data-long-delete data-delete-type="return" data-delete-id="'+esc(x.id)+'"><div style="display:flex;justify-content:space-between;gap:10px"><span><b>'+esc(x.name)+'</b><small>'+new Date(x.date).toLocaleString("en-IN")+'</small></span><b>'+money(x.amount)+'</b></div><small class="muted">Long press to delete</small></div>').join("");modal('<h2>Record Return</h2><input id="retName" placeholder="Item / customer"><input id="retAmount" type="number" min="0.01" placeholder="Return amount"><button class="btn primary" onclick="saveReturn()">Save Return</button><h3>Return History</h3>'+(history||'<p class="muted">No returns yet.</p>'))}
function saveReturn(){const n=(document.getElementById("retName")?.value||"").trim(),a=Number(document.getElementById("retAmount")?.value)||0;if(!n||a<=0)return toast("Enter return details");state.returns.unshift({id:uid(),name:n,amount:a,date:new Date().toISOString()});saveState();closeModal();render();toast("Return recorded")}
function openBackup(){modal('<h2>Backup & Restore</h2><p>Your data is stored on this device/browser.</p><button class="btn" onclick="exportData()">⇩ Download backup</button><label class="btn" style="display:block;text-align:center;margin-top:8px">⇧ Restore backup<input type="file" accept=".json,application/json" onchange="importData(event)" hidden></label>')}
function exportData(){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:"application/json"}));a.download="dukaan-khata-backup.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast("Backup downloaded")}
function importData(e){const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);localStorage.setItem(KEY,JSON.stringify(x));state=loadState();closeModal();render();toast("Backup restored")}catch(err){toast("Invalid backup file")}};r.readAsText(f)}
function openLanguage(){modal('<h2>🌐 Language</h2><p class="muted">Choose your app language.</p><button class="btn" onclick="setLanguage(\'English\')">English</button><button class="btn" onclick="setLanguage(\'Hindi\')">हिन्दी</button><button class="btn" onclick="setLanguage(\'Telugu\')">తెలుగు</button><button class="btn" onclick="setLanguage(\'Kannada\')">ಕನ್ನಡ</button><button class="btn" onclick="setLanguage(\'Marathi\')">मराठी</button>')}
function voiceEntry(){const R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R)return toast("Voice input is not supported in this browser");const r=new R();r.lang=state.settings.language==="Telugu"?"te-IN":state.settings.language==="Hindi"?"hi-IN":"en-IN";r.onresult=e=>toast("Heard: "+e.results[0][0].transcript);r.start()}
function openAbout(){modal('<h2>✦ Dukaan Khata Infinity</h2><p>Simple digital tools for Indian shops.</p><div class="line"><span>Digital Khata</span><b>✓</b></div><div class="line"><span>Many items with individual prices</span><b>✓</b></div><div class="line"><span>UPI QR Receive</span><b>✓</b></div><div class="line"><span>Customer Connect</span><b>✓</b></div><div class="line"><span>Backup & Restore</span><b>✓</b></div>')}
function toggleTheme(){state.settings.theme=document.body.classList.contains("darkmode")?"light":"dark";saveState();render()}
function clearDemo(){if(confirm("Clear all Dukaan Khata data on this device?")){localStorage.removeItem(KEY);state=defaults();render();toast("Data reset")}}

function renderKhata(){const box=document.getElementById("khataList");if(!box)return;const q=(document.getElementById("khataSearch")?.value||"").toLowerCase();box.innerHTML=state.customers.filter(c=>{const b=balance(c.id),received=receivedTotal(c.id),matches=(c.name+" "+c.phone).toLowerCase().includes(q);const show=khataFilter==="all"||(khataFilter==="due"&&b>0)||(khataFilter==="paid"&&received>0);return matches&&show}).map(c=>{const b=balance(c.id),received=receivedTotal(c.id);return '<div class="customer" data-long-delete data-delete-type="customer" data-delete-id="'+esc(c.id)+'"><div onclick="customerView(\''+esc(c.id)+'\')" style="flex:1;cursor:pointer"><h3>'+esc(c.name)+'</h3><small>'+esc(c.phone||"No phone added")+(received>0?" • Paid "+money(received):"")+'</small></div><div style="text-align:right"><div class="'+(b>0?"due":"paid")+'">'+money(b)+'</div>'+(!c.phone?'<button class="btn small" onclick="event.stopPropagation();addCustomerNumber(\''+esc(c.id)+'\')">＋ Add Mobile</button>':"")+'</div></div>'}).join("")||'<p class="muted">No customers found.</p>'}
function renderCustomers(){const box=document.getElementById("customerList");if(!box)return;const q=(document.getElementById("customerSearch")?.value||"").toLowerCase();box.innerHTML=state.customers.filter(c=>(c.name+" "+c.phone).toLowerCase().includes(q)).map(c=>'<div class="customer" data-long-delete data-delete-type="customer" data-delete-id="'+esc(c.id)+'" onclick="customerView(\''+esc(c.id)+'\')"><div><h3>'+esc(c.name)+'</h3><small>'+esc(c.phone||"No phone")+'</small></div><div class="'+(balance(c.id)>0?"due":"paid")+'">'+money(balance(c.id))+'</div></div>').join("")||'<p class="muted">No customers yet.</p>';const due=state.customers.filter(c=>balance(c.id)>0).length;document.getElementById("customerDueCount")&&(document.getElementById("customerDueCount").textContent=due);document.getElementById("customerPaidCount")&&(document.getElementById("customerPaidCount").textContent=state.customers.length-due)}
function renderBills(){const box=document.getElementById("billList");if(!box)return;box.innerHTML=sales().slice(0,50).map(t=>{const c=state.customers.find(x=>x.id===t.customerId);return'<div class="bill" data-long-delete data-delete-type="sale" data-delete-id="'+esc(t.id)+'" onclick="billView(\''+esc(t.id)+'\')"><div><h3>'+esc(c?.name||"Walk-in")+'</h3><small>'+new Date(t.date).toLocaleString("en-IN")+'</small></div><b>'+money(t.total)+'</b></div>'}).join("")||'<p class="muted">No bills yet.</p>'}
function billView(id){const t=state.tx.find(x=>x.id===id);if(!t)return;const c=state.customers.find(x=>x.id===t.customerId);const lines=(t.lines||[]).map(l=>'<div class="line"><span>'+esc(l.name)+' × '+l.qty+'</span><b>'+money(l.total)+'</b></div>').join("");modal('<h2>Bill</h2><p><b>'+esc(c?.name||"Walk-in")+'</b><br><small>'+new Date(t.date).toLocaleString("en-IN")+'</small></p>'+lines+'<div class="line"><b>Total</b><b>'+money(t.total)+'</b></div><button class="btn" style="background:#dc2626" onclick="deleteSale(\''+esc(id)+'\')">Delete Bill</button>')}
function deleteSale(id){if(!state.tx.some(t=>t.id===id))return;if(!confirm("Delete this bill?"))return;state.tx=state.tx.filter(t=>t.id!==id);saveState();closeModal();render();toast("Bill deleted")}
function deleteTransaction(id){
  const t=state.tx.find(x=>x.id===id);if(!t)return;
  const label=t.type==="sale"?"sale/bill":"payment";
  if(!confirm("Delete this "+label+" transaction?"))return;
  state.tx=state.tx.filter(x=>x.id!==id);saveState();closeModal();render();toast("Transaction deleted")
}
function deleteExpense(id){const x=state.expenses.find(e=>e.id===id);if(!x)return;if(!confirm("Delete this expense?"))return;state.expenses=state.expenses.filter(e=>e.id!==id);saveState();closeModal();render();toast("Expense deleted")}
function deleteReturn(id){const x=state.returns.find(e=>e.id===id);if(!x)return;if(!confirm("Delete this return?"))return;state.returns=state.returns.filter(e=>e.id!==id);saveState();closeModal();render();toast("Return deleted")}
function deleteReminder(id){const x=state.reminders.find(e=>e.id===id);if(!x)return;if(!confirm("Delete this reminder?"))return;state.reminders=state.reminders.filter(e=>e.id!==id);saveState();closeModal();render();toast("Reminder deleted")}
function filterKhata(f,el){khataFilter=f;document.querySelectorAll(".segmented button").forEach(x=>x.classList.remove("active"));el?.classList.add("active");renderKhata()}

function renderReports(){const chart=document.getElementById("activityChart");if(chart){const days=[];for(let n=6;n>=0;n--){const d=new Date();d.setDate(d.getDate()-n);days.push({d,v:sales().filter(t=>new Date(t.date).toDateString()===d.toDateString()).reduce((a,t)=>a+(Number(t.total)||0),0)})}const max=Math.max(1,...days.map(x=>x.v));chart.innerHTML=days.map(x=>'<div class="bar" style="height:'+Math.max(7,x.v/max*125)+'px"><small>'+x.d.toLocaleDateString("en-IN",{weekday:"short"})+'</small></div>').join("")}const top=document.getElementById("topCustomers");if(top)top.innerHTML=state.customers.map(c=>({c,v:balance(c.id)})).sort((a,b)=>b.v-a.v).slice(0,5).map(x=>'<div class="line"><span>'+esc(x.c.name)+'</span><b class="'+(x.v>0?"due":"paid")+'">'+money(x.v)+'</b></div>').join("")||'<p class="muted">No customers yet.</p>'}
function render(){const now=new Date(),today=now.toDateString(),tod=state.tx.filter(t=>new Date(t.date).toDateString()===today);const revenue=sales().reduce((a,t)=>a+(Number(t.total)||0),0),received=payments().reduce((a,t)=>a+(Number(t.amount)||0),0),due=state.customers.reduce((a,c)=>a+Math.max(0,balance(c.id)),0),expenses=state.expenses.reduce((a,t)=>a+(Number(t.amount)||0),0);const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};set("ownerHeader",state.shop.name+" • Infinity");set("greeting",(now.getHours()<12?"Good morning":now.getHours()<17?"Good afternoon":"Good evening")+" 👋");set("todayLabel",now.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"}));set("totalDue",money(due));set("todaySales",money(tod.filter(t=>t.type==="sale").reduce((a,t)=>a+(Number(t.total)||0),0)));set("todaySalesCount",tod.filter(t=>t.type==="sale").length+" bills");set("todayPaid",money(tod.filter(t=>t.type==="payment").reduce((a,t)=>a+(Number(t.amount)||0),0)));set("customerCount",state.customers.length);set("newCustomers",state.customers.length+" active");set("overdueCount",state.customers.filter(c=>balance(c.id)>0).length+" with due");set("collectionRate",revenue?Math.round(received/revenue*100)+"% collected":"0% collected");set("rRevenue",money(revenue));set("rCredit",money(Math.max(0,revenue-received)));set("rPaid",money(received));set("rExpense",money(expenses));set("rTx",state.tx.length);const rec=document.getElementById("recent");if(rec)rec.innerHTML=state.tx.slice(0,6).map(t=>'<div class="activity" data-long-delete data-delete-type="transaction" data-delete-id="'+esc(t.id)+'"><div style="display:flex;justify-content:space-between"><span>'+(t.type==="sale"?"🧾":"💰")+' '+esc(state.customers.find(c=>c.id===t.customerId)?.name||"Customer")+'</span><b>'+money(t.type==="sale"?t.total:t.amount)+'</b></div><small class="muted">'+(t.type==="sale"?"Sale":"Payment")+' • Long press to delete</small></div>').join("")||'<p class="muted">No activity yet.</p>';renderKhata();renderCustomers();renderBills();renderReports();document.body.classList.toggle("darkmode",state.settings.theme==="dark");if(window.applyLanguage)setTimeout(window.applyLanguage,0)}

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
document.addEventListener("DOMContentLoaded",()=>{setupLongPress();render();applyHomeLogo();applyOutstandingColor();window.__DUKAAN_READY__=true});
