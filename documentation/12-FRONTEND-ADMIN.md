# 🖥️ Frontend Admin (Next.js)

## Présentation

L'interface d'administration est construite avec **Next.js 14+** (App Router), **React 18**, **TypeScript** et **Tailwind CSS**.

---

## Stack Technique

| Technologie | Version | Usage |
|-------------|---------|-------|
| Next.js | 14+ | Framework React SSR/SSG |
| React | 18 | Bibliothèque UI |
| TypeScript | 5+ | Typage statique |
| Tailwind CSS | 3+ | Styling utilitaire |
| shadcn/ui | - | Composants UI |
| pnpm | - | Gestionnaire de packages |

---

## Structure

```
app/
├── layout.tsx          # Layout racine
├── page.tsx            # Page d'accueil (redirect)
├── globals.css         # Styles globaux
│
├── editor/
│   └── page.tsx        # Éditeur visuel
│
├── admin/
│   ├── page.tsx        # Dashboard principal
│   ├── dashboard/
│   │   └── page.tsx    # Gestion des œuvres
│   ├── qrcode/
│   │   └── page.tsx    # Générateur QR
│   ├── test-parcours/
│   │   └── page.tsx    # Test parcours
│   └── users/
│       └── page.tsx    # Gestion utilisateurs
│
├── parcours/
│   └── page.tsx        # Gestion parcours
│
├── login/
│   └── page.tsx        # Authentification
│
└── api/
    ├── load-from-db/
    ├── save-to-db/
    ├── qrcode/
    └── ...
```

---

## Pages Principales

### Éditeur Visuel (`/editor`)

Interface de création des plans du musée.

**Fonctionnalités** :
- Canvas 2D interactif
- Outils de dessin (salles, œuvres, portes, entrées)
- Multi-étages
- Sauvegarde automatique

**Composants clés** :
```typescript
// features/editor/MuseumEditor.tsx
// features/canvas/Canvas.tsx
// features/toolbar/Toolbar.tsx
// features/properties/PropertiesPanel.tsx
```

### Dashboard Admin (`/admin/dashboard`)

Gestion centralisée des œuvres.

**Fonctionnalités** :
- Liste des œuvres (tableau filtrable)
- Édition des métadonnées
- Upload images/PDF
- Génération narrations
- Prévisualisation audio

**Interface** :
```
┌──────────────────────────────────────────────────────────────┐
│  🖼️ Dashboard - Gestion des Œuvres                          │
├──────────────────────────────────────────────────────────────┤
│  [Recherche...] [Salle ▼] [Artiste ▼] [+ Nouvelle œuvre]    │
├──────────────────────────────────────────────────────────────┤
│  │ Image │ Titre           │ Artiste        │ Salle   │ ... │
│  ├───────┼─────────────────┼────────────────┼─────────┼─────│
│  │ 🖼️    │ La Joconde      │ L. de Vinci    │ Salle A │ ✏️🗑️ │
│  │ 🖼️    │ La Nuit Étoilée │ Van Gogh       │ Salle B │ ✏️🗑️ │
└──────────────────────────────────────────────────────────────┘
```

### Générateur QR (`/admin/qrcode`)

Création de QR codes pour les parcours.

**Fonctionnalités** :
- Sélection du parcours
- Choix du profil
- Génération QR code
- Export PNG/PDF

### Test Parcours (`/admin/test-parcours`)

Simulation de parcours visiteur.

**Fonctionnalités** :
- Visualisation carte
- Navigation étape par étape
- Lecture audio
- Vérification chemins

---

## Composants UI (shadcn/ui)

### Installation

```bash
pnpm dlx shadcn-ui@latest add button
pnpm dlx shadcn-ui@latest add card
pnpm dlx shadcn-ui@latest add dialog
# etc.
```

### Usage

```typescript
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog"

export function Example() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Titre</CardTitle>
      </CardHeader>
      <CardContent>
        <Button>Cliquer</Button>
      </CardContent>
    </Card>
  )
}
```

### Composants disponibles

- `Button` - Boutons avec variantes
- `Card` - Cartes conteneur
- `Dialog` - Modales
- `Input` - Champs de saisie
- `Select` - Sélecteurs
- `Table` - Tableaux
- `Tabs` - Onglets
- `Toast` - Notifications
- Et plus...

