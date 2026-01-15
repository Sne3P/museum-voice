# 🏗️ Architecture Globale

## Vue d'ensemble

Museum Voice est une solution complète d'audioguide muséal composée de 4 services principaux interconnectés.

## Diagramme d'Architecture

```
                                    ┌─────────────────────────────────────┐
                                    │           NAVIGATEUR                 │
                                    │    (Administrateur / Visiteur)       │
                                    └──────────────┬──────────────────────┘
                                                   │
                    ┌──────────────────────────────┼──────────────────────────────┐
                    │                              │                              │
                    ▼                              ▼                              ▼
    ┌───────────────────────────┐  ┌───────────────────────────┐  ┌───────────────────────────┐
    │     ADMIN FRONTEND        │  │     CLIENT FRONTEND        │  │     BACKEND API           │
    │        (Next.js)          │  │        (React)             │  │        (Flask)            │
    │                           │  │                            │  │                           │
    │  • Éditeur visuel plans   │  │  • Audioguide mobile       │  │  • API REST               │
    │  • Dashboard œuvres       │  │  • MapViewer interactif    │  │  • Génération narrations  │
    │  • Gestion parcours       │  │  • Lecteur audio           │  │  • Uploads fichiers       │
    │  • Génération QR codes    │  │  • Sélection profil        │  │  • Calcul chemins A*      │
    │  • Tests parcours         │  │                            │  │                           │
    │                           │  │                            │  │                           │
    │  Port: 3000               │  │  Port: 8080                │  │  Port: 5000               │
    └───────────────────────────┘  └───────────────────────────┘  └───────────────────────────┘
                    │                              │                              │
                    └──────────────────────────────┴──────────────────────────────┘
                                                   │
                                                   ▼
                              ┌───────────────────────────────────────────┐
                              │              PostgreSQL                    │
                              │                                            │
                              │  • plans, entities, points                 │
                              │  • oeuvres, parcours, parcours_oeuvres     │
                              │  • narrations, criteres_*                  │
                              │  • path_segments, museum_entrances         │
                              │  • vertical_links, links                   │
                              │                                            │
                              │  Port: 5432                                │
                              └───────────────────────────────────────────┘
                                                   │
                    ┌──────────────────────────────┴──────────────────────────────┐
                    │                                                              │
                    ▼                                                              ▼
    ┌───────────────────────────┐                              ┌───────────────────────────┐
    │       OLLAMA LLM          │                              │       PIPER TTS           │
    │                           │                              │                           │
    │  • Modèle Mistral         │                              │  • Text-to-Speech         │
    │  • Génération textes      │                              │  • Voix française         │
    │  • Contexte RAG           │                              │  • Fichiers WAV           │
    │                           │                              │                           │
    │  Port: 11434              │                              │  Port: 5002               │
    └───────────────────────────┘                              └───────────────────────────┘
```

## Composants Détaillés

### 1. Admin Frontend (Next.js)

**Rôle** : Interface d'administration pour la gestion du musée

**Technologies** :
- Next.js 14+ (App Router)
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui

**Fonctionnalités clés** :
- Éditeur visuel de plans (Canvas 2D)
- Dashboard de gestion des œuvres
- Création/édition de parcours
- Génération de QR codes
- Test de parcours en temps réel
- Authentification admin

**Routes principales** :
```
/                   → Redirection vers /editor
/editor             → Éditeur de plans visuel
/admin/dashboard    → Gestion des œuvres
/admin/qrcode       → Générateur QR codes
/admin/test-parcours → Test des parcours
/parcours           → Gestion des parcours
/login              → Authentification
```

### 2. Client Frontend (React)

**Rôle** : Application mobile pour les visiteurs du musée

**Technologies** :
- React 18
- Vite
- JavaScript (JSX)
- CSS modules

**Fonctionnalités clés** :
- Audioguide avec lecteur audio
- Carte interactive (MapViewer SVG)
- Navigation multi-étages
- Sélection de profil visiteur
- Scan QR code

