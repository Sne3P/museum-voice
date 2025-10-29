/**
 * SYSTÈME DE VALIDATION GLOBALE DE COHÉRENCE
 * Vérification exhaustive de toutes les inter-dépendances du plan de musée
 * Garantit l'intégrité complète du modèle de données
 */

import type { Floor, Room, Wall, Door, VerticalLink, Artwork, Point } from './types'
import { CONSTRAINTS, ERROR_MESSAGES } from './constants'
import type { ExtendedValidationResult, ValidationContext } from './validation-pro'
import { 
  validateRoomGeometry, 
  validateArtworkPlacement,
  validateDoor,
  validateVerticalLink 
} from './validation-pro'
import { findParentWall, findElementsAttachedToWall } from './walls'
import { isPointInPolygon, polygonsIntersect } from './geometry'

// === TYPES POUR VALIDATION GLOBALE ===
export interface GlobalCoherenceResult {
  isCoherent: boolean
  criticalErrors: ExtendedValidationResult[]
  warnings: ExtendedValidationResult[]
  affectedElements: string[]
  fixSuggestions: string[]
  validationSummary: {
    totalElements: number
    validElements: number
    errorsCount: number
    warningsCount: number
  }
}

export interface DependencyMap {
  rooms: Map<string, string[]> // roomId -> [dependentElementIds]
  walls: Map<string, string[]> // wallId -> [attachedElementIds]
  orphans: string[] // éléments sans parent valide
}

// === VALIDATION GLOBALE PRINCIPALE ===

/**
 * Effectue une validation exhaustive de la cohérence globale du plan
 */
export function validateGlobalCoherence(floor: Floor): GlobalCoherenceResult {
  const results: ExtendedValidationResult[] = []
  const warnings: ExtendedValidationResult[] = []
  const affectedElements = new Set<string>()
  const fixSuggestions = new Set<string>()

  // 1. Construire la carte des dépendances
  const dependencyMap = buildDependencyMap(floor)

  // 2. Valider chaque type d'élément individuellement
  validateAllRooms(floor, results, warnings, affectedElements)
  validateAllWalls(floor, results, warnings, affectedElements, dependencyMap)
  validateAllArtworks(floor, results, warnings, affectedElements)
  validateAllDoors(floor, results, warnings, affectedElements, dependencyMap)
  validateAllVerticalLinks(floor, results, warnings, affectedElements, dependencyMap)

  // 3. Valider les relations inter-éléments
  validateElementRelationships(floor, results, warnings, affectedElements, dependencyMap)

  // 4. Vérifier les contraintes spatiales globales
  validateSpatialConstraints(floor, results, warnings, affectedElements)

  // 5. Détecter les éléments orphelins
  validateOrphanElements(floor, results, warnings, affectedElements, dependencyMap)

  // 6. Générer les suggestions de correction
  generateFixSuggestions(results, warnings, fixSuggestions)

  const criticalErrors = results.filter(r => r.severity === 'error')
  
  return {
    isCoherent: criticalErrors.length === 0,
    criticalErrors,
    warnings,
    affectedElements: Array.from(affectedElements),
    fixSuggestions: Array.from(fixSuggestions),
    validationSummary: {
      totalElements: floor.rooms.length + floor.walls.length + floor.doors.length + 
                     floor.verticalLinks.length + floor.artworks.length,
      validElements: floor.rooms.length + floor.walls.length + floor.doors.length + 
                     floor.verticalLinks.length + floor.artworks.length - affectedElements.size,
      errorsCount: criticalErrors.length,
      warningsCount: warnings.length
    }
  }
}

// === CONSTRUCTION DE LA CARTE DES DÉPENDANCES ===

