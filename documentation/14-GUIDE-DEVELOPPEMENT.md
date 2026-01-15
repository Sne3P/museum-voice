# 👨‍💻 Guide de Développement

## Environnement de Développement

### Prérequis

| Outil | Version | Installation |
|-------|---------|--------------|
| Node.js | 18+ | https://nodejs.org |
| pnpm | 8+ | `npm install -g pnpm` |
| Python | 3.10+ | https://python.org |
| Docker | 20+ | https://docker.com |
| VS Code | - | Recommandé |

### Extensions VS Code recommandées

- **ESLint** - Linting JavaScript/TypeScript
- **Prettier** - Formatage code
- **Tailwind CSS IntelliSense** - Autocomplétion Tailwind
- **Python** - Support Python
- **Docker** - Support Docker

---

## Installation

### 1. Cloner le projet

```bash
git clone <repository-url>
cd v0-visual-museum-editor
```

### 2. Installer les dépendances frontend

```bash
pnpm install
```

### 3. Lancer via Docker (recommandé)

```bash
# Développement complet
docker compose -f docker-compose.dev.yml up -d

# Voir les logs
docker compose -f docker-compose.dev.yml logs -f
```

### 4. Ou lancer individuellement

```bash
# Terminal 1: Backend
cd backend
pip install -r requirements.txt
python rag/main_postgres.py

# Terminal 2: Frontend
pnpm dev
```

---

## Structure du Code

### Organisation des dossiers

```
/
├── app/                 # Routes Next.js (App Router)
├── components/          # Composants React partagés
├── core/                # Logique métier pure
│   ├── constants/       # Constantes globales
│   ├── entities/        # Types TypeScript
│   ├── services/        # Services métier
│   └── utils/           # Utilitaires
├── features/            # Modules par fonctionnalité
│   ├── canvas/          # Module Canvas 2D
│   ├── editor/          # Module Éditeur
│   ├── properties/      # Module Propriétés
│   └── toolbar/         # Module Toolbar
├── lib/                 # Bibliothèques partagées
├── backend/             # Backend Python/Flask
└── client-frontend/     # Client React visiteur
```

### Principes d'architecture

1. **Separation of Concerns** : Séparer UI, logique, données
2. **Feature-Based** : Organiser par fonctionnalité
3. **DRY** : Ne pas se répéter
4. **SOLID** : Principes de conception

---

## Conventions de Code

### TypeScript

```typescript
// Types explicites
interface Artwork {
  id: string;
  title: string;
  x: number;
  y: number;
}

// Fonctions typées
function createArtwork(data: Partial<Artwork>): Artwork {
  return {
    id: generateId(),
    title: data.title || 'Sans titre',
    x: data.x || 0,
    y: data.y || 0,
  };
}

// Éviter `any`
// ❌ const data: any = ...
// ✅ const data: unknown = ...
```

### React

```tsx
// Composants fonctionnels avec types
interface Props {
  artwork: Artwork;
  onSelect: (id: string) => void;
}

export function ArtworkCard({ artwork, onSelect }: Props) {
  const handleClick = () => {
    onSelect(artwork.id);
  };

  return (
    <div onClick={handleClick}>
      <h3>{artwork.title}</h3>
    </div>
  );
}

// Hooks personnalisés
function useArtworks() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArtworks().then(data => {
      setArtworks(data);
      setLoading(false);
    });
  }, []);

  return { artworks, loading };
}
```

### CSS / Tailwind

```tsx
// Classes Tailwind bien organisées
<div className={cn(
  // Layout
  "flex items-center justify-between",
  // Spacing
  "p-4 gap-2",
  // Appearance
  "bg-white rounded-lg shadow-md",
  // State
  isActive && "ring-2 ring-blue-500"
)}>
```

### Python

```python
# Docstrings
def calculate_path(from_id: int, to_id: int) -> list[dict]:
    """
    Calcule le chemin optimal entre deux œuvres.
    
    Args:
        from_id: ID de l'œuvre de départ
        to_id: ID de l'œuvre d'arrivée
    
    Returns:
        Liste de segments avec coordonnées
    """
    # Implémentation...
    pass

# Type hints
def get_artwork(oeuvre_id: int) -> Optional[dict]:
    conn = get_connection()
    # ...
```

---

## Git Workflow

### Branches

