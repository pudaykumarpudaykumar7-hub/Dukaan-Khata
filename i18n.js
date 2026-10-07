/* Dukaan Khata — robust 23-language system */
(function(){
  const LANGS=[
    ["English","English","🇬🇧"],["Assamese","অসমীয়া","🇮🇳"],["Bengali","বাংলা","🇮🇳"],["Bodo","बड़ो","🇮🇳"],["Dogri","डोगरी","🇮🇳"],["Gujarati","ગુજરાતી","🇮🇳"],["Hindi","हिन्दी","🇮🇳"],["Kannada","ಕನ್ನಡ","🇮🇳"],["Kashmiri","کٲشُر","🇮🇳"],["Konkani","कोंकणी","🇮🇳"],["Maithili","मैथिली","🇮🇳"],["Malayalam","മലയാളം","🇮🇳"],["Manipuri","ꯃꯤꯇꯩ ꯂꯣꯟ","🇮🇳"],["Marathi","मराठी","🇮🇳"],["Nepali","नेपाली","🇮🇳"],["Odia","ଓଡ଼ିଆ","🇮🇳"],["Punjabi","ਪੰਜਾਬੀ","🇮🇳"],["Sanskrit","संस्कृतम्","🇮🇳"],["Santali","ᱥᱟᱱᱛᱟᱲᱤ","🇮🇳"],["Sindhi","سنڌي","🇮🇳"],["Tamil","தமிழ்","🇮🇳"],["Telugu","తెలుగు","🇮🇳"],["Urdu","اردو","🇮🇳"]
  ];
  const keys=LANGS.map(x=>x[0]);
  const codes={English:"en",Assamese:"as",Bengali:"bn",Bodo:"brx",Dogri:"doi",Gujarati:"gu",Hindi:"hi",Kannada:"kn",Kashmiri:"ks",Konkani:"kok",Maithili:"mai",Malayalam:"ml",Manipuri:"mni",Marathi:"mr",Nepali:"ne",Odia:"or",Punjabi:"pa",Sanskrit:"sa",Santali:"sat",Sindhi:"sd",Tamil:"ta",Telugu:"te",Urdu:"ur"};
  const D={
    English:["Good morning 👋","Your shop at a glance","Outstanding to receive","Sales today","Received today","Customers","Recent activity","Reports","Khata","All","Due","Paid","More","Smart Receive","Shop Profile","Language","Customer Contact","Login Access","Digital App Pass","Home","Bills"],
    Telugu:["శుభోదయం 👋","మీ షాప్ ఒక చూపులో","అందుకోవాల్సిన మొత్తం","ఈరోజు అమ్మకాలు","ఈరోజు అందుకున్నది","కస్టమర్లు","ఇటీవలి కార్యకలాపాలు","రిపోర్టులు","ఖాతా","అన్నీ","బకాయి","చెల్లింపు","మరిన్ని","స్మార్ట్ రిసీవ్","షాప్ ప్రొఫైల్","భాష","కస్టమర్ సంప్రదింపు","లాగిన్ యాక్సెస్","డిజిటల్ యాప్ పాస్","హోమ్","బిల్లులు"],
    Hindi:["सुप्रभात 👋","आपकी दुकान की एक झलक","प्राप्त करना बाकी","आज की बिक्री","आज प्राप्त","ग्राहक","हाल की गतिविधि","रिपोर्ट","खाता","सभी","बकाया","भुगतान","और","स्मार्ट रिसीव","दुकान प्रोफ़ाइल","भाषा","ग्राहक संपर्क","लॉगिन एक्सेस","डिजिटल ऐप पास","होम","बिल"],
    Kannada:["ಶುಭೋದಯ 👋","ನಿಮ್ಮ ಅಂಗಡಿಯ ಒಂದು ನೋಟ","ಪಡೆಯಬೇಕಾದ ಮೊತ್ತ","ಇಂದಿನ ಮಾರಾಟ","ಇಂದು ಪಡೆದದ್ದು","ಗ್ರಾಹಕರು","ಇತ್ತೀಚಿನ ಚಟುವಟಿಕೆ","ವರದಿಗಳು","ಖಾತೆ","ಎಲ್ಲಾ","ಬಾಕಿ","ಪಾವತಿಸಲಾಗಿದೆ","ಇನ್ನಷ್ಟು","ಸ್ಮಾರ್ಟ್ ರಿಸೀವ್","ಅಂಗಡಿ ಪ್ರೊಫೈಲ್","ಭಾಷೆ","ಗ್ರಾಹಕ ಸಂಪರ್ಕ","ಲಾಗಿನ್ ಪ್ರವೇಶ","ಡಿಜಿಟಲ್ ಆಪ್ ಪಾಸ್","ಹೋಮ್","ಬಿಲ್‌ಗಳು"],
    Marathi:["सुप्रभात 👋","तुमच्या दुकानाची एक झलक","घेणे बाकी","आजची विक्री","आज प्राप्त","ग्राहक","अलीकडील क्रियाकलाप","अहवाल","खाते","सर्व","बाकी","भरले","अधिक","स्मार्ट रिसीव्ह","दुकान प्रोफाइल","भाषा","ग्राहक संपर्क","लॉगिन प्रवेश","डिजिटल अॅप पास","होम","बिले"],
    Bengali:["সুপ্রভাত 👋","আপনার দোকানের এক ঝলক","পাওনা","আজকের বিক্রি","আজ প্রাপ্ত","গ্রাহক","সাম্প্রতিক কার্যকলাপ","রিপোর্ট","খাতা","সব","বাকি","পরিশোধিত","আরও","স্মার্ট রিসিভ","দোকানের প্রোফাইল","ভাষা","গ্রাহক যোগাযোগ","লগইন অ্যাক্সেস","ডিজিটাল অ্যাপ পাস","হোম","বিল"],
    Gujarati:["સુપ્રભાત 👋","તમારી દુકાનની એક ઝલક","લેવાના બાકી","આજનું વેચાણ","આજે મળેલ","ગ્રાહકો","તાજેતરની પ્રવૃત્તિ","અહેવાલ","ખાતું","બધા","બાકી","ચૂકવેલ","વધુ","સ્માર્ટ રિસીવ","દુકાન પ્રોફાઇલ","ભાષા","ગ્રાહક સંપર્ક","લોગિન ઍક્સેસ","ડિજિટલ એપ પાસ","હોમ","બિલ"],
    Malayalam:["സുപ്രഭാതം 👋","നിങ്ങളുടെ കടയുടെ ഒരു നോട്ടം","ലഭിക്കാനുള്ളത്","ഇന്നത്തെ വിൽപ്പന","ഇന്ന് ലഭിച്ചത്","ഉപഭോക്താക്കൾ","സമീപകാല പ്രവർത്തനം","റിപ്പോർട്ടുകൾ","ഖാത്ത","എല്ലാം","ബാക്കി","അടച്ചത്","കൂടുതൽ","സ്മാർട്ട് റിസീവ്","കട പ്രൊഫൈൽ","ഭാഷ","ഉപഭോക്തൃ ബന്ധം","ലോഗിൻ ആക്സസ്","ഡിജിറ്റൽ ആപ്പ് പാസ്","ഹോം","ബില്ലുകൾ"],
    Punjabi:["ਸਤ ਸ੍ਰੀ ਅਕਾਲ 👋","ਤੁਹਾਡੀ ਦੁਕਾਨ ਦੀ ਝਲਕ","ਲੈਣ ਵਾਲੀ ਰਕਮ","ਅੱਜ ਦੀ ਵਿਕਰੀ","ਅੱਜ ਪ੍ਰਾਪਤ","ਗਾਹਕ","ਹਾਲੀਆ ਗਤੀਵਿਧੀ","ਰਿਪੋਰਟਾਂ","ਖਾਤਾ","ਸਾਰੇ","ਬਕਾਇਆ","ਅਦਾ ਕੀਤਾ","ਹੋਰ","ਸਮਾਰਟ ਰਿਸੀਵ","ਦੁਕਾਨ ਪ੍ਰੋਫਾਈਲ","ਭਾਸ਼ਾ","ਗਾਹਕ ਸੰਪਰਕ","ਲੌਗਇਨ ਐਕਸੈਸ","ਡਿਜੀਟਲ ਐਪ ਪਾਸ","ਹੋਮ","ਬਿੱਲ"],
    Tamil:["காலை வணக்கம் 👋","உங்கள் கடையின் ஒரு பார்வை","பெற வேண்டியது","இன்றைய விற்பனை","இன்று பெற்றது","வாடிக்கையாளர்கள்","சமீபத்திய செயல்பாடு","அறிக்கைகள்","கணக்கு","அனைத்தும்","பாக்கி","செலுத்தியது","மேலும்","ஸ்மார்ட் ரிசீவ்","கடை சுயவிவரம்","மொழி","வாடிக்கையாளர் தொடர்பு","உள்நுழைவு","டிஜிட்டல் ஆப் பாஸ்","முகப்பு","பில்கள்"],
    Urdu:["صبح بخیر 👋","آپ کی دکان کی ایک جھلک","وصول کرنا باقی","آج کی فروخت","آج وصول شدہ","گاہک","حالیہ سرگرمی","رپورٹس","کھاتہ","سب","بقایا","ادا شدہ","مزید","اسمارٹ وصول","دکان پروفائل","زبان","گاہک رابطہ","لاگ اِن","ڈیجیٹل ایپ پاس","ہوم","بل"]
  };
  const fallback=D.English;
  function current(){const x=localStorage.getItem("dukaan_khata_language");return keys.includes(x)?x:"English";}
  function tr(){return D[current()]||fallback;}
  window.applyLanguage=function(){
    const L=tr();
    const set=(s,v)=>{const e=document.querySelector(s);if(e)e.textContent=v};
    set("#greeting",L[0]);set(".welcome h2",L[1]);set(".balance-hero span",L[2]);
    document.querySelectorAll(".stat span").forEach((e,i)=>{if(L[3+i])e.textContent=L[3+i]});
    const pages=[["khata",8],["customers",5],["bills",20],["reports",7],["tools",12]];
    pages.forEach(([id,i])=>{const e=document.querySelector("#"+id+" .page-title h2");if(e)e.textContent=L[i]});
    document.querySelectorAll("#khata .segmented button").forEach((e,i)=>{e.textContent=L[9+i]||e.textContent});
    document.querySelectorAll(".bottom-nav span").forEach((e,i)=>{e.textContent=[L[19],L[8],L[5],L[20],L[12]][i]||e.textContent});
    document.querySelectorAll(".tools-grid button b").forEach((e,i)=>{e.textContent=[L[13],L[14],L[15],L[16],L[17],L[18]][i]||e.textContent});
    document.documentElement.lang=codes[current()]||"en";
  };
  window.setLanguage=function(x){
    if(!keys.includes(x))return;
    localStorage.setItem("dukaan_khata_language",x);
    try{if(window.state&&window.state.settings){window.state.settings.language=x;if(window.saveState)window.saveState();}}catch(e){}
    window.applyLanguage();
    const m=document.getElementById("modal");if(m)m.classList.add("hidden");
    if(typeof toast==="function")toast((LANGS.find(a=>a[0]===x)||LANGS[0])[1]+" ✓");
  };
  window.openLanguage=function(){
    const selected=current();
    const options=LANGS.map(([key,native,flag])=>'<button type="button" class="dk-lang-option" data-lang="'+key+'"><span class="dk-lang-flag">'+flag+'</span><span class="dk-lang-name"><b>'+key+'</b><span class="dk-lang-arrow">→</span><small>'+native+'</small></span><i>'+(key===selected?'✓':'○')+'</i></button>').join("");
    modal('<div class="dk-language-showcase"><div class="dk-language-top"><button class="dk-language-back" onclick="closeModal()">‹</button><div class="dk-language-brand"><span>PERSONALIZE</span><h2>Language</h2><small>Choose your app language</small></div><b class="dk-language-pro">✦ INDIA • 23 LANGUAGES</b></div><div class="dk-language-panel"><div class="dk-language-panel-title"><span>🌐</span><div><b>Choose your language</b><small>All 23 languages are listed below</small></div></div><div class="dk-language-list">'+options+'</div></div><div class="dk-language-save">🌐 <span>Your preferred language is saved automatically</span><b>✓</b></div><button class="dk-language-close" onclick="closeModal()">× Close</button></div>');
    document.querySelectorAll(".dk-language-showcase .dk-lang-option").forEach(b=>b.addEventListener("click",()=>setLanguage(b.dataset.lang)));
  };
  document.addEventListener("DOMContentLoaded",()=>setTimeout(applyLanguage,50));
})();