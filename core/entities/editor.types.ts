/**
 * TYPES ÉDITEUR
 * Structures pour l'état et l'interaction avec l'éditeur
 */

import type { Point } from './geometry.types'
import type { Floor } from './museum.types'

export type Tool =
  | "select"
  | "room"
  | "rectangle"
  | "circle"
  | "arc"
  | "triangle"
  | "artwork"
  | "door"
  | "wall"
  | "stairs"
  | "elevator"

export type ElementType = "room" | "artwork" | "door" | "wall" | "verticalLink"
export type DragElementType = ElementType | "vertex"
export type HoverElementType = ElementType | "vertex" | "doorEndpoint" | "linkEndpoint" | "wallEndpoint"

export interface SelectionInfo {
  readonly id: string
  readonly type: ElementType | "vertex"
  readonly vertexIndex?: number
  readonly roomId?: string
}

// Alias simplifié pour la sélection
export interface SelectedElement {
  readonly type: ElementType
  readonly id: string
}

export interface DragInfo {
  readonly elementId: string
  readonly elementType: DragElementType
  readonly startPos: Point
  readonly originalPos: Point | ReadonlyArray<Point>
  readonly isValid: boolean
}

export interface HoverInfo {
  readonly type: HoverElementType
  readonly id: string
  readonly vertexIndex?: number
  readonly endpoint?: "start" | "end"
}

export interface ContextMenuState {
  readonly visible: boolean
  readonly x: number
  readonly y: number
  readonly type: "element" | "background" | null
  readonly elementId?: string
  readonly elementType?: ElementType
}

export interface MeasurementDisplay {
  readonly id: string
  readonly type: "distance" | "area"
  readonly position: Point
  readonly value: number
  readonly unit: "m" | "m²"
  readonly elementId?: string
}

export interface MeasurementState {
  readonly showMeasurements: boolean
  readonly showDynamicMeasurements: boolean
  readonly measurements: ReadonlyArray<MeasurementDisplay>
}

export interface ViewState {
  readonly zoom: number
  readonly pan: Point
  readonly isPanning: boolean
}

export interface HistoryEntry {
  readonly state: EditorState
  readonly description: string
  readonly timestamp: number
}

export interface EditorState {
  readonly floors: ReadonlyArray<Floor>
  readonly currentFloorId: string
  readonly selectedTool: Tool
  readonly selectedElementId?: string | null
  readonly selectedElementType?: ElementType | null
  readonly selectedElements: ReadonlyArray<SelectedElement>
  readonly gridSize: number
  readonly zoom: number
  readonly pan: Point
  readonly isPanning?: boolean
  readonly currentPolygon?: ReadonlyArray<Point>
  readonly history: ReadonlyArray<HistoryEntry>
  readonly historyIndex: number
  readonly contextMenu: ContextMenuState | null
  readonly measurements: MeasurementState
}
