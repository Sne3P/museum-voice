/**
 * Hook pour gérer la sélection d'éléments sur le canvas
 */

import { useCallback } from "react"
import type { Point, EditorState, SelectedElement } from "@/core/entities"
import { isPointInPolygon, distanceToSegment } from "@/core/services"

export interface SelectionOptions {
  tolerance: number // Distance maximale pour considérer un élément cliqué
  multiSelect: boolean // Permet la sélection multiple avec Ctrl/Cmd
}

export function useCanvasSelection(
  state: EditorState,
  currentFloorId: string,
  updateState: (updates: Partial<EditorState>, saveHistory?: boolean) => void,
  options: SelectionOptions = { tolerance: 10, multiSelect: true }
) {
  const findElementAt = useCallback((point: Point, zoom: number): SelectedElement | null => {
    const currentFloor = state.floors.find(f => f.id === currentFloorId)
    if (!currentFloor) return null

    const tolerance = options.tolerance / zoom

    // Vérifier les œuvres d'art en premier (priorité aux petits éléments)
    for (const artwork of currentFloor.artworks) {
      const [x, y] = artwork.xy
      const dx = point.x - x
      const dy = point.y - y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      // Rayon par défaut 30px si size non défini
      const radius = artwork.size ? Math.max(artwork.size[0], artwork.size[1]) / 2 : 30
      
      if (distance <= radius + tolerance) {
        return { type: 'artwork', id: artwork.id }
      }
    }

    // Vérifier les portes
    for (const door of currentFloor.doors) {
      const dist = distanceToSegment(point, door.segment[0], door.segment[1])
      if (dist <= tolerance) {
        return { type: 'door', id: door.id }
      }
    }

    // Vérifier les liens verticaux
    for (const link of currentFloor.verticalLinks) {
      const [startX, startY] = [link.segment[0].x, link.segment[0].y]
      const [endX, endY] = [link.segment[1].x, link.segment[1].y]
      const centerX = (startX + endX) / 2
      const centerY = (startY + endY) / 2
      
      const dx = point.x - centerX
      const dy = point.y - centerY
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance <= 60 + tolerance) { // 60 = rayon typique
        return { type: 'verticalLink', id: link.id }
      }
    }

    // Vérifier les murs
    for (const wall of currentFloor.walls) {
      const dist = distanceToSegment(point, wall.segment[0], wall.segment[1])
      if (dist <= wall.thickness / 2 + tolerance) {
        return { type: 'wall', id: wall.id }
      }
    }

    // Vérifier les pièces (en dernier, ce sont les plus grands éléments)
    for (const room of currentFloor.rooms) {
      if (isPointInPolygon(point, room.polygon)) {
        return { type: 'room', id: room.id }
      }
    }

    return null
  }, [state, currentFloorId, options.tolerance])

  const selectElement = useCallback((
    element: SelectedElement | null,
    multiSelect: boolean = false
  ) => {
    if (!element) {
      updateState({ selectedElements: [] }, false)
      return
    }

    if (multiSelect && options.multiSelect) {
      const isAlreadySelected = state.selectedElements.some(
        sel => sel.type === element.type && sel.id === element.id
      )

      if (isAlreadySelected) {
        // Désélectionner
        const newSelection = state.selectedElements.filter(
          sel => !(sel.type === element.type && sel.id === element.id)
        )
        updateState({ selectedElements: newSelection }, false)
      } else {
        // Ajouter à la sélection
        updateState({ 
          selectedElements: [...state.selectedElements, element] 
        }, false)
      }
    } else {
      // Sélection simple
      updateState({ selectedElements: [element] }, false)
    }
  }, [state.selectedElements, updateState, options.multiSelect])

  const clearSelection = useCallback(() => {
    updateState({ selectedElements: [] }, false)
  }, [updateState])

  const selectAll = useCallback(() => {
    const currentFloor = state.floors.find(f => f.id === currentFloorId)
    if (!currentFloor) return

    const allElements: SelectedElement[] = [
      ...currentFloor.rooms.map(r => ({ type: 'room' as const, id: r.id })),
      ...currentFloor.walls.map(w => ({ type: 'wall' as const, id: w.id })),
      ...currentFloor.doors.map(d => ({ type: 'door' as const, id: d.id })),
      ...currentFloor.artworks.map(a => ({ type: 'artwork' as const, id: a.id })),
      ...currentFloor.verticalLinks.map(v => ({ type: 'verticalLink' as const, id: v.id }))
    ]

    updateState({ selectedElements: allElements }, false)
  }, [state, currentFloorId, updateState])

  return {
    findElementAt,
    selectElement,
    clearSelection,
    selectAll
  }
}
