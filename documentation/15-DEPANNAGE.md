# 🔧 Dépannage

## Problèmes Courants et Solutions

---

## 🐳 Docker

### Conteneur ne démarre pas

**Symptôme** : `docker compose up` échoue

**Solutions** :

1. Vérifier les logs
   ```bash
   docker compose logs <service_name>
   ```

2. Vérifier les ports occupés
   ```bash
   # Linux/Mac
   lsof -i :3000
   # Windows
   netstat -ano | findstr :3000
   ```

3. Reconstruire les images
   ```bash
   docker compose down
   docker compose build --no-cache
   docker compose up -d
   ```

### Volumes non synchronisés

**Symptôme** : Les fichiers uploadés ne sont pas accessibles

**Solutions** :

1. Vérifier le volume
   ```bash
   docker volume inspect museum-voice_uploads_data_prod
   ```

2. Vérifier les permissions
   ```bash
   docker compose exec backend ls -la /app/uploads
   ```

3. Recréer le volume (⚠️ PERTE DE DONNÉES)
   ```bash
   docker compose down -v
   docker compose up -d
   ```

### Mémoire insuffisante

**Symptôme** : `Killed` ou OOM errors

**Solutions** :

1. Augmenter la mémoire Docker Desktop
2. Limiter les ressources
   ```yaml
   # docker-compose.yml
   services:
     ollama:
       deploy:
         resources:
           limits:
             memory: 4G
   ```

---

## 🗄️ Base de Données

### PostgreSQL ne démarre pas

**Symptôme** : Erreur de connexion

**Solutions** :

1. Vérifier l'état du conteneur
   ```bash
   docker compose ps postgres
   docker compose logs postgres
   ```

2. Vérifier les identifiants
   ```bash
   docker compose exec postgres psql -U museum -d museum_db -c "SELECT 1"
   ```

3. Réinitialiser la base (⚠️ PERTE DE DONNÉES)
   ```bash
   docker compose down -v
   docker compose up -d postgres
   ```

### Erreur "relation does not exist"

**Symptôme** : Table non trouvée

**Solutions** :

1. Vérifier les tables
   ```sql
   \dt
   ```

2. Exécuter les migrations
   ```bash
   docker compose exec postgres psql -U museum -d museum_db -f /docker-entrypoint-initdb.d/init.sql
   ```

### Données corrompues

**Solutions** :

1. Restaurer depuis un backup
   ```bash
   cat backup.sql | docker compose exec -T postgres psql -U museum museum_db
   ```

2. Vérifier l'intégrité
   ```sql
   VACUUM ANALYZE;
   REINDEX DATABASE museum_db;
   ```

---

## 🌐 Réseau / URLs

### CORS Errors

**Symptôme** : `Access-Control-Allow-Origin` error dans la console

**Solutions** :

1. Vérifier la configuration CORS du backend
   ```python
   # main_postgres.py
   CORS(app, origins=["http://localhost:3000", "http://<VPS_IP>:3000"])
   ```

2. Vérifier les URLs dans les variables d'environnement
   ```bash
   docker compose exec app printenv | grep NEXT_PUBLIC
   ```

### Images/PDF non affichés

**Symptôme** : 404 ou images cassées

**Solutions** :

1. Vérifier l'URL backend
   ```javascript
   console.log(process.env.NEXT_PUBLIC_BACKEND_URL);
   ```

2. Vérifier que le fichier existe
   ```bash
   docker compose exec backend ls /app/uploads/images/
   ```

3. Tester l'URL directement
   ```bash
   curl http://<VPS_IP>:5000/uploads/images/oeuvre_1.jpg
   ```

4. Utiliser `getUploadUrl()`
   ```typescript
   import { getUploadUrl } from '@/lib/uploads';
   const url = getUploadUrl(oeuvre.image_link);
   ```

### API inaccessible

**Symptôme** : Timeout ou connection refused

**Solutions** :

1. Vérifier que le service tourne
   ```bash
   docker compose ps
   curl http://localhost:5000/api/health
   ```

2. Vérifier le firewall
   ```bash
   # Linux
   sudo ufw status
   sudo ufw allow 5000
   ```

3. Vérifier les logs
   ```bash
   docker compose logs backend
   ```

---

## 📱 Frontend

### Page blanche

**Symptôme** : L'application ne s'affiche pas

**Solutions** :

1. Vérifier la console du navigateur (F12)

2. Vérifier le build
   ```bash
   pnpm build
   ```

3. Vérifier les erreurs TypeScript
   ```bash
   pnpm typecheck
   ```

### Hydration Mismatch

**Symptôme** : Erreur "Hydration failed"

**Solutions** :

1. Éviter le contenu dynamique sans `useEffect`
   ```tsx
   // ❌ Mauvais
   <div>{new Date().toISOString()}</div>
   
   // ✅ Bon
   const [date, setDate] = useState('');
   useEffect(() => {
     setDate(new Date().toISOString());
   }, []);
   ```

