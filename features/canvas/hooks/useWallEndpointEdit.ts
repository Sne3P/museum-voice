/**
 * Hook pour gérer l'édition des vertices de murs
 * Permet de modifier la position/longueur/orientation d'un mur en déplaçant ses vertices (path)
 * Supporte les murs simples (2 points) et multi-points (path)
 */

import { useState, useCallback, type MouseEvent } from "react"
import type { Point, EditorState, Floor, Wall } from "@/core/entities"
import { HISTORY_ACTIONS } from "@/core/constants"
import { snapToGrid, smartSnap } from "@/core/services"
import { validateWallPlacement, findRoomContainingWall } from "@/core/services"
import { GRID_SIZE } from "@/core/constants"

interface WallEndpointEditOptions {
  state: EditorState
  currentFloor: Floor
  updateState: (updates: Partial<EditorState>, saveHistory?: boolean, description?: string) => void
  screenToWorld: (x: number, y: number) => Point
}

interface EditState {
  isEditing: boolean
  wallId: string | null
  vertexIndex: number | null  // Index du vertex dans path (ou 0/1 pour segment)
  originalPath: readonly Point[] | null
  newPath: readonly Point[] | null
  startPosition: Point | null
  isValid: boolean
  validationMessage: string | null
  snapInfo: {
    snapType: 'vertex' | 'edge' | 'midpoint' | 'grid' | null
    snapPoint: Point | null
  }
}

export function useWallEndpointEdit({
  state,
  currentFloor,
  updateState,
  screenToWorld
}: WallEndpointEditOptions) {
  const [editState, setEditState] = useState<EditState>({
    isEditing: false,
    wallId: null,
    vertexIndex: null,
    originalPath: null,
    newPath: null,
    startPosition: null,
    isValid: true,
    validationMessage: null,
    snapInfo: {
      snapType: null,
      snapPoint: null
    }
  })

  /**
   * Démarrer l'édition d'un vertex de mur
   */
  const startEdit = useCallback((wallId: string, vertexIndex: number, initialMousePos: Point) => {
    const wall = (currentFloor.walls || []).find(w => w.id === wallId)
    if (!wall) return

    const snappedInitialPos = snapToGrid(initialMousePos, GRID_SIZE)
    const path = wall.path || [wall.segment[0], wall.segment[1]]

    setEditState({
      isEditing: true,
      wallId,
      vertexIndex,
      originalPath: [...path],
      newPath: [...path],
      startPosition: snappedInitialPos,
      isValid: true,
      validationMessage: null,
      snapInfo: {
        snapType: null,
        snapPoint: null
      }
    })
  }, [currentFloor])

  /**
   * Mettre à jour la position du vertex pendant le drag
   */
  const updateEndpoint = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    if (!editState.isEditing || editState.wallId === null || editState.vertexIndex === null) return

    const wall = (currentFloor.walls || []).find(w => w.id === editState.wallId)
    if (!wall) return

    // Position souris en world coords
    const worldPos = screenToWorld(e.clientX, e.clientY)

    // Smart snap (sauf si Shift appuyé)
    let snappedPos: Point
    let snapType: 'vertex' | 'edge' | 'midpoint' | 'grid' | null = null

    if (e.shiftKey) {
      // Shift : snap grille uniquement
      snappedPos = snapToGrid(worldPos, GRID_SIZE)
      snapType = 'grid'
    } else {
      // Smart snap (vertices, edges, midpoints, grille)
      const snapResult = smartSnap(worldPos, currentFloor)
      snappedPos = snapResult.point
      snapType = snapResult.snapType === 'none' ? null : snapResult.snapType
    }

    // Créer le nouveau path avec le vertex mis à jour
    const newPath = [...(editState.newPath || [])]
    newPath[editState.vertexIndex] = snappedPos

    // Créer le mur mis à jour avec le nouveau path
    const containingRoom = findRoomContainingWall(wall, currentFloor)
    const updatedWall: Wall = {
      ...wall,
      path: newPath,
      segment: [newPath[0], newPath[newPath.length - 1]] as const,
      roomId: containingRoom?.id
    }

    // Valider le nouveau placement
    const validation = validateWallPlacement(updatedWall, {
      floor: currentFloor,
      strictMode: true
    })

    // Mettre à jour le floor TEMPORAIREMENT (sans historique)
    const updatedFloors = state.floors.map(floor => {
      if (floor.id !== currentFloor.id) return floor

      return {
        ...floor,
        walls: (floor.walls || []).map(w =>
          w.id === editState.wallId
            ? updatedWall
            : w
        )
      }
    })

    updateState({ floors: updatedFloors }, false)

    setEditState(prev => ({
      ...prev,
      newPath,
      isValid: validation.valid,
      validationMessage: validation.message ?? null,
      snapInfo: {
        snapType,
        snapPoint: snappedPos
      }
    }))
  }, [editState, state.floors, currentFloor, screenToWorld, updateState])

  /**
   * Terminer l'édition
   */
  const finishEdit = useCallback(() => {
    if (!editState.isEditing || editState.wallId === null) return

    if (editState.isValid && editState.newPath) {
      // Sauvegarder dans l'historique
      updateState({}, true, HISTORY_ACTIONS.EDIT_WALL)
    } else {
      // Restaurer le path original
      const updatedFloors = state.floors.map(floor => {
        if (floor.id !== currentFloor.id) return floor

        return {
          ...floor,
          walls: (floor.walls || []).map(wall =>
            wall.id === editState.wallId
              ? { 
                  ...wall, 
                  path: editState.originalPath!,
                  segment: [editState.originalPath![0], editState.originalPath![editState.originalPath!.length - 1]] as const
                }
              : wall
          )
        }
      })

      updateState({ floors: updatedFloors }, false)
    }

    setEditState({
      isEditing: false,
      wallId: null,
      vertexIndex: null,
      originalPath: null,
      newPath: null,
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
    if (!editState.isEditing || editState.wallId === null) return

    // Restaurer le path original
    const updatedFloors = state.floors.map(floor => {
      if (floor.id !== currentFloor.id) return floor

      return {
        ...floor,
        walls: (floor.walls || []).map(wall =>
          wall.id === editState.wallId
            ? { 
                ...wall, 
                path: editState.originalPath!,
                segment: [editState.originalPath![0], editState.originalPath![editState.originalPath!.length - 1]] as const
              }
            : wall
        )
      }
    })

    updateState({ floors: updatedFloors }, false)

    setEditState({
      isEditing: false,
      wallId: null,
      vertexIndex: null,
      originalPath: null,
      newPath: null,
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
    updateEndpoint,
    finishEdit,
    cancelEdit
  }
}
