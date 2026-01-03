/**
 * SERVICE MURS
 * Gestion des murs intérieurs
 */

import type { Point, Wall, Room, Floor } from '@/core/entities'
import { isPointInPolygon } from './geometry.service'
import { v4 as uuidv4 } from 'uuid'

export const WALL_THICKNESS = {
  INTERIOR: 0.15,
  EXTERIOR: 0.25,
  LOAD_BEARING: 0.3
} as const

/**
 * Crée un nouveau mur
 */
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

/**
 * Trouve la pièce contenant un point
 */
export function findRoomContainingPoint(point: Point, floor: Floor): Room | null {
  for (const room of floor.rooms) {
    if (isPointInPolygon(point, room.polygon)) {
      return room
    }
  }
  return null
}

/**
 * Trouve la pièce contenant un segment entier
 */
export function findRoomContainingSegment(start: Point, end: Point, floor: Floor): Room | null {
  // Vérifier les extrémités
  for (const room of floor.rooms) {
    if (isPointInPolygon(start, room.polygon) && isPointInPolygon(end, room.polygon)) {
      // Vérifier aussi des points intermédiaires pour être sûr
      const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
      if (isPointInPolygon(midpoint, room.polygon)) {
        return room
      }
    }
  }
  return null
}

/**
 * Trouve la pièce contenant un mur (alias de findRoomContainingSegment)
 */
export function findRoomContainingWall(wall: Wall, floor: Floor): Room | null {
  return findRoomContainingSegment(wall.segment[0], wall.segment[1], floor)
}

/**
 * Trouve les éléments attachés à un mur
 */
export function findElementsAttachedToWall(
  wall: Wall,
  floor: Floor
): Array<{ type: 'door' | 'verticalLink'; id: string; element: any }> {
  const attached: Array<{ type: 'door' | 'verticalLink'; id: string; element: any }> = []

  // Vérifier les portes
  for (const door of floor.doors) {
    // Logique simplifiée - à améliorer si nécessaire
    attached.push({ type: 'door', id: door.id, element: door })
  }

  // Vérifier les liens verticaux
  for (const link of floor.verticalLinks) {
    attached.push({ type: 'verticalLink', id: link.id, element: link })
  }

  return attached
}

/**
 * Trouve le mur parent d'un élément
 */
export function findParentWall(
  elementSegment: readonly [Point, Point],
  floor: Floor
): Wall | null {
  for (const wall of floor.walls) {
    // Logique simplifiée - à améliorer si nécessaire
    // Vérifier si les segments sont proches
    const wallMid = {
      x: (wall.segment[0].x + wall.segment[1].x) / 2,
      y: (wall.segment[0].y + wall.segment[1].y) / 2
    }
    const elemMid = {
      x: (elementSegment[0].x + elementSegment[1].x) / 2,
      y: (elementSegment[0].y + elementSegment[1].y) / 2
    }
    
    const dist = Math.hypot(wallMid.x - elemMid.x, wallMid.y - elemMid.y)
    if (dist < 0.5) return wall
  }
  
  return null
}
