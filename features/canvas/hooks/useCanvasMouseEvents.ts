/**
 * HOOK ÉVÉNEMENTS SOURIS CANVAS
 */

import { useState, useCallback, type MouseEvent } from 'react'
import type { Point } from '@/core/entities'

export interface MouseState {
  isDown: boolean
  button: number | null
  startPos: Point | null
  currentPos: Point | null
  isDragging: boolean
}

export function useCanvasMouseEvents() {
  const [mouseState, setMouseState] = useState<MouseState>({
    isDown: false,
    button: null,
    startPos: null,
    currentPos: null,
    isDragging: false
  })

  const handleMouseDown = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }

    setMouseState({
      isDown: true,
      button: e.button,
      startPos: pos,
      currentPos: pos,
      isDragging: false
    })
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }

    setMouseState(prev => {
      if (!prev.isDown) {
        return { ...prev, currentPos: pos }
      }

      // Considère comme drag si déplacement > 3 pixels
      const isDragging = prev.startPos ? 
        Math.hypot(pos.x - prev.startPos.x, pos.y - prev.startPos.y) > 3 : false

      return {
        ...prev,
        currentPos: pos,
        isDragging
      }
    })
  }, [])

  const handleMouseUp = useCallback(() => {
    setMouseState(prev => ({
      ...prev,
      isDown: false,
      button: null,
      isDragging: false
    }))
  }, [])

  const handleMouseLeave = useCallback(() => {
    setMouseState({
      isDown: false,
      button: null,
      startPos: null,
      currentPos: null,
      isDragging: false
    })
  }, [])

  const resetMouse = useCallback(() => {
    setMouseState({
      isDown: false,
      button: null,
      startPos: null,
      currentPos: null,
      isDragging: false
    })
  }, [])

  return {
    mouseState,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    resetMouse
  }
}