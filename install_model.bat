@echo off
chcp 65001 >nul
title Installation du modèle Ticketizy

echo.
echo ========================================
echo    Installation du modèle Ticketizy
echo ========================================
echo.

REM Vérifier si le fichier modèle existe
if not exist "ModeleEtiquetteExportation2.png" (
    echo ❌ ERREUR: Le fichier ModeleEtiquetteExportation2.png n'existe pas
    echo.
    echo Assurez-vous que ce fichier est présent dans le même dossier que ce script.
    echo.
    pause
    exit /b 1
)

echo ✅ Fichier modèle trouvé
echo.

REM Obtenir le chemin AppData\Roaming
set "APPDATA_PATH=%APPDATA%"
set "TICKETIZY_PATH=%APPDATA_PATH%\Ticketizy"

echo Chemin AppData\Roaming: %APPDATA_PATH%
echo Dossier Ticketizy: %TICKETIZY_PATH%
echo.

REM Créer le dossier Ticketizy s'il n'existe pas
if not exist "%TICKETIZY_PATH%" (
    echo Création du dossier Ticketizy...
    mkdir "%TICKETIZY_PATH%"
    echo ✅ Dossier Ticketizy créé
) else (
    echo ✅ Dossier Ticketizy existe déjà
)

echo.

REM Copier le fichier modèle
set "DESTINATION_PATH=%TICKETIZY_PATH%\ModeleEtiquetteExportation2.png"

echo Copie du modèle en cours...
copy "ModeleEtiquetteExportation2.png" "%DESTINATION_PATH%" >nul 2>&1

REM Vérifier que la copie s'est bien passée
if exist "%DESTINATION_PATH%" (
    echo ✅ Modèle copié avec succès
    echo.
    echo Le modèle d'étiquette est maintenant installé !
    echo L'application Ticketizy pourra le trouver automatiquement.
    echo.
    echo Vous pouvez maintenant lancer l'application Ticketizy.
    echo.
) else (
    echo ❌ ERREUR: La copie a échoué
    echo.
    echo Vérifiez que vous avez les droits d'écriture dans le dossier AppData.
    echo.
)

pause 