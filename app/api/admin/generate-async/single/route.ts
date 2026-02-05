import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://backend:5000'

/**
 * POST /api/admin/generate-async/single
 * 
 * Lance la génération d'UNE SEULE narration (1 œuvre + 1 profil) via le système de jobs.
 * Permet de ne pas interrompre les autres jobs en cours.
 * 
 * Body: {
 *   oeuvre_id: number,
 *   criteria_combination: { age: 1, thematique: 5, style_texte: 8 },
 *   force_regenerate?: boolean (default: true)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    
    if (!body.oeuvre_id || !body.criteria_combination) {
      return NextResponse.json(
        { success: false, error: 'oeuvre_id et criteria_combination requis' },
        { status: 400 }
      )
    }
    
    const res = await fetch(`${BACKEND_URL}/api/generation/async/single`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        oeuvre_id: body.oeuvre_id,
        criteria_combination: body.criteria_combination,
        force_regenerate: body.force_regenerate ?? true
      })
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error('Erreur lancement génération single:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur connexion backend' },
      { status: 500 }
    )
  }
}
