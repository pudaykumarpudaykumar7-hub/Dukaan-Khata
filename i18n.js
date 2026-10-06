/* Dukaan Khata — reliable persistent language switcher */
(function(){
  const T={
    English:{greeting:"Good morning 👋",glance:"Your shop at a glance",outstanding:"Outstanding to receive",sales:"Sales today",received:"Received today",customers:"Customers",recent:"Recent activity",reports:"Reports",khata:"Khata",all:"All",due:"Due",paid:"Paid",people:"Customers",billssales:"Bills & Sales",more:"More",smartrcv:"Smart Receive",shopprofile:"Shop Profile",language:"Language",connect:"Customer Contact",login:"Login Access",digitalpass:"Digital App Pass",reset:"Reset Demo",home:"Home",billsnav:"Bills",customer:"Customers",languageSet:"Language set to "},
    Telugu:{greeting:"శుభోదయం 👋",glance:"మీ షాప్ ఒక చూపులో",outstanding:"అందుకోవాల్సిన మొత్తం",sales:"ఈరోజు అమ్మకాలు",received:"ఈరోజు అందుకున్నది",customers:"కస్టమర్లు",recent:"ఇటీవలి కార్యకలాపాలు",reports:"రిపోర్టులు",khata:"ఖాతా",all:"అన్నీ",due:"బకాయి",paid:"చెల్లింపు",people:"కస్టమర్లు",billssales:"బిల్లులు & అమ్మకాలు",more:"మరిన్ని",smartrcv:"స్మార్ట్ రిసీవ్",shopprofile:"షాప్ ప్రొఫైల్",language:"భాష",connect:"కస్టమర్ కనెక్ట్",login:"లాగిన్ యాక్సెస్",digitalpass:"డిజిటల్ యాప్ పాస్",reset:"డెమో రీసెట్",home:"హోమ్",billsnav:"బిల్లులు",customer:"కస్టమర్లు",languageSet:"భాష ఎంచుకోబడింది: "},
    Hindi:{greeting:"सुप्रभात 👋",glance:"आपकी दुकान की एक झलक",outstanding:"प्राप्त करना बाकी",sales:"आज की बिक्री",received:"आज प्राप्त",customers:"ग्राहक",recent:"हाल की गतिविधि",reports:"रिपोर्ट",khata:"खाता",all:"सभी",due:"बकाया",paid:"भुगतान",people:"ग्राहक",billssales:"बिल और बिक्री",more:"और",smartrcv:"स्मार्ट रिसीव",shopprofile:"दुकान प्रोफ़ाइल",language:"भाषा",connect:"ग्राहक संपर्क",login:"लॉगिन एक्सेस",digitalpass:"डिजिटल ऐप पास",digitalpass:"डिजिटल ऐप पास",digitalpass:"डिजिटल ऐप पास",reset:"डेमो रीसेट",home:"होम",billsnav:"बिल",customer:"ग्राहक",languageSet:"भाषा चुनी गई: "},
    Kannada:{greeting:"ಶುಭೋದಯ 👋",glance:"ನಿಮ್ಮ ಅಂಗಡಿಯ ಒಂದು ನೋಟ",outstanding:"ಪಡೆಯಬೇಕಾದ ಮೊತ್ತ",sales:"ಇಂದಿನ ಮಾರಾಟ",received:"ಇಂದು ಪಡೆದದ್ದು",customers:"ಗ್ರಾಹಕರು",recent:"ಇತ್ತೀಚಿನ ಚಟುವಟಿಕೆ",reports:"ವರದಿಗಳು",khata:"ಖಾತೆ",all:"ಎಲ್ಲಾ",due:"ಬಾಕಿ",paid:"ಪಾವತಿಸಲಾಗಿದೆ",people:"ಗ್ರಾಹಕರು",billssales:"ಬಿಲ್‌ಗಳು ಮತ್ತು ಮಾರಾಟ",more:"ಇನ್ನಷ್ಟು",smartrcv:"ಸ್ಮಾರ್ಟ್ ರಿಸೀವ್",shopprofile:"ಅಂಗಡಿ ಪ್ರೊಫೈಲ್",language:"ಭಾಷೆ",connect:"ಗ್ರಾಹಕ ಸಂಪರ್ಕ",login:"ಲಾಗಿನ್ ಪ್ರವೇಶ",digitalpass:"ಡಿಜಿಟಲ್ ಆಪ್ ಪಾಸ್",reset:"ಡೆಮೋ ರೀಸೆಟ್",home:"ಹೋಮ್",billsnav:"ಬಿಲ್‌ಗಳು",customer:"ಗ್ರಾಹಕರು",languageSet:"ಭಾಷೆ ಆಯ್ಕೆ: "},
    Marathi:{greeting:"सुप्रभात 👋",glance:"तुमच्या दुकानाची एक झलक",outstanding:"घेणे बाकी",sales:"आजची विक्री",received:"आज प्राप्त",customers:"ग्राहक",recent:"अलीकडील क्रियाकलाप",reports:"अहवाल",khata:"खाते",all:"सर्व",due:"बाकी",paid:"भरले",people:"ग्राहक",billssales:"बिले आणि विक्री",more:"अधिक",smartrcv:"स्मार्ट रिसीव्ह",shopprofile:"दुकान प्रोफाइल",language:"भाषा",connect:"ग्राहक संपर्क",login:"लॉगिन प्रवेश",reset:"डेमो रीसेट",home:"होम",billsnav:"बिले",customer:"ग्राहक",languageSet:"भाषा निवडली: "}
  };
  const keys=Object.keys(T);
  function current(){
    const saved=localStorage.getItem("dukaan_khata_language");
    if(keys.includes(saved)) return saved;
    try{
      if(window.state&&window.state.settings&&keys.includes(window.state.settings.language)) return window.state.settings.language;
    }catch(e){}
    return "English";
  }
  window.applyLanguage=function(){
    const L=Object.assign({},T.English,T[current()]||{});
    const set=(sel,key)=>{const e=document.querySelector(sel);if(e&&L[key])e.textContent=L[key]};
    set("#greeting","greeting");set(".welcome h2","glance");set(".balance-hero span","outstanding");
    const stats=document.querySelectorAll(".stat span");["sales","received","customers"].forEach((k,i)=>{if(stats[i])stats[i].textContent=L[k]});
    const map=[["khata","khata"],["customers","people"],["bills","billssales"],["reports","reports"],["tools","more"]];
    map.forEach(([id,key])=>{const h=document.querySelector("#"+id+" .page-title h2");if(h)h.textContent=L[key]});
    document.querySelectorAll("#khata .segmented button").forEach((e,i)=>e.textContent=L[["all","due","paid"][i]]);
    const nav=document.querySelectorAll(".bottom-nav span");[L.home,L.khata,L.customer,L.billsnav,L.more].forEach((v,i)=>{if(nav[i])nav[i].textContent=v});
    document.querySelectorAll(".tools-grid button b").forEach((e,i)=>e.textContent=L[["smartrcv","shopprofile","language","connect","login","digitalpass","reset"][i]]);
    document.documentElement.lang={English:"en",Telugu:"te",Hindi:"hi",Kannada:"kn",Marathi:"mr"}[current()];
  };
  window.setLanguage=function(x){
    if(!keys.includes(x))return;
    localStorage.setItem("dukaan_khata_language",x);
    try{
      if(window.state&&window.state.settings){
        window.state.settings.language=x;
        if(typeof window.saveState==="function")window.saveState();
      }
    }catch(e){}
    // Reload the complete app so every screen is rebuilt in the selected language.
    window.location.reload();
  };
  window.openLanguage=function(){
    const L=T[current()];
    const names={English:"English",Telugu:"తెలుగు",Hindi:"हिन्दी",Kannada:"ಕನ್ನಡ",Marathi:"मराठी"};
    modal("<h2>🌐 "+L.language+"</h2><p class='muted'>Choose your app language.</p><div id='languageChoices'></div>");
    const box=document.getElementById("languageChoices");
    if(!box)return;
    keys.forEach(x=>{
      const b=document.createElement("button");
      b.className="btn";
      b.style.cssText="width:100%;margin:6px 0";
      b.type="button";
      b.textContent=names[x];
      b.addEventListener("click",()=>window.setLanguage(x));
      box.appendChild(b);
    });
  };
  document.addEventListener("DOMContentLoaded",()=>setTimeout(window.applyLanguage,100));
})();