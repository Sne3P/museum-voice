# ============================================
# VERIFICATION COMPLETE - PRODUCTION VPS OVH
# ============================================
# Script PowerShell de vérification post-déploiement

$ErrorActionPreference = "Continue"

Write-Host "🔍 VERIFICATION ENVIRONNEMENT PRODUCTION" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Compteurs
$PASSED = 0
$FAILED = 0

function Check-Command {
    param($Message, $Success)
    if ($Success) {
        Write-Host "✅ PASS: $Message" -ForegroundColor Green
        $script:PASSED++
    } else {
        Write-Host "❌ FAIL: $Message" -ForegroundColor Red
        $script:FAILED++
    }
}

# ============================================
# 1. VERIFIER DOCKER
# ============================================
Write-Host "📦 1. Docker Engine" -ForegroundColor Yellow
Write-Host "-------------------"

try {
    $dockerVersion = docker --version
    Check-Command "Docker installé ($dockerVersion)" $true
} catch {
    Check-Command "Docker installé" $false
}

try {
    $composeVersion = docker compose version
    Check-Command "Docker Compose installé ($composeVersion)" $true
} catch {
    Check-Command "Docker Compose installé" $false
}

Write-Host ""

# ============================================
# 2. VERIFIER FICHIERS CONFIG
# ============================================
Write-Host "📄 2. Fichiers Configuration" -ForegroundColor Yellow
Write-Host "----------------------------"

$files = @(
    "docker-compose.prod.yml",
    "docker-compose.dev.yml",
    ".env",
    "backend\Dockerfile",
    "Dockerfile",
    "scripts\ollama-entrypoint.sh",
    "backend\init-piper.sh",
    "database\init.sql"
)

foreach ($file in $files) {
    Check-Command "$file existe" (Test-Path $file)
}

Write-Host ""

# ============================================
# 3. VERIFIER CONTAINERS
# ============================================
Write-Host "🐳 3. Containers Docker" -ForegroundColor Yellow
Write-Host "-----------------------"

$containers = @(
    "museum-database-prod",
    "museum-ollama-prod",
    "museum-backend-prod",
    "museum-app-prod",
    "museum-client-prod"
)

foreach ($container in $containers) {
    try {
        $status = docker inspect --format='{{.State.Status}}' $container 2>$null
        if ($status -eq "running") {
            Check-Command "$container (running)" $true
        } else {
            Check-Command "$container (status: $status)" $false
        }
    } catch {
        Check-Command "$container (not found)" $false
    }
}

Write-Host ""

# ============================================
# 4. VERIFIER HEALTHCHECKS
# ============================================
Write-Host "🏥 4. Healthchecks Services" -ForegroundColor Yellow
Write-Host "---------------------------"

foreach ($container in $containers) {
    try {
        $health = docker inspect --format='{{.State.Health.Status}}' $container 2>$null
        if ($health -eq "healthy") {
            Check-Command "$container (healthy)" $true
        } elseif ($health -eq "") {
            Write-Host "⚠️  WARN: $container (no healthcheck)" -ForegroundColor Yellow
        } else {
            Check-Command "$container ($health)" $false
        }
    } catch {
        # Container not found already reported
    }
}

Write-Host ""

# ============================================
# 5. VERIFIER OLLAMA MODEL
# ============================================
Write-Host "🤖 5. Ollama Modèle" -ForegroundColor Yellow
Write-Host "-------------------"

try {
    $ollamaList = docker exec museum-ollama-prod ollama list 2>$null | Out-String
    if ($ollamaList -match "ministral") {
        Check-Command "Modèle ministral-3:3b installé" $true
        if ($ollamaList -match "ministral.*?(\d+\.?\d*\s*[GM]B)") {
            Write-Host "   📊 Taille: $($Matches[1])" -ForegroundColor Gray
        }
    } else {
        Check-Command "Modèle ministral-3:3b manquant" $false
    }
} catch {
    Check-Command "Vérification Ollama échouée" $false
}

Write-Host ""

# ============================================
# 6. VERIFIER PIPER TTS
# ============================================
Write-Host "🎤 6. Piper TTS Modèles" -ForegroundColor Yellow
Write-Host "-----------------------"

try {
    docker exec museum-backend-prod test -f /app/piper/models/fr_FR/fr_FR-siwis-medium.onnx 2>$null
    Check-Command "Modèle français (fr_FR-siwis-medium)" $LASTEXITCODE -eq 0
} catch {
    Check-Command "Modèle français manquant" $false
}

