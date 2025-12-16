/**
 * Système de gestion des murs pour l'éditeur de plan de musée
 * Gère la création, placement et contraintes des murs intérieurs
 */

import type { Point, Wall, Room, Floor } from './types'
import { GRID_SIZE } from './constants'
import { v4 as uuidv4 } from 'uuid'
import { isPointInPolygon, distanceToSegment, segmentsIntersect } from './geometry'

// Épaisseur standard des murs (en unités de grille)
export const WALL_THICKNESS = {
  INTERIOR: 0.15,    // Murs intérieurs fins
  EXTERIOR: 0.25,    // Murs extérieurs plus épais
  LOAD_BEARING: 0.3  // Murs porteurs
}

// Crée un nouveau mur
export function createWall(
  start: Point,
  end: Point,
  thickness: number = WALL_THICKNESS.INTERIOR,
  roomId?: string,
  isLoadBearing: boolean = false
): Wall {
  return {
    id: uuidv4(),
    segment: [start, end],
    thickness,
    roomId,
    isLoadBearing
  }
}

// Crée un nouveau mur avec détection automatique de la pièce
export function createWallInRoom(
  start: Point,
  end: Point,
  floor: Floor,
  thickness: number = WALL_THICKNESS.INTERIOR,
  isLoadBearing: boolean = false
): Wall | null {
  const room = findRoomContainingSegment(start, end, floor)
  if (!room) {
    return null
  }
  
  return {
    id: uuidv4(),
    segment: [start, end],
    thickness,
    roomId: room.id,
    isLoadBearing
  }
}

// Trouve la pièce qui contient un point
export function findRoomContainingPoint(point: Point, floor: Floor): Room | null {
  return floor.rooms.find(room => isPointInPolygonWithBorder(point, room.polygon)) || null
}

// Trouve la pièce qui contient un segment entier (les deux extrémités et des points intermédiaires)
export function findRoomContainingSegment(start: Point, end: Point, floor: Floor): Room | null {
  const room = findRoomContainingPoint(start, floor)
  if (!room || !isPointInPolygonWithBorder(end, room.polygon)) {
    return null
  }
  
  // Vérifier quelques points intermédiaires pour s'assurer que le segment ne sort pas de la pièce
  // Utiliser moins de points de contrôle pour les segments courts (typiquement sur les bords)
  const segmentLength = Math.hypot(end.x - start.x, end.y - start.y)
  const steps = Math.max(3, Math.min(8, Math.floor(segmentLength * 2))) // Adaptatif selon la longueur
  
  for (let i = 1; i < steps; i++) {
    const t = i / steps
    const intermediate = {
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t
    }
    if (!isPointInPolygonWithBorder(intermediate, room.polygon)) {
      return null
    }
  }
  
  return room
}

// Trouve les éléments (portes, liens, escaliers) attachés à un mur intérieur
export function findElementsAttachedToWall(
  wall: Wall,
  floor: Floor
): Array<{ type: 'door' | 'verticalLink'; id: string; element: any }> {
  const attachedElements: Array<{ type: 'door' | 'verticalLink'; id: string; element: any }> = []
  const tolerance = 0.2 // Tolérance pour considérer qu'un élément est attaché au mur

  // Vérifier les portes
  floor.doors.forEach(door => {
    const doorMidpoint = {
      x: (door.segment[0].x + door.segment[1].x) / 2,
      y: (door.segment[0].y + door.segment[1].y) / 2
    }
    
    const distanceToWall = distanceToSegment(doorMidpoint, wall.segment[0], wall.segment[1])
    if (distanceToWall <= tolerance) {
      attachedElements.push({ type: 'door', id: door.id, element: door })
    }
  })

  // Vérifier les liens verticaux (escaliers, ascenseurs)
  floor.verticalLinks.forEach(link => {
    const linkMidpoint = {
      x: (link.segment[0].x + link.segment[1].x) / 2,
      y: (link.segment[0].y + link.segment[1].y) / 2
    }
    
    const distanceToWall = distanceToSegment(linkMidpoint, wall.segment[0], wall.segment[1])
    if (distanceToWall <= tolerance) {
      attachedElements.push({ type: 'verticalLink', id: link.id, element: link })
    }
  })

  return attachedElements
}



