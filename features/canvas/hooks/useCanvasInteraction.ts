/**
 * Hook pour gérer les interactions utilisateur sur le canvas
 * Centralise toute la logique d'interaction (click, pan, etc.)
 * Évite la surcharge du composant Canvas principal
 */

import { useCallback, useState, type MouseEvent } from "react"
import type { Point, EditorState, Floor } from "@/core/entities"
import { smartSnap } from "@/core/services"
import { v4 as uuidv4 } from "uuid"

interface CanvasInteractionOptions {
  state: EditorState
  currentFloor: Floor
  updateState: (updates: Partial<EditorState>, saveHistory?: boolean, description?: string) => void
  selection: any
  boxSelection: any
  shapeCreation: any
  freeFormCreation: any
  screenToWorld: (x: number, y: number) => Point
}

export function useCanvasInteraction({
  state,
  currentFloor,
  updateState,
  selection,
  boxSelection,
  shapeCreation,
  freeFormCreation,
  screenToWorld
}: CanvasInteractionOptions) {
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPos, setLastPanPos] = useState<Point | null>(null)
  const [hoveredPoint, setHoveredPoint] = useState<Point | null>(null)
  const [hoverInfo, setHoverInfo] = useState<any>(null)

  /**
   * Gestion du clic gauche/droit
   */
  const handleMouseDown = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    const worldPos = screenToWorld(e.clientX, e.clientY)
    const snapResult = smartSnap(worldPos, currentFloor)
    
    // Pan avec molette centrale
    if (e.button === 1) {
      e.preventDefault()
      setIsPanning(true)
      setLastPanPos({ x: e.clientX, y: e.clientY })
      return
    }
    
    // Mode sélection
    if (e.button === 0 && state.selectedTool === 'select') {
      const result = selection.findElementAt(worldPos, state.zoom)
      
      if (result.element) {
        const isMultiSelect = e.ctrlKey || e.metaKey
        selection.selectElement(result, isMultiSelect)
      } else {
        // Démarrer box selection si clic dans le vide
        boxSelection.startSelection(worldPos)
      }
      return
    }

    // Création de formes (drag-based: rectangle, circle, etc.)
    if (['rectangle', 'circle', 'triangle', 'arc'].includes(state.selectedTool)) {
      shapeCreation.startCreation(snapResult.point)
      return
    }

    // Création forme libre (point par point)
    if (state.selectedTool === 'room' && e.button === 0) {
      freeFormCreation.addPoint(snapResult.point)
    }
  }, [
    screenToWorld, 
    currentFloor, 
    state.selectedTool, 
    state.zoom,
    selection, 
    boxSelection, 
    shapeCreation, 
    freeFormCreation
  ])

  /**
   * Gestion du mouvement de la souris
   */
  const handleMouseMove = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    const worldPos = screenToWorld(e.clientX, e.clientY)
    const snapResult = smartSnap(worldPos, currentFloor)
    
    // Pan en cours
    if (isPanning && lastPanPos) {
      const deltaX = e.clientX - lastPanPos.x
      const deltaY = e.clientY - lastPanPos.y
      
      updateState({
        pan: {
          x: state.pan.x + deltaX,
          y: state.pan.y + deltaY
        }
      }, false)
      setLastPanPos({ x: e.clientX, y: e.clientY })
      return
    }
    
    setHoveredPoint(snapResult.point)
    
    // Détection hover en mode select
    if (state.selectedTool === 'select') {
      const result = selection.findElementAt(worldPos, state.zoom)
      setHoverInfo(result.hoverInfo)
    } else {
      setHoverInfo(null)
    }
    
    // Box selection en cours
    if (boxSelection.state.isActive) {
      boxSelection.updateSelection(worldPos)
      return
    }
    
    // Création drag en cours
    if (shapeCreation.state.isCreating) {
      shapeCreation.updateCreation(snapResult.point)
    }

    // Création forme libre: mise à jour hover
    if (freeFormCreation.state.isCreating) {
      freeFormCreation.updateHover(snapResult.point)
    }
  }, [
    isPanning, 
    lastPanPos, 
    state.pan, 
    state.selectedTool,
    state.zoom,
    screenToWorld, 
    currentFloor, 
    updateState, 
    selection,
    shapeCreation, 
    freeFormCreation, 
    boxSelection
  ])

  /**
   * Gestion du relâchement de souris
   */
  const handleMouseUp = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    // Pan terminé
    if (e.button === 1) {
      setIsPanning(false)
      setLastPanPos(null)
      return
    }
    
    // Box selection terminée
    if (e.button === 0 && boxSelection.state.isActive) {
      const bounds = boxSelection.finishSelection()
      if (bounds) {
        const elementsInBox = selection.findElementsInBounds(bounds.min, bounds.max)
        const isAdditive = e.shiftKey
        
        if (isAdditive) {
          const newSelection = [...state.selectedElements, ...elementsInBox]
          const unique = newSelection.filter((el, index, self) =>
            index === self.findIndex(e => e.type === el.type && e.id === el.id)
          )
          updateState({
            selectedElements: unique,
            selectedElementId: unique.length > 0 ? unique[0].id : null,
            selectedElementType: unique.length > 0 ? unique[0].type : null
          }, false)
        } else {
          updateState({
            selectedElements: elementsInBox,
            selectedElementId: elementsInBox.length > 0 ? elementsInBox[0].id : null,
            selectedElementType: elementsInBox.length > 0 ? elementsInBox[0].type : null
          }, false)
        }
      }
      return
    }
    
    // Création drag terminée
    if (e.button === 0 && shapeCreation.state.isCreating) {
      shapeCreation.finishCreation()
    }
  }, [
    shapeCreation, 
    boxSelection, 
    selection, 
    state.selectedElements, 
    updateState
  ])

  /**
   * Gestion de la sortie du canvas
   */
  const handleMouseLeave = useCallback(() => {
    setHoveredPoint(null)
    if (shapeCreation.state.isCreating) {
      shapeCreation.cancelCreation()
    }
  }, [shapeCreation])

  return {
    // État
    isPanning,
    hoveredPoint,
    hoverInfo,
    
    // Handlers
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave
  }
}
