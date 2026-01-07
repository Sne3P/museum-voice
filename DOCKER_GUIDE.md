# 🐳 Docker - Guide de Déploiement

## Architecture Simplifiée

Deux fichiers Docker Compose autonomes:
- `docker-compose.dev.yml` - Développement
- `docker-compose.prod.yml` - Production

## 📦 Services

| Service | Dev Port | Prod Port | Description |
|---------|----------|-----------|-------------|
| PostgreSQL | 5432 | 5432 | Base de données |
| Adminer | 8080 | 8080 | Interface DB (login: database/museum_admin/Museum@2026!Secure) |
| Ollama | 11434 | 11434 | LLM local (Mistral) |
| Backend Flask | 5000 | 5000 | API Python + RAG |
| Next.js App | 3000 | 3000 | Éditeur/Dashboard |
| React Client | 8081 | 8081 | Frontend visiteur |

## 🚀 Commandes Rapides

### Développement

```bash
# Démarrer tous les services en dev
pnpm docker:dev

# Démarrer avec rebuild complet
pnpm docker:dev:build

# Voir les logs en temps réel
pnpm docker:dev:logs

# Arrêter tous les services dev
pnpm docker:dev:down

# Voir l'état des conteneurs
pnpm docker:ps
```

### Production

```bash
# Démarrer en production
pnpm docker:prod

# Démarrer avec rebuild
pnpm docker:prod:build

# Voir les logs
pnpm docker:prod:logs

# Arrêter
pnpm docker:prod:down
```

### Maintenance

```bash
# Nettoyer tous les volumes et conteneurs
pnpm docker:clean

# Rebuild rapide après modification du code
pnpm docker:dev:down
pnpm docker:dev:build
```

## 🔄 Workflow de Développement

### Modifications du Code Source

Pour appliquer les modifications:

1. **Arrêter les conteneurs**:
   ```bash
   pnpm docker:dev:down
   ```

2. **Rebuild et redémarrer** (rapide grâce au cache Docker):
   ```bash
   pnpm docker:dev:build
   ```

3. **Vérifier les services**:
   ```bash
   pnpm docker:ps
   ```

### Accès aux Services

- **App Next.js**: http://localhost:3000
- **React Client**: http://localhost:8081
- **Backend API**: http://localhost:5000
- **Adminer (DB UI)**: http://localhost:8080
- **Ollama API**: http://localhost:11434

### Base de Données

**Seeding Automatique** au premier lancement:
- 3 types de critères (age, thematique, style_texte)
- 10 critères pré-configurés

**Accès via Adminer** (http://localhost:8080):
- Serveur: `database`
- Utilisateur: `museum_admin`
- Mot de passe: `Museum@2026!Secure`
- Base: `museumvoice`

## 🔍 Debugging

### Voir les logs d'un service spécifique

```bash
# Backend
docker logs museum-backend-dev -f

# Next.js App
docker logs museum-app-dev -f

# PostgreSQL
docker logs museum-db-dev -f

# Ollama
docker logs museum-ollama-dev -f
```

### Vérifier la santé des conteneurs

```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### Accéder au shell d'un conteneur

```bash
# PostgreSQL
docker exec -it museum-db-dev psql -U museum_admin -d museumvoice

# Backend Python
docker exec -it museum-backend-dev bash

# Next.js
docker exec -it museum-app-dev sh
```

## ⚡ Optimisations

### Rebuild Rapide

Le système utilise le cache Docker multi-stage:
- Les dépendances sont cachées si `package.json` ne change pas
- Seul le code source est recopié à chaque rebuild
- Temps de rebuild: ~10-30 secondes (vs 2-5 minutes initial)

### Volumes Persistants

Les données persistent entre les redémarrages:
- Base de données PostgreSQL
- Uploads PDF/Audio
- Modèles Ollama

Pour reset complètement:
```bash
pnpm docker:clean
```

## 🎯 Best Practices

1. **Développement**: Utilisez `pnpm docker:dev` pour un environnement complet
2. **Modifications**: `pnpm docker:dev:down` puis `pnpm docker:dev:build` (rapide)
3. **Logs**: `pnpm docker:dev:logs` pour suivre l'activité
4. **DB Reset**: `pnpm docker:clean` puis `pnpm docker:dev:build`
5. **Production**: Toujours tester avec `pnpm docker:prod` avant déploiement

## 🐛 Problèmes Courants

### Port déjà utilisé

Si un port est occupé:
```bash
# Arrêter tous les conteneurs
pnpm docker:dev:down

# Vérifier qu'aucun conteneur ne tourne
docker ps -a

# Redémarrer
pnpm docker:dev
```

### Ollama ne démarre pas

Ollama prend ~2 minutes au premier démarrage (téléchargement de Mistral).
Les autres services attendent qu'il soit prêt.

### Base de données vide

Supprimer les volumes et recréer:
```bash
pnpm docker:clean
pnpm docker:dev:build
```

### Erreur de build

Nettoyer le cache Docker:
```bash
docker system prune -f
pnpm docker:dev:build
```

## 📊 Monitoring

### Ressources Système

```bash
# Utilisation CPU/Mémoire
docker stats

# Espace disque
docker system df
```

### Limites de Mémoire

- **Dev**: Ollama 12GB, Backend 4GB, App 2GB
- **Prod**: Ollama 16GB, Backend 4GB, App 2GB

Total recommandé: 16GB+ RAM