// Trouve le point de snap le plus proche sur les murs de pièce
export function findRoomWallSnapPoint(
  point: Point,
  floor: Floor,
  snapDistance: number = 0.4
): { snapPoint: Point; roomId: string; segmentIndex: number } | null {
  let closestSnap: { snapPoint: Point; roomId: string; segmentIndex: number; distance: number } | null = null

  floor.rooms.forEach(room => {
    // D'abord vérifier la proximité directe aux vertices
    room.polygon.forEach((vertex, index) => {
      const distance = Math.hypot(point.x - vertex.x, point.y - vertex.y)
      
      if (distance <= snapDistance && (!closestSnap || distance < closestSnap.distance)) {
        closestSnap = {
          snapPoint: vertex,
          roomId: room.id,
          segmentIndex: index,
          distance
        }
      }
    })

    // Ensuite vérifier les projections sur les segments (toute la longueur)
    room.polygon.forEach((vertex, index) => {
      const nextIndex = (index + 1) % room.polygon.length
      const segmentStart = vertex
      const segmentEnd = room.polygon[nextIndex]

      // Projeter le point sur le segment
      const dx = segmentEnd.x - segmentStart.x
      const dy = segmentEnd.y - segmentStart.y
      const lengthSquared = dx * dx + dy * dy

      if (lengthSquared === 0) return // Segment de longueur nulle

      const t = Math.max(0, Math.min(1, 
        ((point.x - segmentStart.x) * dx + (point.y - segmentStart.y) * dy) / lengthSquared
      ))

      const projectedPoint = {
        x: segmentStart.x + t * dx,
        y: segmentStart.y + t * dy
      }

      const distance = Math.hypot(point.x - projectedPoint.x, point.y - projectedPoint.y)

      // Si la projection n'est pas trop proche d'un vertex déjà détecté
      const tooCloseToVertex = room.polygon.some(v => {
        const vertexDist = Math.hypot(projectedPoint.x - v.x, projectedPoint.y - v.y)
        return vertexDist < 0.01 // Réduire la tolérance pour permettre plus de snap près des bords
      })

      if (!tooCloseToVertex && distance <= snapDistance && (!closestSnap || distance < closestSnap.distance)) {
        closestSnap = {
          snapPoint: projectedPoint,
          roomId: room.id,
          segmentIndex: index,
          distance
        }
      }
    })
  })

  if (closestSnap) {
    const snap = closestSnap as { snapPoint: Point; roomId: string; segmentIndex: number; distance: number }
    return {
      snapPoint: snap.snapPoint,
      roomId: snap.roomId,
      segmentIndex: snap.segmentIndex
    }
  }
  
  return null
}

// Vérifie si un point est dans un polygone ou sur ses bords (ray casting algorithm amélioré)
function isPointInPolygonWithBorder(point: Point, polygon: readonly Point[]): boolean {
  if (polygon.length < 3) return false
  
  const { x, y } = point
  const epsilon = 1e-9 // Tolérance pour les calculs de précision
  
  // D'abord vérifier si le point est sur un bord du polygone
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length
    
    // Vérifier si le point est sur le segment [i,j]
    const dist = distanceToSegment(point, polygon[i], polygon[j])
    if (dist < epsilon) {
      return true // Point sur la frontière = considéré comme à l'intérieur
    }
  }
  
  // Si pas sur la frontière, utiliser l'algorithme ray casting standard
  let inside = false
  
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

// Trouve tous les murs qui intersectent avec un segment
export function findIntersectingWalls(
  segment: readonly [Point, Point],
  walls: readonly Wall[]
): Wall[] {
  return walls.filter(wall => segmentArraysIntersect(segment, wall.segment))
}

