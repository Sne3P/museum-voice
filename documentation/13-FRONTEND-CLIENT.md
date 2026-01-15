# 📱 Frontend Client (React)

## Présentation

L'application client est l'audioguide destiné aux visiteurs du musée. Elle est construite avec **React** et optimisée pour une utilisation mobile.

---

## Stack Technique

| Technologie | Version | Usage |
|-------------|---------|-------|
| React | 18 | Bibliothèque UI |
| Vite | - | Build tool |
| JavaScript (JSX) | - | Language |
| CSS Modules | - | Styling |
| react-icons | - | Icônes |

---

## Structure

```
client-frontend/
├── Dockerfile
├── nginx.conf
├── package.json
│
├── public/
│   └── index.html
│
└── src/
    ├── App.jsx
    ├── index.jsx
    │
    ├── components/
    │   ├── map_viewer/
    │   │   ├── MapViewer.jsx
    │   │   └── MapViewer.css
    │   │
    │   ├── audio_player/
    │   │   ├── AudioPlayer.jsx
    │   │   └── AudioPlayer.css
    │   │
    │   ├── profile_selector/
    │   │   └── ProfileSelector.jsx
    │   │
    │   └── artwork_card/
    │       └── ArtworkCard.jsx
    │
    ├── pages/
    │   ├── Home.jsx
    │   ├── Parcours.jsx
    │   └── Audioguide.jsx
    │
    └── services/
        └── api.js
```

---

## Fonctionnalités

### 1. Page d'Accueil

- Sélection de parcours
- Scan QR code
- Choix de langue (optionnel)

### 2. Sélection de Profil

Le visiteur choisit ses préférences :
- **Âge** : Enfant / Adolescent / Adulte / Senior
- **Thématique** : Art / Histoire / Émotion...
- **Style** : Court / Détaillé / Narratif

### 3. Audioguide

- Affichage de l'œuvre courante
- Lecteur audio
- Navigation précédent/suivant
- Carte interactive

### 4. MapViewer (Carte Interactive)

- Vue SVG du plan
- Zoom / Pan tactile
- Navigation multi-étages
- Position actuelle mise en évidence
- Chemin vers l'œuvre suivante

---

## Composant MapViewer

### Fichier : `src/components/map_viewer/MapViewer.jsx`

```jsx
import React, { useEffect, useState, useRef } from 'react';
import { FaDoorOpen } from 'react-icons/fa';
import './MapViewer.css';

const MapViewer = ({ parcours, currentIndex }) => {
    const [floorPlanData, setFloorPlanData] = useState(null);
    const [currentFloor, setCurrentFloor] = useState(0);
    const svgRef = useRef(null);
    
    useEffect(() => {
        // Charger le plan du musée
        const backendUrl = process.env.REACT_APP_BACKEND_URL;
        fetch(`${backendUrl}/api/museum/floor-plan`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setFloorPlanData(data);
                }
            });
    }, []);
    
    // ... gestion zoom/pan
    
    return (
        <div className="map-viewer-container">
            {/* Header avec sélecteur d'étage */}
            <div className="map-viewer-header">
                <h3>Plan du musée</h3>
                <div className="floor-selector">
                    {floors.map(floor => (
                        <button 
                            key={floor}
                            onClick={() => setCurrentFloor(floor)}
                            className={floor === currentFloor ? 'active' : ''}
                        >
                            {floorName}
                        </button>
                    ))}
                </div>
            </div>
            
            {/* SVG du plan */}
            <svg ref={svgRef} viewBox={...}>
                {/* Salles */}
                {roomsOnFloor.map(room => (
                    <polygon points={...} />
                ))}
                
                {/* Chemin actuel */}
                {segmentsOnFloor.map(segment => (
                    <line x1={...} y1={...} x2={...} y2={...} />
                ))}
                
                {/* Entrées */}
                {entrances.filter(e => e.floor === currentFloor).map(entrance => (
                    <g>
                        <circle cx={entrance.x} cy={entrance.y} r="20" fill="#2e7d32" />
                        <FaDoorOpen />
                        <text>{entrance.name}</text>
                    </g>
                ))}
                
                {/* Œuvres */}
                {artworksOnFloor.map(artwork => (
                    <circle cx={artwork.x} cy={artwork.y} />
                ))}
            </svg>
            
            {/* Légende */}
            <div className="map-viewer-legend">
                <div className="legend-item">
                    <div style={{backgroundColor: '#ff0000'}}></div>
                    <span>Œuvre actuelle</span>
                </div>
                {/* ... */}
            </div>
        </div>
    );
};
```

### Éléments affichés

| Élément | Couleur | Description |
|---------|---------|-------------|
| Salles | Gris clair | Polygones avec noms |
| Œuvre actuelle | Rouge | Cercle avec numéro |
| Œuvres à venir | Bleu | Cercles avec numéro |
| Œuvres visitées | Gris | Cercles avec numéro |
| Chemin actuel | Bleu clair | Ligne vers prochaine œuvre |
| Portes | Vert | Petits cercles |
| Escaliers | Orange | Cercles avec icône |
| Entrées | Vert foncé | Grands cercles avec icône porte |

