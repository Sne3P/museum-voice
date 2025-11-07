import type { Point, Door, VerticalLink, Artwork, Room } from "./types"
import { GRID_SIZE, SNAP_THRESHOLD, GEOMETRY, GRID_TO_METERS, MEASUREMENT_PRECISION } from "./constants"

/**
 * Enhanced geometry utilities for the Museum Floor Plan Editor
 * Provides robust mathematical operations for spatial calculations
 */

export function snapToGrid(point: Point, gridSize: number = GRID_SIZE): Point {
  return {
    x: Math.round(point.x / gridSize),
    y: Math.round(point.y / gridSize),
  }
}

/**
 * Optimized point-in-polygon test using winding number algorithm
 */
export function isPointInPolygon(point: Point, polygon: ReadonlyArray<Point>): boolean {
  if (polygon.length < 3) return false
  
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y
    const xj = polygon[j].x, yj = polygon[j].y
    
    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  return inside
}

/**
 * Calculate bounds for a set of points
 */
export function calculateBounds(points: ReadonlyArray<Point>): { 
  minX: number; minY: number; maxX: number; maxY: number 
} {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  }
  
  let minX = points[0].x, minY = points[0].y
  let maxX = points[0].x, maxY = points[0].y
  
  for (let i = 1; i < points.length; i++) {
    const point = points[i]
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }
  
  return { minX, minY, maxX, maxY }
}

/**
 * Get the closest wall segment to a point
 */
export function getClosestWallSegment(
  point: Point,
  polygon: ReadonlyArray<Point>,
): { start: Point; end: Point; distance: number } | null {
  if (polygon.length < 2) return null

  let closest: { start: Point; end: Point; distance: number } | null = null

  for (let i = 0; i < polygon.length; i++) {
    const start = polygon[i]
    const end = polygon[(i + 1) % polygon.length]

    const distance = distanceToSegment(point, start, end)

    if (!closest || distance < closest.distance) {
      closest = { start, end, distance }
    }
  }

  return closest
}

/**
 * Calculate distance from point to line segment
 */
export function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x
  const dy = end.y - start.y

  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y)
  }

  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)))

  const projX = start.x + t * dx
  const projY = start.y + t * dy

  return Math.hypot(point.x - projX, point.y - projY)
}

/**
 * Test if two polygons intersect
 */
export function polygonsIntersect(poly1: ReadonlyArray<Point>, poly2: ReadonlyArray<Point>): boolean {
  // Quick bounds check first
  const bounds1 = calculateBounds(poly1)
  const bounds2 = calculateBounds(poly2)
  
  if (bounds1.maxX < bounds2.minX || bounds2.maxX < bounds1.minX ||
      bounds1.maxY < bounds2.minY || bounds2.maxY < bounds1.minY) {
    return false
  }

  // Check if any edges intersect
  for (let i = 0; i < poly1.length; i++) {
    const a1 = poly1[i]
    const a2 = poly1[(i + 1) % poly1.length]

    for (let j = 0; j < poly2.length; j++) {
      const b1 = poly2[j]
      const b2 = poly2[(j + 1) % poly2.length]

      if (segmentsIntersect(a1, a2, b1, b2)) {
        return true
      }
    }
  }

  // Check if one polygon is inside the other
  if (isPointInPolygon(poly1[0], poly2) || isPointInPolygon(poly2[0], poly1)) {
    return true
  }

  return false
}

/**
 * Test if two line segments intersect
 */
export function segmentsIntersect(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
  const det = (a2.x - a1.x) * (b2.y - b1.y) - (b2.x - b1.x) * (a2.y - a1.y)

  if (Math.abs(det) < 1e-10) return false // Parallel lines

  const lambda = ((b2.y - b1.y) * (b2.x - a1.x) + (b1.x - b2.x) * (b2.y - a1.y)) / det
  const gamma = ((a1.y - a2.y) * (b2.x - a1.x) + (a2.x - a1.x) * (b2.y - a1.y)) / det

  return lambda > 0 && lambda < 1 && gamma > 0 && gamma < 1
}

