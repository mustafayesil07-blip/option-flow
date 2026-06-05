importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// ── Offline cache ─────────────────────────────────────────────────────────
var CACHE = 'optflow-v8';

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      return c.add('/option-flow/index.html').catch(function(){});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return fetch(e.request).then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        }
        return response;
      }).catch(function() {
        if (cached) return cached;
        if (e.request.mode === 'navigate') {
          return caches.match('/option-flow/index.html');
        }
      });
    })
  );
});

// ── Firebase Cloud Messaging ──────────────────────────────────────────────
firebase.initializeApp({
  apiKey:            "AIzaSyDQQ7GlZ0j6kR_FSTSN06RRGdxY5GMHrHs",
  authDomain:        "optionflow-ef59d.firebaseapp.com",
  projectId:         "optionflow-ef59d",
  storageBucket:     "optionflow-ef59d.firebasestorage.app",
  messagingSenderId: "977067075912",
  appId:             "1:977067075912:web:3732b70b3343fd4c906b7d"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification ?? {};
  self.registration.showNotification(title ?? 'OptionFlow', {
    body:    body ?? '',
    icon:    icon ?? '/icon-192.png',
    badge:        '/icon-192.png',
    data:         payload.data ?? {},
    vibrate:      [200, 100, 200]
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/option-flow/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
