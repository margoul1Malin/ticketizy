const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');
const fs = require('fs');
const XLSX = require('xlsx');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Ouvrir les DevTools seulement en développement
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Gestion des événements IPC
ipcMain.handle('save-excel-file', async (event, buffer) => {
  try {
    const result = await dialog.showSaveDialog({
      title: 'Sauvegarder le fichier Excel',
      defaultPath: `ticketizy_export_${new Date().toISOString().split('T')[0]}.xlsx`,
      filters: [
        { name: 'Fichiers Excel', extensions: ['xlsx'] }
      ]
    });

    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, buffer);
      return result.filePath;
    }
    return null;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde Excel:', error);
    throw error;
  }
});

ipcMain.handle('generate-shipping-label', async (event, data) => {
  try {
    const labelPath = await generateShippingLabel(data);
    return labelPath;
  } catch (error) {
    console.error('Erreur lors de la génération d\'étiquette:', error);
    throw error;
  }
});

// Handler pour obtenir le chemin des données utilisateur
ipcMain.handle('get-user-data-path', () => {
  return app.getPath('userData');
});

// Handler pour copier le modèle d'étiquette
ipcMain.handle('copy-model-image', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const modelDestPath = path.join(userDataPath, 'ModeleEtiquetteExportation2.png');
    
    // Vérifier si le modèle existe déjà
    if (fs.existsSync(modelDestPath)) {
      return modelDestPath;
    }
    
    // Essayer de copier depuis différents emplacements
    const possiblePaths = [
      path.join(__dirname, 'ModeleEtiquetteExportation2.png'),
      path.join(__dirname, '..', 'ModeleEtiquetteExportation2.png'),
      path.join(__dirname, '..', '..', 'ModeleEtiquetteExportation2.png')
    ];
    
    for (const sourcePath of possiblePaths) {
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, modelDestPath);
        console.log('Modèle copié vers:', modelDestPath);
        return modelDestPath;
      }
    }
    
    throw new Error('Modèle d\'étiquette non trouvé dans les ressources');
  } catch (error) {
    console.error('Erreur lors de la copie du modèle:', error);
    throw error;
  }
});

