/**
 * Hook pour gérer la box selection (zone rectangulaire)
 * - Drag zone sur fond → Sélection multiple
 * - Shift+Drag → Ajouter à sélection existante
 */

import { useState, useCallback } from "react"
import type { Point } from "@/core/entities"

export interface BoxSelectionState {
  isActive: boolean
  startPoint: Point | null
  currentPoint: Point | null
}

export function useBoxSelection() {
  const [state, setState] = useState<BoxSelectionState>({
    isActive: false,
    startPoint: null,
    currentPoint: null
  })

  const startSelection = useCallback((point: Point) => {
    setState({
      isActive: true,
      startPoint: point,
      currentPoint: point
    })
  }, [])

  const updateSelection = useCallback((point: Point) => {
    setState(prev => {
      if (!prev.isActive) return prev
      return {
        ...prev,
        currentPoint: point
      }
    })
  }, [])

  const finishSelection = useCallback((): { min: Point; max: Point } | null => {
    if (!state.startPoint || !state.currentPoint) {
      setState({
        isActive: false,
        startPoint: null,
        currentPoint: null
      })
      return null
    }

    const min = {
      x: Math.min(state.startPoint.x, state.currentPoint.x),
      y: Math.min(state.startPoint.y, state.currentPoint.y)
    }
    const max = {
      x: Math.max(state.startPoint.x, state.currentPoint.x),
      y: Math.max(state.startPoint.y, state.currentPoint.y)
    }

    setState({
      isActive: false,
      startPoint: null,
      currentPoint: null
    })

    return { min, max }
  }, [state.startPoint, state.currentPoint])

  const cancelSelection = useCallback(() => {
    setState({
      isActive: false,
      startPoint: null,
      currentPoint: null
    })
  }, [])

  return {
    state,
    startSelection,
    updateSelection,
    finishSelection,
    cancelSelection
  }
}
