// Dukaan Khata — More menu compatibility layer
// Keep the original inline button actions intact. This file only corrects
// the visible descriptions; it deliberately does not replace click handlers.
(function(){
  function fixMoreDescriptions(){
    const grid=document.querySelector("#tools .tools-grid");
    if(!grid)return;
    const descriptions=[
      "Scan • Pay • No card details",
      "Full shop details",
      "English • Telugu • Hindi • Kannada • Marathi",
      "WhatsApp • Call • SMS • Reminder",
      "Continue with Google • Logout",
      "Shop & owner details"
    ];
    [...grid.querySelectorAll(".luxury-tool")].slice(0,6).forEach((card,i)=>{
      const small=card.querySelector("small");
      if(small)small.textContent=descriptions[i];
    });
  }
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",fixMoreDescriptions,{once:true});
  }else{
    fixMoreDescriptions();
  }
  window.bindDukaanKhataMoreRoutes=fixMoreDescriptions;
})();