const KEY="dukaan_khata_infinity_v1";
let state=loadState(), khataFilter="all", pendingManyCustomerId=null;

function loadState(){
  try{
    const x=JSON.parse(localStorage.getItem(KEY));
    if(x) return x;
  }catch(e){}
  return {shop:{name:"My Dukaan",owner:"Shop Owner",phone:"",upi:"",address:""},customers:[],items:[],tx:[],expenses:[],returns:[],reminders:[],settings:{theme:"light",language:"English"}};
}
function saveState(){localStorage.setItem(KEY,JSON.stringify(state))}
function uid(){return (crypto&&crypto.randomUUID)?crypto.randomUUID():Date.now()+"-"+Math.random().toString(16).slice(2)}
function money(n){return "₹"+Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2})}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function balance(id){return state.tx.filter(t=>t.customerId===id).reduce((s,t)=>s+(t.type==="sale"?Number(t.total)||0:-(Number(t.amount)||0)),0)}
function sales(){return state.tx.filter(t=>t.type==="sale")}
function payments(){return state.tx.filter(t=>t.type==="payment")}
function toast(msg){const t=document.getElementById("toast");if(!t)return;t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
function modal(html){const m=document.getElementById("modal"),b=document.getElementById("modalBody");if(!m||!b)return;b.innerHTML=html;m.classList.remove("hidden")}
function closeModal(){document.getElementById("modal")?.classList.add("hidden")}
function showPage(id){document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));document.getElementById(id)?.classList.add("active");document.querySelectorAll(".bottom-nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===id));render()}
function openSearch(){modal('<h2>Search</h2><input id="globalSearch" autofocus placeholder="Customer, item, phone..." oninput="globalResults()"><div id="globalResults"></div>');globalResults()}
function globalResults(){
  const box=document.getElementById("globalResults");if(!box)return;
  const q=(document.getElementById("globalSearch")?.value||"").toLowerCase();
  const c=state.customers.filter(x=>(x.name+" "+x.phone).toLowerCase().includes(q)).slice(0,8);
  box.innerHTML=c.map(x=>`<div class="customer" onclick="closeModal();customerView('${esc(x.id)}')"><div><b>${esc(x.name)}</b><small>Customer • ${esc(x.phone||"")}</small></div><b>${money(balance(x.id))}</b></div>`).join("")||'<p class="muted">No customers found.</p>';
}

function openManyItems(customerId){
  if(!state.customers.length){pendingManyCustomerId=null;return addCustomer("many")}
  if(!customerId){
    const opts=state.customers.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join("");
    modal('<h2>＋ Add Items to Khata</h2><select id="manyCustomer">'+opts+'</select><button class="btn primary" type="button" id="chooseCustomerBtn">Continue</button>');
    document.getElementById("chooseCustomerBtn")?.addEventListener("click",()=>{const id=document.getElementById("manyCustomer")?.value;if(id)showManyItemsForm(id)});
    return;
  }
  showManyItemsForm(customerId);
}
function continueManyItems(){const id=document.getElementById("manyCustomer")?.value;if(id)showManyItemsForm(id)}
function openSale(customerId){openManyItems(customerId)}
function showManyItemsForm(customerId){
  const c=state.customers.find(x=>x.id===customerId);if(!c)return;
  modal('<h2>＋ Add Items</h2><p><b>'+esc(c.name)+'</b></p><div id="manyRows"></div><button class="btn" type="button" id="addManyRowBtn">＋ Add another item</button><div class="line"><b>Total</b><b id="manyTotal">₹0</b></div><button class="btn primary" type="button" id="saveManyBtn">Save to Khata</button>');
  document.getElementById("addManyRowBtn")?.addEventListener("click",addManyRow);
  document.getElementById("saveManyBtn")?.addEventListener("click",()=>saveManyItems(customerId));
  addManyRow();
}
function addManyRow(){
  const box=document.getElementById("manyRows");if(!box)return;
  const row=document.createElement("div");row.className="row many-row";row.style.margin="8px 0";
  row.innerHTML='<input class="many-name" placeholder="Item name"><input class="many-price" type="number" min="0" step="0.01" placeholder="Price"><button class="btn small many-remove" type="button">✕</button>';
  box.appendChild(row);
  row.querySelector(".many-price").addEventListener("input",recalcManyItems);
  row.querySelector(".many-remove").addEventListener("click",()=>{row.remove();recalcManyItems()});
  recalcManyItems();
}
function recalcManyItems(){
  let total=0;
  document.querySelectorAll("#manyRows .many-row").forEach(r=>total+=Math.max(0,Number(r.querySelector(".many-price")?.value)||0));
  const e=document.getElementById("manyTotal");if(e)e.textContent=money(total);
}
function saveManyItems(customerId){
  const lines=[];
  document.querySelectorAll("#manyRows .many-row").forEach(r=>{
    const name=(r.querySelector(".many-name")?.value||"").trim();
    const price=Number(r.querySelector(".many-price")?.value)||0;
    if(name&&price>0)lines.push({name,qty:1,price,total:price});
  });
  const total=lines.reduce((s,x)=>s+x.total,0);
  if(!lines.length)return toast("Add item name and price");
  state.tx.unshift({id:uid(),type:"sale",customerId,total,paid:0,mode:"credit",lines,date:new Date().toISOString()});
  saveState();closeModal();render();toast("Items saved to Khata");
}
function addCustomer(returnToSale=false){
  const target=JSON.stringify(returnToSale);
  modal('<h2>New Customer</h2><input id="cname" placeholder="Customer name"><input id="cphone" inputmode="tel" placeholder="WhatsApp / mobile number"><textarea id="caddress" placeholder="Address (optional)"></textarea><button class="btn primary" onclick="saveCustomer('+target+')">Save Customer</button>');
}
function saveCustomer(returnToSale){
  const name=document.getElementById("cname")?.value.trim();if(!name)return toast("Enter customer name");
  const c={id:uid(),name,phone:document.getElementById("cphone")?.value.trim()||"",address:document.getElementById("caddress")?.value.trim()||"",created:new Date().toISOString()};
  state.customers.unshift(c);saveState();closeModal();render();
  if(returnToSale==="many"){pendingManyCustomerId=c.id;return openManyItems(c.id)}
  toast("Customer added");
}
function editCustomer(id){
  const c=state.customers.find(x=>x.id===id);if(!c)return;
  modal('<h2>Edit Customer</h2><input id="editCName" value="'+esc(c.name)+'" placeholder="Customer name"><input id="editCPhone" inputmode="tel" value="'+esc(c.phone)+'" placeholder="WhatsApp / mobile number"><textarea id="editCAddress" placeholder="Address">'+esc(c.address)+'</textarea><button class="btn primary" onclick="saveCustomerEdit(\''+esc(id)+'\')">Save Customer</button>');
}
function saveCustomerEdit(id){
  const c=state.customers.find(x=>x.id===id);if(!c)return;
  const name=document.getElementById("editCName")?.value.trim();if(!name)return toast("Enter customer name");
  c.name=name;c.phone=document.getElementById("editCPhone")?.value.trim()||"";c.address=document.getElementById("editCAddress")?.value.trim()||"";
  saveState();closeModal();render();toast("Customer updated");
}
function addCustomerNumber(id){editCustomer(id)}

function addItem(returnToSale=false){
  modal('<h2>Add Item</h2><input id="iname" placeholder="Item name" autocomplete="off"><input id="icost" type="number" min="0" step="0.01" placeholder="Item cost"><button class="btn primary" type="button" id="saveItemBtn">Save Item</button>');
  document.getElementById("saveItemBtn")?.addEventListener("click",()=>saveItem(returnToSale));
  document.getElementById("iname")?.focus();
}
function saveItem(returnToSale=false){
  const name=(document.getElementById("iname")?.value||"").trim();
  const cost=Number(document.getElementById("icost")?.value);
  if(!name){toast("Enter item name");return false}
  if(!Number.isFinite(cost)||cost<=0){toast("Enter item cost");return false}
  const item={id:uid(),name,price:cost,cost:cost,unit:"pcs",stock:0,min:0};
  state.items.unshift(item);
  saveState();
  closeModal();
  render();
  toast("Item saved successfully");
  if(returnToSale==="many")openManyItems(pendingManyCustomerId||undefined);
  return true;
}
function deleteItem(id){const i=state.items.find(x=>x.id===id);if(!i)return;if(!confirm('Delete "'+i.name+'"?'))return;state.items=state.items.filter(x=>x.id!==id);saveState();render();toast("Item deleted")}
function deleteCustomer(id){const c=state.customers.find(x=>x.id===id);if(!c)return;if(!confirm("Delete "+c.name+"?"))return;state.customers=state.customers.filter(x=>x.id!==id);state.tx=state.tx.filter(x=>x.customerId!==id);state.reminders=state.reminders.filter(x=>x.customerId!==id);saveState();closeModal();render();toast("Customer deleted")}

function customerView(id){
  const c=state.customers.find(x=>x.id===id);if(!c)return;
  const b=balance(id),tx=state.tx.filter(x=>x.customerId===id).slice(0,30);
  const grouped={};
  tx.filter(t=>t.type==="sale").forEach(t=>(t.lines||[]).forEach(l=>{const k=l.itemId||l.name;grouped[k]??={name:l.name,qty:0,total:0};grouped[k].qty+=Number(l.qty)||0;grouped[k].total+=Number(l.total)||0}));
  const items=Object.values(grouped).map(x=>'<div class="line"><span>📦 '+esc(x.name)+' × '+x.qty+'</span><b>'+money(x.total)+'</b></div>').join("")||'<p class="muted">No items yet.</p>';
  const history=tx.map(t=>t.type==="sale"?'<div class="card"><div class="line"><span>🧾 Sale</span><b>'+money(t.total)+'</b></div><small>'+esc((t.lines||[]).map(l=>l.name+" × "+l.qty).join(" • "))+'</small></div>':'<div class="line"><span>💰 Payment • '+esc(t.mode||"")+'</span><b>'+money(t.amount)+'</b></div>').join("")||'<p class="muted">No transactions.</p>';
  modal('<h2>'+esc(c.name)+'</h2><p>'+esc(c.phone||"No phone added")+'</p><div class="'+(b>0?"due":"paid")+'" style="font-size:28px;margin:10px 0">'+money(b)+' <small>'+(b>0?"due":"clear")+'</small></div><button class="btn primary" onclick="openManyItems(\''+esc(id)+'\')">＋ Add Many Items to This Khata</button><h3>Items in Khata</h3>'+items+'<div class="row"><button class="btn" onclick="editCustomer(\''+esc(id)+'\')">✎ Edit / Add Number</button><button class="btn" onclick="openReceive(\''+esc(id)+'\')">⌁ Receive</button></div><div class="row"><button class="btn" onclick="shareCustomer(\''+esc(id)+'\')">💬 WhatsApp</button><button class="btn" onclick="callCustomer(\''+esc(id)+'\')">☎ Call</button></div><h3>History</h3>'+history);
}

function openReceive(customerId){
  const opts=state.customers.length?state.customers.map(c=>'<option value="'+esc(c.id)+'" '+(c.id===customerId?"selected":"")+'>'+esc(c.name)+'</option>').join(""):'<option value="">Walk-in</option>';
  modal('<h2>Smart Receive</h2><div class="receive-tabs"><button class="active" onclick="switchReceiveTab(\'qr\',this)">UPI QR</button><button onclick="switchReceiveTab(\'record\',this)">Record payment</button></div><div id="receiveQR"><p class="muted">Show this QR to receive money.</p><input id="qrAmount" type="number" min="1" placeholder="Amount (optional)" oninput="refreshQR()"><div class="qr-card"><div id="qrBox"></div><b id="qrCaption">'+esc(state.shop.upi||"Add UPI ID in Shop Profile")+'</b></div><div class="row"><button class="btn primary" onclick="sharePaymentLink()">↗ Share</button><button class="btn" onclick="copyUPILink()">Copy UPI link</button></div></div><div id="receiveRecord" class="hidden"><select id="payCustomer">'+opts+'</select><input id="payAmount" type="number" min="1" placeholder="Amount received"><select id="payMode"><option value="cash">Cash</option><option value="upi">UPI</option><option value="bank">Bank</option><option value="card">Card</option></select><button class="btn primary" onclick="savePayment()">Save Payment</button></div>');
  setTimeout(refreshQR,100);
}
function switchReceiveTab(tab,el){document.querySelectorAll(".receive-tabs button").forEach(x=>x.classList.remove("active"));el?.classList.add("active");document.getElementById("receiveQR")?.classList.toggle("hidden",tab!=="qr");document.getElementById("receiveRecord")?.classList.toggle("hidden",tab!=="record");if(tab==="qr")refreshQR()}
function upiLink(){const id=(state.shop.upi||"").trim();if(!id)return"";const a=Number(document.getElementById("qrAmount")?.value||0);return"upi://pay?pa="+encodeURIComponent(id)+"&pn="+encodeURIComponent(state.shop.name)+"&cu=INR"+(a>0?"&am="+a:"")}
function refreshQR(){const box=document.getElementById("qrBox"),cap=document.getElementById("qrCaption");if(!box)return;box.innerHTML="";const link=upiLink();if(!link){box.innerHTML='<div class="qr-empty">Add UPI ID in Shop Profile</div>';if(cap)cap.textContent="No UPI ID configured";return}if(window.QRCode)new QRCode(box,{text:link,width:190,height:190,correctLevel:QRCode.CorrectLevel.M});if(cap)cap.textContent=state.shop.upi}
function copyUPILink(){const x=upiLink();if(!x)return toast("Add UPI ID first");if(navigator.clipboard?.writeText)navigator.clipboard.writeText(x).then(()=>toast("UPI link copied")).catch(()=>toast(x));else toast(x)}
function sharePaymentLink(){const x=upiLink();if(!x)return toast("Add UPI ID first");const text="Pay "+state.shop.name+"\n"+x;if(navigator.share)navigator.share({title:"Payment",text}).catch(()=>{});else window.open("https://wa.me/?text="+encodeURIComponent(text),"_blank")}
function savePayment(){const a=Number(document.getElementById("payAmount")?.value)||0;if(a<=0)return toast("Enter a valid amount");state.tx.unshift({id:uid(),type:"payment",customerId:document.getElementById("payCustomer")?.value||"",amount:a,mode:document.getElementById("payMode")?.value||"cash",date:new Date().toISOString()});saveState();closeModal();render();toast("Payment recorded")}

function shareCustomer(id){const c=state.customers.find(x=>x.id===id),p=(c?.phone||"").replace(/\D/g,"");if(!p)return toast("Add customer phone first");window.open("https://wa.me/"+(p.length===10?"91":"")+p+"?text="+encodeURIComponent("Hello "+c.name+" 👋 Your Dukaan Khata balance is "+money(balance(id))+".") ,"_blank")}
function callCustomer(id){const c=state.customers.find(x=>x.id===id),p=(c?.phone||"").replace(/\D/g,"");if(!p)return toast("Add customer phone first");location.href="tel:"+p}
function remindCustomer(id){const c=state.customers.find(x=>x.id===id);if(!c||balance(id)<=0)return toast("No due balance");const p=(c.phone||"").replace(/\D/g,"");state.reminders.unshift({id:uid(),customerId:id,amount:balance(id),date:new Date().toISOString()});saveState();if(p)window.open("https://wa.me/"+(p.length===10?"91":"")+p+"?text="+encodeURIComponent("Reminder from "+state.shop.name+": outstanding "+money(balance(id))),"_blank");toast("Reminder prepared")}
function openCustomerHub(){if(!state.customers.length)return modal('<h2>Customer Connect</h2><p>No customers yet.</p><button class="btn primary" onclick="closeModal();addCustomer()">＋ Add Customer</button>');const o=state.customers.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join("");modal('<h2>Customer Connect</h2><select id="hubCustomer">'+o+'</select><button class="btn" onclick="shareCustomer(document.getElementById(\'hubCustomer\').value)">💬 WhatsApp</button><button class="btn" onclick="callCustomer(document.getElementById(\'hubCustomer\').value)">☎ Call</button><button class="btn" onclick="customerView(document.getElementById(\'hubCustomer\').value)">◉ Open Customer</button>')}
function openReminderCenter(){const a=state.customers.filter(c=>balance(c.id)>0);modal('<h2>Reminder Center</h2>'+(a.map(c=>'<div class="customer"><div><b>'+esc(c.name)+'</b><small>Due '+money(balance(c.id))+'</small></div><button class="btn small" onclick="remindCustomer(\''+esc(c.id)+'\')">🔔 Remind</button></div>').join("")||'<p class="muted">No outstanding customers.</p>'))}
function openDigitalPass(){const s=state.shop;modal('<h2>✦ Digital Shop Pass</h2><div class="digital-pass"><div class="pass-logo">₹</div><h3>'+esc(s.name)+'</h3><p>'+esc(s.owner)+'</p><p>'+esc(s.address||"Indian small business")+'</p><b>'+esc(s.upi||"UPI not configured")+'</b></div><button class="btn primary" onclick="shareShopPass()">↗ Share Shop Pass</button>')}
function shareShopPass(){const text=state.shop.name+"\n"+(state.shop.address||"")+"\nUPI: "+(state.shop.upi||"Not configured");if(navigator.share)navigator.share({title:state.shop.name,text}).catch(()=>{});else window.open("https://wa.me/?text="+encodeURIComponent(text),"_blank")}

function openExpenses(){modal('<h2>Record Expense</h2><input id="exName" placeholder="Expense name"><input id="exAmount" type="number" placeholder="Amount"><select id="exMode"><option>cash</option><option>upi</option><option>bank</option><option>card</option></select><button class="btn primary" onclick="saveExpense()">Save Expense</button>')}
function saveExpense(){const n=document.getElementById("exName")?.value.trim(),a=Number(document.getElementById("exAmount")?.value)||0;if(!n||a<=0)return toast("Enter expense details");state.expenses.unshift({id:uid(),name:n,amount:a,mode:document.getElementById("exMode")?.value,date:new Date().toISOString()});saveState();closeModal();render();toast("Expense saved")}
function openReturns(){modal('<h2>Record Return</h2><input id="retName" placeholder="Item / customer"><input id="retAmount" type="number" placeholder="Return amount"><button class="btn primary" onclick="saveReturn()">Save Return</button>')}
function saveReturn(){const n=document.getElementById("retName")?.value.trim(),a=Number(document.getElementById("retAmount")?.value)||0;if(!n||a<=0)return toast("Enter return details");state.returns.unshift({id:uid(),name:n,amount:a,date:new Date().toISOString()});saveState();closeModal();render();toast("Return recorded")}
function openShopSettings(){const s=state.shop;modal('<h2>Shop Profile</h2><input id="shopName" value="'+esc(s.name)+'" placeholder="Shop name"><input id="shopOwner" value="'+esc(s.owner)+'" placeholder="Owner name"><input id="shopPhone" value="'+esc(s.phone)+'" placeholder="Shop phone"><input id="shopUpi" value="'+esc(s.upi)+'" placeholder="UPI ID e.g. shop@upi"><textarea id="shopAddress" placeholder="Shop address">'+esc(s.address)+'</textarea><button class="btn primary" onclick="saveShopSettings()">Save Profile</button>')}
function saveShopSettings(){state.shop={name:document.getElementById("shopName")?.value.trim()||"My Dukaan",owner:document.getElementById("shopOwner")?.value.trim()||"Shop Owner",phone:document.getElementById("shopPhone")?.value.trim()||"",upi:document.getElementById("shopUpi")?.value.trim()||"",address:document.getElementById("shopAddress")?.value.trim()||""};saveState();closeModal();render();toast("Profile saved")}
function openBackup(){modal('<h2>Backup & Restore</h2><p>Your data is stored on this device.</p><button class="btn" onclick="exportData()">⇩ Download backup</button><label class="btn" style="display:block;text-align:center;margin-top:8px">⇧ Restore backup<input type="file" accept=".json" onchange="importData(event)" hidden></label>')}
function exportData(){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:"application/json"}));a.download="dukaan-khata-backup.json";a.click();toast("Backup downloaded")}
function importData(e){const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{state=JSON.parse(r.result);saveState();closeModal();render();toast("Backup restored")}catch(x){toast("Invalid backup file")}};r.readAsText(f)}
function openLanguage(){modal('<h2>Language</h2><button class="btn" onclick="setLanguage(\'English\')">English</button><button class="btn" onclick="setLanguage(\'Hindi\')">हिन्दी</button><button class="btn" onclick="setLanguage(\'Telugu\')">తెలుగు</button>')}
function voiceEntry(){const R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R)return toast("Voice input is not supported");const r=new R();r.lang=state.settings.language==="Telugu"?"te-IN":state.settings.language==="Hindi"?"hi-IN":"en-IN";r.onresult=e=>toast("Heard: "+e.results[0][0].transcript);r.start()}
function openAbout(){modal('<h2>✦ Dukaan Khata Infinity</h2><p>Smart digital tools for Indian shops.</p><div class="line"><span>Digital Khata</span><b>✓</b></div><div class="line"><span>UPI QR Receive</span><b>✓</b></div><div class="line"><span>Customer Khata Items</span><b>✓</b></div><div class="line"><span>Backup</span><b>✓</b></div>')}
function toggleTheme(){document.body.classList.toggle("darkmode");state.settings.theme=document.body.classList.contains("darkmode")?"dark":"light";saveState()}
function clearDemo(){if(confirm("Clear all Dukaan Khata data on this device?")){localStorage.removeItem(KEY);state=loadState();render();toast("Data reset")}}

