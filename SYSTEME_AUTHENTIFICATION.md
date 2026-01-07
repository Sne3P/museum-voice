# Système d'Authentification et Permissions - MuseumVoice

## 🔐 Corrections Appliquées

### Problème Identifié
La page `/admin/profils` vérifiait `hasPermission('admin')` qui **n'existait pas** dans le système de permissions, causant une redirection vers `/admin` pour tous les utilisateurs.

### Solution
1. ✅ Ajout de la permission `manage_profils` dans le système
2. ✅ Correction de la vérification dans la page profils
3. ✅ Ajout de `authLoading` pour éviter les redirections pendant le chargement
4. ✅ Ajout de logs de debug pour faciliter le diagnostic

## 📋 Rôles et Permissions

### Rôles Disponibles
```typescript
type UserRole = 'super_admin' | 'admin_musee' | 'accueil'
```

### Permissions par Rôle

#### **Super Admin** (`super_admin`)
Accès complet au système :
- ✅ `edit_maps` - Éditer les plans de musée
- ✅ `manage_admin_musee` - Gérer les admins musée
- ✅ `manage_themes` - Gérer les thématiques
- ✅ `system_settings` - Paramètres système
- ✅ `manage_profils` - **Gérer les critères et profils**
- ✅ `manage_accueil` - Gérer les agents d'accueil

#### **Admin Musée** (`admin_musee`)
Gestion du musée spécifique :
- ✅ `edit_maps` - Éditer les plans
- ✅ `manage_accueil` - Gérer les agents d'accueil
- ✅ `manage_themes` - Gérer les thématiques
- ✅ `manage_profils` - **Gérer les critères et profils**

#### **Agent Accueil** (`accueil`)
Accès limité en lecture :
- ✅ `view_only` - Consultation uniquement

## 🔑 Comptes de Test

```javascript
const USERS_DB = [
  {
    username: 'admin',
    password: 'admin123',
    role: 'super_admin',
    name: 'Administrateur Principal'
  },
  {
    username: 'musee1',
    password: 'musee123',
    role: 'admin_musee',
    name: 'Admin Musée Louvre',
    museeId: 'louvre'
  },
  {
    username: 'accueil1',
    password: 'accueil123',
    role: 'accueil',
    name: 'Vendeur Accueil',
    museeId: 'louvre'
  }
]
```

## 🛡️ Protection des Pages

### Structure de Protection

Chaque page admin utilise ce pattern :

```typescript
export default function ProtectedPage() {
  const { isAuthenticated, hasPermission, isLoading: authLoading } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    // 1. Attendre le chargement de l'auth
    if (authLoading) return
    
    // 2. Vérifier l'authentification
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    
    // 3. Vérifier les permissions
    if (!hasPermission('required_permission')) {
      router.push('/admin') // ou '/accueil' selon le cas
      return
    }
    
    // 4. Charger les données
    loadData()
  }, [authLoading, isAuthenticated, hasPermission, router])
  
  // Afficher un loader pendant le chargement
  if (authLoading) {
    return <LoadingSpinner message="Vérification des permissions..." />
  }
  
  // ...reste du composant
}
```

### Pages et Permissions Requises

| Page | Permission Requise | Accès |
|------|-------------------|-------|
| `/admin` | Authentification seule | Tous les utilisateurs connectés |
| `/admin/profils` | `manage_profils` | super_admin, admin_musee |
| `/admin/users` | `manage_admin_musee` | super_admin uniquement |
| `/admin/accueil-users` | `manage_accueil` | super_admin, admin_musee |
| `/admin/settings` | `system_settings` | super_admin uniquement |
| `/admin/qrcode` | `edit_maps` OU `manage_accueil` OU `view_only` | Tous |
| `/admin/dashboard` | `edit_maps` | super_admin, admin_musee |
| `/admin/test-parcours` | `edit_maps` | super_admin, admin_musee |
| `/editor` | `edit_maps` | super_admin, admin_musee |
| `/accueil` | Authentification seule | Tous |

## 🔄 Flux d'Authentification

### 1. Connexion (`/login`)
```
Utilisateur saisit identifiants
    ↓
login(username, password)
    ↓
Vérification dans USERS_DB
    ↓
Si OK : Sauvegarde dans localStorage + setCurrentUser
    ↓
Redirection vers /admin
```

