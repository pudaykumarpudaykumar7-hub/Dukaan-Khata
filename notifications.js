(()=>{"use strict";
const KEY="dk_local_notifications_v1";
const DK_FIREBASE_CONFIG={apiKey:"AIzaSyCaNvRS-tiVHWP6zFlxPlUMxRZoUGg2Fi0",authDomain:"dukaan-khata-a517c.firebaseapp.com",projectId:"dukaan-khata-a517c",storageBucket:"dukaan-khata-a517c.firebasestorage.app",messagingSenderId:"320689548893",appId:"1:320689548893:web:4bd715518e9c9052a4",measurementId:"G-WREN34MCQD"};
const DK_VAPID_KEY="BDpqvV1cWiSpdZ_W_X6qSjyq2WPD_LV8Dnp39I17srGbO74nAZagZxzzzTZX0qEktIn4FOIqKDKV_zGZB5B1IYY";
const T={
English:["Notifications","Your shop updates","Enable phone notifications","Clear notifications","You're all caught up","New bills and payments will appear here.","New bill saved","Payment received","Bill saved for","Payment recorded for","Notifications enabled","Dukaan Khata alerts are enabled on this device."],
Telugu:["నోటిఫికేషన్లు","మీ షాప్ అప్‌డేట్లు","ఫోన్ నోటిఫికేషన్లు ప్రారంభించండి","నోటిఫికేషన్లు తొలగించండి","అన్ని అప్‌డేట్లు చూశారు","కొత్త బిల్లులు, చెల్లింపులు ఇక్కడ కనిపిస్తాయి.","కొత్త బిల్లు సేవ్ అయింది","చెల్లింపు అందింది","బిల్లు సేవ్ చేసిన కస్టమర్","చెల్లింపు చేసిన కస్టమర్","నోటిఫికేషన్లు ప్రారంభించబడ్డాయి","ఈ పరికరంలో Dukaan Khata అలర్ట్‌లు ప్రారంభమయ్యాయి."],
Hindi:["सूचनाएँ","आपकी दुकान के अपडेट","फ़ोन सूचनाएँ चालू करें","सूचनाएँ साफ़ करें","आपने सभी अपडेट देख लिए","नए बिल और भुगतान यहाँ दिखाई देंगे।","नया बिल सेव हुआ","भुगतान प्राप्त हुआ","बिल सेव किया गया","भुगतान दर्ज किया गया","सूचनाएँ चालू हैं","इस डिवाइस पर Dukaan Khata अलर्ट चालू हैं।"],
Kannada:["ಅಧಿಸೂಚನೆಗಳು","ನಿಮ್ಮ ಅಂಗಡಿಯ ನವೀಕರಣಗಳು","ಫೋನ್ ಅಧಿಸೂಚನೆಗಳನ್ನು ಸಕ್ರಿಯಗೊಳಿಸಿ","ಅಧಿಸೂಚನೆಗಳನ್ನು ತೆರವುಗೊಳಿಸಿ","ಎಲ್ಲಾ ನವೀಕರಣಗಳನ್ನು ನೋಡಿದ್ದೀರಿ","ಹೊಸ ಬಿಲ್‌ಗಳು ಮತ್ತು ಪಾವತಿಗಳು ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತವೆ.","ಹೊಸ ಬಿಲ್ ಉಳಿಸಲಾಗಿದೆ","ಪಾವತಿ ಸ್ವೀಕರಿಸಲಾಗಿದೆ","ಬಿಲ್ ಉಳಿಸಿದ ಗ್ರಾಹಕ","ಪಾವತಿ ದಾಖಲಿಸಿದ ಗ್ರಾಹಕ","ಅಧಿಸೂಚನೆಗಳು ಸಕ್ರಿಯವಾಗಿವೆ","ಈ ಸಾಧನದಲ್ಲಿ Dukaan Khata ಎಚ್ಚರಿಕೆಗಳು ಸಕ್ರಿಯವಾಗಿವೆ."],
Tamil:["அறிவிப்புகள்","உங்கள் கடை புதுப்பிப்புகள்","தொலைபேசி அறிவிப்புகளை இயக்கு","அறிவிப்புகளை அழி","அனைத்து புதுப்பிப்புகளையும் பார்த்துவிட்டீர்கள்","புதிய ரசீதுகள் மற்றும் பணப்பரிவர்த்தனைகள் இங்கே தோன்றும்.","புதிய ரசீது சேமிக்கப்பட்டது","பணம் பெறப்பட்டது","ரசீது சேமிக்கப்பட்ட வாடிக்கையாளர்","பணம் பதிவு செய்யப்பட்ட வாடிக்கையாளர்","அறிவிப்புகள் இயக்கப்பட்டன","இந்த சாதனத்தில் Dukaan Khata அறிவிப்புகள் இயக்கப்பட்டுள்ளன."],
Marathi:["सूचना","तुमच्या दुकानातील अपडेट्स","फोन सूचना सुरू करा","सूचना साफ करा","तुम्ही सर्व अपडेट्स पाहिले आहेत","नवीन बिले आणि पेमेंट येथे दिसतील.","नवीन बिल जतन केले","पेमेंट प्राप्त झाले","बिल जतन केलेला ग्राहक","पेमेंट नोंदवलेला ग्राहक","सूचना सुरू आहेत","या डिव्हाइसवर Dukaan Khata सूचना सुरू आहेत."],
Bengali:["বিজ্ঞপ্তি","আপনার দোকানের আপডেট","ফোন বিজ্ঞপ্তি চালু করুন","বিজ্ঞপ্তি মুছুন","সব আপডেট দেখা হয়েছে","নতুন বিল ও পেমেন্ট এখানে দেখা যাবে।","নতুন বিল সংরক্ষিত হয়েছে","পেমেন্ট পাওয়া গেছে","বিল সংরক্ষণ করা গ্রাহক","পেমেন্ট নথিভুক্ত করা গ্রাহক","বিজ্ঞপ্তি চালু হয়েছে","এই ডিভাইসে Dukaan Khata সতর্কতা চালু হয়েছে।"],
Gujarati:["સૂચનાઓ","તમારી દુકાનના અપડેટ્સ","ફોન સૂચનાઓ ચાલુ કરો","સૂચનાઓ સાફ કરો","તમે બધા અપડેટ્સ જોઈ લીધા છે","નવા બિલ અને ચુકવણીઓ અહીં દેખાશે.","નવું બિલ સાચવાયું","ચુકવણી મળી","બિલ સાચવનાર ગ્રાહક","ચુકવણી નોંધાયેલ ગ્રાહક","સૂચનાઓ ચાલુ છે","આ ઉપકરણ પર Dukaan Khata ચેતવણીઓ ચાલુ છે."],
Malayalam:["അറിയിപ്പുകൾ","നിങ്ങളുടെ കടയിലെ അപ്‌ഡേറ്റുകൾ","ഫോൺ അറിയിപ്പുകൾ പ്രവർത്തനക്ഷമമാക്കുക","അറിയിപ്പുകൾ മായ്ക്കുക","എല്ലാ അപ്‌ഡേറ്റുകളും കണ്ടു","പുതിയ ബില്ലുകളും പേയ്‌മെന്റുകളും ഇവിടെ കാണിക്കും.","പുതിയ ബിൽ സംരക്ഷിച്ചു","പേയ്‌മെന്റ് ലഭിച്ചു","ബിൽ സംരക്ഷിച്ച ഉപഭോക്താവ്","പേയ്‌മെന്റ് രേഖപ്പെടുത്തിയ ഉപഭോക്താവ്","അറിയിപ്പുകൾ പ്രവർത്തനക്ഷമമാണ്","ഈ ഉപകരണത്തിൽ Dukaan Khata അറിയിപ്പുകൾ പ്രവർത്തനക്ഷമമാണ്."],
Punjabi:["ਸੂਚਨਾਵਾਂ","ਤੁਹਾਡੀ ਦੁਕਾਨ ਦੇ ਅੱਪਡੇਟ","ਫ਼ੋਨ ਸੂਚਨਾਵਾਂ ਚਾਲੂ ਕਰੋ","ਸੂਚਨਾਵਾਂ ਸਾਫ਼ ਕਰੋ","ਤੁਸੀਂ ਸਾਰੇ ਅੱਪਡੇਟ ਵੇਖ ਲਏ ਹਨ","ਨਵੇਂ ਬਿੱਲ ਅਤੇ ਭੁਗਤਾਨ ਇੱਥੇ ਦਿਖਣਗੇ।","ਨਵਾਂ ਬਿੱਲ ਸੰਭਾਲਿਆ ਗਿਆ","ਭੁਗਤਾਨ ਪ੍ਰਾਪਤ ਹੋਇਆ","ਬਿੱਲ ਸੰਭਾਲਿਆ ਗਿਆ ਗਾਹਕ","ਭੁਗਤਾਨ ਦਰਜ ਕੀਤਾ ਗਾਹਕ","ਸੂਚਨਾਵਾਂ ਚਾਲੂ ਹਨ","ਇਸ ਡਿਵਾਈਸ 'ਤੇ Dukaan Khata ਅਲਰਟ ਚਾਲੂ ਹਨ।"],
Odia:["ବିଜ୍ଞପ୍ତି","ଆପଣଙ୍କ ଦୋକାନର ଅପଡେଟ୍","ଫୋନ୍ ବିଜ୍ଞପ୍ତି ଚାଲୁ କରନ୍ତୁ","ବିଜ୍ଞପ୍ତି ସଫା କରନ୍ତୁ","ସମସ୍ତ ଅପଡେଟ୍ ଦେଖିଛନ୍ତି","ନୂଆ ବିଲ୍ ଓ ପେମେଣ୍ଟ ଏଠାରେ ଦେଖାଯିବ।","ନୂଆ ବିଲ୍ ସେଭ୍ ହେଲା","ପେମେଣ୍ଟ ମିଳିଲା","ବିଲ୍ ସେଭ୍ କରିଥିବା ଗ୍ରାହକ","ପେମେଣ୍ଟ ରେକର୍ଡ ହୋଇଥିବା ଗ୍ରାହକ","ବିଜ୍ଞପ୍ତି ଚାଲୁ ଅଛି","ଏହି ଡିଭାଇସରେ Dukaan Khata ଆଲର୍ଟ ଚାଲୁ ଅଛି।"],
Urdu:["اطلاعات","آپ کی دکان کی تازہ کاری","فون کی اطلاعات فعال کریں","اطلاعات صاف کریں","آپ نے تمام تازہ کاریاں دیکھ لی ہیں","نئے بل اور ادائیگیاں یہاں نظر آئیں گی۔","نیا بل محفوظ ہوگیا","ادائیگی موصول ہوئی","بل محفوظ کرنے والا گاہک","ادائیگی درج کرنے والا گاہک","اطلاعات فعال ہیں","اس ڈیوائس پر Dukaan Khata الرٹس فعال ہیں۔"]
};
function lang(){try{const l=localStorage.getItem("dukaan_khata_language")||window.state?.settings?.language||"English";return T[l]?l:"English"}catch(e){return"English"}}
function tr(){return T[lang()]||T.English}
function read(){try{const x=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(x)?x:[]}catch(e){return[]}}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function dot(){const b=document.getElementById("dkNotificationBadge");if(b){b.hidden=false;b.textContent="";b.classList.toggle("has-unread",read().some(x=>!x.read))}}
function translate(title,body){const t=tr();let a=title,b=body;if(/new bill saved/i.test(title)){a=t[6];b=t[8]+" • "+String(body||"").replace(/^.*?•\s*/,"")}else if(/payment recorded/i.test(title)){a=t[7];b=t[9]+" • "+String(body||"").replace(/^.*?•\s*/,"")}else if(/notifications enabled/i.test(title)){a=t[10];b=t[11]}return[a,b]}
async function systemNotice(item){try{if(!("Notification"in window)||Notification.permission!=="granted")return;const reg="serviceWorker"in navigator?await navigator.serviceWorker.ready.catch(()=>null):null;if(reg?.showNotification)await reg.showNotification(item.title,{body:item.body,icon:"./icon.svg",badge:"./icon.svg",tag:item.id,data:{url:"./?notifications=1"}});else new Notification(item.title,{body:item.body,icon:"./icon.svg",tag:item.id})}catch(e){console.warn("Notification could not be shown",e)}}
async function supabaseAccessToken(){
 try{
  const sb=window.dkSupabase;
  if(!sb?.auth?.getSession)return null;
  const result=await sb.auth.getSession();
  return result?.data?.session?.access_token||null;
 }catch(e){return null}
}
const PUSH_API="https://us-central1-dukaan-khata-a517c.cloudfunctions.net";
async function pushApiCall(path,payload){
 const accessToken=await supabaseAccessToken();
 if(!accessToken)return null;
 const response=await fetch(PUSH_API+"/"+path,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+accessToken},body:JSON.stringify(payload)});
 let data={};try{data=await response.json()}catch(e){}
 if(!response.ok)throw new Error(data.error||"Push service request failed");
 return data;
}
async function registerPushTokenWithBackend(token){
 if(!token)return;
 try{await pushApiCall("registerSupabasePushToken",{token,platform:"web"})}
 catch(e){console.warn("Push token is not registered with the remote sender yet:",e?.message||e)}
}
async function sendRemoteEvent(title,token){
 const t=String(title||"").toLowerCase();
 const kind=/^new bill saved$/.test(t)?"bill":/^payment recorded$/.test(t)?"payment":/^important reminder$/.test(t)?"reminder":null;
 if(!kind)return null;
 try{return await pushApiCall("sendSelfNotification",{kind,excludeToken:token||""})}
 catch(e){console.warn("Remote push was not sent:",e?.message||e);return null}
}
let pushAuthSubscription=null;
function watchSupabaseAuthForPush(){
 const sb=window.dkSupabase;
 if(!sb?.auth?.onAuthStateChange||pushAuthSubscription)return;
 const {data}=sb.auth.onAuthStateChange((event,session)=>{
  if(session?.access_token){
   let token=null;try{token=localStorage.getItem("dk_fcm_registration_token_v1")}catch(e){}
   if(token)setTimeout(()=>registerPushTokenWithBackend(token),0);
  }
 });
 pushAuthSubscription=data?.subscription||true;
}
window.addEventListener("dk:push-token-ready",e=>registerPushTokenWithBackend(e.detail?.token));
window.addEventListener("dk:supabase-ready",watchSupabaseAuthForPush);
window.dkNotify=async function(title,body){if(!/^(new bill saved|payment recorded|important reminder|customer khata updated|item added to khata)$/i.test(String(title||"").trim()))return null;const m=translate(title,body),item={id:"n"+Date.now().toString(36)+Math.random().toString(36).slice(2,7),title:m[0],body:m[1],date:new Date().toISOString(),read:false,language:lang()};const list=read();list.unshift(item);try{localStorage.setItem(KEY,JSON.stringify(list.slice(0,100)))}catch(e){}dot();await systemNotice(item);const token=(()=>{try{return localStorage.getItem("dk_fcm_registration_token_v1")}catch(e){return null}})();sendRemoteEvent(title,token);return item};
function storeRemoteMessage(payload){
  const rawTitle=String(payload?.notification?.title||payload?.data?.title||"Dukaan Khata update").slice(0,120);
  const rawBody=String(payload?.notification?.body||payload?.data?.body||"Your shop has a new update.").slice(0,500);
  const item={id:"fcm"+Date.now().toString(36)+Math.random().toString(36).slice(2,7),title:rawTitle,body:rawBody,date:new Date().toISOString(),read:false,language:lang(),remote:true};
  const list=read();list.unshift(item);try{localStorage.setItem(KEY,JSON.stringify(list.slice(0,100)))}catch(e){}
  dot();
  systemNotice(item);
}
function initForegroundMessaging(){
  try{
    if(!window.firebase?.messaging)return;
    if(!window.firebase.apps.length)window.firebase.initializeApp(DK_FIREBASE_CONFIG);
    window.firebase.messaging().onMessage(payload=>storeRemoteMessage(payload));
  }catch(e){console.warn("Firebase foreground messaging is not ready",e)}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initForegroundMessaging,{once:true});else initForegroundMessaging();
