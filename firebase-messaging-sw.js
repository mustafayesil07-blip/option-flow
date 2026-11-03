// ── Offline cache ─────────────────────────────────────────────────────────
// DIKKAT: Uygulamanin GERCEK service worker'i bu dosyadir (index.html
// bunu register ediyor). Depodaki sw.js hicbir yerde kayitli degil —
// oradaki CACHE surumunu artirmak hicbir sey yapmaz.
// Yeni surum yayinlarken CACHE degerini burada artirin.
var CACHE = 'optflow-v69';
var APP_SHELL = '/option-flow/index.html';
// Uygulamanin calismasi icin gereken her sey kurulumda indirilir; boylece
// cevrimdisi acilis, dosyalarin daha once tesadufen onbellege girmis
// olmasina bagli kalmaz (eskiden yalnizca index.html onbellekteydi,
// kutuphaneler her surum guncellemesinde silinip kaybolabiliyordu).
var PRECACHE = [
  APP_SHELL,
  '/option-flow/manifest.json',
  '/option-flow/icon-192.png',
  '/option-flow/icon-512.png'
];
var LIBS = [
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js'
];
// Ag bu sureden uzun cevap vermezse onbellekteki surum acilir (zayif/
// "bagli ama internet yok" baglantida sayfa sonsuza dek beklemesin).
var NAV_TIMEOUT_MS = 4000;

function _isLib(url) {
  return (url.hostname === 'cdnjs.cloudflare.com') ||
         (url.hostname === 'www.gstatic.com' && url.pathname.indexOf('/firebasejs/') === 0);
}

function _withTimeout(p, ms) {
  return new Promise(function(res, rej) {
    var t = setTimeout(function() { rej(new Error('timeout')); }, ms);
    p.then(function(v) { clearTimeout(t); res(v); }, function(e) { clearTimeout(t); rej(e); });
  });
}

// Uygulama sayfasini onbellekten bul: once tam adres, sonra sorgusuz,
// en son uygulama kabugu.
function _cachedPage(req) {
  return caches.open(CACHE).then(function(c) {
    return c.match(req).then(function(r) {
      return r || c.match(req, { ignoreSearch: true });
    }).then(function(r) {
      return r || c.match(APP_SHELL);
    }).then(function(r) {
      return r || c.match('/option-flow/');
    });
  }).then(function(r) {
    return r || caches.match(APP_SHELL, { ignoreSearch: true });
  });
}

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      // Tek tek eklenir: biri inemezse kurulum yine basarili olur.
      var own = PRECACHE.map(function(u) {
        return fetch(new Request(u, { cache: 'reload' })).then(function(r) {
          if (r && r.ok) return c.put(u, r);
        }).catch(function(){});
      });
      // Kutuphaneler CORS ile alinir: ES modulleri (Firebase) opak yaniti kabul etmez.
      var libs = LIBS.map(function(u) {
        return c.match(u).then(function(hit) {
          if (hit) return;
          return caches.match(u).then(function(old) {     // onceki surumun onbelleginden tasi
            if (old && old.type !== 'opaque') return c.put(u, old);
            return fetch(new Request(u, { mode: 'cors', credentials: 'omit' })).then(function(r) {
              if (r && r.ok) return c.put(u, r);
            });
          });
        }).catch(function(){});
      });
      return Promise.all(own.concat(libs));
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
  var isLib = _isLib(url);
  if (url.origin !== self.location.origin && !isLib) return;

  // Kur tablosu her zaman taze olmali — cache'e hic dokunma.
  // (Cache-bust query'si yuzunden onbellegi de sisirirdi.)
  if (url.pathname.indexOf('kurlar.json') !== -1) return;

  // Surumlu kutuphaneler degismez: once onbellek (hizli + cevrimdisi).
  if (isLib) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        if (cached) return cached;
        return fetch(e.request).then(function(response) {
          if (response && (response.status === 200 || response.type === 'opaque')) {
            var clone = response.clone();
            caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
          }
          return response;
        });
      })
    );
    return;
  }

  var isNav = (e.request.mode === 'navigate');
  // Sayfa gezinmelerinde HTTP cache'i tamamen atla. Aksi halde
  // GitHub Pages'in cache header'lari yuzunden network-first olmasina
  // ragmen bayat index.html donebiliyor.
  var req = isNav
    ? new Request(e.request.url, { cache: 'reload', credentials: 'same-origin' })
    : e.request;
  var net = fetch(req).then(function(response) {
    if (response && response.status === 200) {
      var clone = response.clone();
      caches.open(CACHE).then(function(c) {
        c.put(e.request, clone.clone());
        // Uygulama hangi adresle acilirsa acilsin kabuk da guncel kalsin
        if (isNav && url.pathname.indexOf('/option-flow/') === 0) c.put(APP_SHELL, clone);
      });
    }
    return response;
  });
  e.waitUntil(net.catch(function(){}));
  e.respondWith(
    _withTimeout(net, isNav ? NAV_TIMEOUT_MS : 8000).catch(function() {
      var fallback = isNav ? _cachedPage(e.request) : caches.match(e.request);
      return fallback.then(function(cached) {
        // Onbellekte yoksa agin cevabini beklemeye devam et
        return cached || net;
      });
    })
  );
});

// ── Firebase Cloud Messaging ──────────────────────────────────────────────
// Bildirimler istege bagli: Firebase yuklenemez ya da tarayici desteklemezse
// hata yutulur. Aksi halde tum service worker calismaz ve uygulama hic
// cevrimdisi acilamaz.
try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');
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
} catch (err) {
  // bildirimler devre disi; offline onbellek etkilenmez
}

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
