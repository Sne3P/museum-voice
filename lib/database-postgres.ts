/**
 * DATABASE CLIENT - POSTGRESQL
 * Connexion PostgreSQL pour production
 */

import { Pool, PoolClient } from 'pg'

let pool: Pool | null = null

export async function getPostgresPool(): Promise<Pool> {
  if (!pool) {
    const config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'museumvoice',
      user: process.env.DB_USER || 'museum_admin',
      password: process.env.DB_PASSWORD || 'Museum@2026!Secure',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    }
    
    console.log('[PostgreSQL] Connexion avec:', {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user
    })
    
    pool = new Pool(config)

    pool.on('error', (err) => {
      console.error('❌ Unexpected PostgreSQL error:', err)
    })
  }

  return pool
}

export async function queryPostgres<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const pool = await getPostgresPool()
  const result = await pool.query(text, params)
  return result.rows as T[]
}

export async function getPostgresClient(): Promise<PoolClient> {
  const pool = await getPostgresPool()
  return await pool.connect()
}

export async function executeTransaction(queries: Array<{ text: string, params?: any[] }>) {
  const client = await getPostgresClient()
  try {
    await client.query('BEGIN')
    
    for (const query of queries) {
      await client.query(query.text, query.params || [])
    }
    
    await client.query('COMMIT')
    return { success: true }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
