/**
 * Hook pour gérer le déplacement (drag) d'éléments sélectionnés
 * Supporte : rooms, walls, doors, artworks, verticalLinks, entrances
 * Validation temps réel pendant le déplacement
 */

import { useState, useCallback, type MouseEvent } from "react"
import type { Point, EditorState, Floor, SelectedElement, Room } from "@/core/entities"
import { HISTORY_ACTIONS, GRID_SIZE } from "@/core/constants"
import {
  translateRoom,
  translateWall,
  translateDoor,
  translateArtwork,
  translateVerticalLink,
  translateEntrance,
  calculateDelta,
  validateRoomMoveWithDoors,
  snapToGrid,
  validateRoomGeometry,
  validateWallPlacement,
  isPointInPolygon,
  validateVerticalLinkMove,
  projectPointOntoSegment,
  distance,
  validateArtworkPlacement,
  validateDoorMove
} from "@/core/services"
import { validateRoomModificationWithWalls } from "@/core/services/cascade.service"

interface ElementDragOptions {
  state: EditorState
  currentFloor: Floor
  updateState: (updates: Partial<EditorState>, saveHistory?: boolean, description?: string) => void
  screenToWorld: (x: number, y: number) => Point
}

interface DragState {
  isDragging: boolean
  draggedElements: SelectedElement[]
  startPosition: Point | null
  currentPosition: Point | null
  originalElements: Map<string, any>
  isValid: boolean
  validationMessage: string | null
}

/**
 * Contraindre le déplacement d'une porte sur l'axe de son mur d'origine
 * La porte peut glisser uniquement le long du mur, pas perpendiculairement
 * Les portes sont en coordonnées GRILLE, le delta est en PIXELS
 */
function constrainDoorToWallAxis(door: any, delta: Point): any {
  // IMPORTANT: Les door.segment sont en coordonnées GRILLE (unités)
  // Le delta est en PIXELS (coordonnées monde)
  // Il faut convertir le delta en unités de grille
  
  const deltaGrid = {
    x: delta.x / GRID_SIZE,
    y: delta.y / GRID_SIZE
  }
  
  // Calculer le vecteur du mur (en unités de grille)
  const wallVector = {
    x: door.segment[1].x - door.segment[0].x,
    y: door.segment[1].y - door.segment[0].y
  }
  
  // Longueur du mur
  const wallLength = Math.sqrt(wallVector.x ** 2 + wallVector.y ** 2)
  if (wallLength === 0) return door // Mur invalide, pas de déplacement
  
  // Normaliser le vecteur du mur
  const wallNormalized = {
    x: wallVector.x / wallLength,
    y: wallVector.y / wallLength
  }
  
  // Projeter le delta sur l'axe du mur (produit scalaire)
  const projectedDistance = deltaGrid.x * wallNormalized.x + deltaGrid.y * wallNormalized.y
  
  // Calculer le delta contraint (uniquement le long du mur, en grille)
  const constrainedDeltaGrid = {
    x: projectedDistance * wallNormalized.x,
    y: projectedDistance * wallNormalized.y
  }
  
  // Arrondir à la grille (snap case par case)
  const snappedDeltaGrid = {
    x: Math.round(constrainedDeltaGrid.x),
    y: Math.round(constrainedDeltaGrid.y)
  }
  
  // Appliquer le déplacement contraint
  return {
    ...door,
    segment: [
      { 
        x: door.segment[0].x + snappedDeltaGrid.x, 
        y: door.segment[0].y + snappedDeltaGrid.y 
      },
      { 
        x: door.segment[1].x + snappedDeltaGrid.x, 
        y: door.segment[1].y + snappedDeltaGrid.y 
      }
    ]
  }
}

/**
 * Calcule les murs extérieurs d'un étage (segments non partagés entre pièces)
 */
