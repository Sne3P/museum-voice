import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://backend:5000'

/**
 * POST /api/admin/generate-async/all
 * 
 * Lance la prégénération de toutes les œuvres en arrière-plan
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    
    const res = await fetch(`${BACKEND_URL}/api/generation/async/all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error('Erreur lancement génération globale:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur connexion backend' },
      { status: 500 }
    )
  }
}
