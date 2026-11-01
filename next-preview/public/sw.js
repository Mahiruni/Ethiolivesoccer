const CACHE_PREFIX='ethio-live-';

self.addEventListener('install',event=>{
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

// Intentionally do not intercept page, asset, or API requests.
// The previous cache-first shell could keep stale HTML/JS alive and force
// users to hard-refresh after a deployment. Push notifications still use
// this worker, but normal browsing now always follows the browser/network.

self.addEventListener('push',event=>{
  let payload={};
  try{payload=event.data?event.data.json():{}}catch{payload={body:event.data?.text()||''}}
  const title=payload.title||'EthioLiveScores';
  const options={body:payload.body||'New football update',tag:payload.tag||payload.type||'ethio-live-update',data:{url:payload.url||'/'},vibrate:[120,60,120],renotify:true};
  event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=event.notification.data?.url||'/';
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>{
    for(const client of clients){
      if('focus' in client&&new URL(client.url).origin===self.location.origin){client.navigate(target);return client.focus()}
    }
    return self.clients.openWindow?self.clients.openWindow(target):null;
  }));
});
