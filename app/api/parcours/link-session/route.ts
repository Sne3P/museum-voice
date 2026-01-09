import { NextRequest, NextResponse } from 'next/server'
import { queryPostgres } from '@/lib/database-postgres'

/**
 * Lie un parcours généré à une session QR code
 * Appelé après la génération du parcours pour tracking du nettoyage
 */
export async function POST(request: NextRequest) {
  try {
    const { token, parcours_id } = await request.json()

    if (!token || !parcours_id) {
      return NextResponse.json(
        { error: 'Token et parcours_id requis' },
        { status: 400 }
      )
    }

    // Vérifier que le token existe et est utilisé (session active)
    const sessions = await queryPostgres<any>(
      'SELECT token, is_used, expires_at FROM qr_code WHERE token = $1',
      [token]
    )

    if (sessions.length === 0) {
      return NextResponse.json(
        { error: 'Session invalide' },
        { status: 404 }
      )
    }

    const session = sessions[0]

    if (!session.is_used) {
      return NextResponse.json(
        { error: 'Session non activée' },
        { status: 400 }
      )
    }

    // Vérifier expiration
    if (session.expires_at && new Date(session.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Session expirée' },
        { status: 410 }
      )
    }

    // Lier le parcours à la session
    await queryPostgres(
      'UPDATE qr_code SET parcours_id = $1 WHERE token = $2',
      [parcours_id, token]
    )

    return NextResponse.json({
      success: true,
      message: 'Parcours lié à la session',
      token,
      parcours_id
    })

  } catch (error) {
    console.error('Erreur liaison parcours-session:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
