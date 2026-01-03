import { NextRequest, NextResponse } from 'next/server'
import { queryPostgres } from '@/lib/database-postgres'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Token manquant' },
        { status: 400 }
      )
    }

    // Vérifier que le token existe et n'est pas déjà utilisé
    const existingTokens = await queryPostgres<any>(
      'SELECT token, created_by, created_at, is_used FROM qr_code WHERE token = $1',
      [token]
    )

    if (existingTokens.length === 0) {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 400 }
      )
    }

    const existingToken = existingTokens[0]
    if (existingToken.is_used) {
      return NextResponse.json(
        { error: 'Token déjà utilisé' },
        { status: 400 }
      )
    }

    // Marquer le token comme utilisé
    await queryPostgres(
      'UPDATE qr_code SET is_used = true, used_at = CURRENT_TIMESTAMP WHERE token = $1',
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
        token: updatedToken.token,
        createdBy: updatedToken.created_by,
        createdAt: updatedToken.created_at,
        usedAt: updatedToken.used_at
      }
    })

  } catch (error) {
    console.error('Erreur utilisation token:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de l\'utilisation du token' },
      { status: 500 }
    )
  }
}