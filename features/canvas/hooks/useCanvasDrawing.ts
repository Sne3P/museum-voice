/**
 * Hook pour gérer le dessin d'éléments sur le canvas
 */

import { useState, useCallback } from "react"
import type { Point, Tool } from "@/core/entities"
import { snapToGrid } from "@/core/services"
import { GRID_SIZE } from "@/core/constants"

export interface DrawingState {
  isDrawing: boolean
  currentPoints: Point[]
  previewPoint: Point | null
}

export function useCanvasDrawing(
  tool: Tool,
  onComplete: (points: Point[]) => void
) {
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    currentPoints: [],
    previewPoint: null
  })

  const startDrawing = useCallback((point: Point) => {
    const snappedPoint = snapToGrid(point, GRID_SIZE)
    setDrawingState({
      isDrawing: true,
      currentPoints: [snappedPoint],
      previewPoint: null
    })
  }, [])

  const continueDrawing = useCallback((point: Point) => {
    if (!drawingState.isDrawing) return
    
    const snappedPoint = snapToGrid(point, GRID_SIZE)
    setDrawingState(prev => ({
      ...prev,
      previewPoint: snappedPoint
    }))
  }, [drawingState.isDrawing])

  const addPoint = useCallback((point: Point) => {
    if (!drawingState.isDrawing) return

    const snappedPoint = snapToGrid(point, GRID_SIZE)
    const newPoints = [...drawingState.currentPoints, snappedPoint]

    setDrawingState(prev => ({
      ...prev,
      currentPoints: newPoints,
      previewPoint: null
    }))

    // Pour les murs, portes, stairs, elevators ET formes géométriques (rectangle, circle, triangle, arc): 2 points suffisent
    if ((tool === 'wall' || tool === 'door' || tool === 'stairs' || tool === 'elevator' || 
         tool === 'rectangle' || tool === 'circle' || tool === 'triangle' || tool === 'arc') && 
        newPoints.length === 2) {
      onComplete(newPoints)
      setDrawingState({
        isDrawing: false,
        currentPoints: [],
        previewPoint: null
      })
    }
    
    // Pour les artworks: 1 point suffit
    if (tool === 'artwork' && newPoints.length === 1) {
      onComplete(newPoints)
      setDrawingState({
        isDrawing: false,
        currentPoints: [],
        previewPoint: null
      })
    }
  }, [drawingState, tool, onComplete])

  const finishDrawing = useCallback(() => {
    // Pour les rooms, il faut au moins 3 points
    if (tool === 'room' && drawingState.currentPoints.length >= 3) {
      onComplete(drawingState.currentPoints)
    }
    setDrawingState({
      isDrawing: false,
      currentPoints: [],
      previewPoint: null
    })
  }, [drawingState.currentPoints, onComplete, tool])

  const cancelDrawing = useCallback(() => {
    setDrawingState({
      isDrawing: false,
      currentPoints: [],
      previewPoint: null
    })
  }, [])

  return {
    drawingState,
    startDrawing,
    continueDrawing,
    addPoint,
    finishDrawing,
    cancelDrawing
  }
}