function getExteriorWalls(floor: Floor): Array<{ start: Point; end: Point; roomId: string }> {
  const walls: Array<{ start: Point; end: Point; roomId: string }> = []
  
  floor.rooms.forEach((room) => {
    const polygon = room.polygon
    for (let i = 0; i < polygon.length; i++) {
      const start = polygon[i]
      const end = polygon[(i + 1) % polygon.length]
      
      // Vérifier si ce segment est partagé avec une autre pièce
      const isShared = floor.rooms.some(otherRoom => {
        if (otherRoom.id === room.id) return false
        return otherRoom.polygon.some((p1, j) => {
          const p2 = otherRoom.polygon[(j + 1) % otherRoom.polygon.length]
          const tolerance = 1
          const isSame = (
            (Math.abs(start.x - p1.x) < tolerance && Math.abs(start.y - p1.y) < tolerance &&
             Math.abs(end.x - p2.x) < tolerance && Math.abs(end.y - p2.y) < tolerance) ||
            (Math.abs(start.x - p2.x) < tolerance && Math.abs(start.y - p2.y) < tolerance &&
             Math.abs(end.x - p1.x) < tolerance && Math.abs(end.y - p1.y) < tolerance)
          )
          return isSame
        })
      })
      
      if (!isShared) {
        walls.push({ start, end, roomId: room.id })
      }
    }
  })
  
  return walls
}

/**
 * Contraindre le déplacement d'une entrée aux murs extérieurs
 * L'entrée peut glisser uniquement le long des murs extérieurs des pièces
 */
function constrainEntranceToExteriorWalls(
  entrance: { x: number; y: number; id: string; name?: string; planId: number },
  delta: Point,
  floor: Floor
): { x: number; y: number; id: string; name?: string; planId: number } {
  const exteriorWalls = getExteriorWalls(floor)
  if (exteriorWalls.length === 0) {
    // Pas de murs, simple translation
    return {
      ...entrance,
      x: entrance.x + delta.x,
      y: entrance.y + delta.y
    }
  }
  
  // Position souhaitée
  const targetPos = {
    x: entrance.x + delta.x,
    y: entrance.y + delta.y
  }
  
  // Trouver le mur extérieur le plus proche de la position cible
  let nearestWall: { start: Point; end: Point } | null = null
  let nearestProjection: Point | null = null
  let minDist = Infinity
  
  for (const wall of exteriorWalls) {
    const projected = projectPointOntoSegment(targetPos, wall.start, wall.end)
    const dist = distance(targetPos, projected)
    
    if (dist < minDist) {
      minDist = dist
      nearestWall = wall
      nearestProjection = projected
    }
  }
  
  if (!nearestProjection) {
    return entrance // Pas de changement si pas de mur trouvé
  }
  
  // Snapper à la grille
  const snappedPos = snapToGrid(nearestProjection, GRID_SIZE)
  
  return {
    ...entrance,
    x: snappedPos.x,
    y: snappedPos.y
  }
}

/**
 * Vérifie que l'entrée reste sur un mur extérieur après le déplacement d'une room
 * Empêche de déplacer une room si ça "décolle" l'entrée du mur
 */
function validateEntranceAfterRoomMove(
  floor: Floor
): { valid: boolean; message?: string } {
  if (!floor.entrances || floor.entrances.length === 0) {
    return { valid: true }
  }
  
  const exteriorWalls = getExteriorWalls(floor)
  if (exteriorWalls.length === 0) {
    return { valid: true } // Pas de murs, pas de contrainte
  }
  
  // Vérifier que chaque entrée est encore sur un mur extérieur
  for (const entrance of floor.entrances) {
    const entrancePos = { x: entrance.x, y: entrance.y }
    let isOnWall = false
    
    for (const wall of exteriorWalls) {
      const projected = projectPointOntoSegment(entrancePos, wall.start, wall.end)
      const dist = distance(entrancePos, projected)
      
      // Tolérance de 5 pixels pour considérer l'entrée comme étant sur le mur
      if (dist <= 5) {
        isOnWall = true
        break
      }
    }
    
    if (!isOnWall) {
      return {
        valid: false,
        message: "L'entrée doit rester sur un mur extérieur"
      }
    }
  }
  
  return { valid: true }
}

