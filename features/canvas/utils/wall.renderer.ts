/**
 * RENDU DES MURS
 */

import type { Wall, Point } from '@/core/entities'
import { COLORS, STROKE_WIDTHS } from '@/core/constants'
import { worldToCanvas } from '@/core/utils'
import { calculateDistanceInMeters } from '@/core/services'

export function drawWall(
  ctx: CanvasRenderingContext2D,
  wall: Wall,
  zoom: number,
  pan: Point,
  isSelected: boolean = false,
  isHovered: boolean = false,
  showMeasurements: boolean = false
) {
  // Utiliser path si disponible, sinon segment
  const points = wall.path || [wall.segment[0], wall.segment[1]]
  const canvasPoints = points.map(p => worldToCanvas(p, zoom, pan))

  // Ligne principale (tracé continu avec tous les points)
  ctx.beginPath()
  ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y)
  for (let i = 1; i < canvasPoints.length; i++) {
    ctx.lineTo(canvasPoints[i].x, canvasPoints[i].y)
  }

  // Couleurs selon état: VERT si sélectionné (comme vertices)
  if (isSelected) {
    ctx.strokeStyle = '#22c55e'  // Vert = sélectionné
    ctx.lineWidth = STROKE_WIDTHS.wallSelected
  } else if (isHovered) {
    ctx.strokeStyle = '#f59e0b'  // Orange = hover
    ctx.lineWidth = STROKE_WIDTHS.wallHovered
  } else {
    ctx.strokeStyle = COLORS.wallDefault
    ctx.lineWidth = STROKE_WIDTHS.wallDefault
  }

  ctx.stroke()

  // NOTE: Les vertices sont maintenant rendus séparément par drawWallVertices
  // pour avoir le système de sélection complet (hover orange, etc.)

  // Mesure si activée et sélectionné
  if (showMeasurements && isSelected) {
    const distance = calculateDistanceInMeters(wall.segment[0], wall.segment[1])
    const startCanvas = canvasPoints[0]
    const endCanvas = canvasPoints[canvasPoints.length - 1]
    const midX = (startCanvas.x + endCanvas.x) / 2
    const midY = (startCanvas.y + endCanvas.y) / 2

    // Fond bleu pour la mesure
    const text = `${distance.toFixed(2)}m`
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    const metrics = ctx.measureText(text)
    const padding = 6
    
    // Fond
    ctx.fillStyle = 'rgba(59, 130, 246, 0.9)'
    ctx.fillRect(
      midX - metrics.width / 2 - padding,
      midY - 10,
      metrics.width + padding * 2,
      20
    )
    
    // Texte
    ctx.fillStyle = '#ffffff'
    ctx.fillText(text, midX, midY)
  }
}
