/**
 * Hook pour créer des œuvres d'art par drag
 * - Tracé rectangle par drag (zone d'œuvre)
 * - Validation en temps réel (taille min, dans room, pas de chevauchement)
 * - Ouvre modal pour ajouter info (titre, PDF, etc.) à la fin
 */

import { useState, useCallback, type MouseEvent } from 'react'
import type { Point, Floor, Artwork } from '@/core/entities'
import { snapToGrid, distance } from '@/core/services'
import { validateArtworkPlacement } from '@/core/services'
import { GRID_SIZE, CONSTRAINTS } from '@/core/constants'

export interface ArtworkCreationState {
  isCreating: boolean
  startPoint: Point | null
  currentPoint: Point | null
  isValid: boolean
  validationMessage: string | null
  validationSeverity: 'error' | 'warning' | 'info' | null
}

interface UseArtworkCreationProps {
  currentFloor: Floor
  onComplete: (xy: readonly [number, number], size: readonly [number, number]) => void
}

export function useArtworkCreation({ currentFloor, onComplete }: UseArtworkCreationProps) {
  const [state, setState] = useState<ArtworkCreationState>({
    isCreating: false,
    startPoint: null,
    currentPoint: null,
    isValid: true,
    validationMessage: null,
    validationSeverity: null
  })

  /**
   * Démarrer la création
   */
  const startCreation = useCallback((worldPos: Point) => {
    const snappedPos = snapToGrid(worldPos, GRID_SIZE)
    
    setState({
      isCreating: true,
      startPoint: snappedPos,
      currentPoint: snappedPos,
      isValid: true,
      validationMessage: null,
      validationSeverity: null
    })
  }, [])

  /**
   * Mettre à jour le point courant (durant le drag)
   */
  const updateCurrentPoint = useCallback((worldPos: Point) => {
    if (!state.startPoint) return

    const snappedPos = snapToGrid(worldPos, GRID_SIZE)

    // Calculer position et taille
    const minX = Math.min(state.startPoint.x, snappedPos.x)
    const maxX = Math.max(state.startPoint.x, snappedPos.x)
    const minY = Math.min(state.startPoint.y, snappedPos.y)
    const maxY = Math.max(state.startPoint.y, snappedPos.y)

    const width = maxX - minX
    const height = maxY - minY

    // Artwork temporaire pour validation
    const tempArtwork: Artwork = {
      id: 'temp',
      xy: [minX, minY],
      size: [width, height],
      name: '',
      pdf_id: ''
    }

    // Valider
    const validation = validateArtworkPlacement(tempArtwork, { floor: currentFloor })

    setState(prev => ({
      ...prev,
      currentPoint: snappedPos,
      isValid: validation.valid,
      validationMessage: validation.message || null,
      validationSeverity: validation.severity || null
    }))
  }, [state.startPoint, currentFloor])

  /**
   * Terminer la création
   */
  const finishCreation = useCallback(() => {
    if (!state.startPoint || !state.currentPoint || !state.isValid) {
      cancelCreation()
      return
    }

    const minX = Math.min(state.startPoint.x, state.currentPoint.x)
    const maxX = Math.max(state.startPoint.x, state.currentPoint.x)
    const minY = Math.min(state.startPoint.y, state.currentPoint.y)
    const maxY = Math.max(state.startPoint.y, state.currentPoint.y)

    const width = maxX - minX
    const height = maxY - minY

    // Validation finale
    const tempArtwork: Artwork = {
      id: 'temp',
      xy: [minX, minY],
      size: [width, height],
      name: '',
      pdf_id: ''
    }

    const validation = validateArtworkPlacement(tempArtwork, { floor: currentFloor })

    if (!validation.valid || validation.severity === 'error') {
      cancelCreation()
      return
    }

    // Compléter avec le callback (qui ouvrira le modal)
    onComplete([minX, minY] as const, [width, height] as const)

    // Réinitialiser
    setState({
      isCreating: false,
      startPoint: null,
      currentPoint: null,
      isValid: true,
      validationMessage: null,
      validationSeverity: null
    })
  }, [state.isCreating, state.startPoint, state.currentPoint, state.isValid, currentFloor, onComplete])

  /**
   * Annuler la création
   */
  const cancelCreation = useCallback(() => {
    setState({
      isCreating: false,
      startPoint: null,
      currentPoint: null,
      isValid: true,
      validationMessage: null,
      validationSeverity: null
    })
  }, [])

  return {
    state,
    startCreation,
    updateCurrentPoint,
    finishCreation,
    cancelCreation
  }
}
