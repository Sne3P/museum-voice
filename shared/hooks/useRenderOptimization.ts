/**
 * HOOK D'OPTIMISATION DE RENDU
 */

import { useCallback, useRef, useState } from 'react'
import { RENDER_CONFIG } from '@/core/constants'

interface RenderLayer {
  name: string
  zIndex: number
  dirty: boolean
  lastRender: number
}

export function useRenderOptimization(layers: string[] = ['grid', 'rooms', 'elements', 'ui']) {
  const [isDirty, setIsDirty] = useState(true)
  const lastRenderTime = useRef(0)
  const renderLayersRef = useRef(new Map<string, RenderLayer>())

  // Initialize layers
  if (renderLayersRef.current.size === 0) {
    layers.forEach((name, index) => {
      renderLayersRef.current.set(name, {
        name,
        zIndex: index,
        dirty: true,
        lastRender: 0,
      })
    })
  }

  const markDirty = useCallback((layer?: string) => {
    if (layer) {
      const layerData = renderLayersRef.current.get(layer)
      if (layerData) {
        renderLayersRef.current.set(layer, { ...layerData, dirty: true })
      }
    }
    setIsDirty(true)
  }, [])

  const markClean = useCallback(() => {
    const now = performance.now()
    renderLayersRef.current.forEach((layer, name) => {
      renderLayersRef.current.set(name, { ...layer, dirty: false, lastRender: now })
    })
    lastRenderTime.current = now
    setIsDirty(false)
  }, [])

  const shouldRender = useCallback(() => {
    if (!RENDER_CONFIG.dirtyFlagOptimization) return true
    
    const now = performance.now()
    const timeSinceLastRender = now - lastRenderTime.current
    
    return isDirty && timeSinceLastRender >= RENDER_CONFIG.renderThrottleMs
  }, [isDirty])

  return {
    isDirty,
    markDirty,
    markClean,
    shouldRender,
    renderLayers: renderLayersRef.current,
  }
}