/**
 * Snap point to wall segment with position information
 */
export function snapToWallSegmentWithPosition(
  point: Point,
  rooms: ReadonlyArray<{ polygon: ReadonlyArray<Point> }>,
  snapThreshold = SNAP_THRESHOLD,
): { point: Point; segmentStart: Point; segmentEnd: Point; distance: number } | null {
  let closestSnap: { point: Point; segmentStart: Point; segmentEnd: Point; distance: number } | null = null
  let minDistance = Number.POSITIVE_INFINITY

  for (const room of rooms) {
    for (let i = 0; i < room.polygon.length; i++) {
      const start = room.polygon[i]
      const end = room.polygon[(i + 1) % room.polygon.length]

      // Project point onto segment
      const projected = projectPointOntoSegment(point, start, end)
      const distance = Math.hypot(point.x - projected.x, point.y - projected.y)

      if (distance < minDistance && distance < snapThreshold) {
        minDistance = distance
        closestSnap = {
          point: projected,
          segmentStart: start,
          segmentEnd: end,
          distance
        }
      }
    }
  }

  return closestSnap
}

/**
 * Create polygon shapes for drawing tools
 */
export function createCirclePolygon(center: Point, radius: number, segments = GEOMETRY.circleSegments): Point[] {
  const points: Point[] = []
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    points.push({
      x: Math.round(center.x + Math.cos(angle) * radius),
      y: Math.round(center.y + Math.sin(angle) * radius),
    })
  }
  return points
}

export function createTrianglePolygon(p1: Point, p2: Point): Point[] {
  // Calculer les coordonnées min/max pour éviter les déformations
  const minX = Math.min(p1.x, p2.x)
  const maxX = Math.max(p1.x, p2.x)
  const minY = Math.min(p1.y, p2.y)
  const maxY = Math.max(p1.y, p2.y)
  
  const width = maxX - minX
  const height = maxY - minY

  // Créer un triangle isocèle plus équilibré
  const centerX = minX + width / 2
  
  return [
    { x: centerX, y: minY }, // sommet au centre-haut
    { x: maxX, y: maxY }, // coin bas-droit  
    { x: minX, y: maxY }, // coin bas-gauche
  ]
}

export function createArcPolygon(center: Point, endPoint: Point, segments = GEOMETRY.arcSegments): Point[] {
  // Utiliser la distance euclidienne pour un rayon plus naturel
  const radius = Math.hypot(endPoint.x - center.x, endPoint.y - center.y)
  const points: Point[] = []

  // Créer un arc plus fluide avec plus de segments pour les grandes formes
  const adaptiveSegments = Math.max(segments, Math.floor(radius / 2))
  
  // Arc de 3/4 de cercle (270 degrés) avec début dynamique basé sur la direction
  const baseAngle = Math.atan2(endPoint.y - center.y, endPoint.x - center.x)
  const startAngle = baseAngle
  const endAngle = baseAngle + (3 * Math.PI) / 2

  for (let i = 0; i <= adaptiveSegments; i++) {
    const angle = startAngle + (endAngle - startAngle) * (i / adaptiveSegments)
    const x = center.x + Math.cos(angle) * radius
    const y = center.y + Math.sin(angle) * radius
    
    points.push({
      x: Math.round(x * 10) / 10, // Précision sub-grid pour plus de fluidité
      y: Math.round(y * 10) / 10,
    })
  }

  // Fermer l'arc en se reconnectant au centre avec une courbe lisse
  const lastPoint = points[points.length - 1]
  const midX = (lastPoint.x + center.x) / 2
  const midY = (lastPoint.y + center.y) / 2
  
  // Ajouter un point intermédiaire pour une fermeture plus douce
  points.push({
    x: Math.round(midX * 10) / 10,
    y: Math.round(midY * 10) / 10,
  })
  
  points.push(center)
  return points
}

