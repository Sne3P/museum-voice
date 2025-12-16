/**
 * TYPES GÉOMÉTRIQUES DE BASE
 * Structures fondamentales pour la géométrie 2D
 */

export interface Point {
  readonly x: number
  readonly y: number
}

export interface Bounds {
  readonly minX: number
  readonly minY: number
  readonly maxX: number
  readonly maxY: number
}

export interface Segment {
  readonly start: Point
  readonly end: Point
}

export interface Polygon {
  readonly points: ReadonlyArray<Point>
}
