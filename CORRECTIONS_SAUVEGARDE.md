# CORRECTIONS APPLIQUÉES AU SYSTÈME DE SAUVEGARDE

## ✅ Modifications Effectuées

### 1. Noms Lisibles pour Tous les Éléments

**Avant:**
- Salles: `Salle f1468ef1-ae5f-4bdb-ba88-49c17e97c40f`
- Portes: `Porte 7ba38c14-11b1-4ca1-b890-a9047ab8473b`
- Murs: `Mur a3f5e8c2-...`
- Escaliers: `Escalier uuid-long...`

**Après:**
- Salles: `Salle 1`, `Salle 2`, `Salle 3`...
- Portes: `Porte 1`, `Porte 2`, `Porte 3`...
- Murs: `Mur 1`, `Mur 2`, `Mur 3`...
- Escaliers: `Escalier 1`, `Escalier 2`...
- Ascenseurs: `Ascenseur 1`, `Ascenseur 2`...

### 2. Création Automatique des Relations

**Nouvelle fonctionnalité:**
- Chaque porte crée automatiquement 2 relations bidirectionnelles
- Exemple: Porte entre Salle 1 et Salle 2
  - Relation 1: Salle 1 → Salle 2 (type: DOOR)
  - Relation 2: Salle 2 → Salle 1 (type: DOOR)

**Code ajouté dans `database.service.ts`:**
```typescript
// CRÉER LES RELATIONS ENTRE LES SALLES VIA LA PORTE
const roomAEntityId = door.room_a ? roomIdToEntityId.get(door.room_a) : null
const roomBEntityId = door.room_b ? roomIdToEntityId.get(door.room_b) : null

if (roomAEntityId && roomBEntityId) {
  // Relation bidirectionnelle: Room A → Room B
  relations.push({
    relation_id: relationIdCounter++,
    source_id: roomAEntityId,
    cible_id: roomBEntityId,
    type_relation: 'DOOR'
  })
  
  // Relation bidirectionnelle: Room B → Room A
  relations.push({
    relation_id: relationIdCounter++,
    source_id: roomBEntityId,
    cible_id: roomAEntityId,
    type_relation: 'DOOR'
  })
}
```

### 3. Mapping Room UUID → Entity ID

**Fonctionnement:**
- Les rooms dans l'éditeur ont des UUID (ex: `f1468ef1-ae5f-4bdb-ba88-49c17e97c40f`)
- À la sauvegarde, on crée un mapping: `roomIdToEntityId`
- Les artworks utilisent ce mapping pour obtenir le bon `entity_id`
- Les portes utilisent ce mapping pour créer les relations

**Code:**
```typescript
const roomIdToEntityId: Map<string, number> = new Map()

// Lors de la création des salles
roomIdToEntityId.set(room.id, entityId)

// Lors de la création des artworks
const roomEntityId = artwork.roomId ? roomIdToEntityId.get(artwork.roomId) : null
oeuvres.push({
  ...
  room: roomEntityId || null
})
```

## 📋 Actions Requises

### Étape 1: Recharger le Frontend
Le code a été modifié, il faut recharger Next.js:
```bash
# Dans le terminal où tourne Next.js
Ctrl+C
pnpm dev
```

### Étape 2: Tester la Sauvegarde
1. Ouvrir l'éditeur: http://localhost:3000/editor
2. Cliquer sur "Load from DB" pour charger le plan actuel
3. Vérifier que tout s'affiche correctement
4. Cliquer sur "Save to DB" pour sauvegarder avec les nouvelles corrections

### Étape 3: Vérifier la Base de Données
Exécuter le script de vérification:
```powershell
Get-Content "backend\verify_database_state.sql" | docker exec -i museum-db psql -U museum_admin -d museumvoice
```

**Vérifications attendues:**
- ✅ Toutes les salles ont des noms: `Salle 1`, `Salle 2`, etc.
- ✅ Toutes les portes ont des noms: `Porte 1`, `Porte 2`, etc.
- ✅ La table `relations` contient des relations de type `DOOR`
- ✅ Toutes les œuvres ont un `room_id` valide
- ✅ Les positions (x, y) sont correctes

## 🔧 Fichiers Modifiés

1. **core/services/database.service.ts**
   - Ajout de compteurs pour noms lisibles
   - Ajout de la création des relations
   - Amélioration du mapping roomId → entity_id

2. **backend/verify_database_state.sql** (nouveau)
   - Script de vérification post-sauvegarde
   - Affiche toutes les entités et relations

3. **backend/fix_artwork_rooms.sql** (existant)
   - Migration pour corriger les rooms existantes
   - À ré-exécuter si besoin

## ⚠️ Points d'Attention

### Suppression en Cascade
Le code actuel fait un TRUNCATE qui supprime tout:
```sql
TRUNCATE TABLE points, relations, entities, plans, oeuvres, chunk CASCADE
```

**Conséquences:**
- ❌ Les narrations (pregenerations) sont effacées (via CASCADE)
- ❌ Toutes les données sont recréées from scratch

**Solution à implémenter:**
- Faire un UPDATE au lieu de TRUNCATE
- Comparer l'état existant avec le nouvel état
- Supprimer seulement ce qui n'existe plus
- Mettre à jour ce qui a changé
- Ajouter seulement les nouveaux éléments

### Préservation des Narrations
Actuellement, les narrations sont perdues à chaque sauvegarde.

**Solutions:**
1. Modifier le TRUNCATE pour exclure `pregenerations`
2. Ou ré-exécuter le seed après chaque sauvegarde
3. Ou implémenter une vraie logique de UPDATE/INSERT/DELETE

## 🎯 Prochaines Améliorations

1. **Pathfinding avec Portes**
   - Utiliser les relations DOOR pour calculer le chemin réel
   - Ne pas juste calculer la distance euclidienne
   - Prendre en compte les portes et escaliers

2. **Sauvegarde Incrémentale**
   - Ne pas tout supprimer à chaque sauvegarde
   - Comparer et mettre à jour seulement ce qui change
   - Préserver les narrations générées

3. **Validation**
   - Vérifier que toutes les portes ont 2 salles connectées
   - Vérifier que toutes les œuvres sont dans des salles
   - Alerter si des éléments sont invalides

## 📊 État Actuel de la DB

**Avant les corrections:**
- Salles: 3 (avec noms UUID)
- Portes: 2 (avec noms UUID)
- Relations: 0 ❌
- Œuvres: 4 (avec rooms corrects manuellement)
- Narrations: 144 ✅

**Après sauvegarde avec corrections:**
- Salles: Noms lisibles ✅
- Portes: Noms lisibles ✅
- Relations: Créées automatiquement ✅
- Œuvres: Rooms automatiques ✅
- Narrations: À re-seeder ⚠️
