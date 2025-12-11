"use client"

import { useState } from "react"
import type { EditorState, Floor } from "@/lib/types"

interface DirectionSelectorProps {
  isVisible: boolean
  position: { x: number; y: number }
  floors: Floor[]
  currentFloorId: string
  onSelect: (direction: "up" | "down" | "both", targetFloorIds: string[], autoCreate?: boolean) => void
  onCancel: () => void
  type: "stairs" | "elevator"
}

export function DirectionSelector({
  isVisible,
  position,
  floors,
  currentFloorId,
  onSelect,
  onCancel,
  type
}: DirectionSelectorProps) {
  const [selectedDirection, setSelectedDirection] = useState<"up" | "down" | "both">("up")
  const [selectedFloors, setSelectedFloors] = useState<string[]>([])
  const [autoCreateFloors, setAutoCreateFloors] = useState(true)

  if (!isVisible) return null

  const currentFloorIndex = floors.findIndex(f => f.id === currentFloorId)
  const hasFloorAbove = currentFloorIndex < floors.length - 1
  const hasFloorBelow = currentFloorIndex > 0

  const availableDirections = []
  if (hasFloorAbove) availableDirections.push("up")
  if (hasFloorBelow) availableDirections.push("down")
  if (hasFloorAbove && hasFloorBelow) availableDirections.push("both")

  const getAvailableFloors = () => {
    const available: (Floor | { id: string; name: string; isVirtual: boolean })[] = []
    
    if (selectedDirection === "up" || selectedDirection === "both") {
      // Étages existants au-dessus
      for (let i = currentFloorIndex + 1; i < floors.length; i++) {
        available.push(floors[i])
      }
      // Étage virtuel au-dessus si pas d'étage existant
      if (currentFloorIndex === floors.length - 1) {
        available.push({
          id: `virtual-up-${currentFloorIndex + 1}`,
          name: `Nouvel étage ${currentFloorIndex + 2}`,
          isVirtual: true
        })
      }
    }
    
    if (selectedDirection === "down" || selectedDirection === "both") {
      // Étages existants en dessous
      for (let i = currentFloorIndex - 1; i >= 0; i--) {
        available.push(floors[i])
      }
      // Étage virtuel en dessous si pas d'étage existant
      if (currentFloorIndex === 0) {
        available.push({
          id: `virtual-down-${currentFloorIndex - 1}`,
          name: `Nouveau sous-sol ${Math.abs(currentFloorIndex - 1)}`,
          isVirtual: true
        })
      }
    }
    
    return available
  }

  const handleFloorToggle = (floorId: string) => {
    setSelectedFloors(prev => 
      prev.includes(floorId) 
        ? prev.filter(id => id !== floorId)
        : [...prev, floorId]
    )
  }

  const handleConfirm = () => {
    // Si aucun étage sélectionné, utiliser la sélection automatique
    let floorsToCreate = selectedFloors
    if (floorsToCreate.length === 0 && autoCreateFloors) {
      const availableFloors = getAvailableFloors()
      floorsToCreate = availableFloors.slice(0, 1).map(f => f.id) // Premier étage disponible
    }
    onSelect(selectedDirection, floorsToCreate, autoCreateFloors)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div 
        className="rounded-lg bg-background border border-border shadow-xl p-6 min-w-80"
        style={{
          position: 'absolute',
          left: Math.min(position.x, window.innerWidth - 320),
          top: Math.min(position.y, window.innerHeight - 400)
        }}
      >
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">
            {type === "stairs" ? "Créer un escalier" : "Créer un ascenseur"}
          </h3>
          <p className="text-sm text-muted-foreground">
            Sélectionnez la direction et les étages à connecter
          </p>
        </div>

        {/* Sélection de direction */}
        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block">Direction :</label>
          <div className="flex gap-2">
            {availableDirections.includes("up") && (
              <button
                onClick={() => setSelectedDirection("up")}
                className={`flex items-center gap-2 px-3 py-2 rounded border text-sm ${
                  selectedDirection === "up" 
                    ? "bg-accent text-accent-foreground border-accent" 
                    : "border-border hover:bg-muted"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                Monter
              </button>
            )}
            
            {availableDirections.includes("down") && (
              <button
                onClick={() => setSelectedDirection("down")}
                className={`flex items-center gap-2 px-3 py-2 rounded border text-sm ${
                  selectedDirection === "down" 
                    ? "bg-accent text-accent-foreground border-accent" 
                    : "border-border hover:bg-muted"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                Descendre
              </button>
            )}
            
            {availableDirections.includes("both") && (
              <button
                onClick={() => setSelectedDirection("both")}
                className={`flex items-center gap-2 px-3 py-2 rounded border text-sm ${
                  selectedDirection === "both" 
                    ? "bg-accent text-accent-foreground border-accent" 
                    : "border-border hover:bg-muted"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
                Les deux
              </button>
            )}
          </div>
        </div>

        {/* Sélection des étages */}
        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block">
            Étages à connecter :
          </label>
          <div className="max-h-32 overflow-y-auto border border-border rounded p-2">
            {getAvailableFloors().map(floor => (
              <label key={floor.id} className="flex items-center gap-2 py-1 hover:bg-muted rounded px-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedFloors.includes(floor.id)}
                  onChange={() => handleFloorToggle(floor.id)}
                  className="rounded border-gray-300"
                />
                <span className={`text-sm ${'isVirtual' in floor && floor.isVirtual ? 'text-blue-600 italic' : ''}`}>
                  {floor.name}
                  {'isVirtual' in floor && floor.isVirtual && (
                    <span className="text-xs text-muted-foreground ml-2">(sera créé)</span>
                  )}
                </span>
              </label>
            ))}
          </div>
          {selectedFloors.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Laissez vide pour connecter automatiquement l'étage {
                selectedDirection === "up" ? "supérieur" :
                selectedDirection === "down" ? "inférieur" : "adjacent"
              }
            </p>
          )}
        </div>

        {/* Option de création automatique d'étages */}
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoCreateFloors}
              onChange={(e) => setAutoCreateFloors(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span>Créer automatiquement les étages manquants</span>
          </label>
          <p className="text-xs text-muted-foreground mt-1">
            Les étages de destination seront créés automatiquement avec la même structure de base
          </p>
        </div>

        {/* Boutons d'action */}
        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            className="flex-1 bg-accent text-accent-foreground px-4 py-2 rounded hover:opacity-90 transition-opacity text-sm font-medium"
          >
            Créer {type === "stairs" ? "l'escalier" : "l'ascenseur"}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-border rounded hover:bg-muted transition-colors text-sm"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}