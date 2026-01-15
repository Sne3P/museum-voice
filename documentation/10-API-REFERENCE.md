# 📡 API Reference

## Vue d'ensemble

Le système expose deux APIs :
- **Next.js API** (port 3000) : Routes `/api/*` pour l'admin
- **Flask API** (port 5000) : Routes `/api/*` pour le backend

---

## Base URL

| Environnement | Next.js API | Flask API |
|---------------|-------------|-----------|
| Développement | `http://localhost:3000` | `http://localhost:5000` |
| Production | `http://<VPS>:3000` | `http://<VPS>:5000` |

---

## Next.js API Routes

### Health Check

```
GET /api/health
```

**Réponse** :
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

---

### Éditeur - Chargement

```
GET /api/load-from-db?plan_id=1
```

**Paramètres** :
| Param | Type | Requis | Description |
|-------|------|--------|-------------|
| plan_id | integer | Non | ID du plan (défaut: tous) |

**Réponse** :
```json
{
  "floors": [
    {
      "id": "floor-1",
      "name": "RDC",
      "floorNumber": 0,
      "rooms": [
        {
          "id": "room-1",
          "name": "Salle A",
          "color": "#f0f0f0",
          "polygon_points": [
            {"x": 100, "y": 100},
            {"x": 300, "y": 100},
            {"x": 300, "y": 200},
            {"x": 100, "y": 200}
          ]
        }
      ],
      "artworks": [
        {
          "id": "artwork-1",
          "title": "La Joconde",
          "artist": "Léonard de Vinci",
          "x": 150,
          "y": 150,
          "room_id": "room-1"
        }
      ],
      "links": [...],
      "entrances": [...],
      "verticalLinks": [...]
    }
  ]
}
```

---

### Éditeur - Sauvegarde

```
POST /api/save-to-db
Content-Type: application/json
```

**Body** :
```json
{
  "floors": [
    {
      "id": "floor-1",
      "name": "RDC",
      "floorNumber": 0,
      "rooms": [...],
      "artworks": [...],
      "links": [...],
      "entrances": [...],
      "verticalLinks": [...]
    }
  ]
}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Saved successfully",
  "stats": {
    "rooms": 5,
    "artworks": 12,
    "links": 8,
    "entrances": 2
  }
}
```

---

### QR Code - Génération

```
GET /api/qrcode/generate?parcours_id=1&profile=default
```

**Paramètres** :
| Param | Type | Requis | Description |
|-------|------|--------|-------------|
| parcours_id | integer | Oui | ID du parcours |
| profile | string | Non | Code profil (défaut: "default") |

**Réponse** : Image PNG du QR code

---

### PDF - Upload Artwork

```
POST /api/artwork-pdf
Content-Type: multipart/form-data
```

**Body** :
| Field | Type | Description |
|-------|------|-------------|
| file | File | Fichier PDF |
| oeuvre_id | integer | ID de l'œuvre |

**Réponse** :
```json
{
  "success": true,
  "pdf_path": "/uploads/pdfs/oeuvre_1.pdf",
  "metadata": {
    "pages": 2,
    "title": "Notice œuvre"
  }
}
```

---

## Flask API Routes

### Health Check

```
GET /api/health
```

**Réponse** :
```json
{
  "status": "ok",
  "database": "connected",
  "ollama": "available",
  "piper": "available"
}
```

---

### Plan du Musée

```
GET /api/museum/floor-plan
```

**Paramètres optionnels** :
| Param | Type | Description |
|-------|------|-------------|
| floor | integer | Filtrer par étage |

**Réponse** :
```json
{
  "success": true,
  "rooms": [
    {
      "entity_id": 1,
      "name": "Salle A",
      "floor": 0,
      "polygon_points": [
        {"x": 100, "y": 100},
        {"x": 300, "y": 100},
        {"x": 300, "y": 200},
        {"x": 100, "y": 200}
      ]
    }
  ],
  "entrances": [
    {
      "entrance_id": 1,
      "name": "Entrée Principale",
      "x": 200,
      "y": 500,
      "icon": "🚪",
      "floor": 0
    }
  ]
}
```

---

### Parcours - Liste

```
GET /api/parcours/list
```

