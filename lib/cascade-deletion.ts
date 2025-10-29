/**
 * SYSTÈME DE SUPPRESSION EN CASCADE PROFESSIONNEL
 * Gère automatiquement les dépendances entre éléments avec règles strictes
 * Principe: Aucun élément ne peut exister sans son parent logique
 */

import type { Floor, Room, Wall, Door, Artwork, Escalator, Elevator, VerticalLink } from './types'
import { CONSTRAINTS, ERROR_MESSAGES } from './constants'

// Types pour les résultats de suppression
export interface DeletionResult {
  success: boolean
  deletedElements: {
    rooms: string[]
    walls: string[]
    doors: string[]
    artworks: string[]
    escalators: string[]
    elevators: string[]
    verticalLinks: string[]
    floors: string[]
  }
  affectedFloors: string[]
  message?: string
  orphanedElements?: Array<{ id: string; type: string; reason: string }>
}

export interface DeletionPlan {
  primaryElement: {
    id: string
    type: 'room' | 'wall' | 'door' | 'artwork' | 'escalator' | 'elevator' | 'floor'
  }
  cascadeElements: Array<{
    id: string
    type: string
    reason: string
    dependsOn: string
    priority: number // Ordre de suppression (0 = en premier)
  }>
  affectedFloors: string[]
  warnings: string[]
  criticalWarnings: string[] // Avertissements critiques
  estimatedImpact: {
    totalElements: number
    roomsAffected: number
    floorsAffected: number
  }
}

// RÈGLES STRICTES DE DÉPENDANCE HIÉRARCHIQUE
const DEPENDENCY_RULES = {
  // Quand une pièce est supprimée, TOUT ce qui est dedans doit être supprimé
  room: {
    cascadeTypes: ['wall', 'door', 'artwork', 'escalator', 'elevator', 'verticalLink'],
    reason: 'Élément orphelin: ne peut exister sans pièce parente'
  },
  
  // Quand un étage est supprimé, TOUT ce qui est dessus doit être supprimé  
  floor: {
    cascadeTypes: ['room', 'wall', 'door', 'artwork', 'escalator', 'elevator', 'verticalLink'],
    reason: 'Élément orphelin: ne peut exister sans étage parent'
  },
  
  // Les murs peuvent avoir des éléments attachés
  wall: {
    cascadeTypes: ['door', 'escalator', 'elevator', 'verticalLink'],
    reason: 'Élément attaché: ne peut exister sans mur de support'
  }
} as const

// Analyse les dépendances avant suppression avec règles strictes
export function analyzeDeletionPlan(
  elementId: string,
  elementType: 'room' | 'wall' | 'door' | 'artwork' | 'escalator' | 'elevator' | 'floor',
  floors: Floor[]
): DeletionPlan {
  const plan: DeletionPlan = {
    primaryElement: { id: elementId, type: elementType },
    cascadeElements: [],
    affectedFloors: [],
    warnings: [],
    criticalWarnings: [],
    estimatedImpact: {
      totalElements: 1,
      roomsAffected: 0,
      floorsAffected: 0
    }
  }

  // Analyser selon le type d'élément
  switch (elementType) {
    case 'room':
      analyzeRoomDeletionStrict(elementId, floors, plan)
      break
    case 'wall':
      analyzeWallDeletionStrict(elementId, floors, plan)
      break
    case 'floor':
      analyzeFloorDeletionStrict(elementId, floors, plan)
      break
    case 'escalator':
    case 'elevator':
    case 'door':
    case 'artwork':
      // Éléments simples sans cascade complexe
      analyzeSimpleElementDeletion(elementId, elementType, floors, plan)
      break
  }

  // Calculer l'impact estimé
  plan.estimatedImpact.totalElements = 1 + plan.cascadeElements.length
  plan.estimatedImpact.roomsAffected = plan.cascadeElements.filter(e => e.type === 'room').length
  plan.estimatedImpact.floorsAffected = plan.affectedFloors.length

  return plan
}

