"use client"

import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/components/auth-context'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  Edit, 
  Users, 
  UserPlus, 
  QrCode, 
  Settings, 
  Database, 
  LogOut,
  ChevronLeft,
  Palette,
  Building2
} from 'lucide-react'

interface NavItem {
  id: string
  label: string
  icon: React.ElementType
  href: string
  permission?: string
  description?: string
}

const navItems: NavItem[] = [
  { 
    id: 'home', 
    label: 'Accueil', 
    icon: LayoutDashboard, 
    href: '/admin',
    description: 'Vue d\'ensemble'
  },
  { 
    id: 'editor', 
    label: 'Éditeur', 
    icon: Edit, 
    href: '/editor',
    permission: 'edit_maps',
    description: 'Plans du musée'
  },
  { 
    id: 'dashboard', 
    label: 'Œuvres & Audio', 
    icon: Database, 
    href: '/admin/dashboard',
    permission: 'edit_maps',
    description: 'Narrations & prégénérations'
  },
  { 
    id: 'profils', 
    label: 'Profils', 
    icon: Palette, 
    href: '/admin/profils',
    permission: 'manage_profils',
    description: 'Critères de narration'
  },
  { 
    id: 'users', 
    label: 'Utilisateurs', 
    icon: Users, 
    href: '/admin/users',
    permission: 'manage_admin_musee',
    description: 'Admins & comptes'
  },
  { 
    id: 'accueil', 
    label: 'Agents Accueil', 
    icon: UserPlus, 
    href: '/admin/accueil-users',
    permission: 'manage_accueil',
    description: 'Personnel d\'accueil'
  },
  { 
    id: 'qrcode', 
    label: 'QR Code', 
    icon: QrCode, 
    href: '/admin/qrcode',
    description: 'Audioguide QR'
  },
  { 
    id: 'settings', 
    label: 'Paramètres', 
    icon: Settings, 
    href: '/admin/settings',
    permission: 'system_settings',
    description: 'Configuration système'
  },
]

interface AdminSidebarProps {
  collapsed?: boolean
  onToggle?: () => void
}

export function AdminSidebar({ collapsed = false, onToggle }: AdminSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { hasPermission, logout, currentUser } = useAuth()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin'
    }
    return pathname.startsWith(href)
  }

  const filteredItems = navItems.filter(item => {
    if (!item.permission) return true
    return hasPermission(item.permission)
  })

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'super_admin': return 'Super Admin'
      case 'admin_musee': return 'Admin Musée'
      case 'accueil': return 'Accueil'
      default: return 'Utilisateur'
    }
  }

  return (
    <aside 
      className={cn(
        "h-full bg-black text-white flex flex-col transition-all duration-300 border-r border-neutral-800",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo / Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            <span className="font-semibold text-sm">Museum Admin</span>
          </div>
        )}
        {collapsed && <Building2 className="h-6 w-6 mx-auto" />}
      </div>

      {/* User Info */}
      {!collapsed && currentUser && (
        <div className="px-4 py-3 border-b border-neutral-800">
          <p className="text-sm font-medium truncate">{currentUser.name}</p>
          <p className="text-xs text-neutral-400">{getRoleLabel(currentUser.role)}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {filteredItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => router.push(item.href)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group",
                    active 
                      ? "bg-white text-black" 
                      : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={cn("h-5 w-5 shrink-0", active && "text-black")} />
                  {!collapsed && (
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium block truncate">{item.label}</span>
                      {item.description && (
                        <span className={cn(
                          "text-xs block truncate",
                          active ? "text-neutral-600" : "text-neutral-500"
                        )}>
                          {item.description}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer / Logout */}
      <div className="p-2 border-t border-neutral-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all"
          title={collapsed ? "Déconnexion" : undefined}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="text-sm">Déconnexion</span>}
        </button>
      </div>
    </aside>
  )
}