/**
 * Check if rectangle overlaps with any rooms
 */
export function rectangleOverlapsRooms(rect: ReadonlyArray<Point>, rooms: ReadonlyArray<{ polygon: ReadonlyArray<Point> }>): boolean {
  for (const room of rooms) {
    if (polygonsIntersect(rect, room.polygon)) {
      return true
    }
  }
  return false
}

export function isWallSegmentOccupied(
  segmentStart: Point,
  segmentEnd: Point,
  doors: ReadonlyArray<Door> | Door[],
  verticalLinks: ReadonlyArray<VerticalLink> | VerticalLink[],
  artworks: ReadonlyArray<Artwork> | Artwork[],
  excludeId?: string,
): boolean {
  // Check doors
  for (const door of doors) {
    if (door.id === excludeId) continue
    if (segmentsOverlap(segmentStart, segmentEnd, door.segment[0], door.segment[1])) {
      return true
    }
  }

  // Check vertical links
  for (const link of verticalLinks) {
    if (link.id === excludeId) continue
    if (segmentsOverlap(segmentStart, segmentEnd, link.segment[0], link.segment[1])) {
      return true
    }
  }

  return false
}

function segmentsOverlap(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
  // Check if segments are on the same line
  const onSameLine = Math.abs((a2.y - a1.y) * (b2.x - b1.x) - (b2.y - b1.y) * (a2.x - a1.x)) < 0.01

  if (!onSameLine) return false

  // Check if they overlap
  const minAx = Math.min(a1.x, a2.x)
  const maxAx = Math.max(a1.x, a2.x)
  const minBx = Math.min(b1.x, b2.x)
  const maxBx = Math.max(b1.x, b2.x)

  const minAy = Math.min(a1.y, a2.y)
  const maxAy = Math.max(a1.y, a2.y)
  const minBy = Math.min(b1.y, b2.y)
  const maxBy = Math.max(b1.y, b2.y)

  return !(maxAx < minBx || maxBx < minAx || maxAy < minBy || maxBy < minAy)
}

export function calculateWallSegment(
  start: Point,
  end: Point,
  wallStart: Point,
  wallEnd: Point,
): { start: Point; end: Point } {
  // Calculate direction vector of wall
  const dx = wallEnd.x - wallStart.x
  const dy = wallEnd.y - wallStart.y
  const length = Math.sqrt(dx * dx + dy * dy)

  if (length === 0) return { start, end }

  // Normalize direction
  const dirX = dx / length
  const dirY = dy / length

  // Project start and end onto wall segment
  const t1 = Math.max(0, Math.min(1, ((start.x - wallStart.x) * dx + (start.y - wallStart.y) * dy) / (length * length)))
  const t2 = Math.max(0, Math.min(1, ((end.x - wallStart.x) * dx + (end.y - wallStart.y) * dy) / (length * length)))

  const projStart = {
    x: wallStart.x + t1 * dx,
    y: wallStart.y + t1 * dy,
  }

  const projEnd = {
    x: wallStart.x + t2 * dx,
    y: wallStart.y + t2 * dy,
  }

  return { start: projStart, end: projEnd }
}

export function findWallSegmentForElement(
  elementSegment: readonly [Point, Point] | [Point, Point],
  rooms: ReadonlyArray<{ id: string; polygon: ReadonlyArray<Point> }> | { id: string; polygon: Point[] }[],
): { roomId: string; segmentIndex: number } | null {
  const midpoint = {
    x: (elementSegment[0].x + elementSegment[1].x) / 2,
    y: (elementSegment[0].y + elementSegment[1].y) / 2,
  }

  for (const room of rooms) {
    for (let i = 0; i < room.polygon.length; i++) {
      const start = room.polygon[i]
      const end = room.polygon[(i + 1) % room.polygon.length]

      const distToSegment = distanceToSegmentHelper(midpoint, start, end)
      if (distToSegment < 0.1) {
        return { roomId: room.id, segmentIndex: i }
      }
    }
  }

  return null
}