// === ANALYSE STRICTE SUPPRESSION PIÈCE ===
function analyzeRoomDeletionStrict(roomId: string, floors: Floor[], plan: DeletionPlan): void {
  floors.forEach(floor => {
    const room = floor.rooms.find(r => r.id === roomId)
    if (!room) return

    plan.affectedFloors.push(floor.id)

    // RÈGLE STRICTE: Tout ce qui est dans la pièce DOIT être supprimé
    
    // 1. Murs intérieurs de la pièce (priorité 0 - en premier)
    floor.walls.forEach(wall => {
      if (wall.roomId === roomId) {
        plan.cascadeElements.push({
          id: wall.id,
          type: 'wall',
          reason: DEPENDENCY_RULES.room.reason,
          dependsOn: roomId,
          priority: 0
        })
      }
    })

    // 2. Portes dans/sur la pièce (priorité 1)
    floor.doors.forEach(door => {
      if (isElementInRoom(door, room) || isElementOnRoomWall(door, room)) {
        plan.cascadeElements.push({
          id: door.id,
          type: 'door',
          reason: DEPENDENCY_RULES.room.reason,
          dependsOn: roomId,
          priority: 1
        })
      }
    })

    // 3. Œuvres d'art dans la pièce (priorité 1)
    floor.artworks.forEach(artwork => {
      if (isArtworkInRoom(artwork, room)) {
        plan.cascadeElements.push({
          id: artwork.id,
          type: 'artwork',
          reason: DEPENDENCY_RULES.room.reason,
          dependsOn: roomId,
          priority: 1
        })
      }
    })

    // 4. Escaliers/Ascenseurs dans la pièce (priorité 1)
    floor.escalators.forEach(escalator => {
      if (isElementInRoom(escalator, room)) {
        plan.cascadeElements.push({
          id: escalator.id,
          type: 'escalator',
          reason: DEPENDENCY_RULES.room.reason,
          dependsOn: roomId,
          priority: 1
        })
        
        plan.criticalWarnings.push(`ATTENTION: Escalier vers étage "${escalator.toFloorId}" sera supprimé`)
      }
    })

    floor.elevators.forEach(elevator => {
      if (isElementInRoom(elevator, room)) {
        plan.cascadeElements.push({
          id: elevator.id,
          type: 'elevator',
          reason: DEPENDENCY_RULES.room.reason,
          dependsOn: roomId,
          priority: 1
        })
        
        plan.criticalWarnings.push(`ATTENTION: Ascenseur connecté à ${elevator.connectedFloorIds.length} étages sera supprimé`)
      }
    })

    // 5. Liens verticaux dans la pièce (priorité 1)
    floor.verticalLinks.forEach(link => {
      if (isElementInRoom(link, room)) {
        plan.cascadeElements.push({
          id: link.id,
          type: 'verticalLink',
          reason: DEPENDENCY_RULES.room.reason,
          dependsOn: roomId,
          priority: 1
        })
      }
    })
  })
}

// === ANALYSE STRICTE SUPPRESSION MUR ===
function analyzeWallDeletionStrict(wallId: string, floors: Floor[], plan: DeletionPlan): void {
  floors.forEach(floor => {
    const wall = floor.walls.find(w => w.id === wallId)
    if (!wall) return

    plan.affectedFloors.push(floor.id)

    // RÈGLE STRICTE: Tout élément attaché au mur DOIT être supprimé
    
    // Portes attachées au mur
    floor.doors.forEach(door => {
      if (isElementOnWall(door, wall)) {
        plan.cascadeElements.push({
          id: door.id,
          type: 'door',
          reason: DEPENDENCY_RULES.wall.reason,
          dependsOn: wallId,
          priority: 0
        })
      }
    })

    // Escaliers/Ascenseurs attachés au mur
    floor.escalators.forEach(escalator => {
      if (isElementOnWall(escalator, wall)) {
        plan.cascadeElements.push({
          id: escalator.id,
          type: 'escalator',
          reason: DEPENDENCY_RULES.wall.reason,
          dependsOn: wallId,
          priority: 0
        })
      }
    })

    floor.elevators.forEach(elevator => {
      if (isElementOnWall(elevator, wall)) {
        plan.cascadeElements.push({
          id: elevator.id,
          type: 'elevator',
          reason: DEPENDENCY_RULES.wall.reason,
          dependsOn: wallId,
          priority: 0
        })
      }
    })

    // Liens verticaux attachés au mur
    floor.verticalLinks.forEach(link => {
      if (isElementOnWall(link, wall)) {
        plan.cascadeElements.push({
          id: link.id,
          type: 'verticalLink',
          reason: DEPENDENCY_RULES.wall.reason,
          dependsOn: wallId,
          priority: 0
        })
      }
    })
  })
}

