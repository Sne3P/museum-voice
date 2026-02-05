import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://backend:5000'

/**
 * POST /api/admin/generate-async/profile
 * 
 * Lance la prégénération pour un profil sur toutes les œuvres
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    
    if (!body.criteria_combination) {
      return NextResponse.json(
        { success: false, error: 'criteria_combination requis' },
        { status: 400 }
      )
    }
    
    const res = await fetch(`${BACKEND_URL}/api/generation/async/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error('Erreur lancement génération par profil:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur connexion backend' },
      { status: 500 }
    )
  }
}
