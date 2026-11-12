"use strict";
const CACHE = "agenda-ejecutiva-v5";
const ASSETS = ["./", "./index.html", "./style.css", "./app.js", "./manifest.webmanifest", "./fondo-original.jpg", "./icon-192.png", "./icon-512.png", "./pluma-ejecutiva.svg"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("agenda-") && key !== CACHE).map(key => caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok && new URL(event.request.url).pathname.endsWith("index.html")) {
      const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match(event.request).then(cached => cached || caches.match("./index.html"))));
});
self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch { data = {body: event.data ? event.data.text() : ""}; }
  event.waitUntil(self.registration.showNotification(data.title || "Agenda Ejecutiva", {
    body: data.body || "Tienes un recordatorio pendiente.",
    icon: "./icon-192.png", badge: "./icon-192.png",
    tag: data.tag || `agenda-${Date.now()}`,
    data: {url: data.url || "./index.html"},
    renotify: true
  }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "./index.html", self.registration.scope);
  if (url.origin !== self.location.origin) return;
  event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(async clients => {
    for (const client of clients) {if (new URL(client.url).origin === url.origin) {await client.focus(); return client.navigate ? client.navigate(url.href) : undefined;}}
    return self.clients.openWindow(url.href);
  }));
});
