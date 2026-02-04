/**
 * RENDU DE LA GRILLE - OPTIMISE POUR CAO PRO
 * Utilise les constantes de couleur centralisées pour cohérence
 */

import type { Point } from '@/core/entities'
import { GRID_SIZE, MAJOR_GRID_INTERVAL, COLORS, STROKE_WIDTHS } from '@/core/constants'

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  zoom: number,
  pan: Point
) {
  const gridSize = GRID_SIZE * zoom
  
  // Cacher la grille si trop petite (zoom out extreme)
  if (gridSize < 4) return
  
  const offsetX = pan.x % gridSize
  const offsetY = pan.y % gridSize

  // Grille mineure (lignes fines grises claires) - constantes centralisées
  ctx.strokeStyle = COLORS.gridMinor
  ctx.lineWidth = STROKE_WIDTHS.gridMinor
  ctx.beginPath()

  for (let x = offsetX; x < width; x += gridSize) {
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
  }

  for (let y = offsetY; y < height; y += gridSize) {
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
  }

  ctx.stroke()

  // Grille majeure (tous les 5 metres - lignes plus epaisses)
  const majorGridSize = gridSize * MAJOR_GRID_INTERVAL
  const majorOffsetX = pan.x % majorGridSize
  const majorOffsetY = pan.y % majorGridSize

  ctx.strokeStyle = COLORS.gridMajorLine
  ctx.lineWidth = STROKE_WIDTHS.gridMajor
  ctx.beginPath()

  for (let x = majorOffsetX; x < width; x += majorGridSize) {
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
  }

  for (let y = majorOffsetY; y < height; y += majorGridSize) {
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
  }

  ctx.stroke()
  
  // Axes centraux (0,0) en rouge pour repere CAO
  const centerX = pan.x
  const centerY = pan.y
  
  if (centerX >= 0 && centerX <= width) {
    ctx.strokeStyle = COLORS.gridAxis
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(centerX, 0)
    ctx.lineTo(centerX, height)
    ctx.stroke()
  }
  
  if (centerY >= 0 && centerY <= height) {
    ctx.strokeStyle = COLORS.gridAxis
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, centerY)
    ctx.lineTo(width, centerY)
    ctx.stroke()
  }
  
  // Labels de coordonnees avec vraies mesures (1 carré = 0.5m)
  ctx.fillStyle = COLORS.gridLabel
  ctx.font = '11px monospace'
  
  // GRID_SIZE (40px) = 0.5m, donc 1px = 0.0125m
  const GRID_TO_METERS = 0.5
  
  // Interval dynamique pour labels selon le zoom
  const labelInterval = zoom > 0.5 ? majorGridSize : majorGridSize * 2
  
  // Labels X avec vraies mesures
  for (let x = majorOffsetX; x < width; x += labelInterval) {
    const gridUnits = Math.round((x - pan.x) / (GRID_SIZE * zoom))
    const meters = (gridUnits * GRID_TO_METERS).toFixed(1)
    if (x > 20 && x < width - 50) {
      ctx.fillText(meters + 'm', x + 4, 15)
    }
  }
  
  // Labels Y avec vraies mesures
  for (let y = majorOffsetY; y < height; y += labelInterval) {
    const gridUnits = Math.round((y - pan.y) / (GRID_SIZE * zoom))
    const meters = (gridUnits * GRID_TO_METERS).toFixed(1)
    if (y > 20 && y < height - 20) {
      ctx.fillText(meters + 'm', 5, y - 4)
    }
  }
}