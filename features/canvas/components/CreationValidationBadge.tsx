/**
 * Badge de validation simple pour la création d'éléments
 * Affiche le message de validation pendant la création (murs, pièces, etc.)
 */

import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { ExtendedValidationResult } from '@/core/entities'

interface CreationValidationBadgeProps {
  validation: ExtendedValidationResult
  className?: string
}

export function CreationValidationBadge({ validation, className = '' }: CreationValidationBadgeProps) {
  // Déterminer la couleur et l'icône selon la sévérité
  const getStyles = () => {
    switch (validation.severity) {
      case 'error':
        return {
          bg: 'bg-red-500',
          border: 'border-red-600',
          icon: AlertCircle
        }
      case 'warning':
        return {
          bg: 'bg-orange-500',
          border: 'border-orange-600',
          icon: AlertTriangle
        }
      case 'info':
        return {
          bg: 'bg-green-500',
          border: 'border-green-600',
          icon: CheckCircle2
        }
      default:
        return {
          bg: 'bg-gray-500',
          border: 'border-gray-600',
          icon: AlertCircle
        }
    }
  }

  const styles = getStyles()
  const Icon = styles.icon

  return (
    <div
      className={`absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 ${styles.bg} border-2 ${styles.border} text-white text-sm font-medium rounded-lg shadow-lg z-50 ${className}`}
    >
      <Icon size={18} />
      <span>{validation.message}</span>
    </div>
  )
}
