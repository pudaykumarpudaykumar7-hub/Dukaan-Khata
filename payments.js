// Dukaan Khata payment compatibility file.
// Razorpay has been removed from the public frontend.
// Public Smart Receive now uses the shopkeeper's saved UPI ID to generate a UPI QR.
// Kept as a harmless compatibility file so older cached pages cannot inject Razorpay UI.
(function(){
  window.openPaymentGatewaySettings=undefined;
  window.openOnlinePayment=undefined;
})();