2. Utiliser `suppressHydrationWarning` si nécessaire
   ```tsx
   <time suppressHydrationWarning>{date}</time>
   ```

### Canvas ne s'affiche pas

**Symptôme** : Canvas vide ou noir

**Solutions** :

1. Vérifier les dimensions
   ```tsx
   console.log(canvasRef.current?.width, canvasRef.current?.height);
   ```

2. Vérifier le contexte
   ```tsx
   const ctx = canvasRef.current?.getContext('2d');
   console.log('Context:', ctx);
   ```

3. Vérifier les données chargées
   ```tsx
   console.log('Floors:', floors);
   console.log('Rooms:', currentFloor?.rooms);
   ```

---

## 🤖 IA (Ollama / Piper)

### Ollama ne répond pas

**Symptôme** : Timeout lors de la génération

**Solutions** :

1. Vérifier l'état
   ```bash
   docker compose logs ollama
   docker compose exec ollama ollama list
   ```

2. Télécharger le modèle
   ```bash
   docker compose exec ollama ollama pull mistral
   ```

3. Augmenter le timeout
   ```python
   requests.post(url, timeout=300)
   ```

4. Vérifier la mémoire disponible
   ```bash
   docker stats ollama
   ```

### Piper pas de son

**Symptôme** : Fichier audio vide ou corrompu

**Solutions** :

1. Vérifier l'API Piper
   ```bash
   curl -X POST http://localhost:5002/api/tts \
     -H "Content-Type: application/json" \
     -d '{"text": "Test", "voice": "fr_FR-siwis-medium"}' \
     --output test.wav
   ```

2. Vérifier les voix disponibles
   ```bash
   curl http://localhost:5002/api/voices
   ```

3. Vérifier les logs
   ```bash
   docker compose logs piper-tts
   ```

### Narration de mauvaise qualité

**Solutions** :

1. Vérifier le texte source (caractères spéciaux)
2. Ajuster la température dans le prompt Ollama
3. Régénérer avec des paramètres différents

---

## 🔐 Authentification

### Impossible de se connecter

**Solutions** :

1. Vérifier les identifiants en base
   ```sql
   SELECT * FROM users WHERE email = 'admin@example.com';
   ```

2. Réinitialiser le mot de passe
   ```sql
   UPDATE users SET password_hash = '...' WHERE email = 'admin@example.com';
   ```

3. Vérifier les cookies de session
   - Effacer les cookies du navigateur
   - Vérifier le domaine du cookie

### Session expirée trop vite

**Solutions** :

1. Augmenter la durée de session
   ```python
   app.config['SESSION_COOKIE_MAX_AGE'] = 86400 * 7  # 7 jours
   ```

---

## 📊 Performance

### Application lente

**Solutions** :

1. Vérifier les requêtes N+1
   ```python
   # Activer le logging SQL
   logging.getLogger('sqlalchemy.engine').setLevel(logging.DEBUG)
   ```

2. Ajouter des index
   ```sql
   CREATE INDEX idx_oeuvres_salle ON oeuvres(salle_id);
   ```

3. Optimiser les images
   - Compresser les images avant upload
   - Utiliser des thumbnails

### Canvas lent

**Solutions** :

1. Réduire la fréquence de rendu
   ```tsx
   const frameId = useRef<number>();
   
   useEffect(() => {
     let lastTime = 0;
     const render = (time: number) => {
       if (time - lastTime > 16) { // 60 FPS max
         draw();
         lastTime = time;
       }
       frameId.current = requestAnimationFrame(render);
     };
     frameId.current = requestAnimationFrame(render);
     return () => cancelAnimationFrame(frameId.current!);
   }, []);
   ```

2. Utiliser OffscreenCanvas pour les éléments statiques

---

## 🆘 Obtenir de l'Aide

### Informations à fournir

1. **Logs complets**
   ```bash
   docker compose logs > logs.txt
   ```

2. **Version des outils**
   ```bash
   node --version
   docker --version
   docker compose version
   ```

3. **Configuration**
   ```bash
   cat .env.prod | grep -v PASSWORD
   ```

4. **Étapes pour reproduire**

### Commandes de diagnostic

```bash
# État général
docker compose ps
docker stats

# Santé des services
curl http://localhost:5000/api/health
curl http://localhost:3000/api/health

# Connectivité base
docker compose exec backend python -c "import psycopg2; print('OK')"

# Espace disque
df -h
docker system df
```

### Nettoyage complet (dernier recours)

⚠️ **ATTENTION : PERTE DE DONNÉES**

```bash
# Arrêter tout
docker compose down

# Supprimer les volumes (DONNÉES PERDUES)
docker compose down -v

# Nettoyer Docker
docker system prune -a

# Reconstruire
docker compose up -d --build
```
