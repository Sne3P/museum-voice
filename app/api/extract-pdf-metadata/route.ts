import { NextRequest, NextResponse } from 'next/server'

/**
 * API Route pour extraire les métadonnées d'un PDF via le backend Flask
 * Agit comme proxy pour éviter les problèmes CORS
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const pdfPath = formData.get('pdf_path') as string

    if (!file || !pdfPath) {
      return NextResponse.json(
        { success: false, error: 'Fichier et chemin requis' },
        { status: 400 }
      )
    }

    console.log('📄 Extraction métadonnées pour:', pdfPath)

    // Appel au backend Flask (depuis le serveur Next.js, pas depuis le navigateur)
    // Dans Docker: utilise le nom du service 'backend'
    const backendUrl = process.env.BACKEND_API_URL || 'http://backend:5000'
    console.log('🔗 URL backend:', `${backendUrl}/api/pdf/extract-metadata`)
    
    const backendFormData = new FormData()
    backendFormData.append('file', file)
    backendFormData.append('pdf_path', pdfPath)

    const backendResponse = await fetch(`${backendUrl}/api/pdf/extract-metadata`, {
      method: 'POST',
      body: backendFormData
    })

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      console.error('❌ Erreur backend:', backendResponse.status, errorText)
      return NextResponse.json(
        { success: false, error: 'Erreur extraction métadonnées', details: errorText },
        { status: 500 }
      )
    }

    const result = await backendResponse.json()
    console.log('✅ Métadonnées extraites:', result.metadata?.title, '/', result.metadata?.artist)

    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ Erreur extraction métadonnées:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    )
  }
}
