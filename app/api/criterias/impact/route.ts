import { NextRequest, NextResponse } from 'next/server'
import { getPostgresPool } from '@/lib/database-postgres'

/**
 * GET /api/criterias/impact?criteria_id=X
 * Retourne le nombre de prégénérations (narrations) qui seront supprimées
 * si on supprime ce critère
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const criteriaId = searchParams.get('criteria_id')

    if (!criteriaId) {
      return NextResponse.json(
        { success: false, error: 'criteria_id est requis' },
        { status: 400 }
      )
    }

    const pool = await getPostgresPool()

    // Compter les prégénérations liées à ce critère
    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT pc.pregeneration_id) as narration_count,
        c.label as criteria_label,
        c.type as criteria_type
      FROM criterias c
      LEFT JOIN pregeneration_criterias pc ON c.criteria_id = pc.criteria_id
      WHERE c.criteria_id = $1
      GROUP BY c.criteria_id, c.label, c.type
    `, [criteriaId])

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Critère non trouvé' },
        { status: 404 }
      )
    }

    const row = result.rows[0]
    
    return NextResponse.json({
      success: true,
      criteria_id: parseInt(criteriaId),
      criteria_label: row.criteria_label,
      criteria_type: row.criteria_type,
      narration_count: parseInt(row.narration_count) || 0,
      warning: parseInt(row.narration_count) > 0 
        ? `La suppression de "${row.criteria_label}" entraînera la suppression de ${row.narration_count} narration(s) pré-générée(s).`
        : null
    })
  } catch (error) {
    console.error('Erreur lors du calcul de l\'impact:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