---

## Gestion d'État

### État local (useState)

```typescript
const [artworks, setArtworks] = useState<Artwork[]>([]);
const [selectedId, setSelectedId] = useState<string | null>(null);
```

### État global (Context)

```typescript
// components/auth-context.tsx
export const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  logout: () => {},
});

// Usage
const { user, login, logout } = useContext(AuthContext);
```

---

## Appels API

### Fetch côté client

```typescript
async function loadArtworks() {
  const response = await fetch('/api/admin/oeuvres');
  const data = await response.json();
  if (data.success) {
    setArtworks(data.oeuvres);
  }
}
```

### Fetch côté serveur (Server Components)

```typescript
// app/admin/dashboard/page.tsx
async function DashboardPage() {
  const res = await fetch(`${process.env.BACKEND_URL}/api/admin/oeuvres`, {
    cache: 'no-store'
  });
  const data = await res.json();
  
  return <Dashboard artworks={data.oeuvres} />;
}
```

### Fonction utilitaire `getUploadUrl`

```typescript
// lib/uploads.ts
export function getUploadUrl(path: string): string {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
  
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  return path.startsWith('/') 
    ? `${backendUrl}${path}` 
    : `${backendUrl}/${path}`;
}

// Usage
const imageUrl = getUploadUrl(artwork.image_link);
// → "http://51.38.188.211:5000/uploads/images/oeuvre_1.jpg"
```

---

## Routing

### App Router (Next.js 14)

```
app/
├── page.tsx              → /
├── editor/page.tsx       → /editor
├── admin/
│   ├── page.tsx          → /admin
│   └── dashboard/
│       └── page.tsx      → /admin/dashboard
└── parcours/page.tsx     → /parcours
```

### Navigation

```typescript
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Navigation impérative
const router = useRouter();
router.push('/admin/dashboard');

// Navigation déclarative
<Link href="/admin/dashboard">Dashboard</Link>
```

---

## Formulaires

### Formulaire basique

```typescript
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function ArtworkForm({ onSubmit }: { onSubmit: (data: ArtworkFormData) => void }) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ title, artist });
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titre de l'œuvre"
      />
      <Input
        value={artist}
        onChange={(e) => setArtist(e.target.value)}
        placeholder="Artiste"
      />
      <Button type="submit">Enregistrer</Button>
    </form>
  );
}
```

### Upload de fichiers

```typescript
async function handleFileUpload(file: File, oeuvreId: number) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('oeuvre_id', oeuvreId.toString());
  
  const response = await fetch('/api/artwork-pdf', {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json();
  return result;
}
```

---

## Styles

### Tailwind CSS

```tsx
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">
  <h2 className="text-xl font-bold text-gray-800">Titre</h2>
  <Button className="bg-blue-500 hover:bg-blue-600">
    Action
  </Button>
</div>
```

### Configuration Tailwind

```javascript
// tailwind.config.js
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './features/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // ...
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

---

## Authentification

### Context Auth

```typescript
// components/auth-context.tsx
'use client';

import { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // ... implémentation
  
  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### Protection des routes

```typescript
// Middleware ou composant wrapper
'use client';

import { useAuth } from '@/components/auth-context';
import { redirect } from 'next/navigation';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <div>Chargement...</div>;
  if (!user) {
    redirect('/login');
  }
  
  return <>{children}</>;
}
```

---

## Performance

### Optimisations

1. **Images** : Utiliser `next/image`
   ```tsx
   import Image from 'next/image';
   <Image src={url} width={200} height={200} alt="..." />
   ```

2. **Code splitting** : Automatic avec App Router

3. **Préchargement** : 
   ```tsx
   import Link from 'next/link';
   <Link href="/page" prefetch={true}>Lien</Link>
   ```

4. **Mise en cache** :
   ```typescript
   fetch(url, { next: { revalidate: 3600 } }); // Cache 1h
   ```

---

## Développement

### Lancement

```bash
pnpm install
pnpm dev
```

### Build production

```bash
pnpm build
pnpm start
```

### Lint

```bash
pnpm lint
```
