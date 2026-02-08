/**
 * Gestionnaire de stockage offline pour Museum Voice
 * 
 * Utilise:
 * - IndexedDB: Stockage du parcours et métadonnées
 * - Service Worker: Cache des audios et images
 * - localStorage: Fallback pour données légères
 */

const DB_NAME = 'MuseumVoiceDB';
const DB_VERSION = 1;
const STORE_PARCOURS = 'parcours';
const STORE_SETTINGS = 'settings';

let db = null;

// ===== INITIALISATION INDEXEDDB =====

export function initOfflineStorage() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[OfflineStorage] Erreur ouverture IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('[OfflineStorage] IndexedDB initialisé');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Store pour les parcours
      if (!database.objectStoreNames.contains(STORE_PARCOURS)) {
        const parcoursStore = database.createObjectStore(STORE_PARCOURS, {
          keyPath: 'id'
        });
        parcoursStore.createIndex('createdAt', 'createdAt', { unique: false });
        console.log('[OfflineStorage] Store parcours créé');
      }

      // Store pour les settings
      if (!database.objectStoreNames.contains(STORE_SETTINGS)) {
        database.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
        console.log('[OfflineStorage] Store settings créé');
      }
    };
  });
}

// ===== GESTION DU PARCOURS =====

/**
 * Sauvegarde le parcours complet dans IndexedDB
 */
export async function saveParcours(parcours) {
  try {
    await initOfflineStorage();

    const parcoursData = {
      id: 'current', // On garde un seul parcours actif
      parcours: parcours,
      createdAt: new Date().toISOString(),
      offlineReady: false
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_PARCOURS], 'readwrite');
      const store = transaction.objectStore(STORE_PARCOURS);
      const request = store.put(parcoursData);

      request.onsuccess = () => {
        console.log('[OfflineStorage] Parcours sauvegardé');
        
        // Aussi sauvegarder dans localStorage comme fallback
        try {
          localStorage.setItem('generatedParcours', JSON.stringify(parcours));
        } catch (e) {
          console.warn('[OfflineStorage] localStorage fallback failed:', e);
        }
        
        resolve(true);
      };

      request.onerror = () => {
        console.error('[OfflineStorage] Erreur sauvegarde parcours:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[OfflineStorage] Erreur:', error);
    // Fallback localStorage
    localStorage.setItem('generatedParcours', JSON.stringify(parcours));
    return true;
  }
}

/**
 * Récupère le parcours depuis IndexedDB
 */
export async function getParcours() {
  try {
    await initOfflineStorage();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_PARCOURS], 'readonly');
      const store = transaction.objectStore(STORE_PARCOURS);
      const request = store.get('current');

      request.onsuccess = () => {
        if (request.result) {
          console.log('[OfflineStorage] Parcours chargé depuis IndexedDB');
          resolve(request.result.parcours);
        } else {
          // Fallback localStorage
          const lsParcours = localStorage.getItem('generatedParcours');
          if (lsParcours) {
            console.log('[OfflineStorage] Parcours chargé depuis localStorage');
            resolve(JSON.parse(lsParcours));
          } else {
            resolve(null);
          }
        }
      };

      request.onerror = () => {
        console.error('[OfflineStorage] Erreur lecture parcours:', request.error);
        // Fallback localStorage
        const lsParcours = localStorage.getItem('generatedParcours');
        resolve(lsParcours ? JSON.parse(lsParcours) : null);
      };
    });
  } catch (error) {
    // Fallback localStorage
    const lsParcours = localStorage.getItem('generatedParcours');
    return lsParcours ? JSON.parse(lsParcours) : null;
  }
}

/**
 * Supprime le parcours stocké
 */
export async function clearParcours() {
  try {
    await initOfflineStorage();

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_PARCOURS], 'readwrite');
      const store = transaction.objectStore(STORE_PARCOURS);
      store.delete('current');
      
      localStorage.removeItem('generatedParcours');
      console.log('[OfflineStorage] Parcours supprimé');
      resolve(true);
    });
  } catch (error) {
    localStorage.removeItem('generatedParcours');
    return true;
  }
}

// ===== CACHE DES MÉDIAS VIA SERVICE WORKER =====

/**
 * Pré-cache tous les médias du parcours pour mode offline
 */
