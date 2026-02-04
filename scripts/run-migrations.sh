#!/bin/bash
# Script pour exécuter les migrations de base de données

set -e

MIGRATIONS_DIR="database/migrations"
DB_CONTAINER="museum-database"
DB_NAME="museum_db"
DB_USER="postgres"

echo "🔄 Exécution des migrations..."

# Créer la table de suivi des migrations si elle n'existe pas
docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME <<EOF
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(10) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
EOF

# Parcourir les fichiers de migration
for migration in $(ls $MIGRATIONS_DIR/*.sql 2>/dev/null | sort); do
    # Extraire le numéro de version (ex: 001 de 001_remove_is_required.sql)
    filename=$(basename "$migration")
    version=$(echo "$filename" | cut -d'_' -f1)
    
    # Vérifier si déjà appliquée
    already_applied=$(docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM schema_migrations WHERE version = '$version';" | tr -d ' ')
    
    if [ "$already_applied" = "0" ]; then
        echo "📦 Application de $filename..."
        docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME < "$migration"
        
        # Enregistrer la migration
        docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "INSERT INTO schema_migrations (version) VALUES ('$version');"
        echo "✅ $filename appliquée"
    else
        echo "⏭️  $filename déjà appliquée, ignorée"
    fi
done

echo "🎉 Migrations terminées!"
