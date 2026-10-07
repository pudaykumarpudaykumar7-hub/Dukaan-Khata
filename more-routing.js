// Dukaan Khata — More menu routing fix
(function(){
  function bindMoreCards(){
    const cards=[...document.querySelectorAll('#tools .tools-grid .luxury-tool')];
    if(!cards.length)return;
    const routes=[
      ['Smart Receive', window.openReceive],
      ['Shop Profile', window.openShopSettings],
      ['Language', window.openLanguage],
      ['Customer Contact', window.openCustomerHub],
      ['Login Access', window.openDukaanLogin],
      ['Digital App Pass', window.openDigitalPassword]
    ];
    cards.forEach(card=>{
      const title=(card.querySelector('b')?.textContent||'').trim();
      const route=routes.find(([name])=>title===name);
      if(!route || typeof route[1]!=='function')return;
      card.removeAttribute('onclick');
      card.onclick=function(event){
        event.preventDefault();
        event.stopPropagation();
        route[1]();
      };
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindMoreCards,{once:true});
  else bindMoreCards();
  const observer=new MutationObserver(bindMoreCards);
  observer.observe(document.body,{childList:true,subtree:true});
  window.bindDukaanKhataMoreRoutes=bindMoreCards;
})();