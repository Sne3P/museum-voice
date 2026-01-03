/**
 * HOOK AUTOSAVE
 * Sauvegarde automatique et manuelle dans BDD
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { saveToDatabase, loadFromDatabase } from '@/core/services'
import type { EditorState } from '@/core/entities'

export type SaveStatus = 'idle' | 'saving' | 'success' | 'error'

interface UseAutoSaveOptions {
  enabled?: boolean
  delay?: number
}

interface UseAutoSaveReturn {
  saveStatus: SaveStatus
  lastSaved: Date | null
  save: () => Promise<void>
  load: () => Promise<EditorState | null>
}

/**
 * Hook de sauvegarde automatique
 * @param state État actuel de l'éditeur
 * @param options Configuration (enabled, delay)
 */
export function useAutoSave(
  state: EditorState,
  options: UseAutoSaveOptions = {}
): UseAutoSaveReturn {
  const { enabled = true, delay = 5000 } = options
  
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const lastStateRef = useRef<string>('')

  /**
   * Sauvegarde manuelle
   */
  const save = useCallback(async () => {
    setSaveStatus('saving')
    
    const result = await saveToDatabase(state)
    
    if (result.success) {
      setLastSaved(new Date())
      setSaveStatus('success')
      lastStateRef.current = JSON.stringify(state.floors)
      setTimeout(() => setSaveStatus('idle'), 2000)
    } else {
      console.error('Erreur sauvegarde:', result.error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }, [state])

  /**
   * Chargement depuis BDD
   */
  const load = useCallback(async (): Promise<EditorState | null> => {
    const result = await loadFromDatabase()
    
    if (result.success && result.state) {
      lastStateRef.current = JSON.stringify(result.state.floors)
      return result.state
    }
    
    return null
  }, [])

  /**
   * Auto-sauvegarde avec debounce
   */
  useEffect(() => {
    if (!enabled) return

    const currentState = JSON.stringify(state.floors)
    
    // Ne pas sauvegarder si identique
    if (currentState === lastStateRef.current) return

    // Debounce
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(async () => {
      const result = await saveToDatabase(state)
      
      if (result.success) {
        setLastSaved(new Date())
        lastStateRef.current = currentState
      }
    }, delay)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [state, enabled, delay])

  return {
    saveStatus,
    lastSaved,
    save,
    load
  }
}
