/**
 * TYPES VALIDATION
 * Structures pour la validation et les résultats
 */

import type { Floor } from './museum.types'

export interface ValidationResult {
  readonly valid: boolean
  readonly message?: string
  readonly suggestions?: string[]
}

export interface ExtendedValidationResult extends ValidationResult {
  severity: 'error' | 'warning' | 'info'
  code: string
  affectedElements?: string[]
  suggestedActions?: string[]
  visualFeedback?: {
    color: string
    opacity: number
    strokeWidth: number
    highlight?: boolean
  }
}

export interface ValidationContext {
  floor: Floor
  excludeIds?: string[]
  strictMode?: boolean
  allowWarnings?: boolean
}

export interface GeometryOperation<TInput, TOutput> {
  readonly input: TInput
  readonly output: TOutput
  readonly valid: boolean
  readonly message?: string
}
