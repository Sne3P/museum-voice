import type { Point, Room, Artwork, Door, VerticalLink, ValidationResult, Floor, Wall } from './types'
import { CONSTRAINTS, ERROR_MESSAGES, VISUAL_FEEDBACK } from './constants'
import { polygonsIntersect } from './geometry'
import { findRoomContainingSegment, findRoomContainingPoint } from './walls'

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
  
  // 3. Contraintes de taille minimum - STRICT
  const area = Math.abs(calculatePolygonArea(polygon))
  if (area < CONSTRAINTS.room.minArea) {
    return {
      valid: false,
      severity: 'error',
      code: 'ROOM_TOO_SMALL_AREA',
      message: ERROR_MESSAGES.room.tooSmall.replace('{minArea}', CONSTRAINTS.room.minArea.toString()),
      suggestions: ['Agrandissez la pièce', 'Vérifiez que les dimensions sont correctes'],
      visualFeedback: {
        color: VISUAL_FEEDBACK.colors.warning,
        opacity: 0.5,
        strokeWidth: 3
      }
    }
  }
  
  // 4. Vérifier dimensions minimum (largeur/hauteur)
  const bounds = getBoundingBox(polygon)
  const width = bounds.max.x - bounds.min.x
  const height = bounds.max.y - bounds.min.y
  
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

// === VALIDATION STRICTE PLACEMENT PIÈCE (pour canvas) ===
export function validateRoomPlacementStrict(
  roomToValidate: Room,
  newPolygon: Point[],
  floor: Floor
): ValidationResult {
  // Validation géométrique de base
  const geometryResult = validateRoomGeometry(
    { ...roomToValidate, polygon: newPolygon },
    { floor, excludeIds: [roomToValidate.id] }
  )
  
  if (!geometryResult.valid) {
    return {
      valid: false,
      message: geometryResult.message,
      suggestions: geometryResult.suggestions
    }
  }
  
  return { valid: true }
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
export function validateWallPlacementStrict(wall: Wall, floor: Floor): ValidationResult {
  // 1. Vérifier longueur minimum
  const length = Math.hypot(
    wall.segment[1].x - wall.segment[0].x,
    wall.segment[1].y - wall.segment[0].y
  )
  
  if (length < CONSTRAINTS.wall.minLength) {
    return {
      valid: false,
      message: ERROR_MESSAGES.wall.tooShort.replace('{minLength}', CONSTRAINTS.wall.minLength.toString()),
      suggestions: ['Allongez le mur', 'Repositionnez les extrémités']
    }
  }
  
  // 2. Vérifier que le segment entier est dans UNE SEULE pièce
  const containingRoom = findRoomContainingSegment(wall.segment[0], wall.segment[1], floor)
  
  if (!containingRoom) {
    return {
      valid: false,
      message: ERROR_MESSAGES.wall.outsideRoom,
      suggestions: ['Placez le mur entièrement dans une pièce', 'Ajustez les extrémités']
    }
  }
  
  // 3. Vérifier intersections avec autres murs
  const intersectingWalls = floor.walls.filter(otherWall => {
    if (otherWall.id === wall.id) return false
    return segmentsIntersectStrict(wall.segment, otherWall.segment)
  })
  
  if (intersectingWalls.length > 0) {
    return {
      valid: false,
      message: ERROR_MESSAGES.wall.intersectsOther,
      suggestions: ['Repositionnez le mur', 'Évitez les croisements']
    }
  }
  
  return { valid: true }
}

// === FONCTIONS DE COMPATIBILITÉ (anciennes) ===
export function validateRoom(room: Room): ValidationResult {
  const result = validateRoomGeometry(room)
  return {
    valid: result.valid,
    message: result.message,
    suggestions: result.suggestions
  }
}

export function validateArtwork(artwork: Artwork, rooms: readonly Room[]): ValidationResult {
  const mockFloor: Floor = {
    id: 'mock',
    name: 'mock',
    rooms: [...rooms],
    walls: [],
    doors: [],
    verticalLinks: [],
    artworks: [],
    escalators: [],
    elevators: []
  }
  
  const result = validateArtworkPlacement(artwork, { floor: mockFloor })
  return {
    valid: result.valid,
    message: result.message,
    suggestions: result.suggestions
  }
}

export function validateDoor(door: Door): ValidationResult {
  if (door.width < CONSTRAINTS.door.minWidth) {
    return {
      valid: false,
      message: `Porte trop étroite (minimum: ${CONSTRAINTS.door.minWidth} unités)`,
      suggestions: ['Augmentez la largeur de la porte']
    }
  }
  
  if (door.width > CONSTRAINTS.door.maxWidth) {
    return {
      valid: false,
      message: `Porte trop large (maximum: ${CONSTRAINTS.door.maxWidth} unités)`,
      suggestions: ['Réduisez la largeur de la porte']
    }
  }
  
  return { valid: true }
}

export function validateVerticalLink(link: VerticalLink): ValidationResult {
  if (link.width < CONSTRAINTS.verticalLink.minWidth) {
    return {
      valid: false,
      message: `${link.type} trop étroit (minimum: ${CONSTRAINTS.verticalLink.minWidth} unités)`,
      suggestions: ['Augmentez la largeur']
    }
  }
  
  if (link.width > CONSTRAINTS.verticalLink.maxWidth) {
    return {
      valid: false,
      message: `${link.type} trop large (maximum: ${CONSTRAINTS.verticalLink.maxWidth} unités)`,
      suggestions: ['Réduisez la largeur']
    }
  }
  
  return { valid: true }
}

// === FONCTIONS UTILITAIRES STRICTES ===

// Vérifie les intersections de polygones avec tolérance ultra-faible
function doPolygonsIntersectStrict(poly1: readonly Point[], poly2: readonly Point[]): boolean {
  return polygonsIntersect(poly1, poly2)
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

// Calcule l'aire d'un polygone
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

// Calcule les limites d'une œuvre d'art
function getArtworkBounds(artwork: Artwork): { min: Point; max: Point } {
  const [width, height] = artwork.size || [1, 1]
  return {
    min: { x: artwork.xy[0], y: artwork.xy[1] },
    max: { x: artwork.xy[0] + width, y: artwork.xy[1] + height }
  }
}

// Vérifie si une œuvre est dans une pièce
function isArtworkInRoom(artworkBounds: { min: Point; max: Point }, room: Room): boolean {
  // Tous les coins de l'œuvre doivent être dans la pièce
  const corners = [
    artworkBounds.min,
    { x: artworkBounds.max.x, y: artworkBounds.min.y },
    artworkBounds.max,
    { x: artworkBounds.min.x, y: artworkBounds.max.y }
  ]
  
  return corners.every(corner => isPointInPolygon(corner, room.polygon))
}

// Test point dans polygone (local)
function isPointInPolygon(point: Point, polygon: readonly Point[]): boolean {
  if (polygon.length < 3) return false
  
  let inside = false
  const { x, y } = point
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y
    
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  
  return inside
}