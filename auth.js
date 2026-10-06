// Dukaan Khata — local-first mode
// No login, password, OTP, phone verification, or Supabase dependency.
window.DukaanKhataMode="local-first";
window.DukaanKhataUser=null;

function openDukaanLogin(){
  const name=(window.state?.shop?.owner||"").trim();
  const phone=(window.state?.shop?.phone||"").trim();
  if(typeof modal!=="function") return;
  modal('<h2>🔐 Owner Login</h2><p class="muted">Simple local login — no OTP or password required.</p><input id="loginOwnerName" value="'+esc(name)+'" placeholder="Owner name"><input id="loginOwnerPhone" value="'+esc(phone)+'" inputmode="tel" placeholder="Mobile number"><button class="btn primary" id="loginContinueBtn">Continue</button>');
  document.getElementById("loginContinueBtn")?.addEventListener("click",()=>{
    const n=(document.getElementById("loginOwnerName")?.value||"").trim();
    if(!n)return toast("Enter owner name");
    if(window.state?.shop){state.shop.owner=n;state.shop.phone=(document.getElementById("loginOwnerPhone")?.value||"").trim();saveState();render();}
    closeModal();toast("Login saved ✓");
  });
}
function closeDukaanAuthPanel(){}
function openDukaanProfile(){ if(typeof openShopSettings==="function") openShopSettings(); }
function logoutDukaanKhata(){ toast("Dukaan Khata is running without login."); }
function updateDukaanProfileButton(){}
window.openDukaanLogin=openDukaanLogin;
window.openDukaanProfile=openDukaanProfile;
window.logoutDukaanKhata=logoutDukaanKhata;
