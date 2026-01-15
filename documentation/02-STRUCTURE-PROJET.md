# 📁 Structure du Projet

## Arborescence Complète

```
v0-visual-museum-editor/
├── 📄 Configuration Root
│   ├── package.json            # Dépendances npm/pnpm
│   ├── pnpm-lock.yaml          # Lock file pnpm
│   ├── next.config.mjs         # Configuration Next.js
│   ├── tsconfig.json           # Configuration TypeScript
│   ├── postcss.config.mjs      # Configuration PostCSS
│   ├── components.json         # Configuration shadcn/ui
│   ├── docker-compose.yml      # Docker Compose principal
│   ├── docker-compose.dev.yml  # Docker Compose développement
│   ├── docker-compose.prod.yml # Docker Compose production
│   ├── Dockerfile              # Dockerfile Next.js
│   └── .env.prod.example       # Template variables d'environnement
│
├── 📁 app/                     # Routes Next.js (App Router)
│   ├── layout.tsx              # Layout racine
│   ├── page.tsx                # Page d'accueil (redirect)
│   ├── globals.css             # Styles globaux
│   │
│   ├── 📁 admin/               # Routes administration
│   │   ├── page.tsx            # Dashboard admin principal
│   │   ├── 📁 dashboard/       # Gestion des œuvres
│   │   ├── 📁 qrcode/          # Générateur QR codes
│   │   ├── 📁 test-parcours/   # Test des parcours
│   │   ├── 📁 users/           # Gestion utilisateurs
│   │   └── 📁 accueil-users/   # Page d'accueil utilisateurs
│   │
│   ├── 📁 api/                 # API Routes Next.js
│   │   ├── 📁 admin/           # API admin
│   │   ├── 📁 artwork-pdf/     # Upload PDF œuvres
│   │   ├── 📁 extract-pdf-metadata/ # Extraction métadonnées PDF
│   │   ├── 📁 health/          # Health check
│   │   ├── 📁 load-from-db/    # Chargement état éditeur
│   │   ├── 📁 save-to-db/      # Sauvegarde état éditeur
│   │   ├── 📁 parcours/        # API parcours (proxy)
│   │   └── 📁 qrcode/          # Génération QR codes
│   │
│   ├── 📁 editor/              # Éditeur visuel
│   ├── 📁 parcours/            # Gestion parcours
│   ├── 📁 audioguide/          # Audioguide preview
│   └── 📁 login/               # Authentification
│
├── 📁 components/              # Composants partagés React
│   ├── auth-context.tsx        # Context authentification
│   ├── theme-provider.tsx      # Provider thème
│   └── 📁 ui/                  # Composants shadcn/ui
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── select.tsx
│       └── ... (autres composants)
│
├── 📁 core/                    # Logique métier centrale
│   ├── index.ts                # Exports publics
│   │
│   ├── 📁 constants/           # Constantes globales
│   │   ├── index.ts
│   │   └── canvas.constants.ts # GRID_SIZE, GRID_TO_METERS
│   │
│   ├── 📁 entities/            # Types TypeScript
│   │   ├── index.ts
│   │   ├── museum.types.ts     # Room, Artwork, Floor, Entrance...
│   │   └── canvas.types.ts     # CanvasState, Tool, etc.
│   │
│   ├── 📁 services/            # Services métier
│   │   ├── index.ts
│   │   ├── museum.service.ts   # Service musée
│   │   └── pathfinding.ts      # Algorithme A*
│   │
│   └── 📁 utils/               # Utilitaires
│       ├── index.ts
│       ├── geometry.ts         # Calculs géométriques
│       └── formatters.ts       # Formatage données
│
├── 📁 features/                # Fonctionnalités par module
│   ├── index.ts                # Exports publics
│   │
│   ├── 📁 canvas/              # Module Canvas 2D
│   │   ├── index.ts
│   │   ├── Canvas.tsx          # Composant principal Canvas
│   │   │
│   │   ├── 📁 hooks/           # Hooks React
│   │   │   ├── useCanvasRender.ts    # Rendu canvas
│   │   │   ├── useCanvasInteraction.ts
│   │   │   └── useCanvasZoom.ts
│   │   │
│   │   └── 📁 utils/           # Utilitaires canvas
│   │       ├── room.renderer.ts      # Rendu salles
│   │       ├── artwork.renderer.ts   # Rendu œuvres
│   │       ├── link.renderer.ts      # Rendu liens/portes
│   │       ├── entrance.renderer.ts  # Rendu points d'entrée
│   │       └── grid.renderer.ts      # Rendu grille
│   │
│   ├── 📁 editor/              # Module Éditeur
│   │   ├── index.ts
│   │   ├── MuseumEditor.tsx    # Composant éditeur principal
│   │   └── 📁 components/      # Sous-composants
│   │
│   ├── 📁 properties/          # Panneau de propriétés
│   │   ├── index.ts
│   │   └── PropertiesPanel.tsx
│   │
│   └── 📁 toolbar/             # Barre d'outils
│       ├── index.ts
│       └── Toolbar.tsx
│
├── 📁 infrastructure/          # Infrastructure & accès données
│   └── (services bas niveau)
│
├── 📁 lib/                     # Bibliothèques partagées
│   ├── database-postgres.ts    # Client PostgreSQL
│   ├── uploads.ts              # Gestion uploads (getUploadUrl)
│   └── utils.ts                # Utilitaires (cn, etc.)
│
├── 📁 shared/                  # Éléments partagés
│   ├── 📁 components/          # Composants partagés
│   └── 📁 hooks/               # Hooks partagés
│
├── 📁 public/                  # Assets statiques Next.js
│   └── 📁 uploads/             # Uploads synchronisés
│
├── 📁 backend/                 # Backend Flask (Python)
│   ├── Dockerfile              # Dockerfile backend
│   ├── requirements.txt        # Dépendances Python
│   ├── README.md               # Documentation backend
│   │
│   ├── 📁 rag/                 # Application principale
│   │   ├── main_postgres.py    # Serveur Flask principal
│   │   └── (modules RAG)
│   │
│   ├── 📁 Piper/               # Configuration Piper TTS
│   └── 📁 legacy/              # Code legacy
│
├── 📁 client-frontend/         # Client React (non visible dans workspace)
│   ├── Dockerfile
│   ├── package.json
│   └── 📁 src/
│       ├── 📁 components/
│       │   ├── 📁 map_viewer/  # MapViewer.jsx
│       │   └── ...
│       └── ...
│
├── 📁 museum-voice/            # Alternative client (Nginx)
│   ├── Dockerfile
│   ├── nginx.conf
│   └── 📁 src/
│
├── 📁 database/                # Scripts base de données
│   └── init.sql                # Initialisation schéma
│
├── 📁 scripts/                 # Scripts utilitaires
│   ├── init-ollama.ps1         # Init Ollama (Windows)
│   ├── init-ollama.sh          # Init Ollama (Linux)
│   ├── init-piper.sh           # Init Piper TTS
│   └── ollama-entrypoint.sh    # Entrypoint Ollama
│
├── 📁 documentation/           # 📚 Cette documentation
│   ├── README.md
│   ├── 01-ARCHITECTURE.md
│   ├── 02-STRUCTURE-PROJET.md
│   └── ...
│
└── 📁 legacy/                  # Code legacy (anciennes versions)
    ├── constants.ts
    ├── database.ts
    └── 📁 components/
```

