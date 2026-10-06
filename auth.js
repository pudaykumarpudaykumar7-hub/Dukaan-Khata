// Dukaan Khata — simple account access
window.DukaanKhataMode="local-first";
window.DukaanKhataUser=JSON.parse(localStorage.getItem("dukaan_khata_account")||"null");

function saveAccount(user){window.DukaanKhataUser=user;localStorage.setItem("dukaan_khata_account",JSON.stringify(user||null));}
function openDukaanLogin(){
  if(typeof modal!=="function")return;
  const u=window.DukaanKhataUser;
  if(u){
    const name=esc(u.name||"Google account"),email=esc(u.email||"");
    modal('<h2>🔐 Login Access</h2><div class="card"><div style="font-size:34px;text-align:center">👤</div><h3 style="text-align:center;margin:8px 0">'+name+'</h3><p class="muted" style="text-align:center">'+email+'</p></div><button class="btn primary" onclick="logoutDukaanKhata()">Logout</button><button class="btn" onclick="closeModal()">Close</button>');
    return;
  }
  modal('<h2>🔐 Login Access</h2><p class="muted">Sign in to keep your account access available on this device.</p><button class="btn primary" id="googleLoginBtn">🔵 Continue with Google</button><p id="googleLoginMsg" class="muted" style="font-size:12px;margin-top:10px">Google sign-in requires the Google authentication connection to be configured for this site.</p>');
  document.getElementById("googleLoginBtn")?.addEventListener("click",startGoogleLogin);
}
function startGoogleLogin(){
  if(window.google?.accounts?.id){
    toast("Google sign-in is ready. Choose your Google account.");
    return;
  }
  const msg=document.getElementById("googleLoginMsg");
  if(msg)msg.textContent="Google authentication is not connected yet. The button is ready for the site's Google OAuth connection.";
  toast("Google login connection is not configured");
}
function logoutDukaanKhata(){
  saveAccount(null);
  closeModal();
  toast("Logged out");
}
function openDukaanProfile(){openDukaanLogin()}
function updateDukaanProfileButton(){}
window.openDukaanLogin=openDukaanLogin;
window.openDukaanProfile=openDukaanProfile;
window.logoutDukaanKhata=logoutDukaanKhata;