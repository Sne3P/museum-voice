'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-context'
import { AdminLayout } from '../components'
import { cn } from '@/lib/utils'
import { 
  Plus, Pencil, Trash2, X, Save, 
  FolderPlus, ListTree, Hash, ImageIcon, AlertCircle, Layers, Tag
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
      <AdminLayout title="Gestion des Critères" description="Chargement..." showBackButton>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-neutral-500 text-sm">
              {authLoading ? 'Vérification des permissions...' : 'Chargement des critères...'}
            </p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  // ===== RENDER MAIN =====
  return (
    <AdminLayout 
      title="Gestion des Critères" 
      description="Configurez les types de critères et leurs options"
      showBackButton
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Stats + Action Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-4">
            <div className="bg-white rounded-xl border border-neutral-200 px-4 py-3 text-center min-w-[100px]">
              <p className="text-2xl font-bold text-black">{stats.totalTypes}</p>
              <p className="text-xs text-neutral-500">Types</p>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200 px-4 py-3 text-center min-w-[100px]">
              <p className="text-2xl font-bold text-black">{stats.totalCriterias}</p>
              <p className="text-xs text-neutral-500">Critères</p>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200 px-4 py-3 text-center min-w-[100px]">
              <p className="text-2xl font-bold text-black">{stats.totalCombinations.toLocaleString()}</p>
              <p className="text-xs text-neutral-500">Combinaisons</p>
            </div>
          </div>
          <button
            onClick={() => setModal({ type: 'create-type' })}
            className="flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-xl text-sm font-medium hover:bg-neutral-800 transition-colors"
          >
            <FolderPlus className="h-4 w-4" />
            Nouveau Type
          </button>
        </div>

        {/* Criteria Groups */}
        <div className="space-y-4">
          {groups.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
                <ListTree className="h-8 w-8 text-neutral-400" />
              </div>
              <h3 className="text-lg font-semibold text-black mb-2">Aucun critère défini</h3>
              <p className="text-neutral-500 text-sm mb-6">Commencez par créer un type de critère</p>
              <button
                onClick={() => setModal({ type: 'create-type' })}
                className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-sm font-medium hover:bg-neutral-800 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Créer un type
              </button>
            </div>
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
    </AdminLayout>
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
    <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-black">{group.type_info.label}</h3>
            <p className="text-sm text-neutral-500">
              {group.criterias.length} critère{group.criterias.length > 1 ? 's' : ''} • 
              <code className="ml-1 text-xs bg-neutral-200 px-1.5 py-0.5 rounded font-mono">{group.type_info.type}</code>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onAddCriteria}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 text-sm font-medium hover:bg-neutral-100 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </button>
          <button
            onClick={() => onDeleteType(group.type_info.type, group.type_info.label)}
            className="p-2 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Supprimer le type"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {group.criterias.length === 0 ? (
          <p className="text-center text-neutral-400 py-8 text-sm">Aucun critère dans ce type</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {group.criterias.map(criteria => (
              <div
                key={criteria.criteria_id}
                className="border border-neutral-200 rounded-xl p-3 hover:shadow-md transition-all group"
              >
                <div className="flex items-start gap-3">
                  {/* Image */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200 flex-shrink-0">
                    <img
                      src={getUploadUrl(criteria.image_link || '/placeholder.svg')}
                      alt={criteria.label}
                      className="w-full h-full object-cover"
                      onError={(e: any) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg'
                      }}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-grow min-w-0">
                    <h4 className="font-medium text-black truncate">{criteria.label}</h4>
                    {criteria.description && (
                      <p className="text-sm text-neutral-500 mt-0.5 line-clamp-2">{criteria.description}</p>
                    )}
                    {criteria.ai_indication && (
                      <div className="mt-2 bg-neutral-50 border border-neutral-200 rounded p-2">
                        <p className="text-xs text-neutral-500">IA: {criteria.ai_indication}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1 mt-3 pt-2 border-t border-neutral-100 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEditCriteria(criteria)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                    Modifier
                  </button>
                  <button
                    onClick={() => onDeleteCriteria(criteria.criteria_id, criteria.label)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
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
      <div className="bg-white rounded-2xl max-w-md w-full shadow-xl">
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-black">Nouveau Type de Critère</h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Nom du Type <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="ex: Âge, Thématique, Accessibilité"
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                autoFocus
              />
              <p className="text-xs text-neutral-500 mt-2">
                Identifiant technique : <code className="bg-neutral-100 px-1.5 py-0.5 rounded font-mono">{generateTechnicalName(label) || '...'}</code>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description optionnelle du type de critère"
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all resize-none"
                rows={2}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl border border-neutral-200 font-medium text-sm hover:bg-neutral-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 py-3 px-4 rounded-xl bg-black text-white font-medium text-sm hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
              >
                <Save className="h-4 w-4" />
                Créer
              </button>
            </div>
          </div>
        </form>
      </div>
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

  const handleImageChange = async (file: File | null) => {
    if (!file) {
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
      <div className="bg-white rounded-2xl max-w-2xl w-full my-8 shadow-xl">
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-black">Nouveau Critère</h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div className="bg-neutral-50 rounded-xl px-4 py-3">
              <p className="text-sm text-neutral-600">
                Type : <span className="font-medium text-black">{type}</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="ex: Enfant, Adulte, Senior"
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description du critère..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all resize-none"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-black mb-2">
                <ImageIcon className="h-4 w-4" />
                Image du Critère <span className="text-neutral-400 text-xs">(optionnel)</span>
              </label>
              
              {formData.image_link && formData.image_link !== '/placeholder.svg' && (
                <div className="mt-2 mb-3">
                  <img 
                    src={getUploadUrl(formData.image_link)} 
                    alt={formData.label || 'Aperçu'}
                    className="w-full h-48 object-cover rounded-xl border border-neutral-200"
                  />
                  <div className="mt-2 flex gap-2">
                    <label
                      htmlFor="criteria-image-create"
                      className="px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors cursor-pointer"
                    >
                      Modifier
                    </label>
                    <button
                      type="button"
                      onClick={() => handleImageChange(null)}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              )}

              <input
                id="criteria-image-create"
                type="file"
                accept="image/*"
                onChange={(e) => handleImageChange(e.target.files?.[0] || null)}
                disabled={uploading}
                className={cn(
                  formData.image_link && formData.image_link !== '/placeholder.svg' ? 'hidden' : 'mt-1 block w-full',
                  "text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-neutral-100 file:text-black hover:file:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              />
              
              {uploading && (
                <div className="mt-2 p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-neutral-600">Upload en cours...</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Indication pour l'IA <span className="text-neutral-400 text-xs">(optionnel)</span>
              </label>
              <textarea
                value={formData.ai_indication}
                onChange={(e) => setFormData({ ...formData, ai_indication: e.target.value })}
                placeholder="Instructions pour guider la génération de contenu..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-neutral-300 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all resize-none bg-neutral-50"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl border border-neutral-200 font-medium text-sm hover:bg-neutral-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 py-3 px-4 rounded-xl bg-black text-white font-medium text-sm hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
              >
                <Save className="h-4 w-4" />
                Créer
              </button>
            </div>
          </div>
        </form>
      </div>
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
      <div className="bg-white rounded-2xl max-w-2xl w-full my-8 shadow-xl">
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-black">Modifier le Critère</h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div className="bg-neutral-50 rounded-xl px-4 py-3">
              <p className="text-sm text-neutral-600">
                Type : <span className="font-medium text-black">{criteria.type.charAt(0).toUpperCase() + criteria.type.slice(1).replace(/_/g, ' ')}</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all resize-none"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-black mb-2">
                <ImageIcon className="h-4 w-4" />
                Image du Critère <span className="text-neutral-400 text-xs">(optionnel)</span>
              </label>
              
              {formData.image_link && formData.image_link !== '/placeholder.svg' && (
                <div className="mt-2 mb-3">
                  <img 
                    src={getUploadUrl(formData.image_link)} 
                    alt={formData.label || 'Aperçu'}
                    className="w-full h-48 object-cover rounded-xl border border-neutral-200"
                  />
                  <div className="mt-2 flex gap-2">
                    <label
                      htmlFor="criteria-image-edit"
                      className="px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors cursor-pointer"
                    >
                      Modifier
                    </label>
                    <button
                      type="button"
                      onClick={() => handleImageChange(null)}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              )}

              <input
                id="criteria-image-edit"
                type="file"
                accept="image/*"
                onChange={(e) => handleImageChange(e.target.files?.[0] || null)}
                disabled={uploading}
                className={cn(
                  formData.image_link && formData.image_link !== '/placeholder.svg' ? 'hidden' : 'mt-1 block w-full',
                  "text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-neutral-100 file:text-black hover:file:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              />
              
              {uploading && (
                <div className="mt-2 p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-neutral-600">Upload en cours...</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Instruction pour l'IA <span className="text-neutral-400 text-xs">(optionnel)</span>
              </label>
              <textarea
                value={formData.ai_indication}
                onChange={(e) => setFormData({ ...formData, ai_indication: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-neutral-300 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all resize-none bg-neutral-50"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl border border-neutral-200 font-medium text-sm hover:bg-neutral-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 py-3 px-4 rounded-xl bg-black text-white font-medium text-sm hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
              >
                <Save className="h-4 w-4" />
                Enregistrer
              </button>
            </div>
          </div>
        </form>
      </div>
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
      <div className="bg-white rounded-2xl max-w-md w-full shadow-xl">
        <div className="p-6 border-b border-red-100 bg-red-50 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <h2 className="text-lg font-semibold text-red-700">Confirmer la suppression</h2>
          </div>
          <button onClick={onClose} disabled={isDeleting} className="p-2 hover:bg-red-100 rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-neutral-700">
            Êtes-vous sûr de vouloir supprimer <strong>"{data.label}"</strong> ?
          </p>

          {hasImpact && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
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
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 py-3 px-4 rounded-xl border border-neutral-200 font-medium text-sm hover:bg-neutral-50 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              disabled={isDeleting}
              className="flex-1 py-3 px-4 rounded-xl bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