function buildDependencyMap(floor: Floor): DependencyMap {
  const roomDependencies = new Map<string, string[]>()
  const wallDependencies = new Map<string, string[]>()
  const orphans: string[] = []

  // Initialiser les dépendances des pièces
  floor.rooms.forEach(room => {
    roomDependencies.set(room.id, [])
  })

  // Mapper les œuvres à leurs pièces
  floor.artworks.forEach(artwork => {
    const parentRoom = floor.rooms.find(room => 
      isPointInPolygon({ x: artwork.xy[0], y: artwork.xy[1] }, room.polygon)
    )
    if (parentRoom) {
      const deps = roomDependencies.get(parentRoom.id) || []
      deps.push(artwork.id)
      roomDependencies.set(parentRoom.id, deps)
    } else {
      orphans.push(artwork.id)
    }
  })

  // Mapper les murs à leurs pièces et éléments attachés
  floor.walls.forEach(wall => {
    const attachedElements: string[] = []
    
    // Trouver les portes attachées à ce mur
    floor.doors.forEach(door => {
      const parentWall = findParentWall(door.segment, floor.walls)
      if (parentWall?.id === wall.id) {
        attachedElements.push(door.id)
      }
    })

    // Trouver les liaisons verticales attachées à ce mur
    floor.verticalLinks.forEach(link => {
      const parentWall = findParentWall(link.segment, floor.walls)
      if (parentWall?.id === wall.id) {
        attachedElements.push(link.id)
      }
    })

    wallDependencies.set(wall.id, attachedElements)

    // Mapper le mur à sa pièce parente
    if (wall.roomId) {
      const deps = roomDependencies.get(wall.roomId) || []
      deps.push(wall.id)
      roomDependencies.set(wall.roomId, deps)
    } else {
      orphans.push(wall.id)
    }
  })

  // Vérifier les portes et liaisons orphelines
  floor.doors.forEach(door => {
    const parentWall = findParentWall(door.segment, floor.walls)
    if (!parentWall) {
      orphans.push(door.id)
    }
  })

  floor.verticalLinks.forEach(link => {
    const parentWall = findParentWall(link.segment, floor.walls)
    if (!parentWall) {
      orphans.push(link.id)
    }
  })

  return {
    rooms: roomDependencies,
    walls: wallDependencies,
    orphans
  }
}

// === VALIDATIONS SPÉCIALISÉES ===

function validateAllRooms(
  floor: Floor, 
  results: ExtendedValidationResult[], 
  warnings: ExtendedValidationResult[],
  affectedElements: Set<string>
): void {
  floor.rooms.forEach(room => {
    const validation = validateRoomGeometry(room, { 
      floor, 
      strictMode: true,
      allowWarnings: true 
    })
    
    if (!validation.valid) {
      results.push({
        ...validation,
        severity: 'error',
        code: 'ROOM_GEOMETRY_INVALID',
        affectedElements: [room.id],
        visualFeedback: {
          color: '#dc2626',
          opacity: 0.3,
          strokeWidth: 3,
          highlight: true
        }
      })
      affectedElements.add(room.id)
    }

    // Vérifier les chevauchements avec d'autres pièces
    floor.rooms.forEach(otherRoom => {
      if (room.id !== otherRoom.id && polygonsIntersect(room.polygon, otherRoom.polygon)) {
        results.push({
          valid: false,
          message: `Chevauchement détecté entre les pièces ${room.id} et ${otherRoom.id}`,
          severity: 'error',
          code: 'ROOM_OVERLAP',
          affectedElements: [room.id, otherRoom.id],
          visualFeedback: {
            color: '#dc2626',
            opacity: 0.4,
            strokeWidth: 3,
            highlight: true
          }
        })
        affectedElements.add(room.id)
        affectedElements.add(otherRoom.id)
      }
    })
  })
}

function validateAllWalls(
  floor: Floor,
  results: ExtendedValidationResult[],
  warnings: ExtendedValidationResult[],
  affectedElements: Set<string>,
  dependencyMap: DependencyMap
): void {
  floor.walls.forEach(wall => {
    // Validation taille minimum
    const length = Math.hypot(
      wall.segment[1].x - wall.segment[0].x,
      wall.segment[1].y - wall.segment[0].y
    )
    
    if (length < CONSTRAINTS.wall.minLength) {
      results.push({
        valid: false,
        message: `Mur ${wall.id} trop court: ${length.toFixed(2)} < ${CONSTRAINTS.wall.minLength}`,
        severity: 'error',
        code: 'WALL_TOO_SHORT',
        affectedElements: [wall.id],
        visualFeedback: {
          color: '#dc2626',
          opacity: 0.5,
          strokeWidth: 3,
          highlight: true
        }
      })
      affectedElements.add(wall.id)
    }

    // Vérifier que le mur est dans sa pièce parente
    if (wall.roomId) {
      const parentRoom = floor.rooms.find(r => r.id === wall.roomId)
      if (!parentRoom) {
        results.push({
          valid: false,
          message: `Mur ${wall.id} référence une pièce inexistante: ${wall.roomId}`,
          severity: 'error',
          code: 'WALL_INVALID_PARENT',
          affectedElements: [wall.id],
          visualFeedback: {
            color: '#dc2626',
            opacity: 0.6,
            strokeWidth: 3,
            highlight: true
          }
        })
        affectedElements.add(wall.id)
      }
    }
  })
}

