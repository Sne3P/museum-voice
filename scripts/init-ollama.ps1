# Script PowerShell d'initialisation Ollama
# Pull automatique modèle Mistral

Write-Host "`n🤖 Initialisation Ollama..." -ForegroundColor Cyan

# Attendre qu'Ollama soit prêt
$maxRetries = 30
$retryCount = 0

while ($retryCount -lt $maxRetries) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -TimeoutSec 2 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Ollama est prêt!" -ForegroundColor Green
            break
        }
    } catch {
        Write-Host "⏳ Attente Ollama... ($retryCount/$maxRetries)" -ForegroundColor Yellow
        Start-Sleep -Seconds 2
        $retryCount++
    }
}

if ($retryCount -eq $maxRetries) {
    Write-Host "❌ Timeout: Ollama non disponible après $maxRetries tentatives" -ForegroundColor Red
    exit 1
}

# Vérifier si mistral est déjà installé
$models = docker exec museum-ollama ollama list 2>&1

if ($models -match "mistral") {
    Write-Host "✅ Modèle mistral déjà installé" -ForegroundColor Green
} else {
    Write-Host "`n📥 Pull du modèle mistral (~4GB)..." -ForegroundColor Cyan
    Write-Host "   Cela peut prendre 5-10 minutes selon la connexion..." -ForegroundColor Yellow
    
    docker exec museum-ollama ollama pull mistral
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Modèle mistral installé avec succès!" -ForegroundColor Green
    } else {
        Write-Host "❌ Erreur lors du pull du modèle" -ForegroundColor Red
        exit 1
    }
}

# Vérifier la liste des modèles
Write-Host "`n📋 Modèles Ollama installés:" -ForegroundColor Cyan
docker exec museum-ollama ollama list

Write-Host "`n🎉 Ollama prêt à l'emploi!" -ForegroundColor Green
