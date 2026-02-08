/**
 * PALETTE DE COULEURS MODERNE ET COHÉRENTE
 * Toutes les couleurs utilisées dans les renderers sont centralisées ici
 */

export const COLORS = {
  primary: {
    50: "#f0f9ff",
    100: "#e0f2fe", 
    200: "#bae6fd",
    300: "#7dd3fc",
    400: "#38bdf8",
    500: "#0ea5e9",
    600: "#0284c7",
    700: "#0369a1",
    800: "#075985",
    900: "#0c4a6e"
  },
  
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
  
  // Grille
  grid: "rgba(148, 163, 184, 0.2)",
  gridMajor: "rgba(100, 116, 139, 0.3)",
  gridMinor: "rgba(200, 200, 200, 0.4)",
  gridMajorLine: "rgba(150, 150, 150, 0.6)",
  gridAxis: "rgba(255, 0, 0, 0.3)",
  gridLabel: "rgba(100, 100, 100, 0.8)",
  
  // Pièces (Rooms)
  roomDefault: "rgba(229, 231, 235, 0.5)",
  roomSelected: "rgba(59, 130, 246, 0.2)",
  roomHovered: "rgba(59, 130, 246, 0.15)",
  roomInvalid: "rgba(239, 68, 68, 0.2)",
  
  roomStrokeDefault: "#9CA3AF",
  roomStrokeSelected: "#3B82F6",
  roomStrokeHovered: "#60A5FA",
  roomStrokeInvalid: "#EF4444",
  
  // Vertices et segments
  vertexDefault: "rgba(59, 130, 246, 0.6)",
  vertexSelected: "#22c55e",
  vertexHovered: "#f59e0b",
  vertexStroke: "#ffffff",
  
  segmentDefault: "rgba(59, 130, 246, 0.4)",
  segmentSelected: "#22c55e",
  segmentHovered: "#f59e0b",
  
  // Œuvres (Artworks)
  artworkDefault: "rgba(219, 234, 254, 0.85)",
  artworkSelected: "rgba(14, 165, 233, 0.25)",
  artworkHovered: "rgba(59, 130, 246, 0.2)",
  artworkInvalid: "rgba(254, 202, 202, 0.5)",
  artworkStroke: "#0ea5e9",
  artworkStrokeInvalid: "#ef4444",
  artworkText: "#1e293b",
  artworkPdfIndicator: "#10b981",
  
  // Portes (Doors)
  doorDefault: "#8b5cf6",
  doorSelected: "#7c3aed",
  doorHovered: "#a78bfa",
  doorInvalid: "#dc2626",
  doorLine: "white",
  
  // Liens verticaux (Escaliers/Ascenseurs)
  stairsDefault: "#16a34a",
  stairsSelected: "#15803d",  
  stairsHovered: "#f59e0b",
  stairsInvalid: "#dc2626",
  elevatorDefault: "#dc2626",
  elevatorSelected: "#b91c1c",
  elevatorHovered: "#f59e0b",
  elevatorInvalid: "#dc2626",
  linkInvalidFill: "#fecaca",
  linkInvalidStroke: "#ef4444",

  // Murs (Walls)
  wallDefault: "#374151",
  wallSelected: "#22c55e",
  wallHovered: "#f59e0b",
  wallInvalid: "#dc2626",
  
  // États de validation
  valid: "rgba(34, 197, 94, 0.6)",
  invalid: "rgba(239, 68, 68, 0.6)",
  validStroke: "rgb(34, 197, 94)",
  invalidStroke: "rgb(239, 68, 68)",
  
  // Mesures
  measurementText: "#1f2937",
  measurementBackground: "rgba(255, 255, 255, 0.9)",
  measurementBorder: "#9ca3af",
  measurementBlue: "rgba(59, 130, 246, 0.9)",
  measurementTextWhite: "#ffffff",
  areaText: "#065f46",
  areaBackground: "rgba(16, 185, 129, 0.1)",
  
  // Sélection
  selectionBox: "rgba(59, 130, 246, 0.1)",
  selectionStroke: "rgb(59, 130, 246)",
  
  // Points d'entrée
  entranceDefault: "#16a34a",
  entranceSelected: "#22c55e",
  entranceHovered: "#4ade80",
  entranceBorder: "#166534",
  entranceBorderSelected: "#ffffff",
  entranceFill: "#ffffff",
  entranceTextBg: "rgba(0, 0, 0, 0.7)",
  entrancePreviewValid: "rgba(34, 197, 94, 0.5)",
  entrancePreviewInvalid: "rgba(239, 68, 68, 0.5)",
  entrancePreviewStrokeValid: "#16a34a",
  entrancePreviewStrokeInvalid: "#dc2626",
  entranceWallSelected: "#22c55e",
  entranceWallAvailable: "rgba(34, 197, 94, 0.5)",
  
  // Feedback visuel
  dragInvalidFill: "rgba(220, 38, 38, 0.15)",
  dragInvalidStroke: "rgba(220, 38, 38, 0.8)",
  
  // Création forme libre
  freeFormFirstPoint: "#3b82f6",
  freeFormPoint: "#22c55e",
  freeFormPointStroke: "#ffffff",
  
  // Duplication
  duplicationValid: "#22c55e",
  duplicationInvalid: "#ef4444",
  
  // Artwork vertices
  artworkVertexDefault: "#ffffff",
  artworkVertexHovered: "#3b82f6",
  artworkVertexStroke: "#0ea5e9",
} as const

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
  doorDefault: 6,
  doorSelected: 9,
  doorHovered: 8,
  linkDefault: 8,
  linkSelected: 11,
  linkHovered: 10,
  wallDefault: 4,
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
  default: 8,
  hovered: 1.3,
  glowRadius: 1.5,
} as const
