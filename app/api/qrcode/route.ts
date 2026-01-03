import { NextRequest, NextResponse } from 'next/server'
import { queryPostgres } from '@/lib/database-postgres'

export async function POST(request: NextRequest) {
  try {
    const { userId, userName } = await request.json()

    const generateToken = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
      let token = ''
      for (let i = 0; i < 32; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return token
    }

    let token = generateToken()
    let isUnique = false
    let attempts = 0
    
    while (!isUnique && attempts < 5) {
      const existingTokens = await queryPostgres<any>('SELECT token FROM qr_code WHERE token = $1', [token])
      
      if (existingTokens.length === 0) {
        isUnique = true
      } else {
        token = generateToken()
        attempts++
      }
    }

    if (!isUnique) {
      return NextResponse.json({ error: 'Impossible de générer un token unique' }, { status: 500 })
    }

    await queryPostgres(
      'INSERT INTO qr_code (token, created_by, is_used) VALUES ($1, $2, false)',
      [token, userName]
    )

    const createdTokens = await queryPostgres<any>(
      'SELECT token, created_at FROM qr_code WHERE token = $1',
      [token]
    )

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const qrUrl = `${baseUrl}/audioguide?token=${token}`

    return NextResponse.json({
      success: true,
      token: token,
      url: qrUrl,
      createdAt: createdTokens[0].created_at
    })

  } catch (error) {
    console.error('Erreur génération QR code:', error)
    return NextResponse.json({ error: 'Erreur serveur lors de la génération du QR code' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 400 })
    }

    const tokens = await queryPostgres<any>(
      'SELECT token, created_by, created_at, is_used, used_at FROM qr_code WHERE token = $1',
      [token]
    )

    if (tokens.length === 0) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 404 })
    }

    return NextResponse.json({ token: tokens[0] })

  } catch (error) {
    console.error('Erreur récupération token:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
