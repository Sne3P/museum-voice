import { NextRequest, NextResponse } from 'next/server'
import { getPostgresPool } from '@/lib/database-postgres'

/**
 * GET /api/criteria-types/impact?type_id=X
 * Retourne le nombre de critères et narrations impactés par la suppression d'un type
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const typeId = searchParams.get('type_id')

    if (!typeId) {
      return NextResponse.json(
        { success: false, error: 'type_id est requis' },
        { status: 400 }
      )
    }

    const pool = await getPostgresPool()

    // Récupérer le type et compter les critères + narrations
    const result = await pool.query(`
      SELECT 
        ct.type_id,
        ct.type,
        ct.label as type_label,
        COUNT(DISTINCT c.criteria_id) as criteria_count,
        COUNT(DISTINCT pc.pregeneration_id) as narration_count
      FROM criteria_types ct
      LEFT JOIN criterias c ON ct.type = c.type
      LEFT JOIN pregeneration_criterias pc ON c.criteria_id = pc.criteria_id
      WHERE ct.type_id = $1
      GROUP BY ct.type_id, ct.type, ct.label
    `, [typeId])

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Type non trouvé' },
        { status: 404 }
      )
    }

    const row = result.rows[0]
    const criteriaCount = parseInt(row.criteria_count) || 0
    const narrationCount = parseInt(row.narration_count) || 0
    
    return NextResponse.json({
      success: true,
      type_id: parseInt(typeId),
      type: row.type,
      type_label: row.type_label,
      criteria_count: criteriaCount,
      narration_count: narrationCount,
      warning: criteriaCount > 0 || narrationCount > 0
        ? `La suppression du type "${row.type_label}" entraînera la suppression de ${criteriaCount} critère(s) et ${narrationCount} narration(s) pré-générée(s).`
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
