/**
 * MODAL DE PROPRIÉTÉS DES ŒUVRES D'ART
 * Support multi-œuvres (zone avec plusieurs œuvres au même endroit)
 */

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Artwork } from '@/core/entities'

interface ArtworkData {
  name: string
  pdfFile?: File | null
  pdfLink?: string
}

interface ArtworkPropertiesModalProps {
  position: readonly [number, number]
  size: readonly [number, number]
  existingArtworks?: Artwork[]  // Œuvres existantes à cet emplacement
  onConfirm: (artworks: ArtworkData[]) => void
  onCancel: () => void
}

export function ArtworkPropertiesModal({
  position,
  size,
  existingArtworks = [],
  onConfirm,
  onCancel
}: ArtworkPropertiesModalProps) {
  const [artworks, setArtworks] = useState<ArtworkData[]>(() => {
    if (existingArtworks.length > 0) {
      return existingArtworks.map(a => ({
        name: a.name || '',
        pdfLink: a.pdfLink || a.pdf_id || ''
      }))
    }
    return [{ name: '', pdfLink: '' }]
  })

  const handleAddArtwork = useCallback(() => {
    setArtworks(prev => [...prev, { name: '', pdfLink: '' }])
  }, [])

  const handleRemoveArtwork = useCallback((index: number) => {
    setArtworks(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleUpdateArtwork = useCallback((index: number, field: 'name' | 'pdfLink', value: string) => {
    setArtworks(prev => prev.map((artwork, i) => 
      i === index ? { ...artwork, [field]: value } : artwork
    ))
  }, [])

  const handleFileChange = useCallback((index: number, file: File | null) => {
    setArtworks(prev => prev.map((artwork, i) => 
      i === index ? { ...artwork, pdfFile: file } : artwork
    ))
  }, [])

  const handleSubmit = useCallback(() => {
    // Filtrer les œuvres vides
    const validArtworks = artworks.filter(a => a.name.trim())
    if (validArtworks.length === 0) {
      alert('Veuillez saisir au moins un nom d\'œuvre')
      return
    }
    onConfirm(validArtworks)
  }, [artworks, onConfirm])

  const [width, height] = size

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
        <h2 className="text-xl font-bold mb-4">
          {existingArtworks.length > 0 ? 'Modifier les œuvres' : 'Nouvelle zone d\'œuvres'}
        </h2>

        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
          <p className="text-sm text-blue-800">
            📐 Position : ({position[0].toFixed(1)}, {position[1].toFixed(1)})
            <br />
            📏 Taille : {width.toFixed(1)} × {height.toFixed(1)} unités
          </p>
        </div>

        <div className="space-y-4 mb-6">
          {artworks.map((artwork, index) => (
            <div key={index} className="border rounded-lg p-4 relative">
              {artworks.length > 1 && (
                <button
                  onClick={() => handleRemoveArtwork(index)}
                  className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                  type="button"
                >
                  ✕
                </button>
              )}

              <div className="mb-3">
                <Label htmlFor={`artwork-name-${index}`}>
                  Nom de l'œuvre {artworks.length > 1 ? `#${index + 1}` : ''}
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id={`artwork-name-${index}`}
                  value={artwork.name}
                  onChange={(e) => handleUpdateArtwork(index, 'name', e.target.value)}
                  placeholder="Ex: La Joconde"
                  className="mt-1"
                />
              </div>

              <div className="mb-3">
                <Label htmlFor={`artwork-pdf-${index}`}>
                  Lien PDF (URL)
                </Label>
                <Input
                  id={`artwork-pdf-${index}`}
                  type="url"
                  value={artwork.pdfLink || ''}
                  onChange={(e) => handleUpdateArtwork(index, 'pdfLink', e.target.value)}
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor={`artwork-file-${index}`}>
                  Ou uploader un fichier PDF
                </Label>
                <input
                  id={`artwork-file-${index}`}
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileChange(index, e.target.files?.[0] || null)}
                  className="mt-1 block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
              </div>
            </div>
          ))}
        </div>

        <Button
          onClick={handleAddArtwork}
          variant="outline"
          className="w-full mb-4"
        >
          + Ajouter une autre œuvre à cet emplacement
        </Button>

        <div className="flex gap-3">
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1"
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {existingArtworks.length > 0 ? 'Mettre à jour' : 'Créer'}
          </Button>
        </div>
      </div>
    </div>
  )
}
