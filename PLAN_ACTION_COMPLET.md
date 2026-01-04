================================================================================
📋 ÉTAT DES LIEUX & PLAN D'ACTION - MUSEUM VOICE
================================================================================
Date: 2026-01-04

================================================================================
✅ CE QUI FONCTIONNE ACTUELLEMENT
================================================================================

┌────────────────────────────────────────────────────────────────────────────┐
│ 1. INFRASTRUCTURE DOCKER ✅                                                 │
└────────────────────────────────────────────────────────────────────────────┘

  ✅ PostgreSQL 16 Alpine (museum-db)
     - Base de données: museumvoice
     - 18 tables créées (init.sql exécuté)
     - Tables principales: oeuvres, chunk, pregenerations, plans, qr_code
  
  ✅ Backend Flask Python (museum-backend)
     - Port 5000
     - CORS activé
     - Healthcheck fonctionnel
     - PostgreSQL connecté
  
  ✅ Frontend Next.js 16 (museum-app)
     - Port 3000
     - Turbopack compilation
     - Dashboard editor opérationnel


┌────────────────────────────────────────────────────────────────────────────┐
│ 2. FRONTEND - DASHBOARD EDITOR ✅                                           │
└────────────────────────────────────────────────────────────────────────────┘

  ✅ Éditeur de plan visuel
     - Création salles (rectangles)
     - Création œuvres (formes variées)
     - Création portes
     - Liens verticaux (escaliers)
     - Système de sélection
     - Propriétés éditables
     - Historique undo/redo
  
  ✅ Sauvegarde/Chargement PostgreSQL
     - API: /api/save-to-db (POST)
     - API: /api/load-from-db (GET)
     - Stockage dans table `plans`
     - Format JSON préservé


┌────────────────────────────────────────────────────────────────────────────┐
│ 3. BACKEND - APIs PostgreSQL EXISTANTES ✅                                  │
└────────────────────────────────────────────────────────────────────────────┘

  ✅ backend/rag/main_postgres.py
  
     Endpoints implémentés:
     - GET  /health
     - GET  /api/artworks
     - GET  /api/artworks/<id>
     - GET  /api/artworks/search?q=
     - POST /api/artworks
     - GET  /api/pregenerations/stats
     - GET  /api/pregenerations/<oeuvre_id>
     - POST /api/pregenerations
     - POST /api/parcours/generate (TODO: placeholder)
  
  ✅ Modules DB PostgreSQL
     - backend/rag/core/db_postgres.py
     - backend/rag/core/pregeneration_db.py
     - Fonctions CRUD complètes


┌────────────────────────────────────────────────────────────────────────────┐
│ 4. BASE DE DONNÉES - TABLES ✅                                              │
└────────────────────────────────────────────────────────────────────────────┘

  ✅ Table `oeuvres` (1 œuvre de test "joconde")
  ✅ Table `chunk` (vide - prêt à recevoir)
  ✅ Table `pregenerations` (vide - prêt à recevoir)
  ✅ Table `plans` (contient plans éditeur)
  ✅ Table `qr_code` (prête)


================================================================================
❌ CE QUI NE FONCTIONNE PAS / MANQUE
================================================================================

┌────────────────────────────────────────────────────────────────────────────┐
│ 1. UPLOAD PDF CASSÉ ❌                                                      │
└────────────────────────────────────────────────────────────────────────────┘

  ❌ PROBLÈME:
     - Frontend: /api/artwork-pdf sauvegarde dans public/uploads/pdfs/
     - Backend: Ne peut pas accéder à public/ (container isolé)
     - Pas de volume Docker partagé
     - Fichier non persisté entre redémarrages
     - Chemin DB stocké mais fichier inaccessible
  
  ✅ SOLUTION:
     - Créer volume Docker: museum-uploads-data (EXISTE DÉJÀ !)
     - Monter dans backend: /app/uploads
     - Monter dans frontend: /app/public/uploads
     - API upload doit sauvegarder dans /app/uploads/pdfs/
     - Servir via Next.js static files


┌────────────────────────────────────────────────────────────────────────────┐
│ 2. TRAITEMENT PDF → CHUNKS MANQUANT ❌                                      │
└────────────────────────────────────────────────────────────────────────────┘

  ❌ FICHIERS EXISTANTS MAIS PAS D'API:
     - backend/rag/model_pdf_processor.py (existe)
     - Fonction: process_pdf_file() disponible
     - MAIS: Pas d'endpoint Flask pour déclencher
  
  ✅ À CRÉER:
     - POST /api/process-pdf
       Body: { "oeuvre_id": 1, "pdf_path": "/app/uploads/pdfs/..." }
       Actions:
         1. Lire PDF avec PyPDF2
         2. Parser avec regex (sections du modèle)
         3. Découper en chunks (500-1000 chars)
         4. Insérer dans table `chunk`
         5. Retourner: { "chunks_created": 10 }


