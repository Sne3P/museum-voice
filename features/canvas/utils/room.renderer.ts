/**
 * RENDU DES PIÈCES - CAO PROFESSIONNEL
 * Avec validations et feedback visuel
 */

import type { Room, Point } from '@/core/entities'
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

  // Couleur de fond avec états de validation
  if (hasError) {
    ctx.fillStyle = 'rgba(239, 68, 68, 0.2)' // Rouge si erreur (plus opaque)
  } else if (isSelected || isDuplicating) {
    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)' // Bleu si sélectionné ou en duplication
  } else if (isHovered) {
    ctx.fillStyle = 'rgba(59, 130, 246, 0.15)' // Bleu clair si survolé
  } else {
    ctx.fillStyle = 'rgba(229, 231, 235, 0.5)' // Gris clair par défaut
  }
  ctx.fill()

  // Contour avec validation
  if (hasError) {
    ctx.strokeStyle = '#EF4444' // Rouge
    ctx.lineWidth = 3
    ctx.setLineDash([8, 4]) // Pointillés épais pour erreur
  } else if (isSelected || isDuplicating) {
    ctx.strokeStyle = '#3B82F6' // Bleu
    ctx.lineWidth = 3
    ctx.setLineDash([])
  } else if (isHovered) {
    ctx.strokeStyle = '#60A5FA' // Bleu clair
    ctx.lineWidth = 2.5
    ctx.setLineDash([])
  } else {
    ctx.strokeStyle = '#9CA3AF' // Gris
    ctx.lineWidth = 2
    ctx.setLineDash([])
  }
  ctx.stroke()
  ctx.setLineDash([])
}
