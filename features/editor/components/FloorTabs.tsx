"use client"

import type { Floor } from "@/core/entities"
import { Plus, X, Copy, ArrowUp, ArrowDown, Building, Building2 } from "lucide-react"
import { useState, useEffect, useRef } from "react"

interface FloorTabsProps {
  floors: readonly Floor[]
  currentFloorId: string
  onSwitchFloor: (floorId: string) => void
  onAddFloor: (direction: 1 | -1) => void
  onDeleteFloor?: (floorId: string) => void
  onDuplicateFloor?: (floorId: string) => void
  onMoveFloorUp?: (floorId: string) => void
  onMoveFloorDown?: (floorId: string) => void
  onRenameFloor?: (floorId: string, newName: string) => void
}

export function FloorTabs({ 
  floors, 
  currentFloorId, 
  onSwitchFloor, 
  onAddFloor,
  onDeleteFloor,
  onDuplicateFloor,
  onMoveFloorUp,
  onMoveFloorDown,
  onRenameFloor
}: FloorTabsProps) {
  const [showActions, setShowActions] = useState<string | null>(null)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [editingFloorId, setEditingFloorId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const addMenuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const currentFloorIndex = floors.findIndex(f => f.id === currentFloorId)
  const canMoveUp = currentFloorIndex > 0
  const canMoveDown = currentFloorIndex < floors.length - 1
  const canDelete = floors.length > 1

  // Fermer le menu d'ajout quand on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setShowAddMenu(false)
      }
    }

    if (showAddMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAddMenu])

  return (
    <div className="flex items-center gap-1 border-b border-border bg-card/95 backdrop-blur-md px-4 py-2 relative z-10">
      <div className="text-xs font-semibold text-muted-foreground mr-3 uppercase tracking-wider">
        Étages
      </div>
      
      {floors.map((floor, index) => (
        <div
          key={floor.id}
          className="relative group"
          onMouseEnter={() => setShowActions(floor.id)}
          onMouseLeave={() => setShowActions(null)}
        >
          {editingFloorId === floor.id ? (
            // Mode édition
            <div className={`rounded-lg px-4 py-2 text-sm font-medium ${
              currentFloorId === floor.id
                ? "bg-primary/10 border-2 border-primary"
                : "bg-accent border-2 border-border"
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-xs opacity-70">#{index + 1}</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => {
                    if (editingName.trim() && onRenameFloor) {
                      onRenameFloor(floor.id, editingName.trim())
                    }
                    setEditingFloorId(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (editingName.trim() && onRenameFloor) {
                        onRenameFloor(floor.id, editingName.trim())
                      }
                      setEditingFloorId(null)
                    } else if (e.key === 'Escape') {
                      setEditingFloorId(null)
                    }
                  }}
                  className="bg-transparent border-none outline-none text-sm font-medium px-0 py-0 min-w-20 max-w-36"
                  autoFocus
                />
              </div>
            </div>
          ) : (
            // Mode normal
            <button
              onClick={() => onSwitchFloor(floor.id)}
              onDoubleClick={() => {
                if (onRenameFloor) {
                  setEditingFloorId(floor.id)
                  setEditingName(floor.name)
                }
              }}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                currentFloorId === floor.id
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 ring-2 ring-primary/40"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:shadow-md border border-transparent hover:border-border/50"
              }`}
              title="Double-cliquer pour renommer"
            >
              <span className="flex items-center gap-2">
                <span className="text-xs opacity-70">#{index + 1}</span>
                {floor.name}
              </span>
            </button>
          )}

          {/* Actions menu */}
          {showActions === floor.id && (
            <div className="absolute top-full left-0 mt-0.5 z-50 min-w-max rounded-lg bg-card border border-border shadow-xl animate-fade-in">
              <div className="p-1">
                {onRenameFloor && (
                  <button
                    onClick={() => {
                      setEditingFloorId(floor.id)
                      setEditingName(floor.name)
                      setShowActions(null)
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Renommer
                  </button>
                )}

                {onDuplicateFloor && (
                  <button
                    onClick={() => {
                      onDuplicateFloor(floor.id)
                      setShowActions(null)
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    <Copy className="h-4 w-4" />
                    Dupliquer
                  </button>
                )}
                
                {onMoveFloorUp && canMoveUp && (
                  <button
                    onClick={() => {
                      onMoveFloorUp(floor.id)
                      setShowActions(null)
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    <ArrowUp className="h-4 w-4" />
                    Monter
                  </button>
                )}
                
                {onMoveFloorDown && canMoveDown && (
                  <button
                    onClick={() => {
                      onMoveFloorDown(floor.id)
                      setShowActions(null)
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    <ArrowDown className="h-4 w-4" />
                    Descendre
                  </button>
                )}
                
                {onDeleteFloor && canDelete && (
                  <>
                    <hr className="my-1 border-border" />
                    <button
                      onClick={() => onDeleteFloor(floor.id)}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4" />
                      Supprimer
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="relative ml-4" ref={addMenuRef}>
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-accent-foreground hover:scale-105 hover:shadow-md border border-transparent hover:border-border/50"
          title="Ajouter un étage"
        >
          <Plus className="h-4 w-4" />
        </button>
        
        {showAddMenu && (
          <div className="absolute top-full left-0 mt-1 z-50 min-w-max rounded-lg bg-card border border-border shadow-xl animate-fade-in">
            <div className="p-1">
              <button
                onClick={() => {
                  onAddFloor(1)
                  setShowAddMenu(false)
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <Building2 className="h-4 w-4" />
                Ajouter étage (+1)
              </button>
              
              <button
                onClick={() => {
                  onAddFloor(-1)
                  setShowAddMenu(false)
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <Building className="h-4 w-4" />
                Ajouter sous-sol (-1)
              </button>
            </div>
          </div>
        )}
      </div>
      
      {floors.length > 0 && (
        <div className="ml-4 text-xs text-muted-foreground border-l border-border pl-4">
          {floors.length} étage{floors.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
