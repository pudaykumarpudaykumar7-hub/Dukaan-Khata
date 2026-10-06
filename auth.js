// Dukaan Khata — local-first mode
// No login, password, OTP, phone verification, or Supabase dependency.
window.DukaanKhataMode="local-first";
window.DukaanKhataUser=null;

function openDukaanLogin(){
  if(typeof openPaymentSetup==="function") return openPaymentSetup();
}
function closeDukaanAuthPanel(){}
function openDukaanProfile(){ if(typeof openShopSettings==="function") openShopSettings(); }
function logoutDukaanKhata(){ toast("Dukaan Khata is running without login."); }
function updateDukaanProfileButton(){}
window.openDukaanLogin=openDukaanLogin;
window.openDukaanProfile=openDukaanProfile;
window.logoutDukaanKhata=logoutDukaanKhata;
