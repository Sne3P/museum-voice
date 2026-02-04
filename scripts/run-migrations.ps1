# Script PowerShell pour exécuter les migrations de base de données

$ErrorActionPreference = "Stop"

$MIGRATIONS_DIR = "database/migrations"
$DB_CONTAINER = "museum-database"
$DB_NAME = "museum_db"
$DB_USER = "postgres"

Write-Host "🔄 Exécution des migrations..." -ForegroundColor Cyan

# Créer la table de suivi des migrations si elle n'existe pas
$createTableSQL = @"
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(10) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"@

$createTableSQL | docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME

# Parcourir les fichiers de migration
$migrations = Get-ChildItem -Path $MIGRATIONS_DIR -Filter "*.sql" | Sort-Object Name

foreach ($migration in $migrations) {
    # Extraire le numéro de version
    $version = $migration.Name.Split('_')[0]
    
    # Vérifier si déjà appliquée
    $checkSQL = "SELECT COUNT(*) FROM schema_migrations WHERE version = '$version';"
    $alreadyApplied = ($checkSQL | docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t).Trim()
    
    if ($alreadyApplied -eq "0") {
        Write-Host "📦 Application de $($migration.Name)..." -ForegroundColor Yellow
        
        Get-Content $migration.FullName | docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME
        
        # Enregistrer la migration
        $recordSQL = "INSERT INTO schema_migrations (version) VALUES ('$version');"
        $recordSQL | docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME
        
        Write-Host "✅ $($migration.Name) appliquée" -ForegroundColor Green
    } else {
        Write-Host "⏭️  $($migration.Name) déjà appliquée, ignorée" -ForegroundColor Gray
    }
}

Write-Host "🎉 Migrations terminées!" -ForegroundColor Green
