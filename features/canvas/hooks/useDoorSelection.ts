/**
 * HOOK SÉLECTION ET MANIPULATION DE PORTES
 * Permet de sélectionner, déplacer et redimensionner les portes
 */

import { useState, useCallback, type MouseEvent } from 'react'
import type { Point, Floor, Door } from '@/core/entities'
import { distance, snapToGrid } from '@/core/services'
import { validateDoorPlacement, type SharedWallSegment } from '@/core/services'
import { GRID_SIZE, CONSTRAINTS } from '@/core/constants'

export interface DoorSelectionState {
  readonly selectedDoor: Door | null
  readonly editMode: 'move' | 'resize-start' | 'resize-end' | null
  readonly isDragging: boolean
  readonly startPoint: Point | null
  readonly previewDoor: Door | null
  readonly isValid: boolean
  readonly validationMessage: string | null
}

interface UseDoorSelectionProps {
  readonly currentFloor: Floor
  readonly onUpdate: (door: Door) => void
}

interface UseDoorSelectionReturn {
  readonly state: DoorSelectionState
  readonly selectDoor: (doorId: string, point: Point) => void
  readonly startDrag: (point: Point) => void
  readonly updateDrag: (point: Point) => void
  readonly completeDrag: () => void
  readonly cancelDrag: () => void
  readonly deselectDoor: () => void
}

const HANDLE_RADIUS = 12 // Rayon de détection pour les poignées en pixels

export function useDoorSelection({
  currentFloor,
  onUpdate
}: UseDoorSelectionProps): UseDoorSelectionReturn {
  
  const [state, setState] = useState<DoorSelectionState>({
    selectedDoor: null,
    editMode: null,
    isDragging: false,
    startPoint: null,
    previewDoor: null,
    isValid: true,
    validationMessage: null
  })

  /**
   * Sélectionne une porte et détermine le mode d'édition selon le point cliqué
   */
  const selectDoor = useCallback((doorId: string, point: Point) => {
    const door = currentFloor.doors.find(d => d.id === doorId)
    if (!door) return

    // Convertir coordonnées grille -> pixels
    const startPixels = {
      x: door.segment[0].x * GRID_SIZE,
      y: door.segment[0].y * GRID_SIZE
    }
    const endPixels = {
      x: door.segment[1].x * GRID_SIZE,
      y: door.segment[1].y * GRID_SIZE
    }

    // Vérifier quelle partie est cliquée
    const distToStart = distance(point, startPixels)
    const distToEnd = distance(point, endPixels)

    let editMode: 'move' | 'resize-start' | 'resize-end' = 'move'

    if (distToStart < HANDLE_RADIUS) {
      editMode = 'resize-start'
    } else if (distToEnd < HANDLE_RADIUS) {
      editMode = 'resize-end'
    }

    setState({
      selectedDoor: door,
      editMode,
      isDragging: false,
      startPoint: null,
      previewDoor: null,
      isValid: true,
      validationMessage: null
    })
  }, [currentFloor])

  /**
   * Commence le drag
   */
  const startDrag = useCallback((point: Point) => {
    if (!state.selectedDoor) return

    setState(prev => ({
      ...prev,
      isDragging: true,
      startPoint: point,
      previewDoor: prev.selectedDoor
    }))
  }, [state.selectedDoor])

  /**
   * Met à jour pendant le drag
   */
  const updateDrag = useCallback((point: Point) => {
    if (!state.isDragging || !state.selectedDoor || !state.startPoint) return

    const snappedPoint = snapToGrid(point, GRID_SIZE)
    const door = state.selectedDoor

    // Trouver le mur partagé pour cette porte
    const { findSharedWallSegments } = require('@/core/services/door.service')
    const sharedWalls: SharedWallSegment[] = findSharedWallSegments(currentFloor)
    const sharedWall = sharedWalls.find(w => 
      (w.room_a === door.room_a && w.room_b === door.room_b) ||
      (w.room_a === door.room_b && w.room_b === door.room_a)
    )

    if (!sharedWall) {
      setState(prev => ({
        ...prev,
        isValid: false,
        validationMessage: "Mur partagé introuvable"
      }))
      return
    }

    let newDoor: Door | null = null

    if (state.editMode === 'move') {
      // Translation le long du segment
      newDoor = translateDoorAlongSegment(door, snappedPoint, sharedWall.segment)
    } else if (state.editMode === 'resize-start' || state.editMode === 'resize-end') {
      // Redimensionnement
      newDoor = resizeDoor(door, snappedPoint, state.editMode, sharedWall.segment)
    }

    if (!newDoor) {
      setState(prev => ({
        ...prev,
        previewDoor: null,
        isValid: false,
        validationMessage: "Position invalide"
      }))
      return
    }

    // Valider
    const validation = validateDoorPlacement(newDoor, currentFloor)

    setState(prev => ({
      ...prev,
      previewDoor: newDoor,
      isValid: validation.valid,
      validationMessage: validation.message || null
    }))
  }, [state.isDragging, state.selectedDoor, state.startPoint, state.editMode, currentFloor])

  /**
   * Termine le drag
   */
  const completeDrag = useCallback(() => {
    if (!state.isDragging || !state.previewDoor || !state.isValid) {
      setState(prev => ({
        ...prev,
        isDragging: false,
        startPoint: null,
        previewDoor: null
      }))
      return
    }

    // Appeler onUpdate avec la porte modifiée
    onUpdate(state.previewDoor)

    setState(prev => ({
      ...prev,
      selectedDoor: state.previewDoor,
      isDragging: false,
      startPoint: null,
      previewDoor: null,
      isValid: true,
      validationMessage: null
    }))
  }, [state.isDragging, state.previewDoor, state.isValid, onUpdate])

  /**
   * Annule le drag
   */
  const cancelDrag = useCallback(() => {
    setState(prev => ({
      ...prev,
      isDragging: false,
      startPoint: null,
      previewDoor: null,
      isValid: true,
      validationMessage: null
    }))
  }, [])

  /**
   * Désélectionne la porte
   */
  const deselectDoor = useCallback(() => {
    setState({
      selectedDoor: null,
      editMode: null,
      isDragging: false,
      startPoint: null,
      previewDoor: null,
      isValid: true,
      validationMessage: null
    })
  }, [])

  return {
    state,
    selectDoor,
    startDrag,
    updateDrag,
    completeDrag,
    cancelDrag,
    deselectDoor
  }
}

