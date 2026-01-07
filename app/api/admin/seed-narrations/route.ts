import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/admin/seed-narrations
 * 
 * Lance le script Python de seed intelligent
 * Génère toutes les combinaisons de narrations manquantes
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { oeuvre_id } = body

    // Appeler le backend Flask qui va exécuter le script Python
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:5000'
    const endpoint = oeuvre_id 
      ? `${backendUrl}/api/admin/seed-narrations/${oeuvre_id}`
      : `${backendUrl}/api/admin/seed-narrations`

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: data.error || 'Erreur seed narrations' },
        { status: res.status }
      )
    }

    return NextResponse.json({
      success: true,
      inserted: data.inserted || 0,
      skipped: data.skipped || 0,
      message: data.message
    })
  } catch (error) {
    console.error('Erreur seed narrations:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