// Fonction pour générer l'étiquette d'expédition
async function generateShippingLabel(data) {
  try {
    // Création du dossier de sortie dans les données utilisateur
    const userDataPath = app.getPath('userData');
    const outputDir = path.join(userDataPath, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Génération du nom de fichier avec le format MODEL_WO_SN
    const model = data.model || 'UNKNOWN';
    const wo = data.wo || 'UNKNOWN';
    const sn = data.sn || 'UNKNOWN';
    
    // Nettoyer les caractères pour le nom de fichier (remplacer les caractères spéciaux)
    const cleanModel = model.replace(/[^a-zA-Z0-9]/g, '_');
    const cleanWO = wo.replace(/[^a-zA-Z0-9]/g, '_');
    const cleanSN = sn.replace(/[^a-zA-Z0-9]/g, '_');
    
    const fileName = `${cleanModel}_${cleanWO}_${cleanSN}.png`;
    const labelPath = path.join(outputDir, fileName);

    // Création de l'étiquette avec les données extraites
    await createLabelImage(data, labelPath);

    return labelPath;
  } catch (error) {
    console.error('Erreur lors de la génération d\'étiquette:', error);
    throw error;
  }
}

// Fonction pour créer l'image d'étiquette avec codes-barres
async function createLabelImage(data, outputPath) {
  try {
    console.log('Création d\'étiquette avec codes-barres...');
    
    const { createCanvas, loadImage } = require('canvas');
    const JsBarcode = require('jsbarcode');
    
    // Créer un canvas pour l'étiquette avec les dimensions exactes du nouveau modèle
    const canvas = createCanvas(1000, 600); // Étiquette horizontale
    const ctx = canvas.getContext('2d');
    
    // Fond blanc
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 1000, 600);
    
    // Charger l'image du modèle d'étiquette
    let modelPath;
    try {
      console.log('=== DÉBUT RECHERCHE MODÈLE ===');
      
      // Essayer d'abord le bureau de l'utilisateur (pour test)
      const desktopPath = app.getPath('desktop');
      console.log('Chemin du bureau:', desktopPath);
      modelPath = path.join(desktopPath, 'ModeleEtiquetteExportation2.png');
      console.log('Tentative de chargement du modèle (bureau):', modelPath);
      console.log('Le fichier existe sur le bureau ?', fs.existsSync(modelPath));
      
      if (!fs.existsSync(modelPath)) {
        console.log('❌ Modèle non trouvé sur le bureau');
        
        // Si pas trouvé sur le bureau, essayer le dossier utilisateur (après installation)
        const userDataPath = app.getPath('userData');
        console.log('Chemin des données utilisateur:', userDataPath);
        modelPath = path.join(userDataPath, 'ModeleEtiquetteExportation2.png');
        console.log('Tentative de chargement du modèle (dossier utilisateur):', modelPath);
        console.log('Le fichier existe dans userData ?', fs.existsSync(modelPath));
        
        if (!fs.existsSync(modelPath)) {
          console.log('❌ Modèle non trouvé dans userData');
          
          // Si pas trouvé, essayer le chemin relatif (pour le développement)
          modelPath = path.join(__dirname, '..', 'ModeleEtiquetteExportation2.png');
          console.log('Chemin __dirname:', __dirname);
          console.log('Tentative de chargement du modèle (développement):', modelPath);
          console.log('Le fichier existe en développement ?', fs.existsSync(modelPath));
          
          if (!fs.existsSync(modelPath)) {
            console.log('❌ Modèle non trouvé en développement');
            
            // Si pas trouvé, essayer le chemin dans les ressources de l'app
            modelPath = path.join(__dirname, 'ModeleEtiquetteExportation2.png');
            console.log('Tentative de chargement du modèle (ressources):', modelPath);
            console.log('Le fichier existe dans les ressources ?', fs.existsSync(modelPath));
            
            if (!fs.existsSync(modelPath)) {
              console.log('❌ Modèle non trouvé dans les ressources');
              console.log('Aucun modèle trouvé');
              modelPath = null;
            } else {
              console.log('✅ Modèle trouvé dans les ressources');
            }
          } else {
            console.log('✅ Modèle trouvé en développement');
          }
        } else {
          console.log('✅ Modèle trouvé dans userData');
        }
      } else {
        console.log('✅ Modèle trouvé sur le bureau');
      }
      
      console.log('=== FIN RECHERCHE MODÈLE ===');
    } catch (error) {
      console.log('❌ Erreur lors de la recherche du modèle:', error.message);
      modelPath = null;
    }
    let modelImage;
    try {
      if (modelPath && fs.existsSync(modelPath)) {
        modelImage = await loadImage(modelPath);
        // Dessiner le modèle en arrière-plan avec les dimensions exactes
        ctx.drawImage(modelImage, 0, 0, 1000, 600);
        console.log('Modèle d\'étiquette chargé avec succès:', modelPath);
      } else {
        throw new Error('Modèle non trouvé');
      }
    } catch (error) {
      console.log('Modèle d\'étiquette non trouvé, création d\'une étiquette basique. Erreur:', error.message);
      // Si le modèle n'existe pas, créer une étiquette basique
      ctx.fillStyle = 'black';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('ÉTIQUETTE D\'EXPÉDITION', 400, 50);
    }
    
    // Générer le numéro de colis (A1 avec les 4 derniers caractères du S/N)
    const last4Chars = data.sn ? data.sn.substring(8, 12) : 'XXXX';
    const packageNumber = `014454078${last4Chars}EUQLJP`;
    
    // Générer les codes-barres horizontaux selon les dimensions de l'étiquette
    const snBarcodeCanvas = createCanvas(300, 80);
    const packageBarcodeCanvas = createCanvas(400, 100);
    
    try {
      // Grand code-barre (numéro de colis) - en haut
      JsBarcode(packageBarcodeCanvas, packageNumber, {
        format: 'CODE128',
        width: 2,
        height: 80,
        displayValue: true,
        fontSize: 18, // Police plus grande pour le texte
        margin: 5
      });
      
      // Moyen code-barre (S/N) - en dessous
      JsBarcode(snBarcodeCanvas, data.sn || 'XXXXXXXXXXXX', {
        format: 'CODE128',
        width: 1.5,
        height: 60,
        displayValue: true,
        fontSize: 12,
        margin: 3
      });
    } catch (error) {
      console.error('Erreur lors de la génération des codes-barres:', error);
    }
    
    // Positionner les codes-barres horizontaux sur l'étiquette
    // Grand code-barre (numéro de colis) en haut - encore plus remonté
    ctx.drawImage(packageBarcodeCanvas, 220, 50, 600, 100);
    
    // Moyen code-barre (S/N) en dessous - encore plus remonté
    ctx.drawImage(snBarcodeCanvas, 260, 180, 400, 80);
    
    // Ajouter les textes selon le nouveau modèle
    ctx.fillStyle = 'black';
    
    // Référence produit à gauche (rotation -90° pour être à l'endroit)
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(80, 300);
    ctx.rotate(-Math.PI / 2); // Rotation de -90 degrés pour être à l'endroit
    ctx.fillText(data.model || 'XXXXXXXXXXX', 0, 0);
    ctx.restore();
    
    // Référence produit à gauche (rotation -90° pour être à l'endroit) mais en plus petit au dessus du W/0
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(100, 500);
    ctx.rotate(-Math.PI / 2); // Rotation de -90 degrés pour être à l'endroit
    ctx.fillText(data.model || 'XXXXXXXXXXX', 0, 0);
    ctx.restore();

    // W/O en bas à côté de la référence produit (rotation 90°)
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(120, 500);
    ctx.rotate(-Math.PI / 2); // Rotation de -90 degrés
    ctx.fillText(`W/O: ${data.wo || 'XXXXXXXX'}`, 0, 0);
    ctx.restore();
    
    // Rotation finale de 90° de toute l'étiquette
    const rotatedCanvas = createCanvas(600, 1000); // Dimensions inversées après rotation
    const rotatedCtx = rotatedCanvas.getContext('2d');
    
    // Fond blanc pour l'étiquette rotée
    rotatedCtx.fillStyle = 'white';
    rotatedCtx.fillRect(0, 0, 600, 1000);
    
    // Appliquer la rotation de 90°
    rotatedCtx.save();
    rotatedCtx.translate(300, 400); // Centre de rotation
    rotatedCtx.rotate(Math.PI / 2); // Rotation de 90°
    rotatedCtx.drawImage(canvas, -400, -300); // Dessiner l'étiquette centrée
    rotatedCtx.restore();
    
    // Sauvegarder l'image rotée
    const buffer = rotatedCanvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    
    console.log('Étiquette générée et rotée:', outputPath);
    return outputPath;
  } catch (error) {
    console.error('Erreur lors de la création de l\'étiquette:', error);
    throw error;
  }
}