// === ANALYSE STRICTE SUPPRESSION ÉTAGE ===
function analyzeFloorDeletionStrict(floorId: string, floors: Floor[], plan: DeletionPlan): void {
  const floor = floors.find(f => f.id === floorId)
  if (!floor) return

  plan.affectedFloors.push(floorId)
  
  // RÈGLE STRICTE: Tout ce qui est sur l'étage DOIT être supprimé
  
  // Priorité 0: Pièces (et leur cascade)
  floor.rooms.forEach(room => {
    plan.cascadeElements.push({
      id: room.id,
      type: 'room',
      reason: DEPENDENCY_RULES.floor.reason,
      dependsOn: floorId,
      priority: 0
    })
    
    // Cascade récursive de la pièce
    analyzeRoomDeletionStrict(room.id, [floor], plan)
  })

  // Les autres éléments seront supprimés via la cascade des pièces
  plan.criticalWarnings.push(`ATTENTION: Suppression complète de l'étage "${floor.name}" et tous ses éléments`)
}

// === ANALYSE SIMPLE ÉLÉMENTS ===
function analyzeSimpleElementDeletion(
  elementId: string, 
  elementType: string, 
  floors: Floor[], 
  plan: DeletionPlan
): void {
  // Pour les éléments simples (artwork, door, escalator, elevator)
  // Pas de cascade complexe, juste vérifier les dépendances
  
  floors.forEach(floor => {
    let found = false
    
    switch (elementType) {
      case 'artwork':
        found = floor.artworks.some(a => a.id === elementId)
        break
      case 'door':
        found = floor.doors.some(d => d.id === elementId)
        break
      case 'escalator':
        found = floor.escalators.some(e => e.id === elementId)
        break
      case 'elevator':
        found = floor.elevators.some(e => e.id === elementId)
        break
    }
    
    if (found) {
      plan.affectedFloors.push(floor.id)
    }
  })
}
    if (!wall) return

    plan.affectedFloors.push(floor.id)

    // Portes sur ce mur
    floor.doors.forEach(door => {
      if (isDoorOnWall(door, wall)) {
        plan.cascadeElements.push({
          id: door.id,
          type: 'door',
          reason: 'Porte située sur le mur supprimé',
          dependsOn: wallId
        })
      }
    })

}

// === FONCTIONS UTILITAIRES POUR TESTS DE POSITION ===

// Vérifie si un élément est dans une pièce (position géométrique)
function isElementInRoom(element: { xy?: [number, number]; segment?: [Point, Point] }, room: Room): boolean {
  if (element.xy) {
    // Élément ponctuel (artwork, escalator, elevator)
    return isPointInPolygon({ x: element.xy[0], y: element.xy[1] }, room.polygon)
  }
  
  if (element.segment) {
    // Élément linéaire (door, link) - vérifier que le milieu est dans la pièce
    const midpoint = {
      x: (element.segment[0].x + element.segment[1].x) / 2,
      y: (element.segment[0].y + element.segment[1].y) / 2
    }
    return isPointInPolygon(midpoint, room.polygon)
  }
  
  return false
}