function validateAllArtworks(
  floor: Floor,
  results: ExtendedValidationResult[],
  warnings: ExtendedValidationResult[],
  affectedElements: Set<string>
): void {
  floor.artworks.forEach(artwork => {
    const validation = validateArtworkPlacement(artwork, { 
      floor, 
      strictMode: true,
      allowWarnings: true 
    })
    
    if (!validation.valid) {
      results.push({
        ...validation,
        severity: 'error',
        code: 'ARTWORK_PLACEMENT_INVALID',
        affectedElements: [artwork.id],
        visualFeedback: {
          color: '#dc2626',
          opacity: 0.4,
          strokeWidth: 2,
          highlight: true
        }
      })
      affectedElements.add(artwork.id)
    }
  })
}

function validateAllDoors(
  floor: Floor,
  results: ExtendedValidationResult[],
  warnings: ExtendedValidationResult[],
  affectedElements: Set<string>,
  dependencyMap: DependencyMap
): void {
  floor.doors.forEach(door => {
    const validation = validateDoor(door)
    
    if (!validation.valid) {
      results.push({
        ...validation,
        severity: 'error',
        code: 'DOOR_INVALID',
        affectedElements: [door.id],
        visualFeedback: {
          color: '#dc2626',
          opacity: 0.5,
          strokeWidth: 3,
          highlight: true
        }
      })
      affectedElements.add(door.id)
    }
  })
}

function validateAllVerticalLinks(
  floor: Floor,
  results: ExtendedValidationResult[],
  warnings: ExtendedValidationResult[],
  affectedElements: Set<string>,
  dependencyMap: DependencyMap
): void {
  floor.verticalLinks.forEach(link => {
    const validation = validateVerticalLink(link)
    
    if (!validation.valid) {
      results.push({
        ...validation,
        severity: 'error',
        code: 'VERTICAL_LINK_INVALID',
        affectedElements: [link.id],
        visualFeedback: {
          color: '#dc2626',
          opacity: 0.5,
          strokeWidth: 3,
          highlight: true
        }
      })
      affectedElements.add(link.id)
    }
  })
}

function validateElementRelationships(
  floor: Floor,
  results: ExtendedValidationResult[],
  warnings: ExtendedValidationResult[],
  affectedElements: Set<string>,
  dependencyMap: DependencyMap
): void {
  // Vérifier que tous les éléments ont des parents valides
  dependencyMap.orphans.forEach(orphanId => {
    warnings.push({
      valid: true,
      message: `Élément orphelin détecté: ${orphanId} n'a pas de parent valide`,
      severity: 'warning',
      code: 'ORPHAN_ELEMENT',
      affectedElements: [orphanId],
      visualFeedback: {
        color: '#f59e0b',
        opacity: 0.4,
        strokeWidth: 2,
        highlight: true
      }
    })
    affectedElements.add(orphanId)
  })
}

function validateSpatialConstraints(
  floor: Floor,
  results: ExtendedValidationResult[],
  warnings: ExtendedValidationResult[],
  affectedElements: Set<string>
): void {
  // Vérifier les distances minimales entre éléments
  floor.artworks.forEach(artwork => {
    floor.artworks.forEach(otherArtwork => {
      if (artwork.id !== otherArtwork.id) {
        const distance = Math.hypot(
          artwork.xy[0] - otherArtwork.xy[0],
          artwork.xy[1] - otherArtwork.xy[1]
        )
        
        if (distance < CONSTRAINTS.artwork.minDistanceFromWall) {
          warnings.push({
            valid: true,
            message: `Œuvres trop proches: ${artwork.id} et ${otherArtwork.id}`,
            severity: 'warning',
            code: 'ARTWORKS_TOO_CLOSE',
            affectedElements: [artwork.id, otherArtwork.id],
            visualFeedback: {
              color: '#f59e0b',
              opacity: 0.3,
              strokeWidth: 2,
              highlight: false
            }
          })
          affectedElements.add(artwork.id)
          affectedElements.add(otherArtwork.id)
        }
      }
    })
  })
}

