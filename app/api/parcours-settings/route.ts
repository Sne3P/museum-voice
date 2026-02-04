/**
 * API PUBLIQUE - Paramètres de temps de parcours
 * Accessible sans authentification pour le frontend client
 */

import { NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:postgres@localhost:5432/museum_db'
})

export async function GET() {
  try {
    const client = await pool.connect()
    
    // Récupérer les paramètres de temps de parcours
    const result = await client.query(`
      SELECT setting_key, setting_value 
      FROM museum_settings 
      WHERE setting_key IN ('parcours_max_duration', 'parcours_time_step', 'parcours_default_duration')
    `)
    
    client.release()

    // Valeurs par défaut
    const settings = {
      maxDuration: 5,       // 5 heures max par défaut
      timeStep: 0.5,        // 30 minutes d'intervalle
      defaultDuration: 1    // 1 heure par défaut
    }

    // Parser les valeurs de la DB
    result.rows.forEach((row: { setting_key: string; setting_value: string | number }) => {
      const value = typeof row.setting_value === 'string' 
        ? parseFloat(row.setting_value) 
        : row.setting_value
      
      switch (row.setting_key) {
        case 'parcours_max_duration':
          settings.maxDuration = value || 5
          break
        case 'parcours_time_step':
          settings.timeStep = value || 0.5
          break
        case 'parcours_default_duration':
          settings.defaultDuration = value || 1
          break
      }
    })

    // S'assurer que defaultDuration ne dépasse pas maxDuration
    if (settings.defaultDuration > settings.maxDuration) {
      settings.defaultDuration = settings.maxDuration
    }

    return NextResponse.json({
      success: true,
      ...settings
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres:', error)
    
    // Retourner les valeurs par défaut en cas d'erreur
    return NextResponse.json({
      success: true,
      maxDuration: 5,
      timeStep: 0.5,
      defaultDuration: 1
    })
  }
}
