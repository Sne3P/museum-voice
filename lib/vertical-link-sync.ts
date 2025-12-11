/**
 * Système de synchronisation ultra-liée pour les liens verticaux
 * Gère la synchronisation parfaite entre escaliers/ascenseurs liés
 */

import type { EditorState, Floor, VerticalLink, Point } from './types'
import { v4 as uuidv4 } from 'uuid'

/**
 * Vérifie si un lien vertical peut être modifié sans rompre la synchronisation
 */
export function canModifyVerticalLink(
  state: EditorState,
  linkId: string,
  newSegment?: readonly [Point, Point],
  newWidth?: number
): { canModify: boolean; reason?: string; affectedLinks: string[] } {
  const allLinks: VerticalLink[] = []
  
  // Collecter tous les liens de tous les étages
  state.floors.forEach(floor => {
    allLinks.push(...floor.verticalLinks)
  })
  
  const targetLink = allLinks.find(link => link.id === linkId)
  if (!targetLink) {
    return { canModify: false, reason: "Lien introuvable", affectedLinks: [] }
  }
  
  const masterLinkId = targetLink.masterLinkId || targetLink.id
  const linkedLinks = allLinks.filter(link => 
    link.masterLinkId === masterLinkId || link.id === masterLinkId
  )
  
  // Vérifier si la modification est possible sur tous les liens liés
  const affectedFloorIds = linkedLinks.map(link => {
    const floor = state.floors.find(f => f.verticalLinks.some(vl => vl.id === link.id))
    return floor?.id
  }).filter(Boolean) as string[]
  
  // Vérifier les contraintes sur chaque étage
  for (const floorId of affectedFloorIds) {
    const floor = state.floors.find(f => f.id === floorId)
    if (!floor) continue
    
    // Vérifier les collisions avec d'autres éléments
    if (newSegment) {
      const hasCollision = floor.verticalLinks.some(vl => 
        vl.id !== linkId && 
        vl.masterLinkId !== masterLinkId &&
        segmentsOverlap(vl.segment, newSegment)
      )
      
      if (hasCollision) {
        return { 
          canModify: false, 
          reason: `Collision détectée sur l'étage ${floor.name}`,
          affectedLinks: linkedLinks.map(l => l.id)
        }
      }
    }
  }
  
  return { 
    canModify: true, 
    affectedLinks: linkedLinks.map(l => l.id)
  }
}

/**
 * Modifie un lien vertical et synchronise tous les liens liés
 */
export function modifyVerticalLinkWithSync(
  state: EditorState,
  linkId: string,
  modifications: {
    segment?: readonly [Point, Point]
    width?: number
  }
): EditorState {
  const validation = canModifyVerticalLink(state, linkId, modifications.segment, modifications.width)
  
  if (!validation.canModify) {
    throw new Error(`Modification impossible: ${validation.reason}`)
  }
  
  const allLinks: VerticalLink[] = []
  
  // Collecter tous les liens de tous les étages avec leur étage
  state.floors.forEach(floor => {
    allLinks.push(...floor.verticalLinks.map(link => ({ ...link, floorId: floor.id })))
  })
  
  const targetLink = allLinks.find(link => link.id === linkId) as VerticalLink & { floorId: string }
  if (!targetLink) return state
  
  const masterLinkId = targetLink.masterLinkId || targetLink.id
  const linkedLinks = allLinks.filter(link => 
    link.masterLinkId === masterLinkId || link.id === masterLinkId
  ) as (VerticalLink & { floorId: string })[]
  
  // Appliquer les modifications à tous les liens liés
  const updatedFloors = state.floors.map(floor => {
    const floorLinkedLinks = linkedLinks.filter(link => link.floorId === floor.id)
    
    if (floorLinkedLinks.length === 0) return floor
    
    const updatedVerticalLinks = floor.verticalLinks.map(link => {
      const isLinked = floorLinkedLinks.some(ll => ll.id === link.id)
      if (!isLinked) return link
      
      return {
        ...link,
        ...(modifications.segment && { segment: modifications.segment }),
        ...(modifications.width && { width: modifications.width })
      }
    })
    
    return {
      ...floor,
      verticalLinks: updatedVerticalLinks
    }
  })
  
  return {
    ...state,
    floors: updatedFloors
  }
}

/**
 * Déplace un lien vertical et synchronise tous les liens liés
 */
