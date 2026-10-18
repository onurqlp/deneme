const NAME='mito-preview-v1c';
const ASSETS=['./','./index.html','./bundle.tar.gz','./kullanim.html'];
self.addEventListener('install',e=>e.waitUntil(caches.open(NAME).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil((async()=>{
 const names=await caches.keys();
 await Promise.all(names.filter(n=>n.startsWith('mito-preview-')&&n!==NAME).map(n=>caches.delete(n)));
 await self.clients.claim();
})()));
self.addEventListener('fetch',e=>{
 const r=e.request,u=new URL(r.url);
 if(r.method!=='GET'||u.origin!==self.location.origin)return;
 if(r.mode==='navigate'){
  e.respondWith((async()=>{const cache=await caches.open(NAME);try{const response=await fetch(r);if(response.ok)await cache.put(r,response.clone());return response;}catch{return await cache.match(r)||await cache.match('./index.html')||Response.error();}})());
 }else{
  e.respondWith(caches.match(r).then(hit=>hit||fetch(r)));
 }
});