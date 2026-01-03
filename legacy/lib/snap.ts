/**
 * SYSTÈME DE SNAP ULTRA-INTELLIGENT & PROFESSIONNEL
 * Snap contextuel entre tous éléments : points, segments, intersections
 * Coordination parfaite avec contraintes et validation
 */

import type { Point, Room, Wall, Door, VerticalLink, Floor, Artwork } from './types'
import { GRID_SIZE, SNAP_THRESHOLD } from './constants'
import { distanceToSegment, segmentsIntersect } from './geometry'

export interface SnapPoint {
  readonly point: Point
  readonly type: 'vertex' | 'segment' | 'intersection' | 'grid' | 'midpoint' | 'perpendicular'
  readonly elementId?: string
  readonly elementType?: 'room' | 'wall' | 'door' | 'verticalLink' | 'artwork'
  readonly segmentIndex?: number
  readonly priority: number // Plus élevé = plus prioritaire
  readonly distance: number
  readonly metadata?: {
    readonly isCorner?: boolean
    readonly isEndpoint?: boolean
    readonly segmentStart?: Point
    readonly segmentEnd?: Point
  }
}

export interface SnapContext {
  readonly elementType?: string
  readonly excludeIds?: string[]
  readonly currentElement?: any
  readonly preferredTypes?: string[]
  readonly allowSelfSnap?: boolean
  readonly snapToGrid?: boolean
  readonly snapToElements?: boolean
  readonly snapToIntersections?: boolean
}

export interface SnapResult {
  readonly snappedPoint: Point
  readonly snapPoints: readonly SnapPoint[]
  readonly hasSnap: boolean
  readonly primarySnap?: SnapPoint
}

/**
 * SYSTÈME DE SNAP ULTRA-INTELLIGENT
 * Trouve TOUS les points de snap possibles selon le contexte
 */
export function findSnapPoints(
  targetPoint: Point,
  floor: Floor,
  maxDistance: number = 0.5,
  context: SnapContext = {}
): SnapPoint[] {
  const snapPoints: SnapPoint[] = []
  const excludeIds = context.excludeIds || []
  
  // === 1. SNAP À LA GRILLE (priorité de base) ===
  if (context.snapToGrid !== false) {
    addGridSnapPoints(targetPoint, snapPoints, maxDistance)
  }
  
  // === 2. SNAP AUX ÉLÉMENTS (priorité haute) ===
  if (context.snapToElements !== false) {
    // Snap aux pièces (vertices + segments)
    addRoomSnapPoints(targetPoint, floor.rooms, snapPoints, maxDistance, excludeIds)
    
    // Snap aux murs intérieurs (endpoints + segments)
    addWallSnapPoints(targetPoint, floor.walls, snapPoints, maxDistance, excludeIds)
    
    // Snap aux portes (endpoints + segments)
    addDoorSnapPoints(targetPoint, floor.doors, snapPoints, maxDistance, excludeIds)
    
    // Snap aux liens verticaux (endpoints + segments)
    addVerticalLinkSnapPoints(targetPoint, floor.verticalLinks, snapPoints, maxDistance, excludeIds)
    
    // Snap aux œuvres d'art (coins + milieux)
    addArtworkSnapPoints(targetPoint, floor.artworks, snapPoints, maxDistance, excludeIds)
  }
  
  // === 3. SNAP AUX INTERSECTIONS (priorité ultra-haute) ===
  if (context.snapToIntersections !== false) {
    addIntersectionSnapPoints(targetPoint, floor, snapPoints, maxDistance, excludeIds)
  }
  
  // Trier par priorité puis par distance
  return snapPoints
    .sort((a, b) => b.priority - a.priority || a.distance - b.distance)
    .slice(0, 10) // Limiter pour performance
}