export function moveVerticalLinkWithSync(
  state: EditorState,
  linkId: string,
  offset: Point
): EditorState {
  const allLinks: VerticalLink[] = []
  
  state.floors.forEach(floor => {
    allLinks.push(...floor.verticalLinks.map(link => ({ ...link, floorId: floor.id })))
  })
  
  const targetLink = allLinks.find(link => link.id === linkId) as VerticalLink & { floorId: string }
  if (!targetLink) return state
  
  const newSegment: readonly [Point, Point] = [
    { x: targetLink.segment[0].x + offset.x, y: targetLink.segment[0].y + offset.y },
    { x: targetLink.segment[1].x + offset.x, y: targetLink.segment[1].y + offset.y }
  ]
  
  return modifyVerticalLinkWithSync(state, linkId, { segment: newSegment })
}

/**
 * Redimensionne un lien vertical et synchronise tous les liens liés
 */
export function resizeVerticalLinkWithSync(
  state: EditorState,
  linkId: string,
  newWidth: number,
  anchorPoint: 'start' | 'end' | 'center' = 'center'
): EditorState {
  const allLinks: VerticalLink[] = []
  
  state.floors.forEach(floor => {
    allLinks.push(...floor.verticalLinks.map(link => ({ ...link, floorId: floor.id })))
  })
  
  const targetLink = allLinks.find(link => link.id === linkId) as VerticalLink & { floorId: string }
  if (!targetLink) return state
  
  const currentSegment = targetLink.segment
  const currentLength = Math.hypot(
    currentSegment[1].x - currentSegment[0].x,
    currentSegment[1].y - currentSegment[0].y
  )
  
  if (currentLength === 0) return state
  
  // Calculer le nouveau segment selon le point d'ancrage
  let newSegment: readonly [Point, Point]
  
  const direction = {
    x: (currentSegment[1].x - currentSegment[0].x) / currentLength,
    y: (currentSegment[1].y - currentSegment[0].y) / currentLength
  }
  
  switch (anchorPoint) {
    case 'start':
      newSegment = [
        currentSegment[0],
        {
          x: currentSegment[0].x + direction.x * newWidth,
          y: currentSegment[0].y + direction.y * newWidth
        }
      ]
      break
    case 'end':
      newSegment = [
        {
          x: currentSegment[1].x - direction.x * newWidth,
          y: currentSegment[1].y - direction.y * newWidth
        },
        currentSegment[1]
      ]
      break
    case 'center':
    default:
      const center = {
        x: (currentSegment[0].x + currentSegment[1].x) / 2,
        y: (currentSegment[0].y + currentSegment[1].y) / 2
      }
      const halfWidth = newWidth / 2
      newSegment = [
        {
          x: center.x - direction.x * halfWidth,
          y: center.y - direction.y * halfWidth
        },
        {
          x: center.x + direction.x * halfWidth,
          y: center.y + direction.y * halfWidth
        }
      ]
      break
  }
  
  return modifyVerticalLinkWithSync(state, linkId, { segment: newSegment, width: newWidth })
}

/**
 * Obtient tous les liens liés à un lien donné
 */
export function getLinkedVerticalLinks(
  state: EditorState,
  linkId: string
): VerticalLink[] {
  const allLinks: VerticalLink[] = []
  
  state.floors.forEach(floor => {
    allLinks.push(...floor.verticalLinks)
  })
  
  const targetLink = allLinks.find(link => link.id === linkId)
  if (!targetLink) return []
  
  const masterLinkId = targetLink.masterLinkId || targetLink.id
  
  return allLinks.filter(link => 
    link.masterLinkId === masterLinkId || link.id === masterLinkId
  )
}

/**
 * Vérifie si deux segments se chevauchent
 */
function segmentsOverlap(
  segment1: readonly [Point, Point],
  segment2: readonly [Point, Point]
): boolean {
  // Vérification basique de chevauchement
  const tolerance = 0.1
  
  const distance1to2Start = Math.hypot(
    segment1[0].x - segment2[0].x,
    segment1[0].y - segment2[0].y
  )
  const distance1to2End = Math.hypot(
    segment1[1].x - segment2[1].x,
    segment1[1].y - segment2[1].y
  )
  
  return distance1to2Start < tolerance && distance1to2End < tolerance
}

/**
 * Valide qu'un lien vertical peut être créé sans conflit
 */
export function validateVerticalLinkCreation(
  state: EditorState,
  segment: readonly [Point, Point],
  currentFloorId: string
): { valid: boolean; reason?: string } {
  const currentFloor = state.floors.find(f => f.id === currentFloorId)
  if (!currentFloor) {
    return { valid: false, reason: "Étage courant introuvable" }
  }
  
  // Vérifier les collisions avec les liens existants
  const hasCollision = currentFloor.verticalLinks.some(link => 
    segmentsOverlap(link.segment, segment)
  )
  
  if (hasCollision) {
    return { valid: false, reason: "Collision avec un lien vertical existant" }
  }
  
  return { valid: true }
}