**Flux visiteur** :
1. Accueil → Scan QR ou sélection parcours
2. Sélection profil (âge, thématique, style)
3. Navigation guidée avec audio
4. Carte interactive synchronisée

### 3. Backend API (Flask)

**Rôle** : Serveur API REST et génération de contenu

**Technologies** :
- Python 3.10+
- Flask
- PostgreSQL (psycopg2)
- Ollama (LLM)
- Piper (TTS)

**Fonctionnalités clés** :
- API REST complète
- Génération narrations IA (Ollama + RAG)
- Conversion Text-to-Speech (Piper)
- Serveur de fichiers statiques (uploads)
- Calcul de chemins A* entre œuvres
- Extraction métadonnées PDF

**Structure API** :
```
/api/museum/floor-plan       → Plan du musée (salles, entrées)
/api/parcours/...           → Gestion des parcours
/api/admin/...              → Fonctions admin
/uploads/...                → Fichiers statiques (images, PDF, audio)
```

### 4. Base de Données (PostgreSQL)

**Rôle** : Persistance de toutes les données

**Tables principales** :

| Catégorie | Tables |
|-----------|--------|
| Plans | `plans`, `entities`, `points` |
| Œuvres | `oeuvres`, `salle`, `artistes` |
| Parcours | `parcours`, `parcours_oeuvres` |
| Narrations | `narrations`, `criteres_age`, `criteres_style`, `criteres_thematique` |
| Navigation | `links`, `vertical_links`, `path_segments` |
| Entrées | `museum_entrances` |

### 5. Services IA

#### Ollama (LLM)
- **Modèle** : Mistral (7B)
- **Usage** : Génération des narrations textuelles
- **Contexte** : RAG avec données œuvres + artistes

#### Piper (TTS)
- **Voix** : Française (fr_FR)
- **Format** : WAV 22050Hz
- **Usage** : Conversion texte narration → audio

## Flux de Données

### Création de contenu (Admin)

```
1. Admin crée/édite œuvre dans dashboard
   ↓
2. Upload image/PDF via backend
   ↓
3. Sauvegarde en base PostgreSQL
   ↓
4. Génération narration via Ollama
   ↓
5. Conversion audio via Piper
   ↓
6. Stockage fichier audio
```

### Consultation (Visiteur)

```
1. Visiteur scanne QR code
   ↓
2. Client React charge parcours
   ↓
3. Backend calcule chemin optimisé
   ↓
4. MapViewer affiche carte
   ↓
5. Lecture audio narration
   ↓
6. Navigation vers œuvre suivante
```

## Communication Inter-Services

### URLs et Ports

| Service | URL Interne (Docker) | URL Externe |
|---------|---------------------|-------------|
| Admin Next.js | `http://app:3000` | `http://<VPS_IP>:3000` |
| Backend Flask | `http://backend:5000` | `http://<VPS_IP>:5000` |
| Client React | `http://client-frontend:80` | `http://<VPS_IP>:8080` |
| PostgreSQL | `postgres:5432` | - |
| Ollama | `http://ollama:11434` | - |
| Piper | `http://piper-tts:5002` | - |

### Variables d'environnement clés

```bash
# Backend URL (pour uploads/images/audio)
NEXT_PUBLIC_BACKEND_URL=http://<VPS_IP>:5000

# API Admin (pour client)
REACT_APP_ADMIN_URL=http://<VPS_IP>:3000

# Base de données
DATABASE_URL=postgresql://museum:password@postgres:5432/museum_db
```

## Volumes Docker

| Volume | Contenu | Partagé entre |
|--------|---------|---------------|
| `uploads_data` | Images, PDF, Audio | Backend, App |
| `postgres_data` | Base de données | PostgreSQL |
| `ollama_data` | Modèles LLM | Ollama |
| `piper_data` | Voix TTS | Piper |

## Sécurité

### Authentification
- Login/password pour admin
- Session cookie sécurisée
- Routes protégées `/admin/*`

### CORS
- Configuration CORS sur backend Flask
- Headers appropriés pour requêtes cross-origin

### Réseau Docker
- Réseau `museum_network` isolé
- Seuls ports exposés : 3000, 5000, 8080
