import React from 'react';
import ReactDOM from 'react-dom/client';
import './theme.css';
import './index.css';
import App from './App';
import { registerServiceWorker, initOfflineStorage } from './utils/offlineStorage';

// Initialiser le stockage offline
initOfflineStorage().catch(err => {
  console.warn('IndexedDB init failed, using localStorage fallback:', err);
});

// Enregistrer le Service Worker pour le mode offline
if (process.env.NODE_ENV === 'production') {
  registerServiceWorker();
} else {
  console.log('[Dev] Service Worker désactivé en développement');
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
