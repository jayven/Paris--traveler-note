/* 提供离线查看。日后更新行程后，请增加缓存版本号，并重新发布整个目录。 */
const CACHE_VERSION='paris-pocket-v1-20261012';
const CORE=['./','./index.html','./styles.css','./app.js','./trip-data.js','./manifest.webmanifest','./assets/icon-192.png','./assets/icon-512.png','./assets/apple-touch-icon.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_VERSION).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_VERSION).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 const url=new URL(req.url);
 if(req.mode==='navigate'){
  event.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE_VERSION).then(c=>c.put('./index.html',copy));return res}).catch(()=>caches.match('./index.html')));
  return;
 }
 if(/\.(?:js|css|webmanifest)$/.test(url.pathname)){
  event.respondWith(fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE_VERSION).then(c=>c.put(req,copy))}return res}).catch(()=>caches.match(req)));
  return;
 }
 event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE_VERSION).then(c=>c.put(req,copy))}return res})));
});
