import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

/**
 * POST /api/museum-image
 * Upload l'image du musée dans public/uploads/museum/
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get('image') as File

    if (!image) {
      return NextResponse.json(
        { error: 'Aucune image fournie' },
        { status: 400 }
      )
    }

    // Vérifier le type de fichier
    if (!image.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Le fichier doit être une image' },
        { status: 400 }
      )
    }

    // Créer le dossier uploads/museum si nécessaire
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'museum')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Générer un nom de fichier unique
    const timestamp = Date.now()
    const extension = path.extname(image.name)
    const filename = `museum-image-${timestamp}${extension}`
    const filepath = path.join(uploadDir, filename)

    // Convertir le fichier en buffer et l'écrire
    const bytes = await image.arrayBuffer()
    const buffer = new Uint8Array(bytes)
    await writeFile(filepath, buffer)

    // Retourner l'URL de l'image
    const imageUrl = `/uploads/museum/${filename}`

    return NextResponse.json({
      success: true,
      imageUrl
    })
  } catch (error) {
    console.error('Erreur lors de l\'upload de l\'image:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de l\'upload de l\'image' },
      { status: 500 }
    )
  }
}
