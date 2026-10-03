self.addEventListener("push",event=>{
  let data={};try{data=event.data.json();}catch{}
  event.waitUntil(self.registration.showNotification(data.title||"Pembaruan GEMA",{body:data.body||"Baca informasi terbaru.",tag:data.tag||"gema",data:{url:typeof data.url==="string"&&/^\/report\/[0-9a-f-]+$/i.test(data.url)?data.url:"/"}}));
});
self.addEventListener("notificationclick",event=>{
  event.notification.close();
  event.waitUntil(clients.openWindow(new URL(event.notification.data.url,self.location.origin).href));
});