function renderKhata(){
  const box=document.getElementById("khataList");if(!box)return;
  const q=(document.getElementById("khataSearch")?.value||"").toLowerCase();
  box.innerHTML=state.customers.filter(c=>{const b=balance(c.id);return(c.name+" "+c.phone).toLowerCase().includes(q)&&(khataFilter==="all"||(khataFilter==="due"&&b>0)||(khataFilter==="paid"&&b<=0))}).map(c=>'<div class="customer" data-long-delete data-delete-type="customer" data-delete-id="'+esc(c.id)+'"><div onclick="customerView(\''+esc(c.id)+'\')" style="flex:1;cursor:pointer"><h3>'+esc(c.name)+'</h3><small>'+esc(c.phone||"No phone added")+'</small></div><div style="text-align:right"><div class="'+(balance(c.id)>0?"due":"paid")+'">'+money(balance(c.id))+'</div>'+(!c.phone?'<button class="btn small" onclick="event.stopPropagation();addCustomerNumber(\''+esc(c.id)+'\')">＋ Add Mobile</button>':"")+'</div></div>').join("")||'<p class="muted">No customers found.</p>';
}
function renderCustomers(){
  const box=document.getElementById("customerList");if(!box)return;const q=(document.getElementById("customerSearch")?.value||"").toLowerCase();
  box.innerHTML=state.customers.filter(c=>(c.name+" "+c.phone).toLowerCase().includes(q)).map(c=>'<div class="customer" data-long-delete data-delete-type="customer" data-delete-id="'+esc(c.id)+'" onclick="customerView(\''+esc(c.id)+'\')"><div><h3>'+esc(c.name)+'</h3><small>'+esc(c.phone||"No phone")+'</small></div><div class="'+(balance(c.id)>0?"due":"paid")+'">'+money(balance(c.id))+'</div></div>').join("")||'<p class="muted">No customers yet.</p>';
  const due=state.customers.filter(c=>balance(c.id)>0).length;document.getElementById("customerDueCount")&&(document.getElementById("customerDueCount").textContent=due);document.getElementById("customerPaidCount")&&(document.getElementById("customerPaidCount").textContent=state.customers.length-due);
}
function renderItems(){
  const box=document.getElementById("itemList");if(!box)return;const q=(document.getElementById("itemSearch")?.value||"").toLowerCase();
  box.innerHTML=state.items.filter(i=>i.name.toLowerCase().includes(q)).map(i=>'<div class="item" data-long-delete data-delete-type="item" data-delete-id="'+esc(i.id)+'"><div><h3>'+esc(i.name)+'</h3><small>'+money(i.price)+' / '+esc(i.unit)+' • Stock '+i.stock+'</small></div><b class="'+(i.stock<=i.min?"due":"paid")+'">'+(i.stock<=i.min?"LOW":"OK")+'</b></div>').join("")||'<p class="muted">No inventory items.</p>';
}
function renderBills(){
  const box=document.getElementById("billList");if(!box)return;
  box.innerHTML=sales().slice(0,40).map(t=>{const c=state.customers.find(x=>x.id===t.customerId);return '<div class="bill" data-long-delete data-delete-type="sale" data-delete-id="'+esc(t.id)+'"><div><h3>'+esc(c?.name||"Walk-in")+'</h3><small>'+new Date(t.date).toLocaleString("en-IN")+'</small></div><b>'+money(t.total)+'</b></div>'}).join("")||'<p class="muted">No bills yet.</p>';
}
function deleteSale(id){const t=state.tx.find(x=>x.id===id);if(!t)return;if(!confirm("Delete this sale?"))return;state.tx=state.tx.filter(x=>x.id!==id);saveState();render();toast("Sale deleted")}
function deletePayment(id){state.tx=state.tx.filter(x=>x.id!==id);saveState();render();toast("Payment deleted")}
function filterKhata(f,el){khataFilter=f;document.querySelectorAll(".segmented button").forEach(x=>x.classList.remove("active"));el?.classList.add("active");renderKhata()}

