# 🚀 Guide de Déploiement

## Prérequis

### Serveur VPS

| Ressource | Minimum | Recommandé |
|-----------|---------|------------|
| RAM | 4 GB | 8 GB |
| CPU | 2 cores | 4 cores |
| Stockage | 20 GB | 50 GB |
| OS | Ubuntu 20.04+ | Ubuntu 22.04 |

### Logiciels requis

```bash
# Docker & Docker Compose
docker --version   # 20.10+
docker compose version  # 2.0+

# Git
git --version
```

---

## Déploiement Production

### 1. Préparation du serveur

```bash
# Connexion SSH au VPS
ssh user@51.38.188.211

# Mise à jour système
sudo apt update && sudo apt upgrade -y

# Installation Docker (si nécessaire)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Se reconnecter pour appliquer les permissions
```

### 2. Cloner le projet

```bash
# Créer le dossier de travail
mkdir -p /opt/museum-voice
cd /opt/museum-voice

# Cloner le repository
git clone <URL_REPOSITORY> .

# Ou si déjà cloné, mettre à jour
git pull origin main
```

### 3. Configurer l'environnement

```bash
# Copier le template de configuration
cp .env.prod.example .env.prod

# Éditer avec l'IP de votre VPS
nano .env.prod
```

Contenu minimal de `.env.prod` :

```bash
# IP de votre VPS
VPS_PUBLIC_IP=51.38.188.211

# Mot de passe base de données (changer en production !)
DB_PASSWORD=VotreMotDePasseSecurise123!
```

### 4. Lancer le déploiement

```bash
# Construire et lancer tous les services
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# Suivre les logs pendant le démarrage
docker compose -f docker-compose.prod.yml logs -f
```

### 5. Initialiser les services IA (première fois uniquement)

```bash
# Télécharger le modèle Ollama (Mistral)
docker compose -f docker-compose.prod.yml exec ollama ollama pull mistral

# Vérifier que Piper est prêt
docker compose -f docker-compose.prod.yml exec backend curl -s http://piper-tts:5002/api/voices
```

### 6. Vérifier le déploiement

```bash
# Vérifier les conteneurs
docker compose -f docker-compose.prod.yml ps

# Tester les endpoints
curl http://51.38.188.211:5000/api/health
curl http://51.38.188.211:3000/api/health
```

---

## URLs d'Accès

| Interface | URL | Description |
|-----------|-----|-------------|
| Admin | `http://<VPS>:3000` | Éditeur + Dashboard |
| Backend API | `http://<VPS>:5000` | API REST |
| Client Visiteur | `http://<VPS>:8080` | Audioguide mobile |

---

## Mise à Jour

### Mise à jour standard

```bash
cd /opt/museum-voice

# Récupérer les dernières modifications
git pull origin main

# Reconstruire et redémarrer
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

### Mise à jour avec migration base de données

```bash
# Arrêter les services
docker compose -f docker-compose.prod.yml down

# Sauvegarder la base (voir section Sauvegarde)
./backup-db.sh

# Mettre à jour le code
git pull origin main

# Relancer avec rebuild
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

---

## Sauvegarde et Restauration

### Sauvegarde automatique

Créer `/opt/museum-voice/backup-db.sh` :

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/museum-voice"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U museum museum_db > "$BACKUP_DIR/db_$DATE.sql"

# Backup uploads
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" \
  -C /var/lib/docker/volumes/museum-voice_uploads_data_prod/_data .

# Garder seulement les 7 derniers backups
ls -t $BACKUP_DIR/db_*.sql | tail -n +8 | xargs -r rm
ls -t $BACKUP_DIR/uploads_*.tar.gz | tail -n +8 | xargs -r rm

echo "Backup terminé : $DATE"
```

```bash
# Rendre exécutable
chmod +x backup-db.sh

# Ajouter au cron (tous les jours à 3h)
crontab -e
# Ajouter : 0 3 * * * /opt/museum-voice/backup-db.sh
```

### Restauration

```bash
# Restaurer la base de données
cat backup_file.sql | docker compose -f docker-compose.prod.yml exec -T postgres psql -U museum museum_db

# Restaurer les uploads
docker compose -f docker-compose.prod.yml down
tar -xzf uploads_backup.tar.gz -C /var/lib/docker/volumes/museum-voice_uploads_data_prod/_data
docker compose -f docker-compose.prod.yml up -d
```

---

## Monitoring

### Vérifier l'état des services

```bash
# État des conteneurs
docker compose -f docker-compose.prod.yml ps

# Utilisation ressources
docker stats

# Logs temps réel
docker compose -f docker-compose.prod.yml logs -f --tail=100
```

### Health checks

```bash
# Backend Flask
curl http://localhost:5000/api/health

# Réponse attendue :
# {"status": "ok", "database": "connected"}

# Frontend Next.js
curl http://localhost:3000/api/health
```

---

## Troubleshooting

### Problème : Conteneur ne démarre pas

```bash
# Voir les logs détaillés
docker compose -f docker-compose.prod.yml logs <service_name>

# Exemple pour le backend
docker compose -f docker-compose.prod.yml logs backend
```

### Problème : Base de données inaccessible

```bash
# Vérifier que PostgreSQL est en cours
docker compose -f docker-compose.prod.yml ps postgres

# Tester la connexion
docker compose -f docker-compose.prod.yml exec postgres psql -U museum -d museum_db -c "SELECT 1"
```

### Problème : Uploads non accessibles

```bash
# Vérifier le volume
docker volume inspect museum-voice_uploads_data_prod

# Vérifier les permissions
docker compose -f docker-compose.prod.yml exec backend ls -la /app/uploads
```

### Problème : Images/PDF non affichés

```bash
# Vérifier l'URL backend
curl http://<VPS>:5000/uploads/images/test.jpg

# Vérifier CORS si erreur
docker compose -f docker-compose.prod.yml logs backend | grep -i cors
```

### Redémarrage complet

```bash
# Arrêt complet
docker compose -f docker-compose.prod.yml down

# Nettoyage (attention : ne pas supprimer les volumes !)
docker system prune -f

# Redémarrage
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

---

## Sécurité en Production

### Recommandations

1. **Changer les mots de passe par défaut**
   ```bash
   # Dans .env.prod
   DB_PASSWORD=MotDePasseTresSecurise123!
   ```

2. **Configurer un firewall**
   ```bash
   # UFW (Ubuntu)
   sudo ufw allow 22/tcp   # SSH
   sudo ufw allow 3000/tcp # Admin
   sudo ufw allow 5000/tcp # Backend
   sudo ufw allow 8080/tcp # Client
   sudo ufw enable
   ```

3. **Configurer HTTPS (recommandé)**
   - Utiliser un reverse proxy (Nginx, Traefik)
   - Certificat Let's Encrypt gratuit

4. **Limiter l'accès admin**
   - Authentification robuste
   - IP whitelisting si possible

---

## Architecture de Déploiement

```
┌─────────────────────────────────────────────────────────────────┐
│                          VPS (51.38.188.211)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Port 3000   │  │  Port 5000   │  │     Port 8080        │   │
│  │  Admin App   │  │  Backend     │  │   Client Visiteur    │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│         │                 │                    │                 │
│         └─────────────────┴────────────────────┘                 │
│                           │                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Docker Network                          │   │
│  │                                                           │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐      │   │
│  │  │PostgreSQL│  │ Ollama  │  │  Piper  │  │ Uploads │      │   │
│  │  │  :5432  │  │ :11434  │  │  :5002  │  │ Volume  │      │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘      │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```
