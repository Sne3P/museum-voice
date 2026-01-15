# 🐳 Docker & Conteneurs

## Vue d'ensemble

Le projet utilise Docker Compose pour orchestrer 6 services :

| Service | Image | Port | Description |
|---------|-------|------|-------------|
| `app` | Next.js custom | 3000 | Admin frontend |
| `backend` | Flask custom | 5000 | API backend |
| `client-frontend` | React custom | 8080 | Client visiteur |
| `postgres` | postgres:15-alpine | 5432 | Base de données |
| `ollama` | ollama/ollama | 11434 | LLM (Mistral) |
| `piper-tts` | rhasspy/piper | 5002 | Text-to-Speech |

---

## Fichiers Docker Compose

### Fichiers disponibles

| Fichier | Usage |
|---------|-------|
| `docker-compose.yml` | Configuration de base |
| `docker-compose.dev.yml` | Développement (volumes hot-reload) |
| `docker-compose.prod.yml` | Production (optimisé) |

### Lancement

```bash
# Développement
docker compose -f docker-compose.dev.yml up -d

# Production
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

---

## Services Détaillés

### 1. App (Next.js Admin)

```yaml
app:
  build:
    context: .
    dockerfile: Dockerfile
  ports:
    - "3000:3000"
  environment:
    - NEXT_PUBLIC_BACKEND_URL=http://${VPS_PUBLIC_IP:-51.38.188.211}:5000
    - NEXT_PUBLIC_API_URL=http://${VPS_PUBLIC_IP:-51.38.188.211}:3000
    - DATABASE_URL=postgresql://museum:${DB_PASSWORD}@postgres:5432/museum_db
  volumes:
    - uploads_data_prod:/app/public/uploads:ro
  depends_on:
    postgres:
      condition: service_healthy
```

**Dockerfile** (racine du projet) :

```dockerfile
FROM node:18-alpine AS base

# Dépendances
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

### 2. Backend (Flask)

```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile
  ports:
    - "5000:5000"
  environment:
    - FLASK_ENV=production
    - DATABASE_URL=postgresql://museum:${DB_PASSWORD}@postgres:5432/museum_db
    - OLLAMA_HOST=http://ollama:11434
    - PIPER_HOST=http://piper-tts:5002
  volumes:
    - uploads_data_prod:/app/uploads
  depends_on:
    - postgres
    - ollama
    - piper-tts
```

**Dockerfile** (backend/) :

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Dépendances système
RUN apt-get update && apt-get install -y \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

# Dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Code applicatif
COPY . .

EXPOSE 5000

CMD ["python", "rag/main_postgres.py"]
```

### 3. Client Frontend (React)

```yaml
client-frontend:
  build:
    context: ./client-frontend
    dockerfile: Dockerfile
    args:
      - REACT_APP_BACKEND_URL=http://${VPS_PUBLIC_IP:-51.38.188.211}:5000
      - REACT_APP_ADMIN_URL=http://${VPS_PUBLIC_IP:-51.38.188.211}:3000
  ports:
    - "8080:80"
```

**Dockerfile** (client-frontend/) :

```dockerfile
# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

ARG REACT_APP_BACKEND_URL
ARG REACT_APP_ADMIN_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
ENV REACT_APP_ADMIN_URL=$REACT_APP_ADMIN_URL

RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 4. PostgreSQL

```yaml
postgres:
  image: postgres:15-alpine
  environment:
    - POSTGRES_USER=museum
    - POSTGRES_PASSWORD=${DB_PASSWORD:-museum}
    - POSTGRES_DB=museum_db
  volumes:
    - postgres_data_prod:/var/lib/postgresql/data
    - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U museum -d museum_db"]
    interval: 10s
    timeout: 5s
    retries: 5
```

### 5. Ollama (LLM)

```yaml
ollama:
  image: ollama/ollama:latest
  volumes:
    - ollama_data:/root/.ollama
  environment:
    - OLLAMA_KEEP_ALIVE=24h
  # GPU support (optionnel)
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: all
            capabilities: [gpu]
```

### 6. Piper TTS

```yaml
piper-tts:
  image: rhasspy/piper
  volumes:
    - piper_data:/data
  command: --data-dir /data --download-dir /data
```

---

## Volumes

### Volumes persistants

```yaml
volumes:
  postgres_data_prod:
    name: museum-voice_postgres_data_prod
  uploads_data_prod:
    name: museum-voice_uploads_data_prod
  ollama_data:
    name: museum-voice_ollama_data
  piper_data:
    name: museum-voice_piper_data
```

