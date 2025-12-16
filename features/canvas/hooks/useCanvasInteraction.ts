/**
 * HOOK DÉTECTION INTERACTION CANVAS
 */

import { useState, useCallback } from 'react'
import type { Point, HoverInfo, DragInfo, ElementType } from '@/core/entities'
import { 
  isPointInPolygon, 
  distance, 
  distanceToSegment 
} from '@/core/services'
import { 
  VERTEX_HIT_RADIUS, 
  ENDPOINT_HIT_RADIUS, 
  LINE_HIT_THRESHOLD 
} from '@/core/constants'

export function useCanvasInteraction() {
  const [hoveredElement, setHoveredElement] = useState<HoverInfo | null>(null)
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null)

  const detectHover = useCallback((canvasPoint: Point, zoom: number) => {
    // Logique de détection du hover
    // À implémenter selon les besoins
    return null
  }, [])

  const startDrag = useCallback((element: any, startPos: Point) => {
    setDragInfo({
      elementId: element.id,
      elementType: element.type,
      startPos,
      originalPos: element.position || element.xy,
      isValid: true
    })
  }, [])

  const updateDrag = useCallback((currentPos: Point) => {
    if (!dragInfo) return

    setDragInfo({
      ...dragInfo,
      isValid: true // À calculer selon les contraintes
    })
  }, [dragInfo])

  const endDrag = useCallback(() => {
    setDragInfo(null)
  }, [])

  return {
    hoveredElement,
    dragInfo,
    detectHover,
    startDrag,
    updateDrag,
    endDrag,
    setHoveredElement
  }
}
