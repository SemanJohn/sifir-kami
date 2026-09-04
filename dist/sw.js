const PREFIX='sifir-kami:'+self.registration.scope+':';
const CACHE=PREFIX+'1.5.0';
const FILES=['./','./index.html','./style.css','./merge.css','./app.js','./game.js','./input.js','./settings.js','./learning.js','./scene.js','./manifest.webmanifest','./vendor/phaser.min.js','./assets/station.png','./assets/icon-180-v1.5.png','./assets/icon-192-v1.5.png','./assets/icon-512-v1.5.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES.map(path=>new Request(path,{cache:'reload'})))).then(()=>self.skipWaiting())));
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