// Fonction pour générer un code de suivi
function generateTrackingCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Gestion des événements du renderer
ipcMain.on('save-excel-file', async (event, buffer) => {
  try {
    const filePath = await event.sender.invoke('save-excel-file', buffer);
    if (filePath) {
      event.sender.send('excel-saved', filePath);
    }
  } catch (error) {
    event.sender.send('error', error.message);
  }
});

ipcMain.on('generate-shipping-label', async (event, data) => {
  try {
    const filePath = await generateShippingLabel(data);
    event.sender.send('label-generated', filePath);
  } catch (error) {
    event.sender.send('error', error.message);
  }
});

// Gestion de la sauvegarde des rapports
ipcMain.handle('save-report', async (event, reportData) => {
  try {
    const reportContent = `Rapport de lecture Ticketizy
Généré le: ${new Date(reportData.timestamp).toLocaleString('fr-FR')}
Modèle d'appareil: ${reportData.deviceModel}

=== NOUVEAUX S/N ===
${reportData.newSN.map(item => `- S/N: ${item.sn} | W/O: ${item.wo} | Fichier: ${item.filename}`).join('\n')}

=== S/N SANS W/O ===
${reportData.snWithoutWO.map(item => `- S/N: ${item.sn} | Fichier: ${item.filename}`).join('\n')}

=== S/N NON LISIBLES ===
${reportData.unreadableSN.map(item => `- Fichier: ${item.filename} | Erreur: ${item.error}`).join('\n')}

Total nouveaux S/N: ${reportData.newSN.length}
Total S/N sans W/O: ${reportData.snWithoutWO.length}
Total S/N non lisibles: ${reportData.unreadableSN.length}`;

    const filePath = path.join(__dirname, '..', 'temp', `rapport_${Date.now()}.txt`);
    fs.writeFileSync(filePath, reportContent);
    
    return filePath;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du rapport:', error);
    throw error;
  }
});