window.dkRequestNotifications=async function(){
 if(!("Notification"in window)){if(window.toast)toast("Notifications are not supported in this browser");return}
 if(!("serviceWorker"in navigator)||!window.isSecureContext){if(window.toast)toast("Open Dukaan Khata over HTTPS to enable push notifications");return}
 try{
  const p=await Notification.requestPermission();
  if(p!=="granted"){if(window.toast)toast("Allow notifications in your browser or phone settings");return}
  if(!window.firebase?.messaging)throw new Error("Firebase messaging SDK did not load");
  if(!window.firebase.apps.length)window.firebase.initializeApp(DK_FIREBASE_CONFIG);
  const reg=await navigator.serviceWorker.ready;
  const token=await window.firebase.messaging().getToken({vapidKey:DK_VAPID_KEY,serviceWorkerRegistration:reg});
  if(!token)throw new Error("Firebase did not return a device token");
  try{localStorage.setItem("dk_fcm_registration_token_v1",token)}catch(e){}
  window.dispatchEvent(new CustomEvent("dk:push-token-ready",{detail:{token,projectId:DK_FIREBASE_CONFIG.projectId}}));await registerPushTokenWithBackend(token);watchSupabaseAuthForPush();
  if(window.toast)toast("Notifications enabled on this device. Remote push requires a deployed, secure sender.");
 }catch(e){console.error("Firebase push setup failed",e);if(window.toast)toast("Push setup failed: "+(e?.message||"check Firebase settings"))}
};
window.dkOpenNotifications=function(){const list=read();list.forEach(x=>x.read=true);try{localStorage.setItem(KEY,JSON.stringify(list))}catch(e){}dot();const t=tr();const rows=list.length?list.map(x=>'<article class="dk-notice-row"><span class="dk-notice-icon">'+(/bill|బిల్లు|बिल|बिल्|બિલ|ಬಿಲ್|বিল|பில்|ബിൽ/.test(x.title)?"▤":/payment|చెల్లింపు|भुगतान|ಪಾವತಿ|பணம்|ચુકવણી|পেমেন্ট/.test(x.title)?"↗":"✦")+'</span><div class="dk-notice-copy"><b>'+esc(x.title)+'</b><p>'+esc(x.body)+'</p><small>'+esc(new Date(x.date).toLocaleString())+'</small></div></article>').join(""):'<div class="dk-notice-empty"><span class="dk-notice-empty-icon">✓</span><h3>'+esc(t[4])+'</h3><p>'+esc(t[5])+'</p></div>';if(typeof window.modal==="function")window.modal('<div class="dk-notice-panel" lang="'+esc(lang())+'"><div class="dk-notice-head"><div class="dk-notice-emblem">✦</div><div class="dk-notice-heading"><h2>'+esc(t[0])+'</h2><p>'+esc(t[1])+'</p></div><button class="dk-notice-enable" type="button" onclick="dkRequestNotifications()">♧ '+esc(t[2])+'</button></div><div class="dk-notice-list">'+rows+'</div><div class="dk-notice-actions"><button class="dk-notice-clear" type="button" onclick="dkClearNotifications()">'+esc(t[3])+'</button></div></div>')};
window.dkClearNotifications=function(){try{localStorage.removeItem(KEY)}catch(e){}dot();window.dkOpenNotifications()};
window.addEventListener("DOMContentLoaded",dot);window.addEventListener("storage",e=>{if(e.key===KEY)dot()});if("serviceWorker"in navigator)navigator.serviceWorker.addEventListener("message",e=>{if(e.data?.type==="DK_NOTIFICATION_CLICK")window.dkOpenNotifications?.()});