// Vérifie si un élément est sur le mur d'une pièce
function isElementOnRoomWall(element: { segment?: [Point, Point] }, room: Room): boolean {
  if (!element.segment) return false
  
  // Vérifier si le segment de l'élément est sur un mur de la pièce
  for (let i = 0; i < room.polygon.length; i++) {
    const wallStart = room.polygon[i]
    const wallEnd = room.polygon[(i + 1) % room.polygon.length]
    
    if (isSegmentOnWall(element.segment, [wallStart, wallEnd])) {
      return true
    }
  }
  
  return false
}

// Vérifie si un élément est attaché à un mur spécifique
function isElementOnWall(element: { segment?: [Point, Point] }, wall: Wall): boolean {
  if (!element.segment) return false
  return isSegmentOnWall(element.segment, wall.segment)
}

// Vérifie si un segment est sur un mur (avec tolérance)
function isSegmentOnWall(elementSegment: [Point, Point], wallSegment: [Point, Point]): boolean {
  const tolerance = CONSTRAINTS.overlap.tolerance
  
  // Vérifier si les deux points de l'élément sont proches du mur
  const dist1 = distancePointToSegment(elementSegment[0], wallSegment)
  const dist2 = distancePointToSegment(elementSegment[1], wallSegment)
  
  return dist1 < tolerance && dist2 < tolerance
}

// Calcule la distance d'un point à un segment
function distancePointToSegment(point: Point, segment: [Point, Point]): number {
  const [start, end] = segment
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  
  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y)
  }
  
  const t = Math.max(0, Math.min(1, 
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared
  ))
  
  const projection = {
    x: start.x + t * dx,
    y: start.y + t * dy
  }
  
  return Math.hypot(point.x - projection.x, point.y - projection.y)
}

// Test point dans polygone (copie locale)
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

// Compatibilité avec ancien code
function isArtworkInRoom(artwork: Artwork, room: Room): boolean {
  return isElementInRoom(artwork, room)
}

