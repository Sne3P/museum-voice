/**
 * RENDU DES PIÈCES - CAO PROFESSIONNEL
 * Avec validations et feedback visuel
 * Utilise les constantes de couleur centralisées pour cohérence
 */

import type { Room, Point } from '@/core/entities'
import { COLORS, STROKE_WIDTHS } from '@/core/constants'
import { worldToCanvas } from '@/core/utils'
import { validateRoomGeometry } from '@/core/services'

export function drawRoom(
  ctx: CanvasRenderingContext2D,
  room: Room,
  zoom: number,
  pan: Point,
  isSelected: boolean = false,
  isHovered: boolean = false,
  showValidation: boolean = true,
  isDuplicating: boolean = false,
  isValidDuplication: boolean = true
) {
  if (room.polygon.length < 3) return

  // Convertir les points du polygone en coordonnées canvas
  const canvasPoints = room.polygon.map(p => worldToCanvas(p, zoom, pan))

  // Validation temps réel (sauf si en duplication, on utilise l'état de duplication)
  const validation = (showValidation && !isDuplicating) ? validateRoomGeometry(room) : null
  const hasError = isDuplicating ? !isValidDuplication : (validation !== null && !validation.valid)

  // Remplissage
  ctx.beginPath()
  ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y)
  for (let i = 1; i < canvasPoints.length; i++) {
    ctx.lineTo(canvasPoints[i].x, canvasPoints[i].y)
  }
  ctx.closePath()

  // Couleur de fond avec états de validation (constantes centralisées)
  if (hasError) {
    ctx.fillStyle = COLORS.roomInvalid
  } else if (isSelected || isDuplicating) {
    ctx.fillStyle = COLORS.roomSelected
  } else if (isHovered) {
    ctx.fillStyle = COLORS.roomHovered
  } else {
    ctx.fillStyle = COLORS.roomDefault
  }
  ctx.fill()

  // Contour avec validation (constantes centralisées)
  if (hasError) {
    ctx.strokeStyle = COLORS.roomStrokeInvalid
    ctx.lineWidth = STROKE_WIDTHS.roomSelected
    ctx.setLineDash([8, 4]) // Pointillés épais pour erreur
  } else if (isSelected || isDuplicating) {
    ctx.strokeStyle = COLORS.roomStrokeSelected
    ctx.lineWidth = STROKE_WIDTHS.roomSelected
    ctx.setLineDash([])
  } else if (isHovered) {
    ctx.strokeStyle = COLORS.roomStrokeHovered
    ctx.lineWidth = STROKE_WIDTHS.roomHovered
    ctx.setLineDash([])
  } else {
    ctx.strokeStyle = COLORS.roomStrokeDefault
    ctx.lineWidth = STROKE_WIDTHS.roomDefault
    ctx.setLineDash([])
  }
  ctx.stroke()
  ctx.setLineDash([])
}
