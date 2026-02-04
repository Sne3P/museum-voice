/**
 * SERVICE VALIDATION CONSOLIDÉ
 * Toute la logique de validation en un seul endroit
 */

import type { 
  Room, 
  Wall, 
  Artwork, 
  Door, 
  VerticalLink, 
  Floor,
  Point,
  ValidationResult,
  ExtendedValidationResult,
  ValidationContext 
} from '@/core/entities'
import { CONSTRAINTS, ERROR_MESSAGES, VISUAL_FEEDBACK } from '@/core/constants'
import { 
  calculateBounds, 
  calculatePolygonAreaInMeters,
  polygonsOverlap,
  isPointInPolygon,
  segmentsIntersect,
  distanceToSegment
} from './geometry.service'

/**
 * Valide la géométrie d'une pièce
 */
export function validateRoomGeometry(room: Room, context?: ValidationContext): ExtendedValidationResult {
  // 1. Vérifier le nombre minimum de sommets
  if (room.polygon.length < 3) {
    return {
      valid: false,
      severity: 'error',
      code: 'ROOM_INVALID_SHAPE',
      message: ERROR_MESSAGES.room.invalidShape,
      visualFeedback: {
        color: VISUAL_FEEDBACK.colors.invalid,
        opacity: 0.5,
        strokeWidth: 3
      }
    }
  }

  // 1.5. Vérifier pas de points dupliqués dans le même polygone
  if (!checkDuplicatePointsInPolygon(room.polygon)) {
    return {
      valid: false,
      severity: 'error',
      code: 'ROOM_DUPLICATE_POINTS',
      message: 'Deux points de la même pièce ne peuvent pas être au même endroit',
      visualFeedback: {
        color: VISUAL_FEEDBACK.colors.invalid,
        opacity: 0.5,
        strokeWidth: 3
      }
    }
  }

  // 1.6. Vérifier que les segments ne se croisent pas dans le même polygone
  for (let i = 0; i < room.polygon.length; i++) {
    const seg1Start = room.polygon[i]
    const seg1End = room.polygon[(i + 1) % room.polygon.length]
    
    for (let j = i + 2; j < room.polygon.length; j++) {
      // Ne pas vérifier les segments adjacents
      if (j === (i + 1) % room.polygon.length || (j + 1) % room.polygon.length === i) continue
      
      const seg2Start = room.polygon[j]
      const seg2End = room.polygon[(j + 1) % room.polygon.length]
      
      if (checkSegmentIntersection(seg1Start, seg1End, seg2Start, seg2End)) {
        return {
          valid: false,
          severity: 'error',
          code: 'ROOM_SELF_INTERSECTING',
          message: 'Les segments de la pièce ne peuvent pas se croiser',
          visualFeedback: {
            color: VISUAL_FEEDBACK.colors.invalid,
            opacity: 0.5,
            strokeWidth: 3
          }
        }
      }
    }
  }

  // 2. Vérifier la superficie minimum
  const area = calculatePolygonAreaInMeters(room.polygon)
  if (area < CONSTRAINTS.room.minArea) {
    return {
      valid: false,
      severity: 'error',
      code: 'ROOM_TOO_SMALL',
      message: ERROR_MESSAGES.room.tooSmall.replace('{minArea}', CONSTRAINTS.room.minArea.toString()),
      suggestions: ['Agrandissez la pièce', 'Ajoutez plus d\'espace'],
      visualFeedback: {
        color: VISUAL_FEEDBACK.colors.warning,
        opacity: 0.6,
        strokeWidth: 3
      }
    }
  }

  // 3. Vérifier les dimensions
  const bounds = calculateBounds(room.polygon)
  const width = bounds.maxX - bounds.minX
  const height = bounds.maxY - bounds.minY

  if (width < CONSTRAINTS.room.minWidth) {
    return {
      valid: false,
      severity: 'error',
      code: 'ROOM_TOO_NARROW',
      message: ERROR_MESSAGES.room.tooNarrow.replace('{minWidth}', CONSTRAINTS.room.minWidth.toString()),
      suggestions: ['Élargissez la pièce'],
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

  // 4. Vérifier le CHEVAUCHEMENT (surfaces internes) avec d'autres pièces
  // Les pièces peuvent SE TOUCHER (arêtes communes, points communs) mais pas SE CHEVAUCHER
  if (context?.floor) {
    const overlappingRooms = context.floor.rooms.filter(otherRoom => {
      if (otherRoom.id === room.id) return false
      if (context.excludeIds?.includes(otherRoom.id)) return false
      // Utiliser polygonsOverlap au lieu de polygonsIntersect
      // pour permettre le contact mais interdire le chevauchement
      return polygonsOverlap(room.polygon, otherRoom.polygon)
    })

    if (overlappingRooms.length > 0) {
      return {
        valid: false,
        severity: 'error',
        code: 'ROOM_OVERLAPPING',
        message: ERROR_MESSAGES.room.overlapping,
        affectedElements: overlappingRooms.map(r => r.id),
        suggestions: ['Déplacez la pièce', 'Réduisez sa taille', 'Les pièces peuvent se toucher mais pas se chevaucher'],
        visualFeedback: {
          color: VISUAL_FEEDBACK.colors.invalid,
          opacity: 0.5,
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

/**
 * Trouve la pièce contenant un mur (les 2 endpoints doivent être dans la pièce)
 */
/**
 * Valide le placement d'un mur (avec support path multi-points)
 */
export function validateWallPlacement(wall: Wall, context: ValidationContext): ExtendedValidationResult {
  // Utiliser path si disponible, sinon segment
  const points = wall.path || [wall.segment[0], wall.segment[1]]
  
  // 1. Vérifier longueur minimum (distance totale du path)
  let totalLength = 0
  for (let i = 0; i < points.length - 1; i++) {
    totalLength += Math.hypot(
      points[i + 1].x - points[i].x,
      points[i + 1].y - points[i].y
    )
  }

  if (totalLength < CONSTRAINTS.wall.minLength) {
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

  // 2. Vérifier que TOUS les points du mur sont dans UNE pièce
  if (context.floor) {
    let containingRoom = null
    
    // Trouver la pièce qui contient TOUS les points
    for (const room of context.floor.rooms) {
      const allPointsInRoom = points.every(point => 
        isPointInPolygon(point, room.polygon)
      )
      
      if (allPointsInRoom) {
        containingRoom = room
        break
      }
    }

    if (!containingRoom) {
      return {
        valid: false,
        severity: 'error',
        code: 'WALL_OUTSIDE_ROOM',
        message: 'Un ou plusieurs points du mur sont hors d\'une pièce',
        suggestions: ['Déplacez tous les points dans une pièce', 'Créez une pièce d\'abord'],
        visualFeedback: {
          color: VISUAL_FEEDBACK.colors.invalid,
          opacity: 0.5,
          strokeWidth: 4
        }
      }
    }
  }

  // 3. Vérifier l'intersection avec d'autres murs (CHAQUE segment du path)
  if (context.floor) {
    const intersectingWalls = context.floor.walls.filter(otherWall => {
      if (otherWall.id === wall.id) return false
      if (context.excludeIds?.includes(otherWall.id)) return false
      
      const otherPoints = otherWall.path || [otherWall.segment[0], otherWall.segment[1]]
      
      // Vérifier intersection entre CHAQUE segment de ce mur et CHAQUE segment de l'autre mur
      for (let i = 0; i < points.length - 1; i++) {
        const seg1: readonly [Point, Point] = [points[i], points[i + 1]]
        
        for (let j = 0; j < otherPoints.length - 1; j++) {
          const seg2: readonly [Point, Point] = [otherPoints[j], otherPoints[j + 1]]
          
          if (segmentsIntersect(seg1, seg2)) {
            return true
          }
        }
      }
      
      return false
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

/**
 * Valide le placement d'une œuvre
 */
export function validateArtworkPlacement(artwork: Artwork, context: ValidationContext): ExtendedValidationResult {
  const [x, y] = artwork.xy
  const point = { x, y }

  // 1. Vérifier taille minimum si spécifiée
  if (artwork.size) {
    const [width, height] = artwork.size
    if (width < CONSTRAINTS.artwork.minWidth || height < CONSTRAINTS.artwork.minHeight) {
      return {
        valid: false,
        severity: 'error',
        code: 'ARTWORK_TOO_SMALL',
        message: ERROR_MESSAGES.artwork.tooSmall
          .replace('{minWidth}', CONSTRAINTS.artwork.minWidth.toString())
          .replace('{minHeight}', CONSTRAINTS.artwork.minHeight.toString()),
        visualFeedback: {
          color: VISUAL_FEEDBACK.colors.invalid,
          opacity: 0.5,
          strokeWidth: 3
        }
      }
    }
  }

  // 2. Vérifier que TOUS les coins de l'œuvre sont dans une pièce
  if (context.floor) {
    const size = artwork.size || [1, 1]
    const corners = [
      { x: artwork.xy[0], y: artwork.xy[1] },
      { x: artwork.xy[0] + size[0], y: artwork.xy[1] },
      { x: artwork.xy[0] + size[0], y: artwork.xy[1] + size[1] },
      { x: artwork.xy[0], y: artwork.xy[1] + size[1] }
    ]

    let containingRoom = null
    for (const room of context.floor.rooms) {
      const allCornersInRoom = corners.every(corner => isPointInPolygon(corner, room.polygon))
      if (allCornersInRoom) {
        containingRoom = room
        break
      }
    }

    if (!containingRoom) {
      return {
        valid: false,
        severity: 'error',
        code: 'ARTWORK_OUTSIDE_ROOM',
        message: ERROR_MESSAGES.artwork.outsideRoom,
        suggestions: ['Placez l\'œuvre entièrement dans une pièce', 'Créez une pièce d\'abord'],
        visualFeedback: {
          color: VISUAL_FEEDBACK.colors.invalid,
          opacity: 0.5,
          strokeWidth: 3
        }
      }
    }

    // 3. Vérifier le chevauchement avec d'autres œuvres
    // EXCEPTION: Autoriser les œuvres avec le MÊME zoneId (zones multi-œuvres)
    const overlappingArtworks = context.floor.artworks.filter(otherArtwork => {
      if (otherArtwork.id === artwork.id) return false
      if (context.excludeIds?.includes(otherArtwork.id)) return false

      // ZONE MULTI-ŒUVRES: Si même zoneId, c'est autorisé (œuvres de la même zone)
      if (artwork.zoneId && otherArtwork.zoneId && artwork.zoneId === otherArtwork.zoneId) {
        return false  // Pas un chevauchement interdit
      }

      const otherSize = otherArtwork.size || [1, 1]
      const [ax, ay] = artwork.xy
      const [aWidth, aHeight] = size
      const [ox, oy] = otherArtwork.xy
      const [oWidth, oHeight] = otherSize

      // Vérifier chevauchement (pas juste contact)
      return !(ax >= ox + oWidth || 
               ax + aWidth <= ox || 
               ay >= oy + oHeight || 
               ay + aHeight <= oy)
    })

    if (overlappingArtworks.length > 0) {
      return {
        valid: false,
        severity: 'error',
        code: 'ARTWORK_OVERLAPPING',
        message: 'L\'œuvre chevauche une autre œuvre',
        affectedElements: overlappingArtworks.map(a => a.id),
        suggestions: ['Déplacez l\'œuvre', 'Les œuvres peuvent se toucher mais pas se chevaucher'],
        visualFeedback: {
          color: VISUAL_FEEDBACK.colors.invalid,
          opacity: 0.5,
          strokeWidth: 3,
          highlight: true
        }
      }
    }
  }

  return {
    valid: true,
    severity: 'info',
    code: 'ARTWORK_VALID',
    message: 'Œuvre valide',
    visualFeedback: {
      color: VISUAL_FEEDBACK.colors.valid,
      opacity: 1.0,
      strokeWidth: 2
    }
  }
}

/**
 * Valide une porte
 */
export function validateDoor(door: Door, context: ValidationContext): ValidationResult {
  if (door.width < CONSTRAINTS.door.minWidth || door.width > CONSTRAINTS.door.maxWidth) {
    return {
      valid: false,
      message: `La porte doit avoir une largeur entre ${CONSTRAINTS.door.minWidth} et ${CONSTRAINTS.door.maxWidth} unités`
    }
  }

  return { valid: true }
}

/**
 * Valide un lien vertical
 */
export function validateVerticalLink(link: VerticalLink, context: ValidationContext): ValidationResult {
  const width = link.size[0]
  const height = link.size[1]
  const minWidth = CONSTRAINTS.verticalLink.minSize[0]
  const maxWidth = CONSTRAINTS.verticalLink.maxSize[0]
  const minHeight = CONSTRAINTS.verticalLink.minSize[1]
  const maxHeight = CONSTRAINTS.verticalLink.maxSize[1]
  
  if (width < minWidth || width > maxWidth) {
    return {
      valid: false,
      message: `Le lien doit avoir une largeur entre ${minWidth} et ${maxWidth} unités`
    }
  }
  
  if (height < minHeight || height > maxHeight) {
    return {
      valid: false,
      message: `Le lien doit avoir une hauteur entre ${minHeight} et ${maxHeight} unités`
    }
  }

  return { valid: true }
}
/**
 * VALIDATION STRICTE: Vérifie qu'aucun point ne se chevauche dans la même forme
 * (Important pour empêcher l'ajout/division de points invalid)
 */
export function checkDuplicatePointsInPolygon(polygon: ReadonlyArray<{ x: number; y: number }>): boolean {
  // Points en PIXELS snappés au grid (40px)
  // Tolérance : 1 pixel (bien en dessous de la demi-grille 20px)
  const tolerance = 1
  
  for (let i = 0; i < polygon.length; i++) {
    for (let j = i + 1; j < polygon.length; j++) {
      const dx = polygon[i].x - polygon[j].x
      const dy = polygon[i].y - polygon[j].y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      // Si deux points sont trop proches, c'est un doublon
      if (distance < tolerance) {
        return false // Points dupliqués détectés
      }
    }
  }
  
  return true // Tous les points sont distincts
}

/**
 * VALIDATION STRICTE: Vérifie qu'une polyligne reste valide après modification
 * (Au minimum 3 points, pas de points dupliqués, forme valide)
 */
export function validatePolygonIntegrity(polygon: ReadonlyArray<{ x: number; y: number }>): { valid: boolean; reason?: string } {
  // Vérifier le nombre minimum de points
  if (polygon.length < 3) {
    return { valid: false, reason: 'Le polygone doit avoir au moins 3 points' }
  }
  
  // Vérifier pas de points dupliqués
  if (!checkDuplicatePointsInPolygon(polygon)) {
    return { valid: false, reason: 'Deux points ne peuvent pas être au même endroit' }
  }
  
  return { valid: true }
}

/**
 * VALIDATION STRICTE: Vérifie que deux segments ne se croisent pas
 */
export function checkSegmentIntersection(
  seg1Start: { x: number; y: number },
  seg1End: { x: number; y: number },
  seg2Start: { x: number; y: number },
  seg2End: { x: number; y: number }
): boolean {
  // Si les segments partagent un point, c'est autorisé (adjacents)
  const shareStart = seg1Start.x === seg2Start.x && seg1Start.y === seg2Start.y
  const shareEnd = seg1Start.x === seg2End.x && seg1Start.y === seg2End.y
  const shareCross1 = seg1End.x === seg2Start.x && seg1End.y === seg2Start.y
  const shareCross2 = seg1End.x === seg2End.x && seg1End.y === seg2End.y
  
  if (shareStart || shareEnd || shareCross1 || shareCross2) {
    return false // Pas d'intersection (juste adjacents)
  }
  
  // Utiliser la fonction existante pour vérifier l'intersection
  // segmentsIntersect attend des tuples [Point, Point]
  return segmentsIntersect([seg1Start, seg1End] as const, [seg2Start, seg2End] as const)
}

/**
 * VALIDATION STRICTE: Vérifie que l'ajout d'un point ne crée pas de crossing avec les segments existants
 */
export function validatePointAddition(polygon: ReadonlyArray<{ x: number; y: number }>, newPoint: { x: number; y: number }, insertIndex: number): { valid: boolean; reason?: string } {
  // Créer le nouveau polygone avec le point ajouté
  const newPolygon = [
    ...polygon.slice(0, insertIndex),
    newPoint,
    ...polygon.slice(insertIndex)
  ]
  
  // Vérifier l'intégrité
  const integrityCheck = validatePolygonIntegrity(newPolygon)
  if (!integrityCheck.valid) {
    return integrityCheck
  }
  
  // Vérifier que les nouveaux segments ne croisent pas les anciens
  const prevIndex = (insertIndex - 1 + polygon.length) % polygon.length
  const nextIndex = insertIndex % polygon.length
  
  const newSeg1 = { start: polygon[prevIndex], end: newPoint }
  const newSeg2 = { start: newPoint, end: polygon[nextIndex] }
  
  // Vérifier contre tous les autres segments
  for (let i = 0; i < polygon.length; i++) {
    const segStart = polygon[i]
    const segEnd = polygon[(i + 1) % polygon.length]
    
    // Ignorer les segments adjacents au point inséré
    if (i === prevIndex || i === nextIndex || (i + 1) % polygon.length === insertIndex) {
      continue
    }
    
    if (checkSegmentIntersection(newSeg1.start, newSeg1.end, segStart, segEnd)) {
      return { valid: false, reason: 'Le nouveau segment croiserait un segment existant' }
    }
    
    if (checkSegmentIntersection(newSeg2.start, newSeg2.end, segStart, segEnd)) {
      return { valid: false, reason: 'Le nouveau segment croiserait un segment existant' }
    }
  }
  
  return { valid: true }
}

/**
 * VALIDATION STRICTE: Vérifie qu'on ne peut pas supprimer un point sans invalider la forme
 */
export function validatePointRemoval(polygon: ReadonlyArray<{ x: number; y: number }>, removeIndex: number): { valid: boolean; reason?: string } {
  // Une forme valide doit avoir au minimum 3 points
  if (polygon.length <= 3) {
    return { valid: false, reason: 'Une forme doit avoir au minimum 3 points' }
  }
  
  // Créer le polygone sans le point
  const newPolygon = polygon.filter((_, i) => i !== removeIndex)
  
  // Vérifier l'intégrité
  const integrityCheck = validatePolygonIntegrity(newPolygon)
  if (!integrityCheck.valid) {
    return integrityCheck
  }
  
  return { valid: true }
}