function distanceToSegmentHelper(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x
  const dy = end.y - start.y

  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y)
  }

  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)))

  const projX = start.x + t * dx
  const projY = start.y + t * dy

  return Math.hypot(point.x - projX, point.y - projY)
}

export function moveElementWithWall(
  elementSegment: readonly [Point, Point] | [Point, Point],
  oldWallStart: Point,
  oldWallEnd: Point,
  newWallStart: Point,
  newWallEnd: Point,
): readonly [Point, Point] {
  // Calculate the position of element endpoints relative to the wall
  const oldDx = oldWallEnd.x - oldWallStart.x
  const oldDy = oldWallEnd.y - oldWallStart.y
  const oldLength = Math.sqrt(oldDx * oldDx + oldDy * oldDy)

  if (oldLength === 0) return elementSegment

  // Find t values for start and end points
  const t1 =
    ((elementSegment[0].x - oldWallStart.x) * oldDx + (elementSegment[0].y - oldWallStart.y) * oldDy) /
    (oldLength * oldLength)
  const t2 =
    ((elementSegment[1].x - oldWallStart.x) * oldDx + (elementSegment[1].y - oldWallStart.y) * oldDy) /
    (oldLength * oldLength)

  // Apply same t values to new wall
  const newDx = newWallEnd.x - newWallStart.x
  const newDy = newWallEnd.y - newWallStart.y

  return [
    {
      x: newWallStart.x + t1 * newDx,
      y: newWallStart.y + t1 * newDy,
    },
    {
      x: newWallStart.x + t2 * newDx,
      y: newWallStart.y + t2 * newDy,
    },
  ] as const
}

export function isElementInRoom(
  element: { xy: readonly [number, number] | [number, number]; size?: readonly [number, number] | [number, number] },
  room: { polygon: ReadonlyArray<Point> | Point[] },
): boolean {
  const size = element.size || [1, 1]
  const corners = [
    { x: element.xy[0], y: element.xy[1] },
    { x: element.xy[0] + size[0], y: element.xy[1] },
    { x: element.xy[0] + size[0], y: element.xy[1] + size[1] },
    { x: element.xy[0], y: element.xy[1] + size[1] },
  ]

  return corners.every((corner) => isPointInPolygon(corner, room.polygon))
}

export function projectPointOntoSegment(point: Point, segmentStart: Point, segmentEnd: Point): Point {
  const dx = segmentEnd.x - segmentStart.x
  const dy = segmentEnd.y - segmentStart.y
  const lengthSquared = dx * dx + dy * dy

  if (lengthSquared === 0) return segmentStart

  const t = Math.max(
    0,
    Math.min(1, ((point.x - segmentStart.x) * dx + (point.y - segmentStart.y) * dy) / lengthSquared),
  )

  return {
    x: segmentStart.x + t * dx,
    y: segmentStart.y + t * dy,
  }
}

export function isArtworkInRoom(
  artwork: { xy: readonly [number, number] | [number, number]; size?: readonly [number, number] | [number, number] },
  room: { polygon: ReadonlyArray<Point> | Point[] },
): boolean {
  const size = artwork.size || [1, 1]
  const center = {
    x: artwork.xy[0] + size[0] / 2,
    y: artwork.xy[1] + size[1] / 2,
  }

  // Just check if center is in room - allows touching walls
  return isPointInPolygon(center, room.polygon)
}

