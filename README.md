# 🎫 Ticketizy - Gestionnaire d'Étiquettes d'Expédition

## Description

Ticketizy est une application Electron qui permet d'extraire automatiquement les données des étiquettes de produits (notamment LG) via OCR et de générer des étiquettes d'expédition personnalisées.

## Fonctionnalités

### 🔍 Extraction OCR Avancée
- **Reconnaissance de texte** avec Tesseract.js
- **Correction automatique d'angle** pour les images prises sous différents angles
- **Prétraitement d'image** optimisé pour les étiquettes LG
- **Extraction automatique** des données clés :
  - W/O (Work Order)
  - S/N (Serial Number)
  - Code-barre
  - Modèle du produit
  - Puissance

### 📊 Gestion des Données
- **Historique complet** des extractions
- **Export Excel** avec toutes les données
- **Interface intuitive** avec drag & drop
- **Validation des données** extraites

### 🏷️ Génération d'Étiquettes
- **Création automatique** d'étiquettes d'expédition
- **Format personnalisable** basé sur le modèle fourni
- **Codes de suivi** générés automatiquement

## Installation

### Prérequis
- Node.js (version 16 ou supérieure)
- npm ou yarn

### Installation des dépendances
```bash
npm install
```

### Lancement de l'application
```bash
npm start
```

## Utilisation

### 1. Import d'Images
- **Drag & Drop** : Glissez vos images directement dans la zone dédiée
- **Sélection manuelle** : Cliquez sur "Sélectionner des fichiers"
- **Formats supportés** : JPG, JPEG, PNG

### 2. Traitement OCR
L'application va automatiquement :
- Corriger l'angle de l'image si nécessaire
- Améliorer le contraste et la netteté
- Extraire le texte via OCR
- Identifier et extraire les données clés

### 3. Visualisation des Résultats
Les données extraites s'affichent dans des cartes :
- **W/O** : Numéro de commande de travail
- **S/N** : Numéro de série
- **Code Barre** : Code-barre du produit

### 4. Export et Génération
- **Export Excel** : Sauvegarde toutes les données dans un fichier Excel
- **Génération d'étiquette** : Crée une étiquette d'expédition personnalisée

### 5. Historique
- **Consultation** : Tous les traitements sont sauvegardés
- **Régénération** : Possibilité de régénérer une étiquette depuis l'historique
- **Suppression** : Gestion des entrées de l'historique

## Formats d'Étiquettes Supportés

L'application est optimisée pour les étiquettes LG avec les patterns suivants :

### Modèles de Produits
- `OLED65G45LW` (format standard)
- `OLED77C54LA` (format large)

### Codes de Série
- Format : `406MABT8VG05` (12 caractères)
- Pattern : `\d{3}[A-Z]{3}[A-Z0-9]{2}[A-Z0-9]{2}`

### Codes de Travail
- Format : `4GMGL05L` (8 caractères)
- Pattern : `4[A-Z]{4}[A-Z0-9]{3,4}`

## Structure du Projet

```
Ticketizy/
├── src/
│   ├── index.js          # Processus principal Electron
│   ├── index.html        # Interface utilisateur
│   ├── index.css         # Styles CSS
│   ├── renderer.js       # Logique de l'interface
│   ├── preload.js        # Script de préchargement
│   └── ocr-utils.js      # Utilitaires OCR
├── temp/
│   └── appareil/         # Images d'exemple
├── output/               # Étiquettes générées
└── package.json
```

## Configuration

### Variables d'Environnement
```bash
NODE_ENV=development  # Active les DevTools
```

### Personnalisation des Patterns
Les patterns d'extraction peuvent être modifiés dans `src/renderer.js` :

```javascript
// Exemple de pattern personnalisé
const customPatterns = [
    /VOTRE_PATTERN_ICI/,
    /AUTRE_PATTERN/
];
```

## Développement

### Scripts Disponibles
```bash
npm start          # Lance l'application en mode développement
npm run package    # Package l'application
npm run make       # Crée les installateurs
npm run publish    # Publie l'application
```

### Ajout de Nouveaux Formats
1. Modifiez les patterns dans `src/renderer.js`
2. Ajoutez les régions d'intérêt dans `src/ocr-utils.js`
3. Testez avec vos images

## Dépannage

### Problèmes Courants

#### OCR ne fonctionne pas
- Vérifiez que l'image est de bonne qualité
- Assurez-vous que le texte est lisible
- Essayez de recadrer l'image

#### Données non extraites
- Vérifiez que l'étiquette correspond aux patterns définis
- Améliorez la qualité de l'image
- Vérifiez l'angle de prise de vue

#### Erreur de mémoire
- Redimensionnez les images avant traitement
- Fermez d'autres applications
- Redémarrez l'application

## Contribution

1. Fork le projet
2. Créez une branche pour votre fonctionnalité
3. Committez vos changements
4. Poussez vers la branche
5. Ouvrez une Pull Request

## Licence

MIT License - voir le fichier LICENSE pour plus de détails.

## Support

Pour toute question ou problème :
- Ouvrez une issue sur GitHub
- Contactez l'équipe de développement

---

**Ticketizy** - Simplifiez la gestion de vos étiquettes d'expédition ! 🎫 