import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://backend:5000'

/**
 * POST /api/admin/generation-jobs/cancel-all
 * 
 * Annule tous les jobs en cours ou en attente
 */
export async function POST(request: NextRequest) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/generation/jobs/cancel-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error('Erreur annulation en masse:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur connexion backend' },
      { status: 500 }
    )
  }
}
