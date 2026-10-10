// Dukaan Khata — More menu compatibility layer
// Keep each More option paired with its own feature. Do not replace the
// buttons' original click handlers; only set the matching descriptions.
(function(){
  function fixMoreDescriptions(){
    const grid=document.querySelector("#tools .tools-grid");
    if(!grid)return;
    const descriptions=[
      "Discover local shops • Request items",
      "QR code • UPI • Cash payments",
      "Shop name • Owner • Address • UPI",
      "Choose and save your language",
      "WhatsApp • Call • SMS • Due reminders",
      "Owner Google login • Customer phone access • Logout",
      "Shop identity • Owner details • Shareable pass"
    ];
    [...grid.querySelectorAll(".luxury-tool")].forEach((card,i)=>{
      const small=card.querySelector("small");
      if(small && descriptions[i]) small.textContent=descriptions[i];
    });
  }
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",fixMoreDescriptions,{once:true});
  }else{
    fixMoreDescriptions();
  }
  window.bindDukaanKhataMoreRoutes=fixMoreDescriptions;
})();
