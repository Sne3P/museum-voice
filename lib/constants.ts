/**
 * Core constants for the Museum Floor Plan Editor
 * Centralized configuration for consistent behavior across components
 */

// === GRID & SNAPPING ===
export const GRID_SIZE = 40 // Base grid size in pixels
export const MAJOR_GRID_INTERVAL = 5 // Every 5th grid line is major
export const SNAP_THRESHOLD = 0.8 // Grid units for wall segment snapping
export const VERTEX_SNAP_THRESHOLD = 0.3 // Grid units for vertex snapping
export const POLYGON_CLOSE_THRESHOLD = 0.3 // Distance to close polygon

// === MEASUREMENTS ===
export const GRID_TO_METERS = 0.5 // 1 grid unit = 0.5 meters
export const MEASUREMENT_PRECISION = 2 // Decimal places for measurements
export const MEASUREMENT_OFFSET = 20 // Pixels offset from segments for labels

// === ZOOM & PAN ===
export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 5.0
export const ZOOM_STEP = 1.1 // Multiplicative zoom factor
export const SMOOTH_ZOOM_DURATION = 150 // ms for smooth zoom animation

// === HIT DETECTION ===
export const VERTEX_HIT_RADIUS = 15 // Screen pixels - plus petit pour un design épuré
export const ENDPOINT_HIT_RADIUS = 15 // Screen pixels - plus petit pour un design épuré
export const LINE_HIT_THRESHOLD = 10 // Screen pixels for door/link bodies - réduit aussi
export const RESIZE_HANDLE_THRESHOLD = 0.3 // Grid units for artwork resize handles

// === VISUAL STYLING ===
export const COLORS = {
  // Modern color palette - Professional and cohesive
  primary: {
    50: "#f0f9ff",
    100: "#e0f2fe", 
    200: "#bae6fd",
    300: "#7dd3fc",
    400: "#38bdf8",
    500: "#0ea5e9", // Primary brand color
    600: "#0284c7",
    700: "#0369a1",
    800: "#075985",
    900: "#0c4a6e"
  },
  
  // Secondary palette for contrast
  secondary: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0", 
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a"
  },
  
  // Semantic colors
  success: {
    light: "#22c55e",
    default: "#16a34a", 
    dark: "#15803d"
  },
  
  warning: {
    light: "#f59e0b",
    default: "#d97706",
    dark: "#b45309"
  },
  
  danger: {
    light: "#f87171",
    default: "#dc2626", 
    dark: "#b91c1c"
  },
  
  // Grid - subtle and unobtrusive
  grid: "rgba(148, 163, 184, 0.2)", // secondary.400 with opacity
  gridMajor: "rgba(100, 116, 139, 0.3)", // secondary.500 with opacity
  
  // Room states - modern and cohesive
  roomDefault: "rgba(248, 250, 252, 0.95)", // secondary.50 
  roomSelected: "rgba(14, 165, 233, 0.12)", // primary.500 with low opacity
  roomHovered: "rgba(14, 165, 233, 0.06)", // primary.500 with very low opacity
  roomInvalid: "rgba(220, 38, 38, 0.12)", // danger.default with low opacity
  
  // Room strokes - clear hierarchy
  roomStrokeDefault: "#64748b", // secondary.500
  roomStrokeSelected: "#0ea5e9", // primary.500
  roomStrokeHovered: "#38bdf8", // primary.400
  roomStrokeInvalid: "#dc2626", // danger.default
  
  // Vertices - intuitive color coding
  vertexDefault: "#64748b", // secondary.500
  vertexSelected: "#0ea5e9", // primary.500
  vertexHovered: "#16a34a", // success.default
  
  // Artworks - subtle but distinct
  artworkDefault: "rgba(219, 234, 254, 0.85)", // Light blue tint
  artworkSelected: "rgba(14, 165, 233, 0.25)", // primary.500
  artworkHovered: "rgba(59, 130, 246, 0.2)",
  artworkInvalid: "rgba(239, 68, 68, 0.3)",
  artworkStroke: "#0ea5e9", // primary.500
  
  // Doors - distinctive and professional
  doorDefault: "#8b5cf6", // Purple for doors
  doorSelected: "#7c3aed",
  doorHovered: "#a78bfa",
  doorInvalid: "#dc2626", // danger.default
  
  // Stairs - green for movement up/down
  stairsDefault: "#16a34a", // success.default
  stairsSelected: "#15803d", // success.dark  
  stairsHovered: "#22c55e", // success.light
  stairsInvalid: "#dc2626", // danger.default
  
  // Elevators - red for mechanical transport
  elevatorDefault: "#dc2626", // danger.default
  elevatorSelected: "#b91c1c", // danger.dark
  elevatorHovered: "#f87171", // danger.light
  elevatorInvalid: "#dc2626", // danger.default

  // Walls - black for structural elements (consistent with app theme)
  wallDefault: "#374151", // gray.700 - professional dark gray
  wallSelected: "#1f2937", // gray.800 - darker when selected
  wallHovered: "#4b5563", // gray.600 - lighter when hovered
  wallInvalid: "#dc2626", // danger.default

  
  // Validation feedback
  valid: "rgba(34, 197, 94, 0.6)",
  invalid: "rgba(239, 68, 68, 0.6)",
  validStroke: "rgb(34, 197, 94)",
  invalidStroke: "rgb(239, 68, 68)",
  
  // Measurements
  measurementText: "#1f2937", // Dark gray for measurement labels
  measurementBackground: "rgba(255, 255, 255, 0.9)", // Semi-transparent white background
  measurementBorder: "#9ca3af", // Light gray border for measurement boxes
  areaText: "#065f46", // Dark green for area measurements
  areaBackground: "rgba(16, 185, 129, 0.1)", // Light green background for areas
  
  // Selection
  selectionBox: "rgba(59, 130, 246, 0.1)",
  selectionStroke: "rgb(59, 130, 246)",
} as const

