import type { Floor, Room, Wall, Door, Artwork, Escalator, Elevator, VerticalLink, Point } from './types'
import { CONSTRAINTS, ERROR_MESSAGES } from './constants'

/**
 * SYSTÈME DE SUPPRESSION EN CASCADE ULTRA-STRICT
 * Règle fondamentale: Aucun élément ne peut survivre sans son parent logique
 */

export interface StrictDeletionResult {
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
  message: string
  orphanedPrevented: number // Nombre d'orphelins évités
}

// === SUPPRESSION INTELLIGENTE AVEC CASCADE STRICTE ===
export function deleteElementWithCascade(
  elementId: string,
  elementType: 'room' | 'wall' | 'door' | 'artwork' | 'escalator' | 'elevator' | 'floor',
  floors: Floor[]
): StrictDeletionResult {
  const result: StrictDeletionResult = {
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
    affectedFloors: [],
    message: '',
    orphanedPrevented: 0
  }

  // Collecter tous les éléments à supprimer selon les règles strictes
  const toDelete = new Set<string>()
  
  switch (elementType) {
    case 'room':
      deleteRoomStrict(elementId, floors, toDelete, result)
      break
    case 'floor':
      deleteFloorStrict(elementId, floors, toDelete, result)
      break
    case 'wall':
      deleteWallStrict(elementId, floors, toDelete, result)
      break
    default:
      // Éléments simples
      toDelete.add(`${elementType}:${elementId}`)
      break
  }

  // Convertir les IDs en résultat structuré
  toDelete.forEach(id => {
    const [type, elementId] = id.split(':')
    switch (type) {
      case 'room': result.deletedElements.rooms.push(elementId); break
      case 'wall': result.deletedElements.walls.push(elementId); break
      case 'door': result.deletedElements.doors.push(elementId); break
      case 'artwork': result.deletedElements.artworks.push(elementId); break
      case 'escalator': result.deletedElements.escalators.push(elementId); break
      case 'elevator': result.deletedElements.elevators.push(elementId); break
      case 'verticalLink': result.deletedElements.verticalLinks.push(elementId); break
      case 'floor': result.deletedElements.floors.push(elementId); break
    }
  })

  result.orphanedPrevented = toDelete.size - 1 // -1 pour l'élément principal
  result.message = `${toDelete.size} éléments supprimés pour maintenir la cohérence`
  
  return result
}

// === SUPPRESSION STRICTE D'UNE PIÈCE ===
function deleteRoomStrict(
  roomId: string, 
  floors: Floor[], 
  toDelete: Set<string>, 
  result: StrictDeletionResult
): void {
  toDelete.add(`room:${roomId}`)
  
  floors.forEach(floor => {
    const room = floor.rooms.find(r => r.id === roomId)
    if (!room) return
    
    result.affectedFloors.push(floor.id)
    
    // RÈGLE STRICTE: Tout ce qui est dans la pièce DOIT être supprimé
    
    // 1. Murs intérieurs
    floor.walls.forEach(wall => {
      if (wall.roomId === roomId) {
        toDelete.add(`wall:${wall.id}`)
        // Supprimer aussi ce qui est attaché au mur
        deleteWallStrict(wall.id, floors, toDelete, result)
      }
    })
    
    // 2. Œuvres d'art dans la pièce
    floor.artworks.forEach(artwork => {
      if (isArtworkInRoom(artwork, room)) {
        toDelete.add(`artwork:${artwork.id}`)
      }
    })
    
    // 3. Portes dans la pièce
    floor.doors.forEach(door => {
      if (isDoorInRoom(door, room)) {
        toDelete.add(`door:${door.id}`)
      }
    })
    
    // 4. Escaliers dans la pièce
    floor.escalators.forEach(escalator => {
      if (isEscalatorInRoom(escalator, room)) {
        toDelete.add(`escalator:${escalator.id}`)
      }
    })
    
    // 5. Ascenseurs dans la pièce
    floor.elevators.forEach(elevator => {
      if (isElevatorInRoom(elevator, room)) {
        toDelete.add(`elevator:${elevator.id}`)
      }
    })
    
    // 6. Liens verticaux dans la pièce
    floor.verticalLinks.forEach(link => {
      if (isVerticalLinkInRoom(link, room)) {
        toDelete.add(`verticalLink:${link.id}`)
      }
    })
  })
}

