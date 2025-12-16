/**
 * RENDU DES MURS
 */

import type { Wall, Point } from '@/core/entities'
import { COLORS, STROKE_WIDTHS } from '@/core/constants'
import { worldToCanvas } from '@/core/utils'

export function drawWall(
  ctx: CanvasRenderingContext2D,
  wall: Wall,
  zoom: number,
  pan: Point,
  isSelected: boolean = false,
  isHovered: boolean = false
) {
  const start = worldToCanvas(wall.segment[0], zoom, pan)
  const end = worldToCanvas(wall.segment[1], zoom, pan)

  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.lineTo(end.x, end.y)

  if (isSelected) {
    ctx.strokeStyle = COLORS.wallSelected
    ctx.lineWidth = STROKE_WIDTHS.wallSelected
  } else if (isHovered) {
    ctx.strokeStyle = COLORS.wallHovered
    ctx.lineWidth = STROKE_WIDTHS.wallHovered
  } else {
    ctx.strokeStyle = COLORS.wallDefault
    ctx.lineWidth = STROKE_WIDTHS.wallDefault
  }

  ctx.stroke()
}