function validateOrphanElements(
  floor: Floor,
  results: ExtendedValidationResult[],
  warnings: ExtendedValidationResult[],
  affectedElements: Set<string>,
  dependencyMap: DependencyMap
): void {
  if (dependencyMap.orphans.length > 0) {
    warnings.push({
      valid: true,
      message: `${dependencyMap.orphans.length} éléments orphelins détectés`,
      severity: 'warning',
      code: 'ORPHAN_ELEMENTS_DETECTED',
      affectedElements: dependencyMap.orphans,
      suggestedActions: [
        'Vérifier que tous les éléments ont un parent valide',
        'Supprimer ou réassocier les éléments orphelins'
      ],
      visualFeedback: {
        color: '#f59e0b',
        opacity: 0.5,
        strokeWidth: 2,
        highlight: true
      }
    })
    
    dependencyMap.orphans.forEach(id => affectedElements.add(id))
  }
}

function generateFixSuggestions(
  results: ExtendedValidationResult[],
  warnings: ExtendedValidationResult[],
  fixSuggestions: Set<string>
): void {
  results.forEach(result => {
    if (result.suggestedActions) {
      result.suggestedActions.forEach(action => fixSuggestions.add(action))
    }
    
    // Suggestions génériques selon le type d'erreur
    switch (result.code) {
      case 'ROOM_GEOMETRY_INVALID':
        fixSuggestions.add('Vérifier la géométrie des pièces (auto-intersections, taille minimum)')
        break
      case 'ROOM_OVERLAP':
        fixSuggestions.add('Séparer les pièces qui se chevauchent')
        break
      case 'WALL_TOO_SHORT':
        fixSuggestions.add('Allonger les murs trop courts ou les supprimer')
        break
      case 'ORPHAN_ELEMENT':
        fixSuggestions.add('Réassocier les éléments orphelins à des parents valides')
        break
    }
  })
  
  warnings.forEach(warning => {
    if (warning.suggestedActions) {
      warning.suggestedActions.forEach(action => fixSuggestions.add(action))
    }
  })
}

// === FONCTIONS UTILITAIRES DE DIAGNOSTIC ===

/**
 * Génère un rapport détaillé de la cohérence globale
 */
export function generateCoherenceReport(result: GlobalCoherenceResult): string {
  const lines: string[] = []
  
  lines.push('=== RAPPORT DE COHÉRENCE GLOBALE ===')
  lines.push(`Statut: ${result.isCoherent ? '✅ COHÉRENT' : '❌ INCOHÉRENT'}`)
  lines.push('')
  
  lines.push('📊 Résumé:')
  lines.push(`- Éléments totaux: ${result.validationSummary.totalElements}`)
  lines.push(`- Éléments valides: ${result.validationSummary.validElements}`)
  lines.push(`- Erreurs critiques: ${result.validationSummary.errorsCount}`)
  lines.push(`- Avertissements: ${result.validationSummary.warningsCount}`)
  lines.push('')
  
  if (result.criticalErrors.length > 0) {
    lines.push('🚨 Erreurs critiques:')
    result.criticalErrors.forEach((error, i) => {
      lines.push(`${i + 1}. [${error.code}] ${error.message}`)
      if (error.affectedElements) {
        lines.push(`   Éléments affectés: ${error.affectedElements.join(', ')}`)
      }
    })
    lines.push('')
  }
  
  if (result.warnings.length > 0) {
    lines.push('⚠️ Avertissements:')
    result.warnings.forEach((warning, i) => {
      lines.push(`${i + 1}. [${warning.code}] ${warning.message}`)
    })
    lines.push('')
  }
  
  if (result.fixSuggestions.length > 0) {
    lines.push('🔧 Suggestions de correction:')
    result.fixSuggestions.forEach((suggestion, i) => {
      lines.push(`${i + 1}. ${suggestion}`)
    })
  }
  
  return lines.join('\n')
}

/**
 * Effectue une validation rapide pour l'UI
 */
export function quickCoherenceCheck(floor: Floor): { isValid: boolean; issuesCount: number } {
  const result = validateGlobalCoherence(floor)
  return {
    isValid: result.isCoherent,
    issuesCount: result.criticalErrors.length + result.warnings.length
  }
}