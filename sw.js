/* A complete versioned shell. Official updates are validated independently in IndexedDB. */
const CACHE_VERSION='paris-pocket-v6-phase3';
const CORE=['./','./index.html','./legacy.html','./styles.css','./personal-data.js','./itinerary-data.js','./map-links.js','./visual-preview.js','./legacy-app.js','./app.js','./views.js','./official-data.js','./local-store.js','./trip/bootstrap.js','./trip-data.js','./manifest.webmanifest','./assets/icon-192.png','./assets/icon-512.png','./assets/apple-touch-icon.png'];
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
 // Never freeze the independently published manifest or immutable data downloads in shell caches.
 if(url.pathname.includes('/trip/')&&!url.pathname.endsWith('/trip/bootstrap.js'))return;
 const coreUrls=CORE.map(path=>new URL(path,self.registration.scope).href);
 if(req.mode==='navigate'){
  const base=new URL(self.registration.scope),relative=url.pathname.slice(base.pathname.length);
  const page=relative==='legacy.html'?'./legacy.html':(relative===''||relative==='index.html')?'./index.html':null;
  if(page)event.respondWith(caches.open(CACHE_VERSION).then(cache=>cache.match(page)).then(hit=>hit||fetch(req)));
 }else if(coreUrls.includes(url.href)){
  event.respondWith(caches.open(CACHE_VERSION).then(cache=>cache.match(req)).then(hit=>hit||fetch(req)));
 }
 // No bulk tile downloads, runtime routing API or promise of a complete offline base map.
});