┌────────────────────────────────────────────────────────────────────────────┐
│ 3. PRÉGÉNÉRATION AUTOMATIQUE MANQUANTE ❌                                   │
└────────────────────────────────────────────────────────────────────────────┘

  ❌ FICHIERS EXISTANTS MAIS PAS D'API:
     - backend/rag/pregeneration/auto_pregeneration_optimized.py (existe)
     - Classe: AutoPregenerationSystemOptimized
     - Fonction: pregenerate_artwork(oeuvre_id) disponible
     - MAIS: Pas d'endpoint Flask accessible
  
  ✅ À CRÉER:
     - POST /api/pregenerate-artwork
       Body: { "oeuvre_id": 1 }
       Actions:
         1. Récupérer chunks de l'œuvre
         2. Générer 36 narrations (4 âges × 3 thèmes × 3 styles)
         3. Utiliser système RAG + templates intelligents
         4. Insérer dans table `pregenerations`
         5. Retourner: { "narrations_created": 36, "duration": "3m15s" }
     
     - POST /api/pregenerate-all
       Body: {} (optionnel)
       Actions:
         1. Récupérer toutes les œuvres
         2. Pour chaque œuvre: pregenerate_artwork()
         3. Retourner stats globales


┌────────────────────────────────────────────────────────────────────────────┐
│ 4. GÉNÉRATION PARCOURS MANQUANTE ❌                                         │
└────────────────────────────────────────────────────────────────────────────┘

  ❌ ENDPOINT EXISTE MAIS VIDE:
     - POST /api/parcours/generate
     - Retourne actuellement: placeholder "TODO"
  
  ✅ À IMPLÉMENTER:
     - POST /api/parcours/generate
       Body: {
         "user_profile": {
           "age": "adulte",
           "thematique": "technique_picturale",
           "style": "analyse",
           "duree": 45 // minutes
         },
         "plan_coordinates": [
           { "oeuvre_id": 1, "x": 100, "y": 200, "room": "1" },
           { "oeuvre_id": 2, "x": 300, "y": 150, "room": "1" }
         ]
       }
       Actions:
         1. Algorithme parcours optimal (TSP simplifié)
         2. Sélectionner œuvres selon profil + durée
         3. Récupérer narrations adaptées (pregenerations table)
         4. Générer ordre de visite logique
         5. Calculer temps par œuvre
         6. Retourner: {
              "introduction": "Bienvenue...",
              "oeuvres": [
                {
                  "oeuvre_id": 1,
                  "order": 1,
                  "narration": "...",
                  "duration": "5 min",
                  "coordinates": { "x": 100, "y": 200 }
                }
              ],
              "conclusion": "Merci...",
              "total_duration": "45 min"
            }


┌────────────────────────────────────────────────────────────────────────────┐
│ 5. FRONTEND CLIENT/UTILISATEUR MANQUANT ❌                                  │
└────────────────────────────────────────────────────────────────────────────┘

  ❌ PAS D'INTERFACE UTILISATEUR FINAL:
     - Seulement éditeur admin existe
     - Pas de page pour visiteur
  
  ✅ À CRÉER:
     - Page: /app/audioguide/page.tsx (existe mais vide)
     
     Fonctionnalités:
     1. Formulaire profil utilisateur
        - Âge cible (enfant/ado/adulte/senior)
        - Thématique préférée
        - Style narration
        - Durée souhaitée
     
     2. Affichage plan musée interactif
        - Chargement plan depuis /api/load-from-db
        - Affichage œuvres avec positions
        - Parcours visuel généré
     
     3. Lecteur audio narrations
        - Récupération narrations depuis API
        - Conversion TTS (optionnel)
        - Navigation œuvre par œuvre
     
     4. Progression parcours
        - Ordre de visite
        - Temps restant
        - Œuvre suivante


┌────────────────────────────────────────────────────────────────────────────┐
│ 6. CONVERSION TEXT-TO-SPEECH MANQUANTE ❌                                   │
└────────────────────────────────────────────────────────────────────────────┘

  ❌ PAS D'INTÉGRATION TTS:
     - pregenerations.voice_link existe (NULL partout)
     - Pas de génération audio
  
  ✅ À CRÉER (OPTIONNEL - Phase 2):
     - POST /api/generate-audio
       Body: { "pregeneration_id": 5 }
       Actions:
         1. Récupérer pregeneration_text
         2. Appeler Google Cloud TTS / ElevenLabs / Piper
         3. Sauvegarder audio dans /app/uploads/voices/
         4. Mettre à jour pregenerations.voice_link
         5. Retourner: { "audio_url": "/uploads/voices/..." }