async function customerPushCall(path,payload){
 const response=await fetch(PUSH_API+"/"+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
 let data={};try{data=await response.json()}catch(e){}
 if(!response.ok)throw new Error(data.error||"Customer notification service request failed");
 return data;
}
function normalizeCustomerPhoneForPush(value){let d=String(value||"").replace(/\\D/g,"");if(d.length===12&&d.startsWith("91"))d=d.slice(2);if(d.length===13&&d.startsWith("0091"))d=d.slice(4);return /^\\d{10}$/.test(d)?d:""}
window.dkEnableCustomerNotifications=async function(phone,pin){
 const normalized=normalizeCustomerPhoneForPush(phone);
 if(!normalized)throw new Error("Enter the registered 10-digit mobile number.");
 if(String(pin||"")!=="2007")throw new Error("Customer PIN is incorrect.");
 if(!("Notification"in window)||!("serviceWorker"in navigator)||!window.isSecureContext)throw new Error("Open Dukaan Khata over HTTPS and allow phone notifications.");
 const permission=await Notification.requestPermission();
 if(permission!=="granted")throw new Error("Please allow notifications in phone or browser settings.");
 if(!window.firebase?.messaging)throw new Error("Firebase messaging SDK did not load.");
 if(!window.firebase.apps.length)window.firebase.initializeApp(DK_FIREBASE_CONFIG);
 const reg=await navigator.serviceWorker.ready;
 const token=await window.firebase.messaging().getToken({vapidKey:DK_VAPID_KEY,serviceWorkerRegistration:reg});
 if(!token)throw new Error("Firebase did not return a device token.");
 await customerPushCall("registerCustomerPushDevice",{phone:normalized,pin:"2007",token,platform:"web"});
 try{sessionStorage.setItem("dk_customer_phone",normalized);sessionStorage.setItem("dk_customer_pin","2007")}catch(e){}
 return {ok:true};
};
window.dkFetchCustomerNotifications=async function(phone,pin){
 const normalized=normalizeCustomerPhoneForPush(phone);
 if(!normalized)throw new Error("Enter the registered 10-digit mobile number.");
 return customerPushCall("getCustomerNotifications",{phone:normalized,pin:String(pin||"")});
};
window.dkNotifyCustomerAccount=async function(phone,title,body){
 const normalized=normalizeCustomerPhoneForPush(phone);if(!normalized)return null;
 try{return await pushApiCall("sendCustomerAccountNotification",{phone:normalized,title:String(title||"Dukaan Khata account updated"),body:String(body||"Your bill, items or outstanding balance has changed. Open Dukaan Khata to view details.")})}
 catch(e){console.warn("Customer account notification was not sent:",e?.message||e);return null}
};
})();