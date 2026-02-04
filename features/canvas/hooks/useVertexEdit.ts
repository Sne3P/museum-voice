/**
 * Hook pour gérer l'édition de vertices et segments de rooms
 * Permet de modifier la forme des pièces en déplaçant leurs vertices ou segments
 * Support: vertex unique, segment (2 vertices), multi-vertices
 */

import { useState, useCallback, type MouseEvent } from "react"
import type { Point, EditorState, Floor, Room } from "@/core/entities"
import { HISTORY_ACTIONS } from "@/core/constants"
import { updateVertexInPolygon, calculateDelta } from "@/core/services"
import { snapToGrid, smartSnap } from "@/core/services"
import { validateRoomGeometry, validateRoomMoveWithDoors, isPointInPolygon, validateArtworkPlacement } from "@/core/services"
import { validateRoomModificationWithWalls } from "@/core/services/cascade.service"
import { GRID_SIZE } from "@/core/constants"

interface VertexEditOptions {
  state: EditorState
  currentFloor: Floor
  updateState: (updates: Partial<EditorState>, saveHistory?: boolean, description?: string) => void
  screenToWorld: (x: number, y: number) => Point
}

interface EditState {
  isEditing: boolean
  editMode: 'vertex' | 'segment'
  roomId: string | null
  vertexIndices: number[]  // Pour segment: contient 2 indices
  originalPolygon: Point[] | null
  newPolygon: Point[] | null
  startPosition: Point | null  // Position de départ du drag
  isValid: boolean
  validationMessage: string | null
  snapInfo: {
    snapType: 'vertex' | 'edge' | 'midpoint' | 'grid' | null
    snapPoint: Point | null
  }
}