// Vérifie si deux segments se croisent
function segmentArraysIntersect(
  seg1: readonly [Point, Point],
  seg2: readonly [Point, Point]
): boolean {
  const [p1, p2] = seg1
  const [p3, p4] = seg2
  
  const d1 = direction(p3, p4, p1)
  const d2 = direction(p3, p4, p2)
  const d3 = direction(p1, p2, p3)
  const d4 = direction(p1, p2, p4)
  
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
         ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
}

function direction(p1: Point, p2: Point, p3: Point): number {
  return (p3.x - p1.x) * (p2.y - p1.y) - (p2.x - p1.x) * (p3.y - p1.y)
}

// Valide qu'un mur peut être placé
export function validateWallPlacement(
  wall: Wall,
  floor: Floor
): { valid: boolean; message?: string; roomId?: string } {
  // Vérifier la longueur minimale
  const length = Math.hypot(
    wall.segment[1].x - wall.segment[0].x,
    wall.segment[1].y - wall.segment[0].y
  )
  
  if (length < 0.5) {
    return { valid: false, message: "Le mur est trop court (minimum 0.5 unités)" }
  }
  
  // Vérifier que le segment entier est dans une pièce
  const room = findRoomContainingSegment(wall.segment[0], wall.segment[1], floor)
  if (!room) {
    return { valid: false, message: "Le mur doit être entièrement à l'intérieur d'une pièce" }
  }
  
  // Si un roomId est spécifié, vérifier qu'il correspond à la pièce détectée
  if (wall.roomId && wall.roomId !== room.id) {
    return { valid: false, message: "Le mur ne peut pas sortir de sa pièce d'origine" }
  }
  
  return { valid: true, roomId: room.id }
}

// Trouve les points d'accrochage le long des murs existants
export function findWallSnapPoints(
  point: Point,
  walls: readonly Wall[],
  snapDistance: number = 0.3
): Point[] {
  const snapPoints: Point[] = []
  
  walls.forEach(wall => {
    // Points de début et fin
    const startDist = Math.hypot(point.x - wall.segment[0].x, point.y - wall.segment[0].y)
    const endDist = Math.hypot(point.x - wall.segment[1].x, point.y - wall.segment[1].y)
    
    if (startDist <= snapDistance) {
      snapPoints.push(wall.segment[0])
    }
    if (endDist <= snapDistance) {
      snapPoints.push(wall.segment[1])
    }
    
    // Point le plus proche sur le segment
    const closestPoint = getClosestPointOnSegment(point, wall.segment[0], wall.segment[1])
    const distToSegment = Math.hypot(point.x - closestPoint.x, point.y - closestPoint.y)
    
    if (distToSegment <= snapDistance) {
      snapPoints.push(closestPoint)
    }
  })
  
  return snapPoints
}

// Trouve le point le plus proche sur un segment
function getClosestPointOnSegment(point: Point, segStart: Point, segEnd: Point): Point {
  const dx = segEnd.x - segStart.x
  const dy = segEnd.y - segStart.y
  const length = Math.hypot(dx, dy)
  
  if (length === 0) return segStart
  
  const t = Math.max(0, Math.min(1, 
    ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / (length * length)
  ))
  
  return {
    x: segStart.x + t * dx,
    y: segStart.y + t * dy
  }
}

