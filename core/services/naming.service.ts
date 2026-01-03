/**
 * SERVICE NOMMAGE
 * Génération de noms cohérents pour tous les éléments du musée
 */

import type { Floor } from '@/core/entities'

/**
 * Génère un nom cohérent pour un étage selon sa position
 */
export function generateFloorName(floorIndex: number, totalFloors: number): string {
  // Index 0 = en bas (sous-sols), Index max = en haut (étages)
  
  if (totalFloors === 1) {
    return 'Rez-de-chaussée'
  }
  
  // Trouver le rez-de-chaussée (approximativement au milieu, ou premier étage si < 3 niveaux)
  const groundFloorIndex = totalFloors <= 2 ? 0 : Math.floor(totalFloors / 2)
  
  if (floorIndex === groundFloorIndex) {
    return 'Rez-de-chaussée'
  } else if (floorIndex < groundFloorIndex) {
    // Sous-sols (numérotés de bas en haut)
    const subLevel = groundFloorIndex - floorIndex
    return `Sous-sol ${subLevel}`
  } else {
    // Étages (numérotés de bas en haut)
    const level = floorIndex - groundFloorIndex
    return `Étage ${level}`
  }
}

/**
 * Génère un nom court pour un étage (pour affichage compact)
 */
export function generateFloorShortName(floorIndex: number, totalFloors: number): string {
  const fullName = generateFloorName(floorIndex, totalFloors)
  
  if (fullName === 'Rez-de-chaussée') return 'RDC'
  if (fullName.startsWith('Sous-sol')) {
    const level = fullName.split(' ')[1]
    return `SS${level}`
  }
  if (fullName.startsWith('Étage')) {
    const level = fullName.split(' ')[1]
    return `E${level}`
  }
  
  return fullName
}

/**
 * Génère un nom pour une room basé sur son index dans l'étage
 */
export function generateRoomName(roomIndex: number, floorName: string): string {
  const roomLetter = String.fromCharCode(65 + (roomIndex % 26)) // A, B, C, ...
  return `Salle ${roomLetter}`
}

/**
 * Génère un nom pour un mur basé sur son index
 */
export function generateWallName(wallIndex: number): string {
  return `Mur ${wallIndex + 1}`
}

/**
 * Génère un nom pour une porte basé sur les rooms qu'elle connecte
 */
export function generateDoorName(roomA?: string, roomB?: string, doorIndex?: number): string {
  if (roomA && roomB) {
    // Extraire les lettres des noms de room
    const letterA = roomA.match(/Salle ([A-Z])/)?.[1] || roomA.substring(0, 1)
    const letterB = roomB.match(/Salle ([A-Z])/)?.[1] || roomB.substring(0, 1)
    return `Porte ${letterA}-${letterB}`
  }
  
  return `Porte ${(doorIndex ?? 0) + 1}`
}

/**
 * Génère un nom pour une œuvre basé sur son titre ou index
 */
export function generateArtworkName(title?: string, artworkIndex?: number): string {
  if (title && title !== 'Sans titre') {
    return title
  }
  
  return `Œuvre ${(artworkIndex ?? 0) + 1}`
}

/**
 * Génère un nom pour un lien vertical (escalier/ascenseur)
 */
export function generateVerticalLinkName(
  type: 'stairs' | 'elevator',
  linkNumber?: number,
  connectedFloorNames?: string[]
): string {
  const baseName = type === 'stairs' ? 'Escalier' : 'Ascenseur'
  
  if (linkNumber !== undefined && linkNumber > 0) {
    return `${baseName} ${linkNumber}`
  }
  
  if (connectedFloorNames && connectedFloorNames.length >= 2) {
    const firstFloor = connectedFloorNames[0].replace('Rez-de-chaussée', 'RDC').replace('Sous-sol', 'SS').replace('Étage', 'E')
    const lastFloor = connectedFloorNames[connectedFloorNames.length - 1].replace('Rez-de-chaussée', 'RDC').replace('Sous-sol', 'SS').replace('Étage', 'E')
    return `${baseName} ${firstFloor}-${lastFloor}`
  }
  
  return baseName
}

/**
 * Renomme tous les éléments d'un étage de manière cohérente
 */
export function renameFloorElements(floor: Floor, floorIndex: number, totalFloors: number): Floor {
  const floorName = generateFloorName(floorIndex, totalFloors)
  
  // Renommer rooms
  const renamedRooms = floor.rooms.map((room, index) => ({
    ...room,
    name: generateRoomName(index, floorName)
  }))
  
  // Créer un map ID -> nom pour les rooms
  const roomIdToName = new Map(renamedRooms.map(r => [r.id, r.name || '']))
  
  // Renommer walls
  const renamedWalls = (floor.walls || []).map((wall, index) => ({
    ...wall,
    name: generateWallName(index)
  }))
  
  // Renommer doors
  const renamedDoors = (floor.doors || []).map((door, index) => ({
    ...door,
    name: generateDoorName(
      roomIdToName.get(door.room_a),
      roomIdToName.get(door.room_b),
      index
    )
  }))
  
  // Renommer artworks (conserver titre si existe)
  const renamedArtworks = (floor.artworks || []).map((artwork, index) => ({
    ...artwork,
    name: artwork.name || generateArtworkName(artwork.name, index)
  }))
  
  // Renommer vertical links
  const renamedVerticalLinks = (floor.verticalLinks || []).map(link => ({
    ...link,
    name: generateVerticalLinkName(link.type, link.linkNumber)
  }))
  
  return {
    ...floor,
    name: floorName,
    rooms: renamedRooms,
    walls: renamedWalls,
    doors: renamedDoors,
    artworks: renamedArtworks,
    verticalLinks: renamedVerticalLinks
  }
}

/**
 * Renomme tous les étages et leurs éléments de manière cohérente
 */
export function renameAllFloors(floors: Floor[]): Floor[] {
  return floors.map((floor, index) => 
    renameFloorElements(floor, index, floors.length)
  )
}
