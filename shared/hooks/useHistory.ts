/**
 * HOOK D'HISTORIQUE RÉUTILISABLE
 * Gestion complète undo/redo avec raccourcis clavier
 */

import { useCallback, useEffect } from 'react'
import type { EditorState } from '@/core/entities'
import { HISTORY_ACTIONS, type HistoryAction } from '@/core/constants'
import {
  addToHistory,
  undo,
  redo,
  canUndo,
  canRedo,
  getUndoDescription,
  getRedoDescription,
} from '@/core/services'

interface UseHistoryOptions {
  state: EditorState
  setState: React.Dispatch<React.SetStateAction<EditorState>>
  enableKeyboard?: boolean
}

interface UseHistoryReturn {
  /**
   * Revenir à l'état précédent
   */
  handleUndo: () => void
  
  /**
   * Revenir à l'état suivant
   */
  handleRedo: () => void
  
  /**
   * Mettre à jour l'état avec sauvegarde dans l'historique
   */
  updateStateWithHistory: (
    updates: Partial<EditorState>,
    description: HistoryAction | string
  ) => void
  
  /**
   * Vérifier si undo est possible
   */
  canUndo: boolean
  
  /**
   * Vérifier si redo est possible
   */
  canRedo: boolean
  
  /**
   * Description de l'action undo (pour afficher dans UI)
   */
  undoDescription: string | null
  
  /**
   * Description de l'action redo (pour afficher dans UI)
   */
  redoDescription: string | null
}

/**
 * Hook pour gérer l'historique undo/redo
 * Fournit des fonctions pour undo/redo et met à jour l'état avec historique
 */
export function useHistory({
  state,
  setState,
  enableKeyboard = true,
}: UseHistoryOptions): UseHistoryReturn {
  
  /**
   * Undo
   */
  const handleUndo = useCallback(() => {
    const previousState = undo(state)
    if (previousState) {
      setState(previousState)
    }
  }, [state, setState])
  
  /**
   * Redo
   */
  const handleRedo = useCallback(() => {
    const nextState = redo(state)
    if (nextState) {
      setState(nextState)
    }
  }, [state, setState])
  
  /**
   * Mettre à jour l'état avec historique
   */
  const updateStateWithHistory = useCallback(
    (updates: Partial<EditorState>, description: HistoryAction | string) => {
      setState((prevState) => {
        const newState = { ...prevState, ...updates }
        const { history, historyIndex } = addToHistory(prevState, newState, description)
        
        return {
          ...newState,
          history,
          historyIndex,
        }
      })
    },
    [setState]
  )
  
  /**
   * Raccourcis clavier (Ctrl+Z, Ctrl+Y)
   */
  useEffect(() => {
    if (!enableKeyboard) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey
      
      // Ctrl+Z : Undo
      if (ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
        return
      }
      
      // Ctrl+Y ou Ctrl+Shift+Z : Redo
      if ((ctrlKey && e.key === 'y') || (ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault()
        handleRedo()
        return
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo, enableKeyboard])
  
  return {
    handleUndo,
    handleRedo,
    updateStateWithHistory,
    canUndo: canUndo(state),
    canRedo: canRedo(state),
    undoDescription: getUndoDescription(state),
    redoDescription: getRedoDescription(state),
  }
}
