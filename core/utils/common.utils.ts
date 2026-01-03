/**
 * UTILITAIRES GÉNÉRAUX
 */

import type { Point } from '@/core/entities'

/**
 * Clone profond d'un objet
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Génère un ID unique
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Formate un nombre avec précision
 */
export function formatNumber(value: number, precision: number = 2): string {
  return value.toFixed(precision)
}

/**
 * Clamp une valeur entre min et max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Convertit des coordonnées canvas en coordonnées monde
 */
export function canvasToWorld(
  canvasPoint: Point,
  zoom: number,
  pan: Point
): Point {
  return {
    x: (canvasPoint.x - pan.x) / zoom,
    y: (canvasPoint.y - pan.y) / zoom,
  }
}

/**
 * Convertit des coordonnées monde (PIXELS) en coordonnées canvas (PIXELS)
 * worldPoint déjà en PIXELS, appliquer seulement zoom et pan
 */
export function worldToCanvas(
  worldPoint: Point,
  zoom: number,
  pan: Point
): Point {
  return {
    x: worldPoint.x * zoom + pan.x,
    y: worldPoint.y * zoom + pan.y,
  }
}

/**
 * Debounce une fonction
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return function(...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Throttle une fonction
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false
  
  return function(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}
