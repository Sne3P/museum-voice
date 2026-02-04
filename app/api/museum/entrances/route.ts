import { NextRequest, NextResponse } from 'next/server'
import { queryPostgres } from '@/lib/database-postgres'

/**
 * GET /api/museum/entrances
 * Récupère tous les points d'entrée
 */
export async function GET() {
  try {
    const entrances = await queryPostgres<any>(`
      SELECT 
        e.entrance_id,
        e.plan_id,
        e.name,
        e.x,
        e.y,
        e.icon,
        e.is_active,
        p.nom as plan_name
      FROM museum_entrances e
      LEFT JOIN plans p ON e.plan_id = p.plan_id
      ORDER BY e.plan_id, e.entrance_id
    `)

    return NextResponse.json({
      success: true,
      entrances
    })
  } catch (error: any) {
    console.error('Error fetching entrances:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/museum/entrances
 * Ajoute un nouveau point d'entrée
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    let { plan_id, name, x, y, icon } = body

    if (x === undefined || y === undefined) {
      return NextResponse.json(
        { success: false, error: 'x et y sont requis' },
        { status: 400 }
      )
    }

    // Si aucun plan_id fourni, créer ou récupérer le plan par défaut
    if (!plan_id) {
      const plans = await queryPostgres<any>('SELECT plan_id FROM plans ORDER BY plan_id LIMIT 1')
      
      if (plans.length === 0) {
        // Créer un plan par défaut
        const newPlan = await queryPostgres<any>(`
          INSERT INTO plans (nom, description)
          VALUES ($1, $2)
          RETURNING plan_id
        `, ['RDC', 'Rez-de-chaussée'])
        plan_id = newPlan[0].plan_id
      } else {
        plan_id = plans[0].plan_id
      }
    }

    // CONTRAINTE UNIQUE: Vérifier si une entrée existe déjà pour ce plan
    // Une seule entrée principale autorisée par plan
    const existingEntrances = await queryPostgres<any>(`
      SELECT entrance_id, name, x, y FROM museum_entrances WHERE plan_id = $1
    `, [plan_id])

    if (existingEntrances.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Une entrée existe déjà pour ce plan ("${existingEntrances[0].name}"). Supprimez-la d'abord ou déplacez-la.`,
          existing: existingEntrances[0]
        },
        { status: 400 }
      )
    }

    const result = await queryPostgres<any>(`
      INSERT INTO museum_entrances (plan_id, name, x, y, icon)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [plan_id, name || 'Entrée principale', x, y, icon || 'door-open'])

    return NextResponse.json({
      success: true,
      entrance: result[0]
    })
  } catch (error: any) {
    console.error('Error creating entrance:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/museum/entrances
 * Met à jour la position d'un point d'entrée (après drag)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { entrance_id, x, y, name, icon, is_active } = body

    if (!entrance_id) {
      return NextResponse.json(
        { success: false, error: 'entrance_id requis' },
        { status: 400 }
      )
    }

    // Construire la requête de mise à jour dynamiquement
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (x !== undefined) {
      updates.push(`x = $${paramIndex++}`)
      values.push(x)
    }
    if (y !== undefined) {
      updates.push(`y = $${paramIndex++}`)
      values.push(y)
    }
    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      values.push(name)
    }
    if (icon !== undefined) {
      updates.push(`icon = $${paramIndex++}`)
      values.push(icon)
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`)
      values.push(is_active)
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Aucune mise à jour fournie' },
        { status: 400 }
      )
    }

    values.push(entrance_id)

    const result = await queryPostgres<any>(`
      UPDATE museum_entrances 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE entrance_id = $${paramIndex}
      RETURNING *
    `, values)

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Entrance non trouvée' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      entrance: result[0]
    })
  } catch (error: any) {
    console.error('Error updating entrance:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/museum/entrances
 * Supprime un point d'entrée
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const entranceId = searchParams.get('id')

    if (!entranceId) {
      return NextResponse.json(
        { success: false, error: 'entrance_id requis' },
        { status: 400 }
      )
    }

    await queryPostgres(`
      DELETE FROM museum_entrances WHERE entrance_id = $1
    `, [entranceId])

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting entrance:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