---

## Composant AudioPlayer

### Fichier : `src/components/audio_player/AudioPlayer.jsx`

```jsx
import React, { useRef, useState, useEffect } from 'react';
import './AudioPlayer.css';

const AudioPlayer = ({ audioUrl, title, onEnded }) => {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    
    const togglePlay = () => {
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };
    
    return (
        <div className="audio-player">
            <audio 
                ref={audioRef}
                src={audioUrl}
                onTimeUpdate={handleTimeUpdate}
                onEnded={onEnded}
            />
            
            <div className="player-controls">
                <button onClick={togglePlay}>
                    {isPlaying ? '⏸️' : '▶️'}
                </button>
                
                <div className="progress-bar">
                    <div 
                        className="progress" 
                        style={{ width: `${progress}%` }}
                    />
                </div>
                
                <span className="time">
                    {formatTime(currentTime)} / {formatTime(duration)}
                </span>
            </div>
        </div>
    );
};
```

---

## Appels API

### Service API

```javascript
// src/services/api.js

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
const ADMIN_URL = process.env.REACT_APP_ADMIN_URL || 'http://localhost:3000';

export async function fetchParcours(parcoursId) {
    const response = await fetch(`${BACKEND_URL}/api/parcours/${parcoursId}/full`);
    return response.json();
}

export async function fetchFloorPlan() {
    const response = await fetch(`${BACKEND_URL}/api/museum/floor-plan`);
    return response.json();
}

export async function fetchNarration(oeuvreId, profile) {
    const params = new URLSearchParams({
        oeuvre_id: oeuvreId,
        age: profile.age,
        thematique: profile.thematique,
        style: profile.style
    });
    const response = await fetch(`${BACKEND_URL}/api/narration?${params}`);
    return response.json();
}
```

---

## Variables d'Environnement

```bash
# .env
REACT_APP_BACKEND_URL=http://51.38.188.211:5000
REACT_APP_ADMIN_URL=http://51.38.188.211:3000
```

**Note** : En React, les variables doivent être préfixées `REACT_APP_`.

---

## Responsive Design

### Breakpoints

```css
/* Mobile first */
.container {
    padding: 10px;
}

/* Tablet */
@media (min-width: 768px) {
    .container {
        padding: 20px;
    }
}

/* Desktop */
@media (min-width: 1024px) {
    .container {
        padding: 40px;
        max-width: 1200px;
        margin: 0 auto;
    }
}
```

### Optimisations mobiles

- Touch events pour zoom/pan
- Boutons larges (44px minimum)
- Police lisible (16px minimum)
- Contraste élevé
- Mode paysage supporté

---

## Navigation

### React Router (si utilisé)

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/parcours/:id" element={<Parcours />} />
                <Route path="/audioguide" element={<Audioguide />} />
            </Routes>
        </BrowserRouter>
    );
}
```

### URL depuis QR code

```
http://<CLIENT_URL>:8080/parcours/1?profile=age_1_theme_5_style_2
```

Le client parse les paramètres :
- `parcours_id` : ID du parcours
- `profile` : Préférences pré-sélectionnées

---

## Gestion Hors-ligne (PWA)

### Service Worker

```javascript
// public/sw.js
const CACHE_NAME = 'museum-voice-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/static/js/main.js',
    '/static/css/main.css'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});
```

### Manifest

```json
// public/manifest.json
{
    "name": "Museum Voice",
    "short_name": "MuseumVoice",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#ffffff",
    "theme_color": "#2e7d32",
    "icons": [
        {
            "src": "icon-192.png",
            "sizes": "192x192",
            "type": "image/png"
        }
    ]
}
```

---

## Build & Déploiement

### Développement

```bash
cd client-frontend
npm install
npm start
# → http://localhost:3000
```

### Build production

```bash
npm run build
# → Génère /build
```

### Docker

```dockerfile
# Dockerfile
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

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### Nginx config

```nginx
# nginx.conf
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    
    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## Accessibilité

### Bonnes pratiques

- Labels ARIA sur les boutons
- Rôles sémantiques
- Navigation au clavier
- Contraste suffisant (WCAG AA)
- Texte alternatif sur images

```jsx
<button 
    aria-label="Lecture audio"
    onClick={togglePlay}
>
    {isPlaying ? '⏸️' : '▶️'}
</button>

<img 
    src={artworkImage} 
    alt={`${artworkTitle} par ${artistName}`}
/>
```

---

## Tests

### Tests unitaires

```bash
npm test
```

### Tests E2E (optionnel)

```javascript
// cypress/e2e/audioguide.cy.js
describe('Audioguide', () => {
    it('should load a parcours', () => {
        cy.visit('/parcours/1');
        cy.get('.artwork-title').should('be.visible');
        cy.get('.audio-player').should('exist');
    });
});
```
