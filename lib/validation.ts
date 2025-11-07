import type { Point, Room, Artwork, Door, VerticalLink, ValidationResult, Bounds, Floor, Wall } from './types'
import { CONSTRAINTS, ERROR_MESSAGES, VISUAL_FEEDBACK } from './constants'
import { calculatePolygonAreaInMeters, calculateBounds, polygonsIntersect } from './geometry'

/**
 * SYSTÈME DE VALIDATION PROFESSIONNEL ULTRA-STRICT
 * Contraintes rigoureuses pour un éditeur CAO de niveau professionnel
 */

// === TYPES POUR VALIDATION AVANCÉE ===
export interface ExtendedValidationResult extends ValidationResult {
  severity: 'error' | 'warning' | 'info'
  code: string
  affectedElements?: string[]
  suggestedActions?: string[]
  visualFeedback?: {
    color: string
    opacity: number
    strokeWidth: number
    highlight?: boolean
  }
}

export interface ValidationContext {
  floor: Floor
  excludeIds?: string[]
  strictMode?: boolean
  allowWarnings?: boolean
}

// === VALIDATION DES PIÈCES (ULTRA-STRICT) ===
export function validateRoomGeometry(room: Room, context?: ValidationContext): ExtendedValidationResult {
  const { polygon } = room
  
  // 1. Vérifier nombre minimum de vertices
  if (polygon.length < 3) {
    return {
      valid: false,
      severity: 'error',
      code: 'ROOM_INSUFFICIENT_VERTICES',
      message: 'Une pièce doit avoir au minimum 3 points',
      suggestions: ['Ajoutez plus de points pour définir la forme'],
      visualFeedback: {
        color: VISUAL_FEEDBACK.colors.invalid,
        opacity: VISUAL_FEEDBACK.opacity.invalid,
        strokeWidth: VISUAL_FEEDBACK.stroke.invalidThickness,
        highlight: true
      }
    }
  }
  
  // 2. Vérifier auto-intersections (forme invalide)
  if (hasPolygonSelfIntersection(polygon)) {
    return {
      valid: false,
      severity: 'error', 
      code: 'ROOM_SELF_INTERSECTION',
      message: ERROR_MESSAGES.room.invalidShape,
      suggestions: ['Corrigez les points qui créent des croisements', 'Simplifiez la forme'],
      visualFeedback: {
        color: VISUAL_FEEDBACK.colors.invalid,
        opacity: 0.8,
        strokeWidth: 4,
        highlight: true
      }
    }
  }
  
  // 3. Contraintes de taille minimum - FLEXIBLE
  const area = calculatePolygonAreaInMeters(polygon)
  if (area < CONSTRAINTS.room.minArea) {
    // Warning au lieu d'erreur pour plus de flexibilité
    return {
      valid: true, // Changé de false à true
      severity: 'warning', // Changé d'error à warning
      code: 'ROOM_SMALL_AREA',
      message: `Pièce petite (${area.toFixed(2)} m²). Minimum recommandé: ${CONSTRAINTS.room.minArea} m²`,
      suggestions: ['Considérez agrandir la pièce si possible'],
      visualFeedback: {
        color: VISUAL_FEEDBACK.colors.warning,
        opacity: 0.3, // Plus transparent
        strokeWidth: 2 // Plus fin
      }
    }
  }
  
  // 4. Vérifier dimensions minimum (largeur/hauteur)
  const bounds = calculateBounds(polygon)
  const width = bounds.maxX - bounds.minX
  const height = bounds.maxY - bounds.minY
  
  if (width < CONSTRAINTS.room.minWidth) {
    return {
      valid: false,
      severity: 'error',
      code: 'ROOM_TOO_NARROW',
      message: ERROR_MESSAGES.room.tooNarrow.replace('{minWidth}', CONSTRAINTS.room.minWidth.toString()),
      suggestions: ['Élargissez la pièce horizontalement'],
      visualFeedback: {
        color: VISUAL_FEEDBACK.colors.warning,
        opacity: 0.6,
        strokeWidth: 3
      }
    }
  }
  
  if (height < CONSTRAINTS.room.minHeight) {
    return {
      valid: false,
      severity: 'error', 
      code: 'ROOM_TOO_SHORT',
      message: ERROR_MESSAGES.room.tooShort.replace('{minHeight}', CONSTRAINTS.room.minHeight.toString()),
      suggestions: ['Agrandissez la pièce verticalement'],
      visualFeedback: {
        color: VISUAL_FEEDBACK.colors.warning,
        opacity: 0.6,
        strokeWidth: 3
      }
    }
  }
  
  // 5. Anti-chevauchement strict avec autres pièces
  if (context?.floor) {
    const overlappingRooms = context.floor.rooms.filter(otherRoom => {
      if (otherRoom.id === room.id) return false
      if (context.excludeIds?.includes(otherRoom.id)) return false
      
      return doPolygonsIntersectStrict(polygon, otherRoom.polygon)
    })
    
    if (overlappingRooms.length > 0) {
      return {
        valid: false,
        severity: 'error',
        code: 'ROOM_OVERLAP_DETECTED',
        message: ERROR_MESSAGES.room.overlapping,
        affectedElements: overlappingRooms.map(r => r.id),
        suggestions: ['Déplacez la pièce', 'Redimensionnez pour éviter le chevauchement'],
        visualFeedback: {
          color: VISUAL_FEEDBACK.colors.invalid,
          opacity: 0.4,
          strokeWidth: 4,
          highlight: true
        }
      }
    }
  }
  
  return {
    valid: true,
    severity: 'info',
    code: 'ROOM_VALID',
    message: 'Pièce valide',
    visualFeedback: {
      color: VISUAL_FEEDBACK.colors.valid,
      opacity: 1.0,
      strokeWidth: VISUAL_FEEDBACK.stroke.validThickness
    }
  }
}
// === VALIDATION DES ŒUVRES D'ART (STRICT) ===
export function validateArtworkPlacement(artwork: Artwork, context: ValidationContext): ExtendedValidationResult {
  const size = artwork.size || [1, 1]
  
  // 1. Vérifier tailles minimum/maximum
  if (size[0] < CONSTRAINTS.artwork.minWidth || size[1] < CONSTRAINTS.artwork.minHeight) {
    return {
      valid: false,
      severity: 'error',
      code: 'ARTWORK_TOO_SMALL',
      message: ERROR_MESSAGES.artwork.tooSmall
        .replace('{minWidth}', CONSTRAINTS.artwork.minWidth.toString())
        .replace('{minHeight}', CONSTRAINTS.artwork.minHeight.toString()),
      suggestions: ['Agrandissez l\'œuvre', 'Vérifiez les dimensions'],
      visualFeedback: {
        color: VISUAL_FEEDBACK.colors.invalid,
        opacity: 0.5,
        strokeWidth: 3
      }
    }
  }
  
  if (size[0] > CONSTRAINTS.artwork.maxWidth || size[1] > CONSTRAINTS.artwork.maxHeight) {
    return {
      valid: false,
      severity: 'error', 
      code: 'ARTWORK_TOO_LARGE',
      message: ERROR_MESSAGES.artwork.tooBig,
      suggestions: ['Réduisez la taille de l\'œuvre'],
      visualFeedback: {
        color: VISUAL_FEEDBACK.colors.warning,
        opacity: 0.6,
        strokeWidth: 3
      }
    }
  }
  
  // 2. Vérifier que l'œuvre est dans une pièce
  const artworkBounds = getArtworkBounds(artwork)
  const containingRoom = context.floor.rooms.find(room => isArtworkInRoom(artworkBounds, room))
  
  if (!containingRoom) {
    return {
      valid: false,
      severity: 'error',
      code: 'ARTWORK_OUTSIDE_ROOM',
      message: ERROR_MESSAGES.artwork.outsideRoom,
      suggestions: ['Déplacez l\'œuvre dans une pièce', 'Agrandissez la pièce'],
      visualFeedback: {
        color: VISUAL_FEEDBACK.colors.invalid,
        opacity: 0.4,
        strokeWidth: 4,
        highlight: true
      }
    }
  }
  
  return {
    valid: true,
    severity: 'info',
    code: 'ARTWORK_VALID',
    message: 'Œuvre d\'art valide',
    visualFeedback: {
      color: VISUAL_FEEDBACK.colors.valid,
      opacity: 1.0,
      strokeWidth: 2
    }
  }
}