export async function cacheParcoursMedia(parcours) {
  if (!parcours || !parcours.artworks) {
    console.warn('[OfflineStorage] Pas de parcours à cacher');
    return false;
  }

  // Collecter toutes les URLs d'audio et d'images
  const audioUrls = [];
  const imageUrls = [];

  parcours.artworks.forEach(artwork => {
    // Audio
    if (artwork.audio_path) {
      // Convertir chemin relatif en URL absolue
      const audioUrl = artwork.audio_path.startsWith('http') 
        ? artwork.audio_path 
        : `${window.location.origin}${artwork.audio_path}`;
      audioUrls.push(audioUrl);
    }

    // Image
    if (artwork.image_link || artwork.image_url) {
      const imagePath = artwork.image_link || artwork.image_url;
      if (imagePath && imagePath !== '/placeholder.svg') {
        const imageUrl = imagePath.startsWith('http')
          ? imagePath
          : `${window.location.origin}${imagePath}`;
        imageUrls.push(imageUrl);
      }
    }
  });

  console.log(`[OfflineStorage] Caching ${audioUrls.length} audios, ${imageUrls.length} images`);

  // Envoyer au Service Worker pour pré-cache
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    // Cache les audios
    if (audioUrls.length > 0) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_AUDIO',
        audioUrls: audioUrls
      });
    }

    // Cache les images
    if (imageUrls.length > 0) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_PARCOURS_IMAGES',
        imageUrls: imageUrls
      });
    }

    // Marquer le parcours comme prêt offline
    await markParcoursOfflineReady();
    
    return true;
  } else {
    console.warn('[OfflineStorage] Service Worker non disponible');
    return false;
  }
}

/**
 * Marque le parcours comme prêt pour le mode offline
 */
async function markParcoursOfflineReady() {
  try {
    await initOfflineStorage();

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_PARCOURS], 'readwrite');
      const store = transaction.objectStore(STORE_PARCOURS);
      const request = store.get('current');

      request.onsuccess = () => {
        if (request.result) {
          const data = request.result;
          data.offlineReady = true;
          data.cachedAt = new Date().toISOString();
          store.put(data);
          console.log('[OfflineStorage] Parcours marqué comme offline-ready');
        }
        resolve(true);
      };
    });
  } catch (error) {
    console.error('[OfflineStorage] Erreur marquage offline:', error);
    return false;
  }
}

/**
 * Vérifie si le parcours est prêt pour le mode offline
 */
export async function isParcoursOfflineReady() {
  try {
    await initOfflineStorage();

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_PARCOURS], 'readonly');
      const store = transaction.objectStore(STORE_PARCOURS);
      const request = store.get('current');

      request.onsuccess = () => {
        resolve(request.result?.offlineReady || false);
      };

      request.onerror = () => {
        resolve(false);
      };
    });
  } catch (error) {
    return false;
  }
}

// ===== GESTION DES SETTINGS =====

export async function saveSetting(key, value) {
  try {
    await initOfflineStorage();

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_SETTINGS], 'readwrite');
      const store = transaction.objectStore(STORE_SETTINGS);
      store.put({ key, value });
      resolve(true);
    });
  } catch (error) {
    localStorage.setItem(`setting_${key}`, JSON.stringify(value));
    return true;
  }
}

export async function getSetting(key, defaultValue = null) {
  try {
    await initOfflineStorage();

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_SETTINGS], 'readonly');
      const store = transaction.objectStore(STORE_SETTINGS);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result?.value ?? defaultValue);
      };

      request.onerror = () => {
        const lsValue = localStorage.getItem(`setting_${key}`);
        resolve(lsValue ? JSON.parse(lsValue) : defaultValue);
      };
    });
  } catch (error) {
    const lsValue = localStorage.getItem(`setting_${key}`);
    return lsValue ? JSON.parse(lsValue) : defaultValue;
  }
}

// ===== DÉTECTION ÉTAT CONNEXION =====

export function isOnline() {
  return navigator.onLine;
}

export function onOnlineStatusChange(callback) {
  window.addEventListener('online', () => callback(true));
  window.addEventListener('offline', () => callback(false));
  
  // Retourner une fonction de cleanup
  return () => {
    window.removeEventListener('online', () => callback(true));
    window.removeEventListener('offline', () => callback(false));
  };
}

// ===== ENREGISTREMENT SERVICE WORKER =====

export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('[OfflineStorage] Service Worker enregistré:', registration.scope);
      
      // Écouter les messages du Service Worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'AUDIO_CACHED') {
          console.log(`[OfflineStorage] ${event.data.count} fichiers audio mis en cache`);
          // Dispatch custom event pour notifier l'UI
          window.dispatchEvent(new CustomEvent('audioCached', { 
            detail: { count: event.data.count } 
          }));
        }
      });
      
      return registration;
    } catch (error) {
      console.error('[OfflineStorage] Erreur enregistrement Service Worker:', error);
      return null;
    }
  } else {
    console.warn('[OfflineStorage] Service Worker non supporté');
    return null;
  }
}

// ===== EXPORT DÉFAUT =====

export default {
  initOfflineStorage,
  saveParcours,
  getParcours,
  clearParcours,
  cacheParcoursMedia,
  isParcoursOfflineReady,
  saveSetting,
  getSetting,
  isOnline,
  onOnlineStatusChange,
  registerServiceWorker
};
