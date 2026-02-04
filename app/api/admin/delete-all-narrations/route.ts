import { NextResponse } from 'next/server'

/**
 * DELETE /api/admin/delete-all-narrations
 * 
 * Supprime TOUTES les narrations de la base de données
 * Action irréversible !
 */
export async function DELETE() {
  try {
    // Appeler le backend Flask
    const backendUrl = process.env.BACKEND_API_URL || 'http://backend:5000'
    const endpoint = `${backendUrl}/api/admin/delete-all-narrations`

    const res = await fetch(endpoint, {
      method: 'DELETE'
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: data.error || 'Erreur suppression narrations' },
        { status: res.status }
      )
    }

    return NextResponse.json({
      success: true,
      deleted: data.deleted || 0,
      message: data.message
    })
  } catch (error) {
    console.error('Erreur suppression narrations:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