// === VALIDATION DES MURS INTÉRIEURS (STRICT) ===
export function validateWallPlacementStrict(wall: Wall, context: ValidationContext): ExtendedValidationResult {
  // 1. Vérifier longueur minimum
  const length = Math.hypot(
    wall.segment[1].x - wall.segment[0].x,
    wall.segment[1].y - wall.segment[0].y
  )
  
  if (length < CONSTRAINTS.wall.minLength) {
    return {
      valid: false,
      severity: 'error',
      code: 'WALL_TOO_SHORT',
      message: ERROR_MESSAGES.wall.tooShort.replace('{minLength}', CONSTRAINTS.wall.minLength.toString()),
      suggestions: ['Allongez le mur', 'Repositionnez les extrémités'],
      visualFeedback: {
        color: VISUAL_FEEDBACK.colors.invalid,
        opacity: 0.5,
        strokeWidth: 4
      }
    }
  }
  
  // 2. Vérifier que le segment entier est dans UNE SEULE pièce
  const containingRoom = findRoomContainingSegment(wall.segment[0], wall.segment[1], context.floor)
  
  if (!containingRoom) {
    return {
      valid: false,
      severity: 'error',
      code: 'WALL_OUTSIDE_ROOM',
      message: ERROR_MESSAGES.wall.outsideRoom,
      suggestions: ['Placez le mur entièrement dans une pièce', 'Ajustez les extrémités'],
      visualFeedback: {
        color: VISUAL_FEEDBACK.colors.invalid,
        opacity: 0.3,
        strokeWidth: 5,
        highlight: true
      }
    }
  }
  
  // 3. Vérifier intersections avec autres murs
  const intersectingWalls = context.floor.walls.filter(otherWall => {
    if (otherWall.id === wall.id) return false
    if (context.excludeIds?.includes(otherWall.id)) return false
    
    return segmentsIntersectStrict(wall.segment, otherWall.segment)
  })
  
  if (intersectingWalls.length > 0) {
    return {
      valid: false,
      severity: 'error',
      code: 'WALL_INTERSECTION',
      message: ERROR_MESSAGES.wall.intersectsOther,
      affectedElements: intersectingWalls.map(w => w.id),
      suggestions: ['Repositionnez le mur', 'Évitez les croisements'],
      visualFeedback: {
        color: VISUAL_FEEDBACK.colors.invalid,
        opacity: 0.4,
        strokeWidth: 4,
        highlight: true
      }
    }
  }
  
  return {
    valid: true,
    severity: 'info',
    code: 'WALL_VALID',
    message: 'Mur valide',
    visualFeedback: {
      color: VISUAL_FEEDBACK.colors.valid,
      opacity: 1.0,
      strokeWidth: 2
    }
  }
}