### 2. Restauration de Session
```
Page chargée (useEffect dans AuthProvider)
    ↓
Vérification localStorage.getItem('museum-auth-data')
    ↓
Si trouvé : Restauration de currentUser + setIsAuthenticated(true)
    ↓
setIsLoading(false)
```

### 3. Vérification de Permission
```
hasPermission('action')
    ↓
Récupération des permissions du rôle
    ↓
Vérification si action dans permissions[currentUser.role]
    ↓
Retourne true/false
```

### 4. Déconnexion
```
logout()
    ↓
setIsAuthenticated(false)
    ↓
setCurrentUser(null)
    ↓
localStorage.removeItem('museum-auth-data')
    ↓
Redirection vers /login
```

## 📊 Logs de Debug

Le système inclut des logs pour faciliter le diagnostic :

```javascript
// Dans AuthProvider
console.log('🔐 Vérification de l\'authentification au chargement')
console.log('✅ Utilisateur restauré:', userData.username, userData.role)
console.log('✅ Login réussi pour:', username, 'Role:', user.role)
console.log('🚪 Déconnexion de l\'utilisateur')

// Dans hasPermission
console.log('🔐 hasPermission("action") pour role:', hasAccess)

// Dans les pages protégées
console.log('🔐 Profils page - Vérification auth', { authLoading, isAuthenticated })
console.log('⏳ Auth en cours de chargement, attente...')
console.log('❌ Non authentifié, redirection vers /login')
console.log('❌ Pas la permission manage_profils, redirection vers /admin')
console.log('✅ Accès autorisé à la page profils')
```

## 🎯 Matrice d'Accès Complète

| Fonctionnalité | super_admin | admin_musee | accueil |
|----------------|-------------|-------------|---------|
| Éditer plans musée | ✅ | ✅ | ❌ |
| Gérer profils/critères | ✅ | ✅ | ❌ |
| Gérer admin musée | ✅ | ❌ | ❌ |
| Gérer agents accueil | ✅ | ✅ | ❌ |
| Paramètres système | ✅ | ❌ | ❌ |
| Générer QR codes | ✅ | ✅ | ✅ (lecture seule) |
| Dashboard œuvres | ✅ | ✅ | ❌ |
| Test parcours | ✅ | ✅ | ❌ |

## 🐛 Dépannage

### Problème : Redirection constante vers `/login`
**Cause** : `authLoading` non géré, redirection avant fin du chargement  
**Solution** : Ajouter `if (authLoading) return` en début de useEffect

### Problème : Redirection vers `/admin` alors que connecté
**Cause** : Permission inexistante ou mal orthographiée  
**Solution** : Vérifier que la permission existe dans `permissions` de auth-context.tsx

### Problème : Session perdue au rafraîchissement
**Cause** : localStorage non accessible ou erreur de parsing  
**Solution** : Vérifier les logs console, nettoyer localStorage si corrompu

### Problème : Accès refusé malgré bon rôle
**Cause** : Permission manquante dans le tableau du rôle  
**Solution** : Ajouter la permission dans `permissions[role]` dans auth-context.tsx

## 📁 Fichiers Modifiés

1. ✅ [components/auth-context.tsx](../components/auth-context.tsx)
   - Ajout permission `manage_profils`
   - Logs de debug améliorés

2. ✅ [app/admin/profils/page.tsx](../app/admin/profils/page.tsx)
   - Utilisation de `manage_profils` au lieu de `admin`
   - Ajout gestion `authLoading`
   - Logs de debug

3. ✅ [app/admin/page.tsx](../app/admin/page.tsx)
   - Correction carte "Profils" : `hasPermission('manage_profils')`

## ✅ Tests à Effectuer

1. **Connexion super_admin**
   - ✓ Accès à `/admin/profils` : **Doit fonctionner**
   - ✓ Toutes les cartes visibles sur `/admin`

2. **Connexion admin_musee**
   - ✓ Accès à `/admin/profils` : **Doit fonctionner**
   - ✓ Pas d'accès à "Gestion Utilisateurs Musée"
   - ✓ Pas d'accès à "Paramètres système"

3. **Connexion accueil**
   - ✓ Accès à `/admin/profils` : **Doit rediriger vers /admin**
   - ✓ Seulement "QR Code Audioguide" visible

4. **Sans connexion**
   - ✓ `/admin/profils` : **Doit rediriger vers /login**
   - ✓ `/admin` : **Doit rediriger vers /login**

5. **Rafraîchissement de page**
   - ✓ Session persistante
   - ✓ Pas de re-login nécessaire
