import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://backend:5000'

/**
 * GET /api/admin/generation-jobs
 * 
 * Liste tous les jobs de génération (actifs et historique)
 */
export async function GET(request: NextRequest) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/generation/jobs`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error('Erreur récupération jobs:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur connexion backend' },
      { status: 500 }
    )
  }
}