// === SNAP À LA GRILLE ===
function addGridSnapPoints(targetPoint: Point, snapPoints: SnapPoint[], maxDistance: number): void {
  const gridX = Math.round(targetPoint.x)
  const gridY = Math.round(targetPoint.y)
  const gridDistance = Math.hypot(targetPoint.x - gridX, targetPoint.y - gridY)
  
  if (gridDistance <= maxDistance) {
    snapPoints.push({
      point: { x: gridX, y: gridY },
      type: 'grid',
      priority: 5,
      distance: gridDistance
    })
  }
}

// === SNAP AUX PIÈCES ===
function addRoomSnapPoints(
  targetPoint: Point, 
  rooms: readonly Room[], 
  snapPoints: SnapPoint[], 
  maxDistance: number,
  excludeIds: string[]
): void {
  rooms.forEach(room => {
    if (excludeIds.includes(room.id)) return
    
    // Snap aux vertices (priorité très haute)
    room.polygon.forEach((vertex, index) => {
      const distance = Math.hypot(targetPoint.x - vertex.x, targetPoint.y - vertex.y)
      if (distance <= maxDistance) {
        snapPoints.push({
          point: { ...vertex },
          type: 'vertex',
          elementId: room.id,
          elementType: 'room',
          segmentIndex: index,
          priority: 15,
          distance,
          metadata: { isCorner: true }
        })
      }
    })
    
    // Snap aux segments des pièces (murs extérieurs) 
    room.polygon.forEach((vertex, index) => {
      const nextVertex = room.polygon[(index + 1) % room.polygon.length]
      const segmentPoint = getClosestPointOnSegment(targetPoint, vertex, nextVertex)
      const distance = Math.hypot(targetPoint.x - segmentPoint.x, targetPoint.y - segmentPoint.y)
      
      if (distance <= maxDistance && distance > 0.01) { // Éviter doublons avec vertices
        snapPoints.push({
          point: segmentPoint,
          type: 'segment',
          elementId: room.id,
          elementType: 'room', 
          segmentIndex: index,
          priority: 12,
          distance,
          metadata: {
            segmentStart: vertex,
            segmentEnd: nextVertex
          }
        })
      }
    })
  })
}

// === SNAP AUX MURS INTÉRIEURS ===
function addWallSnapPoints(
  targetPoint: Point,
  walls: readonly Wall[],
  snapPoints: SnapPoint[],
  maxDistance: number,
  excludeIds: string[]
): void {
  walls.forEach(wall => {
    if (excludeIds.includes(wall.id)) return
    
    // Snap aux endpoints des murs
    [wall.segment[0], wall.segment[1]].forEach((endpoint, index) => {
      const distance = Math.hypot(targetPoint.x - endpoint.x, targetPoint.y - endpoint.y)
      if (distance <= maxDistance) {
        snapPoints.push({
          point: { ...endpoint },
          type: 'vertex',
          elementId: wall.id,
          elementType: 'wall',
          priority: 14,
          distance,
          metadata: { isEndpoint: true }
        })
      }
    })
    
    // Snap au segment du mur
    const segmentPoint = getClosestPointOnSegment(targetPoint, wall.segment[0], wall.segment[1])
    const distance = Math.hypot(targetPoint.x - segmentPoint.x, targetPoint.y - segmentPoint.y)
    
    if (distance <= maxDistance && distance > 0.01) {
      snapPoints.push({
        point: segmentPoint,
        type: 'segment',
        elementId: wall.id,
        elementType: 'wall',
        priority: 11,
        distance,
        metadata: {
          segmentStart: wall.segment[0],
          segmentEnd: wall.segment[1]
        }
      })
    }
  })
}

// === SNAP AUX PORTES ===
function addDoorSnapPoints(
  targetPoint: Point,
  doors: readonly Door[],
  snapPoints: SnapPoint[],
  maxDistance: number,
  excludeIds: string[]
): void {
  doors.forEach(door => {
    if (excludeIds.includes(door.id)) return
    
    // Snap aux endpoints des portes
    [door.segment[0], door.segment[1]].forEach((endpoint, index) => {
      const distance = Math.hypot(targetPoint.x - endpoint.x, targetPoint.y - endpoint.y)
      if (distance <= maxDistance) {
        snapPoints.push({
          point: { ...endpoint },
          type: 'vertex',
          elementId: door.id,
          elementType: 'door',
          priority: 13,
          distance,
          metadata: { isEndpoint: true }
        })
      }
    })
  })
}

