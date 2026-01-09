import { NextRequest, NextResponse } from 'next/server'
import { queryPostgres } from '@/lib/database-postgres'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Token manquant' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        }
      )
    }

    // Vérifier que le token existe et n'est pas déjà utilisé
    const existingTokens = await queryPostgres<any>(
      'SELECT token, created_by, created_at, is_used, expires_at FROM qr_code WHERE token = $1',
      [token]
    )

    if (existingTokens.length === 0) {
      return NextResponse.json(
        { error: 'Token invalide' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        }
      )
    }

    const existingToken = existingTokens[0]
    
    // Vérifier expiration
    if (existingToken.expires_at && new Date(existingToken.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Token expiré' },
        { 
          status: 410,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        }
      )
    }
    
    if (existingToken.is_used) {
      return NextResponse.json(
        { error: 'Token déjà utilisé' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        }
      )
    }

    // Marquer le token comme utilisé
    await queryPostgres(
      'UPDATE qr_code SET is_used = 1, used_at = CURRENT_TIMESTAMP WHERE token = $1',
      [token]
    )

    // Récupérer les données mises à jour
    const updatedTokens = await queryPostgres<any>(
      'SELECT token, created_by, created_at, used_at FROM qr_code WHERE token = $1',
      [token]
    )

    return NextResponse.json({
      success: true,
      message: 'Token utilisé avec succès',
      data: {
        token: updatedTokens[0].token,
        createdBy: updatedTokens[0].created_by,
        createdAt: updatedTokens[0].created_at,
        usedAt: updatedTokens[0].used_at
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })

  } catch (error) {
    console.error('Erreur utilisation token:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de l\'utilisation du token' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}