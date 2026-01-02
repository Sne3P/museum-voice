/**
 * Hook pour redimensionner les œuvres par drag des coins
 * Validation: min 1 unité grille, tous les coins dans room, pas de chevauchement
 */

import { useState, useCallback, type MouseEvent } from 'react'
import type { Point, EditorState, Floor, Artwork } from '@/core/entities'
import { snapToGrid, validateArtworkPlacement } from '@/core/services'
import { GRID_SIZE, CONSTRAINTS } from '@/core/constants'

export interface ArtworkResizeState {
  isResizing: boolean
  artworkId: string | null
  vertexIndex: number | null
  originalArtwork: Artwork | null
  isValid: boolean
  validationMessage: string | null
  validationSeverity: 'error' | 'warning' | 'info' | null
}

interface UseArtworkResizeProps {
  state: EditorState
  currentFloor: Floor
  updateState: (updates: Partial<EditorState>, saveHistory?: boolean, description?: string) => void
}

export function useArtworkResize({ state, currentFloor, updateState }: UseArtworkResizeProps) {
  const [resizeState, setResizeState] = useState<ArtworkResizeState>({
    isResizing: false,
    artworkId: null,
    vertexIndex: null,
    originalArtwork: null,
    isValid: true,
    validationMessage: null,
    validationSeverity: null
  })

  /**
   * Démarrer le redimensionnement
   */
  const startResize = useCallback((artworkId: string, vertexIndex: number) => {
    const artwork = currentFloor.artworks?.find(a => a.id === artworkId)
    if (!artwork || !artwork.size) return

    setResizeState({
      isResizing: true,
      artworkId,
      vertexIndex,
      originalArtwork: JSON.parse(JSON.stringify(artwork)),
      isValid: true,
      validationMessage: null,
      validationSeverity: null
    })
  }, [currentFloor])

  /**
   * Mettre à jour le redimensionnement
   */
  const updateResize = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    if (!resizeState.isResizing || !resizeState.artworkId || resizeState.vertexIndex === null) return

    const canvas = e.currentTarget
    const rect = canvas.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top

    // Convertir écran -> monde
    const worldX = (screenX - state.pan.x) / state.zoom
    const worldY = (screenY - state.pan.y) / state.zoom
    const worldPos = { x: worldX, y: worldY }
    const snappedPos = snapToGrid(worldPos, GRID_SIZE)

    const artwork = currentFloor.artworks?.find(a => a.id === resizeState.artworkId)
    if (!artwork || !artwork.size || !resizeState.originalArtwork) return

    const [origX, origY] = resizeState.originalArtwork.xy
    const origSize = resizeState.originalArtwork.size || [GRID_SIZE, GRID_SIZE]
    const [origWidth, origHeight] = origSize

    let newX = origX
    let newY = origY
    let newWidth = origWidth
    let newHeight = origHeight

    // Calculer nouvelles dimensions selon le coin déplacé
    // vertexIndex: 0=TL, 1=TR, 2=BR, 3=BL
    switch (resizeState.vertexIndex) {
      case 0: // Top-left
        newX = snappedPos.x
        newY = snappedPos.y
        newWidth = (origX + origWidth) - snappedPos.x
        newHeight = (origY + origHeight) - snappedPos.y
        break
      case 1: // Top-right
        newY = snappedPos.y
        newWidth = snappedPos.x - origX
        newHeight = (origY + origHeight) - snappedPos.y
        break
      case 2: // Bottom-right
        newWidth = snappedPos.x - origX
        newHeight = snappedPos.y - origY
        break
      case 3: // Bottom-left
        newX = snappedPos.x
        newWidth = (origX + origWidth) - snappedPos.x
        newHeight = snappedPos.y - origY
        break
    }

    // Forcer taille minimale
    const minSize = GRID_SIZE // Taille minimale = 1 cellule de grille
    if (newWidth < minSize || newHeight < minSize) {
      setResizeState(prev => ({
        ...prev,
        isValid: false,
        validationMessage: `Taille minimale: ${minSize / GRID_SIZE} unités`,
        validationSeverity: 'error'
      }))
      return
    }

    // Créer artwork temporaire pour validation
    const tempArtwork: Artwork = {
      ...artwork,
      xy: [newX, newY],
      size: [newWidth, newHeight]
    }

    // Valider
    const validation = validateArtworkPlacement(tempArtwork, {
      floor: currentFloor,
      excludeIds: [artwork.id] // Exclure soi-même de la vérification de chevauchement
    })

    // Appliquer les modifications temporaires
    const updatedFloors = state.floors.map(floor => {
      if (floor.id !== currentFloor.id) return floor
      return {
        ...floor,
        artworks: floor.artworks?.map(a =>
          a.id === resizeState.artworkId
            ? { ...a, xy: [newX, newY] as readonly [number, number], size: [newWidth, newHeight] as readonly [number, number] }
            : a
        ) || []
      }
    })

    updateState({ floors: updatedFloors }, false)
    
    setResizeState(prev => ({
      ...prev,
      isValid: validation.valid,
      validationMessage: validation.message || null,
      validationSeverity: validation.severity || null
    }))
  }, [resizeState, state, currentFloor, updateState])

  /**
   * Terminer le redimensionnement
   */
  const finishResize = useCallback(() => {
    if (!resizeState.isResizing || !resizeState.isValid) {
      cancelResize()
      return
    }

    // Les modifications ont déjà été appliquées, juste sauvegarder dans l'historique
    updateState({}, true, 'Redimensionner œuvre')
    
    setResizeState({
      isResizing: false,
      artworkId: null,
      vertexIndex: null,
      originalArtwork: null,
      isValid: true,
      validationMessage: null,
      validationSeverity: null
    })
  }, [resizeState, updateState])

  /**
   * Annuler le redimensionnement
   */
  const cancelResize = useCallback(() => {
    if (!resizeState.isResizing || !resizeState.originalArtwork || !resizeState.artworkId) {
      setResizeState({
        isResizing: false,
        artworkId: null,
        vertexIndex: null,
        originalArtwork: null,
        isValid: true,
        validationMessage: null,
        validationSeverity: null
      })
      return
    }

    // Restaurer l'artwork original
    const updatedFloors = state.floors.map(floor => {
      if (floor.id !== currentFloor.id) return floor
      return {
        ...floor,
        artworks: floor.artworks?.map(a =>
          a.id === resizeState.artworkId ? resizeState.originalArtwork! : a
        ) || []
      }
    })

    updateState({ floors: updatedFloors }, false)
    
    setResizeState({
      isResizing: false,
      artworkId: null,
      vertexIndex: null,
      originalArtwork: null,
      isValid: true,
      validationMessage: null,
      validationSeverity: null
    })
  }, [resizeState, state, currentFloor, updateState])

  return {
    resizeState,
    startResize,
    updateResize,
    finishResize,
    cancelResize
  }
}
