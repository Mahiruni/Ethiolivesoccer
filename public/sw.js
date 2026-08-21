const CACHE='ethio-live-v3';
const CORE=['/','/manifest.json'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.pathname.startsWith('/api/'))return;event.respondWith(fetch(event.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));return r}).catch(()=>caches.match(event.request).then(r=>r||caches.match('/'))))});
self.addEventListener('push',event=>{
  let data={title:'EthioLiveScores',body:'A new football update is available.',url:'/#scores'};
  try{data={...data,...event.data.json()}}catch{}
  event.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:data.icon||'/icon-192.png',badge:data.badge||'/icon-192.png',tag:data.tag||'ethio-live-update',renotify:true,data:{url:data.url}}));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();const target=event.notification.data?.url||'/#scores';
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const client of list){if('focus'in client){client.navigate(target);return client.focus()}}return clients.openWindow(target)}));
});
