# 📚 Documentation Museum Voice

Bienvenue dans la documentation complète du projet **Museum Voice** - un système complet d'audioguide muséal avec éditeur visuel.

## 📖 Table des matières

### 1. Architecture & Structure
- [Architecture Globale](./01-ARCHITECTURE.md) - Vue d'ensemble du système
- [Structure du Projet](./02-STRUCTURE-PROJET.md) - Organisation des fichiers et dossiers

### 2. Configuration & Déploiement  
- [Configuration Environnement](./03-CONFIGURATION.md) - Variables d'environnement et paramètres
- [Guide de Déploiement](./04-DEPLOIEMENT.md) - Instructions pour dev/prod
- [Docker & Conteneurs](./05-DOCKER.md) - Configuration Docker détaillée

### 3. Fonctionnalités
- [Éditeur Visuel](./06-EDITEUR-VISUEL.md) - Guide de l'éditeur de plans
- [Gestion des Parcours](./07-PARCOURS.md) - Création et gestion des parcours
- [Génération Audio](./08-AUDIO-NARRATIONS.md) - Système de narrations IA + TTS
- [Système de Points d'Entrée](./09-POINTS-ENTREE.md) - Gestion des entrées du musée

### 4. API & Backend
- [API Reference](./10-API-REFERENCE.md) - Documentation des endpoints
- [Base de Données](./11-BASE-DE-DONNEES.md) - Schéma PostgreSQL

### 5. Frontend
- [Admin Frontend (Next.js)](./12-FRONTEND-ADMIN.md) - Interface d'administration
- [Client Frontend (React)](./13-FRONTEND-CLIENT.md) - Application visiteur

### 6. Développement
- [Guide de Développement](./14-GUIDE-DEVELOPPEMENT.md) - Bonnes pratiques et conventions
- [Dépannage](./15-DEPANNAGE.md) - Résolution de problèmes courants

---

## 🚀 Démarrage Rapide

### Prérequis
- Node.js 18+ / pnpm
- Python 3.10+
- Docker & Docker Compose
- PostgreSQL 15+

### Lancement en développement

```bash
# 1. Cloner le projet
git clone <repository-url>
cd v0-visual-museum-editor

# 2. Installer les dépendances frontend
pnpm install

# 3. Lancer via Docker Compose (recommandé)
docker compose -f docker-compose.dev.yml up -d

# 4. Accéder aux interfaces
# Admin : http://localhost:3000
# Backend API : http://localhost:5000
# Client visiteur : http://localhost:8080
```

### Lancement en production

```bash
# 1. Copier et configurer .env.prod
cp .env.prod.example .env.prod
# Modifier VPS_PUBLIC_IP et autres variables

# 2. Lancer la stack de production
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

---

## 🏗️ Architecture Résumée

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND ADMIN                           │
│                    (Next.js - Port 3000)                         │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐     │
│   │   Éditeur   │  │ Dashboard   │  │  Générateur QR      │     │
│   │   Visuel    │  │   Admin     │  │     Codes           │     │
│   └─────────────┘  └─────────────┘  └─────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND FLASK                               │
│                     (Python - Port 5000)                         │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐     │
│   │  API REST   │  │  Génération │  │   Uploads /         │     │
│   │  Parcours   │  │  LLM+TTS    │  │   Fichiers          │     │
│   └─────────────┘  └─────────────┘  └─────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        PostgreSQL                                │
│                      (Port 5432)                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND CLIENT                             │
│                    (React - Port 8080)                           │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐     │
│   │  Audioguide │  │   Carte     │  │   Lecteur Audio     │     │
│   │   Mobile    │  │ Interactive │  │                     │     │
│   └─────────────┘  └─────────────┘  └─────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📞 Ports par défaut

| Service | Développement | Production |
|---------|---------------|------------|
| Admin Next.js | 3000 | 3000 |
| Backend Flask | 5000 | 5000 |
| Client React | 8080 | 8080 |
| PostgreSQL | 5432 | 5432 |
| Ollama LLM | 11434 | 11434 |
| Piper TTS | 5002 | 5002 |

---

## 📝 Licence

Ce projet est propriétaire. Tous droits réservés.
