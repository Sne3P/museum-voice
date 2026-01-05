import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { getPostgresClient } from '@/lib/database-postgres'

/**
 * API pour nettoyer les PDFs orphelins (uploadés mais non enregistrés en DB)
 * 
 * GET - Liste les PDFs orphelins
 * POST - Supprime les PDFs orphelins
 */

export async function GET() {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'pdfs')
    
    // Lire tous les fichiers PDF
    let files: string[] = []
    try {
      files = await fs.readdir(uploadsDir)
      files = files.filter(f => f.toLowerCase().endsWith('.pdf'))
    } catch (error) {
      console.warn('Répertoire uploads/pdfs non trouvé')
      return NextResponse.json({ 
        orphans: [],
        total: 0,
        message: 'Aucun fichier PDF trouvé'
      })
    }

    // Récupérer tous les PDFs enregistrés en DB
    const client = await getPostgresClient()
    try {
      const result = await client.query(
        'SELECT DISTINCT file_path FROM oeuvres WHERE file_path IS NOT NULL'
      )
      
      const registeredPaths = new Set(
        result.rows.map(row => {
          const filePath = row.file_path
          // Extraire juste le nom du fichier
          return filePath.split('/').pop()
        })
      )

      // Identifier les orphelins (dans uploads mais pas en DB)
      const orphans = files.filter(filename => !registeredPaths.has(filename))

      // Calculer la taille totale
      let totalSize = 0
      for (const filename of orphans) {
        try {
          const stats = await fs.stat(path.join(uploadsDir, filename))
          totalSize += stats.size
        } catch (error) {
          console.warn(`Impossible de lire stats de ${filename}`)
        }
      }

      return NextResponse.json({
        orphans,
        total: orphans.length,
        totalSize,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        registered: registeredPaths.size,
        message: orphans.length > 0 
          ? `${orphans.length} PDF(s) orphelin(s) détecté(s)`
          : 'Aucun PDF orphelin'
      })

    } finally {
      client.release()
    }

  } catch (error) {
    console.error('Erreur GET cleanup-orphan-pdfs:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { dryRun = false } = body

    const uploadsDir = path.join(process.cwd(), 'uploads', 'pdfs')
    
    // Lire tous les fichiers PDF
    let files: string[] = []
    try {
      files = await fs.readdir(uploadsDir)
      files = files.filter(f => f.toLowerCase().endsWith('.pdf'))
    } catch (error) {
      return NextResponse.json({ 
        deleted: [],
        count: 0,
        message: 'Répertoire uploads/pdfs non trouvé'
      })
    }

    // Récupérer tous les PDFs enregistrés en DB
    const client = await getPostgresClient()
    try {
      const result = await client.query(
        'SELECT DISTINCT file_path FROM oeuvres WHERE file_path IS NOT NULL'
      )
      
      const registeredPaths = new Set(
        result.rows.map(row => {
          const filePath = row.file_path
          return filePath.split('/').pop()
        })
      )

      // Identifier les orphelins
      const orphans = files.filter(filename => !registeredPaths.has(filename))

      if (dryRun) {
        return NextResponse.json({
          wouldDelete: orphans,
          count: orphans.length,
          message: `${orphans.length} fichier(s) seraient supprimés (mode simulation)`
        })
      }

      // Supprimer les orphelins
      const deleted: string[] = []
      const errors: Array<{ file: string; error: string }> = []

      for (const filename of orphans) {
        try {
          await fs.unlink(path.join(uploadsDir, filename))
          deleted.push(filename)
          console.log(`✅ Supprimé: ${filename}`)
        } catch (error) {
          errors.push({
            file: filename,
            error: error instanceof Error ? error.message : 'Erreur inconnue'
          })
          console.error(`❌ Erreur suppression ${filename}:`, error)
        }
      }

      return NextResponse.json({
        deleted,
        count: deleted.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `${deleted.length} PDF(s) orphelin(s) supprimé(s)`
      })

    } finally {
      client.release()
    }

  } catch (error) {
    console.error('Erreur POST cleanup-orphan-pdfs:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    }, { status: 500 })
  }
}