// === SNAP AUX LIENS VERTICAUX ===
function addVerticalLinkSnapPoints(
  targetPoint: Point,
  verticalLinks: readonly VerticalLink[],
  snapPoints: SnapPoint[],
  maxDistance: number,
  excludeIds: string[]
): void {
  verticalLinks.forEach(link => {
    if (excludeIds.includes(link.id)) return
    
    // Snap aux endpoints des liens verticaux
    [link.segment[0], link.segment[1]].forEach((endpoint, index) => {
      const distance = Math.hypot(targetPoint.x - endpoint.x, targetPoint.y - endpoint.y)
      if (distance <= maxDistance) {
        snapPoints.push({
          point: { ...endpoint },
          type: 'vertex',
          elementId: link.id,
          elementType: 'verticalLink',
          priority: 13,
          distance,
          metadata: { isEndpoint: true }
        })
      }
    })
  })
}

// === SNAP AUX ŒUVRES D'ART ===
function addArtworkSnapPoints(
  targetPoint: Point,
  artworks: readonly Artwork[],
  snapPoints: SnapPoint[],
  maxDistance: number,
  excludeIds: string[]
): void {
  artworks.forEach(artwork => {
    if (excludeIds.includes(artwork.id)) return
    
    const [x, y] = artwork.xy
    const [width, height] = artwork.size || [0, 0]
    
    // Coins de l'œuvre d'art
    const corners = [
      { x, y }, // top-left
      { x: x + width, y }, // top-right
      { x: x + width, y: y + height }, // bottom-right
      { x, y: y + height } // bottom-left
    ]
    
    corners.forEach((corner, index) => {
      const distance = Math.hypot(targetPoint.x - corner.x, targetPoint.y - corner.y)
      if (distance <= maxDistance) {
        snapPoints.push({
          point: corner,
          type: 'vertex',
          elementId: artwork.id,
          elementType: 'artwork',
          priority: 10,
          distance,
          metadata: { isCorner: true }
        })
      }
    })
  })
}

// === SNAP AUX INTERSECTIONS ===
function addIntersectionSnapPoints(
  targetPoint: Point,
  floor: Floor,
  snapPoints: SnapPoint[],
  maxDistance: number,
  excludeIds: string[]
): void {
  // Trouve toutes les intersections entre segments
  const allSegments = getAllSegments(floor)
  
  for (let i = 0; i < allSegments.length; i++) {
    for (let j = i + 1; j < allSegments.length; j++) {
      const seg1 = allSegments[i]
      const seg2 = allSegments[j]
      
      // Éviter auto-intersection
      if (seg1.elementId === seg2.elementId) continue
      if (excludeIds.includes(seg1.elementId) || excludeIds.includes(seg2.elementId)) continue
      
      const intersection = getLineIntersection(
        seg1.start, seg1.end,
        seg2.start, seg2.end
      )
      
      if (intersection) {
        const distance = Math.hypot(targetPoint.x - intersection.x, targetPoint.y - intersection.y)
        if (distance <= maxDistance) {
          snapPoints.push({
            point: intersection,
            type: 'intersection',
            priority: 20, // Priorité ultra-haute
            distance
          })
        }
      }
    }
  }
}

// === UTILITAIRES GÉOMÉTRIQUES ===
function getClosestPointOnSegment(point: Point, segStart: Point, segEnd: Point): Point {
  const dx = segEnd.x - segStart.x
  const dy = segEnd.y - segStart.y
  
  if (dx === 0 && dy === 0) {
    return { ...segStart } // Segment dégénéré
  }
  
  const t = Math.max(0, Math.min(1, 
    ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / (dx * dx + dy * dy)
  ))
  
  return {
    x: segStart.x + t * dx,
    y: segStart.y + t * dy
  }
}

