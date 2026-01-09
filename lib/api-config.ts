/**
 * Configuration centralisée pour toutes les routes API
 * Utilise les variables d'environnement définies dans docker-compose
 * Les fallbacks localhost ne sont utilisés qu'en développement
 */

export const API_CONFIG = {
  // Backend Flask API (interne Docker network)
  BACKEND_API_URL: process.env.BACKEND_API_URL || 'http://backend:5000',
  
  // Next.js Admin API (interne Docker network)
  ADMIN_API_URL: process.env.ADMIN_API_URL || 'http://app:3000',
  
  // React Client Frontend (interne Docker network pour les containers)
  // En production: utilisé par les autres containers pour appeler le client
  CLIENT_URL: process.env.NEXT_PUBLIC_CLIENT_URL || 'http://client:80',
  
  // URLs publiques (pour les URLs de redirection/QR codes)
  // En production: sera remplacé par votre domaine
  PUBLIC_CLIENT_URL: process.env.NEXT_PUBLIC_CLIENT_URL || 'http://localhost:8080',
  PUBLIC_ADMIN_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
}

// Export des URLs avec fallbacks appropriés
export const getBackendApiUrl = () => API_CONFIG.BACKEND_API_URL
export const getAdminApiUrl = () => API_CONFIG.ADMIN_API_URL
export const getPublicClientUrl = () => API_CONFIG.PUBLIC_CLIENT_URL
export const getPublicAdminUrl = () => API_CONFIG.PUBLIC_ADMIN_URL
