/* A complete app shell per release; activation waits for an explicit update. */
const CACHE_VERSION='paris-pocket-v4-google-maps';
const CORE=['./','./index.html','./styles.css','./personal-data.js','./itinerary-data.js','./map-links.js','./app.js','./trip-data.js','./manifest.webmanifest','./assets/icon-192.png','./assets/icon-512.png','./assets/apple-touch-icon.png'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE_VERSION).then(cache=>cache.addAll(CORE)));
});
self.addEventListener('message',event=>{
 if(event.data?.type==='SKIP_WAITING')event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('paris-pocket-')&&key!==CACHE_VERSION).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin)return;
 const coreUrls=CORE.map(path=>new URL(path,self.registration.scope).href);
 if(req.mode==='navigate'){
  event.respondWith(caches.open(CACHE_VERSION).then(cache=>cache.match('./index.html')).then(hit=>hit||fetch(req)));
 }else if(coreUrls.includes(url.href)){
  event.respondWith(caches.open(CACHE_VERSION).then(cache=>cache.match(req)).then(hit=>hit||fetch(req)));
 }
 // Online map resources are deliberately outside the offline app shell.
});
