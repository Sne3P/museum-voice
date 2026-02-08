import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:5000'

/**
 * POST /api/criterias/clear-cache
 * Invalide le cache des critères côté backend
 */
export async function POST() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/criterias/clear-cache`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur invalidation cache:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