export function getArtworkResizeHandle(
  mousePos: Point,
  artwork: { xy: readonly [number, number] | [number, number]; size?: readonly [number, number] | [number, number] },
  threshold = 0.3,
): "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w" | null {
  const size = artwork.size || [1, 1]
  const x = artwork.xy[0]
  const y = artwork.xy[1]
  const w = size[0]
  const h = size[1]

  // Check corners first (higher priority)
  if (Math.hypot(mousePos.x - x, mousePos.y - y) < threshold) return "nw"
  if (Math.hypot(mousePos.x - (x + w), mousePos.y - y) < threshold) return "ne"
  if (Math.hypot(mousePos.x - x, mousePos.y - (y + h)) < threshold) return "sw"
  if (Math.hypot(mousePos.x - (x + w), mousePos.y - (y + h)) < threshold) return "se"

  // Check edges
  if (Math.abs(mousePos.x - x) < threshold && mousePos.y >= y && mousePos.y <= y + h) return "w"
  if (Math.abs(mousePos.x - (x + w)) < threshold && mousePos.y >= y && mousePos.y <= y + h) return "e"
  if (Math.abs(mousePos.y - y) < threshold && mousePos.x >= x && mousePos.x <= x + w) return "n"
  if (Math.abs(mousePos.y - (y + h)) < threshold && mousePos.x >= x && mousePos.x <= x + w) return "s"

  return null
}

// === MEASUREMENT UTILITIES ===

/**
 * Convert grid units to meters with specified precision
 */
export function gridUnitsToMeters(gridUnits: number): number {
  return Number((gridUnits * GRID_TO_METERS).toFixed(MEASUREMENT_PRECISION))
}

/**
 * Calculate distance between two points in meters
 */
export function calculateDistanceInMeters(start: Point, end: Point): number {
  const gridDistance = Math.hypot(end.x - start.x, end.y - start.y)
  return gridUnitsToMeters(gridDistance)
}

/**
 * Calculate area of a polygon in square meters
 */
export function calculatePolygonAreaInMeters(polygon: ReadonlyArray<Point>): number {
  if (polygon.length < 3) return 0
  
  let area = 0
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    area += (polygon[j].x + polygon[i].x) * (polygon[j].y - polygon[i].y)
  }
  
  // Convert from grid units squared to meters squared
  const gridAreaSquared = Math.abs(area) / 2
  const metersSquared = gridAreaSquared * GRID_TO_METERS * GRID_TO_METERS
  
  return Number(metersSquared.toFixed(MEASUREMENT_PRECISION))
}

/**
 * Calculate perimeter of a polygon in meters
 */
export function calculatePolygonPerimeterInMeters(polygon: ReadonlyArray<Point>): number {
  if (polygon.length < 2) return 0
  
  let perimeter = 0
  for (let i = 0; i < polygon.length; i++) {
    const current = polygon[i]
    const next = polygon[(i + 1) % polygon.length]
    perimeter += Math.hypot(next.x - current.x, next.y - current.y)
  }
  
  return gridUnitsToMeters(perimeter)
}

/**
 * Get center point of a polygon
 */
export function getPolygonCenter(polygon: ReadonlyArray<Point>): Point {
  if (polygon.length === 0) return { x: 0, y: 0 }
  
  let totalX = 0, totalY = 0
  for (const point of polygon) {
    totalX += point.x
    totalY += point.y
  }
  
  return {
    x: totalX / polygon.length,
    y: totalY / polygon.length
  }
}

/**
 * Get midpoint of a line segment
 */
export function getSegmentMidpoint(start: Point, end: Point): Point {
  return {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2
  }
}

/**
 * Get perpendicular direction for measurement label placement
 */
export function getPerpendicularDirection(start: Point, end: Point): Point {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.hypot(dx, dy)
  
  if (length === 0) return { x: 0, y: 1 }
  
  // Return normalized perpendicular vector
  return {
    x: -dy / length,
    y: dx / length
  }
}

/**
 * Improved overlap detection that allows touching and shared edges
 */
