import { NextRequest, NextResponse } from 'next/server'
import { getPostgresPool } from '@/lib/database-postgres'

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://backend:5000'

// Fonction pour invalider le cache du backend
async function invalidateBackendCache() {
  try {
    await fetch(`${BACKEND_URL}/api/criterias/clear-cache`, { method: 'POST' })
    console.log('✅ Cache backend invalidé')
  } catch (e) {
    console.warn('⚠️ Impossible d\'invalider le cache backend:', e)
  }
}

// Helper pour ajouter les headers CORS
function addCORSHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

/**
 * OPTIONS /api/criterias
 * Gérer les preflight requests CORS
 */
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 })
  return addCORSHeaders(response)
}

/**
 * GET /api/criterias
 * Récupère tous les paramètres de critères ou filtre par type
 * Query params: ?type=age|thematique|style_texte
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    const pool = await getPostgresPool()

    let query = `
      SELECT 
        criteria_id, 
        type, 
        name, 
        label,
        description, 
        image_link,
        ai_indication,
        ordre,
        created_at,
        updated_at
      FROM criterias
      WHERE 1=1
    `
    const params: any[] = []

    if (type) {
      query += ' AND type = $1'
      params.push(type)
    }

    query += ' ORDER BY type, ordre, name'

    const result = await pool.query(query, params)

    return addCORSHeaders(NextResponse.json({
      success: true,
      criterias: result.rows
    }))
  } catch (error) {
    console.error('Erreur lors de la récupération des critères:', error)
    return addCORSHeaders(NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    ))
  }
}

/**
 * POST /api/criterias
 * Crée un nouveau paramètre de critère
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, name, label, description, image_link, ai_indication, ordre } = body

    if (!type || !name || !label) {
      return NextResponse.json(
        { success: false, error: 'type, name et label sont requis' },
        { status: 400 }
      )
    }

    const pool = await getPostgresPool()

    // S'assurer que le type existe dans criteria_types
    // Générer automatiquement le label depuis le type
    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ')
    
    await pool.query(
      `INSERT INTO criteria_types (type, label, ordre)
       VALUES ($1, $2, 0)
       ON CONFLICT (type) DO NOTHING`,
      [type, typeLabel]
    )

    const result = await pool.query(
      `INSERT INTO criterias (type, name, label, description, image_link, ai_indication, ordre)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [type, name, label, description, image_link, ai_indication, ordre || 0]
    )

    // Invalider le cache backend après création
    await invalidateBackendCache()

    return addCORSHeaders(NextResponse.json({
      success: true,
      criteria: result.rows[0]
    }, { status: 201 }))
  } catch (error: any) {
    console.error('Erreur lors de la création du critère:', error)
    
    if (error.code === '23505') {
      return addCORSHeaders(NextResponse.json(
        { success: false, error: 'Ce paramètre existe déjà pour ce type' },
        { status: 409 }
      ))
    }

    return addCORSHeaders(NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    ))
  }
}

/**
 * PUT /api/criterias
 * Met à jour un paramètre de critère existant
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { criteria_id, label, description, image_link, ai_indication, ordre, is_active } = body

    if (!criteria_id) {
      return addCORSHeaders(NextResponse.json(
        { success: false, error: 'criteria_id est requis' },
        { status: 400 }
      ))
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
    if (image_link !== undefined) {
      updates.push(`image_link = $${paramCount++}`)
      values.push(image_link)
    }
    if (ai_indication !== undefined) {
      updates.push(`ai_indication = $${paramCount++}`)
      values.push(ai_indication)
    }
    if (ordre !== undefined) {
      updates.push(`ordre = $${paramCount++}`)
      values.push(ordre)
    }

    if (updates.length === 0) {
      return addCORSHeaders(NextResponse.json(
        { success: false, error: 'Aucune modification fournie' },
        { status: 400 }
      ))
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(criteria_id)

    const query = `
      UPDATE criterias 
      SET ${updates.join(', ')}
      WHERE criteria_id = $${paramCount}
      RETURNING *
    `

    const result = await pool.query(query, values)

    if (result.rows.length === 0) {
      return addCORSHeaders(NextResponse.json(
        { success: false, error: 'Critère non trouvé' },
        { status: 404 }
      ))
    }

    // Invalider le cache backend après modification
    await invalidateBackendCache()

    return addCORSHeaders(NextResponse.json({
      success: true,
      criteria: result.rows[0]
    }))
  } catch (error) {
    console.error('Erreur lors de la mise à jour du critère:', error)
    return addCORSHeaders(NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    ))
  }
}

/**
 * DELETE /api/criterias
 * Supprime définitivement un paramètre de critère
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const criteriaId = searchParams.get('criteria_id')

    if (!criteriaId) {
      return addCORSHeaders(NextResponse.json(
        { success: false, error: 'criteria_id est requis' },
        { status: 400 }
      ))
    }

    const pool = await getPostgresPool()

    // DELETE réel, pas de soft delete
    const result = await pool.query(
      'DELETE FROM criterias WHERE criteria_id = $1 RETURNING criteria_id',
      [criteriaId]
    )

    if (result.rows.length === 0) {
      return addCORSHeaders(NextResponse.json(
        { success: false, error: 'Critère non trouvé' },
        { status: 404 }
      ))
    }

    // Invalider le cache backend après suppression
    await invalidateBackendCache()

    return addCORSHeaders(NextResponse.json({
      success: true,
      message: 'Critère supprimé définitivement'
    }))
  } catch (error) {
    console.error('Erreur lors de la suppression du critère:', error)
    return addCORSHeaders(NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
      ))
  }
}
