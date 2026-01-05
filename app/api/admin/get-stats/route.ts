import { NextRequest, NextResponse } from 'next/server'
import { getPostgresClient } from '@/lib/database-postgres'

export async function GET() {
  const client = await getPostgresClient()

  try {
    // Stats globales
    const statsResult = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM oeuvres) as total_oeuvres,
        (SELECT COUNT(*) FROM pregenerations) as total_pregenerations,
        (SELECT COUNT(*) FROM chunk) as total_chunks,
        (SELECT COUNT(DISTINCT oeuvre_id) FROM pregenerations) as oeuvres_with_pregenerations
    `)

    return NextResponse.json({
      success: true,
      stats: statsResult.rows[0]
    })
  } catch (error) {
    console.error('Erreur get-stats:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}