function render(){
  const now=new Date(),today=now.toDateString(),tod=state.tx.filter(t=>new Date(t.date).toDateString()===today);
  const sToday=tod.filter(t=>t.type==="sale").reduce((a,t)=>a+(Number(t.total)||0),0),pToday=tod.filter(t=>t.type==="payment").reduce((a,t)=>a+(Number(t.amount)||0),0);
  const revenue=sales().reduce((a,t)=>a+(Number(t.total)||0),0),received=payments().reduce((a,t)=>a+(Number(t.amount)||0),0),due=state.customers.reduce((a,c)=>a+Math.max(0,balance(c.id)),0),expenses=state.expenses.reduce((a,t)=>a+(Number(t.amount)||0),0);
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
  set("ownerHeader",state.shop.name+" • Infinity");set("greeting",(now.getHours()<12?"Good morning":now.getHours()<17?"Good afternoon":"Good evening")+" 👋");set("todayLabel",now.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"}));set("totalDue",money(due));set("todaySales",money(sToday));set("todaySalesCount",tod.filter(t=>t.type==="sale").length+" bills");set("todayPaid",money(pToday));set("customerCount",state.customers.length);set("newCustomers",state.customers.length+" active");set("overdueCount",state.customers.filter(c=>balance(c.id)>0).length+" with due");set("collectionRate",revenue?Math.round(received/revenue*100)+"% collected":"0% collected");set("rRevenue",money(revenue));set("rCredit",money(Math.max(0,revenue-received)));set("rPaid",money(received));set("rExpense",money(expenses));set("rTx",state.tx.length);set("itemCount",state.items.length);set("stockValue",money(state.items.reduce((a,i)=>a+(Number(i.stock)||0)*(Number(i.cost)||0),0)));
  const rec=document.getElementById("recent");if(rec)rec.innerHTML=state.tx.slice(0,6).map(t=>'<div class="activity"><div style="display:flex;justify-content:space-between"><span>'+(t.type==="sale"?"🧾":"💰")+' '+esc(state.customers.find(c=>c.id===t.customerId)?.name||"Customer")+'</span><b>'+money(t.type==="sale"?t.total:t.amount)+'</b></div><small class="muted">'+(t.type==="sale"?"Sale":"Payment")+'</small></div>').join("")||'<p class="muted">No activity yet.</p>';
  renderKhata();renderCustomers();renderItems();renderBills();renderReports();
  document.body.classList.toggle("darkmode",state.settings.theme==="dark");
  if(window.applyLanguage)setTimeout(window.applyLanguage,0);
}
function renderReports(){
  const chart=document.getElementById("activityChart");if(chart){const days=[];for(let n=6;n>=0;n--){const d=new Date();d.setDate(d.getDate()-n);days.push({d,v:sales().filter(t=>new Date(t.date).toDateString()===d.toDateString()).reduce((a,t)=>a+t.total,0)})}const max=Math.max(1,...days.map(x=>x.v));chart.innerHTML=days.map(x=>'<div class="bar" style="height:'+Math.max(7,x.v/max*125)+'px"><small>'+x.d.toLocaleDateString("en-IN",{weekday:"short"})+'</small></div>').join("")}
  const top=document.getElementById("topCustomers");if(top)top.innerHTML=state.customers.map(c=>({c,v:balance(c.id)})).sort((a,b)=>b.v-a.v).slice(0,5).map(x=>'<div class="line"><span>'+esc(x.c.name)+'</span><b class="'+(x.v>0?"due":"paid")+'">'+money(x.v)+'</b></div>').join("")||'<p class="muted">No customers yet.</p>';
}

let lp=null;
function setupLongPressDelete(){
  document.addEventListener("pointerdown",e=>{const el=e.target.closest?.("[data-long-delete]");if(!el)return;lp={el,t:setTimeout(()=>{lp.fired=true;deleteRecord(el.dataset.deleteType,el.dataset.deleteId)},700),fired:false}});
  const cancel=()=>{if(lp){clearTimeout(lp.t);lp=null}};
  document.addEventListener("pointerup",()=>{if(lp?.fired){lp=null}else cancel()});
  document.addEventListener("pointercancel",cancel);
  document.addEventListener("pointermove",e=>{if(lp&&Math.abs(e.movementX)+Math.abs(e.movementY)>12)cancel()});
}
function deleteRecord(type,id){if(type==="customer")deleteCustomer(id);else if(type==="item")deleteItem(id);else if(type==="sale")deleteSale(id);else if(type==="payment")deletePayment(id)}

document.addEventListener("DOMContentLoaded",()=>{setupLongPressDelete();render()});
