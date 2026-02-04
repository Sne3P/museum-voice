'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ArrowLeft, Plus, Pencil, Trash2, X, Save, 
  FolderPlus, ListTree, Hash, ImageIcon, AlertCircle, CheckCircle
} from 'lucide-react'
import { getUploadUrl } from '@/lib/uploads'

// ===== TYPES =====
interface CriteriaType {
  type_id: number
  type: string
  label: string
  description?: string
  ordre: number
}

interface Criteria {
  criteria_id: number
  type: string
  name: string
  label: string
  description?: string
  image_link?: string
  ai_indication?: string
  ordre: number
}

interface CriteriaGroup {
  type_info: CriteriaType
  criterias: Criteria[]
}

// ===== MODAL TYPES =====
type ModalType = 'create-type' | 'edit-type' | 'create-criteria' | 'edit-criteria' | 'confirm-delete' | null

interface DeleteConfirmData {
  type: 'criteria' | 'type'
  id: number
  label: string
  criteriaCount?: number
  narrationCount?: number
  loading?: boolean
}

interface ModalState {
  type: ModalType
  data?: any
}

// ===== MAIN COMPONENT =====
export default function ProfilsPage() {
  const { isAuthenticated, hasPermission, isLoading: authLoading } = useAuth()
  const router = useRouter()
  
  const [isLoading, setIsLoading] = useState(true)
  const [groups, setGroups] = useState<CriteriaGroup[]>([])
  const [modal, setModal] = useState<ModalState>({ type: null })
  const [stats, setStats] = useState({ totalTypes: 0, totalCriterias: 0, totalCombinations: 0 })

  // ===== AUTH CHECK =====
  useEffect(() => {
    console.log('🔐 Profils page - Vérification auth', { authLoading, isAuthenticated })
    
    // Attendre que le chargement de l'auth soit terminé
    if (authLoading) {
      console.log('⏳ Auth en cours de chargement, attente...')
      return
    }
    
    if (!isAuthenticated) {
      console.log('❌ Non authentifié, redirection vers /login')
      router.push('/login')
      return
    }
    if (!hasPermission('manage_profils')) {
      console.log('❌ Pas la permission manage_profils, redirection vers /admin')
      router.push('/admin')
      return
    }
    console.log('✅ Accès autorisé à la page profils')
    loadData()
  }, [authLoading, isAuthenticated, hasPermission, router])

  // ===== HELPER: Invalider le cache backend après modifications =====
  const invalidateBackendCache = async () => {
    try {
      await fetch('/api/criterias/clear-cache', { method: 'POST' })
      console.log('✅ Cache backend invalidé')
    } catch (error) {
      console.warn('⚠️ Erreur invalidation cache:', error)
    }
  }

  // ===== LOAD DATA =====
  const loadData = async () => {
    setIsLoading(true)
    try {
      // Charger les types depuis criteria_types (source de vérité)
      const typesResponse = await fetch('/api/criteria-types')
      const typesData = await typesResponse.json()
      
      // Charger tous les critères
      const criteriasResponse = await fetch('/api/criterias')
      const criteriasData = await criteriasResponse.json()

      if (typesData.success && criteriasData.success) {
        const criteriaTypes: CriteriaType[] = typesData.types || []
        const criterias: Criteria[] = criteriasData.criterias || []
        
        // Grouper les critères par type
        const grouped: Record<string, Criteria[]> = {}
        criterias.forEach((c: Criteria) => {
          if (!grouped[c.type]) grouped[c.type] = []
          grouped[c.type].push(c)
        })

        // Trier les critères par ordre dans chaque groupe
        Object.keys(grouped).forEach(type => {
          grouped[type].sort((a, b) => a.ordre - b.ordre)
        })
        
        // Construire les groupes à partir des types (pas des critères)
        // Cela inclut les types vides (sans critères)
        const groupsList: CriteriaGroup[] = criteriaTypes
          .sort((a, b) => a.ordre - b.ordre)
          .map(typeInfo => ({
            type_info: typeInfo,
            criterias: grouped[typeInfo.type] || []
          }))

        setGroups(groupsList)

        // Calculer stats
        const totalTypes = groupsList.length
        const totalCriterias = criterias.length
        
        // Calcul des combinaisons possibles
        // Pour chaque type, nombre d'options. Produit = nombre de combinaisons
        const combinaisons = groupsList.reduce((acc, group) => {
          const count = group.criterias.length
          return count > 0 ? acc * count : acc
        }, 1)

        setStats({
          totalTypes,
          totalCriterias,
          totalCombinations: combinaisons
        })
      }
    } catch (error) {
      console.error('Erreur chargement:', error)
      alert('Erreur lors du chargement des critères')
    } finally {
      setIsLoading(false)
    }
  }

  // ===== HELPERS =====
  const generateTechnicalName = (label: string): string => {
    return label
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Enlever accents
      .replace(/[^a-z0-9\s]/g, '') // Garder que lettres, chiffres, espaces
      .trim()
      .replace(/\s+/g, '_') // Espaces → underscores
  }

  // ===== CRITERIA TYPE CRUD =====
  const handleCreateType = async (formData: { label: string; description?: string }) => {
    const type = generateTechnicalName(formData.label)
    
    try {
      // Vérifier si le type existe déjà
      const exists = groups.some(g => g.type_info.type === type)
      if (exists) {
        alert('Ce type existe déjà')
        return
      }

      // Créer le type via l'API
      const response = await fetch('/api/criteria-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          label: formData.label,
          description: formData.description || null,
          ordre: groups.length
        })
      })

      const result = await response.json()

      if (result.success) {
        await invalidateBackendCache()
        alert(`Type "${formData.label}" créé avec succès`)
        setModal({ type: null })
        loadData()
      } else {
        alert(result.error || 'Erreur lors de la création du type')
      }
    } catch (error) {
      console.error('Erreur création type:', error)
      alert('Erreur lors de la création du type')
    }
  }

  const handleDeleteType = async (type: string, label: string) => {
    const group = groups.find(g => g.type_info.type === type)
    if (!group) return

    // Charger l'impact avant de montrer le modal
    try {
      const response = await fetch(`/api/criteria-types/impact?type_id=${group.type_info.type_id}`)
      const data = await response.json()
      
      if (data.success) {
        setModal({
          type: 'confirm-delete',
          data: {
            type: 'type',
            id: group.type_info.type_id,
            label: label,
            criteriaCount: data.criteria_count,
            narrationCount: data.narration_count
          } as DeleteConfirmData
        })
      } else {
        alert('Erreur lors du calcul de l\'impact')
      }
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors du calcul de l\'impact')
    }
  }

  const executeDeleteType = async (typeId: number) => {
    try {
      const response = await fetch(`/api/criteria-types?type_id=${typeId}`, { 
        method: 'DELETE' 
      })
      const result = await response.json()

      if (result.success) {
        await invalidateBackendCache()
        setModal({ type: null })
        loadData()
      } else {
        alert(result.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Erreur suppression type:', error)
      alert('Erreur lors de la suppression')
    }
  }

  // ===== CRITERIA CRUD =====
  const handleCreateCriteria = async (formData: {
    type: string
    label: string
    description?: string
    image_link?: string
    ai_indication?: string
  }) => {
    const name = generateTechnicalName(formData.label)
    const group = groups.find(g => g.type_info.type === formData.type)
    const ordre = group ? group.criterias.length : 0

    try {
      const response = await fetch('/api/criterias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formData.type,
          name,
          label: formData.label,
          description: formData.description?.trim() || null,
          image_link: formData.image_link?.trim() || null,
          ai_indication: formData.ai_indication?.trim() || null,
          ordre
        })
      })

      const result = await response.json()

      if (result.success) {
        await invalidateBackendCache()
        alert('Critère créé avec succès')
        setModal({ type: null })
        loadData()
      } else {
        alert(result.error || 'Erreur lors de la création')
      }
    } catch (error) {
      console.error('Erreur création critère:', error)
      alert('Erreur lors de la création du critère')
    }
  }

  const handleEditCriteria = async (criteriaId: number, formData: {
    label: string
    description?: string
    image_link?: string
    ai_indication?: string
  }) => {
    try {
      const response = await fetch('/api/criterias', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          criteria_id: criteriaId,
          label: formData.label,
          description: formData.description?.trim() || null,
          image_link: formData.image_link?.trim() || null,
          ai_indication: formData.ai_indication?.trim() || null
        })
      })

      const result = await response.json()

      if (result.success) {
        await invalidateBackendCache()
        alert('Critère modifié avec succès')
        setModal({ type: null })
        loadData()
      } else {
        alert(result.error || 'Erreur lors de la modification')
      }
    } catch (error) {
      console.error('Erreur modification critère:', error)
      alert('Erreur lors de la modification du critère')
    }
  }

  const handleDeleteCriteria = async (criteriaId: number, label: string) => {
    // Charger l'impact avant de montrer le modal
    try {
      const response = await fetch(`/api/criterias/impact?criteria_id=${criteriaId}`)
      const data = await response.json()
      
      if (data.success) {
        setModal({
          type: 'confirm-delete',
          data: {
            type: 'criteria',
            id: criteriaId,
            label: label,
            narrationCount: data.narration_count
          } as DeleteConfirmData
        })
      } else {
        alert('Erreur lors du calcul de l\'impact')
      }
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors du calcul de l\'impact')
    }
  }

  const executeDeleteCriteria = async (criteriaId: number) => {
    try {
      const response = await fetch(`/api/criterias?criteria_id=${criteriaId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        await invalidateBackendCache()
        setModal({ type: null })
        loadData()
      } else {
        alert(result.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Erreur suppression critère:', error)
      alert('Erreur lors de la suppression du critère')
    }
  }

  // ===== RENDER LOADING =====
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-auto">
          <CardContent className="pt-6 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">
              {authLoading ? 'Vérification des permissions...' : 'Chargement des critères...'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ===== RENDER MAIN =====
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => router.push('/admin')}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <CardTitle className="text-2xl">Gestion des Critères</CardTitle>
                  <CardDescription>Configurez les types de critères et leurs options</CardDescription>
                </div>
              </div>
              <Button onClick={() => setModal({ type: 'create-type' })}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Nouveau Type
              </Button>
            </div>
          </CardHeader>

          {/* Stats */}
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold text-blue-600">{stats.totalTypes}</p>
                  <p className="text-sm text-gray-600 mt-1">Types de Critères</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold text-purple-600">{stats.totalCriterias}</p>
                  <p className="text-sm text-gray-600 mt-1">Critères Totaux</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold text-green-600">{stats.totalCombinations.toLocaleString()}</p>
                  <p className="text-sm text-gray-600 mt-1">Combinaisons Possibles</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Criteria Groups */}
        <div className="space-y-4 max-h-[calc(100vh-350px)] overflow-y-auto pr-2">
          {groups.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ListTree className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <CardTitle className="text-gray-600 mb-2">Aucun critère défini</CardTitle>
                <CardDescription>Commencez par créer un type de critère</CardDescription>
              </CardContent>
            </Card>
          ) : (
            groups.map(group => (
              <CriteriaGroupCard
                key={group.type_info.type}
                group={group}
                onAddCriteria={() => setModal({ 
                  type: 'create-criteria', 
                  data: { type: group.type_info.type } 
                })}
                onEditCriteria={(criteria) => setModal({ 
                  type: 'edit-criteria', 
                  data: criteria 
                })}
                onDeleteCriteria={handleDeleteCriteria}
                onDeleteType={handleDeleteType}
              />
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      {modal.type === 'create-type' && (
        <CreateTypeModal
          onClose={() => setModal({ type: null })}
          onCreate={handleCreateType}
        />
      )}
      {modal.type === 'create-criteria' && (
        <CreateCriteriaModal
          type={modal.data.type}
          onClose={() => setModal({ type: null })}
          onCreate={handleCreateCriteria}
        />
      )}
      {modal.type === 'edit-criteria' && (
        <EditCriteriaModal
          criteria={modal.data}
          onClose={() => setModal({ type: null })}
          onSave={handleEditCriteria}
        />
      )}
      {modal.type === 'confirm-delete' && modal.data && (
        <DeleteConfirmModal
          data={modal.data as DeleteConfirmData}
          onClose={() => setModal({ type: null })}
          onConfirm={() => {
            const d = modal.data as DeleteConfirmData
            if (d.type === 'criteria') {
              executeDeleteCriteria(d.id)
            } else {
              executeDeleteType(d.id)
            }
          }}
        />
      )}
    </div>
  )
}

// ===== CRITERIA GROUP CARD =====
function CriteriaGroupCard({ 
  group, 
  onAddCriteria, 
  onEditCriteria, 
  onDeleteCriteria,
  onDeleteType
}: {
  group: CriteriaGroup
  onAddCriteria: () => void
  onEditCriteria: (criteria: Criteria) => void
  onDeleteCriteria: (id: number, label: string) => void
  onDeleteType: (type: string, label: string) => void
}) {
  return (
    <Card>
      <CardHeader className="bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{group.type_info.label}</CardTitle>
            <CardDescription>
              {group.criterias.length} critère(s) • Type: <code className="text-xs bg-gray-200 px-1 rounded">{group.type_info.type}</code>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={onAddCriteria}
              size="sm"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
            <Button
              onClick={() => onDeleteType(group.type_info.type, group.type_info.label)}
              size="sm"
              variant="destructive"
              title="Supprimer le type"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {group.criterias.length === 0 ? (
          <p className="text-center text-gray-400 py-8 italic">Aucun critère dans ce type</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {group.criterias.map(criteria => (
              <Card
                key={criteria.criteria_id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    {/* Image */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                        <img
                          src={getUploadUrl(criteria.image_link || '/placeholder.svg')}
                          alt={criteria.label}
                          className="w-full h-full object-cover"
                          onError={(e: any) => {
                            (e.target as HTMLImageElement).src = '/placeholder.svg'
                          }}
                        />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-grow min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{criteria.label}</h3>
                      {criteria.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{criteria.description}</p>
                      )}
                      {criteria.ai_indication && (
                        <div className="mt-2 bg-purple-50 border border-purple-200 rounded p-2">
                          <p className="text-xs text-purple-700 font-medium">IA:</p>
                          <p className="text-xs text-purple-900 line-clamp-2">{criteria.ai_indication}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-1 mt-2">
                        <Button
                          onClick={() => onEditCriteria(criteria)}
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          title="Modifier"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          onClick={() => onDeleteCriteria(criteria.criteria_id, criteria.label)}
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ===== MODALS =====
function CreateTypeModal({ onClose, onCreate }: {
  onClose: () => void
  onCreate: (data: { label: string; description?: string }) => void
}) {
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')

  const generateTechnicalName = (label: string): string => {
    return label
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '_')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!label.trim()) {
      alert('Le nom du type est requis')
      return
    }
    onCreate({ label: label.trim(), description: description.trim() || undefined })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Nouveau Type de Critère</CardTitle>
            <Button onClick={onClose} variant="ghost" size="icon" className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom du Type <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="ex: Âge, Thématique, Accessibilité"
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                Identifiant technique : <code className="bg-gray-100 px-1 rounded">{generateTechnicalName(label) || '...'}</code>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description optionnelle du type de critère"
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                Créer
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}

function CreateCriteriaModal({ type, onClose, onCreate }: {
  type: string
  onClose: () => void
  onCreate: (data: any) => void
}) {
  const [formData, setFormData] = useState({
    label: '',
    description: '',
    image_link: '/placeholder.svg',
    ai_indication: ''
  })
  const [uploading, setUploading] = useState(false)

  const generateTechnicalName = (label: string): string => {
    return label
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '_')
  }

  const handleImageChange = async (file: File | null) => {
    if (!file) {
      // Suppression de l'image
      setFormData(prev => ({ ...prev, image_link: '/placeholder.svg' }))
      return
    }

    setUploading(true)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('criteriaId', `temp-${Date.now()}`)
      uploadFormData.append('imageFile', file)
      
      if (formData.image_link && formData.image_link !== '/placeholder.svg') {
        uploadFormData.append('oldImagePath', formData.image_link)
      }

      const uploadResponse = await fetch('/api/criteria-image', {
        method: 'POST',
        body: uploadFormData
      })

      const uploadResult = await uploadResponse.json()

      if (!uploadResponse.ok) {
        throw new Error(uploadResult.error || 'Erreur upload image')
      }

      setFormData(prev => ({ ...prev, image_link: uploadResult.imagePath }))
      
    } catch (error) {
      console.error('❌ Erreur upload image:', error)
      alert(`Erreur lors de l'upload de l'image: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.label.trim()) {
      alert('Le nom est requis')
      return
    }
    onCreate({ type, ...formData })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="max-w-2xl w-full my-8">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Nouveau Critère</CardTitle>
            <Button onClick={onClose} variant="ghost" size="icon" className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-sm text-blue-900">
                Type : <strong>{type}</strong>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="ex: Enfant, Adulte, Senior"
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description du critère..."
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <ImageIcon className="h-4 w-4" />
                Image du Critère <span className="text-gray-400 text-xs">(optionnel)</span>
              </label>
              
              {/* Aperçu de l'image */}
              {formData.image_link && (
                <div className="mt-2 mb-3">
                  <img 
                    src={getUploadUrl(formData.image_link)} 
                    alt={formData.label || 'Aperçu'}
                    className="w-full h-48 object-cover rounded-lg border border-gray-200"
                  />
                  {formData.image_link !== '/placeholder.svg' && (
                    <div className="mt-2 flex gap-2">
                      <label
                        htmlFor="criteria-image-create"
                        className="px-3 py-1 text-xs font-medium text-orange-700 bg-orange-50 rounded hover:bg-orange-100 transition-colors cursor-pointer"
                      >
                        Modifier l'image
                      </label>
                      <button
                        type="button"
                        onClick={() => handleImageChange(null)}
                        className="px-3 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 transition-colors"
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
              )}

              <input
                id="criteria-image-create"
                type="file"
                accept="image/*"
                onChange={(e) => handleImageChange(e.target.files?.[0] || null)}
                disabled={uploading}
                className={`${formData.image_link && formData.image_link !== '/placeholder.svg' ? 'hidden' : 'mt-1 block w-full'} text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded file:border-0
                  file:text-sm file:font-semibold
                  file:bg-purple-50 file:text-purple-700
                  hover:file:bg-purple-100
                  disabled:opacity-50 disabled:cursor-not-allowed`}
              />
              
              {uploading && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm text-blue-700 font-medium">Upload en cours...</span>
                </div>
              )}
              
              {(!formData.image_link || formData.image_link === '/placeholder.svg') && !uploading && (
                <p className="mt-2 text-xs text-gray-500">
                  Image affichée dans l'application client. Sans image, un placeholder sera affiché.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Indication pour l'IA (optionnel)
              </label>
              <textarea
                value={formData.ai_indication}
                onChange={(e) => setFormData({ ...formData, ai_indication: e.target.value })}
                placeholder="Instructions pour guider la génération de contenu..."
                rows={3}
                className="w-full p-3 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none bg-purple-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Laissez vide si le nom et la description suffisent pour le prompt IA
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                Créer
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}

function EditCriteriaModal({ criteria, onClose, onSave }: {
  criteria: Criteria
  onClose: () => void
  onSave: (id: number, data: any) => void
}) {
  const [formData, setFormData] = useState({
    label: criteria.label,
    description: criteria.description || '',
    image_link: criteria.image_link || '/placeholder.svg',
    ai_indication: criteria.ai_indication || ''
  })
  const [uploading, setUploading] = useState(false)

  const handleImageChange = async (file: File | null) => {
    if (!file) {
      // Suppression de l'image
      setFormData(prev => ({ ...prev, image_link: '/placeholder.svg' }))
      return
    }

    setUploading(true)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('criteriaId', criteria.criteria_id.toString())
      uploadFormData.append('imageFile', file)
      
      if (formData.image_link && formData.image_link !== '/placeholder.svg') {
        uploadFormData.append('oldImagePath', formData.image_link)
      }

      const uploadResponse = await fetch('/api/criteria-image', {
        method: 'POST',
        body: uploadFormData
      })

      const uploadResult = await uploadResponse.json()

      if (!uploadResponse.ok) {
        throw new Error(uploadResult.error || 'Erreur upload image')
      }

      setFormData(prev => ({ ...prev, image_link: uploadResult.imagePath }))
      
    } catch (error) {
      console.error('❌ Erreur upload image:', error)
      alert(`Erreur lors de l'upload de l'image: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.label.trim()) {
      alert('Le nom est requis')
      return
    }
    onSave(criteria.criteria_id, formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="max-w-2xl w-full my-8">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Modifier le Critère</CardTitle>
            <Button onClick={onClose} variant="ghost" size="icon" className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-sm text-blue-900">
                Type : <strong>{criteria.type.charAt(0).toUpperCase() + criteria.type.slice(1).replace(/_/g, ' ')}</strong>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <ImageIcon className="h-4 w-4" />
                Image du Critère <span className="text-gray-400 text-xs">(optionnel)</span>
              </label>
              
              {/* Aperçu de l'image */}
              {formData.image_link && (
                <div className="mt-2 mb-3">
                  <img 
                    src={getUploadUrl(formData.image_link)} 
                    alt={formData.label || 'Aperçu'}
                    className="w-full h-48 object-cover rounded-lg border border-gray-200"
                  />
                  {formData.image_link !== '/placeholder.svg' && (
                    <div className="mt-2 flex gap-2">
                      <label
                        htmlFor="criteria-image-edit"
                        className="px-3 py-1 text-xs font-medium text-orange-700 bg-orange-50 rounded hover:bg-orange-100 transition-colors cursor-pointer"
                      >
                        Modifier l'image
                      </label>
                      <button
                        type="button"
                        onClick={() => handleImageChange(null)}
                        className="px-3 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 transition-colors"
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
              )}

              <input
                id="criteria-image-edit"
                type="file"
                accept="image/*"
                onChange={(e) => handleImageChange(e.target.files?.[0] || null)}
                disabled={uploading}
                className={`${formData.image_link && formData.image_link !== '/placeholder.svg' ? 'hidden' : 'mt-1 block w-full'} text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded file:border-0
                  file:text-sm file:font-semibold
                  file:bg-purple-50 file:text-purple-700
                  hover:file:bg-purple-100
                  disabled:opacity-50 disabled:cursor-not-allowed`}
              />
              
              {uploading && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm text-blue-700 font-medium">Upload en cours...</span>
                </div>
              )}
              
              {(!formData.image_link || formData.image_link === '/placeholder.svg') && !uploading && (
                <p className="mt-2 text-xs text-gray-500">
                  Image affichée dans l'application client. Sans image, un placeholder sera affiché.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instruction pour l'IA <span className="text-gray-400 text-xs">(optionnel)</span>
              </label>
              <textarea
                value={formData.ai_indication}
                onChange={(e) => setFormData({ ...formData, ai_indication: e.target.value })}
                rows={3}
                className="w-full p-3 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none bg-purple-50"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}

// ===== DELETE CONFIRM MODAL =====
function DeleteConfirmModal({ data, onClose, onConfirm }: {
  data: DeleteConfirmData
  onClose: () => void
  onConfirm: () => void
}) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirm = async () => {
    setIsDeleting(true)
    await onConfirm()
    setIsDeleting(false)
  }

  const hasImpact = (data.criteriaCount && data.criteriaCount > 0) || (data.narrationCount && data.narrationCount > 0)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="pb-3 bg-red-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-700">Confirmer la suppression</CardTitle>
            </div>
            <Button onClick={onClose} variant="ghost" size="icon" className="h-8 w-8" disabled={isDeleting}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <p className="text-gray-700">
            Êtes-vous sûr de vouloir supprimer <strong>"{data.label}"</strong> ?
          </p>

          {hasImpact && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
              <p className="text-amber-800 font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Impact de la suppression :
              </p>
              <ul className="text-sm text-amber-700 space-y-1 ml-6 list-disc">
                {data.type === 'type' && data.criteriaCount && data.criteriaCount > 0 && (
                  <li><strong>{data.criteriaCount}</strong> critère(s) seront supprimés</li>
                )}
                {data.narrationCount && data.narrationCount > 0 && (
                  <li><strong>{data.narrationCount}</strong> narration(s) pré-générée(s) seront supprimées</li>
                )}
              </ul>
            </div>
          )}

          <p className="text-red-600 text-sm font-medium">
            ⚠️ Cette action est IRRÉVERSIBLE
          </p>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={isDeleting}
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirm}
              variant="destructive"
              className="flex-1"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
