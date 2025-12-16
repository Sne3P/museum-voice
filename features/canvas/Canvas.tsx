/**
 * CANVAS REFACTORISÉ - Système d'interaction legacy restauré
 * - Drag-based pour formes géométriques (mouseDown → drag → mouseUp)
 * - Preview dynamique pendant le drag
 * - Hover point pour montrer la position snappée
 * - Curseur adaptatif selon l'action
 */

"use client"

import { useRef, useCallback, useEffect, useState, type MouseEvent } from "react"
import type { EditorState, Floor, Point, Room } from "@/core/entities"
import { 
  drawGrid,
  drawRoom,
  drawRoomVertices,
  drawWall,
  drawArtwork,
  drawDoor,
  drawVerticalLink,
  drawScale,
  drawAreaMeasurement,
} from "@/features/canvas/utils"
import { screenToWorld, worldToScreen } from "@/features/canvas/utils/coordinates.utils"
import { GRID_SIZE, VISUAL_FEEDBACK, CONSTRAINTS } from "@/core/constants"
import { 
  snapToGrid, 
  createCirclePolygon, 
  createTrianglePolygon, 
  createArcPolygon,
  calculateBounds 
} from "@/core/services"
import { validateRoomGeometry } from "@/core/services"
import { v4 as uuidv4 } from "uuid"

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
  
  // États pour l'interaction souris
  const [hoveredPoint, setHoveredPoint] = useState<Point | null>(null)
  const [drawStartPoint, setDrawStartPoint] = useState<Point | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isValidPlacement, setIsValidPlacement] = useState(true)
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPos, setLastPanPos] = useState<Point | null>(null)
  
  // Preview pour les formes en cours de création
  const [creationPreview, setCreationPreview] = useState<{
    polygon: Point[]
    valid: boolean
  } | null>(null)

  // Fonctions de conversion coordonnées
  const screenToWorldCoords = useCallback((screenX: number, screenY: number): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const x = (screenX - rect.left - state.pan.x) / state.zoom
    const y = (screenY - rect.top - state.pan.y) / state.zoom
    return { x, y }
  }, [state.pan, state.zoom])

  const worldToScreenCoords = useCallback((worldX: number, worldY: number): Point => {
    return {
      x: worldX * state.zoom + state.pan.x,
      y: worldY * state.zoom + state.pan.y
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
    
    const zoomDelta = e.deltaY < 0 ? 1.1 : 0.9
    const newZoom = Math.max(0.1, Math.min(5, state.zoom * zoomDelta))
    
    // Zoomer vers la position de la souris
    const worldBefore = screenToWorldCoords(mouseX, mouseY)
    updateState({ zoom: newZoom }, false)
    
    // Ajuster le pan pour garder le point sous la souris
    const worldAfter = {
      x: (mouseX - state.pan.x) / newZoom,
      y: (mouseY - state.pan.y) / newZoom
    }
    
    updateState({
      pan: {
        x: state.pan.x + (worldAfter.x - worldBefore.x) * newZoom,
        y: state.pan.y + (worldAfter.y - worldBefore.y) * newZoom
      }
    }, false)
  }, [state.zoom, state.pan, screenToWorldCoords, updateState])

  // Gestion du pan avec molette centrale
  const handleMouseDown = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    const worldPos = screenToWorldCoords(e.clientX, e.clientY)
    const gridPos = snapToGrid(worldPos, GRID_SIZE)
    
    // Pan avec molette centrale (bouton 1)
    if (e.button === 1) {
      e.preventDefault()
      setIsPanning(true)
      setLastPanPos({ x: e.clientX, y: e.clientY })
      return
    }
    
    // Clic gauche pour créer des formes
    if (e.button === 0) {
      const tool = state.selectedTool
      
      // Pour les formes géométriques et artwork : démarrer le drag
      if (tool === 'rectangle' || tool === 'circle' || tool === 'triangle' || tool === 'arc' || tool === 'artwork') {
        setDrawStartPoint(gridPos)
        setIsDragging(true)
        setCreationPreview(null)
        return
      }
      
      // Pour room (forme libre) : ajouter un point au polygone
      if (tool === 'room') {
        const currentPoly = state.currentPolygon || []
        const newPolygon = [...currentPoly, gridPos]
        updateState({ currentPolygon: newPolygon }, false)
        return
      }
      
      // Pour wall, door, stairs, elevator : démarrer le drag
      if (tool === 'wall' || tool === 'door' || tool === 'stairs' || tool === 'elevator') {
        setDrawStartPoint(gridPos)
        setIsDragging(true)
        return
      }
    }
  }, [state.selectedTool, state.currentPolygon, screenToWorldCoords, updateState])

  // Gestion du mouvement de souris
  const handleMouseMove = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    const worldPos = screenToWorldCoords(e.clientX, e.clientY)
    const gridPos = snapToGrid(worldPos, GRID_SIZE)
    
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
    
    // Hover point (toujours afficher où sera le prochain point)
    setHoveredPoint(gridPos)
    
    // Drag en cours : afficher preview
    if (isDragging && drawStartPoint) {
      const tool = state.selectedTool
      
      // Vérifier distance minimum de drag
      const dragDistance = Math.hypot(
        gridPos.x - drawStartPoint.x,
        gridPos.y - drawStartPoint.y
      )
      
      if (dragDistance < CONSTRAINTS.creation.minDragDistance) {
        setCreationPreview(null)
        return
      }
      
      let previewPolygon: Point[] = []
      let valid = true
      
      if (tool === 'rectangle') {
        previewPolygon = [
          drawStartPoint,
          { x: gridPos.x, y: drawStartPoint.y },
          gridPos,
          { x: drawStartPoint.x, y: gridPos.y }
        ]
      } else if (tool === 'circle') {
        const radius = Math.max(
          Math.abs(gridPos.x - drawStartPoint.x),
          Math.abs(gridPos.y - drawStartPoint.y)
        )
        previewPolygon = createCirclePolygon(drawStartPoint, radius)
      } else if (tool === 'triangle') {
        previewPolygon = createTrianglePolygon(drawStartPoint, gridPos)
      } else if (tool === 'arc') {
        const startPoint = { x: drawStartPoint.x + (gridPos.x - drawStartPoint.x), y: drawStartPoint.y }
        previewPolygon = createArcPolygon(drawStartPoint, startPoint, gridPos)
      } else if (tool === 'wall' || tool === 'door' || tool === 'stairs' || tool === 'elevator') {
        previewPolygon = [drawStartPoint, gridPos]
      }
      
      // Validation rapide pour les rooms
      if (previewPolygon.length > 2 && (tool === 'rectangle' || tool === 'circle' || tool === 'triangle' || tool === 'arc')) {
        const tempRoom: Room = {
          id: 'temp',
          polygon: previewPolygon
        }
        const validation = validateRoomGeometry(tempRoom, {
          floor: currentFloor,
          strictMode: false,
          allowWarnings: true
        })
        valid = validation.valid || validation.severity !== 'error'
      }
      
      setCreationPreview({ polygon: previewPolygon, valid })
      setIsValidPlacement(valid)
    }
  }, [isDragging, drawStartPoint, isPanning, lastPanPos, state.selectedTool, state.pan, screenToWorldCoords, currentFloor, updateState])

  // Gestion du mouseUp
  const handleMouseUp = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    // Fin du pan
    if (e.button === 1) {
      setIsPanning(false)
      setLastPanPos(null)
      return
    }
    
    // Fin du drag : créer la forme
    if (e.button === 0 && isDragging && drawStartPoint) {
      const worldPos = screenToWorldCoords(e.clientX, e.clientY)
      const gridPos = snapToGrid(worldPos, GRID_SIZE)
      
      // Vérifier distance minimum
      const dragDistance = Math.hypot(
        gridPos.x - drawStartPoint.x,
        gridPos.y - drawStartPoint.y
      )
      
      if (dragDistance < CONSTRAINTS.creation.minDragDistance) {
        console.warn("Distance de drag insuffisante")
        setIsDragging(false)
        setDrawStartPoint(null)
        setCreationPreview(null)
        return
      }
      
      const tool = state.selectedTool
      let roomToCreate: Room | null = null
      
      if (tool === 'rectangle') {
        roomToCreate = {
          id: uuidv4(),
          polygon: [
            drawStartPoint,
            { x: gridPos.x, y: drawStartPoint.y },
            gridPos,
            { x: drawStartPoint.x, y: gridPos.y }
          ]
        }
      } else if (tool === 'circle') {
        const radius = Math.max(
          Math.abs(gridPos.x - drawStartPoint.x),
          Math.abs(gridPos.y - drawStartPoint.y)
        )
        roomToCreate = {
          id: uuidv4(),
          polygon: createCirclePolygon(drawStartPoint, radius)
        }
      } else if (tool === 'triangle') {
        roomToCreate = {
          id: uuidv4(),
          polygon: createTrianglePolygon(drawStartPoint, gridPos)
        }
      } else if (tool === 'arc') {
        const startPoint = { x: drawStartPoint.x + (gridPos.x - drawStartPoint.x), y: drawStartPoint.y }
        roomToCreate = {
          id: uuidv4(),
          polygon: createArcPolygon(drawStartPoint, startPoint, gridPos)
        }
      }
      
      if (roomToCreate) {
        // Validation avant création
        const validation = validateRoomGeometry(roomToCreate, {
          floor: currentFloor,
          strictMode: false,
          allowWarnings: true
        })
        
        if (validation.valid || validation.severity !== 'error') {
          const updatedFloors = state.floors.map(floor =>
            floor.id === currentFloor.id
              ? { ...floor, rooms: [...floor.rooms, roomToCreate!] }
              : floor
          )
          updateState({ floors: updatedFloors }, true, `Créer pièce ${tool}`)
        } else {
          console.warn("Création bloquée:", validation.message)
        }
      }
      
      // Pour wall, door, stairs, elevator
      if (tool === 'wall' || tool === 'door' || tool === 'stairs' || tool === 'elevator') {
        const updatedFloors = state.floors.map(floor => {
          if (floor.id !== currentFloor.id) return floor
          
          if (tool === 'wall') {
            return {
              ...floor,
              walls: [...floor.walls, {
                id: uuidv4(),
                segment: [drawStartPoint, gridPos] as readonly [Point, Point],
                thickness: 20
              }]
            }
          } else if (tool === 'door') {
            return {
              ...floor,
              doors: [...floor.doors, {
                id: uuidv4(),
                room_a: '',
                room_b: '',
                segment: [drawStartPoint, gridPos] as readonly [Point, Point],
                width: 90
              }]
            }
          } else {
            return {
              ...floor,
              verticalLinks: [...floor.verticalLinks, {
                id: uuidv4(),
                type: tool as 'stairs' | 'elevator',
                segment: [drawStartPoint, gridPos] as readonly [Point, Point],
                width: 100,
                to_floor: '',
                direction: 'up' as const
              }]
            }
          }
        })
        updateState({ floors: updatedFloors }, true, `Créer ${tool}`)
      }
      
      // Artwork (simple clic)
      if (tool === 'artwork') {
        const updatedFloors = state.floors.map(floor =>
          floor.id === currentFloor.id
            ? {
                ...floor,
                artworks: [...floor.artworks, {
                  id: uuidv4(),
                  name: 'Nouvelle œuvre',
                  xy: [gridPos.x, gridPos.y] as readonly [number, number],
                  pdf_id: undefined
                }]
              }
            : floor
        )
        updateState({ floors: updatedFloors }, true, 'Créer artwork')
      }
      
      // Réinitialiser
      setIsDragging(false)
      setDrawStartPoint(null)
      setCreationPreview(null)
    }
  }, [isDragging, drawStartPoint, state.selectedTool, state.floors, currentFloor.id, screenToWorldCoords, updateState])

  // Rendu
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)

    // Grille
    drawGrid(ctx, width, height, state.zoom, state.pan)

    // Rooms
    currentFloor.rooms.forEach(room => {
      const isSelected = state.selectedElementId === room.id
      drawRoom(ctx, room, state.zoom, state.pan, isSelected, false)
    })

    // Walls
    currentFloor.walls.forEach(wall => {
      const isSelected = state.selectedElementId === wall.id
      drawWall(ctx, wall, state.zoom, state.pan, isSelected, false)
    })

    // Doors
    currentFloor.doors.forEach(door => {
      const isSelected = state.selectedElementId === door.id
      drawDoor(ctx, door, state.zoom, state.pan, GRID_SIZE, isSelected, false, false)
    })

    // Artworks
    currentFloor.artworks.forEach(artwork => {
      const isSelected = state.selectedElementId === artwork.id
      drawArtwork(ctx, artwork, state.zoom, state.pan, isSelected, false)
    })

    // Vertical links
    currentFloor.verticalLinks.forEach(link => {
      const isSelected = state.selectedElementId === link.id
      drawVerticalLink(ctx, link, state.zoom, state.pan, GRID_SIZE, isSelected, false, false)
    })

    // Preview de création
    if (creationPreview) {
      ctx.save()
      ctx.beginPath()
      const firstPoint = worldToScreenCoords(
        creationPreview.polygon[0].x * GRID_SIZE,
        creationPreview.polygon[0].y * GRID_SIZE
      )
      ctx.moveTo(firstPoint.x, firstPoint.y)
      
      for (let i = 1; i < creationPreview.polygon.length; i++) {
        const point = worldToScreenCoords(
          creationPreview.polygon[i].x * GRID_SIZE,
          creationPreview.polygon[i].y * GRID_SIZE
        )
        ctx.lineTo(point.x, point.y)
      }
      ctx.closePath()
      
      // Couleur selon validité
      const color = creationPreview.valid 
        ? VISUAL_FEEDBACK.colors.valid 
        : VISUAL_FEEDBACK.colors.invalid
      ctx.fillStyle = color.replace(')', ', 0.2)')
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    }

    // Hover point (indicateur de position)
    if (hoveredPoint && !isDragging) {
      const screenPos = worldToScreenCoords(
        hoveredPoint.x * GRID_SIZE,
        hoveredPoint.y * GRID_SIZE
      )
      ctx.save()
      ctx.fillStyle = VISUAL_FEEDBACK.colors.creating
      ctx.beginPath()
      ctx.arc(screenPos.x, screenPos.y, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // Échelle
    drawScale(ctx, width, height, state.zoom)
  }, [currentFloor, state, creationPreview, hoveredPoint, isDragging, worldToScreenCoords])

  // Effect pour le rendu
  useEffect(() => {
    render()
  }, [render])

  // Effect pour le wheel
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // Resize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const resizeCanvas = () => {
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
      render()
    }

    const resizeObserver = new ResizeObserver(resizeCanvas)
    resizeObserver.observe(container)

    resizeCanvas()

    return () => resizeObserver.disconnect()
  }, [render])

  // Curseur adaptatif
  const getCursor = () => {
    if (isPanning) return 'grabbing'
    if (isDragging) return 'crosshair'
    if (state.selectedTool !== 'select') return 'crosshair'
    return 'default'
  }

  return (
    <div ref={containerRef} className="relative w-full h-full bg-white overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ cursor: getCursor() }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  )
}
