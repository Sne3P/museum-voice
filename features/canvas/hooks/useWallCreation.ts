/**
 * HOOK CRÉATION MURS INTÉRIEURS
 * Gestion du tracé drag-based des murs avec validation en temps réel
 */

import { useState, useCallback } from 'react'
import type { Point, Wall, Floor } from '@/core/entities'
import { snapToGrid, validateWallPlacement, findRoomContainingWall } from '@/core/services'
import { GRID_SIZE } from '@/core/constants'

interface WallCreationState {
  isCreating: boolean
  startPoint: Point | null
  currentPoint: Point | null
  previewWall: Wall | null
  validation: any | null
}

interface UseWallCreationOptions {
  currentFloor: Floor
  onComplete: (wall: Wall) => void
}

export function useWallCreation({ currentFloor, onComplete }: UseWallCreationOptions) {
  const [state, setState] = useState<WallCreationState>({
    isCreating: false,
    startPoint: null,
    currentPoint: null,
    previewWall: null,
    validation: null
  })

  /**
   * Démarrer la création d'un mur
   */
  const startCreation = useCallback((worldPoint: Point) => {
    const snappedPoint = snapToGrid(worldPoint, GRID_SIZE)
    
    setState({
      isCreating: true,
      startPoint: snappedPoint,
      currentPoint: snappedPoint,
      previewWall: null,
      validation: null
    })
  }, [])

  /**
   * Mettre à jour le point actuel pendant le drag
   */
  const updateCreation = useCallback((worldPoint: Point) => {
    if (!state.isCreating || !state.startPoint) return

    const snappedPoint = snapToGrid(worldPoint, GRID_SIZE)
    
    // Créer le mur preview avec la pièce contenant
    const tempWall: Wall = {
      id: 'preview',
      segment: [state.startPoint, snappedPoint],
      thickness: 0.15, // WALL_THICKNESS.INTERIOR
      isLoadBearing: false
    }
    
    const containingRoom = findRoomContainingWall(tempWall, currentFloor)
    const previewWall: Wall = {
      ...tempWall,
      roomId: containingRoom?.id
    }

    // Valider le mur
    const validation = validateWallPlacement(previewWall, { floor: currentFloor })

    setState(prev => ({
      ...prev,
      currentPoint: snappedPoint,
      previewWall,
      validation
    }))
  }, [state.isCreating, state.startPoint, currentFloor])

  /**
   * Terminer la création du mur
   */
  const completeCreation = useCallback(() => {
    if (!state.previewWall || !state.startPoint || !state.currentPoint) {
      cancelCreation()
      return
    }

    // Vérifier distance minimum (1 carré = 40px)
    const dx = state.currentPoint.x - state.startPoint.x
    const dy = state.currentPoint.y - state.startPoint.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance < GRID_SIZE) {
      // Trop court, annuler
      cancelCreation()
      return
    }

    // ANNULER si validation échoue
    if (state.validation && !state.validation.valid) {
      cancelCreation()
      return
    }

    // Import du service cascade
    const { attachWallToRoom } = require('@/core/services/cascade.service')
    
    // Créer le mur final avec nouvel ID
    const tempWall: Wall = {
      ...state.previewWall,
      id: `wall-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }
    
    // Attacher automatiquement à la room parente
    const finalWall = attachWallToRoom(tempWall, currentFloor)

    onComplete(finalWall)
    
    setState({
      isCreating: false,
      startPoint: null,
      currentPoint: null,
      previewWall: null,
      validation: null
    })
  }, [state, onComplete])

  /**
   * Annuler la création
   */
  const cancelCreation = useCallback(() => {
    setState({
      isCreating: false,
      startPoint: null,
      currentPoint: null,
      previewWall: null,
      validation: null
    })
  }, [])

  return {
    state,
    startCreation,
    updateCreation,
    completeCreation,
    cancelCreation
  }
}
