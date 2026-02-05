/**
 * Gestion des sessions utilisateur pour Museum Voice
 * Vérifie la validité des sessions via token QR code
 */

// Pas besoin d'URL absolue - nginx route les appels API

/**
 * Vérifie si une session est active et valide
 * @returns {Promise<{valid: boolean, token: string|null, data: object|null}>}
 */
export async function checkSession() {
  try {
    const token = localStorage.getItem('museum-session-token');
    
    if (!token) {
      return { valid: false, token: null, data: null };
    }

    // Vérifier la validité du token via l'API (URL relative → nginx)
    const response = await fetch(`/api/qrcode?token=${token}`);
    
    if (!response.ok) {
      // Token invalide ou expiré
      localStorage.removeItem('museum-session-token');
      return { valid: false, token: null, data: null };
    }

    const data = await response.json();
    
    // Vérifier l'expiration
    if (data.token.expires_at) {
      const expiresAt = new Date(data.token.expires_at);
      if (expiresAt < new Date()) {
        localStorage.removeItem('museum-session-token');
        return { valid: false, token: null, data: null };
      }
    }

    return { valid: true, token, data: data.token };
  } catch (error) {
    console.error('❌ Erreur vérification session:', error);
    return { valid: false, token: null, data: null };
  }
}

/**
 * Active une session avec un token
 * @param {string} token - Token QR code
 * @returns {Promise<boolean>}
 */
export async function activateSession(token) {
  try {
    const response = await fetch(`/api/qrcode/use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    if (data.success) {
      localStorage.setItem('museum-session-token', token);
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Erreur activation session:', error);
    return false;
  }
}

/**
 * Invalide la session actuelle
 */
export function clearSession() {
  localStorage.removeItem('museum-session-token');
  localStorage.removeItem('generatedParcours');
}
