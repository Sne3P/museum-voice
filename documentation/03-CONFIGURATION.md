# ⚙️ Configuration Environnement

## Variables d'Environnement

### Vue d'Ensemble

Le projet utilise des variables d'environnement pour configurer les URLs, connexions base de données, et paramètres de déploiement.

### Fichiers de Configuration

| Fichier | Usage | Gitignore |
|---------|-------|-----------|
| `.env.local` | Développement local | ✅ Oui |
| `.env.prod` | Production | ✅ Oui |
| `.env.prod.example` | Template production | ❌ Non |

---

## Configuration Production

### Variable Principale : VPS_PUBLIC_IP

```bash
# ⚡ IP DU VPS - MODIFIER ICI POUR CHANGER DE SERVEUR
# Toutes les URLs seront générées automatiquement à partir de cette IP
VPS_PUBLIC_IP=51.38.188.211
```

Cette variable centrale permet de configurer automatiquement toutes les URLs du système.

### Fichier .env.prod complet

```bash
# ============================================
# VARIABLES D'ENVIRONNEMENT - PRODUCTION
# ============================================
# Copier ce fichier en .env.prod et adapter les valeurs
# Usage: docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# ==========================================
# ⚡ IP DU VPS - MODIFIER ICI POUR CHANGER DE SERVEUR
# ==========================================
VPS_PUBLIC_IP=51.38.188.211

# ==========================================
# DATABASE
# ==========================================
DB_PASSWORD=Museum@2026!Secure

# ==========================================
# PUBLIC URLs (optionnel - générées automatiquement)
# ==========================================
# Décommentez uniquement si vous utilisez un nom de domaine

# Backend Flask (uploads : images, PDFs, audio)
# NEXT_PUBLIC_BACKEND_URL=https://api.votre-domaine.com

# Frontend Next.js (admin/editor)
# NEXT_PUBLIC_API_URL=https://admin.votre-domaine.com

# Client React
# REACT_APP_BACKEND_URL=https://api.votre-domaine.com
# REACT_APP_ADMIN_URL=https://admin.votre-domaine.com
```

---

## Variables par Service

### Next.js (Admin Frontend)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `NEXT_PUBLIC_BACKEND_URL` | URL backend Flask | `http://51.38.188.211:5000` |
| `NEXT_PUBLIC_API_URL` | URL API admin | `http://51.38.188.211:3000` |
| `DATABASE_URL` | Connexion PostgreSQL | `postgresql://...` |

**Important** : Les variables préfixées `NEXT_PUBLIC_` sont exposées côté client.

### Flask (Backend)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DATABASE_URL` | Connexion PostgreSQL | `postgresql://museum:pwd@postgres:5432/museum_db` |
| `UPLOAD_FOLDER` | Dossier uploads | `/app/uploads` |
| `OLLAMA_HOST` | URL Ollama | `http://ollama:11434` |
| `PIPER_HOST` | URL Piper TTS | `http://piper-tts:5002` |
| `FLASK_ENV` | Environnement | `production` |

### Client React

| Variable | Description | Exemple |
|----------|-------------|---------|
| `REACT_APP_BACKEND_URL` | URL backend Flask | `http://51.38.188.211:5000` |
| `REACT_APP_ADMIN_URL` | URL admin Next.js | `http://51.38.188.211:3000` |

**Note** : En React (Create React App/Vite), les variables doivent être préfixées `REACT_APP_`.

### PostgreSQL

| Variable | Description | Exemple |
|----------|-------------|---------|
| `POSTGRES_USER` | Utilisateur | `museum` |
| `POSTGRES_PASSWORD` | Mot de passe | `${DB_PASSWORD}` |
| `POSTGRES_DB` | Nom base | `museum_db` |

---

## Configuration Docker Compose

### Production (docker-compose.prod.yml)

```yaml
# ============================================
# DOCKER COMPOSE - PRODUCTION
# ============================================
# 
# CONFIGURATION VPS:
# 1. Modifier VPS_PUBLIC_IP dans .env.prod avec l'IP de votre serveur
# 2. Lancer: docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
#
# PORTS EXPOSÉS:
# - 3000: Admin Next.js
# - 5000: Backend Flask  
# - 8080: Client React
# ============================================

services:
  app:
    environment:
      - NEXT_PUBLIC_BACKEND_URL=http://${VPS_PUBLIC_IP:-51.38.188.211}:5000
      - NEXT_PUBLIC_API_URL=http://${VPS_PUBLIC_IP:-51.38.188.211}:3000

  backend:
    environment:
      - FLASK_ENV=production
      - DATABASE_URL=postgresql://museum:${DB_PASSWORD}@postgres:5432/museum_db

  client-frontend:
    environment:
      - REACT_APP_BACKEND_URL=http://${VPS_PUBLIC_IP:-51.38.188.211}:5000
      - REACT_APP_ADMIN_URL=http://${VPS_PUBLIC_IP:-51.38.188.211}:3000
```

