/**
 * Hook pour créer un point d'entrée du musée
 * Click simple = placement immédiat
 */

import { useState, useCallback } from "react"
import type { Floor, Point } from "@/core/entities"

interface UseEntranceCreationProps {
  currentFloor: Floor
  onComplete: (position: Point) => void
}

export function useEntranceCreation({ currentFloor, onComplete }: UseEntranceCreationProps) {
  const [isActive, setIsActive] = useState(false)

  const handleCanvasClick = useCallback((worldPos: Point) => {
    // Click simple = placer l'entrée
    onComplete(worldPos)
    setIsActive(false)
  }, [onComplete])

  const reset = useCallback(() => {
    setIsActive(false)
  }, [])

  return {
    isActive,
    handleCanvasClick,
    reset,
    // Pour le rendu du curseur ou preview
    previewPosition: null
  }
}