try {
    docker exec museum-backend-prod test -f /app/piper/models/en_US/en_US-ryan-high.onnx 2>$null
    Check-Command "Modèle anglais (en_US-ryan-high)" $LASTEXITCODE -eq 0
} catch {
    Check-Command "Modèle anglais manquant" $false
}

Write-Host ""

# ============================================
# 7. VERIFIER API ENDPOINTS
# ============================================
Write-Host "🌐 7. API Endpoints" -ForegroundColor Yellow
Write-Host "-------------------"

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -UseBasicParsing -TimeoutSec 5 2>$null
    Check-Command "Backend /health (200)" ($response.StatusCode -eq 200)
} catch {
    Check-Command "Backend /health (erreur)" $false
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -UseBasicParsing -TimeoutSec 5 2>$null
    Check-Command "Ollama API (200)" ($response.StatusCode -eq 200)
} catch {
    Check-Command "Ollama API (erreur)" $false
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5 2>$null
    Check-Command "Next.js App (200)" ($response.StatusCode -eq 200)
} catch {
    Write-Host "⚠️  WARN: Next.js App (erreur) - peut prendre du temps au démarrage" -ForegroundColor Yellow
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:80" -UseBasicParsing -TimeoutSec 5 2>$null
    Check-Command "React Client (200)" ($response.StatusCode -eq 200)
} catch {
    Write-Host "⚠️  WARN: React Client (erreur)" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# 8. VERIFIER DATABASE
# ============================================
Write-Host "🗄️  8. PostgreSQL Database" -ForegroundColor Yellow
Write-Host "--------------------------"

try {
    docker exec museum-database-prod psql -U museum_admin -d museumvoice -c "SELECT 1" 2>$null | Out-Null
    Check-Command "Connexion PostgreSQL OK" $LASTEXITCODE -eq 0
} catch {
    Check-Command "Connexion PostgreSQL erreur" $false
}

try {
    $tablesCount = docker exec museum-database-prod psql -U museum_admin -d museumvoice -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>$null
    $tablesCount = $tablesCount.Trim()
    if ([int]$tablesCount -gt 0) {
        Check-Command "Tables créées ($tablesCount tables)" $true
    } else {
        Check-Command "Aucune table trouvée" $false
    }
} catch {
    Check-Command "Vérification tables échouée" $false
}

Write-Host ""

# ============================================
# 9. VERIFIER GUNICORN CONFIG
# ============================================
Write-Host "🦄 9. Gunicorn Configuration" -ForegroundColor Yellow
Write-Host "----------------------------"

try {
    $workersOutput = docker exec museum-backend-prod ps aux 2>$null | Select-String "gunicorn.*worker"
    $workersCount = ($workersOutput | Measure-Object).Count
    Write-Host "   📊 Workers actifs: $workersCount" -ForegroundColor Gray
    
    if ($workersCount -gt 0) {
        Check-Command "Gunicorn workers running" $true
    } else {
        Check-Command "Aucun worker Gunicorn" $false
    }
} catch {
    Check-Command "Vérification Gunicorn échouée" $false
}

Write-Host ""

# ============================================
# RESUME
# ============================================
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "📊 RÉSUMÉ VÉRIFICATION" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ Tests réussis: $PASSED" -ForegroundColor Green
Write-Host "❌ Tests échoués: $FAILED" -ForegroundColor Red
Write-Host ""

if ($FAILED -eq 0) {
    Write-Host "🎉 ENVIRONNEMENT PRODUCTION VALIDÉ" -ForegroundColor Green
    Write-Host ""
    Write-Host "Prochaines étapes:" -ForegroundColor Cyan
    Write-Host "  1. Tester génération parcours" -ForegroundColor Gray
    Write-Host "  2. Tester TTS audio" -ForegroundColor Gray
    Write-Host "  3. Configurer backup automatique PostgreSQL" -ForegroundColor Gray
    exit 0
} else {
    Write-Host "⚠️  ERREURS DÉTECTÉES" -ForegroundColor Red
    Write-Host ""
    Write-Host "Vérifiez les logs:" -ForegroundColor Yellow
    Write-Host "  docker compose -f docker-compose.prod.yml logs -f" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Commandes utiles:" -ForegroundColor Yellow
    Write-Host "  docker ps                    # Status containers" -ForegroundColor Gray
    Write-Host "  docker stats                 # Ressources en temps réel" -ForegroundColor Gray
    Write-Host "  docker logs <container>      # Logs spécifiques" -ForegroundColor Gray
    exit 1
}
