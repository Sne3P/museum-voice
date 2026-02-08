/**
 * Service Worker pour Museum Voice - Mode Offline
 * 
 * Stratégies de cache:
 * - App Shell (HTML, CSS, JS): Cache First
 * - API: Network First with Cache Fallback
 * - Audios: Cache First (pour lecture offline)
 * - Images: Stale While Revalidate
 */

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAMES = {
  static: `museum-voice-static-${CACHE_VERSION}`,
  audio: `museum-voice-audio-${CACHE_VERSION}`,
  images: `museum-voice-images-${CACHE_VERSION}`,
  api: `museum-voice-api-${CACHE_VERSION}`
};

// Assets statiques à pré-cacher
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  '/placeholder.svg'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installation...');
  
  event.waitUntil(
    caches.open(CACHE_NAMES.static)
      .then(cache => {
        console.log('[SW] Pré-cache des assets statiques');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activation et nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => {
              // Supprimer les anciennes versions de cache
              return name.startsWith('museum-voice-') && 
                     !Object.values(CACHE_NAMES).includes(name);
            })
            .map(name => {
              console.log('[SW] Suppression ancien cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') return;
  
  // Ignorer les requêtes WebSocket et extensions
  if (url.protocol === 'ws:' || url.protocol === 'wss:') return;
  if (url.pathname.includes('hot-update')) return;
  
  // Stratégie selon le type de ressource
  if (isAudioRequest(url)) {
    // AUDIO: Cache First (priorité offline)
    event.respondWith(cacheFirst(event.request, CACHE_NAMES.audio));
  } 
  else if (isImageRequest(url)) {
    // IMAGES: Stale While Revalidate
    event.respondWith(staleWhileRevalidate(event.request, CACHE_NAMES.images));
  }
  else if (isApiRequest(url)) {
    // API: Network First avec fallback cache
    event.respondWith(networkFirst(event.request, CACHE_NAMES.api));
  }
  else if (isStaticAsset(url)) {
    // STATIC: Cache First
    event.respondWith(cacheFirst(event.request, CACHE_NAMES.static));
  }
  else {
    // DEFAULT: Network First
    event.respondWith(networkFirst(event.request, CACHE_NAMES.static));
  }
});

// ===== HELPERS DE DÉTECTION =====

function isAudioRequest(url) {
  return url.pathname.includes('/audio/') || 
         url.pathname.endsWith('.wav') || 
         url.pathname.endsWith('.mp3') ||
         url.pathname.includes('/parcours-audio/');
}

function isImageRequest(url) {
  return url.pathname.includes('/uploads/') ||
         url.pathname.endsWith('.jpg') ||
         url.pathname.endsWith('.jpeg') ||
         url.pathname.endsWith('.png') ||
         url.pathname.endsWith('.webp') ||
         url.pathname.endsWith('.svg');
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isStaticAsset(url) {
  return url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.html') ||
         url.pathname === '/';
}

// ===== STRATÉGIES DE CACHE =====

/**
 * Cache First: Retourne le cache, sinon réseau
 * Idéal pour: assets statiques, audios
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    console.log('[SW] Cache hit:', request.url);
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    // Mettre en cache si réponse OK
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      console.log('[SW] Cached:', request.url);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network error, no cache:', request.url);
    
    // Fallback pour les pages HTML
    if (request.headers.get('accept')?.includes('text/html')) {
      const offlinePage = await caches.match('/offline.html');
      if (offlinePage) return offlinePage;
    }
    
    return new Response('Offline - Ressource non disponible', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

/**
 * Network First: Réseau d'abord, sinon cache
 * Idéal pour: API, pages dynamiques
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const networkResponse = await fetch(request);
    
    // Mettre en cache si réponse OK
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback pour les pages HTML → page offline
    if (request.headers.get('accept')?.includes('text/html')) {
      const offlinePage = await caches.match('/offline.html');
      if (offlinePage) return offlinePage;
      // Fallback sur index.html si offline.html pas dispo
      return cache.match('/index.html');
    }
    
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Stale While Revalidate: Retourne cache immédiatement, met à jour en arrière-plan
 * Idéal pour: images, ressources qui changent peu
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Lancer la mise à jour en arrière-plan
  const fetchPromise = fetch(request)
    .then(networkResponse => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => null);
  
  // Retourner le cache immédiatement si disponible
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Sinon attendre le réseau
  return fetchPromise || new Response('Offline', { status: 503 });
}

// ===== MESSAGE HANDLING =====

self.addEventListener('message', (event) => {
  if (event.data.type === 'CACHE_AUDIO') {
    // Pré-cacher les audios du parcours
    cacheAudioFiles(event.data.audioUrls);
  }
  
  if (event.data.type === 'CACHE_PARCOURS_IMAGES') {
    // Pré-cacher les images du parcours
    cacheImages(event.data.imageUrls);
  }
  
  if (event.data.type === 'CLEAR_PARCOURS_CACHE') {
    // Nettoyer le cache d'un parcours spécifique
    clearParcoursCache(event.data.parcoursId);
  }
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function cacheAudioFiles(audioUrls) {
  if (!audioUrls || audioUrls.length === 0) return;
  
  const cache = await caches.open(CACHE_NAMES.audio);
  
  console.log(`[SW] Pré-cache de ${audioUrls.length} fichiers audio...`);
  
  for (const url of audioUrls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
        console.log('[SW] Audio cached:', url);
      }
    } catch (error) {
      console.warn('[SW] Failed to cache audio:', url, error);
    }
  }
  
  // Notifier les clients que le cache est prêt
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'AUDIO_CACHED',
        count: audioUrls.length
      });
    });
  });
}

async function cacheImages(imageUrls) {
  if (!imageUrls || imageUrls.length === 0) return;
  
  const cache = await caches.open(CACHE_NAMES.images);
  
  console.log(`[SW] Pré-cache de ${imageUrls.length} images...`);
  
  for (const url of imageUrls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
      }
    } catch (error) {
      console.warn('[SW] Failed to cache image:', url);
    }
  }
}

async function clearParcoursCache(parcoursId) {
  const audioCache = await caches.open(CACHE_NAMES.audio);
  const keys = await audioCache.keys();
  
  for (const request of keys) {
    if (request.url.includes(`parcours-${parcoursId}`)) {
      await audioCache.delete(request);
      console.log('[SW] Deleted from cache:', request.url);
    }
  }
}

console.log('[SW] Service Worker loaded');