**Réponse** :
```json
{
  "success": true,
  "parcours": [
    {
      "parcours_id": 1,
      "nom": "Visite Complète",
      "description": "Découvrez toutes les œuvres",
      "oeuvres_count": 15,
      "is_active": true,
      "created_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

---

### Parcours - Détails Complets

```
GET /api/parcours/<parcours_id>/full
```

**Réponse** :
```json
{
  "success": true,
  "parcours_id": 1,
  "nom": "Visite Complète",
  "description": "Découvrez toutes les œuvres",
  "artworks": [
    {
      "oeuvre_id": 1,
      "order": 1,
      "title": "La Joconde",
      "artist": "Léonard de Vinci",
      "position": {
        "x": 150,
        "y": 150,
        "floor": 0,
        "floor_name": "RDC",
        "room_name": "Salle A"
      },
      "image_url": "/uploads/images/oeuvre_1.jpg",
      "description": "..."
    }
  ],
  "path_segments": [
    {
      "segment_index": 0,
      "from": {"x": 150, "y": 150, "floor": 0, "type": "artwork"},
      "to": {"x": 200, "y": 150, "floor": 0, "type": "door"},
      "distance_meters": 0.625
    }
  ],
  "metadata": {
    "floors_list": [0, 1],
    "total_distance": 125.5,
    "estimated_duration": "45 min"
  }
}
```

---

### Parcours - Créer

```
POST /api/parcours/create
Content-Type: application/json
```

**Body** :
```json
{
  "nom": "Nouveau Parcours",
  "description": "Description du parcours",
  "oeuvres_ids": [1, 5, 3, 8, 2]
}
```

**Réponse** :
```json
{
  "success": true,
  "parcours_id": 2,
  "message": "Parcours créé avec 5 œuvres"
}
```

---

### Parcours - Calculer Chemin

```
POST /api/parcours/<parcours_id>/calculate-path
```

**Réponse** :
```json
{
  "success": true,
  "segments_count": 15,
  "total_distance": 125.5,
  "estimated_duration": "45 min"
}
```

---

### Narration - Récupérer

```
GET /api/narration?oeuvre_id=1&age=1&thematique=5&style=2
```

**Paramètres** :
| Param | Type | Requis | Description |
|-------|------|--------|-------------|
| oeuvre_id | integer | Oui | ID de l'œuvre |
| age | integer | Non | ID critère âge |
| thematique | integer | Non | ID thématique |
| style | integer | Non | ID style |

**Réponse** :
```json
{
  "success": true,
  "narration": {
    "narration_id": 42,
    "texte": "Bienvenue devant La Joconde...",
    "audio_url": "http://server:5000/uploads/audio/oeuvre_1/age_1_theme_5_style_2.wav",
    "duration_seconds": 120.5
  }
}
```

---

### Admin - Générer Narration

```
POST /api/admin/generate-narration-precise
Content-Type: application/json
```

**Body** :
```json
{
  "oeuvre_id": 1,
  "criteria_combination": {
    "age": 1,
    "thematique": 5,
    "style_texte": 2
  }
}
```

**Réponse** :
```json
{
  "success": true,
  "narration_id": 42,
  "texte": "Bienvenue devant La Joconde...",
  "audio_path": "/uploads/audio/oeuvre_1/age_1_theme_5_style_2.wav",
  "duration_seconds": 120.5
}
```

---

### Admin - Liste Œuvres

```
GET /api/admin/oeuvres
```

**Réponse** :
```json
{
  "success": true,
  "oeuvres": [
    {
      "oeuvre_id": 1,
      "titre": "La Joconde",
      "artiste_nom": "Léonard de Vinci",
      "salle_nom": "Salle A",
      "image_link": "/uploads/images/oeuvre_1.jpg",
      "pdf_link": "/uploads/pdfs/oeuvre_1.pdf",
      "narrations_count": 5
    }
  ]
}
```

---

### Fichiers Statiques (Uploads)

```
GET /uploads/<path>
```

**Exemples** :
- `/uploads/images/oeuvre_1.jpg`
- `/uploads/pdfs/oeuvre_1.pdf`
- `/uploads/audio/oeuvre_1/age_1_theme_5_style_2.wav`
- `/uploads/qrcodes/parcours_1.png`

---

## Codes d'Erreur

| Code | Signification |
|------|---------------|
| 200 | Succès |
| 201 | Créé avec succès |
| 400 | Requête invalide |
| 401 | Non authentifié |
| 403 | Accès interdit |
| 404 | Ressource non trouvée |
| 500 | Erreur serveur |

**Format erreur** :
```json
{
  "success": false,
  "error": "Description de l'erreur",
  "code": "ERROR_CODE"
}
```

---

## CORS

Le backend Flask accepte les requêtes cross-origin :

```python
from flask_cors import CORS

CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "http://<VPS>:3000", "http://<VPS>:8080"],
        "methods": ["GET", "POST", "PUT", "DELETE"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})
```

---

## Authentification

### Routes protégées

Les routes `/api/admin/*` nécessitent une authentification.

### Headers

```
Authorization: Bearer <token>
```

ou

```
Cookie: session=<session_id>
```

---

## Pagination (optionnelle)

Pour les listes longues :

```
GET /api/admin/oeuvres?page=1&limit=20
```

**Réponse** :
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

---

## Rate Limiting

Le backend limite les requêtes pour éviter les abus :

| Type | Limite |
|------|--------|
| API publique | 100 req/min |
| API admin | 200 req/min |
| Génération narration | 10 req/min |
| Upload fichiers | 20 req/min |
