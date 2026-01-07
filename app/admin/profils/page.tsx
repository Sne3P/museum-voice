'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-context'
import { 
  ArrowLeft, Plus, Pencil, Trash2, X, Save, 
  FolderPlus, ListTree, Hash, ImageIcon 
} from 'lucide-react'

// ===== TYPES =====
interface CriteriaType {
  type: string
  label: string
  ordre: number
  is_required: boolean
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
type ModalType = 'create-type' | 'edit-type' | 'create-criteria' | 'edit-criteria' | null

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

  // ===== LOAD DATA =====
  const loadData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/criterias')
      const data = await response.json()

      if (data.success && data.criterias) {
        // Grouper par type
        const grouped: Record<string, Criteria[]> = {}
        data.criterias.forEach((c: Criteria) => {
          if (!grouped[c.type]) grouped[c.type] = []
          grouped[c.type].push(c)
        })

        // Trier les critères par ordre dans chaque groupe
        Object.keys(grouped).forEach(type => {
          grouped[type].sort((a, b) => a.ordre - b.ordre)
        })

        // Récupérer les types depuis les critères existants
        const types = Array.from(new Set(data.criterias.map((c: Criteria) => c.type))) as string[]
        
        const groupsList: CriteriaGroup[] = types.map(type => ({
          type_info: {
            type,
            label: type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' '),
            ordre: 0,
            is_required: false
          },
          criterias: grouped[type] || []
        })).sort((a, b) => a.type_info.label.localeCompare(b.type_info.label))

        setGroups(groupsList)

        // Calculer stats
        const totalTypes = groupsList.length
        const totalCriterias = data.criterias.length
        
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
  const handleCreateType = async (formData: { label: string }) => {
    const type = generateTechnicalName(formData.label)
    
    try {
      // Vérifier si le type existe déjà
      const exists = groups.some(g => g.type_info.type === type)
      if (exists) {
        alert('Ce type existe déjà')
        return
      }

      // Le type sera créé automatiquement lors de l'ajout du premier critère
      alert(`Type "${formData.label}" prêt. Ajoutez maintenant des critères.`)
      setModal({ type: null })
      
      // Ajouter localement pour l'UI
      setGroups([...groups, {
        type_info: {
          type,
          label: formData.label,
          ordre: groups.length,
          is_required: false
        },
        criterias: []
      }])
      
    } catch (error) {
      console.error('Erreur création type:', error)
      alert('Erreur lors de la création du type')
    }
  }

  const handleDeleteType = async (type: string, label: string) => {
    const group = groups.find(g => g.type_info.type === type)
    const count = group?.criterias.length || 0
    
    if (!confirm(
      `Supprimer le type "${label}" ?\n\n` +
      `Cela supprimera aussi ${count} critère(s) associé(s) et toutes les prégénérations liées.\n\n` +
      `Cette action est IRRÉVERSIBLE.`
    )) return

    try {
      // Supprimer tous les critères de ce type
      const criteriaIds = group?.criterias.map(c => c.criteria_id) || []
      
      for (const id of criteriaIds) {
        await fetch(`/api/criterias?criteria_id=${id}`, { method: 'DELETE' })
      }

      alert('Type supprimé avec succès')
      loadData()
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
    if (!confirm(
      `Supprimer "${label}" ?\n\n` +
      `Toutes les prégénérations liées seront aussi supprimées.\n\n` +
      `Cette action est IRRÉVERSIBLE.`
    )) return

    try {
      const response = await fetch(`/api/criterias?criteria_id=${criteriaId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        alert('Critère supprimé avec succès')
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {authLoading ? 'Vérification des permissions...' : 'Chargement des profils...'}
          </p>
        </div>
      </div>
    )
  }

  // ===== RENDER MAIN =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Gestion des Profils</h1>
                <p className="text-gray-600">Critères Types et Critères Individuels</p>
              </div>
            </div>
            <button
              onClick={() => setModal({ type: 'create-type' })}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <FolderPlus className="h-5 w-5" />
              Nouveau Type
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{stats.totalTypes}</p>
              <p className="text-sm text-gray-600 mt-1">Types de Critères</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-purple-600">{stats.totalCriterias}</p>
              <p className="text-sm text-gray-600 mt-1">Critères Totaux</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{stats.totalCombinations.toLocaleString()}</p>
              <p className="text-sm text-gray-600 mt-1">Combinaisons Possibles</p>
            </div>
          </div>
        </div>
      </div>

      {/* Criteria Groups */}
      <div className="max-w-7xl mx-auto space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
        {groups.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <ListTree className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucun critère défini</p>
            <p className="text-sm text-gray-500 mt-2">Commencez par créer un type de critère</p>
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
  const defaultImage = '/images/default-criteria.svg'

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Type Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{group.type_info.label}</h2>
            <p className="text-sm opacity-90">
              {group.criterias.length} critère(s)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onAddCriteria}
              className="px-3 py-1.5 bg-white text-blue-600 rounded hover:bg-blue-50 flex items-center gap-1 text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </button>
            <button
              onClick={() => onDeleteType(group.type_info.type, group.type_info.label)}
              className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600"
              title="Supprimer le type"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Criterias List */}
      <div className="p-4">
        {group.criterias.length === 0 ? (
          <p className="text-center text-gray-400 py-8 italic">Aucun critère dans ce type</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {group.criterias.map(criteria => (
              <div
                key={criteria.criteria_id}
                className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow bg-gray-50"
              >
                <div className="flex items-start gap-3">
                  {/* Image */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 border border-gray-300">
                      <img
                        src={criteria.image_link || defaultImage}
                        alt={criteria.label}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = defaultImage
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
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => onEditCriteria(criteria)}
                      className="p-1.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                      title="Modifier"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteCriteria(criteria.criteria_id, criteria.label)}
                      className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200"
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
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
  onCreate: (data: { label: string }) => void
}) {
  const [label, setLabel] = useState('')

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
    onCreate({ label: label.trim() })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">Nouveau Type de Critère</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              L'identifiant technique sera généré automatiquement
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Save className="h-4 w-4" />
              Créer
            </button>
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
    image_link: '',
    ai_indication: ''
  })

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
    if (!formData.label.trim()) {
      alert('Le nom est requis')
      return
    }
    onCreate({ type, ...formData })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">Nouveau Critère</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              URL de l'Image <span className="text-gray-400 text-xs">(optionnel)</span>
            </label>
            <input
              type="text"
              value={formData.image_link}
              onChange={(e) => setFormData({ ...formData, image_link: e.target.value })}
              placeholder="https://example.com/image.jpg (optionnel)"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Save className="h-4 w-4" />
              Créer
            </button>
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
    image_link: criteria.image_link || '',
    ai_indication: criteria.ai_indication || ''
  })

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
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">Modifier le Critère</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              URL de l'Image <span className="text-gray-400 text-xs">(optionnel)</span>
            </label>
            <input
              type="text"
              value={formData.image_link}
              onChange={(e) => setFormData({ ...formData, image_link: e.target.value })}
              placeholder="https://example.com/image.jpg (optionnel)"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Save className="h-4 w-4" />
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
