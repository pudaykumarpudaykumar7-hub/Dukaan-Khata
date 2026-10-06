/* Dukaan Khata — language support for the current UI */
(function(){
  const T={
    English:{greeting:"Good morning 👋",glance:"Your shop at a glance",outstanding:"Outstanding to receive",sales:"Sales today",received:"Received today",customers:"Customers",recent:"Recent activity",reports:"Reports",khata:"Khata",all:"All",due:"Due",paid:"Paid",people:"Customers",billing:"BILLING",billssales:"Bills & Sales",insights:"INSIGHTS",businessvalue:"Business value",creditsales:"Credit sales",transactions:"Transactions",activity:"7-day activity",topcustomers:"Top customers",tools:"TOOLS",more:"More",smartrcv:"Smart Receive",shopprofile:"Shop Profile",language:"Language",connect:"Customer Contact",login:"Login Access",reset:"Reset Demo",home:"Home",billsnav:"Bills",customer:"Customers",languageSet:"Language set to "},
    Telugu:{greeting:"శుభోదయం 👋",glance:"మీ షాప్ ఒక చూపులో",outstanding:"అందుకోవాల్సిన మొత్తం",sales:"ఈరోజు అమ్మకాలు",received:"ఈరోజు అందుకున్నది",customers:"కస్టమర్లు",recent:"ఇటీవలి కార్యకలాపాలు",reports:"రిపోర్టులు",khata:"ఖాతా",all:"అన్నీ",due:"బకాయి",paid:"చెల్లింపు",people:"కస్టమర్లు",billing:"బిల్లింగ్",billssales:"బిల్లులు & అమ్మకాలు",insights:"సమాచారం",businessvalue:"వ్యాపార విలువ",creditsales:"క్రెడిట్ అమ్మకాలు",transactions:"లావాదేవీలు",activity:"7 రోజుల కార్యకలాపాలు",topcustomers:"ముఖ్య కస్టమర్లు",tools:"టూల్స్",more:"మరిన్ని",smartrcv:"స్మార్ట్ రిసీవ్",shopprofile:"షాప్ ప్రొఫైల్",language:"భాష",connect:"కస్టమర్ కనెక్ట్",login:"లాగిన్ యాక్సెస్",reset:"డెమో రీసెట్",home:"హోమ్",billsnav:"బిల్లులు",customer:"కస్టమర్లు",languageSet:"భాష ఎంచుకోబడింది: "},
    Hindi:{greeting:"सुप्रभात 👋",glance:"आपकी दुकान की एक झलक",outstanding:"प्राप्त करना बाकी",sales:"आज की बिक्री",received:"आज प्राप्त",customers:"ग्राहक",recent:"हाल की गतिविधि",reports:"रिपोर्ट",khata:"खाता",all:"सभी",due:"बकाया",paid:"भुगतान",people:"ग्राहक",billing:"बिलिंग",billssales:"बिल और बिक्री",insights:"जानकारी",businessvalue:"व्यापार मूल्य",creditsales:"उधार बिक्री",transactions:"लेन-देन",activity:"7 दिन की गतिविधि",topcustomers:"शीर्ष ग्राहक",tools:"टूल्स",more:"और",smartrcv:"स्मार्ट रिसीव",shopprofile:"दुकान प्रोफ़ाइल",language:"भाषा",connect:"ग्राहक संपर्क",login:"लॉगिन एक्सेस",reset:"डेमो रीसेट",home:"होम",billsnav:"बिल",customer:"ग्राहक",languageSet:"भाषा चुनी गई: "},
    Kannada:{language:"ಭಾಷೆ",smartrcv:"ಸ್ಮಾರ್ಟ್ ರಿಸೀವ್",shopprofile:"ಅಂಗಡಿ ಪ್ರೊಫೈಲ್",connect:"ಗ್ರಾಹಕ ಸಂಪರ್ಕ",login:"ಲಾಗಿನ್ ಪ್ರವೇಶ",reset:"ಡೆಮೋ ರೀಸೆಟ್",more:"ಇನ್ನಷ್ಟು",home:"ಹೋಮ್",khata:"ಖಾತೆ",customer:"ಗ್ರಾಹಕರು",billsnav:"ಬಿಲ್‌ಗಳು",languageSet:"ಭಾಷೆ ಆಯ್ಕೆ: "},
    Marathi:{language:"भाषा",smartrcv:"स्मार्ट रिसीव्ह",shopprofile:"दुकान प्रोफाइल",connect:"ग्राहक संपर्क",login:"लॉगिन प्रवेश",reset:"डेमो रीसेट",more:"अधिक",home:"होम",khata:"खाते",customer:"ग्राहक",billsnav:"बिले",languageSet:"भाषा निवडली: "}
  };
  function lang(){return window.state?.settings?.language||localStorage.getItem("dukaan_khata_language")||"English"}
  window.applyLanguage=function(){
    const L=Object.assign({},T.English,T[lang()]||{});
    const set=(sel,key)=>{const e=document.querySelector(sel);if(e&&L[key])e.textContent=L[key]};
    set("#greeting","greeting");set(".welcome h2","glance");set(".balance-hero span","outstanding");
    const stats=document.querySelectorAll(".stat span");["sales","received","customers"].forEach((k,i)=>{if(stats[i]&&L[k])stats[i].textContent=L[k]});
    const map=[["khata","khata"],["customers","people"],["bills","billssales"],["reports","reports"],["tools","more"]];
    map.forEach(([id,key])=>{const p=document.getElementById(id);if(p){const h=p.querySelector(".page-title h2");if(h&&L[key])h.textContent=L[key]}});
    const kh=document.querySelectorAll("#khata .segmented button");["all","due","paid"].forEach((k,i)=>{if(kh[i]&&L[k])kh[i].textContent=L[k]});
    const nav=document.querySelectorAll(".bottom-nav span");[L.home,L.khata,L.customer,L.billsnav,L.more].forEach((v,i)=>{if(nav[i]&&v)nav[i].textContent=v});
    const tools=document.querySelectorAll(".tools-grid button b");
    ["smartrcv","shopprofile","language","connect","login","reset"].forEach((k,i)=>{if(tools[i])tools[i].textContent=L[k]||T.English[k]});
    const small=document.querySelectorAll(".tools-grid button small");
    const desc=["QR code + payment options","Full shop details","English • Telugu • Hindi • Kannada • Marathi","WhatsApp • Call • SMS • Reminder","Continue with Google • Logout","Clear local demo data"];
    desc.forEach((v,i)=>{if(small[i])small[i].textContent=v});
    document.documentElement.lang=lang()==="Hindi"?"hi":lang()==="Telugu"?"te":lang()==="Kannada"?"kn":lang()==="Marathi"?"mr":"en";
  };
  window.setLanguage=function(x){if(window.state?.settings){state.settings.language=x;saveState()}localStorage.setItem("dukaan_khata_language",x);closeModal();applyLanguage();toast((T[x]||T.English).languageSet+x)};
  window.openLanguage=function(){const L=Object.assign({},T.English,T[lang()]||{});modal("<h2>🌐 "+L.language+"</h2><p class='muted'>Choose your app language.</p><button class='btn' onclick="setLanguage('English')">English</button><button class='btn' onclick="setLanguage('Telugu')">తెలుగు</button><button class='btn' onclick="setLanguage('Hindi')">हिन्दी</button><button class='btn' onclick="setLanguage('Kannada')">ಕನ್ನಡ</button><button class='btn' onclick="setLanguage('Marathi')">मराठी</button>")};
  document.addEventListener("DOMContentLoaded",()=>setTimeout(applyLanguage,50));
})();