// Dukaan Khata — More menu routing + card normalization
(function(){
  const DEFINITIONS={
    "Smart Receive":{icon:"💰",description:"Scan • Pay • No card details",route:"openReceive"},
    "Shop Profile":{icon:"🏪",description:"Full shop details",route:"openShopSettings"},
    "Language":{icon:"🌐",description:"English • Telugu • Hindi • Kannada • Marathi",route:"openLanguage"},
    "Customer Contact":{icon:"👥",description:"WhatsApp • Call • SMS • Reminder",route:"openCustomerHub"},
    "Login Access":{icon:"🔐",description:"Continue with Google • Logout",route:"openDukaanLogin"},
    "Digital App Pass":{icon:"🎫",description:"Shop & owner details",route:"openDigitalPassword"}
  };
  const ORDER=["Smart Receive","Shop Profile","Language","Customer Contact","Login Access","Digital App Pass"];
  let busy=false;

  function normalizeMoreCards(){
    if(busy)return;
    const grid=document.querySelector("#tools .tools-grid");
    if(!grid)return;
    busy=true;
    try{
      const cards=[...grid.querySelectorAll(".luxury-tool")];
      const seen=new Set();

      cards.forEach(card=>{
        const title=(card.querySelector("b")?.textContent||"").trim();
        if(!DEFINITIONS[title])return;
        if(seen.has(title)){card.remove();return;}
        seen.add(title);

        const def=DEFINITIONS[title];
        const small=card.querySelector("small");
        if(small)small.textContent=def.description;

        if(card.firstChild && card.firstChild.nodeType===Node.TEXT_NODE){
          card.firstChild.textContent=def.icon;
        }

        const fn=window[def.route];
        if(typeof fn==="function"){
          card.removeAttribute("onclick");
          card.onclick=function(event){
            event.preventDefault();
            event.stopPropagation();
            fn();
          };
        }
      });

      ORDER.forEach(title=>{
        if(seen.has(title))return;
        const def=DEFINITIONS[title];
        const card=document.createElement("button");
        card.type="button";
        card.className="luxury-tool";
        card.innerHTML=def.icon+"<b>"+title+"</b><small>"+def.description+"</small>";
        const fn=window[def.route];
        if(typeof fn==="function")card.onclick=()=>fn();
        grid.appendChild(card);
        seen.add(title);
      });

      const finalCards=[...grid.querySelectorAll(".luxury-tool")];
      ORDER.forEach(title=>{
        const card=finalCards.find(x=>(x.querySelector("b")?.textContent||"").trim()===title);
        if(card)grid.appendChild(card);
      });
    }finally{
      busy=false;
    }
  }

  function bind(){
    setTimeout(normalizeMoreCards,0);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});
  else bind();

  const observer=new MutationObserver(bind);
  observer.observe(document.body,{childList:true,subtree:true});

  window.bindDukaanKhataMoreRoutes=normalizeMoreCards;
})();