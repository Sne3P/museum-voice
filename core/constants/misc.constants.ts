/**
 * AUTRES CONSTANTES
 */

export const FONTS = {
  iconSize: 14,
  labelSize: 9,
  measurementSize: 11,
  iconFamily: "sans-serif",
  labelFamily: "sans-serif",
  measurementFamily: "monospace",
} as const

export const GEOMETRY = {
  circleSegments: 32,
  arcSegments: 24,
  minPolygonVertices: 3,
  minRoomSize: 1,
  maxRoomSize: 100,
  minArtworkSize: 1,  
  maxArtworkSize: 20,
} as const

export const RENDER_CONFIG = {
  useRequestAnimationFrame: true,
  maxHistorySize: 50,
  renderThrottleMs: 16,
  dirtyFlagOptimization: true,
} as const

export const VALIDATION = {
  minDoorWidth: 0.5,
  maxDoorWidth: 10,
  minLinkWidth: 0.5,
  maxLinkWidth: 15,
  roomOverlapTolerance: 0.01,
} as const

export const SHORTCUTS = {
  undo: ['ctrl+z', 'cmd+z'],
  redo: ['ctrl+y', 'cmd+y', 'ctrl+shift+z', 'cmd+shift+z'],
  delete: ['delete', 'backspace'],
  escape: ['escape'],
  selectAll: ['ctrl+a', 'cmd+a'],
  copy: ['ctrl+c', 'cmd+c'],
  paste: ['ctrl+v', 'cmd+v'],
  zoomIn: ['ctrl+=', 'cmd+=', 'ctrl+plus'],
  zoomOut: ['ctrl+-', 'cmd+-'],
  fitView: ['ctrl+0', 'cmd+0'],
} as const