// === FONCTIONS UTILITAIRES STRICTES ===

// Vérifie les intersections de polygones avec tolérance ultra-faible
function doPolygonsIntersectStrict(poly1: readonly Point[], poly2: readonly Point[]): boolean {
  // D'abord vérifier chevauchement de surface (pas juste contact)
  if (polygonsIntersect(poly1, poly2)) {
    // Vérifier si c'est juste un contact ponctuel ou une vraie intersection
    const area1 = Math.abs(calculatePolygonArea(poly1))
    const area2 = Math.abs(calculatePolygonArea(poly2))
    
    // Calculer l'aire d'intersection approximative
    // Si significative par rapport aux pièces, c'est un vrai chevauchement
    return true // Pour l'instant, tout contact = intersection
  }
  
  return false
}

// Vérifie intersection de segments avec tolérance numérique
function segmentsIntersectStrict(seg1: readonly [Point, Point], seg2: readonly [Point, Point]): boolean {
  const [a1, a2] = seg1
  const [b1, b2] = seg2
  
  const det = (a2.x - a1.x) * (b2.y - b1.y) - (b2.x - b1.x) * (a2.y - a1.y)
  if (Math.abs(det) < CONSTRAINTS.overlap.tolerance) return false
  
  const lambda = ((b2.y - b1.y) * (b2.x - a1.x) + (b1.x - b2.x) * (b2.y - a1.y)) / det
  const gamma = ((a1.y - a2.y) * (b2.x - a1.x) + (a2.x - a1.x) * (b2.y - a1.y)) / det
  
  // Intersection stricte (pas aux extrémités)
  return lambda > CONSTRAINTS.overlap.tolerance && lambda < (1 - CONSTRAINTS.overlap.tolerance) && 
         gamma > CONSTRAINTS.overlap.tolerance && gamma < (1 - CONSTRAINTS.overlap.tolerance)
}

