!macro customInstall
  ; Copier le modèle d'étiquette dans le dossier des données utilisateur
  
  ; Créer le dossier des données utilisateur
  SetShellVarContext current
  StrCpy $R1 "$APPDATA\Ticketizy"
  CreateDirectory "$R1"
  
  ; Copier le modèle depuis les ressources de l'application
  CopyFiles "$INSTDIR\resources\app\ModeleEtiquetteExportation2.png" "$R1\ModeleEtiquetteExportation2.png"
  
  ; Vérifier si la copie a réussi
  IfFileExists "$R1\ModeleEtiquetteExportation2.png" 0 +3
    DetailPrint "Modèle d'étiquette copié avec succès"
    Goto +2
    DetailPrint "Erreur lors de la copie du modèle d'étiquette"
!macroend

!macro customUnInstall
  ; Supprimer le modèle lors de la désinstallation
  SetShellVarContext current
  Delete "$APPDATA\Ticketizy\ModeleEtiquetteExportation2.png"
  RMDir "$APPDATA\Ticketizy"
!macroend 