| Branche | Usage |
|---------|-------|
| `main` | Production stable |
| `develop` | Développement intégration |
| `feature/*` | Nouvelles fonctionnalités |
| `bugfix/*` | Corrections de bugs |
| `hotfix/*` | Corrections urgentes prod |

### Commits

Format : `type(scope): description`

```bash
# Types
feat(editor): add entrance tool
fix(canvas): correct zoom behavior
docs(readme): update installation steps
style(ui): improve button spacing
refactor(api): simplify route handlers
test(canvas): add rendering tests
chore(deps): update dependencies
```

### Pull Requests

1. Créer une branche `feature/nom-feature`
2. Développer et commiter
3. Pousser et créer une PR
4. Review et merge

---

## Tests

### Tests unitaires (TypeScript)

```typescript
// __tests__/geometry.test.ts
import { calculateDistance } from '@/core/utils/geometry';

describe('calculateDistance', () => {
  it('should calculate distance between two points', () => {
    const result = calculateDistance(
      { x: 0, y: 0 },
      { x: 3, y: 4 }
    );
    expect(result).toBe(5);
  });
});
```

### Lancement tests

```bash
# Frontend
pnpm test

# Backend
cd backend
pytest
```

---

## Debugging

### Frontend (React DevTools)

1. Installer l'extension React DevTools
2. Ouvrir les DevTools du navigateur
3. Onglet "Components" pour inspecter les composants
4. Onglet "Profiler" pour les performances

### Backend (Flask)

```python
# Mode debug
FLASK_ENV=development python rag/main_postgres.py

# Logs détaillés
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Base de données

```bash
# Accès direct PostgreSQL
docker compose exec postgres psql -U museum -d museum_db

# Requêtes de debug
SELECT * FROM oeuvres LIMIT 5;
\d+ oeuvres  -- Structure table
```

### Logs Docker

```bash
# Tous les services
docker compose logs -f

# Service spécifique
docker compose logs -f backend

# Avec filtrage
docker compose logs -f backend 2>&1 | grep -i error
```

---

## Performances

### Frontend

1. **Code Splitting** : Automatique avec Next.js
2. **Images** : Utiliser `next/image`
3. **Memoization** : `useMemo`, `useCallback`
4. **Virtualisation** : Pour longues listes

```tsx
// Optimisation rendu
const MemoizedComponent = React.memo(({ data }) => {
  return <div>{data.title}</div>;
});

// Éviter re-renders
const handleClick = useCallback((id) => {
  // ...
}, []);
```

### Backend

1. **Connexions DB** : Pool de connexions
2. **Cache** : Redis (optionnel)
3. **Indexation** : Index PostgreSQL
4. **Requêtes** : Éviter N+1

```python
# Pool de connexions
from psycopg2 import pool
db_pool = pool.ThreadedConnectionPool(1, 20, dsn)

# Index
CREATE INDEX idx_oeuvres_salle ON oeuvres(salle_id);
```

---

## Sécurité

### Bonnes pratiques

1. **Variables d'environnement** : Ne jamais commiter de secrets
2. **Validation** : Valider toutes les entrées
3. **Sanitization** : Échapper les sorties
4. **HTTPS** : En production
5. **CORS** : Configuration restrictive

```typescript
// Validation entrées
const schema = z.object({
  title: z.string().min(1).max(255),
  x: z.number().min(0),
  y: z.number().min(0),
});

const validated = schema.parse(input);
```

---

## Documentation du Code

### JSDoc / TSDoc

```typescript
/**
 * Dessine une entrée sur le canvas.
 * 
 * @param ctx - Contexte de rendu 2D
 * @param entrance - Données de l'entrée
 * @param isSelected - Si l'entrée est sélectionnée
 * 
 * @example
 * ```ts
 * drawEntrance(ctx, { id: '1', name: 'Entrée', x: 100, y: 200 });
 * ```
 */
export function drawEntrance(
  ctx: CanvasRenderingContext2D,
  entrance: Entrance,
  isSelected: boolean = false
): void {
  // ...
}
```

### README par module

Chaque module peut avoir son propre README :

```
features/canvas/
├── README.md           # Documentation du module
├── Canvas.tsx
├── hooks/
└── utils/
```

---

## CI/CD (optionnel)

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
```

---

## Ressources

### Documentation

- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Flask Docs](https://flask.palletsprojects.com)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

### Outils

- [Postman](https://postman.com) - Tests API
- [pgAdmin](https://pgadmin.org) - GUI PostgreSQL
- [Docker Desktop](https://docker.com) - Gestion conteneurs
