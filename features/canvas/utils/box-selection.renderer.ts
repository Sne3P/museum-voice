/**
 * Renderer pour la box selection (zone rectangulaire)
 */

import type { Point } from '@/core/entities'
import { COLORS, STROKE_WIDTHS } from '@/core/constants'

export function drawBoxSelection(
  ctx: CanvasRenderingContext2D,
  startPoint: Point,
  endPoint: Point,
  zoom: number,
  pan: Point
) {
  ctx.save()

  // Conversion world → screen
  const screenStart = {
    x: startPoint.x * zoom + pan.x,
    y: startPoint.y * zoom + pan.y
  }
  const screenEnd = {
    x: endPoint.x * zoom + pan.x,
    y: endPoint.y * zoom + pan.y
  }

  const width = screenEnd.x - screenStart.x
  const height = screenEnd.y - screenStart.y

  // Rectangle de sélection
  ctx.strokeStyle = COLORS.selectionStroke
  ctx.lineWidth = STROKE_WIDTHS.selectionBox
  ctx.setLineDash([5, 5])
  ctx.strokeRect(screenStart.x, screenStart.y, width, height)

  // Remplissage semi-transparent
  ctx.fillStyle = COLORS.selectionBox
  ctx.fillRect(screenStart.x, screenStart.y, width, height)

  ctx.restore()
}
