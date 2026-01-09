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
        (SELECT COUNT(DISTINCT oeuvre_id) FROM pregenerations) as oeuvres_with_pregenerations
    `)

    // Calculer le produit cartésien : nombre de combinaisons possibles
    // Produit du nombre de critères de chaque type
    const combinationsResult = await client.query(`
      WITH criteria_counts AS (
        SELECT type, COUNT(*) as count
        FROM criterias
        GROUP BY type
      )
      SELECT 
        COALESCE(
          (SELECT EXP(SUM(LN(count))) FROM criteria_counts WHERE count > 0),
          0
        )::INTEGER as total_combinations
    `)

    const stats = statsResult.rows[0]
    const expectedPerOeuvre = parseInt(combinationsResult.rows[0].total_combinations || 0)
    const expectedTotal = stats.total_oeuvres * expectedPerOeuvre
    const completionRate = expectedTotal > 0 
      ? (stats.total_pregenerations / expectedTotal) * 100 
      : 0

    console.log('📊 Stats calculées:', {
      total_oeuvres: stats.total_oeuvres,
      total_pregenerations: stats.total_pregenerations,
      expected_per_oeuvre: expectedPerOeuvre,
      expected_total: expectedTotal,
      completion_rate: completionRate
    })

    return NextResponse.json({
      success: true,
      stats: {
        total_oeuvres: parseInt(stats.total_oeuvres),
        total_pregenerations: parseInt(stats.total_pregenerations),
        oeuvres_with_pregenerations: parseInt(stats.oeuvres_with_pregenerations),
        expected_pregenerations: expectedTotal,
        expected_per_oeuvre: expectedPerOeuvre,
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
