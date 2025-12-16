/**
 * SERVICE DE SÉLECTION INTELLIGENTE
 * 
 * Gère la continuité et la logique de sélection :
 * - 2 segments adjacents → ajoute le vertex entre eux
 * - 2 vertices consécutifs → ajoute le segment qui les relie
 * - Tous les segments d'une forme → sélectionne la forme entière
 */

import type { SelectedElement, Floor, Room } from '@/core/entities'

/**
 * Analyse la sélection et ajoute automatiquement les éléments manquants pour la continuité
 */
export function applySmartSelection(
  selectedElements: SelectedElement[],
  currentFloor: Floor
): SelectedElement[] {
  const enhanced = [...selectedElements]
  
  // 1. Si 2 segments sont adjacents, ajouter le vertex entre eux
  const addedVertices = findVerticesBetweenSegments(selectedElements, currentFloor)
  addedVertices.forEach(vertex => {
    if (!isElementSelected(enhanced, vertex)) {
      enhanced.push(vertex)
    }
  })
  
  // 2. Si 2 vertices consécutifs, ajouter le segment entre eux
  const addedSegments = findSegmentsBetweenVertices(selectedElements, currentFloor)
  addedSegments.forEach(segment => {
    if (!isElementSelected(enhanced, segment)) {
      enhanced.push(segment)
    }
  })
  
  // 3. Si tous les segments d'une forme sont sélectionnés, sélectionner la forme
  const rooms = findCompleteRooms(enhanced, currentFloor)
  rooms.forEach(room => {
    if (!isElementSelected(enhanced, room)) {
      enhanced.push(room)
    }
  })
  
  return enhanced
}

/**
 * Vérifie si un élément est déjà sélectionné
 */
function isElementSelected(selected: SelectedElement[], element: SelectedElement): boolean {
  return selected.some(sel => {
    if (sel.type !== element.type) return false
    if (sel.id !== element.id) return false
    
    // Pour vertices
    if (sel.type === 'vertex' && element.type === 'vertex') {
      return sel.vertexIndex === element.vertexIndex && sel.roomId === element.roomId
    }
    
    // Pour segments
    if (sel.type === 'segment' && element.type === 'segment') {
      return sel.segmentIndex === element.segmentIndex && sel.roomId === element.roomId
    }
    
    return true
  })
}

/**
 * Trouve les vertices situés entre deux segments adjacents
 */
function findVerticesBetweenSegments(
  selected: SelectedElement[],
  floor: Floor
): SelectedElement[] {
  const vertices: SelectedElement[] = []
  const segments = selected.filter(sel => sel.type === 'segment')
  
  // Grouper les segments par room
  const segmentsByRoom = new Map<string, SelectedElement[]>()
  segments.forEach(seg => {
    if (seg.roomId) {
      const list = segmentsByRoom.get(seg.roomId) || []
      list.push(seg)
      segmentsByRoom.set(seg.roomId, list)
    }
  })
  
  // Pour chaque room, trouver les segments adjacents
  segmentsByRoom.forEach((roomSegments, roomId) => {
    const room = floor.rooms.find(r => r.id === roomId)
    if (!room) return
    
    const segmentIndices = roomSegments.map(s => s.segmentIndex!).sort((a, b) => a - b)
    
    for (let i = 0; i < segmentIndices.length - 1; i++) {
      const seg1 = segmentIndices[i]
      const seg2 = segmentIndices[i + 1]
      
      // Segments consécutifs : le vertex entre eux est seg2
      // Segment i va de vertex[i] à vertex[i+1]
      // Donc si on a segment 0 et segment 1 sélectionnés,
      // le vertex partagé est vertex[1]
      if (seg2 === seg1 + 1) {
        vertices.push({
          type: 'vertex',
          id: roomId,
          roomId: roomId,
          vertexIndex: seg2
        })
      }
    }
    
    // Cas spécial : dernier segment (n-1) et premier segment (0)
    if (segmentIndices.includes(room.polygon.length - 1) && segmentIndices.includes(0)) {
      vertices.push({
        type: 'vertex',
        id: roomId,
        roomId: roomId,
        vertexIndex: 0
      })
    }
  })
  
  return vertices
}

/**
 * Trouve les segments reliant deux vertices consécutifs
 */
function findSegmentsBetweenVertices(
  selected: SelectedElement[],
  floor: Floor
): SelectedElement[] {
  const segments: SelectedElement[] = []
  const vertices = selected.filter(sel => sel.type === 'vertex')
  
  // Grouper les vertices par room
  const verticesByRoom = new Map<string, SelectedElement[]>()
  vertices.forEach(v => {
    if (v.roomId) {
      const list = verticesByRoom.get(v.roomId) || []
      list.push(v)
      verticesByRoom.set(v.roomId, list)
    }
  })
  
  // Pour chaque room, trouver les vertices consécutifs
  verticesByRoom.forEach((roomVertices, roomId) => {
    const room = floor.rooms.find(r => r.id === roomId)
    if (!room) return
    
    const vertexIndices = roomVertices.map(v => v.vertexIndex!).sort((a, b) => a - b)
    
    for (let i = 0; i < vertexIndices.length - 1; i++) {
      const v1 = vertexIndices[i]
      const v2 = vertexIndices[i + 1]
      
      // Vertices consécutifs : le segment entre eux a l'index du premier
      if (v2 === v1 + 1) {
        segments.push({
          type: 'segment',
          id: roomId,
          roomId: roomId,
          segmentIndex: v1
        })
      }
    }
    
    // Cas spécial : dernier vertex et premier vertex
    if (vertexIndices.includes(room.polygon.length - 1) && vertexIndices.includes(0)) {
      segments.push({
        type: 'segment',
        id: roomId,
        roomId: roomId,
        segmentIndex: room.polygon.length - 1
      })
    }
  })
  
  return segments
}

/**
 * Trouve les rooms dont tous les segments sont sélectionnés
 */
function findCompleteRooms(
  selected: SelectedElement[],
  floor: Floor
): SelectedElement[] {
  const rooms: SelectedElement[] = []
  const segments = selected.filter(sel => sel.type === 'segment')
  
  // Grouper par room
  const segmentsByRoom = new Map<string, Set<number>>()
  segments.forEach(seg => {
    if (seg.roomId && seg.segmentIndex !== undefined) {
      const set = segmentsByRoom.get(seg.roomId) || new Set()
      set.add(seg.segmentIndex)
      segmentsByRoom.set(seg.roomId, set)
    }
  })
  
  // Vérifier si tous les segments sont sélectionnés
  segmentsByRoom.forEach((segmentIndices, roomId) => {
    const room = floor.rooms.find(r => r.id === roomId)
    if (!room) return
    
    // Si on a autant de segments sélectionnés que de segments dans le polygon
    if (segmentIndices.size === room.polygon.length) {
      rooms.push({
        type: 'room',
        id: roomId
      })
    }
  })
  
  return rooms
}

/**
 * Nettoie la sélection : si une room complète est sélectionnée, retire ses segments/vertices
 */
export function cleanRedundantSelection(
  selectedElements: SelectedElement[]
): SelectedElement[] {
  const roomIds = new Set(
    selectedElements
      .filter(sel => sel.type === 'room')
      .map(sel => sel.id)
  )
  
  // Si une room est sélectionnée, supprimer tous ses vertices et segments
  return selectedElements.filter(sel => {
    if (sel.type === 'vertex' || sel.type === 'segment') {
      return !roomIds.has(sel.roomId || '')
    }
    return true
  })
}
