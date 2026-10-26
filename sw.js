importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js","https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");
firebase.initializeApp({apiKey:"AIzaSyCaNvRS-tiVHWP6zFlxPlUMxRZoUGg2Fi0",authDomain:"dukaan-khata-a517c.firebaseapp.com",projectId:"dukaan-khata-a517c",storageBucket:"dukaan-khata-a517c.firebasestorage.app",messagingSenderId:"320689548893",appId:"1:320689548893:web:4bd715518e9c9052a4",measurementId:"G-WREN34MCQD"});
const messaging=firebase.messaging();
messaging.onBackgroundMessage(payload=>{
 // FCM automatically displays payloads that include `notification` while the app is in the background.
 // Do not display those a second time from the service worker.
 if(payload?.notification)return;
 const title=payload?.notification?.title||payload?.data?.title||"Dukaan Khata update";
 const body=payload?.notification?.body||payload?.data?.body||"Your Khata has been updated.";
 const notificationId=String(payload?.data?.notificationId||("dk-"+Date.now()+"-"+Math.random().toString(36).slice(2,8)));
 self.registration.showNotification(title,{body,icon:"./icon.svg",badge:"./icon.svg",tag:"dukaan-customer-"+notificationId,renotify:true,data:{url:payload?.data?.url||"./?customerNotifications=1"}});
});
const CACHE="dukaan-khata-uvms-notifications-v135-subscription-fullscreen";
const CORE=["./","./index.html","./style.css","./app.js","./notifications.js","./auth.js","./i18n.js","./more-routing.js","./manifest.json","./icon.svg","./favicon.svg","./dukaan-pay.html"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil((async()=>{const names=await caches.keys();await Promise.all(names.filter(n=>n.startsWith("dukaan-khata-")&&n!==CACHE).map(n=>caches.delete(n)));await self.clients.claim();})()));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;const u=new URL(e.request.url);const fresh=e.request.mode==="navigate"||u.pathname.endsWith(".html")||u.pathname.endsWith(".js")||u.pathname.endsWith(".css");if(fresh){e.respondWith(fetch(e.request).then(x=>{if(x.ok){const copy=x.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{})}return x}).catch(()=>caches.match(e.request).then(r=>r||caches.match("./"))));return}e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(x=>{const copy=x.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});return x}).catch(()=>caches.match("./"))))});
self.addEventListener("notificationclick",e=>{e.notification.close();const url=e.notification.data?.url||"./";e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{for(const client of list){if("focus"in client){client.postMessage({type:"DK_NOTIFICATION_CLICK"});return client.focus()}}if(self.clients.openWindow)return self.clients.openWindow(url)}))});
