const CACHE="dukaan-khata-app-v1";
const CORE=["./","./index.html","./style.css","./app.js","./auth.js","./login-access.js","./i18n.js","./more-routing.js","./manifest.json"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(x=>{const copy=x.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});return x}).catch(()=>caches.match("./"))))});