// Génère automatiquement des murs pour diviser une pièce
export function generateRoomDivision(
  room: Room,
  divisionType: 'horizontal' | 'vertical' | 'cross'
): Wall[] {
  const bounds = getRoomBounds(room)
  const walls: Wall[] = []
  
  switch (divisionType) {
    case 'horizontal':
      const midY = (bounds.minY + bounds.maxY) / 2
      walls.push(createWall(
        { x: bounds.minX, y: midY },
        { x: bounds.maxX, y: midY },
        WALL_THICKNESS.INTERIOR,
        room.id
      ))
      break
      
    case 'vertical':
      const midX = (bounds.minX + bounds.maxX) / 2
      walls.push(createWall(
        { x: midX, y: bounds.minY },
        { x: midX, y: bounds.maxY },
        WALL_THICKNESS.INTERIOR,
        room.id
      ))
      break
      
    case 'cross':
      const centerX = (bounds.minX + bounds.maxX) / 2
      const centerY = (bounds.minY + bounds.maxY) / 2
      
      walls.push(
        createWall(
          { x: bounds.minX, y: centerY },
          { x: bounds.maxX, y: centerY },
          WALL_THICKNESS.INTERIOR,
          room.id
        ),
        createWall(
          { x: centerX, y: bounds.minY },
          { x: centerX, y: bounds.maxY },
          WALL_THICKNESS.INTERIOR,
          room.id
        )
      )
      break
  }
  
  return walls
}

// Calcule les limites d'une pièce
function getRoomBounds(room: Room): { minX: number; minY: number; maxX: number; maxY: number } {
  if (room.polygon.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  }
  
  let minX = room.polygon[0].x
  let maxX = room.polygon[0].x
  let minY = room.polygon[0].y
  let maxY = room.polygon[0].y
  
  room.polygon.forEach(point => {
    minX = Math.min(minX, point.x)
    maxX = Math.max(maxX, point.x)
    minY = Math.min(minY, point.y)
    maxY = Math.max(maxY, point.y)
  })
  
  return { minX, minY, maxX, maxY }
}

// Met à jour les murs attachés à une pièce quand elle change de forme
export function updateWallsAttachedToRoom(
  oldRoom: Room, 
  newRoom: Room, 
  floor: Floor
): { updatedWalls: Wall[], invalidWalls: string[] } {
  const updatedWalls: Wall[] = []
  const invalidWalls: string[] = []
  
  floor.walls.forEach(wall => {
    if (wall.roomId !== oldRoom.id) {
      updatedWalls.push(wall)
      return
    }
    
    // Vérifier si le mur était snappé sur l'ancien mur de pièce
    const [startPoint, endPoint] = wall.segment
    let newStartPoint = startPoint
    let newEndPoint = endPoint
    let wallMoved = false
    
    // Pour chaque point du mur, vérifier s'il était snappé sur un segment de l'ancienne pièce
    const tolerance = 0.1
    
    // Vérifier le point de départ
    oldRoom.polygon.forEach((vertex, index) => {
      const nextIndex = (index + 1) % oldRoom.polygon.length
      const oldSegmentStart = vertex
      const oldSegmentEnd = oldRoom.polygon[nextIndex]
      
      const distance = distanceToSegment(startPoint, oldSegmentStart, oldSegmentEnd)
      if (distance <= tolerance) {
        // Ce point était snappé sur ce segment - le projeter sur le nouveau segment correspondant
        if (index < newRoom.polygon.length) {
          const newSegmentStart = newRoom.polygon[index]
          const newSegmentEnd = newRoom.polygon[(index + 1) % newRoom.polygon.length]
          
          // Calculer la position relative sur l'ancien segment
          const oldDx = oldSegmentEnd.x - oldSegmentStart.x
          const oldDy = oldSegmentEnd.y - oldSegmentStart.y
          const oldLength = Math.hypot(oldDx, oldDy)
          
          if (oldLength > 0) {
            const t = Math.max(0, Math.min(1, 
              ((startPoint.x - oldSegmentStart.x) * oldDx + (startPoint.y - oldSegmentStart.y) * oldDy) / (oldLength * oldLength)
            ))
            
            // Appliquer la même position relative sur le nouveau segment
            const newDx = newSegmentEnd.x - newSegmentStart.x
            const newDy = newSegmentEnd.y - newSegmentStart.y
            
            newStartPoint = {
              x: newSegmentStart.x + t * newDx,
              y: newSegmentStart.y + t * newDy
            }
            wallMoved = true
          }
        }
      }
    })
    
    // Vérifier le point de fin
    oldRoom.polygon.forEach((vertex, index) => {
      const nextIndex = (index + 1) % oldRoom.polygon.length
      const oldSegmentStart = vertex
      const oldSegmentEnd = oldRoom.polygon[nextIndex]
      
      const distance = distanceToSegment(endPoint, oldSegmentStart, oldSegmentEnd)
      if (distance <= tolerance) {
        // Ce point était snappé sur ce segment
        if (index < newRoom.polygon.length) {
          const newSegmentStart = newRoom.polygon[index]
          const newSegmentEnd = newRoom.polygon[(index + 1) % newRoom.polygon.length]
          
          const oldDx = oldSegmentEnd.x - oldSegmentStart.x
          const oldDy = oldSegmentEnd.y - oldSegmentStart.y
          const oldLength = Math.hypot(oldDx, oldDy)
          
          if (oldLength > 0) {
            const t = Math.max(0, Math.min(1, 
              ((endPoint.x - oldSegmentStart.x) * oldDx + (endPoint.y - oldSegmentStart.y) * oldDy) / (oldLength * oldLength)
            ))
            
            const newDx = newSegmentEnd.x - newSegmentStart.x
            const newDy = newSegmentEnd.y - newSegmentStart.y
            
            newEndPoint = {
              x: newSegmentStart.x + t * newDx,
              y: newSegmentStart.y + t * newDy
            }
            wallMoved = true
          }
        }
      }
    })
    
    // Créer le mur mis à jour
    const updatedWall: Wall = {
      ...wall,
      segment: [newStartPoint, newEndPoint]
    }
    
    // Vérifier si le mur mis à jour est toujours valide
    const isStillInRoom = findRoomContainingSegment(newStartPoint, newEndPoint, { ...floor, rooms: [newRoom] })
    const hasSnapPoints = wallMoved // Si le mur a bougé, c'est qu'il était snappé
    
    if (isStillInRoom || hasSnapPoints) {
      // Validation complète
      const validation = validateWallPlacement(updatedWall, { ...floor, rooms: [newRoom], walls: [] })
      if (validation.valid) {
        updatedWalls.push(updatedWall)
      } else {
        invalidWalls.push(wall.id)
      }
    } else {
      invalidWalls.push(wall.id)
    }
  })
  
  return { updatedWalls, invalidWalls }
}

