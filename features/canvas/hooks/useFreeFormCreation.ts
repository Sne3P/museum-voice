/**
 * Hook pour gérer la création de formes libres (polygones custom)
 * - Création point par point avec clic
 * - Preview en temps réel
 * - Validation continue
 * - Double-clic ou Echap pour terminer
 */

import { useState, useCallback, useEffect } from 'react'
import type { Point, Room, Floor } from '@/core/entities'
import { snapToGrid, distance } from '@/core/services'
import { validateRoomGeometry } from '@/core/services'
import { GRID_SIZE, CONSTRAINTS } from '@/core/constants'

export interface FreeFormState {
  isCreating: boolean
  points: Point[]
  hoverPoint: Point | null
  isValid: boolean
  validationMessage: string | null
  validationSeverity: 'error' | 'warning' | 'info' | null
  canClose: boolean // Si on peut fermer le polygone
}

interface UseFreeFormCreationProps {
  currentFloor: Floor
  onComplete: (polygon: Point[]) => void
  onCancel?: () => void
}

export function useFreeFormCreation({ 
  currentFloor, 
  onComplete, 
  onCancel 
}: UseFreeFormCreationProps) {
  const [state, setState] = useState<FreeFormState>({
    isCreating: false,
    points: [],
    hoverPoint: null,
    isValid: true,
    validationMessage: null,
    validationSeverity: null,
    canClose: false
  })

  /**
   * Démarre la création
   */
  const startCreation = useCallback((point: Point) => {
    const snapped = snapToGrid(point, GRID_SIZE)
    setState({
      isCreating: true,
      points: [snapped],
      hoverPoint: null,
      isValid: true,
      validationMessage: 'Cliquez pour ajouter des points',
      validationSeverity: 'info',
      canClose: false
    })
  }, [])

  /**
   * Ajoute un point au polygone
   */
  const addPoint = useCallback((point: Point) => {
    if (!state.isCreating) {
      // Premier point
      startCreation(point)
      return
    }

    const snapped = snapToGrid(point, GRID_SIZE)
    const newPoints = [...state.points, snapped]

    // Vérifier si on peut fermer (au moins 3 points)
    const canClose = newPoints.length >= 3

    // Si on clique près du premier point, fermer automatiquement
    if (canClose && distance(snapped, state.points[0]) < GRID_SIZE * 0.5) {
      finishCreation()
      return
    }

    // Validation du polygone en cours
    let isValid = true
    let validationMessage = `${newPoints.length} points`
    let validationSeverity: 'error' | 'warning' | 'info' = 'info'

    if (canClose) {
      const tempRoom: Room = {
        id: 'preview',
        polygon: newPoints
      }
      
      const validation = validateRoomGeometry(tempRoom, {
        floor: currentFloor,
        strictMode: false,
        allowWarnings: true
      })

      isValid = validation.valid || validation.severity !== 'error'
      validationMessage = validation.message || validationMessage
      validationSeverity = validation.severity
    }

    setState(prev => ({
      ...prev,
      points: newPoints,
      isValid,
      validationMessage,
      validationSeverity,
      canClose
    }))
  }, [state.isCreating, state.points, currentFloor, startCreation])

  /**
   * Met à jour le point de hover
   */
  const updateHover = useCallback((point: Point | null) => {
    if (!state.isCreating || !point) {
      setState(prev => ({ ...prev, hoverPoint: null }))
      return
    }

    const snapped = snapToGrid(point, GRID_SIZE)
    
    // Vérifier si on hover le premier point (pour fermer)
    const hoverFirstPoint = state.points.length >= 3 && 
      distance(snapped, state.points[0]) < GRID_SIZE * 0.5

    setState(prev => ({
      ...prev,
      hoverPoint: snapped,
      validationMessage: hoverFirstPoint 
        ? 'Cliquez pour fermer le polygone' 
        : prev.validationMessage
    }))
  }, [state.isCreating, state.points])

  /**
   * Termine la création
   */
  const finishCreation = useCallback(() => {
    if (!state.isCreating || state.points.length < 3) {
      cancelCreation()
      return
    }

    // Validation finale
    const tempRoom: Room = {
      id: 'final',
      polygon: state.points
    }
    
    const validation = validateRoomGeometry(tempRoom, {
      floor: currentFloor,
      strictMode: true,
      allowWarnings: false
    })

    if (validation.valid || validation.severity !== 'error') {
      onComplete(state.points)
      setState({
        isCreating: false,
        points: [],
        hoverPoint: null,
        isValid: true,
        validationMessage: null,
        validationSeverity: null,
        canClose: false
      })
    } else {
      // Erreur, ne pas terminer
      setState(prev => ({
        ...prev,
        isValid: false,
        validationMessage: validation.message || 'Impossible de créer la pièce',
        validationSeverity: 'error'
      }))
    }
  }, [state.isCreating, state.points, currentFloor, onComplete])

  /**
   * Annule la création
   */
  const cancelCreation = useCallback(() => {
    setState({
      isCreating: false,
      points: [],
      hoverPoint: null,
      isValid: true,
      validationMessage: null,
      validationSeverity: null,
      canClose: false
    })
    onCancel?.()
  }, [onCancel])

  /**
   * Supprime le dernier point (undo)
   */
  const removeLastPoint = useCallback(() => {
    if (state.points.length <= 1) {
      cancelCreation()
      return
    }

    const newPoints = state.points.slice(0, -1)
    setState(prev => ({
      ...prev,
      points: newPoints,
      canClose: newPoints.length >= 3
    }))
  }, [state.points, cancelCreation])

  // Gestion des touches clavier
  useEffect(() => {
    if (!state.isCreating) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelCreation()
      } else if (e.key === 'Enter' && state.canClose) {
        finishCreation()
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault()
        removeLastPoint()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.isCreating, state.canClose, cancelCreation, finishCreation, removeLastPoint])

  return {
    state,
    addPoint,
    updateHover,
    finishCreation,
    cancelCreation,
    removeLastPoint
  }
}
