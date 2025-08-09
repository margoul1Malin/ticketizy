const { ipcRenderer } = require('electron');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

class TicketizyApp {
    constructor() {
        this.currentResults = null;
        this.processedFiles = [];
        this.existingExcelData = null;
        this.reportData = {
            newSN: [],
            snWithoutWO: [],
            unreadableSN: []
        };
        this.init();
    }

    init() {
        // Attendre que le DOM soit prêt
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupEventListeners();
            });
        } else {
            this.setupEventListeners();
        }
        this.jsonData = null;
        this.notificationId = 0;
    }

    // Navigation entre les pages
    switchPage(pageName) {
        // Masquer toutes les pages
        document.querySelectorAll('.page').forEach(page => {
            page.style.display = 'none';
        });

        // Désactiver tous les boutons de navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Afficher la page sélectionnée
        const targetPage = document.getElementById(pageName + 'Page');
        if (targetPage) {
            targetPage.style.display = 'block';
        }

        // Activer le bouton de navigation correspondant
        const activeBtn = document.querySelector(`[data-page="${pageName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // Charger automatiquement le JSON si on va sur la page d'édition
        if (pageName === 'edit') {
            this.loadJsonIntoEditor();
        }

        // Charger les options de génération si on va sur la page de génération
        if (pageName === 'generate') {
            this.loadGenerateOptions().catch(error => {
                console.error('Erreur lors du chargement des options de génération:', error);
            });
        }
    }

    // Système de notifications
    showNotification(type, title, message, duration = 5000) {
        const container = document.getElementById('notificationContainer');
        const notification = document.createElement('div');
        const id = ++this.notificationId;
        
        notification.className = `notification ${type}`;
        notification.id = `notification-${id}`;
        
        const icon = this.getNotificationIcon(type);
        
        notification.innerHTML = `
            <div class="notification-icon">${icon}</div>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        container.appendChild(notification);
        
        // Auto-suppression après la durée spécifiée
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 300);
            }
        }, duration);
        
        return id;
    }

    getNotificationIcon(type) {
        switch (type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            default: return 'ℹ️';
        }
    }

    setupEventListeners() {
        // Navigation entre les pages
        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchPage(btn.dataset.page);
            });
        });

        // Gestion du drag & drop
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const selectFilesBtn = document.getElementById('selectFilesBtn');

        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });

            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('dragover');
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
                const files = Array.from(e.dataTransfer.files);
                this.processFiles(files);
            });
        }

        if (selectFilesBtn && fileInput) {
            selectFilesBtn.addEventListener('click', () => {
                fileInput.click();
            });

            fileInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                this.processFiles(files);
            });
        }

        // Configuration API
        const apiKeyInput = document.getElementById('apiKeyInput');
        const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
        
        if (apiKeyInput && saveApiKeyBtn) {
            // Charger la clé API sauvegardée
            const savedApiKey = localStorage.getItem('geminiApiKey');
            if (savedApiKey) {
                apiKeyInput.value = savedApiKey;
            }
            
            saveApiKeyBtn.addEventListener('click', () => {
                const apiKey = apiKeyInput.value.trim();
                if (apiKey) {
                    localStorage.setItem('geminiApiKey', apiKey);
                    this.showNotification('success', 'Succès', 'Clé API sauvegardée avec succès !');
                } else {
                    this.showNotification('error', 'Erreur', 'Veuillez entrer une clé API valide.');
                }
            });
        }

        // Boutons d'action pour la page Import
        const importToJsonBtn = document.getElementById('importToJsonBtn');
        if (importToJsonBtn) {
            importToJsonBtn.addEventListener('click', () => {
                this.importToJson();
            });
        }

        const generateLabelBtn = document.getElementById('generateLabelBtn');
        if (generateLabelBtn) {
            generateLabelBtn.addEventListener('click', () => {
                this.generateShippingLabel();
            });
        }

        const generateAllLabelsBtn = document.getElementById('generateAllLabelsBtn');
        if (generateAllLabelsBtn) {
            generateAllLabelsBtn.addEventListener('click', () => {
                this.generateAllLabels();
            });
        }

        // Boutons d'action pour la page Édition JSON
        const loadJsonBtn = document.getElementById('loadJsonBtn');
        if (loadJsonBtn) {
            loadJsonBtn.addEventListener('click', () => {
                this.loadJsonFile();
            });
        }

        const saveJsonBtn = document.getElementById('saveJsonBtn');
        if (saveJsonBtn) {
            saveJsonBtn.addEventListener('click', () => {
                console.log('Bouton sauvegarder JSON cliqué');
                this.saveJsonFile();
            });
        }

        const generateLabelsFromJsonBtn = document.getElementById('generateLabelsFromJsonBtn');
        if (generateLabelsFromJsonBtn) {
            generateLabelsFromJsonBtn.addEventListener('click', () => {
                this.generateLabelsFromJson();
            });
        }

        // Bouton pour ajouter une étiquette
        const addEtiquetteBtn = document.getElementById('addEtiquetteBtn');
        if (addEtiquetteBtn) {
            addEtiquetteBtn.addEventListener('click', () => {
                console.log('Bouton ajouter étiquette cliqué');
                this.showAddEtiquetteModal();
            });
        }

        // Event listeners pour les modales
        const modalCloseBtn = document.getElementById('modalCloseBtn');
        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }

        const modalCancelBtn = document.getElementById('modalCancelBtn');
        if (modalCancelBtn) {
            modalCancelBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }

        // Gestion de la page de génération
        const generateLabelsBtn = document.getElementById('generateLabelsBtn');
        if (generateLabelsBtn) {
            generateLabelsBtn.addEventListener('click', () => {
                this.generateLabelsFromSelection();
            });
        }

        // Gestion des options de génération
        const generateOptions = document.querySelectorAll('input[name="generateOption"]');
        if (generateOptions.length > 0) {
            generateOptions.forEach(radio => {
                radio.addEventListener('change', () => {
                    this.updateGenerateOptions();
                });
            });
        }
    }

    async processFiles(files) {
        const imageFiles = files.filter(file => 
            file.type.startsWith('image/') && 
            ['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)
        );

        if (imageFiles.length === 0) {
            this.showNotification('error', 'Erreur', 'Aucune image valide sélectionnée. Formats acceptés : JPG, JPEG, PNG');
            return;
        }



        this.showProcessing(true);
        this.processedFiles = [];
        this.reportData = {
            newSN: [],
            snWithoutWO: [],
            unreadableSN: []
        };
        
        for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
            const result = await this.processImage(file, i + 1, imageFiles.length);
            if (result) {
                this.processedFiles.push(result);
            }
        }

        this.showProcessing(false);
        this.showResults();
    }

    // Analyser le fichier Excel existant pour extraire les patterns
    async loadExistingExcelFile(file) {
        try {
            const buffer = await this.readFileAsBuffer(file);
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            
            this.existingExcelData = {};
            
            // Analyser chaque feuille
            workbook.SheetNames.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                console.log(`Analyse de la feuille ${sheetName}:`, data);
                
                if (data.length > 2) { // Au moins ligne 1 (global ID) + ligne 2 (W/O) + ligne 3 (patterns)
                    // Ligne 2 : W/O en en-têtes de colonnes (A2 = 'W/O', B2+ = W/O codes)
                    const woRow = data[1] || [];
                    // Ligne 3 : Patterns sous les W/O (A3 = vide, B3+ = patterns)
                    const patternRow = data[2] || [];
                    
                    const patterns = [];
                    
                    // Analyser chaque colonne pour extraire W/O et pattern
                    for (let colIndex = 1; colIndex < woRow.length; colIndex++) { // Commencer à 1 car A2 = 'W/O'
                        const wo = woRow[colIndex];
                        const pattern = patternRow[colIndex];
                        
                        if (wo && typeof wo === 'string' && wo.length === 8) {
                            // C'est un W/O valide
                            patterns.push({
                                column: colIndex,
                                wo: wo,
                                pattern: pattern || this.generatePatternFromSN(wo) // Pattern ou générer un pattern par défaut
                            });
                        }
                    }
                    
                    this.existingExcelData[sheetName] = {
                        patterns: patterns,
                        data: data // Garder toutes les données
                    };
                    
                    console.log(`Patterns trouvés pour ${sheetName}:`, patterns);
                }
            });
            
            console.log('Fichier Excel analysé:', this.existingExcelData);
            this.showNotification('success', 'Succès', 'Fichier Excel chargé avec succès !');
            
            // Afficher le bouton de génération d'étiquettes
            document.getElementById('excelActions').style.display = 'block';
            
        } catch (error) {
            console.error('Erreur lors du chargement du fichier Excel:', error);
            this.showNotification('error', 'Erreur', 'Erreur lors du chargement du fichier Excel: ' + error.message);
        }
    }

    // Extraire un pattern de S/N d'une chaîne
    extractSNPattern(text) {
        // Chercher des patterns comme 404MAXXQ0XXX, 406MABT8VG05, etc.
        const patternMatch = text.match(/(\d{3}[A-Z]{3}[A-Z0-9]{2}[A-Z0-9]{2})/);
        return patternMatch ? patternMatch[1] : null;
    }

    // Table de correspondance W/O ↔ S/N basée sur les préfixes
    getWOFromSN(sn) {
        if (!sn || sn.length !== 12) return null;
        
        console.log(`Recherche W/O pour S/N: ${sn}`);
        
        // Si on a un fichier Excel existant, utiliser ses patterns
        if (this.existingExcelData) {
            // Chercher dans toutes les feuilles
            for (const [sheetName, sheetData] of Object.entries(this.existingExcelData)) {
                console.log(`Recherche dans la feuille ${sheetName}:`, sheetData.patterns);
                
                for (const pattern of sheetData.patterns) {
                    console.log(`Test pattern: ${pattern.pattern} pour W/O: ${pattern.wo}`);
                    
                    if (this.snMatchesPattern(sn, pattern.pattern)) {
                        console.log(`Match trouvé! S/N ${sn} correspond au pattern ${pattern.pattern} -> W/O ${pattern.wo}`);
                        return pattern.wo;
                    }
                }
            }
        }
        
        // Fallback : correspondance par préfixe
        const prefix = sn.substring(0, 3);
        const prefixToWO = {
            '404': '4EMGL11L',
            '406': '4GMGL05L',
            '407': '4HMGLOBK',
        };
        
        const fallbackWO = prefixToWO[prefix];
        console.log(`Fallback: préfixe ${prefix} -> W/O ${fallbackWO}`);
        
        return fallbackWO || null;
    }

    // Vérifier si un S/N correspond à un pattern
    snMatchesPattern(sn, pattern) {
        if (!sn || !pattern || sn.length !== 12) return false;
        
        console.log(`Test pattern: ${pattern} (longueur: ${pattern.length}) contre S/N: ${sn}`);
        
        // Si le pattern n'a pas 12 caractères, essayer de le compléter avec des X
        let normalizedPattern = pattern;
        if (pattern.length < 12) {
            normalizedPattern = pattern + 'X'.repeat(12 - pattern.length);
        } else if (pattern.length > 12) {
            normalizedPattern = pattern.substring(0, 12);
        }
        
        console.log(`Pattern normalisé: ${normalizedPattern}`);
        
        // Comparer caractère par caractère, en ignorant les X (caractères génériques)
        for (let i = 0; i < 12; i++) {
            if (normalizedPattern[i] !== 'X' && normalizedPattern[i] !== sn[i]) {
                console.log(`Mismatch à la position ${i}: pattern[${i}]=${normalizedPattern[i]}, sn[${i}]=${sn[i]}`);
                return false;
            }
        }
        
        console.log(`Pattern ${normalizedPattern} correspond au S/N ${sn}`);
        return true;
    }

    // Fonction pour organiser les données selon la structure Excel
    organizeDataForExcel(processedFiles) {
        const organizedData = {};
        
        console.log('organizeDataForExcel - processedFiles:', processedFiles);
        
        // Vérifier que processedFiles existe et est un tableau
        if (!processedFiles || !Array.isArray(processedFiles)) {
            console.warn('processedFiles est undefined ou n\'est pas un tableau');
            return organizedData;
        }
        
        processedFiles.forEach((result, index) => {
            console.log(`organizeDataForExcel - result ${index}:`, result);
            
            if (result && result.sn && result.model) {
                console.log(`organizeDataForExcel - Processing result ${index} with sn: ${result.sn}, model: ${result.model}`);
                
                const deviceRef = this.extractDeviceReference(result.model);
                const wo = this.getWOFromSN(result.sn);
                
                console.log(`organizeDataForExcel - deviceRef: ${deviceRef}, wo: ${wo}`);
                
                if (!organizedData[deviceRef]) {
                    organizedData[deviceRef] = {
                        patterns: new Map(), // Map W/O → Pattern
                        sns: [] // S/N avec leurs W/O correspondants
                    };
                }
                
                if (wo) {
                    // Créer ou mettre à jour le pattern pour ce W/O
                    if (!organizedData[deviceRef].patterns.has(wo)) {
                        // Générer un pattern basé sur le S/N
                        const pattern = this.generatePatternFromSN(result.sn);
                        organizedData[deviceRef].patterns.set(wo, pattern);
                    }
                    
                    organizedData[deviceRef].sns.push({
                        sn: result.sn,
                        wo: wo,
                        filename: result.filename
                    });
                } else {
                    console.log(`S/N ${result.sn} sans W/O correspondant trouvé`);
                }
            } else {
                console.log(`organizeDataForExcel - Skipping result ${index} - missing sn or model:`, {
                    hasResult: !!result,
                    hasSN: !!(result && result.sn),
                    hasModel: !!(result && result.model)
                });
            }
        });
        
        console.log('organizeDataForExcel - final organizedData:', organizedData);
        return organizedData;
    }

    // Générer un pattern à partir d'un S/N
    generatePatternFromSN(sn) {
        if (!sn || sn.length !== 12) return null;
        
        // Convertir en pattern en gardant les caractères fixes
        // et en remplaçant les caractères variables par X
        let pattern = '';
        for (let i = 0; i < 12; i++) {
            const char = sn[i];
            // Les positions fixes sont généralement les préfixes (3 premiers) et certains caractères
            if (i < 3 || (i >= 6 && i < 8)) {
                pattern += char; // Caractère fixe
            } else {
                pattern += 'X'; // Caractère variable
            }
        }
        return pattern;
    }

    // Générer le numéro de colis à partir du S/N
    generatePackageNumber(sn) {
        if (!sn || sn.length !== 12) return null;
        
        // Extraire les 4 derniers caractères du S/N
        const last4Chars = sn.substring(8, 12);
        
        // Construire le numéro de colis : 014454078 + 4 derniers caractères + EUQLJP
        const packageNumber = `014454078${last4Chars}EUQLJP`;
        
        return packageNumber;
    }

    // Extraire la référence de l'appareil du modèle
    extractDeviceReference(model) {
        if (!model) return 'Unknown';
        
        // Chercher des patterns comme 65G45LW, OLED65G45LW, etc.
        const patterns = [
            /OLED(\d{2}G\d{1,2}\d{1,2}LW)/i, // OLED65G45LW → OLED65G45LW
            /(\d{2}G\d{1,2}\d{1,2}LW)/i, // 65G45LW → 65G45LW
            /(\d{2}C\d{1,2}\d{1,2}LA)/i, // 55C44LA
        ];
        
        for (const pattern of patterns) {
            const match = model.match(pattern);
            if (match) {
                // Si c'est un pattern OLED, garder le "OLED"
                if (pattern.source.includes('OLED')) {
                    return match[0]; // Retourner la chaîne complète avec OLED
                }
                return match[1] || match[0];
            }
        }
        
        // Si aucun pattern ne correspond, retourner le modèle tel quel
        return model;
    }

    async processImage(file, currentIndex, totalFiles) {
        try {
            console.log(`=== TRAITEMENT IMAGE ${currentIndex}/${totalFiles} ===`);
            console.log('Fichier:', file.name);
            console.log('Type:', file.type);
            console.log('Taille:', file.size);
            
            this.updateProgress(`Traitement de l'image ${currentIndex}/${totalFiles}`, (currentIndex / totalFiles) * 100);
            
            // Lecture de l'image
            console.log('Lecture du fichier...');
            const imageBuffer = await this.readFileAsBuffer(file);
            console.log('Fichier lu, taille buffer:', imageBuffer.byteLength);
            
            // Prétraitement de l'image
            console.log('Prétraitement...');
            const processedImage = await this.preprocessImage(imageBuffer);
            console.log('Prétraitement terminé');
            
            // OCR
            console.log('Démarrage OCR...');
            const ocrResult = await this.performOCR(processedImage);
            console.log('OCR terminé');
            
            // Extraction des données
            console.log('Extraction des données...');
            const extractedData = await this.extractDataFromOCR(ocrResult, imageBuffer);
            console.log('Données extraites:', extractedData);
            
            // Sauvegarde des résultats
            this.currentResults = {
                ...extractedData,
                timestamp: new Date().toISOString(),
                filename: file.name
            };



            
            console.log('Traitement terminé avec succès');
            return this.currentResults;

        } catch (error) {
            console.error('Erreur lors du traitement:', error);
            console.error('Stack trace:', error.stack);
            this.showNotification('error', 'Erreur', `Erreur lors du traitement de ${file.name}: ${error.message}`);
            return null;
        }
    }

    async readFileAsBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    async preprocessImage(imageBuffer) {
        try {
            console.log('Début du prétraitement d\'image');
            console.log('Type de imageBuffer:', typeof imageBuffer);
            console.log('Taille de imageBuffer:', imageBuffer.byteLength);
            
            // Pour l'instant, on retourne l'image sans traitement
            // pour éviter les problèmes avec Jimp
            console.log('Prétraitement terminé - image retournée sans modification');
            return imageBuffer;
        } catch (error) {
            console.error('Erreur lors du prétraitement:', error);
            throw error;
        }
    }

    async correctImageAngle(image) {
        // Pour l'instant, on retourne l'image sans correction
        return image;
    }

    async performOCR(imageBuffer) {
        console.log('Début de l\'extraction de texte avec Gemini');
        console.log('Type de imageBuffer pour OCR:', typeof imageBuffer);
        
        try {
            console.log('Conversion en Base64...');
            
            // Conversion du buffer en Base64
            const base64ImageData = this.bufferToBase64(imageBuffer);
            
            console.log('Préparation de la requête Gemini...');
            
            const prompt = "Extrais les informations suivantes de cette image d'étiquette :\n\n" +
                          "1. S/N (Serial Number) : Cherche après les mots 'S/N:', 'SERIAL NO:', 'SERIAL NUMBER:' et extrait le numéro de série qui suit.\n" +
                          "2. W/O (Work Order) : Cherche dans tout le texte un code de EXACTEMENT 8 caractères alphanumériques en MAJUSCULES (exemple: 4EMGL11L). Ce code n'a pas de label devant, il est isolé dans le texte.\n" +
                          "3. Référence de l'appareil : Cherche le modèle du produit (exemple: OLED65G45LW, 65G45LW, etc.)\n" +
                          "4. Puissance (Power)\n\n" +
                          "Réponds UNIQUEMENT avec les informations trouvées, sans explications supplémentaires.";

            const payload = {
                contents: [
                    {
                        role: "user",
                        parts: [
                            { text: prompt },
                            {
                                inlineData: {
                                    mimeType: "image/jpeg",
                                    data: base64ImageData
                                }
                            }
                        ]
                    }
                ],
            };

            // Récupération de la clé API Gemini
            const apiKey = localStorage.getItem('geminiApiKey');
            if (!apiKey) {
                throw new Error('Clé API Gemini non configurée. Veuillez configurer votre clé API dans la section Configuration.');
            }
            
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

            console.log('Envoi de la requête à Gemini...');
            this.updateProgress('Extraction de texte avec Gemini...', 50);
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Erreur API Gemini: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
            }

            const result = await response.json();

            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                const text = result.candidates[0].content.parts[0].text;
                console.log('Extraction Gemini terminée avec succès');
                console.log('Texte extrait:', text);
                console.log('=== DEBUG: Recherche de codes de 8 caractères ===');
                
                // Debug: chercher tous les codes de 8 caractères dans le texte
                const all8CharCodes = text.match(/[A-Z0-9]{8}/g) || [];
                console.log('Codes de 8 caractères trouvés:', all8CharCodes);
                
                return text;
            } else {
                throw new Error("Aucun texte n'a pu être extrait par Gemini");
            }
        } catch (error) {
            console.error('Erreur extraction Gemini:', error);
            throw error;
        }
    }

    bufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    async extractDataFromOCR(ocrText, imageBuffer) {
        console.log('Texte OCR extrait:', ocrText);
        
        // Correction des erreurs OCR courantes
        const correctedText = this.correctOCRText(ocrText);
        console.log('Texte OCR corrigé:', correctedText);
        
        const extractedData = {
            wo: this.extractWO(correctedText),
            sn: this.extractSN(correctedText),
            woCandidates: this.findAllWOCandidates(correctedText),
            snCandidates: this.findAllSNCandidates(correctedText),
            model: this.extractModel(correctedText),
            power: this.extractPower(correctedText)
        };

        console.log('Données extraites:', extractedData);
        return extractedData;
    }

    correctOCRText(text) {
        console.log('Correction du texte OCR...');
        
        let corrected = text;
        
        // Fonction pour tester si un code ressemble à un W/O ou S/N valide
        const isValidCode = (code, type) => {
            if (type === 'WO') {
                // W/O doit commencer par 4 et avoir 8 caractères
                return code.length === 8 && code.startsWith('4') && /^4[A-Z]{4}[A-Z0-9]{3}$/.test(code);
            } else if (type === 'SN') {
                // S/N doit avoir 12 caractères et suivre le pattern LG
                return code.length === 12 && /^\d{3}[A-Z]{3}[A-Z0-9]{2}[A-Z0-9]{2}$/.test(code);
            }
            return false;
        };
        
        // Corrections générales basées sur les confusions OCR courantes
        const generalCorrections = [
            // Confusions courantes dans les codes
            { from: /A([A-Z]{3}[A-Z0-9]{3})/g, to: '4$1' }, // A → 4 au début des codes W/O
            { from: /([A-Z0-9]{7})I([A-Z0-9]{4})/g, to: '$11$2' }, // I → 1
            { from: /([A-Z0-9]{7})1([A-Z0-9]{4})/g, to: '$1I$2' }, // 1 → I
            { from: /([A-Z0-9]{7})O([A-Z0-9]{4})/g, to: '$10$2' }, // O → 0
            { from: /([A-Z0-9]{7})0([A-Z0-9]{4})/g, to: '$1O$2' }, // 0 → O
            { from: /([A-Z0-9]{7})S([A-Z0-9]{4})/g, to: '$18$2' }, // S → 8
            { from: /([A-Z0-9]{7})8([A-Z0-9]{4})/g, to: '$1S$2' }, // 8 → S
            { from: /([A-Z0-9]{7})Z([A-Z0-9]{4})/g, to: '$12$2' }, // Z → 2
            { from: /([A-Z0-9]{7})2([A-Z0-9]{4})/g, to: '$1Z$2' }, // 2 → Z
        ];
        
        // Appliquer les corrections générales
        generalCorrections.forEach(correction => {
            corrected = corrected.replace(correction.from, correction.to);
        });
        
        // Validation intelligente des codes
        const woMatches = corrected.match(/[4A][A-Z]{3}[A-Z0-9]{3}/g) || [];
        woMatches.forEach(match => {
            if (match.length === 8) {
                // Tester les deux possibilités (4 ou A au début)
                const with4 = '4' + match.substring(1);
                const withA = 'A' + match.substring(1);
                
                if (isValidCode(with4, 'WO')) {
                    corrected = corrected.replace(match, with4);
                    console.log(`W/O corrigé: ${match} → ${with4}`);
                } else if (isValidCode(withA, 'WO')) {
                    corrected = corrected.replace(match, withA);
                    console.log(`W/O corrigé: ${match} → ${withA}`);
                }
            }
        });
        
        const snMatches = corrected.match(/\d{3}[A-Z0-9]{2}[A-Z0-9]{2}[A-Z0-9]{2}[A-Z0-9]{2}/g) || [];
        snMatches.forEach(match => {
            if (match.length === 12) {
                // Tester toutes les combinaisons possibles de corrections
                const testCorrections = [
                    { from: /8/g, to: 'S' },
                    { from: /S/g, to: '8' },
                    { from: /O/g, to: '0' },
                    { from: /0/g, to: 'O' },
                    { from: /I/g, to: '1' },
                    { from: /1/g, to: 'I' },
                    { from: /Z/g, to: '2' },
                    { from: /2/g, to: 'Z' }
                ];
                
                for (const correction of testCorrections) {
                    const correctedCode = match.replace(correction.from, correction.to);
                    if (isValidCode(correctedCode, 'SN')) {
                        corrected = corrected.replace(match, correctedCode);
                        console.log(`S/N corrigé: ${match} → ${correctedCode}`);
                        break;
                    }
                }
            }
        });
        
        console.log('Texte corrigé:', corrected);
        return corrected;
    }

    extractWO(text) {
        console.log('Recherche W/O dans:', text);
        
        // Chercher le pattern "W/O: [code]" dans le texte de Gemini
        const woMatch = text.match(/W\/O:\s*([A-Z0-9]{8})/i);
        if (woMatch) {
            console.log('W/O trouvé:', woMatch[1]);
            return woMatch[1];
        }

        console.log('Aucun W/O trouvé');
        return null;
    }

    extractSN(text) {
        console.log('Recherche S/N dans:', text);
        
        // Chercher le pattern "S/N: [code]" dans le texte de Gemini
        const snMatch = text.match(/S\/N:\s*([A-Z0-9]{12})/i);
        if (snMatch) {
            console.log('S/N trouvé:', snMatch[1]);
            return snMatch[1];
        }

        console.log('Aucun S/N trouvé');
        return null;
    }

    findAllWOCandidates(text) {
        console.log('Recherche de tous les candidats W/O...');
        
        // Chercher tous les codes de 8 caractères dans le texte
        const woMatches = text.match(/[A-Z0-9]{8}/g) || [];
        console.log('Codes de 8 caractères trouvés:', woMatches);
        
        return woMatches;
    }

    findAllSNCandidates(text) {
        console.log('Recherche de tous les candidats S/N...');
        
        // Chercher tous les codes de 12 caractères dans le texte
        const snMatches = text.match(/[A-Z0-9]{12}/g) || [];
        console.log('Codes de 12 caractères trouvés:', snMatches);
        
        return snMatches;
    }







    extractModel(text) {
        console.log('Recherche de la référence appareil dans:', text);
        
        // Chercher le pattern "Appareil: [référence]" dans le texte de Gemini
        const modelMatch = text.match(/Appareil:\s*([A-Z0-9]+)/i);
        if (modelMatch) {
            console.log('Référence appareil trouvée:', modelMatch[1]);
            return modelMatch[1];
        }

        console.log('Aucune référence appareil trouvée');
        return null;
    }

    extractPower(text) {
        // Recherche de la puissance
        const powerPatterns = [
            /POWER:\s*([A-Z0-9\s~]+W)/i,
            /TYPICAL POWER:\s*(\d+\s*W)/i
        ];

        for (const pattern of powerPatterns) {
            const match = text.match(pattern);
            if (match) return match[1];
        }

        return null;
    }

    showProcessing(show) {
        const processingSection = document.getElementById('processingSection');
        const importSection = document.querySelector('.import-section');
        const resultsSection = document.getElementById('resultsSection');

        if (show) {
            processingSection.style.display = 'block';
            importSection.style.display = 'none';
            resultsSection.style.display = 'none';
        } else {
            processingSection.style.display = 'none';
            importSection.style.display = 'block';
        }
    }

    updateProgress(text, percentage) {
        const progressText = document.getElementById('progressText');
        const progressFill = document.getElementById('progressFill');
        
        progressText.textContent = text;
        progressFill.style.width = `${percentage}%`;
    }

    showResults() {
        const resultsSection = document.getElementById('resultsSection');
        resultsSection.style.display = 'block';

        // Afficher un résumé de tous les fichiers traités
        if (this.processedFiles.length > 0) {
            let summaryHTML = '<h3>📋 Résumé du traitement</h3>';
            summaryHTML += '<div class="results-summary">';
            
            this.processedFiles.forEach((result, index) => {
                summaryHTML += `
                    <div class="result-item" data-index="${index}">
                        <div class="result-header">
                            <strong>Fichier ${index + 1}:</strong> ${result.filename}
                        </div>
                        <div class="result-fields">
                            <div class="field-group">
                                <label>W/O:</label>
                                <input type="text" class="edit-wo" value="${result.wo || ''}" placeholder="ex: 4EMGL11L" data-index="${index}">
                            </div>
                            <div class="field-group">
                                <label>S/N:</label>
                                <input type="text" class="edit-sn" value="${result.sn || ''}" placeholder="ex: 404M4PNQOY84" data-index="${index}">
                            </div>
                            <div class="field-group">
                                <label>Appareil:</label>
                                <input type="text" class="edit-model" value="${result.model || ''}" placeholder="ex: OLED77C54LA" data-index="${index}">
                            </div>
                        </div>
                        <hr>
                    </div>
                `;
            });
            
            summaryHTML += '</div>';
            
            // Remplacer le contenu de la grille des résultats
            const resultsGrid = document.querySelector('.results-grid');
            resultsGrid.innerHTML = summaryHTML;
            
            // Modifier les boutons d'action
            const actionsDiv = document.querySelector('.actions');
            actionsDiv.innerHTML = `
                <button id="importToJsonBtn" class="btn btn-info">📄 Importer dans JSON</button>
            `;
            
            // Ajouter les event listeners pour les nouveaux boutons
            document.getElementById('importToJsonBtn').addEventListener('click', () => {
                this.importToJson();
            });
            
            // Ajouter les event listeners pour l'édition des champs
            document.querySelectorAll('.edit-wo').forEach(input => {
                input.addEventListener('input', (e) => {
                    const index = parseInt(e.target.dataset.index);
                    this.processedFiles[index].wo = e.target.value;
                });
            });
            
            document.querySelectorAll('.edit-sn').forEach(input => {
                input.addEventListener('input', (e) => {
                    const index = parseInt(e.target.dataset.index);
                    this.processedFiles[index].sn = e.target.value;
                });
            });
            
            document.querySelectorAll('.edit-model').forEach(input => {
                input.addEventListener('input', (e) => {
                    const index = parseInt(e.target.dataset.index);
                    this.processedFiles[index].model = e.target.value;
                });
            });
        }
    }

    populateCandidates(selectId, candidates, selectedValue) {
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">Sélectionner...</option>';
        
        candidates.forEach(candidate => {
            const option = document.createElement('option');
            option.value = candidate;
            option.textContent = candidate;
            if (candidate === selectedValue) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        
        // Ajouter un événement pour mettre à jour l'affichage
        select.addEventListener('change', (e) => {
            const resultElement = selectId === 'woSelect' ? 'woResult' : 'snResult';
            document.getElementById(resultElement).textContent = e.target.value || 'Non trouvé';
            
            // Mettre à jour les résultats courants
            if (selectId === 'woSelect') {
                this.currentResults.wo = e.target.value;
            } else {
                this.currentResults.sn = e.target.value;
            }
        });
        
        // Ajouter la fonctionnalité de recherche dans le select
        this.addSearchToSelect(select, candidates);
    }

    addSearchToSelect(select, candidates) {
        // Créer un input de recherche caché
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.style.position = 'absolute';
        searchInput.style.left = '-9999px';
        searchInput.style.opacity = '0';
        document.body.appendChild(searchInput);
        
        // Quand on clique sur le select, activer la recherche
        select.addEventListener('click', (e) => {
            e.preventDefault();
            searchInput.focus();
            searchInput.value = '';
            this.filterSelectOptions(select, candidates, '');
        });
        
        // Recherche en temps réel
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toUpperCase();
            this.filterSelectOptions(select, candidates, query);
        });
        
        // Quand on appuie sur Entrée, sélectionner la première option
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const visibleOptions = Array.from(select.options).filter(opt => opt.style.display !== 'none');
                if (visibleOptions.length > 0) {
                    select.value = visibleOptions[0].value;
                    select.dispatchEvent(new Event('change'));
                    searchInput.blur();
                }
            }
        });
    }

    filterSelectOptions(select, candidates, query) {
        const options = Array.from(select.options);
        
        options.forEach(option => {
            if (option.value === '') return; // Garder l'option par défaut
            
            if (query === '' || option.textContent.toUpperCase().includes(query)) {
                option.style.display = '';
            } else {
                option.style.display = 'none';
            }
        });
    }



    async exportToExcel(excelData = null) {
        try {
            let workbook;
            
            // Si on a un fichier Excel existant, le charger
            if (this.existingExcelData) {
                // Créer un nouveau workbook et copier les données existantes
                workbook = XLSX.utils.book_new();
                
                // Copier chaque feuille existante
                Object.keys(this.existingExcelData).forEach(sheetName => {
                    const sheetData = this.existingExcelData[sheetName];
                    const worksheet = XLSX.utils.aoa_to_sheet(sheetData.data);
                    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
                });
                
                console.log('Utilisation du fichier Excel existant');
            } else {
                workbook = XLSX.utils.book_new();
                console.log('Création d\'un nouveau fichier Excel');
            }
            
            // Organiser les données selon la structure Excel
            const organizedData = excelData || this.organizeDataForExcel(this.processedFiles);
            
            // Créer une feuille pour chaque référence d'appareil
            Object.keys(organizedData).forEach(deviceRef => {
                const deviceData = organizedData[deviceRef];
                
                // Vérifier si la feuille existe déjà
                let existingWorksheet = null;
                let existingData = [];
                
                if (workbook.SheetNames.includes(deviceRef)) {
                    // Récupérer les données existantes
                    existingWorksheet = workbook.Sheets[deviceRef];
                    existingData = XLSX.utils.sheet_to_json(existingWorksheet, { header: 1 });
                    console.log(`Feuille existante ${deviceRef}:`, existingData);
                }
                
                // Créer la structure Excel selon l'image correcte
                const excelData = [];
                
                // Ligne 1 : Identifiant global
                excelData.push(['014454078XXXXEUQLJP', '', '', '', '']);
                
                // Ligne 2 : W/O en en-têtes de colonnes
                const woHeaders = ['W/O', '', '', '', '']; // W/O en A2, puis les W/O codes
                const patterns = Array.from(deviceData.patterns.entries());
                patterns.forEach(([wo, pattern], index) => {
                    if (index < 4) { // B2, C2, D2, E2 pour les W/O
                        woHeaders[index + 1] = wo; // +1 car A2 = 'W/O'
                    }
                });
                excelData.push(woHeaders);
                
                // Ligne 3 : Patterns sous les W/O correspondants
                const patternRow = ['', '', '', '', ''];
                patterns.forEach(([wo, pattern], index) => {
                    if (index < 4) {
                        patternRow[index + 1] = pattern; // +1 car A3 = vide
                    }
                });
                excelData.push(patternRow);
                
                // Lignes suivantes : S/N classifiés par W/O
                const snByWO = {};
                deviceData.sns.forEach(item => {
                    if (!snByWO[item.wo]) {
                        snByWO[item.wo] = [];
                    }
                    snByWO[item.wo].push(item.sn);
                });
                
                // Trouver le nombre maximum de S/N pour un W/O
                const maxSNs = Math.max(...Object.values(snByWO).map(sns => sns.length), 0);
                
                // Créer les lignes de données (à partir de la ligne 4)
                for (let i = 0; i < maxSNs; i++) {
                    const dataRow = ['', '', '', '', '']; // 5 colonnes
                    patterns.forEach(([wo, pattern], colIndex) => {
                        if (colIndex < 4 && snByWO[wo] && snByWO[wo][i]) {
                            dataRow[colIndex + 1] = snByWO[wo][i]; // +1 car A4+ = vide
                        }
                    });
                    excelData.push(dataRow);
                }
                
                // Ajouter la référence de l'appareil en bas (optionnel)
                // excelData.push(['', '', '', '', '']);
                // excelData.push(['', '', '', '', deviceRef]);
                
                console.log(`Structure Excel pour ${deviceRef}:`, excelData);
                
                // Créer ou mettre à jour la feuille Excel
                const newWorksheet = XLSX.utils.aoa_to_sheet(excelData);
                
                if (workbook.SheetNames.includes(deviceRef)) {
                    // Remplacer la feuille existante
                    workbook.Sheets[deviceRef] = newWorksheet;
                } else {
                    // Ajouter une nouvelle feuille
                    XLSX.utils.book_append_sheet(workbook, newWorksheet, deviceRef);
                }
            });

            // Export du fichier
            const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
            
            // Envoi au processus principal pour sauvegarde
            const filePath = await ipcRenderer.invoke('save-excel-file', buffer);
            if (filePath) {
                this.showNotification('success', 'Succès', `Fichier Excel sauvegardé: ${filePath}`);
            }
            
        } catch (error) {
            console.error('Erreur lors de l\'export Excel:', error);
            this.showNotification('error', 'Erreur', 'Erreur lors de l\'export Excel: ' + error.message);
        }
    }

    async generateShippingLabel() {
        if (!this.currentResults) {
            this.showNotification('error', 'Erreur', 'Aucune donnée disponible pour générer l\'étiquette');
            return;
        }

        try {
            // Préparer les données pour l'étiquette
            const labelData = {
                model: this.currentResults.model || 'OLED77C54LA',
                wo: this.currentResults.wo || 'XXXXXXXX',
                sn: this.currentResults.sn || 'XXXXXXXXXXXX',
                packageNumber: this.generatePackageNumber(this.currentResults.sn)
            };
            
            console.log('Données pour l\'étiquette:', labelData);
            
            // Envoi des données au processus principal pour génération d'étiquette
            const filePath = await ipcRenderer.invoke('generate-shipping-label', labelData);
            if (filePath) {
                this.showNotification('success', 'Succès', `Étiquette générée: ${filePath}`);
            }
        } catch (error) {
            console.error('Erreur lors de la génération d\'étiquette:', error);
            this.showNotification('error', 'Erreur', 'Erreur lors de la génération d\'étiquette: ' + error.message);
        }
    }

    // Générer des étiquettes pour tous les S/N traités
    async generateAllLabels() {
        if (!this.processedFiles || this.processedFiles.length === 0) {
            this.showNotification('error', 'Erreur', 'Aucune donnée traitée disponible pour générer les étiquettes');
            return;
        }

        try {
            const generatedLabels = [];
            
            for (const result of this.processedFiles) {
                if (result.sn && result.wo) {
                    // Préparer les données pour l'étiquette
                    const labelData = {
                        model: result.model || 'OLED77C54LA',
                        wo: result.wo,
                        sn: result.sn,
                        packageNumber: this.generatePackageNumber(result.sn)
                    };
                    
                    console.log('Génération d\'étiquette pour:', labelData);
                    
                    // Générer l'étiquette
                    const filePath = await ipcRenderer.invoke('generate-shipping-label', labelData);
                    if (filePath) {
                        generatedLabels.push(filePath);
                    }
                }
            }
            
            if (generatedLabels.length > 0) {
                this.showNotification('success', 'Succès', `${generatedLabels.length} étiquettes générées avec succès !\n\nFichiers:\n${generatedLabels.join('\n')}`);
            } else {
                this.showNotification('error', 'Erreur', 'Aucune étiquette n\'a pu être générée');
            }
        } catch (error) {
            console.error('Erreur lors de la génération des étiquettes:', error);
            this.showNotification('error', 'Erreur', 'Erreur lors de la génération des étiquettes: ' + error.message);
        }
    }

    // Générer des étiquettes depuis le fichier Excel chargé
    async generateLabelsFromExcel() {
        if (!this.existingExcelData) {
            this.showNotification('error', 'Erreur', 'Aucun fichier Excel chargé. Veuillez d\'abord charger un fichier Excel.');
            return;
        }

        try {
            const generatedLabels = [];
            
            // Parcourir toutes les feuilles du fichier Excel
            for (const [sheetName, sheetData] of Object.entries(this.existingExcelData)) {
                console.log(`Traitement de la feuille: ${sheetName}`);
                
                // Extraire les S/N de cette feuille
                const sns = this.extractSNsFromSheet(sheetData);
                console.log(`S/N trouvés dans ${sheetName}:`, sns);
                
                for (const snData of sns) {
                    if (snData.sn && snData.wo) {
                        // Préparer les données pour l'étiquette
                        const labelData = {
                            model: sheetName, // Le nom de la feuille est la référence de l'appareil
                            wo: snData.wo,
                            sn: snData.sn,
                            packageNumber: this.generatePackageNumber(snData.sn)
                        };
                        
                        console.log('Génération d\'étiquette pour:', labelData);
                        
                        // Générer l'étiquette
                        const filePath = await ipcRenderer.invoke('generate-shipping-label', labelData);
                        if (filePath) {
                            generatedLabels.push(filePath);
                        }
                    }
                }
            }
            
            if (generatedLabels.length > 0) {
                this.showNotification('success', 'Succès', `${generatedLabels.length} étiquettes générées avec succès depuis le fichier Excel !\n\nFichiers:\n${generatedLabels.join('\n')}`);
            } else {
                this.showNotification('error', 'Erreur', 'Aucune étiquette n\'a pu être générée depuis le fichier Excel');
            }
        } catch (error) {
            console.error('Erreur lors de la génération des étiquettes depuis Excel:', error);
            this.showNotification('error', 'Erreur', 'Erreur lors de la génération des étiquettes depuis Excel: ' + error.message);
        }
    }

    // Extraire les S/N d'une feuille Excel
    extractSNsFromSheet(sheetData) {
        const sns = [];
        
        if (!sheetData.data || !Array.isArray(sheetData.data)) {
            return sns;
        }
        
        // Parcourir les données de la feuille (lignes 4+)
        for (let rowIndex = 3; rowIndex < sheetData.data.length; rowIndex++) {
            const row = sheetData.data[rowIndex];
            
            if (row && Array.isArray(row)) {
                // Parcourir chaque colonne de la ligne
                for (let colIndex = 1; colIndex < row.length; colIndex++) {
                    const cellValue = row[colIndex];
                    
                    if (cellValue && typeof cellValue === 'string' && cellValue.length === 12) {
                        // C'est probablement un S/N
                        const wo = this.getWOFromSN(cellValue);
                        if (wo) {
                            sns.push({
                                sn: cellValue,
                                wo: wo
                            });
                        }
                    }
                }
            }
        }
        
        return sns;
    }



    // Importer les données dans le fichier Excel existant
    async importToExistingExcel() {
        try {
            if (!this.existingExcelData) {
                this.showNotification('error', 'Erreur', 'Aucun fichier Excel chargé. Veuillez d\'abord charger un fichier Excel existant.');
                return;
            }
            
            console.log('importToExistingExcel - processedFiles:', this.processedFiles);
            console.log('importToExistingExcel - existingExcelData:', this.existingExcelData);
            
            // Organiser les données pour Excel
            const excelData = this.organizeDataForExcel(this.processedFiles);
            console.log('importToExistingExcel - excelData:', excelData);
            
            // Exporter vers Excel en utilisant le fichier existant
            await this.exportToExcel(excelData);
            
            // Afficher un message de succès
            this.showNotification('success', 'Succès', 'Données importées avec succès dans le fichier Excel !');
            
        } catch (error) {
            console.error('Erreur lors de l\'import Excel:', error);
            this.showNotification('error', 'Erreur', 'Erreur lors de l\'import Excel: ' + error.message);
        }
    }

    // Traiter les résultats et exporter directement vers Excel
    async processResultsAndExport() {
        try {
            console.log('processResultsAndExport - processedFiles:', this.processedFiles);
            
            // Organiser les données pour Excel
            const excelData = this.organizeDataForExcel(this.processedFiles);
            console.log('processResultsAndExport - excelData:', excelData);
            
            // Exporter vers Excel
            await this.exportToExcel(excelData);
            
            // Afficher un message de succès
            this.showNotification('success', 'Succès', 'Données exportées avec succès vers Excel !');
            
        } catch (error) {
            console.error('Erreur lors de l\'export Excel:', error);
            this.showNotification('error', 'Erreur', 'Erreur lors de l\'export Excel: ' + error.message);
        }
    }

    // === MÉTHODES POUR LA GESTION JSON ===

    // Importer les données dans le fichier JSON
    async importToJson() {
        try {
            if (!this.processedFiles || this.processedFiles.length === 0) {
                this.showNotification('warning', 'Attention', 'Aucune donnée à importer. Veuillez d\'abord traiter des images.');
                return;
            }

            // Charger le fichier JSON existant ou créer un nouveau
            if (!this.jsonData) {
                this.jsonData = this.loadJsonData();
            }

            // Ajouter les nouvelles données au JSON
            const stats = this.addDataToJson(this.processedFiles);

            // Sauvegarder le fichier JSON
            await this.saveJsonData();

            // Afficher un message informatif
            let message = `Import terminé ! `;
            if (stats.addedCount > 0) {
                message += `${stats.addedCount} S/N ajoutés`;
            }
            if (stats.skippedCount > 0) {
                message += stats.addedCount > 0 ? `, ${stats.skippedCount} doublons ignorés` : `${stats.skippedCount} doublons ignorés`;
            }
            if (stats.addedCount === 0 && stats.skippedCount === 0) {
                message = 'Aucune donnée valide à importer';
            }

            this.showNotification('success', 'Succès', message);
        } catch (error) {
            console.error('Erreur lors de l\'import JSON:', error);
            this.showNotification('error', 'Erreur', 'Erreur lors de l\'import JSON: ' + error.message);
        }
    }

    // Charger le fichier JSON
    async loadJsonData() {
        try {
            // Utiliser le dossier des données de l'utilisateur via IPC
            const { ipcRenderer } = require('electron');
            const userDataPath = await ipcRenderer.invoke('get-user-data-path');
            const jsonPath = path.join(userDataPath, 'data.json');
            
            if (fs.existsSync(jsonPath)) {
                const data = fs.readFileSync(jsonPath, 'utf8');
                return JSON.parse(data);
            } else {
                // Créer le fichier avec une structure par défaut s'il n'existe pas
                const defaultData = {
                    "014454078XXXXEUQLJP": {
                        "model": {}
                    }
                };
                
                // Créer le fichier
                fs.writeFileSync(jsonPath, JSON.stringify(defaultData, null, 2), 'utf8');
                console.log('Fichier data.json créé avec la structure par défaut:', jsonPath);
                return defaultData;
            }
        } catch (error) {
            console.error('Erreur lors du chargement du JSON:', error);
            
            // En cas d'erreur, retourner la structure par défaut
            return {
                "014454078XXXXEUQLJP": {
                    "model": {}
                }
            };
        }
    }

    // Sauvegarder le fichier JSON
    async saveJsonData() {
        try {
            // Utiliser le dossier des données de l'utilisateur via IPC
            const { ipcRenderer } = require('electron');
            const userDataPath = await ipcRenderer.invoke('get-user-data-path');
            const jsonPath = path.join(userDataPath, 'data.json');
            const jsonString = JSON.stringify(this.jsonData, null, 2);
            fs.writeFileSync(jsonPath, jsonString, 'utf8');
            console.log('Fichier JSON sauvegardé:', jsonPath);
        } catch (error) {
            console.error('Erreur lors de la sauvegarde du JSON:', error);
            throw error;
        }
    }

    // Ajouter des données au JSON
    addDataToJson(processedFiles) {
        let addedCount = 0;
        let skippedCount = 0;
        
        console.log('=== DÉBUT IMPORT JSON ===');
        console.log('Données à traiter:', processedFiles);
        
        for (const fileData of processedFiles) {
            const { model, wo, sn } = fileData;
            
            console.log(`Traitement de: model=${model}, wo=${wo}, sn=${sn}`);
            
            if (!model || !wo || !sn) {
                console.log('Données incomplètes ignorées:', fileData);
                continue;
            }

            // Créer la structure si elle n'existe pas
            if (!this.jsonData["014454078XXXXEUQLJP"]) {
                this.jsonData["014454078XXXXEUQLJP"] = { model: {} };
            }
            
            if (!this.jsonData["014454078XXXXEUQLJP"].model[model]) {
                this.jsonData["014454078XXXXEUQLJP"].model[model] = {};
            }

            // Trouver ou créer un groupe pour ce W/O
            let existingGroup = null;
            let groupId = null;
            
            // Chercher un groupe existant avec le même W/O
            for (const [key, group] of Object.entries(this.jsonData["014454078XXXXEUQLJP"].model[model])) {
                if (group.wo === wo) {
                    existingGroup = group;
                    groupId = key;
                    console.log(`Groupe existant trouvé: ${groupId} avec W/O: ${wo}`);
                    break;
                }
            }

            if (!existingGroup) {
                // Créer un nouveau groupe
                groupId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                const pattern = this.generatePatternFromSN(sn);
                this.jsonData["014454078XXXXEUQLJP"].model[model][groupId] = {
                    wo: wo,
                    pattern: pattern,
                    sn: {}
                };
                existingGroup = this.jsonData["014454078XXXXEUQLJP"].model[model][groupId];
                console.log(`Nouveau groupe créé: ${groupId} avec W/O: ${wo}`);
            }

            // Vérifier si le S/N existe déjà dans ce groupe
            const existingSNs = Object.values(existingGroup.sn);
            const snExists = existingSNs.includes(sn);
            
            console.log(`S/N à ajouter: ${sn}`);
            console.log(`S/N existants dans le groupe:`, existingSNs);
            console.log(`S/N déjà présent: ${snExists}`);
            
            if (snExists) {
                console.log(`S/N ${sn} déjà présent dans le groupe ${groupId}, ignoré`);
                skippedCount++;
                continue;
            }

            // Ajouter le S/N au groupe
            const snId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
            existingGroup.sn[snId] = sn;
            addedCount++;
            console.log(`S/N ${sn} ajouté au groupe ${groupId} avec ID: ${snId}`);
        }
        
        console.log(`=== FIN IMPORT JSON ===`);
        console.log(`Import terminé: ${addedCount} S/N ajoutés, ${skippedCount} S/N ignorés (doublons)`);
        return { addedCount, skippedCount };
    }

    // Charger le fichier JSON dans l'éditeur
    async loadJsonFile() {
        await this.loadJsonIntoEditor();
        this.showNotification('success', 'Succès', 'Fichier JSON rechargé avec succès !');
    }

    // Charger automatiquement le JSON dans l'interface interactive
    async loadJsonIntoEditor() {
        try {
            const jsonData = await this.loadJsonData();
            this.jsonData = jsonData;
            this.renderJsonStructure();
            console.log('Fichier JSON chargé automatiquement dans l\'interface');
        } catch (error) {
            console.error('Erreur lors du chargement automatique du JSON:', error);
            // En cas d'erreur, créer une structure vide
            this.jsonData = {
                "014454078XXXXEUQLJP": {
                    "model": {}
                }
            };
            this.renderJsonStructure();
        }
    }

    // Sauvegarder le fichier JSON depuis l'interface interactive
    async saveJsonFile() {
        try {
            // Les données sont déjà dans this.jsonData, pas besoin de parser
            await this.saveJsonData();
            this.showNotification('success', 'Succès', 'Fichier JSON sauvegardé avec succès !');
        } catch (error) {
            console.error('Erreur lors de la sauvegarde du JSON:', error);
            this.showNotification('error', 'Erreur', 'Erreur lors de la sauvegarde du JSON: ' + error.message);
        }
    }

    // === MÉTHODES POUR L'INTERFACE INTERACTIVE ===

    // Rendre la structure JSON dans l'interface
    renderJsonStructure() {
        const container = document.getElementById('etiquettesContainer');
        container.innerHTML = '';

        if (!this.jsonData) {
            return;
        }

        for (const [etiquetteName, etiquetteData] of Object.entries(this.jsonData)) {
            this.renderEtiquette(etiquetteName, etiquetteData);
        }
        
        // Les event listeners pour les boutons d'ajout d'étiquette sont déjà configurés dans setupEventListeners()
    }

    // Rendre une étiquette
    renderEtiquette(etiquetteName, etiquetteData) {
        const container = document.getElementById('etiquettesContainer');
        const etiquetteCard = document.createElement('div');
        etiquetteCard.className = 'model-card';
        etiquetteCard.id = `etiquette-${etiquetteName}`;

        etiquetteCard.innerHTML = `
            <div class="model-header">
                <div class="model-name">📦 ${etiquetteName}</div>
                <div class="model-actions">
                    <button class="btn btn-small btn-success add-model-btn" data-etiquette="${etiquetteName}">➕ Modèle</button>
                    <button class="btn btn-small btn-danger delete-etiquette-btn" data-etiquette="${etiquetteName}">🗑️ Supprimer</button>
                </div>
            </div>
            <div class="models-container" id="models-${etiquetteName}">
                ${this.renderModelsHTML(etiquetteName, etiquetteData.model || {})}
            </div>
        `;

        container.appendChild(etiquetteCard);
        
        // Ajouter les event listeners
        etiquetteCard.querySelector('.add-model-btn').addEventListener('click', () => {
            this.showAddModelModal(etiquetteName);
        });
        
        etiquetteCard.querySelector('.delete-etiquette-btn').addEventListener('click', () => {
            console.log('Bouton supprimer étiquette cliqué pour:', etiquetteName);
            this.deleteEtiquette(etiquetteName);
        });
    }

    // Rendre les modèles d'une étiquette
    renderModelsHTML(etiquetteName, models) {
        if (Object.keys(models).length === 0) {
            return '<p style="color: #7f8c8d; text-align: center; padding: 20px;">Aucun modèle pour cette étiquette</p>';
        }

        const modelsHTML = Object.entries(models).map(([modelName, modelData]) => {
            const groups = Object.entries(modelData).map(([key, group]) => ({
                id: key,
                ...group
            }));

            return `
                <div class="model-card" style="margin-bottom: 15px;" data-etiquette="${etiquetteName}" data-model="${modelName}">
                    <div class="model-header">
                        <div class="model-name">📱 ${modelName}</div>
                        <div class="model-actions">
                            <button class="btn btn-small btn-success add-group-btn" data-etiquette="${etiquetteName}" data-model="${modelName}">➕ Groupe</button>
                            <button class="btn btn-small btn-danger delete-model-btn" data-etiquette="${etiquetteName}" data-model="${modelName}">🗑️ Supprimer</button>
                        </div>
                    </div>
                    <div class="groups-container">
                        ${groups.map(group => this.renderGroupHTML(etiquetteName, modelName, group)).join('')}
                    </div>
                </div>
            `;
        }).join('');

        // Retourner le HTML et ajouter les event listeners après
        setTimeout(() => {
            document.querySelectorAll('.add-group-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const etiquetteName = e.target.dataset.etiquette;
                    const modelName = e.target.dataset.model;
                    this.showAddGroupModal(etiquetteName, modelName);
                });
            });

            document.querySelectorAll('.delete-model-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const etiquetteName = e.target.dataset.etiquette;
                    const modelName = e.target.dataset.model;
                    this.deleteModel(etiquetteName, modelName);
                });
            });
        }, 100);

        return modelsHTML;
    }



    // Rendre un groupe
    renderGroupHTML(etiquetteName, modelName, group) {
        const snItems = Object.entries(group.sn || {}).map(([key, sn]) => `
            <div class="sn-item">
                <span class="sn-value">${sn}</span>
                <button class="btn btn-small btn-danger delete-sn-btn" data-etiquette="${etiquetteName}" data-model="${modelName}" data-group="${group.id}" data-sn="${key}">🗑️</button>
            </div>
        `).join('');

        const groupHTML = `
            <div class="group-card" id="group-${etiquetteName}-${modelName}-${group.id}">
                <div class="group-header">
                    <div class="group-info">
                        <div class="group-field">
                            <label>W/O:</label>
                            <input type="text" class="wo-input" value="${group.wo || ''}" 
                                   data-etiquette="${etiquetteName}" data-model="${modelName}" data-group="${group.id}"
                                   placeholder="ex: 4EMGL11L">
                        </div>
                        <div class="group-field">
                            <label>Pattern:</label>
                            <input type="text" class="pattern-input" value="${group.pattern || ''}" 
                                   data-etiquette="${etiquetteName}" data-model="${modelName}" data-group="${group.id}"
                                   placeholder="ex: 404XXXNQXXXX">
                        </div>
                    </div>
                    <div class="model-actions">
                        <button class="btn btn-small btn-success add-sn-btn" data-etiquette="${etiquetteName}" data-model="${modelName}" data-group="${group.id}">➕ S/N</button>
                        <button class="btn btn-small btn-danger delete-group-btn" data-etiquette="${etiquetteName}" data-model="${modelName}" data-group="${group.id}">🗑️</button>
                    </div>
                </div>
                <div class="sn-list">
                    ${snItems}
                </div>
            </div>
        `;

        // Ajouter les event listeners après un délai
        setTimeout(() => {
            // Event listeners pour les inputs
            document.querySelectorAll('.wo-input').forEach(input => {
                input.addEventListener('change', (e) => {
                    const etiquetteName = e.target.dataset.etiquette;
                    const modelName = e.target.dataset.model;
                    const groupId = e.target.dataset.group;
                    this.updateGroupField(etiquetteName, modelName, groupId, 'wo', e.target.value);
                });
            });

            document.querySelectorAll('.pattern-input').forEach(input => {
                input.addEventListener('change', (e) => {
                    const etiquetteName = e.target.dataset.etiquette;
                    const modelName = e.target.dataset.model;
                    const groupId = e.target.dataset.group;
                    this.updateGroupField(etiquetteName, modelName, groupId, 'pattern', e.target.value);
                });
            });

            // Event listeners pour les boutons
            document.querySelectorAll('.add-sn-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const etiquetteName = e.target.dataset.etiquette;
                    const modelName = e.target.dataset.model;
                    const groupId = e.target.dataset.group;
                    this.showAddSNModal(etiquetteName, modelName, groupId);
                });
            });

            document.querySelectorAll('.delete-group-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const etiquetteName = e.target.dataset.etiquette;
                    const modelName = e.target.dataset.model;
                    const groupId = e.target.dataset.group;
                    this.deleteGroup(etiquetteName, modelName, groupId);
                });
            });

            document.querySelectorAll('.delete-sn-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const etiquetteName = e.target.dataset.etiquette;
                    const modelName = e.target.dataset.model;
                    const groupId = e.target.dataset.group;
                    const snId = e.target.dataset.sn;
                    this.deleteSN(etiquetteName, modelName, groupId, snId);
                });
            });
        }, 0);

        return groupHTML;
    }



    // === MÉTHODES POUR LES MODALES ===

    // Afficher une modale
    showModal(title, content, onConfirm) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').innerHTML = content;
        
        const confirmBtn = document.getElementById('modalConfirmBtn');
        confirmBtn.onclick = () => {
            onConfirm();
            this.closeModal();
        };
        
        // Changer le texte du bouton selon le type d'action
        if (title.includes('Confirmer la suppression')) {
            confirmBtn.textContent = 'Supprimer';
            confirmBtn.className = 'btn btn-danger';
        } else {
            confirmBtn.textContent = 'Confirmer';
            confirmBtn.className = 'btn btn-primary';
        }
        
        document.getElementById('modalOverlay').style.display = 'flex';
    }

    // Fermer la modale
    closeModal() {
        document.getElementById('modalOverlay').style.display = 'none';
    }

    // Modale pour ajouter une étiquette
    showAddEtiquetteModal() {
        const content = `
            <div class="modal-form">
                <label for="etiquetteName">Nom de l'étiquette:</label>
                <input type="text" id="etiquetteName" placeholder="ex: 014454078XXXXEUQLJP">
            </div>
        `;
        
        this.showModal('Ajouter une étiquette', content, () => {
            const etiquetteName = document.getElementById('etiquetteName').value.trim();
            if (etiquetteName) {
                this.addNewEtiquette(etiquetteName);
            }
        });
    }

    // Modale pour ajouter un modèle
    showAddModelModal(etiquetteName) {
        const content = `
            <div class="modal-form">
                <label for="modelName">Nom du modèle:</label>
                <input type="text" id="modelName" placeholder="ex: OLED77C54LA">
            </div>
        `;
        
        this.showModal('Ajouter un modèle', content, () => {
            const modelName = document.getElementById('modelName').value.trim();
            if (modelName) {
                this.addNewModel(etiquetteName, modelName);
            }
        });
    }

    // Modale pour ajouter un groupe
    showAddGroupModal(etiquetteName, modelName) {
        const content = `
            <div class="modal-form">
                <label for="groupWO">W/O:</label>
                <input type="text" id="groupWO" placeholder="ex: 4EMGL11L">
                <label for="groupPattern">Pattern:</label>
                <input type="text" id="groupPattern" placeholder="ex: 404XXXNQXXXX">
            </div>
        `;
        
        this.showModal('Ajouter un groupe', content, () => {
            const wo = document.getElementById('groupWO').value.trim();
            const pattern = document.getElementById('groupPattern').value.trim();
            if (wo && pattern) {
                this.addNewGroup(etiquetteName, modelName, wo, pattern);
            }
        });
    }

    // Modale pour ajouter un S/N
    showAddSNModal(etiquetteName, modelName, groupId) {
        const content = `
            <div class="modal-form">
                <label for="snValue">Numéro de série:</label>
                <input type="text" id="snValue" placeholder="ex: 404M4PNQOY84">
            </div>
        `;
        
        this.showModal('Ajouter un S/N', content, () => {
            const sn = document.getElementById('snValue').value.trim();
            if (sn && sn.length > 0) {
                this.addNewSN(etiquetteName, modelName, groupId, sn);
            } else {
                this.showNotification('error', 'Erreur', 'Veuillez entrer un numéro de série valide !');
            }
        });
    }

    // === MÉTHODES POUR LES ACTIONS ===

    // Ajouter une nouvelle étiquette
    addNewEtiquette(etiquetteName) {
        console.log('addNewEtiquette appelé avec:', etiquetteName);
        if (!this.jsonData) {
            this.jsonData = {};
        }

        this.jsonData[etiquetteName] = { model: {} };
        this.renderJsonStructure();
        this.showNotification('success', 'Succès', `Étiquette "${etiquetteName}" ajoutée !`);
    }

    // Supprimer une étiquette
    deleteEtiquette(etiquetteName) {
        console.log('deleteEtiquette appelé avec:', etiquetteName);
        const content = `
            <div class="modal-form">
                <p>Voulez-vous vraiment supprimer l'étiquette "${etiquetteName}" ?</p>
            </div>
        `;
        
        this.showModal('Confirmer la suppression', content, () => {
            console.log('Suppression confirmée pour:', etiquetteName);
            delete this.jsonData[etiquetteName];
            this.renderJsonStructure();
            this.showNotification('success', 'Succès', `Étiquette "${etiquetteName}" supprimée !`);
        });
    }

    // Ajouter un nouveau modèle
    addNewModel(etiquetteName, modelName) {
        if (!this.jsonData[etiquetteName]) {
            this.jsonData[etiquetteName] = { model: {} };
        }

        this.jsonData[etiquetteName].model[modelName] = {};
        this.renderJsonStructure();
        this.showNotification('success', 'Succès', `Modèle "${modelName}" ajouté !`);
    }

    // Supprimer un modèle
    deleteModel(etiquetteName, modelName) {
        const content = `
            <div class="modal-form">
                <p>Voulez-vous vraiment supprimer le modèle "${modelName}" ?</p>
            </div>
        `;
        
        this.showModal('Confirmer la suppression', content, () => {
            delete this.jsonData[etiquetteName].model[modelName];
            this.renderJsonStructure();
            this.showNotification('success', 'Succès', `Modèle "${modelName}" supprimé !`);
        });
    }

    // Ajouter un nouveau groupe
    addNewGroup(etiquetteName, modelName, wo, pattern) {
        const groupId = Date.now().toString();
        this.jsonData[etiquetteName].model[modelName][groupId] = {
            wo: wo,
            pattern: pattern,
            sn: {}
        };
        this.renderJsonStructure();
        this.showNotification('success', 'Succès', 'Nouveau groupe ajouté !');
    }

    // Supprimer un groupe
    deleteGroup(etiquetteName, modelName, groupId) {
        const content = `
            <div class="modal-form">
                <p>Voulez-vous vraiment supprimer ce groupe ?</p>
            </div>
        `;
        
        this.showModal('Confirmer la suppression', content, () => {
            delete this.jsonData[etiquetteName].model[modelName][groupId];
            this.renderJsonStructure();
            this.showNotification('success', 'Succès', 'Groupe supprimé !');
        });
    }

    // Mettre à jour un champ de groupe
    updateGroupField(etiquetteName, modelName, groupId, field, value) {
        this.jsonData[etiquetteName].model[modelName][groupId][field] = value;
    }

    // Ajouter un nouveau S/N
    addNewSN(etiquetteName, modelName, groupId, sn) {
        const snId = Date.now().toString();
        this.jsonData[etiquetteName].model[modelName][groupId].sn[snId] = sn;
        this.renderJsonStructure();
        this.showNotification('success', 'Succès', 'S/N ajouté !');
    }

    // Supprimer un S/N
    deleteSN(etiquetteName, modelName, groupId, snId) {
        const content = `
            <div class="modal-form">
                <p>Voulez-vous vraiment supprimer ce S/N ?</p>
            </div>
        `;
        
        this.showModal('Confirmer la suppression', content, () => {
            delete this.jsonData[etiquetteName].model[modelName][groupId].sn[snId];
            this.renderJsonStructure();
            this.showNotification('success', 'Succès', 'S/N supprimé !');
        });
    }

    // === MÉTHODES POUR LA GÉNÉRATION D'ÉTIQUETTES ===

    // Charger les options de génération
    async loadGenerateOptions() {
        if (!this.jsonData) {
            this.jsonData = await this.loadJsonData();
        }

        this.populateEtiquetteSelect();
        this.populateModelSelect();
        this.populateGroupSelect();
    }

    // Peupler le select des étiquettes
    populateEtiquetteSelect() {
        const select = document.getElementById('etiquetteSelect');
        select.innerHTML = '<option value="">Sélectionner une étiquette...</option>';
        
        if (this.jsonData) {
            for (const etiquetteName of Object.keys(this.jsonData)) {
                const option = document.createElement('option');
                option.value = etiquetteName;
                option.textContent = etiquetteName;
                select.appendChild(option);
            }
        }
    }

    // Peupler le select des modèles
    populateModelSelect() {
        const select = document.getElementById('modelSelect');
        select.innerHTML = '<option value="">Sélectionner un modèle...</option>';
        
        if (this.jsonData) {
            for (const [etiquetteName, etiquetteData] of Object.entries(this.jsonData)) {
                for (const modelName of Object.keys(etiquetteData.model || {})) {
                    const option = document.createElement('option');
                    option.value = `${etiquetteName}:${modelName}`;
                    option.textContent = `${etiquetteName} - ${modelName}`;
                    select.appendChild(option);
                }
            }
        }
    }

    // Peupler le select des groupes
    populateGroupSelect() {
        const select = document.getElementById('groupSelect');
        select.innerHTML = '<option value="">Sélectionner un groupe...</option>';
        
        if (this.jsonData) {
            for (const [etiquetteName, etiquetteData] of Object.entries(this.jsonData)) {
                for (const [modelName, modelData] of Object.entries(etiquetteData.model || {})) {
                    for (const [groupId, groupData] of Object.entries(modelData)) {
                        const option = document.createElement('option');
                        option.value = `${etiquetteName}:${modelName}:${groupId}`;
                        option.textContent = `${etiquetteName} - ${modelName} - ${groupData.wo || 'W/O manquant'}`;
                        select.appendChild(option);
                    }
                }
            }
        }
    }

    // Mettre à jour les options de génération
    updateGenerateOptions() {
        const selectedOption = document.querySelector('input[name="generateOption"]:checked').value;
        
        // Désactiver tous les selects
        document.getElementById('etiquetteSelect').disabled = true;
        document.getElementById('modelSelect').disabled = true;
        document.getElementById('groupSelect').disabled = true;
        
        // Activer le select correspondant
        switch (selectedOption) {
            case 'etiquette':
                document.getElementById('etiquetteSelect').disabled = false;
                break;
            case 'model':
                document.getElementById('modelSelect').disabled = false;
                break;
            case 'group':
                document.getElementById('groupSelect').disabled = false;
                break;
        }
    }

    // Générer les étiquettes selon la sélection
    async generateLabelsFromSelection() {
        try {
            const selectedOption = document.querySelector('input[name="generateOption"]:checked').value;
            let labelsToGenerate = [];

            switch (selectedOption) {
                case 'all':
                    labelsToGenerate = this.getAllLabels();
                    break;
                case 'etiquette':
                    const etiquetteName = document.getElementById('etiquetteSelect').value;
                    if (!etiquetteName) {
                        this.showNotification('error', 'Erreur', 'Veuillez sélectionner une étiquette.');
                        return;
                    }
                    labelsToGenerate = this.getLabelsForEtiquette(etiquetteName);
                    break;
                case 'model':
                    const modelSelection = document.getElementById('modelSelect').value;
                    if (!modelSelection) {
                        this.showNotification('error', 'Erreur', 'Veuillez sélectionner un modèle.');
                        return;
                    }
                    const [etiquetteNameModel, modelName] = modelSelection.split(':');
                    labelsToGenerate = this.getLabelsForModel(etiquetteNameModel, modelName);
                    break;
                case 'group':
                    const groupSelection = document.getElementById('groupSelect').value;
                    if (!groupSelection) {
                        this.showNotification('error', 'Erreur', 'Veuillez sélectionner un groupe.');
                        return;
                    }
                    const [etiquetteNameGroup, modelNameGroup, groupId] = groupSelection.split(':');
                    labelsToGenerate = this.getLabelsForGroup(etiquetteNameGroup, modelNameGroup, groupId);
                    break;
            }

            if (labelsToGenerate.length === 0) {
                this.showNotification('warning', 'Attention', 'Aucune étiquette à générer.');
                return;
            }

            // Générer les étiquettes
            const generatedLabels = [];
            for (const labelData of labelsToGenerate) {
                try {
                    const outputPath = await ipcRenderer.invoke('generate-shipping-label', labelData);
                    generatedLabels.push(outputPath);
                } catch (error) {
                    console.error(`Erreur lors de la génération de l'étiquette pour ${labelData.sn}:`, error);
                }
            }

            if (generatedLabels.length > 0) {
                this.showNotification('success', 'Succès', `${generatedLabels.length} étiquettes générées avec succès !`);
            } else {
                this.showNotification('error', 'Erreur', 'Aucune étiquette n\'a pu être générée.');
            }
        } catch (error) {
            console.error('Erreur lors de la génération des étiquettes:', error);
            this.showNotification('error', 'Erreur', 'Erreur lors de la génération des étiquettes: ' + error.message);
        }
    }

    // Obtenir toutes les étiquettes
    getAllLabels() {
        const labels = [];
        for (const [etiquetteName, etiquetteData] of Object.entries(this.jsonData)) {
            for (const [modelName, modelData] of Object.entries(etiquetteData.model || {})) {
                for (const [groupId, groupData] of Object.entries(modelData)) {
                    for (const [snId, sn] of Object.entries(groupData.sn || {})) {
                        labels.push({
                            model: modelName,
                            wo: groupData.wo,
                            sn: sn
                        });
                    }
                }
            }
        }
        return labels;
    }

    // Obtenir les étiquettes pour une étiquette spécifique
    getLabelsForEtiquette(etiquetteName) {
        const labels = [];
        const etiquetteData = this.jsonData[etiquetteName];
        if (!etiquetteData) return labels;

        for (const [modelName, modelData] of Object.entries(etiquetteData.model || {})) {
            for (const [groupId, groupData] of Object.entries(modelData)) {
                for (const [snId, sn] of Object.entries(groupData.sn || {})) {
                    labels.push({
                        model: modelName,
                        wo: groupData.wo,
                        sn: sn
                    });
                }
            }
        }
        return labels;
    }

    // Obtenir les étiquettes pour un modèle spécifique
    getLabelsForModel(etiquetteName, modelName) {
        const labels = [];
        const modelData = this.jsonData[etiquetteName]?.model?.[modelName];
        if (!modelData) return labels;

        for (const [groupId, groupData] of Object.entries(modelData)) {
            for (const [snId, sn] of Object.entries(groupData.sn || {})) {
                labels.push({
                    model: modelName,
                    wo: groupData.wo,
                    sn: sn
                });
            }
        }
        return labels;
    }

    // Obtenir les étiquettes pour un groupe spécifique
    getLabelsForGroup(etiquetteName, modelName, groupId) {
        const labels = [];
        const groupData = this.jsonData[etiquetteName]?.model?.[modelName]?.[groupId];
        if (!groupData) return labels;

        for (const [snId, sn] of Object.entries(groupData.sn || {})) {
            labels.push({
                model: modelName,
                wo: groupData.wo,
                sn: sn
            });
        }
        return labels;
    }

    // Générer les étiquettes depuis le JSON
    async generateLabelsFromJson() {
        try {
                    if (!this.jsonData) {
            this.showNotification('warning', 'Attention', 'Aucun fichier JSON chargé. Veuillez d\'abord charger un fichier JSON.');
            return;
        }

            const generatedLabels = [];

            // Parcourir toutes les données du JSON
            for (const [packageNumber, packageData] of Object.entries(this.jsonData)) {
                for (const [modelName, modelData] of Object.entries(packageData.model)) {
                    for (const [groupKey, groupData] of Object.entries(modelData)) {
                        for (const [snKey, sn] of Object.entries(groupData.sn)) {
                            const labelData = {
                                model: modelName,
                                wo: groupData.wo,
                                sn: sn
                            };

                            try {
                                const outputPath = await ipcRenderer.invoke('generate-shipping-label', labelData);
                                generatedLabels.push(outputPath);
                            } catch (error) {
                                console.error(`Erreur lors de la génération de l'étiquette pour ${sn}:`, error);
                            }
                        }
                    }
                }
            }

            if (generatedLabels.length > 0) {
                this.showNotification('success', 'Succès', `${generatedLabels.length} étiquettes générées avec succès depuis le fichier JSON !`);
            } else {
                this.showNotification('warning', 'Attention', 'Aucune étiquette n\'a pu être générée depuis le fichier JSON');
            }
        } catch (error) {
            console.error('Erreur lors de la génération des étiquettes depuis JSON:', error);
            this.showNotification('error', 'Erreur', 'Erreur lors de la génération des étiquettes depuis JSON: ' + error.message);
        }
    }
}

// Initialisation de l'application
const app = new TicketizyApp(); 