/**
 * SYSTÈME DE GLISSEMENT D'ÉLÉMENTS SUR MURS
 * Permet aux portes et escaliers de coulisser le long de leur mur parent
 */

// Projette un point sur un segment de mur en respectant les contraintes
export function projectPointOnWallSegment(
  point: Point,
  wallSegment: readonly [Point, Point],
  elementWidth: number,
  minClearance: number = 0.1
): Point | null {
  const [start, end] = wallSegment
  
  // Vecteur du mur
  const wallVector = {
    x: end.x - start.x,
    y: end.y - start.y
  }
  
  // Longueur du mur
  const wallLength = Math.hypot(wallVector.x, wallVector.y)
  
  // Vérifier que l'élément peut tenir sur le mur
  if (elementWidth + 2 * minClearance > wallLength) {
    return null // Élément trop grand pour ce mur
  }
  
  // Vecteur unitaire du mur
  const wallUnit = {
    x: wallVector.x / wallLength,
    y: wallVector.y / wallLength
  }
  
  // Vecteur du début du mur au point
  const toPoint = {
    x: point.x - start.x,
    y: point.y - start.y
  }
  
  // Projection scalaire
  let t = toPoint.x * wallUnit.x + toPoint.y * wallUnit.y
  
  // Contraindre dans les limites du mur avec clearance
  const minT = minClearance + elementWidth / 2
  const maxT = wallLength - minClearance - elementWidth / 2
  
  t = Math.max(minT, Math.min(maxT, t))
  
  // Point projeté
  return {
    x: start.x + t * wallUnit.x,
    y: start.y + t * wallUnit.y
  }
}

