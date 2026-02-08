/**
 * Hook pour créer un point d'entrée du musée SUR UN MUR EXTÉRIEUR
 * - Une seule entrée par plan
 * - Placement sur murs extérieurs uniquement
 * - Déplaçable le long du mur (comme les portes)
 */

import { useState, useCallback, useMemo } from "react"
import type { Floor, Point } from "@/core/entities"
import { distance, snapToGrid } from "@/core/services"
import { GRID_SIZE } from "@/core/constants"

export interface WallSegment {
  start: Point
  end: Point
  roomId: string
  segmentIndex: number
}

interface EntranceCreationState {
  readonly isCreating: boolean
  readonly selectedWall: WallSegment | null
  readonly previewPosition: Point | null
  readonly isValid: boolean
  readonly validationMessage: string | null
}

interface UseEntranceCreationProps {
  currentFloor: Floor
  onComplete: (position: Point, wallSegment?: WallSegment) => void
}

export function useEntranceCreation({ currentFloor, onComplete }: UseEntranceCreationProps) {
  const [state, setState] = useState<EntranceCreationState>({
    isCreating: false,
    selectedWall: null,
    previewPosition: null,
    isValid: false,
    validationMessage: null
  })

  // Calculer tous les murs extérieurs (segments des polygones de pièces)
  const exteriorWalls = useMemo(() => {
    const walls: WallSegment[] = []
    
    currentFloor.rooms.forEach((room) => {
      const polygon = room.polygon
      for (let i = 0; i < polygon.length; i++) {
        const start = polygon[i]
        const end = polygon[(i + 1) % polygon.length]
        
        // Vérifier si ce segment est partagé avec une autre pièce (mur intérieur)
        const isShared = currentFloor.rooms.some(otherRoom => {
          if (otherRoom.id === room.id) return false
          return otherRoom.polygon.some((p1, j) => {
            const p2 = otherRoom.polygon[(j + 1) % otherRoom.polygon.length]
            return isSegmentOverlap(start, end, p1, p2)
          })
        })
        
        // N'ajouter que les murs extérieurs (non partagés)
        if (!isShared) {
          walls.push({
            start,
            end,
            roomId: room.id,
            segmentIndex: i
          })
        }
      }
    })
    
    return walls
  }, [currentFloor.rooms])

  // Vérifier si une entrée existe déjà
  const hasExistingEntrance = useMemo(() => {
    return currentFloor.entrances && currentFloor.entrances.length > 0
  }, [currentFloor.entrances])

  /**
   * Trouve le mur extérieur le plus proche du point cliqué
   */
  const findNearestWall = useCallback((point: Point): WallSegment | null => {
    let nearestWall: WallSegment | null = null
    let minDistance = Infinity
    const maxDistance = GRID_SIZE * 3 // Tolérance de 3 unités de grille

    for (const wall of exteriorWalls) {
      const dist = distanceToSegment(point, wall.start, wall.end)
      if (dist < minDistance && dist < maxDistance) {
        minDistance = dist
        nearestWall = wall
      }
    }

    return nearestWall
  }, [exteriorWalls])

  /**
   * Projette un point sur le mur sélectionné
   */
  const projectOntoWall = useCallback((point: Point, wall: WallSegment): Point => {
    return projectPointOntoSegment(point, wall.start, wall.end)
  }, [])

  /**
   * Gestion du clic sur le canvas
   */
  const handleCanvasClick = useCallback((worldPos: Point) => {
    // Si une entrée existe déjà, message d'erreur
    if (hasExistingEntrance) {
      setState(prev => ({
        ...prev,
        validationMessage: "Une entrée existe déjà. Supprimez-la d'abord.",
        isValid: false
      }))
      // On ne bloque pas, on laisse quand même créer pour remplacer
      // return
    }

    const wall = findNearestWall(worldPos)
    
    if (!wall) {
      setState(prev => ({
        ...prev,
        validationMessage: "Cliquez sur un mur extérieur d'une pièce",
        isValid: false
      }))
      return
    }

    // Projeter sur le mur
    const projectedPos = projectOntoWall(worldPos, wall)
    const snappedPos = snapToGrid(projectedPos, GRID_SIZE)

    // Valider et compléter
    onComplete(snappedPos, wall)
    
    setState({
      isCreating: false,
      selectedWall: null,
      previewPosition: null,
      isValid: false,
      validationMessage: null
    })
  }, [hasExistingEntrance, findNearestWall, projectOntoWall, onComplete])

  /**
   * Mise à jour position preview pendant le survol
   */
  const updatePreview = useCallback((worldPos: Point) => {
    const wall = findNearestWall(worldPos)
    
    if (!wall) {
      setState(prev => ({
        ...prev,
        previewPosition: worldPos,
        selectedWall: null,
        isValid: false,
        validationMessage: hasExistingEntrance 
          ? "Une entrée existe déjà (cliquez pour remplacer)" 
          : "Approchez d'un mur extérieur"
      }))
      return
    }

    const projectedPos = projectOntoWall(worldPos, wall)
    
    setState({
      isCreating: true,
      selectedWall: wall,
      previewPosition: projectedPos,
      isValid: true,
      validationMessage: hasExistingEntrance 
        ? "Cliquez pour remplacer l'entrée"
        : "Cliquez pour placer l'entrée"
    })
  }, [hasExistingEntrance, findNearestWall, projectOntoWall])

  const reset = useCallback(() => {
    setState({
      isCreating: false,
      selectedWall: null,
      previewPosition: null,
      isValid: false,
      validationMessage: null
    })
  }, [])

  return {
    state,
    exteriorWalls,
    hasExistingEntrance,
    handleCanvasClick,
    updatePreview,
    reset,
    // Compatibilité avec ancien code
    isActive: state.isCreating,
    previewPosition: state.previewPosition
  }
}

// ==================== Fonctions utilitaires ====================

/**
 * Calcule la distance d'un point à un segment
 */
function distanceToSegment(point: Point, segStart: Point, segEnd: Point): number {
  const projected = projectPointOntoSegment(point, segStart, segEnd)
  return distance(point, projected)
}

/**
 * Projette un point sur un segment (clamped entre start et end)
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

/**
 * Vérifie si deux segments se chevauchent (approximativement)
 */
function isSegmentOverlap(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
  const tolerance = 1 // 1 pixel de tolérance
  
  // Vérifier si les segments sont colinéaires et se chevauchent
  const isSame = (
    (Math.abs(a1.x - b1.x) < tolerance && Math.abs(a1.y - b1.y) < tolerance &&
     Math.abs(a2.x - b2.x) < tolerance && Math.abs(a2.y - b2.y) < tolerance) ||
    (Math.abs(a1.x - b2.x) < tolerance && Math.abs(a1.y - b2.y) < tolerance &&
     Math.abs(a2.x - b1.x) < tolerance && Math.abs(a2.y - b1.y) < tolerance)
  )
  
  return isSame
}
