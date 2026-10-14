// Dukaan Khata — More menu feature descriptions
// Descriptions are keyed to each feature, so changing the order never mismatches them.
(function(){
  const descriptions={
    "smart-receive":"Generate UPI QR • Share payment QR • Record cash or UPI received",
    "shop-profile":"Edit shop name • Owner • Phone • UPI ID • Address",
    "language":"Choose from all 23 supported Indian languages",
    "customer-contact":"WhatsApp • Call • SMS • Due reminders",
    "login-access":"Owner Google login • Customer phone access • Logout",
    "club-pass":"Shop identity • Owner details • Shareable pass",
    "digital-shop":"Products • Cart • Pickup / delivery • Orders",
    "dukaan-universe":"Discover local shops • Request items"
  };
  function fixMoreDescriptions(){
    document.querySelectorAll("#tools .luxury-tool[data-more-feature]").forEach(card=>{
      const description=descriptions[card.dataset.moreFeature];
      const small=card.querySelector("small");
      if(small && description) small.textContent=description;
    });
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",fixMoreDescriptions,{once:true});
  else fixMoreDescriptions();
  window.bindDukaanKhataMoreRoutes=fixMoreDescriptions;
})();