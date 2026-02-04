import { NextRequest, NextResponse } from 'next/server'
import { getPostgresPool } from '@/lib/database-postgres'

/**
 * GET /api/criteria-types
 * Récupère tous les types de critères actifs
 */
export async function GET() {
  try {
    const pool = await getPostgresPool()

    const result = await pool.query(`
      SELECT 
        type_id,
        type,
        label,
        description,
        ordre
      FROM criteria_types
      ORDER BY ordre, type
    `)

    return NextResponse.json({
      success: true,
      types: result.rows
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des types de critères:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/criteria-types
 * Crée un nouveau type de critère
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // Accepter type_name ou type pour compatibilité
    const type = body.type || body.type_name
    const { label, description, ordre } = body

    if (!type || !label) {
      return NextResponse.json(
        { success: false, error: 'type et label sont requis' },
        { status: 400 }
      )
    }

    const pool = await getPostgresPool()

    const result = await pool.query(
      `INSERT INTO criteria_types (type, label, description, ordre)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [type, label, description, ordre || 0]
    )

    return NextResponse.json({
      success: true,
      type: result.rows[0]
    }, { status: 201 })
  } catch (error: any) {
    console.error('Erreur lors de la création du type de critère:', error)
    
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Ce type de critère existe déjà' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/criteria-types
 * Met à jour un type de critère
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { type_id, label, description, ordre } = body

    if (!type_id) {
      return NextResponse.json(
        { success: false, error: 'type_id est requis' },
        { status: 400 }
      )
    }

    const pool = await getPostgresPool()

    const updates: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (label !== undefined) {
      updates.push(`label = $${paramCount++}`)
      values.push(label)
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`)
      values.push(description)
    }
    if (ordre !== undefined) {
      updates.push(`ordre = $${paramCount++}`)
      values.push(ordre)
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Aucune modification fournie' },
        { status: 400 }
      )
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(type_id)

    const query = `
      UPDATE criteria_types 
      SET ${updates.join(', ')}
      WHERE type_id = $${paramCount}
      RETURNING *
    `

    const result = await pool.query(query, values)

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Type de critère non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      type: result.rows[0]
    })
  } catch (error) {
    console.error('Erreur lors de la mise à jour du type de critère:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/criteria-types
 * Supprime définitivement un type de critère (CASCADE sur criterias et pregenerations)
 */
export async function DELETE(request: NextRequest) {
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

    // DELETE réel - les FK CASCADE supprimeront les criterias et pregeneration_criterias
    const result = await pool.query(
      'DELETE FROM criteria_types WHERE type_id = $1 RETURNING type_id, type',
      [typeId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Type de critère non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Type "${result.rows[0].type}" supprimé avec succès`
    })
  } catch (error) {
    console.error('Erreur lors de la suppression du type de critère:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
