/**
 * CANVAS REFACTORISÉ - Architecture modulaire professionnelle
 * Composant léger utilisant des hooks spécialisés pour chaque responsabilité
 * 
 * Hooks utilisés :
 * - useCanvasCoordinates : Gestion zoom et conversions coordonnées
 * - useCanvasSelection : Système de sélection complet
 * - useBoxSelection : Sélection par zone
 * - useShapeCreation : Création formes géométriques (drag)
 * - useFreeFormCreation : Création forme libre (point par point)
 * - useCanvasInteraction : Gestion événements souris
 * - useCanvasRender : Logique de rendu
 */

"use client"

import { useRef, useEffect } from "react"
import type { EditorState, Floor } from "@/core/entities"
import { 
  useCanvasCoordinates,
  useCanvasSelection,
  useBoxSelection,
  useShapeCreation,
  useFreeFormCreation,
  useCanvasInteraction,
  useCanvasRender
} from "@/features/canvas/hooks"
import { v4 as uuidv4 } from "uuid"
import { ValidationBadge } from "./components/ValidationBadge"

interface CanvasProps {
  state: EditorState
  updateState: (updates: Partial<EditorState>, saveHistory?: boolean, description?: string) => void
  currentFloor: Floor
  onArtworkDoubleClick?: (artworkId: string) => void
}

export function Canvas({ 
  state, 
  updateState,
  currentFloor,
  onArtworkDoubleClick 
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Hook coordonnées & zoom
  const coordinates = useCanvasCoordinates({
    state,
    canvasRef,
    updateState
  })
  
  // Hook de sélection
  const selection = useCanvasSelection(
    state,
    currentFloor.id,
    updateState,
    {
      tolerance: 10,
      multiSelect: true,
      enableVertexSelection: state.selectedTool === 'select',
      enableSegmentSelection: state.selectedTool === 'select'
    }
  )
  
  // Hook box selection
  const boxSelection = useBoxSelection()
  
  // Hook de création de formes (drag-based: rectangle, circle, triangle, arc)
  const shapeCreation = useShapeCreation({
    tool: state.selectedTool,
    currentFloor,
    onComplete: (polygon) => {
      if (['rectangle', 'circle', 'triangle', 'arc'].includes(state.selectedTool)) {
        const newRoom = {
          id: uuidv4(),
          polygon: polygon
        }
        
        const updatedFloors = state.floors.map(floor =>
          floor.id === currentFloor.id
            ? { ...floor, rooms: [...floor.rooms, newRoom] }
            : floor
        )
        
        updateState({ floors: updatedFloors }, true, `Créer ${state.selectedTool}`)
      }
    }
  })

  // Hook de création de forme libre (point par point: room)
  const freeFormCreation = useFreeFormCreation({
    currentFloor,
    onComplete: (polygon) => {
      const newRoom = {
        id: uuidv4(),
        polygon: polygon
      }
      
      const updatedFloors = state.floors.map(floor =>
        floor.id === currentFloor.id
          ? { ...floor, rooms: [...floor.rooms, newRoom] }
          : floor
      )
      
      updateState({ floors: updatedFloors }, true, 'Créer pièce libre')
      updateState({ selectedTool: 'select' }, false)
    }
  })

  // Hook d'interaction utilisateur
  const interaction = useCanvasInteraction({
    state,
    currentFloor,
    updateState,
    selection,
    boxSelection,
    shapeCreation,
    freeFormCreation,
    screenToWorld: coordinates.screenToWorld
  })

  // Hook de rendu
  const { render } = useCanvasRender({
    canvasRef,
    state,
    currentFloor,
    selection,
    shapeCreation,
    freeFormCreation,
    boxSelection,
    hoveredPoint: interaction.hoveredPoint,
    hoverInfo: interaction.hoverInfo
  })

  // Setup canvas et event listeners
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const resizeCanvas = () => {
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    canvas.addEventListener('wheel', coordinates.handleWheel, { passive: false })

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      canvas.removeEventListener('wheel', coordinates.handleWheel)
    }
  }, [coordinates.handleWheel])

  return (
    <div ref={containerRef} className="relative w-full h-full bg-gray-50">
      {/* Badge de validation */}
      <ValidationBadge 
        state={state} 
        currentFloor={currentFloor}
        className="absolute top-4 left-4 z-10"
      />

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={interaction.handleMouseDown}
        onMouseMove={interaction.handleMouseMove}
        onMouseUp={interaction.handleMouseUp}
        onMouseLeave={interaction.handleMouseLeave}
        className="w-full h-full cursor-crosshair"
        style={{
          cursor: interaction.isPanning ? 'grabbing' : state.selectedTool === 'select' ? 'default' : 'crosshair'
        }}
      />

      {/* Indicateur de l'outil en cours */}
      <div className="absolute bottom-4 left-4 px-3 py-2 bg-gray-900/90 text-white text-sm rounded-lg shadow-lg">
        {state.selectedTool === 'select' ? (
          <div className="flex flex-col gap-1">
            <div className="font-semibold">Mode : Sélection</div>
            {state.selectedElements.length > 0 && (
              <div className="text-xs text-blue-300">
                {state.selectedElements.length} élément{state.selectedElements.length > 1 ? 's' : ''} sélectionné{state.selectedElements.length > 1 ? 's' : ''}
              </div>
            )}
            <div className="text-xs text-gray-400 mt-1">
              Clic: sélectionner • Ctrl+Clic: multi-sélection • Drag: box selection
            </div>
          </div>
        ) : state.selectedTool === 'room' ? (
          <div className="flex flex-col gap-1">
            <div className="font-semibold">Mode : Forme libre (pièce)</div>
            {freeFormCreation.state.isCreating && freeFormCreation.state.points.length > 0 && (
              <div className="text-xs text-blue-300">
                {freeFormCreation.state.points.length} point{freeFormCreation.state.points.length > 1 ? 's' : ''} placé{freeFormCreation.state.points.length > 1 ? 's' : ''}
              </div>
            )}
            <div className="text-xs text-gray-400 mt-1">
              Clic: ajouter point • Double-clic ou Entrée: terminer • Échap: annuler
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="font-semibold">Mode : {state.selectedTool}</div>
            {shapeCreation.state.isCreating && (
              <div className="text-xs text-blue-300">• En cours de tracé</div>
            )}
            <div className="text-xs text-gray-400 mt-1">
              Drag: créer forme • Échap: annuler
            </div>
          </div>
        )}
      </div>

      {/* Badge d'aide au centre */}
      {state.selectedTool === 'room' && freeFormCreation.state.isCreating && freeFormCreation.state.points.length >= 3 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg shadow-lg animate-pulse">
          Double-clic ou Entrée pour terminer la forme
        </div>
      )}
    </div>
  )
}
