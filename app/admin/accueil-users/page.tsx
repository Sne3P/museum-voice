"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-context'
import { AdminLayout } from '../components'
import { cn } from '@/lib/utils'
import { Users, Plus, ShoppingCart, RefreshCw, X, Copy, Check } from 'lucide-react'

interface AgentUser {
  id: string
  name: string
  museeId: string
  username: string
  password: string
  role: string
  createdAt: string
  createdBy?: string
}

export default function AccueilUsersManagementPage() {
  const { hasPermission, currentUser } = useAuth()
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({ name: '', username: '', password: '' })
  const [createdUsers, setCreatedUsers] = useState<AgentUser[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const generatePassword = () => {
    const adjectives = ['Rouge', 'Bleu', 'Vert', 'Jaune', 'Rose']
    const nouns = ['Chat', 'Chien', 'Lion', 'Ours', 'Loup']
    const numbers = Math.floor(Math.random() * 99) + 1
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${numbers}`
  }

  const generateUsername = (name: string) => {
    const cleanName = name.toLowerCase().replace(/\s+/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 6)
    return `acc${cleanName}${Math.floor(Math.random() * 999) + 1}`
  }

  const handleCreateUser = () => {
    if (!formData.name) return

    const newUser: AgentUser = {
      id: Date.now().toString(),
      name: formData.name,
      museeId: 'musee-principal',
      username: formData.username || generateUsername(formData.name),
      password: formData.password || generatePassword(),
      role: 'accueil',
      createdAt: new Date().toLocaleString('fr-FR'),
      createdBy: currentUser?.name
    }

    setCreatedUsers([...createdUsers, newUser])
    setFormData({ name: '', username: '', password: '' })
    setIsCreating(false)
  }

  const startCreation = () => {
    setIsCreating(true)
    setFormData({ name: '', username: '', password: generatePassword() })
  }

  const copyCredentials = (user: AgentUser) => {
    const text = `Identifiant: ${user.username}\nMot de passe: ${user.password}`
    navigator.clipboard.writeText(text)
    setCopiedId(user.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <AdminLayout 
      title="Agents Accueil / Vente" 
      description="Créer des comptes pour le personnel d'accueil"
      showBackButton
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {!isCreating ? (
          <>
            {/* Hero Card */}
            <div 
              className="bg-white rounded-2xl border border-neutral-200 p-8 text-center cursor-pointer hover:shadow-lg transition-all group"
              onClick={startCreation}
            >
              <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4 group-hover:bg-black group-hover:text-white transition-colors">
                <ShoppingCart className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-semibold text-black mb-2">Créer un Agent d'Accueil</h2>
              <p className="text-neutral-500 text-sm mb-6 max-w-md mx-auto">
                Les agents d'accueil ont un accès en consultation pour aider les visiteurs et gérer les ventes
              </p>
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl text-sm font-medium hover:bg-neutral-800 transition-colors">
                <Plus className="h-4 w-4" />
                Créer un nouvel agent
              </button>
            </div>

            {/* Created Users List */}
            {createdUsers.length > 0 && (
              <div className="bg-white rounded-2xl border border-neutral-200">
                <div className="p-6 border-b border-neutral-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-neutral-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-black">Agents Créés</h2>
                    <p className="text-sm text-neutral-500">{createdUsers.length} compte{createdUsers.length > 1 ? 's' : ''}</p>
                  </div>
                </div>

                <div className="divide-y divide-neutral-100">
                  {createdUsers.map((user) => (
                    <div key={user.id} className="p-4 flex items-center justify-between hover:bg-neutral-50">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-black truncate">{user.name}</span>
                          <span className="px-2 py-0.5 text-xs rounded-full bg-neutral-100 text-neutral-600 font-medium">
                            Accueil
                          </span>
                        </div>
                        <p className="text-sm text-neutral-500">Créé le {user.createdAt}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right text-sm font-mono bg-neutral-50 px-3 py-2 rounded-lg">
                          <div className="text-neutral-500">@{user.username}</div>
                          <div className="text-black">{user.password}</div>
                        </div>
                        <button
                          onClick={() => copyCredentials(user)}
                          className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                        >
                          {copiedId === user.id ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4 text-neutral-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {createdUsers.length === 0 && (
              <div className="text-center py-8 text-neutral-400 text-sm">
                Aucun agent créé dans cette session
              </div>
            )}
          </>
        ) : (
          /* Creation Form */
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 max-w-xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-neutral-600" />
                </div>
                <h2 className="text-lg font-semibold text-black">Nouvel Agent d'Accueil</h2>
              </div>
              <button
                onClick={() => { setIsCreating(false); setFormData({ name: '', username: '', password: '' }) }}
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
                  placeholder="Ex: Marie Martin"
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value
                    setFormData({
                      ...formData,
                      name,
                      username: name ? generateUsername(name) : ''
                    })
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">Identifiant</label>
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
                      className="px-3 py-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 transition-colors"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-50 rounded-xl p-4">
                <p className="text-sm font-medium text-black mb-1">Permissions</p>
                <p className="text-sm text-neutral-500">Consultation uniquement • Aide visiteurs • Ventes</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => { setIsCreating(false); setFormData({ name: '', username: '', password: '' }) }}
                  className="flex-1 py-3 px-4 rounded-xl border border-neutral-200 font-medium text-sm hover:bg-neutral-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateUser}
                  disabled={!formData.name}
                  className="flex-1 py-3 px-4 rounded-xl bg-black text-white font-medium text-sm hover:bg-neutral-800 transition-colors disabled:opacity-50"
                >
                  Créer l'agent
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}