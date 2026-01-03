/**
 * Hook pour gérer les conversions de coordonnées et le zoom
 * Centralise la logique de transformation écran ↔ monde
 */

import { useCallback, useRef } from "react"
import type { Point, EditorState } from "@/core/entities"

interface CanvasCoordinatesOptions {
  state: EditorState
  canvasRef: React.RefObject<HTMLCanvasElement>
  updateState: (updates: Partial<EditorState>, saveHistory?: boolean) => void
}

export function useCanvasCoordinates({
  state,
  canvasRef,
  updateState
}: CanvasCoordinatesOptions) {
  
  /**
   * Convertir coordonnées écran → monde (PIXELS)
   * Les coordonnées retournées sont en PIXELS (source de vérité)
   */
  const screenToWorld = useCallback((screenX: number, screenY: number): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    
    const rect = canvas.getBoundingClientRect()
    return {
      x: (screenX - rect.left - state.pan.x) / state.zoom,
      y: (screenY - rect.top - state.pan.y) / state.zoom
    }
  }, [canvasRef, state.pan, state.zoom])

  /**
   * Gestion du zoom avec point focal
   */
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    
    // Position monde avant zoom
    const worldBeforeX = (mouseX - state.pan.x) / state.zoom
    const worldBeforeY = (mouseY - state.pan.y) / state.zoom
    
    // Calculer nouveau zoom
    const zoomDelta = e.deltaY < 0 ? 1.15 : 0.87
    const newZoom = Math.max(0.1, Math.min(10, state.zoom * zoomDelta))
    
    // Ajuster pan pour maintenir point focal
    const newPanX = mouseX - worldBeforeX * newZoom
    const newPanY = mouseY - worldBeforeY * newZoom
    
    updateState({
      zoom: newZoom,
      pan: { x: newPanX, y: newPanY }
    }, false)
  }, [canvasRef, state.zoom, state.pan, updateState])

  return {
    screenToWorld,
    handleWheel
  }
}
