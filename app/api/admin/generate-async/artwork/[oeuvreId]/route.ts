import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://backend:5000'

/**
 * POST /api/admin/generate-async/artwork/[oeuvreId]
 * 
 * Lance la prégénération d'une œuvre en arrière-plan
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ oeuvreId: string }> }
) {
  try {
    const { oeuvreId } = await params
    
    // Validation de l'ID
    if (!oeuvreId || oeuvreId === 'undefined' || oeuvreId === 'null') {
      console.error('Erreur: oeuvreId invalide:', oeuvreId)
      return NextResponse.json(
        { success: false, error: 'ID de l\'œuvre invalide' },
        { status: 400 }
      )
    }
    
    const body = await request.json().catch(() => ({}))
    
    const res = await fetch(`${BACKEND_URL}/api/generation/async/artwork/${oeuvreId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error('Erreur lancement génération œuvre:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur connexion backend' },
      { status: 500 }
    )
  }
}
