/**
 * HOOK ZOOM ET PAN
 */

import { useState, useCallback } from 'react'
import type { Point } from '@/core/entities'
import { MIN_ZOOM, MAX_ZOOM, ZOOM_STEP } from '@/core/constants'
import { clamp } from '@/core/utils'

export function useZoomPan(initialZoom: number = 1, initialPan: Point = { x: 0, y: 0 }) {
  const [zoom, setZoom] = useState(initialZoom)
  const [pan, setPan] = useState(initialPan)
  const [isPanning, setIsPanning] = useState(false)

  const handleZoom = useCallback((delta: number, center?: Point) => {
    setZoom(prevZoom => {
      const newZoom = clamp(
        delta > 0 ? prevZoom * ZOOM_STEP : prevZoom / ZOOM_STEP,
        MIN_ZOOM,
        MAX_ZOOM
      )

      // Ajuster le pan pour zoomer vers le centre
      if (center) {
        const zoomRatio = newZoom / prevZoom
        setPan(prevPan => ({
          x: center.x - (center.x - prevPan.x) * zoomRatio,
          y: center.y - (center.y - prevPan.y) * zoomRatio,
        }))
      }

      return newZoom
    })
  }, [])

  const handlePanStart = useCallback(() => {
    setIsPanning(true)
  }, [])

  const handlePanMove = useCallback((delta: Point) => {
    if (isPanning) {
      setPan(prevPan => ({
        x: prevPan.x + delta.x,
        y: prevPan.y + delta.y,
      }))
    }
  }, [isPanning])

  const handlePanEnd = useCallback(() => {
    setIsPanning(false)
  }, [])

  const resetView = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  return {
    zoom,
    pan,
    isPanning,
    handleZoom,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    resetView,
    setZoom,
    setPan
  }
}
