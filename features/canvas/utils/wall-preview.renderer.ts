/**
 * RENDERER PREVIEW MUR
 * Affichage du mur en cours de création avec feedback visuel
 */

import type { Wall, Point, ValidationResult } from '@/core/entities'
import { worldToCanvas } from '@/core/utils'
import { VISUAL_FEEDBACK } from '@/core/constants'

/**
 * Dessine le preview d'un mur en cours de création
 */
export function drawWallPreview(
  ctx: CanvasRenderingContext2D,
  wall: Wall,
  zoom: number,
  pan: Point,
  validation: ValidationResult
) {
  const start = worldToCanvas(wall.segment[0], zoom, pan)
  const end = worldToCanvas(wall.segment[1], zoom, pan)

  // Ligne principale du mur
  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.lineTo(end.x, end.y)

  // Couleur selon validation
  if (validation.valid) {
    ctx.strokeStyle = VISUAL_FEEDBACK.colors.valid
    ctx.lineWidth = 4
  } else {
    ctx.strokeStyle = VISUAL_FEEDBACK.colors.invalid
    ctx.lineWidth = 4
  }

  ctx.stroke()

  // Points de départ et fin
  const dotRadius = 6
  
  // Point de départ (cercle plein)
  ctx.beginPath()
  ctx.arc(start.x, start.y, dotRadius, 0, Math.PI * 2)
  ctx.fillStyle = validation.valid ? VISUAL_FEEDBACK.colors.valid : VISUAL_FEEDBACK.colors.invalid
  ctx.fill()
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 2
  ctx.stroke()

  // Point de fin (cercle plein)
  ctx.beginPath()
  ctx.arc(end.x, end.y, dotRadius, 0, Math.PI * 2)
  ctx.fillStyle = validation.valid ? VISUAL_FEEDBACK.colors.valid : VISUAL_FEEDBACK.colors.invalid
  ctx.fill()
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 2
  ctx.stroke()

  // Afficher le message de validation si erreur
  if (!validation.valid && validation.message) {
    const midX = (start.x + end.x) / 2
    const midY = (start.y + end.y) / 2

    ctx.save()
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'

    // Ombre pour lisibilité
    ctx.shadowColor = 'rgba(0,0,0,0.5)'
    ctx.shadowBlur = 4
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 1

    ctx.fillStyle = VISUAL_FEEDBACK.colors.invalid
    ctx.fillText(validation.message, midX, midY - 10)
    ctx.restore()
  }
}
