/**
 * UTILITAIRES COORDONNÉES CANVAS
 */

import type { Point } from '@/core/entities'

/**
 * Convertit des coordonnées écran en coordonnées monde (signature détaillée)
 */
export function screenToWorld(
  screenX: number,
  screenY: number,
  canvasRect: DOMRect,
  zoom: number,
  pan: Point
): Point

/**
 * Convertit un point écran en point monde (signature simplifiée)
 */
export function screenToWorld(
  screenPoint: Point,
  zoom: number,
  pan: Point
): Point

export function screenToWorld(...args: any[]): Point {
  if (args.length === 5) {
    // Signature détaillée
    const [screenX, screenY, canvasRect, zoom, pan] = args
    const x = (screenX - canvasRect.left - pan.x) / zoom
    const y = (screenY - canvasRect.top - pan.y) / zoom
    return { x, y }
  } else {
    // Signature simplifiée
    const [screenPoint, zoom, pan] = args
    return {
      x: (screenPoint.x - pan.x) / zoom,
      y: (screenPoint.y - pan.y) / zoom
    }
  }
}

/**
 * Convertit des coordonnées monde en coordonnées écran (signature détaillée)
 */
export function worldToScreen(
  worldX: number,
  worldY: number,
  zoom: number,
  pan: Point
): Point

/**
 * Convertit un point monde en point écran (signature simplifiée)
 */
export function worldToScreen(
  worldPoint: Point,
  zoom: number,
  pan: Point
): Point

export function worldToScreen(...args: any[]): Point {
  if (args.length === 4) {
    // Signature détaillée
    const [worldX, worldY, zoom, pan] = args
    return {
      x: worldX * zoom + pan.x,
      y: worldY * zoom + pan.y
    }
  } else {
    // Signature simplifiée
    const [worldPoint, zoom, pan] = args
    return {
      x: worldPoint.x * zoom + pan.x,
      y: worldPoint.y * zoom + pan.y
    }
  }
}