### Localisation des volumes

```bash
# Trouver l'emplacement d'un volume
docker volume inspect museum-voice_uploads_data_prod

# Typiquement :
# /var/lib/docker/volumes/museum-voice_uploads_data_prod/_data
```

### Partage du volume uploads

Le volume `uploads_data_prod` est partagé entre :
- **Backend** : `/app/uploads` (lecture/écriture)
- **App** : `/app/public/uploads` (lecture seule)

```
uploads_data_prod/
├── images/         # Images des œuvres
├── pdfs/           # PDFs des œuvres
├── audio/          # Fichiers audio narrations
└── qrcodes/        # QR codes générés
```

---

## Réseau Docker

```yaml
networks:
  museum_network:
    driver: bridge
```

### Communication inter-services

| De | Vers | URL |
|----|------|-----|
| App | Backend | `http://backend:5000` |
| App | PostgreSQL | `postgres:5432` |
| Backend | PostgreSQL | `postgres:5432` |
| Backend | Ollama | `http://ollama:11434` |
| Backend | Piper | `http://piper-tts:5002` |
| Client | Backend | `http://<VPS>:5000` (externe) |

---

## Commandes Docker Utiles

### Gestion des services

```bash
# Démarrer
docker compose -f docker-compose.prod.yml up -d

# Arrêter
docker compose -f docker-compose.prod.yml down

# Redémarrer un service
docker compose -f docker-compose.prod.yml restart backend

# Voir les logs
docker compose -f docker-compose.prod.yml logs -f
docker compose -f docker-compose.prod.yml logs -f backend

# État des services
docker compose -f docker-compose.prod.yml ps
```

### Build et mise à jour

```bash
# Rebuild tous les services
docker compose -f docker-compose.prod.yml build

# Rebuild un service spécifique
docker compose -f docker-compose.prod.yml build backend

# Rebuild et redémarrer
docker compose -f docker-compose.prod.yml up -d --build
```

### Accès aux conteneurs

```bash
# Shell dans un conteneur
docker compose -f docker-compose.prod.yml exec backend bash
docker compose -f docker-compose.prod.yml exec app sh

# Exécuter une commande
docker compose -f docker-compose.prod.yml exec postgres psql -U museum -d museum_db
```

### Nettoyage

```bash
# Supprimer conteneurs arrêtés
docker container prune

# Supprimer images non utilisées
docker image prune

# Supprimer volumes non utilisés (ATTENTION !)
docker volume prune

# Nettoyage complet (DANGER - supprime tout !)
docker system prune -a --volumes
```

---

## Healthchecks

### PostgreSQL

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U museum -d museum_db"]
  interval: 10s
  timeout: 5s
  retries: 5
```

### Backend Flask

```python
@app.route('/api/health')
def health_check():
    try:
        conn = _connect_postgres()
        conn.close()
        return jsonify({'status': 'ok', 'database': 'connected'})
    except:
        return jsonify({'status': 'error', 'database': 'disconnected'}), 500
```

---

## Variables d'environnement Docker

### Syntaxe dans docker-compose

```yaml
environment:
  # Variable fixe
  - FLASK_ENV=production
  
  # Avec valeur par défaut
  - DATABASE_URL=postgresql://museum:${DB_PASSWORD:-museum}@postgres:5432/museum_db
  
  # Variable interpolée
  - NEXT_PUBLIC_BACKEND_URL=http://${VPS_PUBLIC_IP}:5000
```

### Fichier .env

```bash
# .env.prod
VPS_PUBLIC_IP=51.38.188.211
DB_PASSWORD=SecurePassword123
```

### Passage au build (args)

```yaml
build:
  args:
    - REACT_APP_BACKEND_URL=http://${VPS_PUBLIC_IP}:5000
```

---

## Développement avec Docker

### Hot-reload (développement)

```yaml
# docker-compose.dev.yml
app:
  volumes:
    - .:/app
    - /app/node_modules
  command: pnpm dev
```

### Logs en temps réel

```bash
# Tous les services
docker compose -f docker-compose.dev.yml logs -f

# Un service spécifique avec filtrage
docker compose -f docker-compose.dev.yml logs -f backend 2>&1 | grep -i error
```

---

## GPU Support (Ollama)

### Configuration NVIDIA

```yaml
ollama:
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: all
            capabilities: [gpu]
```

### Prérequis serveur

```bash
# Installer nvidia-container-toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```