## Description des Dossiers Principaux

### `/app` - Routes Next.js

Structure App Router Next.js 14+. Chaque dossier représente une route.

```typescript
// Exemple : app/admin/dashboard/page.tsx
export default function DashboardPage() {
  return <Dashboard />
}
```

### `/core` - Logique Métier

Contient la logique pure, indépendante du framework.

**Principes** :
- Pas de dépendances React
- Types TypeScript stricts
- Fonctions pures
- Testable unitairement

```typescript
// core/entities/museum.types.ts
export interface Entrance {
  id: string;
  name: string;
  x: number;
  y: number;
  icon: string;
  isActive: boolean;
}
```

### `/features` - Fonctionnalités

Modules par fonctionnalité (Feature-Based Architecture).

```
features/
├── canvas/       # Tout ce qui concerne le canvas
├── editor/       # Éditeur visuel complet
├── properties/   # Panneau de propriétés
└── toolbar/      # Barre d'outils
```

### `/components/ui` - Composants shadcn/ui

Composants UI réutilisables basés sur shadcn/ui.

```typescript
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
```

### `/lib` - Utilitaires

Bibliothèques partagées et utilitaires.

```typescript
// lib/uploads.ts
export function getUploadUrl(path: string): string {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
  return path.startsWith('/') ? `${backendUrl}${path}` : `${backendUrl}/${path}`;
}
```

### `/backend` - Serveur Flask

Backend Python avec Flask.

```python
# backend/rag/main_postgres.py
@app.route('/api/museum/floor-plan', methods=['GET'])
def get_floor_plan():
    # Retourne salles + entrées
    ...
```

## Conventions de Nommage

### Fichiers

| Type | Convention | Exemple |
|------|-----------|---------|
| Composant React | PascalCase.tsx | `Canvas.tsx` |
| Hook | camelCase.ts | `useCanvasRender.ts` |
| Utilitaire | kebab-case.ts | `room.renderer.ts` |
| Type/Interface | camelCase.types.ts | `museum.types.ts` |
| Constante | camelCase.constants.ts | `canvas.constants.ts` |

### Variables et Fonctions

```typescript
// Variables : camelCase
const floorPlanData = {...}

// Constantes : SCREAMING_SNAKE_CASE
const GRID_SIZE = 40

// Fonctions : camelCase (verbe + nom)
function drawEntrance(ctx, entrance) {...}

// Types/Interfaces : PascalCase
interface Entrance {...}
```

## Imports

### Alias configurés (tsconfig.json)

```typescript
// Alias @ = racine du projet
import { Button } from "@/components/ui/button"
import { Room } from "@/core/entities/museum.types"
import { drawRoom } from "@/features/canvas/utils/room.renderer"
```

### Ordre des imports recommandé

```typescript
// 1. React et bibliothèques tierces
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. Composants UI
import { Button } from "@/components/ui/button";

// 3. Core (types, constantes, services)
import { Room, Artwork } from "@/core/entities";
import { GRID_SIZE } from "@/core/constants";

// 4. Features
import { Canvas } from "@/features/canvas";

// 5. Utilitaires locaux
import { drawRoom } from "./utils/room.renderer";

// 6. Styles
import "./styles.css";
```

## Exports

### Index files (barrel exports)

Chaque dossier de module exporte via `index.ts` :

```typescript
// features/canvas/index.ts
export { Canvas } from './Canvas';
export { useCanvasRender } from './hooks/useCanvasRender';
export * from './utils';

// Usage
import { Canvas, useCanvasRender } from '@/features/canvas';
```

### Core exports

```typescript
// core/index.ts
export * from './entities';
export * from './constants';
export * from './services';
export * from './utils';

// Usage
import { Room, Artwork, GRID_SIZE } from '@/core';
```
