/**
 * SERVICE CASCADE - Gestion des relations parent-enfant et actions en cascade
 * 
 * Principe: Les éléments ont des relations hiérarchiques:
 * - Room (parent) → Walls, Doors, Artworks (enfants)
 * - Si parent modifié/supprimé → enfants suivent automatiquement
 */

import type { Floor, Room, Wall, Door, Artwork, Point } from '@/core/entities'
import { translatePolygon, translateWall, translateDoor, translateArtwork } from './transform.service'
import { isPointInPolygon } from './geometry.service'

/**
 * Récupérer tous les éléments enfants d'une room
 */
export function getRoomChildren(floor: Floor, roomId: string) {
  return {
    walls: floor.walls?.filter(w => w.roomId === roomId) || [],
    doors: floor.doors?.filter(d => d.roomId === roomId) || [],
    artworks: floor.artworks?.filter(a => a.roomId === roomId) || []
  }
}

/**
 * Supprimer une room ET tous ses enfants (cascade)
 */
export function deleteRoomWithChildren(floor: Floor, roomId: string): Floor {
  const children = getRoomChildren(floor, roomId)
  
  return {
    ...floor,
    rooms: floor.rooms.filter(r => r.id !== roomId),
    walls: floor.walls?.filter(w => !children.walls.some(cw => cw.id === w.id)),
    doors: floor.doors?.filter(d => !children.doors.some(cd => cd.id === d.id)),
    artworks: floor.artworks?.filter(a => !children.artworks.some(ca => ca.id === a.id))
  }
}

/**
 * Déplacer une room ET tous ses enfants
 */
export function translateRoomWithChildren(
  floor: Floor, 
  roomId: string, 
  delta: Point
): Floor {
  const children = getRoomChildren(floor, roomId)
  
  return {
    ...floor,
    rooms: floor.rooms.map(r => {
      if (r.id !== roomId) return r
      return {
        ...r,
        polygon: translatePolygon(r.polygon, delta)
      }
    }),
    walls: floor.walls?.map(w => {
      if (!children.walls.some(cw => cw.id === w.id)) return w
      return translateWall(w, delta)
    }),
    doors: floor.doors?.map(d => {
      if (!children.doors.some(cd => cd.id === d.id)) return d
      return translateDoor(d, delta)
    }),
    artworks: floor.artworks?.map(a => {
      if (!children.artworks.some(ca => ca.id === a.id)) return a
      return translateArtwork(a, delta)
    })
  }
}

/**
 * Valider qu'un changement de room ne met pas ses murs hors limites
 */
export function validateRoomModificationWithWalls(
  updatedRoom: Room,
  floor: Floor
): { valid: boolean; reason?: string } {
  const children = getRoomChildren(floor, updatedRoom.id)
  
  // Vérifier que TOUS les points de TOUS les murs enfants sont dans la nouvelle room
  for (const wall of children.walls) {
    const points = wall.path || [wall.segment[0], wall.segment[1]]
    
    for (const point of points) {
      if (!isPointInPolygon(point, updatedRoom.polygon)) {
        return {
          valid: false,
          reason: `Le mur ${wall.id} serait placé hors de la pièce après modification`
        }
      }
    }
  }
  
  return { valid: true }
}

/**
 * Attacher automatiquement un mur à sa room parente
 */
export function attachWallToRoom(wall: Wall, floor: Floor): Wall {
  // Trouver quelle room contient ce mur
  for (const room of floor.rooms) {
    const points = wall.path || [wall.segment[0], wall.segment[1]]
    const allPointsInRoom = points.every(p => isPointInPolygon(p, room.polygon))
    
    if (allPointsInRoom) {
      return { ...wall, roomId: room.id }
    }
  }
  
  // Aucune room ne contient le mur → pas de roomId
  return { ...wall, roomId: undefined }
}
