const PREFIX='sifir-kami:'+self.registration.scope+':';
const CACHE=PREFIX+'2.3.0';
const STATION_HASH='80fbae688bb9b7c3bf119cb92bda8f06530baab5f72c8ca0ee276b228685fa42';
const FILES=['./','./index.html','./style.css','./merge.css','./app.js','./game.js','./input.js','./settings.js','./learning.js','./session.js','./scene.js','./audio.js','./manifest.webmanifest','./vendor/phaser.min.js','./assets/station.webp','./assets/icon-180.png','./assets/icon-192.png','./assets/icon-512.png','./assets/icon-maskable-512.png','./assets/fonts/baloo2-700.woff2','./assets/fonts/baloo2-800.woff2','./assets/fonts/dmsans-400.woff2','./assets/fonts/dmsans-700.woff2'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  try{
    await cache.addAll(FILES.map(path=>new Request(path,{cache:'reload'})));
    const background=await cache.match('./assets/station.webp'),bytes=await background.arrayBuffer();
    const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
    if(digest!==STATION_HASH)throw new Error('Incomplete station background');
    await self.skipWaiting();
  }catch(error){await caches.delete(CACHE);throw error;}
})()));
// Activate fixed assets immediately. The app reloads only at the lobby;
// active games already have their JS in memory and continue uninterrupted.
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  if(event.request.mode==='navigate'){
    event.respondWith(caches.open(CACHE).then(cache=>cache.match('./index.html')).then(hit=>hit||fetch(event.request)));return;
  }
  event.respondWith(caches.open(CACHE).then(cache=>cache.match(event.request)).then(hit=>hit||fetch(event.request)));
});
