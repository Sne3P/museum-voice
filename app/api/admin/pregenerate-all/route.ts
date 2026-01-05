import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()

  try {
    // Appeler le backend Flask
    const backendUrl = process.env.BACKEND_API_URL || 'http://backend:5000'
    
    const response = await fetch(`${backendUrl}/api/pregenerate-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        force_regenerate: body.force_regenerate || false,
        use_parallel: body.use_parallel !== false
      })
    })

    const data = await response.json()
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur pregenerate-all:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
