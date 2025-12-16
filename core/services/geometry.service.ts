/**
 * SERVICE GÉOMÉTRIE - VERSION CONSOLIDÉE
 * Toutes les fonctions géométriques en un seul endroit
 */

import type { Point, Bounds } from '@/core/entities'
import { GRID_SIZE, SNAP_THRESHOLD, GRID_TO_METERS, MEASUREMENT_PRECISION, GEOMETRY } from '@/core/constants'

/**
 * Snap un point à la grille
 */
export function snapToGrid(point: Point, gridSize: number = GRID_SIZE): Point {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  }
}

/**
 * Test point dans polygone (winding number algorithm)
 */
export function isPointInPolygon(point: Point, polygon: ReadonlyArray<Point>): boolean {
  if (polygon.length < 3) return false
  
  let windingNumber = 0
  
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i]
    const p2 = polygon[(i + 1) % polygon.length]
    
    if (p1.y <= point.y) {
      if (p2.y > point.y) {
        if (isLeft(p1, p2, point) > 0) {
          windingNumber++
        }
      }
    } else {
      if (p2.y <= point.y) {
        if (isLeft(p1, p2, point) < 0) {
          windingNumber--
        }
      }
    }
  }
  
  return windingNumber !== 0
}

function isLeft(p0: Point, p1: Point, p2: Point): number {
  return (p1.x - p0.x) * (p2.y - p0.y) - (p2.x - p0.x) * (p1.y - p0.y)
}

/**
 * Calcule les limites d'un ensemble de points
 */
export function calculateBounds(points: ReadonlyArray<Point>): Bounds {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  }
  
  let minX = points[0].x
  let minY = points[0].y
  let maxX = points[0].x
  let maxY = points[0].y
  
  for (const point of points) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }
  
  return { minX, minY, maxX, maxY }
}

/**
 * Calcule la distance entre deux points
 */
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Calcule la distance d'un point à un segment
 */
export function distanceToSegment(point: Point, segStart: Point, segEnd: Point): number {
  const projected = projectPointOntoSegment(point, segStart, segEnd)
  return distance(point, projected)
}

/**
 * Projette un point sur un segment
 */
export function projectPointOntoSegment(point: Point, segStart: Point, segEnd: Point): Point {
  const dx = segEnd.x - segStart.x
  const dy = segEnd.y - segStart.y
  
  if (dx === 0 && dy === 0) return segStart
  
  const t = Math.max(0, Math.min(1, 
    ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / (dx * dx + dy * dy)
  ))
  
  return {
    x: segStart.x + t * dx,
    y: segStart.y + t * dy,
  }
}

/**
 * Vérifie si deux segments se croisent
 */
export function segmentsIntersect(
  seg1: readonly [Point, Point],
  seg2: readonly [Point, Point]
): boolean {
  const [p1, p2] = seg1
  const [p3, p4] = seg2
  
  const d1 = direction(p3, p4, p1)
  const d2 = direction(p3, p4, p2)
  const d3 = direction(p1, p2, p3)
  const d4 = direction(p1, p2, p4)
  
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true
  }
  
  return false
}

function direction(p1: Point, p2: Point, p3: Point): number {
  return (p3.y - p1.y) * (p2.x - p1.x) - (p2.y - p1.y) * (p3.x - p1.x)
}

/**
 * Vérifie si deux polygones se chevauchent
 */
export function polygonsIntersect(poly1: ReadonlyArray<Point>, poly2: ReadonlyArray<Point>): boolean {
  // Test 1: Un sommet de poly1 dans poly2
  for (const point of poly1) {
    if (isPointInPolygon(point, poly2)) return true
  }
  
  // Test 2: Un sommet de poly2 dans poly1
  for (const point of poly2) {
    if (isPointInPolygon(point, poly1)) return true
  }
  
  // Test 3: Arêtes qui se croisent
  for (let i = 0; i < poly1.length; i++) {
    const seg1: [Point, Point] = [poly1[i], poly1[(i + 1) % poly1.length]]
    
    for (let j = 0; j < poly2.length; j++) {
      const seg2: [Point, Point] = [poly2[j], poly2[(j + 1) % poly2.length]]
      
      if (segmentsIntersect(seg1, seg2)) return true
    }
  }
  
  return false
}

/**
 * Calcule l'aire d'un polygone en mètres carrés
 */
export function calculatePolygonAreaInMeters(polygon: ReadonlyArray<Point>): number {
  if (polygon.length < 3) return 0
  
  let area = 0
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length
    area += polygon[i].x * polygon[j].y
    area -= polygon[j].x * polygon[i].y
  }
  
  area = Math.abs(area) / 2
  
  // Convertir en m² (grille → mètres)
  const gridToMeters = GRID_TO_METERS
  return Number((area * gridToMeters * gridToMeters).toFixed(MEASUREMENT_PRECISION))
}

/**
 * Calcule le centre d'un polygone
 */
export function getPolygonCenter(polygon: ReadonlyArray<Point>): Point {
  if (polygon.length === 0) return { x: 0, y: 0 }
  
  let sumX = 0
  let sumY = 0
  
  for (const point of polygon) {
    sumX += point.x
    sumY += point.y
  }
  
  return {
    x: sumX / polygon.length,
    y: sumY / polygon.length,
  }
}

/**
 * Calcule le milieu d'un segment
 */
export function getSegmentMidpoint(start: Point, end: Point): Point {
  return {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  }
}

/**
 * Calcule la distance en mètres
 */
export function calculateDistanceInMeters(p1: Point, p2: Point): number {
  const dist = distance(p1, p2)
  return Number((dist * GRID_TO_METERS).toFixed(MEASUREMENT_PRECISION))
}

/**
 * Crée un polygone circulaire
 */
export function createCirclePolygon(center: Point, radius: number): Point[] {
  const points: Point[] = []
  const segments = GEOMETRY.circleSegments
  
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    points.push({
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    })
  }
  
  return points
}

/**
 * Crée un polygone triangulaire
 */
export function createTrianglePolygon(p1: Point, p2: Point): Point[] {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const height = Math.sqrt(dx * dx + dy * dy)
  const angle = Math.atan2(dy, dx)
  
  return [
    p1,
    p2,
    {
      x: p1.x + Math.cos(angle + Math.PI / 3) * height,
      y: p1.y + Math.sin(angle + Math.PI / 3) * height,
    },
  ]
}

/**
 * Crée un polygone d'arc
 */
export function createArcPolygon(center: Point, start: Point, end: Point): Point[] {
  const startAngle = Math.atan2(start.y - center.y, start.x - center.x)
  const endAngle = Math.atan2(end.y - center.y, end.x - center.x)
  const radius = distance(center, start)
  
  const points: Point[] = [center]
  const segments = GEOMETRY.arcSegments
  let angle = startAngle
  let angleDiff = endAngle - startAngle
  
  if (angleDiff < 0) angleDiff += Math.PI * 2
  
  for (let i = 0; i <= segments; i++) {
    const currentAngle = startAngle + (i / segments) * angleDiff
    points.push({
      x: center.x + Math.cos(currentAngle) * radius,
      y: center.y + Math.sin(currentAngle) * radius,
    })
  }
  
  return points
}

/**
 * Obtient la direction perpendiculaire à un segment
 */
export function getPerpendicularDirection(start: Point, end: Point): Point {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.sqrt(dx * dx + dy * dy)
  
  if (length === 0) return { x: 0, y: 1 }
  
  return {
    x: -dy / length,
    y: dx / length,
  }
}