export function useElementDrag({
  state,
  currentFloor,
  updateState,
  screenToWorld
}: ElementDragOptions) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedElements: [],
    startPosition: null,
    currentPosition: null,
    originalElements: new Map(),
    isValid: true,
    validationMessage: null
  })

  /**
   * Démarrer le drag d'éléments sélectionnés
   */
  const startDrag = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    if (state.selectedElements.length === 0) return
    
    // Ne pas déplacer les vertices/segments individuels (c'est pour useVertexEdit)
    const hasSubElements = state.selectedElements.some(
      el => el.type === 'vertex' || el.type === 'segment'
    )
    if (hasSubElements) return

    const worldPos = screenToWorld(e.clientX, e.clientY)
    // IMPORTANT: Snap la position de départ pour garantir un déplacement aligné sur grille
    const snappedStartPos = snapToGrid(worldPos, GRID_SIZE)
    
    // Sauvegarder les éléments originaux
    const originalElements = new Map()
    
    state.selectedElements.forEach(selected => {
      let element: unknown = null
      
      switch (selected.type) {
        case 'room':
          const room = currentFloor.rooms.find(r => r.id === selected.id)
          element = room
          
          // IMPORTANT: Sauvegarder aussi TOUS les enfants attachés à cette room
          if (room) {
            const attachedWalls = currentFloor.walls?.filter(w => w.roomId === selected.id) || []
            const attachedDoors = currentFloor.doors?.filter(d => d.roomId === selected.id) || []
            
            // Artworks: chercher par roomId OU par position géométrique (fallback)
            const attachedArtworks = currentFloor.artworks?.filter(a => {
              if (a.roomId === selected.id) return true
              // Fallback: vérifier si le centre de l'artwork est dans la room
              const sizeW = a.size ? a.size[0] : 0
              const sizeH = a.size ? a.size[1] : 0
              const center = { x: a.xy[0] + sizeW / 2, y: a.xy[1] + sizeH / 2 }
              return room.polygon && room.polygon.length >= 3 && isPointInPolygon(center, room.polygon)
            }) || []
            
            const attachedVerticalLinks = currentFloor.verticalLinks?.filter(v => 
              v.roomId === selected.id && v.floorId === currentFloor.id
            ) || []
            
            attachedWalls.forEach(wall => {
              originalElements.set(`wall_${wall.id}`, JSON.parse(JSON.stringify(wall)))
            })
            attachedDoors.forEach(door => {
              originalElements.set(`door_${door.id}`, JSON.parse(JSON.stringify(door)))
            })
            attachedArtworks.forEach(artwork => {
              originalElements.set(`artwork_${artwork.id}`, JSON.parse(JSON.stringify(artwork)))
            })
            attachedVerticalLinks.forEach(vlink => {
              originalElements.set(`verticalLink_${vlink.id}`, JSON.parse(JSON.stringify(vlink)))
            })
          }
          break
        case 'wall':
          element = currentFloor.walls?.find(w => w.id === selected.id)
          break
        case 'door':
          element = currentFloor.doors?.find(d => d.id === selected.id)
          break
        case 'artwork':
          element = currentFloor.artworks?.find(a => a.id === selected.id)
          break
        case 'verticalLink':
          element = currentFloor.verticalLinks?.find(v => v.id === selected.id)
          break
        case 'entrance':
          element = currentFloor.entrances?.find(e => e.id === selected.id)
          break
      }
      
      if (element) {
        originalElements.set(selected.id, JSON.parse(JSON.stringify(element)))
      }
    })
    
    setDragState({
      isDragging: true,
      draggedElements: [...state.selectedElements],
      startPosition: snappedStartPos,  // Position snappée
      currentPosition: snappedStartPos, // Position snappée
      originalElements,
      isValid: true,
      validationMessage: null
    })
  }, [state.selectedElements, currentFloor, screenToWorld])

  /**
   * Mettre à jour la position pendant le drag
   */
  const updateDrag = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    if (!dragState.isDragging || !dragState.startPosition) return

    const worldPos = screenToWorld(e.clientX, e.clientY)
    const snappedPos = snapToGrid(worldPos, GRID_SIZE)
    
    // Calculer le delta
    const delta = calculateDelta(dragState.startPosition, snappedPos)
    
    // Créer les nouveaux éléments
    const updatedFloors = state.floors.map(floor => {
      if (floor.id !== currentFloor.id) return floor
      
      let newRooms = [...floor.rooms]
      let newWalls = floor.walls ? [...floor.walls] : []
      let newDoors = floor.doors ? [...floor.doors] : []
      let newArtworks = floor.artworks ? [...floor.artworks] : []
      let newVerticalLinks = floor.verticalLinks ? [...floor.verticalLinks] : []
      let newEntrances = floor.entrances ? [...floor.entrances] : []
      
      // Appliquer la transformation à chaque élément
      dragState.draggedElements.forEach(selected => {
        const original = dragState.originalElements.get(selected.id)
        if (!original) return
        
        switch (selected.type) {
          case 'room':
            // Déplacer la room
            const roomIndex = newRooms.findIndex(r => r.id === selected.id)
            if (roomIndex >= 0) {
              newRooms[roomIndex] = translateRoom(original, delta)
            }
            
            // Déplacer TOUS les enfants originaux sauvegardés
            // Récupérer les walls enfants depuis dragState.originalElements
            Array.from(dragState.originalElements.entries()).forEach(([key, element]) => {
              if (key.startsWith('wall_')) {
                const wallId = key.substring(5) // Enlever le préfixe 'wall_'
                const idx = newWalls.findIndex(w => w.id === wallId)
                if (idx >= 0) {
                  newWalls[idx] = translateWall(element, delta)
                }
              } else if (key.startsWith('door_')) {
                const doorId = key.substring(5)
                const idx = newDoors.findIndex(d => d.id === doorId)
                if (idx >= 0) {
                  newDoors[idx] = translateDoor(element, delta)
                }
              } else if (key.startsWith('artwork_')) {
                const artworkId = key.substring(8)
                const idx = newArtworks.findIndex(a => a.id === artworkId)
                if (idx >= 0) {
                  const translated = translateArtwork(element, delta)
                  // Préserver/assigner le roomId lors du déplacement avec la room
                  newArtworks[idx] = {
                    ...translated,
                    roomId: element.roomId || selected.id // Assigner si manquant
                  }
                }
              } else if (key.startsWith('verticalLink_')) {
                const linkId = key.substring(13)
                const idx = newVerticalLinks.findIndex(v => v.id === linkId)
                if (idx >= 0) {
                  const translatedLink = translateVerticalLink(element, delta)
                  
                  // Recalculer le roomId après déplacement avec la room
                  const [width, height] = translatedLink.size || [80, 120]
                  const corners = [
                    { x: translatedLink.position.x, y: translatedLink.position.y },
                    { x: translatedLink.position.x + width, y: translatedLink.position.y },
                    { x: translatedLink.position.x + width, y: translatedLink.position.y + height },
                    { x: translatedLink.position.x, y: translatedLink.position.y + height }
                  ]
                  
                  // Trouver la room qui contient tous les coins
                  const containingRoom = newRooms.find(r => 
                    r.polygon.length >= 3 && 
                    corners.every(corner => isPointInPolygon(corner, r.polygon))
                  )
                  
                  newVerticalLinks[idx] = {
                    ...translatedLink,
                    roomId: containingRoom?.id || element.roomId // Garder l'ancien si pas trouvé
                  }
                }
              }
            })
            break
            
          case 'wall':
            const wallIndex = newWalls.findIndex(w => w.id === selected.id)
            if (wallIndex >= 0) {
              newWalls[wallIndex] = translateWall(original, delta)
            }
            break
            
          case 'door':
            const doorIndex = newDoors.findIndex(d => d.id === selected.id)
            if (doorIndex >= 0) {
              // Contraindre le déplacement de la porte sur l'axe de son mur
              const newPosition = constrainDoorToWallAxis(original, delta)
              newDoors[doorIndex] = newPosition
            }
            break
            
          case 'artwork':
            const artworkIndex = newArtworks.findIndex(a => a.id === selected.id)
            if (artworkIndex >= 0) {
              const translatedArtwork = translateArtwork(original, delta)
              // Détecter la nouvelle room contenant l'artwork
              const sizeW = translatedArtwork.size ? translatedArtwork.size[0] : 0
              const sizeH = translatedArtwork.size ? translatedArtwork.size[1] : 0
              const centerPoint = { 
                x: translatedArtwork.xy[0] + sizeW / 2, 
                y: translatedArtwork.xy[1] + sizeH / 2 
              }
              const newRoom = newRooms.find(r => 
                r.polygon.length >= 3 && isPointInPolygon(centerPoint, r.polygon)
              )
              newArtworks[artworkIndex] = {
                ...translatedArtwork,
                roomId: newRoom?.id
              }
            }
            break
            
          case 'verticalLink':
            const linkIndex = newVerticalLinks.findIndex(v => v.id === selected.id)
            if (linkIndex >= 0) {
              const translatedLink = translateVerticalLink(original, delta)
              
              // Recalculer le roomId en fonction de la nouvelle position
              const [width, height] = translatedLink.size || [80, 120]
              const corners = [
                { x: translatedLink.position.x, y: translatedLink.position.y },
                { x: translatedLink.position.x + width, y: translatedLink.position.y },
                { x: translatedLink.position.x + width, y: translatedLink.position.y + height },
                { x: translatedLink.position.x, y: translatedLink.position.y + height }
              ]
              
              // Trouver la room qui contient tous les coins du vertical link
              const newRoom = newRooms.find(r => 
                r.polygon.length >= 3 && 
                corners.every(corner => isPointInPolygon(corner, r.polygon))
              )
              
              newVerticalLinks[linkIndex] = {
                ...translatedLink,
                roomId: newRoom?.id
              }
            }
            break
            
          case 'entrance':
            const entranceIndex = newEntrances.findIndex(e => e.id === selected.id)
            if (entranceIndex >= 0) {
              // Contraindre l'entrée aux murs extérieurs
              newEntrances[entranceIndex] = constrainEntranceToExteriorWalls(original, delta, floor)
            }
            break
        }
      })
      
      return {
        ...floor,
        rooms: newRooms,
        walls: newWalls,
        doors: newDoors,
        artworks: newArtworks,
        verticalLinks: newVerticalLinks,
        entrances: newEntrances
      }
    })
    
    // Validation (pour les rooms et walls)
    let isValid = true
    let validationMessage: string | null = null
    
    for (const selected of dragState.draggedElements) {
      if (selected.type === 'room') {
        const updatedFloor = updatedFloors.find(f => f.id === currentFloor.id)
        const updatedRoom = updatedFloor?.rooms.find(r => r.id === selected.id)
        
        if (updatedRoom && updatedFloor) {
          // Validation géométrie
          const geometryValidation = validateRoomGeometry(updatedRoom, { floor: updatedFloor })
          if (!geometryValidation.valid) {
            isValid = false
            validationMessage = geometryValidation.message ?? null
            break
          }
          
          // NOUVEAU: Validation portes (vérifier que les portes restent valides)
          const doorValidation = validateRoomMoveWithDoors(selected.id, updatedRoom.polygon, updatedFloor)
          if (!doorValidation.valid) {
            isValid = false
            validationMessage = doorValidation.message ?? "Déplacement invaliderait les portes"
            break
          }
          
          // Validation que les murs enfants restent dans la room
          const wallsValidation = validateRoomModificationWithWalls(updatedRoom, updatedFloor)
          if (!wallsValidation.valid) {
            isValid = false
            validationMessage = wallsValidation.reason ?? null
            break
          }
          
          // NOUVEAU: Validation que les artworks restent dans la room après déplacement
          // Récupérer les IDs des artworks attachés depuis originalElements
          const attachedArtworkIds = Array.from(dragState.originalElements.keys())
            .filter(key => key.startsWith('artwork_'))
            .map(key => key.substring(8))
          
          // Vérifier que chaque artwork déplacé reste dans la room déplacée
          for (const artworkId of attachedArtworkIds) {
            const movedArtwork = updatedFloor.artworks?.find(a => a.id === artworkId)
            if (!movedArtwork) continue
            
            const artworkValidation = validateArtworkPlacement(movedArtwork, { 
              floor: updatedFloor,
              excludeIds: [movedArtwork.id]
            })
            if (!artworkValidation.valid) {
              isValid = false
              validationMessage = "Déplacement invaliderait les œuvres de la pièce"
              break
            }
          }
          if (!isValid) break
          
          // NOUVEAU: Validation que les entrées restent sur un mur extérieur
          // Vérifier si une entrée est attachée à cette room et resterait valide
          if (updatedFloor.entrances && updatedFloor.entrances.length > 0) {
            const entranceValidation = validateEntranceAfterRoomMove(updatedFloor)
            if (!entranceValidation.valid) {
              isValid = false
              validationMessage = entranceValidation.message ?? "Déplacement invaliderait l'entrée"
              break
            }
          }
        }
      } else if (selected.type === 'wall') {
        const updatedFloor = updatedFloors.find(f => f.id === currentFloor.id)
        const updatedWall = updatedFloor?.walls?.find(w => w.id === selected.id)
        
        if (updatedWall && updatedFloor) {
          const validation = validateWallPlacement(updatedWall, { floor: updatedFloor, strictMode: true })
          if (!validation.valid) {
            isValid = false
            validationMessage = validation.message ?? null
            break
          }
        }
      } else if (selected.type === 'verticalLink') {
        const updatedFloor = updatedFloors.find(f => f.id === currentFloor.id)
        const originalLink = dragState.originalElements.get(selected.id)
        
        if (originalLink && updatedFloor) {
          const validation = validateVerticalLinkMove(originalLink, delta, updatedFloor)
          if (!validation.valid) {
            isValid = false
            validationMessage = validation.message ?? 'Déplacement invalide'
            break
          }
        }
      } else if (selected.type === 'artwork') {
        const updatedFloor = updatedFloors.find(f => f.id === currentFloor.id)
        const updatedArtwork = updatedFloor?.artworks?.find(a => a.id === selected.id)
        
        if (updatedArtwork && updatedFloor) {
          const validation = validateArtworkPlacement(updatedArtwork, { 
            floor: updatedFloor,
            excludeIds: [selected.id]
          })
          if (!validation.valid) {
            isValid = false
            validationMessage = validation.message ?? 'Déplacement invalide - œuvre hors de la pièce'
            break
          }
        }
      } else if (selected.type === 'door') {
        const updatedFloor = updatedFloors.find(f => f.id === currentFloor.id)
        const updatedDoor = updatedFloor?.doors?.find(d => d.id === selected.id)
        
        if (updatedDoor && updatedFloor) {
          const validation = validateDoorMove(updatedDoor, updatedFloor)
          if (!validation.valid) {
            isValid = false
            validationMessage = validation.message ?? 'Déplacement invalide - porte hors du mur'
            break
          }
        }
      }
    }
    
    // Mettre à jour l'état temporaire (sans historique)
    updateState({ floors: updatedFloors }, false)
    
    setDragState(prev => ({
      ...prev,
      currentPosition: snappedPos,
      isValid,
      validationMessage
    }))
  }, [dragState, state.floors, currentFloor, screenToWorld, updateState])

  /**
   * Terminer le drag
   */
  const finishDrag = useCallback(async () => {
    if (!dragState.isDragging) return

    if (dragState.isValid && dragState.startPosition && dragState.currentPosition) {
      // Le drag est valide, sauvegarder dans l'historique
      const description = dragState.draggedElements.length > 1 
        ? HISTORY_ACTIONS.MOVE_ELEMENTS
        : dragState.draggedElements[0]?.type === 'room'
        ? HISTORY_ACTIONS.MOVE_ROOM
        : dragState.draggedElements[0]?.type === 'wall'
        ? HISTORY_ACTIONS.MOVE_WALL
        : dragState.draggedElements[0]?.type === 'door'
        ? HISTORY_ACTIONS.MOVE_DOOR
        : dragState.draggedElements[0]?.type === 'artwork'
        ? HISTORY_ACTIONS.MOVE_ARTWORK
        : HISTORY_ACTIONS.MOVE_ELEMENTS
      
      // ENTRANCES: Persister en DB via API PUT (elles ne passent pas par save-to-db)
      for (const element of dragState.draggedElements) {
        if (element.type === 'entrance') {
          const entrance = currentFloor.entrances?.find(e => e.id === element.id)
          if (entrance) {
            // Extraire l'entrance_id depuis l'id (format: "entrance-123")
            const entranceIdMatch = element.id.match(/^entrance-(\d+)$/)
            if (entranceIdMatch) {
              const entranceId = parseInt(entranceIdMatch[1], 10)
              try {
                await fetch('/api/museum/entrances', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    entrance_id: entranceId,
                    x: entrance.x,
                    y: entrance.y
                  })
                })
                console.log(`✅ Entrance ${entranceId} position mise à jour en DB`)
              } catch (error) {
                console.error(`❌ Erreur mise à jour entrance ${entranceId}:`, error)
              }
            }
          }
        }
      }
      
      updateState({}, true, description)
    } else {
      // Le drag est invalide, restaurer l'état original COMPLET (éléments + enfants)
      const updatedFloors = state.floors.map(floor => {
        if (floor.id !== currentFloor.id) return floor
        
        let newRooms = [...floor.rooms]
        let newWalls = floor.walls ? [...floor.walls] : []
        let newDoors = floor.doors ? [...floor.doors] : []
        let newArtworks = floor.artworks ? [...floor.artworks] : []
        let newVerticalLinks = floor.verticalLinks ? [...floor.verticalLinks] : []
        
        // Restaurer TOUS les éléments originaux (y compris enfants)
        Array.from(dragState.originalElements.entries()).forEach(([key, original]) => {
          if (key.startsWith('wall_')) {
            const wallId = key.substring(5)
            const idx = newWalls.findIndex(w => w.id === wallId)
            if (idx >= 0) {
              newWalls[idx] = original
            }
          } else if (key.startsWith('door_')) {
            const doorId = key.substring(5)
            const idx = newDoors.findIndex(d => d.id === doorId)
            if (idx >= 0) {
              newDoors[idx] = original
            }
          } else if (key.startsWith('artwork_')) {
            const artworkId = key.substring(8)
            const idx = newArtworks.findIndex(a => a.id === artworkId)
            if (idx >= 0) {
              newArtworks[idx] = original
            }
          } else if (key.startsWith('verticalLink_')) {
            const linkId = key.substring(13)
            const idx = newVerticalLinks.findIndex(v => v.id === linkId)
            if (idx >= 0) {
              newVerticalLinks[idx] = original
            }
          } else {
            // Élément principal (room, wall, door, artwork, verticalLink)
            const selected = dragState.draggedElements.find(el => el.id === key)
            if (!selected) return
            
            switch (selected.type) {
              case 'room':
                const roomIndex = newRooms.findIndex(r => r.id === key)
                if (roomIndex >= 0) {
                  newRooms[roomIndex] = original
                }
                break
                
              case 'wall':
                const wallIndex = newWalls.findIndex(w => w.id === key)
                if (wallIndex >= 0) {
                  newWalls[wallIndex] = original
                }
                break
                
              case 'door':
                const doorIndex = newDoors.findIndex(d => d.id === key)
                if (doorIndex >= 0) {
                  newDoors[doorIndex] = original
                }
                break
                
              case 'artwork':
                const artworkIndex = newArtworks.findIndex(a => a.id === key)
                if (artworkIndex >= 0) {
                  newArtworks[artworkIndex] = original
                }
                break
                
              case 'verticalLink':
                const linkIndex = newVerticalLinks.findIndex(v => v.id === key)
                if (linkIndex >= 0) {
                  newVerticalLinks[linkIndex] = original
                }
                break
            }
          }
        })
        
        return {
          ...floor,
          rooms: newRooms,
          walls: newWalls,
          doors: newDoors,
          artworks: newArtworks,
          verticalLinks: newVerticalLinks
        }
      })
      
      updateState({ floors: updatedFloors }, false)
    }
    
    setDragState({
      isDragging: false,
      draggedElements: [],
      startPosition: null,
      currentPosition: null,
      originalElements: new Map(),
      isValid: true,
      validationMessage: null
    })
  }, [dragState, state.floors, currentFloor, updateState])

  /**
   * Annuler le drag
   */
  const cancelDrag = useCallback(() => {
    if (!dragState.isDragging) return

    // Restaurer l'état original
    const updatedFloors = state.floors.map(floor => {
      if (floor.id !== currentFloor.id) return floor
      
      let newRooms = [...floor.rooms]
      let newWalls = floor.walls ? [...floor.walls] : []
      let newDoors = floor.doors ? [...floor.doors] : []
      let newArtworks = floor.artworks ? [...floor.artworks] : []
      let newVerticalLinks = floor.verticalLinks ? [...floor.verticalLinks] : []
      
      dragState.draggedElements.forEach(selected => {
        const original = dragState.originalElements.get(selected.id)
        if (!original) return
        
        switch (selected.type) {
          case 'room':
            const roomIndex = newRooms.findIndex(r => r.id === selected.id)
            if (roomIndex >= 0) {
              newRooms[roomIndex] = original
            }
            break
          // ... autres cas similaires
        }
      })
      
      return {
        ...floor,
        rooms: newRooms,
        walls: newWalls,
        doors: newDoors,
        artworks: newArtworks,
        verticalLinks: newVerticalLinks
      }
    })
    
    updateState({ floors: updatedFloors }, false)
    
    setDragState({
      isDragging: false,
      draggedElements: [],
      startPosition: null,
      currentPosition: null,
      originalElements: new Map(),
      isValid: true,
      validationMessage: null
    })
  }, [dragState, state.floors, currentFloor, updateState])

  return {
    dragState,
    startDrag,
    updateDrag,
    finishDrag,
    cancelDrag
  }
}
