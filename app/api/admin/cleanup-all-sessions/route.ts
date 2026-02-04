import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://backend:5000'

/**
 * Force cleanup de toutes les sessions et leurs données associées
 * Réservé aux super_admin uniquement
 */
export async function POST(request: NextRequest) {
  try {
    // Appeler le backend pour nettoyer toutes les sessions
    const response = await fetch(`${BACKEND_URL}/api/admin/cleanup-all-sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    const data = await response.json()
    
    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || 'Erreur backend' },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
    
  } catch (error: any) {
    console.error('Erreur cleanup all sessions:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur serveur' },
      { status: 500 }
    )
  }
}
