# Migrations Base de Données

## Structure

Chaque migration est un fichier SQL numéroté séquentiellement :
- `001_description.sql`
- `002_description.sql`
- etc.

## Exécution

### En développement local
```bash
# Exécuter une migration spécifique
docker exec -i museum-database psql -U postgres -d museum_db < database/migrations/001_remove_is_required.sql
```

### En production (VPS)
```bash
# Se connecter au VPS puis exécuter
docker exec -i museum-database psql -U postgres -d museum_db < /path/to/migrations/001_xxx.sql
```

### Script automatisé
```bash
# Exécuter toutes les migrations non appliquées
./scripts/run-migrations.sh
```

## Historique

| Version | Date       | Description                           |
|---------|------------|---------------------------------------|
| 001     | 2026-02-04 | Ajouter la table museum_entrances     |
| 002     | 2026-02-04 | Supprimer is_required de criteria_types |
| 003     | 2026-02-04 | Créer le plan par défaut              |
| 004     | 2026-02-04 | Simplifier DB + index performances    |
| 005     | 2026-02-04 | Ajouter updated_at aux entrances      |
| 006     | 2026-02-04 | Jobs génération async + métriques temps |

## Bonnes pratiques

1. **Toujours tester** la migration en local avant production
2. **Sauvegarder** la base avant d'appliquer en production
3. **Migrations irréversibles** : ajouter un fichier `001_rollback.sql` si possible
4. **Ordre** : les migrations doivent être appliquées dans l'ordre numérique
