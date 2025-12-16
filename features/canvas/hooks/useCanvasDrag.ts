/**
 * Hook pour gérer le déplacement d'éléments sur le canvas
 */

import { useState, useCallback } from "react"
import type { Point, EditorState } from "@/core/entities"
import { snapToGrid } from "@/core/services"
import { GRID_SIZE } from "@/core/constants"

interface DragState {
  isDragging: boolean
  startPoint: Point | null
  currentOffset: Point
}

export function useCanvasDrag(
  state: EditorState,
  currentFloorId: string,
  updateState: (updates: Partial<EditorState>, saveHistory?: boolean, description?: string) => void
) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startPoint: null,
    currentOffset: { x: 0, y: 0 }
  })

  const startDrag = useCallback((point: Point) => {
    if (state.selectedElements.length === 0) return false

    setDragState({
      isDragging: true,
      startPoint: point,
      currentOffset: { x: 0, y: 0 }
    })
    return true
  }, [state.selectedElements])

  const continueDrag = useCallback((point: Point) => {
    if (!dragState.isDragging || !dragState.startPoint) return

    const offset = {
      x: point.x - dragState.startPoint.x,
      y: point.y - dragState.startPoint.y
    }

    setDragState(prev => ({
      ...prev,
      currentOffset: offset
    }))
  }, [dragState.isDragging, dragState.startPoint])

  const finishDrag = useCallback(() => {
    if (!dragState.isDragging || !dragState.startPoint) return

    // Snap l'offset final
    const snappedOffset = snapToGrid(dragState.currentOffset, GRID_SIZE)

    // Si pas de mouvement significatif, annuler
    if (Math.abs(snappedOffset.x) < 1 && Math.abs(snappedOffset.y) < 1) {
      setDragState({
        isDragging: false,
        startPoint: null,
        currentOffset: { x: 0, y: 0 }
      })
      return
    }

    // Appliquer le déplacement
    const currentFloor = state.floors.find(f => f.id === currentFloorId)
    if (!currentFloor) return

    const updatedFloors = state.floors.map(floor => {
      if (floor.id !== currentFloorId) return floor

      return {
        ...floor,
        rooms: floor.rooms.map(room => {
          if (!state.selectedElements.some(sel => sel.type === 'room' && sel.id === room.id)) {
            return room
          }
          return {
            ...room,
            polygon: room.polygon.map(p => ({
              x: p.x + snappedOffset.x,
              y: p.y + snappedOffset.y
            }))
          }
        }),
        walls: floor.walls.map(wall => {
          if (!state.selectedElements.some(sel => sel.type === 'wall' && sel.id === wall.id)) {
            return wall
          }
          return {
            ...wall,
            segment: [
              {
                x: wall.segment[0].x + snappedOffset.x,
                y: wall.segment[0].y + snappedOffset.y
              },
              {
                x: wall.segment[1].x + snappedOffset.x,
                y: wall.segment[1].y + snappedOffset.y
              }
            ] as readonly [Point, Point]
          }
        }),
        doors: floor.doors.map(door => {
          if (!state.selectedElements.some(sel => sel.type === 'door' && sel.id === door.id)) {
            return door
          }
          return {
            ...door,
            segment: [
              {
                x: door.segment[0].x + snappedOffset.x,
                y: door.segment[0].y + snappedOffset.y
              },
              {
                x: door.segment[1].x + snappedOffset.x,
                y: door.segment[1].y + snappedOffset.y
              }
            ] as readonly [Point, Point]
          }
        }),
        artworks: floor.artworks.map(artwork => {
          if (!state.selectedElements.some(sel => sel.type === 'artwork' && sel.id === artwork.id)) {
            return artwork
          }
          return {
            ...artwork,
            xy: [
              artwork.xy[0] + snappedOffset.x,
              artwork.xy[1] + snappedOffset.y
            ] as readonly [number, number]
          }
        }),
        verticalLinks: floor.verticalLinks.map(link => {
          if (!state.selectedElements.some(sel => sel.type === 'verticalLink' && sel.id === link.id)) {
            return link
          }
          return {
            ...link,
            segment: [
              {
                x: link.segment[0].x + snappedOffset.x,
                y: link.segment[0].y + snappedOffset.y
              },
              {
                x: link.segment[1].x + snappedOffset.x,
                y: link.segment[1].y + snappedOffset.y
              }
            ] as readonly [Point, Point]
          }
        })
      }
    })

    updateState(
      { floors: updatedFloors },
      true,
      `Déplacement de ${state.selectedElements.length} élément(s)`
    )

    setDragState({
      isDragging: false,
      startPoint: null,
      currentOffset: { x: 0, y: 0 }
    })
  }, [dragState, state, currentFloorId, updateState])

  const cancelDrag = useCallback(() => {
    setDragState({
      isDragging: false,
      startPoint: null,
      currentOffset: { x: 0, y: 0 }
    })
  }, [])

  return {
    dragState,
    startDrag,
    continueDrag,
    finishDrag,
    cancelDrag
  }
}