================================================================================
🎯 PLAN D'ACTION DÉTAILLÉ - ORDRE D'IMPLÉMENTATION
================================================================================

PHASE 1 : RÉPARER UPLOAD & STOCKAGE (PRIORITÉ CRITIQUE) 🔴
──────────────────────────────────────────────────────────

  [TÂCHE 1.1] Configurer volumes Docker partagés
    ✓ Volume museum-uploads-data existe déjà
    □ Vérifier montage dans docker-compose.yml
    □ Ajouter montage dans docker-compose.dev.yml
    □ Restart containers pour appliquer
  
  [TÂCHE 1.2] Adapter API upload frontend
    □ Modifier /app/api/artwork-pdf/route.ts
    □ Sauvegarder dans /app/public/uploads/pdfs/ (accessible backend via volume)
    □ Tester upload depuis éditeur
    □ Vérifier persistance après restart
  
  [TÂCHE 1.3] Vérifier accessibilité backend
    □ Backend doit lire /app/uploads/pdfs/
    □ Tester avec model_pdf_processor.py
  
  Estimation: 1-2 heures


PHASE 2 : API TRAITEMENT PDF → CHUNKS 🟠
─────────────────────────────────────────

  [TÂCHE 2.1] Créer endpoint /api/process-pdf
    □ Ajouter route dans backend/rag/main_postgres.py
    □ Wrapper model_pdf_processor.process_pdf_file()
    □ Paramètres: { "oeuvre_id": 1 }
    □ Récupérer pdf_path depuis oeuvres table
    □ Lancer traitement PyPDF2 + chunking
    □ Retourner stats
  
  [TÂCHE 2.2] Adapter model_pdf_processor pour PostgreSQL
    □ Vérifier imports db_postgres au lieu de SQLite
    □ Utiliser add_chunk() depuis db_postgres.py
    □ Tester avec PDF réel
  
  [TÂCHE 2.3] Bouton dashboard "Traiter PDF"
    □ Ajouter bouton dans éditeur
    □ Appeler POST http://localhost:5000/api/process-pdf
    □ Afficher progression/résultat
  
  Estimation: 3-4 heures


PHASE 3 : API PRÉGÉNÉRATION NARRATIONS 🟡
──────────────────────────────────────────

  [TÂCHE 3.1] Créer endpoint /api/pregenerate-artwork
    □ Ajouter route dans backend/rag/main_postgres.py
    □ Wrapper AutoPregenerationSystemOptimized
    □ Paramètres: { "oeuvre_id": 1 }
    □ Générer 36 narrations
    □ Retourner stats + durée
  
  [TÂCHE 3.2] Créer endpoint /api/pregenerate-all
    □ Boucle sur toutes œuvres
    □ Parallélisation possible (ThreadPoolExecutor)
    □ Retourner stats globales
  
  [TÂCHE 3.3] Bouton dashboard "Prégénérer narrations"
    □ Ajouter bouton dans dashboard admin
    □ Modal avec choix: 1 œuvre ou toutes
    □ Barre de progression
    □ Afficher résultat (X narrations créées)
  
  [TÂCHE 3.4] Vérification système RAG
    □ Tester sentence-transformers chargement
    □ Tester FAISS index
    □ Vérifier templates intelligent_generator.py
  
  Estimation: 4-6 heures


PHASE 4 : API GÉNÉRATION PARCOURS 🟢
─────────────────────────────────────

  [TÂCHE 4.1] Algorithme parcours optimal
    □ Créer backend/rag/parcours/parcours_generator.py
    □ Fonction: generate_optimal_path(oeuvres_coords, profil)
    □ Algorithme TSP simplifié (nearest neighbor)
    □ Contraintes: durée max, salles logiques
  
  [TÂCHE 4.2] Implémenter /api/parcours/generate
    □ Remplacer placeholder actuel
    □ Recevoir profil + coordonnées
    □ Appeler algorithme parcours
    □ Récupérer narrations adaptées (pregenerations)
    □ Retourner parcours complet JSON
  
  [TÂCHE 4.3] Test endpoint
    □ Tester avec profil adulte/technique/analyse
    □ Vérifier sélection narrations
    □ Vérifier ordre logique
  
  Estimation: 5-7 heures