export function checkPolygonsOverlapIntelligent(
  poly1: ReadonlyArray<Point>,
  poly2: ReadonlyArray<Point>,
  allowTouching: boolean = true
): { overlapping: boolean; touching: boolean; sharedEdge: boolean } {
  // Check if polygons are identical (shared edges)
  if (poly1.length === poly2.length) {
    const samePoints = poly1.every(p1 => 
      poly2.some(p2 => Math.hypot(p1.x - p2.x, p1.y - p2.y) < 0.01)
    )
    if (samePoints) {
      return { overlapping: false, touching: true, sharedEdge: true }
    }
  }

  // Check for shared edges
  let hasSharedEdge = false
  for (let i = 0; i < poly1.length; i++) {
    const p1 = poly1[i]
    const p2 = poly1[(i + 1) % poly1.length]
    
    for (let j = 0; j < poly2.length; j++) {
      const q1 = poly2[j]
      const q2 = poly2[(j + 1) % poly2.length]
      
      if (edgesOverlap(p1, p2, q1, q2)) {
        hasSharedEdge = true
        break
      }
    }
    if (hasSharedEdge) break
  }

  // Standard overlap test
  const standardOverlap = polygonsIntersect(poly1, poly2)
  
  // If allowing touching, only reject true interior overlap
  if (allowTouching && (hasSharedEdge || areTouching(poly1, poly2))) {
    return { 
      overlapping: false, 
      touching: true, 
      sharedEdge: hasSharedEdge 
    }
  }

  return { 
    overlapping: standardOverlap, 
    touching: false, 
    sharedEdge: hasSharedEdge 
  }
}

/**
 * Check if two edges overlap (share a portion)
 */
function edgesOverlap(p1: Point, p2: Point, q1: Point, q2: Point): boolean {
  // Check if edges are collinear and overlapping
  const cross1 = (q1.x - p1.x) * (p2.y - p1.y) - (q1.y - p1.y) * (p2.x - p1.x)
  const cross2 = (q2.x - p1.x) * (p2.y - p1.y) - (q2.y - p1.y) * (p2.x - p1.x)
  
  if (Math.abs(cross1) > 0.01 || Math.abs(cross2) > 0.01) return false
  
  // Edges are collinear, check for overlap
  const t1 = Math.min(
    ((q1.x - p1.x) * (p2.x - p1.x) + (q1.y - p1.y) * (p2.y - p1.y)) / ((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2),
    ((q2.x - p1.x) * (p2.x - p1.x) + (q2.y - p1.y) * (p2.y - p1.y)) / ((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
  )
  const t2 = Math.max(
    ((q1.x - p1.x) * (p2.x - p1.x) + (q1.y - p1.y) * (p2.y - p1.y)) / ((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2),
    ((q2.x - p1.x) * (p2.x - p1.x) + (q2.y - p1.y) * (p2.y - p1.y)) / ((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
  )
  
  return t1 <= 1 && t2 >= 0 && (t2 - t1) > 0.01 // Overlap with minimum length
}



/**
 * Check if a point is on the boundary of a polygon
 */
function isPointOnPolygonBoundary(point: Point, polygon: ReadonlyArray<Point>, tolerance: number = 0.01): boolean {
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i]
    const p2 = polygon[(i + 1) % polygon.length]
    
    const dist = distanceToSegment(point, p1, p2)
    if (dist <= tolerance) {
      return true
    }
  }
  return false
}

/**
 * Check if two polygons are just touching (points in common) without overlapping
 */
function areTouching(poly1: ReadonlyArray<Point>, poly2: ReadonlyArray<Point>): boolean {
  const tolerance = 0.01
  
  // Check if any point of poly1 is close to any point of poly2
  for (const p1 of poly1) {
    for (const p2 of poly2) {
      if (Math.hypot(p1.x - p2.x, p1.y - p2.y) < tolerance) {
        return true
      }
    }
    
    // Check if point is on edge of other polygon
    for (let i = 0; i < poly2.length; i++) {
      const q1 = poly2[i]
      const q2 = poly2[(i + 1) % poly2.length]
      if (distanceToSegment(p1, q1, q2) < tolerance) {
        return true
      }
    }
  }
  
  return false
}