// === SUPPRESSION STRICTE D'UN MUR ===
function deleteWallStrict(
  wallId: string, 
  floors: Floor[], 
  toDelete: Set<string>, 
  result: StrictDeletionResult
): void {
  toDelete.add(`wall:${wallId}`)
  
  floors.forEach(floor => {
    const wall = floor.walls.find(w => w.id === wallId)
    if (!wall) return
    
    result.affectedFloors.push(floor.id)
    
    // RÈGLE STRICTE: Tout élément attaché au mur DOIT être supprimé
    
    // Portes sur le mur
    floor.doors.forEach(door => {
      if (isDoorOnWall(door, wall)) {
        toDelete.add(`door:${door.id}`)
      }
    })
    
    // Escaliers attachés au mur
    floor.escalators.forEach(escalator => {
      if (isEscalatorOnWall(escalator, wall)) {
        toDelete.add(`escalator:${escalator.id}`)
      }
    })
    
    // Ascenseurs attachés au mur
    floor.elevators.forEach(elevator => {
      if (isElevatorOnWall(elevator, wall)) {
        toDelete.add(`elevator:${elevator.id}`)
      }
    })
    
    // Liens verticaux attachés au mur
    floor.verticalLinks.forEach(link => {
      if (isVerticalLinkOnWall(link, wall)) {
        toDelete.add(`verticalLink:${link.id}`)
      }
    })
  })
}

// === SUPPRESSION STRICTE D'UN ÉTAGE ===
function deleteFloorStrict(
  floorId: string, 
  floors: Floor[], 
  toDelete: Set<string>, 
  result: StrictDeletionResult
): void {
  toDelete.add(`floor:${floorId}`)
  
  const floor = floors.find(f => f.id === floorId)
  if (!floor) return
  
  result.affectedFloors.push(floorId)
  
  // RÈGLE STRICTE: Tout ce qui est sur l'étage DOIT être supprimé
  
  // Supprimer toutes les pièces (et leur cascade)
  floor.rooms.forEach(room => {
    deleteRoomStrict(room.id, [floor], toDelete, result)
  })
  
  // Tout le reste sera supprimé via la cascade des pièces
}

// === FONCTIONS DE TEST DE POSITION ===

function isArtworkInRoom(artwork: Artwork, room: Room): boolean {
  const [x, y] = artwork.xy
  return isPointInPolygon({ x, y }, room.polygon)
}

function isDoorInRoom(door: Door, room: Room): boolean {
  const midpoint = {
    x: (door.segment[0].x + door.segment[1].x) / 2,
    y: (door.segment[0].y + door.segment[1].y) / 2
  }
  return isPointInPolygon(midpoint, room.polygon)
}

function isEscalatorInRoom(escalator: Escalator, room: Room): boolean {
  // Vérifier si le milieu de l'escalier est dans la pièce
  const midpoint = {
    x: (escalator.startPosition.x + escalator.endPosition.x) / 2,
    y: (escalator.startPosition.y + escalator.endPosition.y) / 2
  }
  return isPointInPolygon(midpoint, room.polygon)
}

function isElevatorInRoom(elevator: Elevator, room: Room): boolean {
  return isPointInPolygon(elevator.position, room.polygon)
}

function isVerticalLinkInRoom(link: VerticalLink, room: Room): boolean {
  const midpoint = {
    x: (link.segment[0].x + link.segment[1].x) / 2,
    y: (link.segment[0].y + link.segment[1].y) / 2
  }
  return isPointInPolygon(midpoint, room.polygon)
}

function isDoorOnWall(door: Door, wall: Wall): boolean {
  return isSegmentOnWall([...door.segment], [...wall.segment])
}

function isEscalatorOnWall(escalator: Escalator, wall: Wall): boolean {
  // Les escaliers sont-ils attachés aux murs ? Dépend du design
  return false // À adapter selon le modèle
}

function isElevatorOnWall(elevator: Elevator, wall: Wall): boolean {
  // Les ascenseurs sont-ils attachés aux murs ? Dépend du design
  return false // À adapter selon le modèle
}

function isVerticalLinkOnWall(link: VerticalLink, wall: Wall): boolean {
  return isSegmentOnWall([...link.segment], [...wall.segment])
}

function isSegmentOnWall(elementSegment: [Point, Point], wallSegment: [Point, Point]): boolean {
  const tolerance = CONSTRAINTS.overlap.tolerance
  
  const dist1 = distancePointToSegment(elementSegment[0], wallSegment)
  const dist2 = distancePointToSegment(elementSegment[1], wallSegment)
  
  return dist1 < tolerance && dist2 < tolerance
}

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