# 🎨 Correctif Visuel - Fond Blanc Grid

## Problème corrigé

Quand un sélecteur de critères (CriteriaSelector, ArtMovementSelector, Interest) avait un nombre d'éléments qui ne remplissait pas complètement la dernière ligne du grid (par exemple 4 éléments sur une grille de 3 colonnes), les cases vides restaient **noires** au lieu de **blanches**.

### Avant
```
┌─────────┬─────────┬─────────┐
│ Enfant  │  Ado    │ Adulte  │  ← Ligne complète
├─────────┼─────────┼─────────┤
│ Senior  │ ■■■■■■■ │ ■■■■■■■ │  ← Cases vides NOIRES (problème)
└─────────┴─────────┴─────────┘
```

### Après
```
┌─────────┬─────────┬─────────┐
│ Enfant  │  Ado    │ Adulte  │  ← Ligne complète
├─────────┼─────────┼─────────┤
│ Senior  │         │         │  ← Cases vides BLANCHES ✅
└─────────┴─────────┴─────────┘
```

---

## Solution appliquée

**Changement CSS simple :** `background-color: #000` → `background-color: #fff`

### Fichiers modifiés

1. **[museum-voice/src/components/criteria_selector/CriteriaSelector.css](museum-voice/src/components/criteria_selector/CriteriaSelector.css)**
   ```css
   .criteria-selector-grid {
     display: grid;
     grid-template-columns: repeat(3, 1fr);
     gap: 0;
     background-color: #fff; /* ← Changé de #000 */
   }
   ```

2. **[museum-voice/src/components/art_movement_selector/ArtMovementSelector.css](museum-voice/src/components/art_movement_selector/ArtMovementSelector.css)**
   ```css
   .movement-selector-grid {
     display: grid;
     grid-template-columns: repeat(3, 1fr);
     gap: 0;
     background-color: #fff; /* ← Changé de #000 */
   }
   ```

3. **[museum-voice/src/components/interest/Interest.css](museum-voice/src/components/interest/Interest.css)**
   ```css
   .movement-selector-grid {
     display: grid;
     grid-template-columns: repeat(3, 1fr);
     gap: 0;
     background-color: #fff; /* ← Changé de #000 */
   }
   ```

---

## Pourquoi ça marchait pas ?

La grille utilisait un fond noir (`background-color: #000`) pour simuler les séparations entre les tuiles. Mais quand il y avait des **cases vides**, ce fond noir devenait visible, créant un décalage visuel avec le reste de la page qui est blanche.

**Les bordures noires (`border: 1px solid #000`) sur chaque tuile sont suffisantes** pour créer les séparations. Pas besoin d'un fond noir sur le grid lui-même.

---

## Rebuild nécessaire

⚠️ **Le client React est buildé statiquement** (Nginx sert des fichiers HTML/CSS précompilés)

**Pour appliquer les changements CSS :**
```powershell
# Rebuild seulement le client (30-60 secondes)
docker-compose -f docker-compose.dev.yml up -d --build client

# OU via pnpm
pnpm docker:dev:build
```

**Pas de hot-reload** car :
- Le client utilise `npm run build` (production build)
- Nginx sert les fichiers statiques depuis `/usr/share/nginx/html`
- Aucun volume monté pour le code source (comme demandé pour éviter les problèmes de sync)

---

## Vérification visuelle

1. Ouvrir le client : http://localhost:8080
2. Naviguer vers "Mes Choix" (sélection de critères)
3. Vérifier que les sélecteurs de critères ont un fond **blanc uniforme**
4. Exemple avec 4 options sur grille de 3 colonnes :
   - Ligne 1 : 3 tuiles
   - Ligne 2 : 1 tuile + **2 cases blanches** (plus de noir)

---

## Style unifié

Tous les composants de sélection utilisent maintenant **exactement le même style** :

### Header
- Fond : Bleu marine `#001f3f`
- Texte : Blanc
- Bordure : Noire 1px

### Grid
- 3 colonnes égales
- Pas de gap entre les tuiles
- **Fond blanc** pour les cases vides
- Bordures noires entre les tuiles

### Tuiles
- Ratio 1:1 (carrées)
- Image en fond
- Bandeau de titre en bas (bleu marine)
- Sélection = bandeau bleu clair `#5dace2`

---

## Composants affectés

✅ **CriteriaSelector** (dynamique depuis API)  
✅ **ArtMovementSelector** (mouvements artistiques)  
✅ **Interest** (centres d'intérêt)

**Même visuel**, même comportement, même expérience utilisateur ! 🎨
