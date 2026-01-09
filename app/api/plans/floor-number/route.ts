import { NextRequest, NextResponse } from 'next/server'
import { getPostgresPool } from '@/lib/database-postgres'

/**
 * PATCH /api/plans/floor-number
 * Manually update floor_number for a plan
 * 
 * Body: { plan_id: number, floor_number: number }
 * 
 * Use this to set basement floors (-1, -2) or adjust floor numbering
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { plan_id, floor_number } = body

    if (plan_id === undefined || floor_number === undefined) {
      return NextResponse.json(
        { success: false, error: 'plan_id and floor_number are required' },
        { status: 400 }
      )
    }

    const pool = await getPostgresPool()

    // Update floor_number
    const result = await pool.query(
      'UPDATE plans SET floor_number = $1 WHERE plan_id = $2 RETURNING *',
      [floor_number, plan_id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Plan not found' },
        { status: 404 }
      )
    }

    console.log(`✅ Updated floor_number for plan ${plan_id} to ${floor_number}`)

    return NextResponse.json({
      success: true,
      plan: result.rows[0]
    })
  } catch (error: any) {
    console.error('Error updating floor_number:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/plans/floor-number/reset
 * Recalculate floor_number for all plans based on current order
 * 
 * Assigns floor_number sequentially: 0, 1, 2, ... based on plan_id order
 */
export async function POST(request: NextRequest) {
  try {
    const pool = await getPostgresPool()

    // Get all plans ordered by plan_id
    const plansResult = await pool.query(
      'SELECT plan_id FROM plans ORDER BY plan_id'
    )

    const plans = plansResult.rows

    // Update floor_number sequentially
    for (let i = 0; i < plans.length; i++) {
      await pool.query(
        'UPDATE plans SET floor_number = $1 WHERE plan_id = $2',
        [i, plans[i].plan_id]
      )
    }

    console.log(`✅ Reset floor_number for ${plans.length} plans`)

    return NextResponse.json({
      success: true,
      message: `Floor numbers reset for ${plans.length} plans`,
      updated_count: plans.length
    })
  } catch (error: any) {
    console.error('Error resetting floor_number:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Server error' },
      { status: 500 }
    )
  }
}