// === EXÉCUTION DE LA SUPPRESSION EN CASCADE ===
export function executeCascadeDeletion(
  plan: DeletionPlan,
  floors: Floor[]
): DeletionResult {
  const result: DeletionResult = {
    success: true,
    deletedElements: {
      rooms: [],
      walls: [],
      doors: [],
      artworks: [],
      escalators: [],
      elevators: [],
      verticalLinks: [],
      floors: []
    },
    affectedFloors: [...plan.affectedFloors],
    message: `Suppression en cascade: ${plan.estimatedImpact.totalElements} éléments supprimés`
  }

  try {
    // Trier les éléments par priorité (0 = en premier)
    const sortedElements = [...plan.cascadeElements].sort((a, b) => a.priority - b.priority)
    
    // Supprimer l'élément principal
    switch (plan.primaryElement.type) {
      case 'room':
        result.deletedElements.rooms.push(plan.primaryElement.id)
        break
      case 'wall':
        result.deletedElements.walls.push(plan.primaryElement.id)
        break
      case 'door':
        result.deletedElements.doors.push(plan.primaryElement.id)
        break
      case 'artwork':
        result.deletedElements.artworks.push(plan.primaryElement.id)
        break
      case 'escalator':
        result.deletedElements.escalators.push(plan.primaryElement.id)
        break
      case 'elevator':
        result.deletedElements.elevators.push(plan.primaryElement.id)
        break
      case 'floor':
        result.deletedElements.floors.push(plan.primaryElement.id)
        break
    }
    
    // Supprimer les éléments en cascade
    sortedElements.forEach(element => {
      switch (element.type) {
        case 'room':
          result.deletedElements.rooms.push(element.id)
          break
        case 'wall':
          result.deletedElements.walls.push(element.id)
          break
        case 'door':
          result.deletedElements.doors.push(element.id)
          break
        case 'artwork':
          result.deletedElements.artworks.push(element.id)
          break
        case 'escalator':
          result.deletedElements.escalators.push(element.id)
          break
        case 'elevator':
          result.deletedElements.elevators.push(element.id)
          break
        case 'verticalLink':
          result.deletedElements.verticalLinks.push(element.id)
          break
      }
    })
    
  } catch (error) {
    result.success = false
    result.message = `Erreur lors de la suppression: ${error}`
  }

  return result
}
      walls: [],
      doors: [],
      artworks: [],
      escalators: [],
      elevators: [],
      verticalLinks: [],
      floors: []
    },
    affectedFloors: [...plan.affectedFloors]
  }

  try {
    // Supprime l'élément principal
    result.deletedElements[`${plan.primaryElement.type}s` as keyof typeof result.deletedElements].push(plan.primaryElement.id)

    // Supprime les éléments en cascade
    plan.cascadeElements.forEach(element => {
      const key = `${element.type}s` as keyof typeof result.deletedElements
      if (key in result.deletedElements) {
        (result.deletedElements[key] as string[]).push(element.id)
      }
    })

    result.message = `Suppression réussie: ${plan.cascadeElements.length + 1} éléments supprimés`
  } catch (error) {
    result.success = false
    result.message = `Erreur lors de la suppression: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
  }

  return result
}

// Fonctions utilitaires de détection de position

function isArtworkInRoom(artwork: Artwork, room: Room): boolean {
  const [x, y] = artwork.xy
  return isPointInPolygon({ x, y }, room.polygon)
}

function isEscalatorInRoom(escalator: Escalator, room: Room): boolean {
  const midPoint = {
    x: (escalator.startPosition.x + escalator.endPosition.x) / 2,
    y: (escalator.startPosition.y + escalator.endPosition.y) / 2
  }
  return isPointInPolygon(midPoint, room.polygon)
}

function isElevatorInRoom(elevator: Elevator, room: Room): boolean {
  return isPointInPolygon(elevator.position, room.polygon)
}

function isDoorOnWall(door: Door, wall: Wall): boolean {
  // Vérifie si la porte est sur le segment du mur
  const [doorStart, doorEnd] = door.segment
  const [wallStart, wallEnd] = wall.segment
  
  // Vérifie si les points de la porte sont sur la ligne du mur
  return isPointOnLineSegment(doorStart, wallStart, wallEnd) ||
         isPointOnLineSegment(doorEnd, wallStart, wallEnd)
}

function isArtworkOnWall(artwork: Artwork, wall: Wall): boolean {
  const [x, y] = artwork.xy
  const artworkPoint = { x, y }
  const [wallStart, wallEnd] = wall.segment
  
  // Calcule la distance du point à la ligne du mur
  const distance = distancePointToLineSegment(artworkPoint, wallStart, wallEnd)
  
  // Considère que l'œuvre est sur le mur si elle est très proche
  return distance < 0.5 // 50cm de tolérance
}

function isPointInPolygon(point: { x: number; y: number }, polygon: readonly { x: number; y: number }[]): boolean {
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

function isPointOnLineSegment(
  point: { x: number; y: number },
  lineStart: { x: number; y: number },
  lineEnd: { x: number; y: number },
  tolerance: number = 0.1
): boolean {
  const distance = distancePointToLineSegment(point, lineStart, lineEnd)
  return distance <= tolerance
}

function distancePointToLineSegment(
  point: { x: number; y: number },
  lineStart: { x: number; y: number },
  lineEnd: { x: number; y: number }
): number {
  const A = point.x - lineStart.x
  const B = point.y - lineStart.y
  const C = lineEnd.x - lineStart.x
  const D = lineEnd.y - lineStart.y
  
  const dot = A * C + B * D
  const lenSq = C * C + D * D
  
  if (lenSq === 0) {
    // La ligne est un point
    return Math.hypot(A, B)
  }
  
  let param = dot / lenSq
  
  if (param < 0) {
    return Math.hypot(A, B)
  } else if (param > 1) {
    return Math.hypot(point.x - lineEnd.x, point.y - lineEnd.y)
  } else {
    const closestX = lineStart.x + param * C
    const closestY = lineStart.y + param * D
    return Math.hypot(point.x - closestX, point.y - closestY)
  }
}