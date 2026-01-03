# Museum Voice - Éditeur Visuel de Plans

Éditeur interactif pour créer des plans de musées avec artworks, liaisons verticales (escaliers, ascenseurs), et génération de parcours guidés.

## 🚀 Démarrage Rapide

```bash
# Lancer avec Docker
docker-compose up -d

# Accès
- Application: http://localhost:3000
- Base de données PostgreSQL: localhost:5432
```

## 📁 Structure

```
app/              # Next.js App Router (pages, API routes)
core/             # Services métier, types, constantes (DRY)
features/         # Composants fonctionnels (canvas, editor, toolbar)
shared/           # Composants UI réutilisables, hooks
components/       # Composants UI de base (auth, theme, ui/)
lib/              # Clients DB (PostgreSQL)
database/         # Scripts SQL init
backend/          # Python RAG engine (séparé)
legacy/           # Ancien code archivé
```

## 🛠️ Technologies

- **Frontend**: Next.js 16, React, TypeScript, TailwindCSS
- **Backend**: PostgreSQL 16, Python (RAG)
- **Déploiement**: Docker, docker-compose

## 📐 Architecture

- **DRY**: Tout code centralisé dans `core/`
- **Bottom-up**: `core/` → `shared/` → `features/` → `app/`
- **Pas de duplication**: Vérifier `core/` avant d'écrire

## 🗄️ Base de Données

PostgreSQL avec sauvegarde complète des propriétés via JSON metadata :
- Positions exactes (x, y)
- Dimensions (width, height, thickness)
- Connexions (connectedFloorIds, linkGroupId)
- Types (ROOM, WALL, DOOR, ARTWORK, VERTICAL_LINK, ESCALATOR, ELEVATOR)

## 📝 Scripts

```bash
# Développement local (sans Docker)
pnpm install
pnpm dev

# Build production
pnpm build
pnpm start
```

## 🔧 Variables d'Environnement

Voir `.env.local.example`