// Calcule l'aire d'un polygone (local pour éviter import)
function calculatePolygonArea(polygon: readonly Point[]): number {
  if (polygon.length < 3) return 0
  
  let area = 0
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length
    area += polygon[i].x * polygon[j].y
    area -= polygon[j].x * polygon[i].y
  }
  
  return area / 2
}

// Calcule la boîte englobante d'un polygone
function getBoundingBox(polygon: readonly Point[]): { min: Point; max: Point } {
  if (polygon.length === 0) {
    return { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } }
  }
  
  let minX = polygon[0].x, maxX = polygon[0].x
  let minY = polygon[0].y, maxY = polygon[0].y
  
  for (let i = 1; i < polygon.length; i++) {
    minX = Math.min(minX, polygon[i].x)
    maxX = Math.max(maxX, polygon[i].x)
    minY = Math.min(minY, polygon[i].y)
    maxY = Math.max(maxY, polygon[i].y)
  }
  
  return {
    min: { x: minX, y: minY },
    max: { x: maxX, y: maxY }
  }
}

// Vérifie auto-intersection d'un polygone
function hasPolygonSelfIntersection(polygon: readonly Point[]): boolean {
  for (let i = 0; i < polygon.length; i++) {
    const a1 = polygon[i]
    const a2 = polygon[(i + 1) % polygon.length]
    
    for (let j = i + 2; j < polygon.length; j++) {
      // Ignorer les arêtes adjacentes
      if (j === polygon.length - 1 && i === 0) continue
      
      const b1 = polygon[j]
      const b2 = polygon[(j + 1) % polygon.length]
      
      if (segmentsIntersectStrict([a1, a2], [b1, b2])) {
        return true
      }
    }
  }
  
  return false
}
}

function calculatePolygonArea(polygon: ReadonlyArray<Point>): number {
  let area = 0
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length
    area += polygon[i].x * polygon[j].y
    area -= polygon[j].x * polygon[i].y
  }
  return Math.abs(area) / 2
}

function doPolygonsOverlap(poly1: ReadonlyArray<Point>, poly2: ReadonlyArray<Point>): boolean {
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

function isPointInPolygon(point: Point, polygon: ReadonlyArray<Point>): boolean {
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

function getArtworkBounds(artwork: Artwork): Bounds {
  const size = artwork.size || [1, 1]
  return {
    minX: artwork.xy[0],
    minY: artwork.xy[1],
    maxX: artwork.xy[0] + size[0],
    maxY: artwork.xy[1] + size[1]
  }
}

function isArtworkInRoom(bounds: Bounds, room: Room): boolean {
  const corners = [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY }
  ]
  
  return corners.every(corner => isPointInPolygon(corner, room.polygon))
}

function findWallForSegment(
  segment: readonly [Point, Point],
  rooms: ReadonlyArray<Room>
): { room: Room; wallIndex: number } | null {
  const midpoint = {
    x: (segment[0].x + segment[1].x) / 2,
    y: (segment[0].y + segment[1].y) / 2
  }
  
  for (const room of rooms) {
    for (let i = 0; i < room.polygon.length; i++) {
      const start = room.polygon[i]
      const end = room.polygon[(i + 1) % room.polygon.length]
      
      const distToWall = distancePointToSegment(midpoint, start, end)
      if (distToWall < VALIDATION.roomOverlapTolerance) {
        return { room, wallIndex: i }
      }
    }
  }
  
  return null
}

function distancePointToSegment(point: Point, start: Point, end: Point): number {
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