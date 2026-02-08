"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-context'
import { AdminLayout } from '../components'
import { cn } from '@/lib/utils'
import { Users, Plus, UserCheck, ShoppingCart, Trash2, RefreshCw, X, ArrowRight } from 'lucide-react'

interface UserData {
  id: string
  username: string
  role: string
  name: string
  museeId?: string
  isActive: boolean
  createdAt: string
  lastLogin?: string
}

export default function UsersManagementPage() {
  const { hasPermission, currentUser } = useAuth()
  const router = useRouter()
  const [selectedUserType, setSelectedUserType] = useState<'admin_musee' | 'accueil' | null>(null)
  const [formData, setFormData] = useState({ name: '', username: '', password: '' })
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [allUsers, setAllUsers] = useState<UserData[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadUsers = async () => {
    try {
      setIsLoadingUsers(true)
      const response = await fetch('/api/auth/users')
      const data = await response.json()
      if (data.success) setAllUsers(data.users)
    } catch (error) {
      console.error('Erreur chargement users:', error)
    } finally {
      setIsLoadingUsers(false)
    }
  }

  useEffect(() => {
    if (hasPermission('manage_admin_musee')) loadUsers()
  }, [hasPermission])

  const generatePassword = () => {
    const adjectives = ['Rouge', 'Bleu', 'Vert', 'Jaune', 'Rose']
    const nouns = ['Chat', 'Chien', 'Lion', 'Ours', 'Loup']
    const numbers = Math.floor(Math.random() * 99) + 1
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${numbers}`
  }

  const generateUsername = (name: string, type: string) => {
    const cleanName = name.toLowerCase().replace(/\s+/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 6)
    return `${type === 'admin_musee' ? 'admin' : 'acc'}${cleanName}${Math.floor(Math.random() * 999) + 1}`
  }

  const handleCreateUser = async () => {
    if (!formData.name || !formData.username || !formData.password) {
      setError('Tous les champs sont requis')
      return
    }

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          role: selectedUserType,
          name: formData.name,
          museeId: null
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(`Utilisateur ${formData.username} créé avec succès`)
        setFormData({ name: '', username: '', password: '' })
        setSelectedUserType(null)
        setIsCreating(false)
        await loadUsers()
      } else {
        setError(data.error || 'Erreur lors de la création')
      }
    } catch (error) {
      setError('Erreur réseau lors de la création')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Supprimer l'utilisateur "${username}" ?`)) return

    try {
      const response = await fetch(`/api/auth/users?id=${userId}`, { method: 'DELETE' })
      const data = await response.json()

      if (data.success) {
        setSuccess(`Utilisateur ${username} supprimé`)
        await loadUsers()
      } else {
        setError(data.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      setError('Erreur réseau lors de la suppression')
    }
  }

  const startCreation = (type: 'admin_musee' | 'accueil') => {
    setSelectedUserType(type)
    setIsCreating(true)
    setError('')
    setSuccess('')
    setFormData({ name: '', username: '', password: generatePassword() })
  }

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      'super_admin': 'bg-black text-white',
      'admin_musee': 'bg-neutral-200 text-black',
      'accueil': 'bg-neutral-100 text-neutral-700'
    }
    const labels: Record<string, string> = {
      'super_admin': 'Super Admin',
      'admin_musee': 'Admin',
      'accueil': 'Accueil'
    }
    return { style: styles[role] || 'bg-neutral-100 text-neutral-600', label: labels[role] || role }
  }

  return (
    <AdminLayout 
      title="Gestion des Utilisateurs" 
      description="Créer et gérer les comptes du musée"
      showBackButton
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Messages */}
        {success && (
          <div className="bg-neutral-900 text-white rounded-xl p-4 flex items-center justify-between">
            <span className="text-sm">{success}</span>
            <button onClick={() => setSuccess('')} className="p-1 hover:bg-white/10 rounded">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 flex items-center justify-between">
            <span className="text-sm">{error}</span>
            <button onClick={() => setError('')} className="p-1 hover:bg-red-100 rounded">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {!isCreating ? (
          <>
            {/* Creation Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => startCreation('admin_musee')}
                className="group bg-white rounded-2xl border border-neutral-200 p-6 text-left hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center mb-4">
                  <UserCheck className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-black mb-1">Administrateur Musée</h3>
                <p className="text-sm text-neutral-500 mb-4">Peut éditer les plans, gérer les agents et les thématiques</p>
                <div className="flex items-center gap-2 text-sm font-medium text-black">
                  <Plus className="h-4 w-4" />
                  Créer un Admin
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>

              <button
                onClick={() => startCreation('accueil')}
                className="group bg-white rounded-2xl border border-neutral-200 p-6 text-left hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center mb-4">
                  <ShoppingCart className="h-6 w-6 text-neutral-600" />
                </div>
                <h3 className="text-lg font-semibold text-black mb-1">Agent Accueil/Vente</h3>
                <p className="text-sm text-neutral-500 mb-4">Accès en consultation pour aider les visiteurs</p>
                <div className="flex items-center gap-2 text-sm font-medium text-neutral-600">
                  <Plus className="h-4 w-4" />
                  Créer un Agent
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            </div>

            {/* Users List */}
            <div className="bg-white rounded-2xl border border-neutral-200">
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-neutral-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-black">Tous les Utilisateurs</h2>
                    <p className="text-sm text-neutral-500">{allUsers.length} comptes</p>
                  </div>
                </div>
                <button
                  onClick={loadUsers}
                  disabled={isLoadingUsers}
                  className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <RefreshCw className={cn("h-5 w-5 text-neutral-600", isLoadingUsers && "animate-spin")} />
                </button>
              </div>

              <div className="divide-y divide-neutral-100">
                {isLoadingUsers ? (
                  <div className="p-8 text-center text-neutral-400 text-sm">Chargement...</div>
                ) : allUsers.length === 0 ? (
                  <div className="p-8 text-center text-neutral-400 text-sm">Aucun utilisateur</div>
                ) : (
                  allUsers.map((user) => {
                    const badge = getRoleBadge(user.role)
                    return (
                      <div key={user.id} className="p-4 flex items-center justify-between hover:bg-neutral-50">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-black truncate">{user.name}</span>
                            <span className={cn("px-2 py-0.5 text-xs rounded-full font-medium", badge.style)}>
                              {badge.label}
                            </span>
                          </div>
                          <p className="text-sm text-neutral-500">@{user.username}</p>
                        </div>
                        {user.role !== 'super_admin' && (
                          <button
                            onClick={() => handleDeleteUser(user.id, user.username)}
                            className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </>
        ) : (
          /* Creation Form */
          <div className="bg-white rounded-2xl border border-neutral-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-black">
                {selectedUserType === 'admin_musee' ? 'Nouvel Administrateur' : 'Nouvel Agent Accueil'}
              </h2>
              <button
                onClick={() => { setIsCreating(false); setSelectedUserType(null) }}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-2">Nom complet</label>
                <input
                  type="text"
                  placeholder="Ex: Jean Dupont"
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value
                    setFormData({
                      ...formData,
                      name,
                      username: name ? generateUsername(name, selectedUserType!) : ''
                    })
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">Nom d'utilisateur</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">Mot de passe</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="flex-1 px-4 py-3 rounded-xl border border-neutral-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all font-mono text-sm"
                  />
                  <button
                    onClick={() => setFormData({ ...formData, password: generatePassword() })}
                    className="px-4 py-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Credentials Box */}
              <div className="bg-neutral-50 rounded-xl p-4">
                <p className="text-sm font-medium text-black mb-2">Informations à communiquer</p>
                <div className="text-sm text-neutral-600 space-y-1 font-mono">
                  <p>Identifiant: {formData.username || '...'}</p>
                  <p>Mot de passe: {formData.password}</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => { setIsCreating(false); setSelectedUserType(null) }}
                  disabled={isSaving}
                  className="flex-1 py-3 px-4 rounded-xl border border-neutral-200 font-medium text-sm hover:bg-neutral-50 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateUser}
                  disabled={isSaving || !formData.name || !formData.username || !formData.password}
                  className="flex-1 py-3 px-4 rounded-xl bg-black text-white font-medium text-sm hover:bg-neutral-800 transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Création...' : 'Créer le compte'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
