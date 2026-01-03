/**
 * COMPOSANT SNAPPING GUIDELINES
 * Guidelines visuelles pour le snapping (grille + points magnétiques)
 */

import React from 'react'
import { GRID_SIZE } from '@/core/constants'
import type { Point } from '@/core/entities'

interface SnappingGuidelinesProps {
  canvasWidth: number
  canvasHeight: number
  viewBox: { x: number; y: number; width: number; height: number }
  zoom: number
  snapPoints?: Point[]  // Points magnétiques optionnels
  showGrid?: boolean
  showSnapIndicators?: boolean
  currentSnappedPoint?: Point  // Point actuellement snapé
}

export function SnappingGuidelines({
  canvasWidth,
  canvasHeight,
  viewBox,
  zoom,
  snapPoints = [],
  showGrid = true,
  showSnapIndicators = true,
  currentSnappedPoint
}: SnappingGuidelinesProps) {
  // Grille visible uniquement si zoom > 0.5
  const isGridVisible = showGrid && zoom > 0.5

  // Calculer les lignes de grille visibles
  const gridLines: { x1: number; y1: number; x2: number; y2: number }[] = []
  
  if (isGridVisible) {
    const startX = Math.floor(viewBox.x / GRID_SIZE) * GRID_SIZE
    const endX = viewBox.x + viewBox.width
    const startY = Math.floor(viewBox.y / GRID_SIZE) * GRID_SIZE
    const endY = viewBox.y + viewBox.height

    // Lignes verticales
    for (let x = startX; x <= endX; x += GRID_SIZE) {
      gridLines.push({
        x1: x,
        y1: viewBox.y,
        x2: x,
        y2: viewBox.y + viewBox.height
      })
    }

    // Lignes horizontales
    for (let y = startY; y <= endY; y += GRID_SIZE) {
      gridLines.push({
        x1: viewBox.x,
        y1: y,
        x2: viewBox.x + viewBox.width,
        y2: y
      })
    }
  }

  return (
    <g className="snapping-guidelines pointer-events-none">
      {/* Grille de fond */}
      {isGridVisible && gridLines.map((line, i) => (
        <line
          key={`grid-${i}`}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke="rgba(200, 200, 200, 0.2)"
          strokeWidth={0.5 / zoom}
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {/* Points magnétiques */}
      {showSnapIndicators && snapPoints.map((point, i) => (
        <circle
          key={`snap-point-${i}`}
          cx={point.x}
          cy={point.y}
          r={3 / zoom}
          fill="rgba(59, 130, 246, 0.3)"
          stroke="rgba(59, 130, 246, 0.6)"
          strokeWidth={1 / zoom}
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {/* Indicateur de point actuellement snapé */}
      {currentSnappedPoint && (
        <>
          {/* Croix de snap */}
          <g>
            <line
              x1={currentSnappedPoint.x - 8 / zoom}
              y1={currentSnappedPoint.y}
              x2={currentSnappedPoint.x + 8 / zoom}
              y2={currentSnappedPoint.y}
              stroke="rgb(59, 130, 246)"
              strokeWidth={2 / zoom}
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1={currentSnappedPoint.x}
              y1={currentSnappedPoint.y - 8 / zoom}
              x2={currentSnappedPoint.x}
              y2={currentSnappedPoint.y + 8 / zoom}
              stroke="rgb(59, 130, 246)"
              strokeWidth={2 / zoom}
              vectorEffect="non-scaling-stroke"
            />
          </g>
          {/* Cercle de snap */}
          <circle
            cx={currentSnappedPoint.x}
            cy={currentSnappedPoint.y}
            r={6 / zoom}
            fill="none"
            stroke="rgb(59, 130, 246)"
            strokeWidth={2 / zoom}
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}
    </g>
  )
}