// Calcule les points de début et fin d'un élément centré sur une position
export function calculateElementSegmentOnWall(
  centerPoint: Point,
  wallSegment: readonly [Point, Point],
  elementWidth: number
): [Point, Point] | null {
  const [start, end] = wallSegment
  
  // Vecteur du mur
  const wallVector = {
    x: end.x - start.x,
    y: end.y - start.y
  }
  
  // Longueur du mur
  const wallLength = Math.hypot(wallVector.x, wallVector.y)
  
  if (wallLength === 0) return null
  
  // Vecteur unitaire du mur
  const wallUnit = {
    x: wallVector.x / wallLength,
    y: wallVector.y / wallLength
  }
  
  // Demi-largeur de l'élément
  const halfWidth = elementWidth / 2
  
  // Points de début et fin de l'élément
  const elementStart = {
    x: centerPoint.x - halfWidth * wallUnit.x,
    y: centerPoint.y - halfWidth * wallUnit.y
  }
  
  const elementEnd = {
    x: centerPoint.x + halfWidth * wallUnit.x,
    y: centerPoint.y + halfWidth * wallUnit.y
  }
  
  return [elementStart, elementEnd]
}

// Trouve le mur parent d'un élément (porte ou liaison verticale)
export function findParentWall(
  elementSegment: readonly [Point, Point],
  walls: readonly Wall[],
  tolerance: number = 0.1
): Wall | null {
  const [elemStart, elemEnd] = elementSegment
  const elemCenter = {
    x: (elemStart.x + elemEnd.x) / 2,
    y: (elemStart.y + elemEnd.y) / 2
  }
  
  for (const wall of walls) {
    const [wallStart, wallEnd] = wall.segment
    
    // Vérifier si le centre de l'élément est proche du mur
    const projectedPoint = projectPointOnSegment(elemCenter, wall.segment)
    const distance = Math.hypot(
      elemCenter.x - projectedPoint.x,
      elemCenter.y - projectedPoint.y
    )
    
    if (distance <= tolerance) {
      // Vérifier que l'élément est bien aligné avec le mur
      const wallVector = {
        x: wallEnd.x - wallStart.x,
        y: wallEnd.y - wallStart.y
      }
      const elemVector = {
        x: elemEnd.x - elemStart.x,
        y: elemEnd.y - elemStart.y
      }
      
      // Normaliser les vecteurs
      const wallLength = Math.hypot(wallVector.x, wallVector.y)
      const elemLength = Math.hypot(elemVector.x, elemVector.y)
      
      if (wallLength === 0 || elemLength === 0) continue
      
      const wallUnit = { x: wallVector.x / wallLength, y: wallVector.y / wallLength }
      const elemUnit = { x: elemVector.x / elemLength, y: elemVector.y / elemLength }
      
      // Produit scalaire pour vérifier l'alignement
      const alignment = Math.abs(wallUnit.x * elemUnit.x + wallUnit.y * elemUnit.y)
      
      if (alignment > 0.9) { // Quasi-parallèles
        return wall
      }
    }
  }
  
  return null
}

// Fonction utilitaire pour projeter un point sur un segment
function projectPointOnSegment(point: Point, segment: readonly [Point, Point]): Point {
  const [start, end] = segment
  
  const segmentVector = {
    x: end.x - start.x,
    y: end.y - start.y
  }
  
  const toPoint = {
    x: point.x - start.x,
    y: point.y - start.y
  }
  
  const segmentLengthSquared = segmentVector.x * segmentVector.x + segmentVector.y * segmentVector.y
  
  if (segmentLengthSquared === 0) {
    return start
  }
  
  const t = Math.max(0, Math.min(1, 
    (toPoint.x * segmentVector.x + toPoint.y * segmentVector.y) / segmentLengthSquared
  ))
  
  return {
    x: start.x + t * segmentVector.x,
    y: start.y + t * segmentVector.y
  }
}