// === RENDERING ===
export const STROKE_WIDTHS = {
  gridMinor: 1,
  gridMajor: 1.5,
  roomDefault: 1.5,
  roomSelected: 2.5,
  roomHovered: 2,
  vertex: 2.5,
  artworkDefault: 1,
  artworkSelected: 2.5,
  artworkHovered: 2,
  doorDefault: 6, // Multiplied by zoom
  doorSelected: 9,
  doorHovered: 8,
  linkDefault: 8,
  linkSelected: 11,
  linkHovered: 10,
  wallDefault: 4, // Walls are thicker by nature
  wallSelected: 6,
  wallHovered: 5,
  selectionBox: 2,
} as const

export const VERTEX_RADIUS = {
  default: 6,
  selected: 8,
  hovered: 12,
} as const

export const ENDPOINT_RADIUS = {
  default: 8, // Multiplied by zoom
  hovered: 1.3, // Multiplier for hovered state
  glowRadius: 1.5, // Multiplier for glow effect
} as const

// === PERFORMANCE ===
export const RENDER_CONFIG = {
  useRequestAnimationFrame: true,
  maxHistorySize: 50, // Limit undo/redo history
  renderThrottleMs: 16, // ~60fps max
  dirtyFlagOptimization: true,
} as const

// === FONTS ===
export const FONTS = {
  iconSize: 14, // Base size, multiplied by zoom
  labelSize: 9,
  measurementSize: 11, // Size for measurement labels
  iconFamily: "sans-serif",
  labelFamily: "sans-serif",
  measurementFamily: "monospace", // Monospace for consistent number width
} as const

// === GEOMETRY ===
export const GEOMETRY = {
  circleSegments: 32, // For circle polygon generation
  arcSegments: 24, // For arc polygon generation
  minPolygonVertices: 3,
  minRoomSize: 1, // Grid units
  maxRoomSize: 100, // Grid units
  minArtworkSize: 1, // Grid units  
  maxArtworkSize: 20, // Grid units
} as const

// === KEYBOARD SHORTCUTS ===
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

// === VALIDATION ===
export const VALIDATION = {
  minDoorWidth: 0.5, // Grid units
  maxDoorWidth: 10,
  minLinkWidth: 0.5,
  maxLinkWidth: 15,
  roomOverlapTolerance: 0.01, // For floating point comparison
} as const

