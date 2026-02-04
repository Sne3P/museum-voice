/**
 * RENDU DES ŒUVRES D'ART
 * Utilise les constantes de couleur centralisées pour cohérence
 */

import type { Artwork, Point } from '@/core/entities'
import { COLORS, STROKE_WIDTHS, VERTEX_RADIUS } from '@/core/constants'
import { worldToCanvas } from '@/core/utils'

export function drawArtwork(
  ctx: CanvasRenderingContext2D,
  artwork: Artwork,
  zoom: number,
  pan: Point,
  isSelected: boolean = false,
  isHovered: boolean = false,
  isInvalid: boolean = false,
  isDuplicating: boolean = false
) {
  const size = artwork.size || [1, 1]
  const [x, y] = artwork.xy
  const [width, height] = size

  // Convertir en coordonnées canvas (xy est le coin top-left)
  const topLeft = worldToCanvas({ x, y }, zoom, pan)
  const bottomRight = worldToCanvas({ x: x + width, y: y + height }, zoom, pan)

  const canvasWidth = bottomRight.x - topLeft.x
  const canvasHeight = bottomRight.y - topLeft.y

  // Couleurs selon état (constantes centralisées)
  const fillColor = isInvalid || isDuplicating
    ? COLORS.artworkInvalid
    : isSelected
    ? COLORS.artworkSelected
    : isHovered
    ? COLORS.artworkHovered
    : COLORS.artworkDefault

  const strokeColor = isInvalid || isDuplicating
    ? COLORS.artworkStrokeInvalid
    : COLORS.artworkStroke

  // Fond
  ctx.beginPath()
  ctx.rect(topLeft.x, topLeft.y, canvasWidth, canvasHeight)
  ctx.fillStyle = fillColor
  ctx.fill()

  // Contour
  ctx.strokeStyle = strokeColor
  ctx.lineWidth = (isSelected ? STROKE_WIDTHS.artworkSelected : STROKE_WIDTHS.artworkDefault) * zoom
  ctx.stroke()

  // Icône et texte si assez grand
  if (canvasWidth > 40 && canvasHeight > 40) {
    const centerX = topLeft.x + canvasWidth / 2
    const centerY = topLeft.y + canvasHeight / 2

    // Icône cadre
    ctx.fillStyle = strokeColor
    ctx.font = `${Math.min(24 * zoom, 32)}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🖼', centerX, centerY - 10 * zoom)

    // Nom de l'œuvre si disponible
    if (artwork.name && canvasHeight > 60) {
      ctx.font = `${Math.min(12 * zoom, 14)}px Arial`
      ctx.fillStyle = COLORS.artworkText
      const maxWidth = canvasWidth - 10
      const truncatedName = artwork.name.length > 20 
        ? artwork.name.substring(0, 17) + '...' 
        : artwork.name
      ctx.fillText(truncatedName, centerX, centerY + 15 * zoom, maxWidth)
    }

    // Indicateur PDF si présent
    if (artwork.pdf_id || artwork.pdfLink) {
      ctx.font = `${Math.min(10 * zoom, 12)}px Arial`
      ctx.fillStyle = COLORS.artworkPdfIndicator
      ctx.fillText('📄', topLeft.x + 8, topLeft.y + 12)
    }
  }

  // Points de redimensionnement si sélectionné
  if (isSelected) {
    const handleSize = VERTEX_RADIUS.default * zoom
    const handles = [
      { x: topLeft.x, y: topLeft.y }, // top-left
      { x: bottomRight.x, y: topLeft.y }, // top-right
      { x: bottomRight.x, y: bottomRight.y }, // bottom-right
      { x: topLeft.x, y: bottomRight.y } // bottom-left
    ]

    handles.forEach(handle => {
      ctx.beginPath()
      ctx.arc(handle.x, handle.y, handleSize, 0, Math.PI * 2)
      ctx.fillStyle = COLORS.vertexStroke
      ctx.fill()
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = 2 * zoom
      ctx.stroke()
    })
  }
}

/**
 * Dessiner une preview de création d'artwork
 */
export function drawArtworkCreationPreview(
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  zoom: number,
  pan: Point,
  isValid: boolean
) {
  const topLeft = worldToCanvas(
    { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y) },
    zoom,
    pan
  )
  const bottomRight = worldToCanvas(
    { x: Math.max(start.x, end.x), y: Math.max(start.y, end.y) },
    zoom,
    pan
  )

  const width = bottomRight.x - topLeft.x
  const height = bottomRight.y - topLeft.y

  // Fond preview (constantes centralisées)
  ctx.beginPath()
  ctx.rect(topLeft.x, topLeft.y, width, height)
  ctx.fillStyle = isValid ? 'rgba(219, 234, 254, 0.4)' : 'rgba(254, 202, 202, 0.4)'
  ctx.fill()

  // Contour
  ctx.strokeStyle = isValid ? COLORS.artworkStroke : COLORS.artworkStrokeInvalid
  ctx.lineWidth = 2 * zoom
  ctx.setLineDash([5 * zoom, 5 * zoom])
  ctx.stroke()
  ctx.setLineDash([])

  // Icône au centre
  if (width > 30 && height > 30) {
    ctx.fillStyle = isValid ? COLORS.artworkStroke : COLORS.artworkStrokeInvalid
    ctx.font = `${20 * zoom}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🖼', topLeft.x + width / 2, topLeft.y + height / 2)
  }

  // Dimensions
  const worldWidth = Math.abs(end.x - start.x)
  const worldHeight = Math.abs(end.y - start.y)
  ctx.font = `${11 * zoom}px Arial`
  ctx.fillStyle = COLORS.artworkText
  ctx.textAlign = 'center'
  ctx.fillText(
    `${worldWidth.toFixed(1)} × ${worldHeight.toFixed(1)}`,
    topLeft.x + width / 2,
    topLeft.y - 10 * zoom
  )
}