PHASE 5 : FRONTEND CLIENT/UTILISATEUR 🔵
─────────────────────────────────────────

  [TÂCHE 5.1] Page profil utilisateur
    □ Créer /app/audioguide/profil/page.tsx
    □ Formulaire: âge, thématique, style, durée
    □ Bouton "Générer mon parcours"
  
  [TÂCHE 5.2] Récupération plan musée
    □ Appeler GET /api/load-from-db
    □ Parser JSON plan
    □ Extraire positions œuvres + rooms
  
  [TÂCHE 5.3] Appel API génération parcours
    □ Construire body avec profil + coordonnées
    □ POST http://localhost:5000/api/parcours/generate
    □ Recevoir parcours complet
  
  [TÂCHE 5.4] Affichage parcours visuel
    □ Composant PlanVisualizer (canvas/SVG)
    □ Afficher œuvres avec numéros d'ordre
    □ Tracer chemin optimal
    □ Highlight œuvre courante
  
  [TÂCHE 5.5] Lecteur narrations
    □ Composant AudioPlayer
    □ Afficher texte narration
    □ Boutons: Précédent / Suivant
    □ Progression: "Œuvre 3/7"
  
  [TÂCHE 5.6] (Optionnel) Conversion TTS
    □ Bouton "Écouter" sur chaque narration
    □ Appeler API TTS (Google/ElevenLabs)
    □ Lecteur audio HTML5
  
  Estimation: 8-12 heures


PHASE 6 : TESTS & POLISH 🟣
────────────────────────────

  [TÂCHE 6.1] Test flow complet
    □ Upload PDF
    □ Traitement chunks
    □ Prégénération narrations
    □ Génération parcours
    □ Affichage client
  
  [TÂCHE 6.2] Gestion erreurs
    □ Upload PDF invalide
    □ Œuvre sans chunks
    □ Œuvre sans narrations
    □ Profil invalide
  
  [TÂCHE 6.3] Performance
    □ Temps prégénération acceptable ?
    □ Cache narrations si nécessaire
    □ Optimisation requêtes DB
  
  [TÂCHE 6.4] Documentation
    □ README.md utilisateur
    □ Guide admin dashboard
    □ API documentation
  
  Estimation: 4-6 heures


================================================================================
⏱️ ESTIMATION TEMPS TOTAL
================================================================================

  Phase 1 (Upload)         : 1-2h
  Phase 2 (PDF→Chunks)     : 3-4h
  Phase 3 (Prégénération)  : 4-6h
  Phase 4 (Parcours API)   : 5-7h
  Phase 5 (Frontend Client): 8-12h
  Phase 6 (Tests)          : 4-6h
  ───────────────────────────────
  TOTAL                    : 25-37 heures
  
  Avec 1 développeur à temps plein: 3-5 jours


================================================================================
🎯 PROCHAINE ÉTAPE IMMÉDIATE
================================================================================

  ► COMMENCER PAR PHASE 1 : Réparer upload PDF
  
  Actions immédiates:
  
  1. Vérifier docker-compose.yml volumes
  2. Modifier /app/api/artwork-pdf/route.ts
  3. Tester upload depuis dashboard
  4. Vérifier persistance fichier
  
  Une fois upload OK → Passer Phase 2 (Traitement PDF)


================================================================================
📊 RÉCAPITULATIF FICHIERS CLÉS
================================================================================

  BACKEND:
    ✅ backend/rag/main_postgres.py (API Flask)
    ✅ backend/rag/core/db_postgres.py (DB functions)
    ✅ backend/rag/core/pregeneration_db.py (Pregenerations)
    ✅ backend/rag/model_pdf_processor.py (PDF parser)
    ✅ backend/rag/pregeneration/auto_pregeneration_optimized.py
    ⚠️ backend/rag/utils/intelligent_generator.py (RAG generation)
    ❌ backend/rag/parcours/parcours_generator.py (À CRÉER)
  
  FRONTEND:
    ✅ app/editor/page.tsx (Éditeur admin)
    ✅ app/api/save-to-db/route.ts
    ✅ app/api/load-from-db/route.ts
    ⚠️ app/api/artwork-pdf/route.ts (À RÉPARER)
    ❌ app/audioguide/page.tsx (À IMPLÉMENTER)
  
  DOCKER:
    ✅ docker-compose.yml
    ✅ docker-compose.dev.yml
    ✅ database/init.sql
    ✅ backend/Dockerfile
    ✅ Dockerfile (frontend)


================================================================================