// === CONTRAINTES PROFESSIONNELLES INTELLIGENTES ===
export const CONSTRAINTS = {
  // Tailles minimales flexibles
  room: {
    minArea: 1.0, // réduit pour plus de flexibilité
    minWidth: 0.5, // réduit pour permettre couloirs
    minHeight: 0.5, // réduit pour permettre couloirs
    minPerimeter: 2.0, // réduit pour plus de flexibilité
    maxAspectRatio: 10.0, // éviter les formes trop étirées
  },
  
  wall: {
    minLength: 0.2, // réduit pour plus de flexibilité
    maxLength: 100.0, // augmenté pour les grandes structures
    minDistanceFromEdge: 0.05, // réduit pour permettre murs près des bords
    snapTolerance: 0.4, // tolérance de snap pour les murs
  },
  
  artwork: {
    minWidth: 0.1, // réduit pour petites œuvres
    minHeight: 0.1, // réduit pour petites œuvres
    maxWidth: 20.0, // augmenté pour grandes installations
    maxHeight: 20.0, // augmenté pour grandes installations
    minDistanceFromWall: 0.05, // réduit pour plus de flexibilité
  },
  
  door: {
    minWidth: 0.3, // réduit légèrement
    maxWidth: 12.0, // augmenté pour grandes ouvertures
    minClearance: 0.1, // réduit pour plus de flexibilité
    snapTolerance: 0.3, // tolérance de snap pour portes
  },
  
  verticalLink: {
    minWidth: 0.4, // réduit légèrement
    maxWidth: 15.0, // augmenté pour grandes installations
    minClearance: 0.15, // réduit pour plus de flexibilité
    snapTolerance: 0.3, // tolérance de snap pour liens
  },
  
  // Contraintes de chevauchement intelligentes
  overlap: {
    tolerance: 1e-3, // moins strict pour éviter blocages
    bufferZone: 0.02, // réduit pour permettre formes adjacentes
    allowTouching: true, // permettre les formes qui se touchent
    allowSharedEdges: true, // permettre partage d'arêtes
  },
  
  // Contraintes de création flexibles
  creation: {
    minDragDistance: 0.2, // réduit pour plus de réactivité
    snapTolerance: 0.4, // augmenté pour snap plus facile
    gridSnapForce: false, // optionnel selon contexte
    intelligentSnap: true, // nouveau: snap intelligent contextuel
  },
  
  // Contraintes de déplacement intelligentes
  movement: {
    maintainAspectRatio: false, 
    preserveWallConnections: true,
    allowPartialOverlap: false,
    smartCollisionDetection: true, // nouveau: détection intelligente
    adaptiveSnap: true, // nouveau: snap adaptatif selon contexte
  },
  
  // Nouvelles contraintes pour snap intelligent
  snap: {
    maxDistance: 0.5, // distance maximum de snap
    priorityVertex: 15, // priorité haute pour vertices
    priorityWall: 10, // priorité moyenne pour murs
    priorityGrid: 5, // priorité basse pour grille
    priorityIntersection: 20, // priorité très haute pour intersections
    magnetism: 0.8, // force du magnétisme (0-1)
    cascadeSnap: true, // snap en cascade (un élément snapé influence les autres)
  }
} as const

// === FEEDBACK VISUEL PROFESSIONNEL ===
export const VISUAL_FEEDBACK = {
  colors: {
    valid: "#22c55e", // vert pour actions valides
    invalid: "#dc2626", // rouge pour actions invalides  
    warning: "#f59e0b", // orange pour avertissements
    creating: "#3b82f6", // bleu pour création en cours
    moving: "#8b5cf6", // violet pour déplacement
    resizing: "#06b6d4", // cyan pour redimensionnement
  },
  
  opacity: {
    preview: 0.6, // prévisualisation translucide
    invalid: 0.3, // élément invalide très translucide
    disabled: 0.4, // élément désactivé
  },
  
  stroke: {
    validThickness: 2,
    invalidThickness: 3,
    previewThickness: 2,
    selectedThickness: 3,
  },
  
  animation: {
    errorShakeDuration: 200, // animation secousse erreur
    highlightFadeDuration: 300, // surbrillance qui s'estompe
    transitionDuration: 150, // transitions fluides
  }
} as const

// === MESSAGES D'ERREUR PROFESSIONNELS ===
export const ERROR_MESSAGES = {
  room: {
    tooSmall: "La pièce doit avoir une superficie minimum de {minArea} unités carrées",
    tooNarrow: "La pièce doit avoir une largeur minimum de {minWidth} unités",
    tooShort: "La pièce doit avoir une hauteur minimum de {minHeight} unités", 
    overlapping: "Les pièces ne peuvent pas se chevaucher",
    invalidShape: "La forme de la pièce n'est pas valide (auto-intersection)",
  },
  
  wall: {
    tooShort: "Le mur doit avoir une longueur minimum de {minLength} unités",
    outsideRoom: "Le mur doit être entièrement à l'intérieur d'une pièce",
    tooCloseToEdge: "Le mur est trop proche du bord de la pièce",
    intersectsOther: "Le mur ne peut pas croiser un autre mur",
  },
  
  artwork: {
    tooSmall: "L'œuvre doit avoir une taille minimum de {minWidth}×{minHeight}",
    tooBig: "L'œuvre dépasse la taille maximum autorisée",
    outsideRoom: "L'œuvre doit être placée à l'intérieur d'une pièce",
    tooCloseToWall: "L'œuvre est trop proche d'un mur",
  },
  
  general: {
    invalidOperation: "Opération non autorisée dans le contexte actuel",
    constraintViolation: "Cette action viole les contraintes de l'éditeur",
    geometryError: "Erreur de géométrie détectée",
  }
} as const