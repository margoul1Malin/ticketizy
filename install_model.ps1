# Script PowerShell pour installer le modèle d'étiquette
# Ce script copie ModeleEtiquetteExportation2.png dans le dossier AppData\Roaming\Ticketizy

param(
    [string]$ModelPath = "ModeleEtiquetteExportation2.png"
)

Write-Host "=== Installation du modèle d'étiquette Ticketizy ===" -ForegroundColor Green

# Vérifier si le fichier modèle existe
if (-not (Test-Path $ModelPath)) {
    Write-Host "❌ Erreur: Le fichier $ModelPath n'existe pas dans le répertoire courant" -ForegroundColor Red
    Write-Host "Assurez-vous que le fichier ModeleEtiquetteExportation2.png est présent dans le même dossier que ce script" -ForegroundColor Yellow
    exit 1
}

# Obtenir le chemin AppData\Roaming
$AppDataPath = [Environment]::GetFolderPath("ApplicationData")
$TicketizyPath = Join-Path $AppDataPath "Ticketizy"

Write-Host "Chemin AppData\Roaming: $AppDataPath" -ForegroundColor Cyan
Write-Host "Dossier Ticketizy: $TicketizyPath" -ForegroundColor Cyan

# Créer le dossier Ticketizy s'il n'existe pas
if (-not (Test-Path $TicketizyPath)) {
    Write-Host "Création du dossier Ticketizy..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $TicketizyPath -Force | Out-Null
    Write-Host "✅ Dossier Ticketizy créé" -ForegroundColor Green
} else {
    Write-Host "✅ Dossier Ticketizy existe déjà" -ForegroundColor Green
}

# Copier le fichier modèle
$DestinationPath = Join-Path $TicketizyPath "ModeleEtiquetteExportation2.png"

try {
    Copy-Item -Path $ModelPath -Destination $DestinationPath -Force
    Write-Host "✅ Modèle copié avec succès vers: $DestinationPath" -ForegroundColor Green
    
    # Vérifier que le fichier a bien été copié
    if (Test-Path $DestinationPath) {
        $FileSize = (Get-Item $DestinationPath).Length
        Write-Host "Taille du fichier copié: $($FileSize) octets" -ForegroundColor Cyan
        Write-Host "✅ Installation terminée avec succès!" -ForegroundColor Green
    } else {
        Write-Host "❌ Erreur: Le fichier n'a pas été copié correctement" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Erreur lors de la copie: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Le modèle d'étiquette est maintenant installé et l'application Ticketizy pourra le trouver." -ForegroundColor Green
Write-Host "Vous pouvez maintenant lancer l'application Ticketizy." -ForegroundColor Green 