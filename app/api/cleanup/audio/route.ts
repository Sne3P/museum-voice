import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://backend:5000'

/**
 * Endpoint de nettoyage manuel/automatique des fichiers audio
 * Déclenche le service de nettoyage côté backend
 */
export async function POST(request: NextRequest) {
  try {
    // Appeler le service de nettoyage backend
    const response = await fetch(`${BACKEND_URL}/api/cleanup/audio`, {
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
    console.error('Erreur nettoyage audio:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur serveur' },
      { status: 500 }
    )
  }
}

/**
 * GET pour vérifier le statut du nettoyage (optionnel)
 */
export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/cleanup/status`)
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
