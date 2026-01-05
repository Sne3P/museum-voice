import { NextRequest, NextResponse } from 'next/server'
import { getPostgresClient } from '@/lib/database-postgres'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ oeuvreId: string }> }
) {
  const client = await getPostgresClient()
  const { oeuvreId } = await params

  try {
    // Récupérer toutes les prégénérations pour cette œuvre
    const result = await client.query(
      `SELECT * FROM pregenerations 
       WHERE oeuvre_id = $1 
       ORDER BY age_cible, thematique, style_texte`,
      [oeuvreId]
    )

    return NextResponse.json({
      success: true,
      oeuvre_id: parseInt(oeuvreId),
      count: result.rows.length,
      pregenerations: result.rows
    })
  } catch (error) {
    console.error('Erreur get-pregenerations:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}
