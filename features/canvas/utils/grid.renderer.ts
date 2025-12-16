/**
 * RENDU DE LA GRILLE - OPTIMISE POUR CAO PRO
 */

import type { Point } from '@/core/entities'
import { GRID_SIZE, MAJOR_GRID_INTERVAL } from '@/core/constants'

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

  // Grille mineure (lignes fines grises claires)
  ctx.strokeStyle = 'rgba(200, 200, 200, 0.4)'
  ctx.lineWidth = 0.5
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

  ctx.strokeStyle = 'rgba(150, 150, 150, 0.6)'
  ctx.lineWidth = 1
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
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(centerX, 0)
    ctx.lineTo(centerX, height)
    ctx.stroke()
  }
  
  if (centerY >= 0 && centerY <= height) {
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, centerY)
    ctx.lineTo(width, centerY)
    ctx.stroke()
  }
  
  // Labels de coordonnees (pour CAO precis)
  ctx.fillStyle = 'rgba(100, 100, 100, 0.8)'
  ctx.font = '11px monospace'
  
  // Labels X tous les 10m
  for (let x = majorOffsetX; x < width; x += majorGridSize * 2) {
    const worldX = Math.round((x - pan.x) / zoom)
    if (worldX % 10 === 0) {
      ctx.fillText(worldX + 'm', x + 4, 15)
    }
  }
  
  // Labels Y tous les 10m
  for (let y = majorOffsetY; y < height; y += majorGridSize * 2) {
    const worldY = Math.round((y - pan.y) / zoom)
    if (worldY % 10 === 0) {
      ctx.fillText(worldY + 'm', 5, y - 4)
    }
  }
}