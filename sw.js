const CACHE='conectacuba-shell-v17';
const SHELL=['/','/app/','/landing.css?v=17','/landing.js?v=17','/styles.css?v=17','/app.css?v=17','/hiring.css?v=17','/hiring.js?v=17','/opportunities.js?v=17','/ios.css?v=17','/auth-config.js?v=17','/auth.js?v=17','/manifest.webmanifest','/icon.svg','/icon-192.png','/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('conectacuba-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;
  if(event.request.mode==='navigate'){
    const isApp=url.pathname==='/app'||url.pathname.startsWith('/app/'),page=isApp?'/app/':'/';
    // Unknown routes can request the network, but never replace either saved entry page.
    const entry=isApp?(url.pathname==='/app'||url.pathname==='/app/'||url.pathname==='/app/index.html'):(url.pathname==='/'||url.pathname==='/index.html');
    event.respondWith((async()=>{
      try{
        const response=await Promise.race([fetch(event.request),new Promise((_,reject)=>setTimeout(()=>reject(new Error('offline')),7000))]);
        if(response.ok&&entry){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(page,copy)));}
        return response;
      }catch{return(await caches.match(page))||Response.error();}
    })());return;
  }
  if(!SHELL.includes(url.pathname+url.search))return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}return response;})));
});
