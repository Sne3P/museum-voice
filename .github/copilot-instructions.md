GitHub Copilot – Instructions Projet
🔒 RèGLE ABSOLUE (DRY)

Toujours vérifier dans core/ avant d’écrire quoi que ce soit

Jamais de duplication

Si absent → créer au bon endroit, jamais ailleurs

📁 Architecture (Bottom-Up strict)
core/        → fondation (aucune dépendance)
shared/      → réutilisable
features/    → fonctionnalités
app/         → orchestration


Les dépendances vont toujours vers le bas.

📌 Répartition du Code (OBLIGATOIRE)
Types

📍 core/entities/

❌ Aucun type/interface dans les composants

Constantes

📍 core/constants/

❌ Aucune valeur en dur

Logique métier / calculs

📍 core/services/

❌ Aucune logique métier dans composants, hooks ou renderers

Hooks

shared/hooks/ → génériques

features/*/hooks/ → interaction uniquement

❌ Pas de calcul métier dans les hooks

Renderers Canvas

📍 features/canvas/utils/*.renderer.ts

✔ Dessin uniquement

❌ Calculs, validations, logique interdites

🧱 Composants React

< 200 lignes maximum

Toute logique extraite :

interaction → hooks

calculs → services

rendu canvas → renderers

📦 Imports

Uniquement via index.ts

import { snapToGrid } from '@/core/services'
import { GRID_SIZE } from '@/core/constants'


❌ Import direct de fichiers interdit

📐 Grille & Snap

GRID_SIZE = 40

1 unité = 0.5 m

Snap obligatoire

snapToGrid(point, GRID_SIZE)
smartSnap(point, floor)

✅ Validation Géométrique

Contact autorisé

Chevauchement interdit

Toute validation passe par :

validateRoomGeometry(room, context)

🚫 Anti-Patterns INTERDITS

Duplication de code

Constantes en dur

Calculs dans composants/hooks/renderers

Imports directs

Types définis hors core/entities

🧠 Checklist AVANT d’écrire du code

Existe dans core/entities ?

Existe dans core/constants ?

Existe dans core/services ?

Existe dans features/*/utils ?

Existe dans features/*/hooks ?

➡️ Sinon : créer au bon endroit

🧾 Nommage

Composants : PascalCase.tsx

Hooks : useCamelCase.ts

Services : camelCase.service.ts

Renderers : kebab-case.renderer.ts

Constantes : kebab-case.constants.ts

Types : kebab-case.types.ts

⚡ Résumé Ultra-Court

DRY absolu

core = vérité unique

UI ≠ logique ≠ rendu

Imports centralisés

Aucune exception


ne crée pas de fichier readme inutile. Reste ultra comapct et optimsier et essaye de corriger ou implemen,ter du code deja existant plutot qu de contourner le porbleme en recreant une solution similaire.---
description: Règles et bonnes pratiques pour le code du projet.
applyTo: **
