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
        (SELECT COUNT(DISTINCT oeuvre_id) FROM pregenerations) as oeuvres_with_pregenerations,
        -- Calculer le nombre de combinaisons attendues (produit cartésien des critères)
        (
          SELECT 
            COALESCE((
              SELECT (
                SELECT COUNT(*) FROM criterias WHERE type = 'age'
              ) * (
                SELECT COUNT(*) FROM criterias WHERE type = 'thematique'
              ) * (
                SELECT COUNT(*) FROM criterias WHERE type = 'style_texte'
              )
            ), 36)
        ) as expected_per_oeuvre
    `)

    const stats = statsResult.rows[0]
    const expectedTotal = stats.total_oeuvres * stats.expected_per_oeuvre
    const completionRate = expectedTotal > 0 
      ? (stats.total_pregenerations / expectedTotal) * 100 
      : 0

    return NextResponse.json({
      success: true,
      stats: {
        total_oeuvres: parseInt(stats.total_oeuvres),
        total_pregenerations: parseInt(stats.total_pregenerations),
        total_chunks: parseInt(stats.total_chunks),
        oeuvres_with_pregenerations: parseInt(stats.oeuvres_with_pregenerations),
        expected_pregenerations: expectedTotal,
        completion_rate: completionRate
      }
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