/**
 * Translate une porte le long de son segment
 */
function translateDoorAlongSegment(
  door: Door,
  targetPoint: Point,
  wallSegment: readonly [Point, Point]
): Door | null {
  const [wallStart, wallEnd] = wallSegment

  // Projeter le point cible sur le segment du mur
  const projectedPoint = projectPointOntoSegment(targetPoint, wallStart, wallEnd)

  // Calculer le vecteur direction du mur
  const dx = wallEnd.x - wallStart.x
  const dy = wallEnd.y - wallStart.y
  const length = Math.sqrt(dx * dx + dy * dy)

  if (length < 0.01) return null

  const ux = dx / length
  const uy = dy / length

  // Demi-largeur en pixels
  const halfWidth = (door.width / 0.5) * GRID_SIZE / 2

  // Nouveaux points de la porte EN UNITÉS DE GRILLE
  const newStart: Point = {
    x: Math.round((projectedPoint.x - ux * halfWidth) / GRID_SIZE),
    y: Math.round((projectedPoint.y - uy * halfWidth) / GRID_SIZE)
  }

  const newEnd: Point = {
    x: Math.round((projectedPoint.x + ux * halfWidth) / GRID_SIZE),
    y: Math.round((projectedPoint.y + uy * halfWidth) / GRID_SIZE)
  }

  return {
    ...door,
    segment: [newStart, newEnd]
  }
}

/**
 * Redimensionne une porte en déplaçant une extrémité
 */
function resizeDoor(
  door: Door,
  targetPoint: Point,
  mode: 'resize-start' | 'resize-end',
  wallSegment: readonly [Point, Point]
): Door | null {
  const [wallStart, wallEnd] = wallSegment

  // Projeter le point cible sur le segment du mur
  const projectedPoint = projectPointOntoSegment(targetPoint, wallStart, wallEnd)

  // Point fixe (l'autre extrémité)
  const fixedPointGrid = mode === 'resize-start' ? door.segment[1] : door.segment[0]
  const fixedPointPixels = {
    x: fixedPointGrid.x * GRID_SIZE,
    y: fixedPointGrid.y * GRID_SIZE
  }

  // Calculer nouvelle largeur
  const newWidthPixels = distance(fixedPointPixels, projectedPoint)
  const newWidthMeters = (newWidthPixels / GRID_SIZE) * 0.5

  // Vérifier contraintes
  if (newWidthMeters < CONSTRAINTS.door.minWidth || newWidthMeters > CONSTRAINTS.door.maxWidth) {
    return null
  }

  // Convertir le point mobile en unités de grille
  const newMovingPoint: Point = {
    x: Math.round(projectedPoint.x / GRID_SIZE),
    y: Math.round(projectedPoint.y / GRID_SIZE)
  }

  const newSegment: readonly [Point, Point] = mode === 'resize-start'
    ? [newMovingPoint, fixedPointGrid]
    : [fixedPointGrid, newMovingPoint]

  return {
    ...door,
    segment: newSegment,
    width: newWidthMeters
  }
}

/**
 * Projette un point sur un segment (clamped)
 */
function projectPointOntoSegment(point: Point, segStart: Point, segEnd: Point): Point {
  const dx = segEnd.x - segStart.x
  const dy = segEnd.y - segStart.y
  const lengthSquared = dx * dx + dy * dy

  if (lengthSquared < 0.0001) {
    return { ...segStart }
  }

  const t = Math.max(0, Math.min(1,
    ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / lengthSquared
  ))

  return {
    x: segStart.x + t * dx,
    y: segStart.y + t * dy
  }
}
