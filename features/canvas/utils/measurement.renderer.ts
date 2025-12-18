/**
 * RENDU DES MESURES ET ÉCHELLE
 */

import type { Point, Room } from '@/core/entities'
import { COLORS, FONTS, MEASUREMENT_OFFSET, GRID_TO_METERS, MEASUREMENT_PRECISION } from '@/core/constants'
import { calculateDistanceInMeters, calculatePolygonAreaInMeters, getPolygonCenter } from '@/core/services'
import { worldToCanvas } from '@/core/utils'

export function drawMeasurement(
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  zoom: number,
  pan: Point,
  gridSize: number = 40,
  isHighlighted: boolean = false
) {
  // Convertir coordonnées monde (unités grille) → canvas (pixels)
  const startScreen = worldToCanvas(start, zoom, pan)
  const endScreen = worldToCanvas(end, zoom, pan)

  // Calcul distance en mètres (start/end sont en unités grille, 1 unité = 0.5m)
  const distance = calculateDistanceInMeters(start, end)
  const text = `${distance.toFixed(MEASUREMENT_PRECISION)}m`

  // Point milieu du segment
  const midX = (startScreen.x + endScreen.x) / 2
  const midY = (startScreen.y + endScreen.y) / 2

  // Calculer direction perpendiculaire pour décaler le label
  const dx = endScreen.x - startScreen.x
  const dy = endScreen.y - startScreen.y
  const length = Math.sqrt(dx * dx + dy * dy)
  const perpX = length > 0 ? -dy / length : 0
  const perpY = length > 0 ? dx / length : 0
  
  // Offset adaptatif selon zoom
  const offset = Math.max(12, MEASUREMENT_OFFSET * Math.max(0.7, Math.min(1.2, zoom / 40)))
  const labelX = midX + perpX * offset
  const labelY = midY + perpY * offset

  // Taille de police adaptative (entre 10px et 16px)
  const fontSize = Math.max(10, Math.min(16, (FONTS.measurementSize + 1) * Math.pow(zoom / 40, 0.3)))
  ctx.font = `${fontSize}px ${FONTS.measurementFamily}`
  const textMetrics = ctx.measureText(text)
  const padding = Math.max(3, 4 * Math.pow(zoom / 40, 0.3))

  // Style selon highlight
  if (isHighlighted) {
    // Avec carré si sélectionné
    ctx.fillStyle = 'rgba(59, 130, 246, 0.95)'
    ctx.fillRect(
      labelX - textMetrics.width/2 - padding,
      labelY - fontSize/2 - padding,
      textMetrics.width + padding * 2,
      fontSize + padding * 2
    )
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    ctx.strokeRect(
      labelX - textMetrics.width/2 - padding,
      labelY - fontSize/2 - padding,
      textMetrics.width + padding * 2,
      fontSize + padding * 2
    )
    ctx.fillStyle = '#ffffff'
  } else {
    // Sans carré, juste le texte avec ombre légère
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)'
    ctx.shadowBlur = 3
    ctx.fillStyle = COLORS.measurementText
  }

  // Texte
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(text, labelX, labelY)
  
  // Reset shadow
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
}

export function drawAreaMeasurement(
  ctx: CanvasRenderingContext2D,
  room: Room,
  zoom: number,
  pan: Point,
  gridSize: number = 40,
  isHighlighted: boolean = false
) {
  if (room.polygon.length < 3) return

  // Calculer le centre du polygone (points en unités grille)
  const center = getPolygonCenter(room.polygon)
  const centerScreen = worldToCanvas(center, zoom, pan)

  // Calcul surface en m² (polygon en unités grille, 1 unité = 0.5m)
  const area = calculatePolygonAreaInMeters(room.polygon)
  const text = `${area.toFixed(MEASUREMENT_PRECISION)}m²`

  // Taille de police adaptative (entre 12px et 18px, plus gros que segments)
  const fontSize = Math.max(12, Math.min(18, (FONTS.measurementSize + 3) * Math.pow(zoom / 40, 0.3)))
  ctx.font = `bold ${fontSize}px ${FONTS.measurementFamily}`
  const textMetrics = ctx.measureText(text)
  const padding = Math.max(4, 6 * Math.pow(zoom / 40, 0.3))

  // Style selon highlight
  if (isHighlighted) {
    // Avec carré vert si sélectionné
    ctx.fillStyle = 'rgba(34, 197, 94, 0.9)'
    ctx.fillRect(
      centerScreen.x - textMetrics.width/2 - padding,
      centerScreen.y - fontSize/2 - padding,
      textMetrics.width + padding * 2,
      fontSize + padding * 2
    )
    ctx.strokeStyle = '#22c55e'
    ctx.lineWidth = 2.5
    ctx.strokeRect(
      centerScreen.x - textMetrics.width/2 - padding,
      centerScreen.y - fontSize/2 - padding,
      textMetrics.width + padding * 2,
      fontSize + padding * 2
    )
    ctx.fillStyle = '#ffffff'
  } else {
    // Sans carré, juste le texte avec ombre
    ctx.shadowColor = 'rgba(255, 255, 255, 0.9)'
    ctx.shadowBlur = 4
    ctx.fillStyle = COLORS.areaText
  }

  // Texte
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(text, centerScreen.x, centerScreen.y)
  
  // Reset shadow
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
}

export function drawScale(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  zoom: number
) {
  const scaleLength = 100 // pixels
  const scaleMeters = (scaleLength / zoom / 40) * GRID_TO_METERS
  const roundedMeters = Math.ceil(scaleMeters)

  const x = 20
  const y = canvasHeight - 30

  // Ligne de l'échelle
  ctx.strokeStyle = COLORS.measurementText
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + scaleLength, y)
  ctx.stroke()

  // Marques
  ctx.beginPath()
  ctx.moveTo(x, y - 5)
  ctx.lineTo(x, y + 5)
  ctx.moveTo(x + scaleLength, y - 5)
  ctx.lineTo(x + scaleLength, y + 5)
  ctx.stroke()

  // Texte
  ctx.font = `11px ${FONTS.labelFamily}`
  ctx.fillStyle = COLORS.measurementText
  ctx.textAlign = "center"
  ctx.textBaseline = "top"
  ctx.fillText(`${roundedMeters}m`, x + scaleLength/2, y + 8)
}
