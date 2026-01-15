/**
 * ENTRANCE RENDERER
 * Dessine les points d'entrée du musée sur le canvas
 */

import type { Entrance } from "@/core/entities"
import { worldToCanvas } from "@/core/utils"

/**
 * Dessine un point d'entrée du musée
 */
export function drawEntrance(
  ctx: CanvasRenderingContext2D,
  entrance: Entrance,
  zoom: number,
  pan: { x: number; y: number },
  isSelected: boolean = false,
  isHovered: boolean = false
): void {
  const canvasPos = worldToCanvas({ x: entrance.x, y: entrance.y }, zoom, pan)
  
  // Taille du marqueur
  const baseRadius = 16 * zoom
  const radius = isHovered ? baseRadius * 1.2 : baseRadius

  ctx.save()

  // Cercle de fond (vert pour entrée)
  ctx.beginPath()
  ctx.arc(canvasPos.x, canvasPos.y, radius, 0, Math.PI * 2)
  
  // Couleur selon l'état
  if (isSelected) {
    ctx.fillStyle = '#22c55e' // Vert vif sélectionné
  } else if (isHovered) {
    ctx.fillStyle = '#4ade80' // Vert hover
  } else {
    ctx.fillStyle = '#16a34a' // Vert normal
  }
  ctx.fill()

  // Bordure
  ctx.strokeStyle = isSelected ? '#ffffff' : '#166534'
  ctx.lineWidth = isSelected ? 3 * zoom : 2 * zoom
  ctx.stroke()

  // Icône porte (dessin simplifié)
  drawDoorIcon(ctx, canvasPos.x, canvasPos.y, radius * 0.6)

  // Nom de l'entrée (si sélectionnée ou en hover)
  if (isSelected || isHovered) {
    ctx.font = `bold ${12 * zoom}px sans-serif`
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    
    // Fond pour le texte
    const text = entrance.name || 'Entrée'
    const textWidth = ctx.measureText(text).width
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(
      canvasPos.x - textWidth / 2 - 4 * zoom,
      canvasPos.y + radius + 4 * zoom,
      textWidth + 8 * zoom,
      16 * zoom
    )
    
    ctx.fillStyle = '#ffffff'
    ctx.fillText(text, canvasPos.x, canvasPos.y + radius + 6 * zoom)
  }

  ctx.restore()
}

/**
 * Dessine une icône de porte simplifiée
 */
function drawDoorIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2

  // Rectangle de la porte
  const doorWidth = size * 0.8
  const doorHeight = size * 1.2
  ctx.strokeRect(-doorWidth / 2, -doorHeight / 2, doorWidth, doorHeight)

  // Poignée de porte
  const handleRadius = size * 0.12
  ctx.beginPath()
  ctx.arc(doorWidth / 4, 0, handleRadius, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

/**
 * Dessine une prévisualisation d'entrée pendant la création
 */
export function drawEntrancePreview(
  ctx: CanvasRenderingContext2D,
  position: { x: number; y: number },
  zoom: number,
  pan: { x: number; y: number },
  isValid: boolean = true
): void {
  const canvasPos = worldToCanvas(position, zoom, pan)
  const radius = 16 * zoom

  ctx.save()

  // Cercle de prévisualisation (semi-transparent)
  ctx.beginPath()
  ctx.arc(canvasPos.x, canvasPos.y, radius, 0, Math.PI * 2)
  ctx.fillStyle = isValid ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'
  ctx.fill()
  ctx.strokeStyle = isValid ? '#16a34a' : '#dc2626'
  ctx.lineWidth = 2 * zoom
  ctx.setLineDash([5, 5])
  ctx.stroke()

  // Icône
  drawDoorIcon(ctx, canvasPos.x, canvasPos.y, radius * 0.6)

  ctx.restore()
}
