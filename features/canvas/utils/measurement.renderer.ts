/**
 * RENDU DES MESURES ET ÉCHELLE
 */

import type { Point, Room } from '@/core/entities'
import { COLORS, FONTS, MEASUREMENT_OFFSET, GRID_TO_METERS, MEASUREMENT_PRECISION } from '@/core/constants'
import { calculateDistanceInMeters, calculatePolygonAreaInMeters } from '@/core/services'
import { worldToCanvas } from '@/core/utils'

export function drawMeasurement(
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  zoom: number,
  pan: Point,
  gridSize: number = 40
) {
  const startScreen = worldToCanvas({ x: start.x * gridSize, y: start.y * gridSize }, zoom, pan)
  const endScreen = worldToCanvas({ x: end.x * gridSize, y: end.y * gridSize }, zoom, pan)

  // Ligne de mesure
  ctx.strokeStyle = COLORS.measurementBorder
  ctx.lineWidth = 1
  ctx.setLineDash([5, 5])
  ctx.beginPath()
  ctx.moveTo(startScreen.x, startScreen.y)
  ctx.lineTo(endScreen.x, endScreen.y)
  ctx.stroke()
  ctx.setLineDash([])

  // Calcul distance
  const distance = calculateDistanceInMeters(start, end)
  const text = `${distance.toFixed(MEASUREMENT_PRECISION)}m`

  // Position du label
  const midX = (startScreen.x + endScreen.x) / 2
  const midY = (startScreen.y + endScreen.y) / 2

  // Fond du label
  ctx.font = `${FONTS.measurementSize * zoom}px ${FONTS.measurementFamily}`
  const textMetrics = ctx.measureText(text)
  const padding = 4 * zoom

  ctx.fillStyle = COLORS.measurementBackground
  ctx.fillRect(
    midX - textMetrics.width/2 - padding,
    midY - FONTS.measurementSize * zoom /2 - padding,
    textMetrics.width + padding * 2,
    FONTS.measurementSize * zoom + padding * 2
  )

  // Contour
  ctx.strokeStyle = COLORS.measurementBorder
  ctx.lineWidth = 1
  ctx.strokeRect(
    midX - textMetrics.width/2 - padding,
    midY - FONTS.measurementSize * zoom /2 - padding,
    textMetrics.width + padding * 2,
    FONTS.measurementSize * zoom + padding * 2
  )

  // Texte
  ctx.fillStyle = COLORS.measurementText
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(text, midX, midY)
}

export function drawAreaMeasurement(
  ctx: CanvasRenderingContext2D,
  room: Room,
  zoom: number,
  pan: Point,
  gridSize: number = 40
) {
  if (room.polygon.length < 3) return

  // Calculer le centre du polygone
  let sumX = 0
  let sumY = 0
  for (const point of room.polygon) {
    sumX += point.x
    sumY += point.y
  }
  const centerX = sumX / room.polygon.length
  const centerY = sumY / room.polygon.length

  const centerScreen = worldToCanvas({ x: centerX * gridSize, y: centerY * gridSize }, zoom, pan)

  // Calcul surface
  const area = calculatePolygonAreaInMeters(room.polygon)
  const text = `${area.toFixed(MEASUREMENT_PRECISION)}m²`

  // Fond du label
  ctx.font = `bold ${FONTS.measurementSize * zoom}px ${FONTS.measurementFamily}`
  const textMetrics = ctx.measureText(text)
  const padding = 6 * zoom

  ctx.fillStyle = COLORS.areaBackground
  ctx.fillRect(
    centerScreen.x - textMetrics.width/2 - padding,
    centerScreen.y - FONTS.measurementSize * zoom /2 - padding,
    textMetrics.width + padding * 2,
    FONTS.measurementSize * zoom + padding * 2
  )

  // Contour
  ctx.strokeStyle = COLORS.areaText
  ctx.lineWidth = 1
  ctx.strokeRect(
    centerScreen.x - textMetrics.width/2 - padding,
    centerScreen.y - FONTS.measurementSize * zoom /2 - padding,
    textMetrics.width + padding * 2,
    FONTS.measurementSize * zoom + padding * 2
  )

  // Texte
  ctx.fillStyle = COLORS.areaText
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(text, centerScreen.x, centerScreen.y)
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
