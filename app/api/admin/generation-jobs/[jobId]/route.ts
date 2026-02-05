import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://backend:5000'

/**
 * GET /api/admin/generation-jobs/[jobId]
 * 
 * Récupère le statut d'un job spécifique
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    
    if (!jobId || jobId === 'undefined') {
      return NextResponse.json(
        { success: false, error: 'ID du job invalide' },
        { status: 400 }
      )
    }
    
    const res = await fetch(`${BACKEND_URL}/api/generation/jobs/${jobId}`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error('Erreur récupération job:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur connexion backend' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/generation-jobs/[jobId]
 * 
 * Annule un job (même en cours avec force=true en query param)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'
    
    if (!jobId || jobId === 'undefined') {
      return NextResponse.json(
        { success: false, error: 'ID du job invalide' },
        { status: 400 }
      )
    }
    
    console.log(`🛑 Annulation job ${jobId} (force=${force})`)
    
    const res = await fetch(`${BACKEND_URL}/api/generation/jobs/${jobId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force })
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error('Erreur annulation job:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur connexion backend' },
      { status: 500 }
    )
  }
}