function getAllSegments(floor: Floor): Array<{ start: Point; end: Point; elementId: string; elementType: string }> {
  const segments: Array<{ start: Point; end: Point; elementId: string; elementType: string }> = []
  
  // Segments des pièces
  floor.rooms.forEach(room => {
    room.polygon.forEach((vertex, index) => {
      const nextVertex = room.polygon[(index + 1) % room.polygon.length]
      segments.push({
        start: vertex,
        end: nextVertex,
        elementId: room.id,
        elementType: 'room'
      })
    })
  })
  
  // Segments des murs
  floor.walls.forEach(wall => {
    segments.push({
      start: wall.segment[0],
      end: wall.segment[1],
      elementId: wall.id,
      elementType: 'wall'
    })
  })
  
  return segments
}

function getLineIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
  const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x)
  
  if (Math.abs(denom) < 1e-10) return null // Lignes parallèles
  
  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom
  const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / denom
  
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: p1.x + t * (p2.x - p1.x),
      y: p1.y + t * (p2.y - p1.y)
    }
  }
  
  return null
}

// Snap un point à un segment de ligne
export function snapPointToLineSegment(point: Point, start: Point, end: Point): Point {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.hypot(dx, dy)
  
  if (length === 0) return start
  
  const t = Math.max(0, Math.min(1, 
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / (length * length)
  ))
  
  return {
    x: start.x + t * dx,
    y: start.y + t * dy
  }
}

// Trouve le meilleur point de snap
export function getBestSnapPoint(
  targetPoint: Point,
  floor: Floor,
  maxDistance: number = 0.5
): SnapResult {
  const snapPoints = findSnapPoints(targetPoint, floor, maxDistance)
  
  if (snapPoints.length === 0) {
    return {
      snappedPoint: targetPoint,
      snapPoints: [],
      hasSnap: false
    }
  }
  
  return {
    snappedPoint: snapPoints[0].point,
    snapPoints,
    hasSnap: true
  }
}

// Contraintes d'angle pour la rotation
export const ANGLE_CONSTRAINTS = {
  SNAP_ANGLE: 15, // Snap tous les 15 degrés
  RIGHT_ANGLE: 90,
  STRAIGHT_ANGLE: 180,
  TOLERANCE: 5 // Tolérance en degrés pour le snap d'angle
}

// Snap un angle aux contraintes
export function snapAngle(angle: number): number {
  const { SNAP_ANGLE, TOLERANCE } = ANGLE_CONSTRAINTS
  
  // Normaliser l'angle entre 0 et 360
  const normalizedAngle = ((angle % 360) + 360) % 360
  
  // Trouver l'angle de snap le plus proche
  const snapTarget = Math.round(normalizedAngle / SNAP_ANGLE) * SNAP_ANGLE
  const difference = Math.abs(normalizedAngle - snapTarget)
  
  if (difference <= TOLERANCE) {
    return snapTarget
  }
  
  return normalizedAngle
}

// Vérifie si deux murs sont parallèles
export function areWallsParallel(wall1: Wall, wall2: Wall, tolerance: number = 5): boolean {
  const angle1 = getWallAngle(wall1)
  const angle2 = getWallAngle(wall2)
  
  const diff = Math.abs(angle1 - angle2)
  return diff <= tolerance || diff >= (180 - tolerance)
}

// Obtient l'angle d'un mur en degrés
export function getWallAngle(wall: Wall): number {
  const dx = wall.segment[1].x - wall.segment[0].x
  const dy = wall.segment[1].y - wall.segment[0].y
  return Math.atan2(dy, dx) * 180 / Math.PI
}

// Vérifie si deux murs sont perpendiculaires
export function areWallsPerpendicular(wall1: Wall, wall2: Wall, tolerance: number = 5): boolean {
  const angle1 = getWallAngle(wall1)
  const angle2 = getWallAngle(wall2)
  
  const diff = Math.abs(angle1 - angle2)
  return Math.abs(diff - 90) <= tolerance || Math.abs(diff - 270) <= tolerance
}