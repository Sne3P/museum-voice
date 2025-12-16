/**
 * RENDU DES LIENS VERTICAUX (Escaliers et Ascenseurs)
 */

import type { VerticalLink, Point } from '@/core/entities'
import { COLORS } from '@/core/constants'
import { worldToCanvas } from '@/core/utils'

export function drawVerticalLink(
  ctx: CanvasRenderingContext2D,
  link: VerticalLink,
  zoom: number,
  pan: Point,
  gridSize: number = 40,
  isSelected: boolean = false,
  isHovered: boolean = false,
  isInvalid: boolean = false
) {
  const start = worldToCanvas({ x: link.segment[0].x * gridSize, y: link.segment[0].y * gridSize }, zoom, pan)
  const end = worldToCanvas({ x: link.segment[1].x * gridSize, y: link.segment[1].y * gridSize }, zoom, pan)

  const isStairs = link.type === "stairs"
  
  const strokeColor = isInvalid
    ? (isStairs ? COLORS.stairsInvalid : COLORS.elevatorInvalid)
    : isSelected
    ? (isStairs ? COLORS.stairsSelected : COLORS.elevatorSelected)
    : isHovered
    ? (isStairs ? COLORS.stairsHovered : COLORS.elevatorHovered)
    : (isStairs ? COLORS.stairsDefault : COLORS.elevatorDefault)

  // Ligne principale
  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.lineTo(end.x, end.y)
  ctx.strokeStyle = strokeColor
  ctx.lineWidth = (isSelected ? 8 : isHovered ? 6 : 4) * zoom
  ctx.lineCap = "round"
  ctx.stroke()

  // Ligne décorative blanche
  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.lineTo(end.x, end.y)
  ctx.strokeStyle = "white"
  ctx.lineWidth = (isSelected ? 4 : isHovered ? 3 : 2) * zoom
  ctx.lineCap = "round"
  ctx.stroke()

  // Pattern pour escaliers
  if (isStairs) {
    const segmentLength = Math.hypot(end.x - start.x, end.y - start.y)
    const steps = Math.max(2, Math.floor(segmentLength / (30 * zoom)))
    
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = 1 * zoom
    
    for (let i = 1; i < steps; i++) {
      const t = i / steps
      const x = start.x + (end.x - start.x) * t
      const y = start.y + (end.y - start.y) * t
      
      const angle = Math.atan2(end.y - start.y, end.x - start.x) + Math.PI / 2
      const stepSize = 3 * zoom
      
      ctx.beginPath()
      ctx.moveTo(x - Math.cos(angle) * stepSize, y - Math.sin(angle) * stepSize)
      ctx.lineTo(x + Math.cos(angle) * stepSize, y + Math.sin(angle) * stepSize)
      ctx.stroke()
    }
  }

  // Endpoints
  const endpointRadius = 12 * zoom

  ctx.beginPath()
  ctx.arc(start.x, start.y, endpointRadius, 0, Math.PI * 2)
  ctx.fillStyle = strokeColor
  ctx.fill()
  ctx.strokeStyle = "white"
  ctx.lineWidth = 3
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(end.x, end.y, endpointRadius, 0, Math.PI * 2)
  ctx.fillStyle = strokeColor
  ctx.fill()
  ctx.strokeStyle = "white"
  ctx.lineWidth = 3
  ctx.stroke()

  // Label au centre
  const midX = (start.x + end.x) / 2
  const midY = (start.y + end.y) / 2

  const direction = link.direction || "both"
  const text = isStairs ? "E" : "A"
  let icon = ""
  
  if (direction === "up") icon = "↑"
  else if (direction === "down") icon = "↓"
  else icon = "↕"

  const fontSize = Math.max(8, 10 * zoom)
  ctx.font = `${fontSize}px system-ui, -apple-system, sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  
  const textWidth = ctx.measureText(text).width
  const padding = 4 * zoom
  
  // Rectangle de fond
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
  ctx.beginPath()
  ctx.roundRect(
    midX - textWidth/2 - padding,
    midY - fontSize/2 - padding/2,
    textWidth + padding*2,
    fontSize + padding,
    2 * zoom
  )
  ctx.fill()
  
  // Contour
  ctx.strokeStyle = strokeColor
  ctx.lineWidth = 1
  ctx.stroke()
  
  // Texte
  ctx.fillStyle = strokeColor
  ctx.fillText(text, midX, midY)
  
  // Icône direction
  if (icon) {
    const iconSize = Math.max(6, 8 * zoom)
    ctx.font = `${iconSize}px system-ui, -apple-system, sans-serif`
    ctx.fillText(icon, midX + 8 * zoom, midY - 2 * zoom)
  }
}
