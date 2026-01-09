/**
 * Utilitaires pour gérer les URLs des fichiers uploadés
 * En prod, les fichiers sont servis par le backend Flask
 */

/**
 * Convertit un chemin d'upload relatif en URL complète
 * En dev/prod Docker, pointe vers le backend Flask qui sert les fichiers
 * 
 * @param path - Chemin relatif commençant par /uploads/
 * @returns URL complète pour accéder au fichier
 */
export function getUploadUrl(path: string | null | undefined): string {
  if (!path) return '/placeholder.svg'
  
  // Si c'est déjà une URL complète ou un placeholder, retourner tel quel
  if (path.startsWith('http://') || path.startsWith('https://') || path === '/placeholder.svg') {
    return path
  }
  
  // En production Docker, utiliser le backend pour servir les uploads
  // Utiliser la variable du bundle ou fallback hardcodé pour prod
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://51.38.188.211:5000'
  
  console.log('🔍 getUploadUrl - NEXT_PUBLIC_BACKEND_URL:', process.env.NEXT_PUBLIC_BACKEND_URL)
  console.log('🔍 getUploadUrl - backendUrl utilisé:', backendUrl)
  console.log('🔍 getUploadUrl - path reçu:', path)
  
  // Normaliser le chemin (retirer /uploads/ si présent au début)
  const normalizedPath = path.startsWith('/uploads/') 
    ? path.substring('/uploads/'.length) 
    : path.startsWith('uploads/') 
      ? path.substring('uploads/'.length)
      : path
  
  const finalUrl = `${backendUrl}/uploads/${normalizedPath}`
  console.log('🔍 getUploadUrl - URL finale:', finalUrl)
  
  return finalUrl
}

/**
 * Extrait le nom de fichier d'un chemin d'upload
 */
export function getUploadFilename(path: string | null | undefined): string {
  if (!path) return ''
  return path.split('/').pop() || ''
}
