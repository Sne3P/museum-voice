/**
 * HOOK POUR DRAG DES VERTICES DE VERTICAL LINKS
 * Gère le déplacement des coins du rectangle avec contraintes
 */

import { useState, useCallback } from 'react'
import type { Point, EditorState, Floor, VerticalLink } from '@/core/entities'
import {
  updateVerticalLinkCorner,
  validateVerticalLinkCornerMove
} from '@/core/services/vertical-link-vertex.service'
import { snapToGrid } from '@/core/services'
import { GRID_SIZE } from '@/core/constants'

interface VertexDragState {
  verticalLinkId: string
  vertexIndex: number
  startPoint: Point
  originalFloors: readonly Floor[]
}

interface UseVerticalLinkVertexDragProps {
  state: EditorState
  currentFloor: Floor
  updateState: (updates: Partial<EditorState>, saveHistory?: boolean) => void
}

export function useVerticalLinkVertexDrag({
  state,
  currentFloor,
  updateState
}: UseVerticalLinkVertexDragProps) {
  const [dragState, setDragState] = useState<VertexDragState | null>(null)
  const [isValid, setIsValid] = useState<boolean>(true)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)

  /**
   * Démarrer le drag d'un vertex
   */
  const startDrag = useCallback(
    (verticalLinkId: string, vertexIndex: number, startPoint: Point) => {
      setDragState({
        verticalLinkId,
        vertexIndex,
        startPoint,
        originalFloors: state.floors
      })
      setIsValid(true)
      setValidationMessage(null)
    },
    [state.floors]
  )

  /**
   * Mettre à jour la position pendant le drag
   */
  const updateDrag = useCallback(
    (currentPoint: Point) => {
      if (!dragState) return

      // Snap à la grille
      const snappedPoint = snapToGrid(currentPoint, GRID_SIZE)

      // Trouver le link
      const link = currentFloor.verticalLinks?.find((v: VerticalLink) => v.id === dragState.verticalLinkId)
      if (!link) {
        setIsValid(false)
        return
      }

      // Valider le déplacement
      const validation = validateVerticalLinkCornerMove(
        link,
        dragState.vertexIndex,
        snappedPoint,
        currentFloor
      )

      setIsValid(validation.valid)
      setValidationMessage(validation.message ?? null)

      if (!validation.valid) {
        return
      }

      // Appliquer la transformation
      const updatedLink = updateVerticalLinkCorner(link, dragState.vertexIndex, snappedPoint)

      const updatedFloors = state.floors.map((floor: Floor) => {
        if (floor.id !== currentFloor.id) return floor

        return {
          ...floor,
          verticalLinks: floor.verticalLinks?.map((v: VerticalLink) =>
            v.id === dragState.verticalLinkId ? updatedLink : v
          )
        }
      })

      updateState({ floors: updatedFloors }, false) // Pas d'historique pendant drag
    },
    [dragState, currentFloor, state.floors, updateState]
  )

  /**
   * Terminer le drag
   */
  const endDrag = useCallback(
    (finalPoint: Point) => {
      if (!dragState) return

      // Snap final
      const snappedPoint = snapToGrid(finalPoint, GRID_SIZE)

      // Trouver le link dans l'état ORIGINAL
      const originalFloor = dragState.originalFloors.find(f => f.id === currentFloor.id)
      const originalLink = originalFloor?.verticalLinks?.find((v: VerticalLink) => v.id === dragState.verticalLinkId)

      if (!originalLink) {
        cancelDrag()
        return
      }

      // Valider le déplacement final
      const validation = validateVerticalLinkCornerMove(
        originalLink,
        dragState.vertexIndex,
        snappedPoint,
        currentFloor
      )

      if (!validation.valid) {
        // Annuler : restaurer l'état original
        updateState({ floors: dragState.originalFloors }, false)
        setDragState(null)
        setIsValid(true)
        setValidationMessage(null)
        return
      }

      // Appliquer la transformation finale
      const updatedLink = updateVerticalLinkCorner(originalLink, dragState.vertexIndex, snappedPoint)

      const updatedFloors = dragState.originalFloors.map((floor: Floor) => {
        if (floor.id !== currentFloor.id) return floor

        return {
          ...floor,
          verticalLinks: floor.verticalLinks?.map((v: VerticalLink) =>
            v.id === dragState.verticalLinkId ? updatedLink : v
          )
        }
      })

      updateState({ floors: updatedFloors }, true) // AVEC historique
      setDragState(null)
      setIsValid(true)
      setValidationMessage(null)
    },
    [dragState, currentFloor, updateState]
  )

  /**
   * Annuler le drag (ESC, clic droit, etc.)
   */
  const cancelDrag = useCallback(() => {
    if (!dragState) return

    // Restaurer l'état original
    updateState({ floors: dragState.originalFloors }, false)
    setDragState(null)
    setIsValid(true)
    setValidationMessage(null)
  }, [dragState, updateState])

  return {
    isDragging: dragState !== null,
    isValid,
    validationMessage,
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag
  }
}
