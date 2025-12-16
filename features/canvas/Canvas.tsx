/**
 * CANVAS REFACTORISÉ - Architecture modulaire professionnelle
 * Utilise les hooks et renderers centralisés pour un code maintenable
 */

"use client"

import { useRef, useCallback, useEffect, useState, type MouseEvent } from "react"
import type { EditorState, Floor, Point } from "@/core/entities"
import { 
  drawGrid,
  drawRoom,
  drawWall,
  drawArtwork,
  drawDoor,
  drawVerticalLink,
  drawShapePreview,
  drawSnapPoint,
  drawValidationMessage,
  drawBoxSelection,
  drawRoomVertices,
  drawRoomSegments
} from "@/features/canvas/utils"
import { GRID_SIZE } from "@/core/constants"
import { smartSnap } from "@/core/services"
import { useShapeCreation, useFreeFormCreation, useCanvasSelection, useBoxSelection } from "@/features/canvas/hooks"
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
  const animationFrameRef = useRef<number>(0)
  
  // États pour l'interaction
  const [hoveredPoint, setHoveredPoint] = useState<Point | null>(null)
  const [hoverInfo, setHoverInfo] = useState<any>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPos, setLastPanPos] = useState<Point | null>(null)
  
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
    onComplete: (polygon: Point[]) => {
      // Créer la room selon l'outil
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
    onComplete: (polygon: Point[]) => {
      const newRoom = {
        id: uuidv4(),
        polygon: polygon
      }
      
      const updatedFloors = state.floors.map(floor =>
        floor.id === currentFloor.id
          ? { ...floor, rooms: [...floor.rooms, newRoom] }
          : floor
      )
      
      updateState({ floors: updatedFloors }, true, 'Créer forme libre')
    },
    onCancel: () => {
      // Optionnel: revenir à l'outil select
      updateState({ selectedTool: 'select' }, false)
    }
  })

  // Conversion coordonnées
  const screenToWorld = useCallback((screenX: number, screenY: number): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: (screenX - rect.left - state.pan.x) / state.zoom,
      y: (screenY - rect.top - state.pan.y) / state.zoom
    }
  }, [state.pan, state.zoom])

  // Gestion du zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    
    const worldBeforeX = (mouseX - state.pan.x) / state.zoom
    const worldBeforeY = (mouseY - state.pan.y) / state.zoom
    
    const zoomDelta = e.deltaY < 0 ? 1.15 : 0.87
    const newZoom = Math.max(0.1, Math.min(10, state.zoom * zoomDelta))
    
    const newPanX = mouseX - worldBeforeX * newZoom
    const newPanY = mouseY - worldBeforeY * newZoom
    
    updateState({
      zoom: newZoom,
      pan: { x: newPanX, y: newPanY }
    }, false)
  }, [state.zoom, state.pan, updateState])

  // Mouse Down
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
    
    // Sélection (outil select)
    if (e.button === 0 && state.selectedTool === 'select') {
      const result = selection.findElementAt(worldPos, state.zoom)
      
      // Si clic sur élément : sélection simple/multiple
      if (result.element) {
        const isMultiSelect = e.ctrlKey || e.metaKey
        selection.selectElement(result, isMultiSelect)
      } else {
        // Si clic sur fond : démarrer box selection
        boxSelection.startSelection(worldPos)
      }
      return
    }
    
    // Créer une forme géométrique (drag)
    if (e.button === 0 && ['rectangle', 'circle', 'triangle', 'arc'].includes(state.selectedTool)) {
      shapeCreation.startCreation(snapResult.point)
    }

    // Créer une forme libre (point par point)
    if (e.button === 0 && state.selectedTool === 'room') {
      freeFormCreation.addPoint(snapResult.point)
    }
  }, [state.selectedTool, state.zoom, screenToWorld, currentFloor, shapeCreation, freeFormCreation, selection, boxSelection])

  // Mouse Move
  const handleMouseMove = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    const worldPos = screenToWorld(e.clientX, e.clientY)
    const snapResult = smartSnap(worldPos, currentFloor)
    
    // Pan
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
    
    // Mettre à jour la prévisualisation pendant la création (drag)
    if (shapeCreation.state.isCreating) {
      shapeCreation.updateCreation(snapResult.point)
    }

    // Mettre à jour le hover pour la création forme libre
    if (freeFormCreation.state.isCreating) {
      freeFormCreation.updateHover(snapResult.point)
    }
  }, [isPanning, lastPanPos, state.pan, screenToWorld, currentFloor, updateState, shapeCreation, freeFormCreation, boxSelection])

  // Mouse Up
  const handleMouseUp = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1) {
      setIsPanning(false)
      setLastPanPos(null)
      return
    }
    
    // Box selection
    if (e.button === 0 && boxSelection.state.isActive) {
      const bounds = boxSelection.finishSelection()
      if (bounds) {
        const elementsInBox = selection.findElementsInBounds(bounds.min, bounds.max)
        const isAdditive = e.shiftKey
        
        if (isAdditive) {
          // Ajouter à la sélection existante
          const newSelection = [...state.selectedElements, ...elementsInBox]
          // Dédoublon
          const unique = newSelection.filter((el, index, self) =>
            index === self.findIndex(e => e.type === el.type && e.id === el.id)
          )
          updateState({
            selectedElements: unique,
            selectedElementId: unique.length > 0 ? unique[0].id : null,
            selectedElementType: unique.length > 0 ? unique[0].type : null
          }, false)
        } else {
          // Remplacer sélection
          updateState({
            selectedElements: elementsInBox,
            selectedElementId: elementsInBox.length > 0 ? elementsInBox[0].id : null,
            selectedElementType: elementsInBox.length > 0 ? elementsInBox[0].type : null
          }, false)
        }
      }
      return
    }
    
    if (e.button === 0 && shapeCreation.state.isCreating) {
      shapeCreation.finishCreation()
    }
  }, [shapeCreation, boxSelection, selection, state.selectedElements, updateState])

  // Rendu avec animation
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)

    // 1. Grille
    drawGrid(ctx, width, height, state.zoom, state.pan)

    // 2. Éléments du floor
    currentFloor.rooms.forEach(room => {
      const isSelected = selection.isSelected('room', room.id)
      drawRoom(ctx, room, state.zoom, state.pan, isSelected, false)
    })

    currentFloor.walls?.forEach(wall => {
      const isSelected = selection.isSelected('wall', wall.id)
      drawWall(ctx, wall, state.zoom, state.pan, isSelected, false)
    })

    currentFloor.doors?.forEach(door => {
      const isSelected = selection.isSelected('door', door.id)
      drawDoor(ctx, door, state.zoom, state.pan, GRID_SIZE, isSelected, false, false)
    })

    currentFloor.artworks?.forEach(artwork => {
      const isSelected = selection.isSelected('artwork', artwork.id)
      drawArtwork(ctx, artwork, state.zoom, state.pan, isSelected, false)
    })

    currentFloor.verticalLinks?.forEach(link => {
      const isSelected = selection.isSelected('verticalLink', link.id)
      drawVerticalLink(ctx, link, state.zoom, state.pan, GRID_SIZE, isSelected, false, false)
    })

    // 3. Prévisualisation de création (formes géométriques drag)
    if (shapeCreation.state.previewPolygon) {
      drawShapePreview(ctx, {
        polygon: shapeCreation.state.previewPolygon,
        isValid: shapeCreation.state.isValid,
        validationSeverity: shapeCreation.state.validationSeverity,
        zoom: state.zoom,
        pan: state.pan,
        showVertices: true,
        animationPhase: Date.now() / 50
      })
      
      // Message de validation
      if (shapeCreation.state.validationMessage && !shapeCreation.state.isValid) {
        const canvas = canvasRef.current
        if (canvas) {
          drawValidationMessage(
            ctx,
            shapeCreation.state.validationMessage,
            shapeCreation.state.validationSeverity || 'error',
            { x: canvas.width / 2, y: 50 }
          )
        }
      }
    }

    // 3b. Prévisualisation forme libre (point par point)
    if (freeFormCreation.state.isCreating && freeFormCreation.state.points.length > 0) {
      const previewPolygon = [...freeFormCreation.state.points]
      
      // Ajouter le hover point pour la preview
      if (freeFormCreation.state.hoverPoint) {
        previewPolygon.push(freeFormCreation.state.hoverPoint)
      }

      // Dessiner la preview
      if (previewPolygon.length >= 2) {
        drawShapePreview(ctx, {
          polygon: previewPolygon,
          isValid: freeFormCreation.state.isValid,
          validationSeverity: freeFormCreation.state.validationSeverity,
          zoom: state.zoom,
          pan: state.pan,
          showVertices: true,
          animationPhase: Date.now() / 50
        })
      }

      // Dessiner les points existants en plus gros
      freeFormCreation.state.points.forEach((point, index) => {
        ctx.save()
        ctx.translate(point.x * state.zoom + state.pan.x, point.y * state.zoom + state.pan.y)
        
        ctx.beginPath()
        ctx.arc(0, 0, 6, 0, Math.PI * 2)
        ctx.fillStyle = index === 0 ? '#3b82f6' : '#22c55e' // Bleu pour premier, vert pour autres
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.stroke()
        
        ctx.restore()
      })

      // Message de validation
      if (freeFormCreation.state.validationMessage) {
        const canvas = canvasRef.current
        if (canvas) {
          drawValidationMessage(
            ctx,
            freeFormCreation.state.validationMessage,
            freeFormCreation.state.validationSeverity || 'info',
            { x: canvas.width / 2, y: 50 }
          )
        }
      }
    }

    // 4. Box selection
    if (boxSelection.state.isActive && boxSelection.state.startPoint && boxSelection.state.currentPoint) {
      drawBoxSelection(
        ctx,
        boxSelection.state.startPoint,
        boxSelection.state.currentPoint,
        state.zoom,
        state.pan
      )
    }

    // 5. Point hover (snap indicator) - PAS en mode select
    if (hoveredPoint && !shapeCreation.state.isCreating && !freeFormCreation.state.isCreating && !boxSelection.state.isActive && state.selectedTool !== 'select') {
      drawSnapPoint(ctx, hoveredPoint, state.zoom, state.pan, true)
    }

    // 5b. Vertices et segments visibles en mode select avec feedback hover/selected
    if (state.selectedTool === 'select') {
      currentFloor.rooms.forEach(room => {
        // Segments (overlay quand hover ou selected)
        drawRoomSegments(ctx, room, state.pan, state.zoom, hoverInfo, state.selectedElements)
        
        // Vertices (toujours affichés)
        drawRoomVertices(ctx, room, state.pan, state.zoom, hoverInfo, state.selectedElements)
      })
    }

    // Animation continue
    animationFrameRef.current = requestAnimationFrame(render)
  }, [state.zoom, state.pan, currentFloor, shapeCreation.state, freeFormCreation.state, hoveredPoint, hoverInfo, selection, boxSelection.state])

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
    canvas.addEventListener('wheel', handleWheel, { passive: false })

    // Démarrer l'animation
    animationFrameRef.current = requestAnimationFrame(render)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      canvas.removeEventListener('wheel', handleWheel)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [handleWheel, render])

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
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setHoveredPoint(null)
          if (shapeCreation.state.isCreating) {
            shapeCreation.cancelCreation()
          }
        }}
        className="w-full h-full cursor-crosshair"
        style={{
          cursor: isPanning ? 'grabbing' : state.selectedTool === 'select' ? 'default' : 'crosshair'
        }}
      />

      {/* Indicateur de l'outil en cours */}
      {state.selectedTool !== 'select' && (
        <div className="absolute bottom-4 left-4 px-3 py-2 bg-gray-900/90 text-white text-sm rounded-lg">
          Mode : {state.selectedTool}
          {shapeCreation.state.isCreating && (
            <span className="ml-2 text-blue-400">• En cours de tracé</span>
          )}
        </div>
      )}
    </div>
  )
}