export function useVertexEdit({
  state,
  currentFloor,
  updateState,
  screenToWorld
}: VertexEditOptions) {
  const [editState, setEditState] = useState<EditState>({
    isEditing: false,
    editMode: 'vertex',
    roomId: null,
    vertexIndices: [],
    originalPolygon: null,
    newPolygon: null,
    startPosition: null,
    isValid: true,
    validationMessage: null,
    snapInfo: {
      snapType: null,
      snapPoint: null
    }
  })

  /**
   * Démarrer l'édition d'un vertex unique
   */
  const startEdit = useCallback((roomId: string, vertexIndex: number, initialMousePos: Point) => {
    const room = currentFloor.rooms.find(r => r.id === roomId)
    if (!room) return

    setEditState({
      isEditing: true,
      editMode: 'vertex',
      roomId,
      vertexIndices: [vertexIndex],
      originalPolygon: [...room.polygon],
      newPolygon: [...room.polygon],
      startPosition: initialMousePos,  // Position de la souris au clic
      isValid: true,
      validationMessage: null,
      snapInfo: {
        snapType: null,
        snapPoint: null
      }
    })
  }, [currentFloor])

  /**
   * Démarrer l'édition d'un segment (2 vertices)
   */
  const startSegmentEdit = useCallback((roomId: string, vertexIndex1: number, vertexIndex2: number, initialMousePos: Point) => {
    const room = currentFloor.rooms.find(r => r.id === roomId)
    if (!room) return

    // Calculer le centre du segment
    const p1 = room.polygon[vertexIndex1]
    const p2 = room.polygon[vertexIndex2 % room.polygon.length]
    const centerRaw = {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2
    }

    // IMPORTANT: Snap la position initiale pour cohérence avec les snaps futurs
    const snappedInitialPos = snapToGrid(initialMousePos, GRID_SIZE)

    setEditState({
      isEditing: true,
      editMode: 'segment',
      roomId,
      vertexIndices: [vertexIndex1, vertexIndex2 % room.polygon.length],
      originalPolygon: [...room.polygon],
      newPolygon: [...room.polygon],
      startPosition: snappedInitialPos,  // Position snappée pour cohérence
      isValid: true,
      validationMessage: null,
      snapInfo: {
        snapType: null,
        snapPoint: null
      }
    })
  }, [currentFloor])

  /**
   * Mettre à jour la position pendant le drag
   */
  const updateVertex = useCallback((e: MouseEvent<HTMLCanvasElement>, useSmartSnap: boolean = true) => {
    if (!editState.isEditing || editState.roomId === null || editState.vertexIndices.length === 0) return

    const worldPos = screenToWorld(e.clientX, e.clientY)
    
    // Snap intelligent (vertex, edge, midpoint, grid) ou simple snap grille
    let snappedPos: Point
    let snapType: 'vertex' | 'edge' | 'midpoint' | 'grid' | null = null
    
    if (useSmartSnap) {
      const snapResult = smartSnap(worldPos, currentFloor, {
        snapDistance: 20 / state.zoom
      })
      snappedPos = snapResult.point
      snapType = snapResult.snapType === 'none' ? null : snapResult.snapType
    } else {
      // Snap grille simple
      snappedPos = snapToGrid(worldPos, GRID_SIZE)
      snapType = 'grid'
    }
    
    // Calculer le delta de déplacement
    const delta = calculateDelta(editState.startPosition!, snappedPos)
    
    // Créer le nouveau polygone selon le mode
    let newPolygon: Point[]
    
    if (editState.editMode === 'vertex') {
      // Mode vertex unique: remplacer le vertex par la nouvelle position
      newPolygon = updateVertexInPolygon(
        editState.originalPolygon!,
        editState.vertexIndices[0],
        snappedPos
      )
    } else {
      // Mode segment: appliquer le delta aux 2 vertices du segment
      newPolygon = editState.originalPolygon!.map((point, index) => {
        if (editState.vertexIndices.includes(index)) {
          const newPoint = {
            x: point.x + delta.x,
            y: point.y + delta.y
          }
          // IMPORTANT: Snap chaque vertex après application du delta
          return snapToGrid(newPoint, GRID_SIZE)
        }
        return point
      })
    }
    
    // Créer la room temporaire pour validation
    const tempRoom: Room = {
      ...currentFloor.rooms.find(r => r.id === editState.roomId)!,
      polygon: newPolygon
    }
    
    // Valider la géométrie ET les murs enfants
    const geometryValidation = validateRoomGeometry(tempRoom, {
      floor: currentFloor,
      strictMode: true
    })
    
    // NOUVEAU: Vérifier que les portes restent valides
    const doorValidation = validateRoomMoveWithDoors(editState.roomId!, newPolygon, currentFloor)
    
    // Vérifier que les murs restent dans la room
    const wallsValidation = validateRoomModificationWithWalls(tempRoom, currentFloor)
    
    // NOUVEAU: Vérifier que les artworks restent dans la room après modification
    let artworksValidation = { valid: true, reason: null as string | null }
    const roomArtworks = currentFloor.artworks?.filter(a => {
      if (a.roomId === editState.roomId) return true
      // Fallback: vérifier si le centre de l'artwork était dans la room originale
      const originalRoom = currentFloor.rooms.find(r => r.id === editState.roomId)
      if (!originalRoom || originalRoom.polygon.length < 3) return false
      const sizeW = a.size ? a.size[0] : 0
      const sizeH = a.size ? a.size[1] : 0
      const center = { x: a.xy[0] + sizeW / 2, y: a.xy[1] + sizeH / 2 }
      return isPointInPolygon(center, originalRoom.polygon)
    }) || []
    
    for (const artwork of roomArtworks) {
      const artworkCheck = validateArtworkPlacement(artwork, {
        floor: { ...currentFloor, rooms: currentFloor.rooms.map(r => r.id === editState.roomId ? tempRoom : r) },
        excludeIds: [artwork.id]
      })
      if (!artworkCheck.valid) {
        artworksValidation = { valid: false, reason: artworkCheck.message || 'Œuvres hors de la pièce' }
        break
      }
    }
    
    const validation = !geometryValidation.valid 
      ? geometryValidation
      : !doorValidation.valid
      ? { valid: false, message: doorValidation.message }
      : !wallsValidation.valid
      ? { 
          valid: false, 
          severity: 'error' as const,
          code: 'WALLS_OUT_OF_BOUNDS',
          message: wallsValidation.reason || 'Murs hors limites'
        }
      : !artworksValidation.valid
      ? {
          valid: false,
          severity: 'error' as const,
          code: 'ARTWORKS_OUT_OF_BOUNDS',
          message: artworksValidation.reason || 'Œuvres hors de la pièce'
        }
      : geometryValidation
    
    // Mettre à jour les floors temporairement (sans historique)
    const updatedFloors = state.floors.map(floor => {
      if (floor.id !== currentFloor.id) return floor
      
      return {
        ...floor,
        rooms: floor.rooms.map(room => 
          room.id === editState.roomId
            ? { ...room, polygon: newPolygon }
            : room
        )
      }
    })
    
    updateState({ floors: updatedFloors }, false)
    
    setEditState(prev => ({
      ...prev,
      newPolygon,
      isValid: validation.valid,
      validationMessage: validation.message ?? null,
      snapInfo: {
        snapType,
        snapPoint: snappedPos
      }
    }))
  }, [editState, state.floors, state.zoom, currentFloor, screenToWorld, updateState])

  /**
   * Terminer l'édition
   */
  const finishEdit = useCallback(() => {
    if (!editState.isEditing || editState.roomId === null) return

    if (editState.isValid && editState.newPolygon) {
      // Sauvegarder dans l'historique avec description adaptée
      const description = editState.editMode === 'vertex' 
        ? HISTORY_ACTIONS.EDIT_VERTEX
        : editState.editMode === 'segment'
        ? HISTORY_ACTIONS.EDIT_SEGMENT
        : HISTORY_ACTIONS.EDIT_VERTEX
      
      updateState({}, true, description)
    } else {
      // Restaurer le polygone original
      const updatedFloors = state.floors.map(floor => {
        if (floor.id !== currentFloor.id) return floor
        
        return {
          ...floor,
          rooms: floor.rooms.map(room => 
            room.id === editState.roomId
              ? { ...room, polygon: editState.originalPolygon! }
              : room
          )
        }
      })
      
      updateState({ floors: updatedFloors }, false)
    }
    
    setEditState({
      isEditing: false,
      editMode: 'vertex',
      roomId: null,
      vertexIndices: [],
      originalPolygon: null,
      newPolygon: null,
      startPosition: null,
      isValid: true,
      validationMessage: null,
      snapInfo: {
        snapType: null,
        snapPoint: null
      }
    })
  }, [editState, state.floors, currentFloor, updateState])

  /**
   * Annuler l'édition
   */
  const cancelEdit = useCallback(() => {
    if (!editState.isEditing || editState.roomId === null) return

    // Restaurer le polygone original
    const updatedFloors = state.floors.map(floor => {
      if (floor.id !== currentFloor.id) return floor
      
      return {
        ...floor,
        rooms: floor.rooms.map(room => 
          room.id === editState.roomId
            ? { ...room, polygon: editState.originalPolygon! }
            : room
        )
      }
    })
    
    updateState({ floors: updatedFloors }, false)
    
    setEditState({
      isEditing: false,
      editMode: 'vertex',
      roomId: null,
      vertexIndices: [],
      originalPolygon: null,
      newPolygon: null,
      startPosition: null,
      isValid: true,
      validationMessage: null,
      snapInfo: {
        snapType: null,
        snapPoint: null
      }
    })
  }, [editState, state.floors, currentFloor, updateState])

  return {
    editState,
    startEdit,
    startSegmentEdit,
    updateVertex,
    finishEdit,
    cancelEdit
  }
}