### Développement (docker-compose.dev.yml)

```yaml
services:
  app:
    environment:
      - NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
      - NEXT_PUBLIC_API_URL=http://localhost:3000

  backend:
    environment:
      - FLASK_ENV=development
      - DATABASE_URL=postgresql://museum:museum@postgres:5432/museum_db
```

---

## Configuration par Environnement

### Développement Local

```bash
# Sans Docker (pnpm dev)
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_API_URL=http://localhost:3000
DATABASE_URL=postgresql://museum:museum@localhost:5432/museum_db
```

### Développement Docker

```bash
# Avec docker-compose.dev.yml
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
DATABASE_URL=postgresql://museum:museum@postgres:5432/museum_db
```

### Production

```bash
# Avec docker-compose.prod.yml + .env.prod
VPS_PUBLIC_IP=51.38.188.211
DB_PASSWORD=Museum@2026!Secure

# URLs générées automatiquement:
# NEXT_PUBLIC_BACKEND_URL=http://51.38.188.211:5000
# NEXT_PUBLIC_API_URL=http://51.38.188.211:3000
```

---

## URLs et Ports

### Tableau récapitulatif

| Service | Port Dev | Port Prod | URL Interne Docker | URL Externe |
|---------|----------|-----------|-------------------|-------------|
| Admin Next.js | 3000 | 3000 | `http://app:3000` | `http://<VPS>:3000` |
| Backend Flask | 5000 | 5000 | `http://backend:5000` | `http://<VPS>:5000` |
| Client React | 8080 | 8080 | `http://client-frontend:80` | `http://<VPS>:8080` |
| PostgreSQL | 5432 | 5432 | `postgres:5432` | - |
| Ollama | 11434 | 11434 | `http://ollama:11434` | - |
| Piper TTS | 5002 | 5002 | `http://piper-tts:5002` | - |

### Fonction getUploadUrl()

Pour générer des URLs correctes vers les fichiers uploadés :

```typescript
// lib/uploads.ts
export function getUploadUrl(path: string): string {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
  
  if (!path) return '';
  
  // Si déjà une URL complète, la retourner
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Sinon, préfixer avec l'URL du backend
  return path.startsWith('/') 
    ? `${backendUrl}${path}` 
    : `${backendUrl}/${path}`;
}

// Usage
const imageUrl = getUploadUrl('/uploads/images/oeuvre.jpg');
// → "http://51.38.188.211:5000/uploads/images/oeuvre.jpg"
```

---

## Changer de Serveur VPS

### Étapes simples

1. **Éditer `.env.prod`**
   ```bash
   VPS_PUBLIC_IP=NOUVELLE_IP_ICI
   ```

2. **Redéployer**
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
   ```

3. **Vérifier**
   - Admin : `http://NOUVELLE_IP:3000`
   - Backend : `http://NOUVELLE_IP:5000`
   - Client : `http://NOUVELLE_IP:8080`

### Avec un nom de domaine

Si vous utilisez un nom de domaine (avec reverse proxy Nginx/Traefik) :

```bash
# .env.prod
VPS_PUBLIC_IP=51.38.188.211

# Décommenter et configurer :
NEXT_PUBLIC_BACKEND_URL=https://api.mon-musee.com
NEXT_PUBLIC_API_URL=https://admin.mon-musee.com
REACT_APP_BACKEND_URL=https://api.mon-musee.com
REACT_APP_ADMIN_URL=https://admin.mon-musee.com
```

---

## Vérification Configuration

### Commandes de diagnostic

```bash
# Vérifier les variables dans un conteneur
docker compose -f docker-compose.prod.yml exec app printenv | grep NEXT_PUBLIC
docker compose -f docker-compose.prod.yml exec backend printenv | grep DATABASE

# Tester la connectivité
curl http://<VPS_IP>:5000/api/health
curl http://<VPS_IP>:3000/api/health
```

### Logs en cas de problème

```bash
# Logs de tous les services
docker compose -f docker-compose.prod.yml logs -f

# Logs d'un service spécifique
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f app
```
