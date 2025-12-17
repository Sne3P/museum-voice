/**
 * COMPOSANT BOUTONS UNDO/REDO
 * Boutons visuels pour l'historique avec tooltips natifs
 */

import { Undo2, Redo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HistoryButtonsProps {
  canUndo: boolean
  canRedo: boolean
  undoDescription: string | null
  redoDescription: string | null
  onUndo: () => void
  onRedo: () => void
  className?: string
}

export function HistoryButtons({
  canUndo,
  canRedo,
  undoDescription,
  redoDescription,
  onUndo,
  onRedo,
  className = '',
}: HistoryButtonsProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Bouton Undo */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onUndo}
        disabled={!canUndo}
        className="h-9 w-9"
        title={canUndo ? `Undo: ${undoDescription} (Ctrl+Z)` : 'Nothing to undo'}
      >
        <Undo2 className="h-4 w-4" />
      </Button>

      {/* Bouton Redo */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onRedo}
        disabled={!canRedo}
        className="h-9 w-9"
        title={canRedo ? `Redo: ${redoDescription} (Ctrl+Y)` : 'Nothing to redo'}
      >
        <Redo2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
