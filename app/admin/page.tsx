"use client"

import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-context'
import { AdminLayout } from './components'
import { cn } from '@/lib/utils'
import { 
  Edit, 
  Users, 
  UserPlus, 
  QrCode, 
  Settings, 
  Database,
  Palette,
  ArrowRight,
  User,
  Shield,
  Calendar
} from 'lucide-react'

interface BentoCardProps {
  title: string
  description: string
  icon: React.ElementType
  onClick: () => void
  size?: 'small' | 'medium' | 'large'
  accent?: boolean
  disabled?: boolean
}

function BentoCard({ title, description, icon: Icon, onClick, size = 'small', accent = false, disabled = false }: BentoCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative flex flex-col justify-between p-6 rounded-2xl border text-left transition-all duration-200",
        "hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
        accent 
          ? "bg-black text-white border-black hover:bg-neutral-900" 
          : "bg-white text-black border-neutral-200 hover:border-neutral-300",
        disabled && "opacity-50 cursor-not-allowed hover:translate-y-0 hover:shadow-none",
        size === 'large' && "col-span-2 row-span-2",
        size === 'medium' && "col-span-2 sm:col-span-1 lg:col-span-2"
      )}
    >
      {/* Icon */}
      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
        accent ? "bg-white/10" : "bg-neutral-100"
      )}>
        <Icon className={cn("h-6 w-6", accent ? "text-white" : "text-black")} />
      </div>

      {/* Content */}
      <div className="flex-1">
        <h3 className={cn(
          "text-lg font-semibold mb-1",
          accent ? "text-white" : "text-black"
        )}>
          {title}
        </h3>
        <p className={cn(
          "text-sm leading-relaxed",
          accent ? "text-neutral-300" : "text-neutral-500"
        )}>
          {description}
        </p>
      </div>

      {/* Arrow */}
      <div className={cn(
        "absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity",
        accent ? "text-white" : "text-black"
      )}>
        <ArrowRight className="h-5 w-5" />
      </div>
    </button>
  )
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
        <Icon className="h-5 w-5 text-neutral-600" />
      </div>
      <div>
        <p className="text-2xl font-bold text-black">{value}</p>
        <p className="text-xs text-neutral-500">{label}</p>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const { currentUser, hasPermission, isLoading } = useAuth()
  const router = useRouter()

  if (isLoading || !currentUser) {
    return null
  }

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Administrateur Principal'
      case 'admin_musee': return 'Administrateur Musée'
      case 'accueil': return 'Agent d\'Accueil'
      default: return 'Utilisateur'
    }
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Section */}
        <div className="bg-black text-white rounded-2xl p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-neutral-400 text-sm mb-1">Bienvenue,</p>
              <h1 className="text-2xl lg:text-3xl font-bold">{currentUser.name}</h1>
              <p className="text-neutral-400 mt-1">{getRoleDisplay(currentUser.role)}</p>
            </div>
            <div className="flex gap-3">
              <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
                <Calendar className="h-5 w-5 mx-auto mb-1 text-neutral-300" />
                <p className="text-xs text-neutral-300">
                  {new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Rôle" value={currentUser.role === 'super_admin' ? 'Admin' : 'Staff'} icon={Shield} />
          <StatCard label="Utilisateur" value={currentUser.username} icon={User} />
        </div>

        {/* Bento Grid - Main Actions */}
        <div>
          <h2 className="text-lg font-semibold text-black mb-4">Actions rapides</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Éditeur - Grande carte pour super_admin et admin_musee */}
            {hasPermission('edit_maps') && (
              <BentoCard
                title="Éditeur de Musée"
                description="Créer et modifier les plans, pièces et œuvres du musée en temps réel"
                icon={Edit}
                onClick={() => router.push('/editor')}
                size="medium"
                accent
              />
            )}

            {/* Dashboard Œuvres & Narrations */}
            {hasPermission('edit_maps') && (
              <BentoCard
                title="Œuvres & Audio"
                description="Gérer les œuvres, métadonnées et générer les narrations audio"
                icon={Database}
                onClick={() => router.push('/admin/dashboard')}
              />
            )}

            {/* Profils de Narrations */}
            {hasPermission('manage_profils') && (
              <BentoCard
                title="Profils de Narration"
                description="Configurer les critères et styles de narration"
                icon={Palette}
                onClick={() => router.push('/admin/profils')}
              />
            )}

            {/* Gestion Utilisateurs Musée - super_admin only */}
            {hasPermission('manage_admin_musee') && (
              <BentoCard
                title="Gestion Utilisateurs"
                description="Créer et gérer les comptes administrateurs et agents"
                icon={Users}
                onClick={() => router.push('/admin/users')}
              />
            )}

            {/* Gestion Agents Accueil - admin_musee */}
            {hasPermission('manage_accueil') && (
              <BentoCard
                title="Agents Accueil"
                description="Gérer les comptes du personnel d'accueil et vente"
                icon={UserPlus}
                onClick={() => router.push('/admin/accueil-users')}
              />
            )}

            {/* QR Code */}
            {(hasPermission('edit_maps') || hasPermission('manage_accueil') || hasPermission('view_only')) && (
              <BentoCard
                title="Générateur QR Code"
                description="Créer des QR codes pour l'audioguide visiteurs"
                icon={QrCode}
                onClick={() => router.push('/admin/qrcode')}
              />
            )}

            {/* Paramètres Système - super_admin only */}
            {hasPermission('system_settings') && (
              <BentoCard
                title="Paramètres Système"
                description="Configuration du musée, horaires et préférences globales"
                icon={Settings}
                onClick={() => router.push('/admin/settings')}
              />
            )}
          </div>
        </div>

        {/* Account Info Card */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
          <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4">
            Informations du compte
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-neutral-400 mb-1">Nom</p>
              <p className="font-medium text-black">{currentUser.name}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400 mb-1">Identifiant</p>
              <p className="font-medium text-black">{currentUser.username}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400 mb-1">Rôle</p>
              <p className="font-medium text-black">{getRoleDisplay(currentUser.role)}</p>
            </div>
            {currentUser.museeId && (
              <div>
                <p className="text-xs text-neutral-400 mb-1">Musée</p>
                <p className="font-medium text-black">{currentUser.museeId}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}