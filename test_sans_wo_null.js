// Test de la gestion des S/N sans W/O avec null
const testData = [
    {
        model: 'OLED77C54LA',
        wo: '4EMGL11L',
        sn: '404M4PNQOY84',
        filename: 'test1.jpg'
    },
    {
        model: 'OLED77C54LA',
        wo: null, // Pas de W/O - null
        sn: '404M4BTQOW81',
        filename: 'test2.jpg'
    },
    {
        model: 'OLED65G45LW',
        wo: '4GMGL05L',
        sn: '406MAAKSVG24',
        filename: 'test3.jpg'
    },
    {
        model: 'OLED65G45LW',
        wo: undefined, // Pas de W/O - undefined
        sn: '406MABTSVG05',
        filename: 'test4.jpg'
    }
];

console.log('=== TEST GESTION S/N SANS W/O AVEC NULL ===');
console.log('Données de test:', testData);

// Simuler la fonction generateSummaryContent
function generateSummaryContent(processedFiles) {
    let content = '';
    
    // Grouper par modèle d'appareil
    const groupedByModel = {};
    const snsWithoutWO = []; // S/N sans W/O
    
    processedFiles.forEach(result => {
        if (result.model && result.sn) {
            if (result.wo && result.wo !== null && result.wo !== undefined) {
                // S/N avec W/O
                if (!groupedByModel[result.model]) {
                    groupedByModel[result.model] = [];
                }
                groupedByModel[result.model].push({
                    sn: result.sn,
                    wo: result.wo
                });
            } else {
                // S/N sans W/O
                snsWithoutWO.push({
                    model: result.model,
                    sn: result.sn
                });
            }
        }
    });

    // Générer le contenu au format d'import pour les S/N avec W/O
    Object.entries(groupedByModel).forEach(([model, entries]) => {
        content += `Appareil : ${model}\n`;
        entries.forEach(entry => {
            content += `${entry.sn} - ${entry.wo}\n`;
        });
        content += '\n'; // Ligne vide entre les modèles
    });

    // Ajouter une section spéciale pour les S/N sans W/O
    if (snsWithoutWO.length > 0) {
        content += `# S/N sans W/O détectés\n`;
        content += `# Ces numéros de série n'ont pas de Work Order associé\n\n`;
        
        // Grouper par modèle
        const snsWithoutWOByModel = {};
        snsWithoutWO.forEach(item => {
            if (!snsWithoutWOByModel[item.model]) {
                snsWithoutWOByModel[item.model] = [];
            }
            snsWithoutWOByModel[item.model].push(item.sn);
        });
        
        Object.entries(snsWithoutWOByModel).forEach(([model, sns]) => {
            content += `Appareil : ${model}\n`;
            sns.forEach(sn => {
                content += `${sn} - SANS_WO\n`;
            });
            content += '\n';
        });
    }

    // Ajouter un en-tête avec les informations de traitement
    const header = `# Résumé de l'extraction Gemini
# Date de génération : ${new Date().toLocaleString('fr-FR')}
# Nombre total d'images traitées : ${processedFiles.length}
# S/N avec W/O : ${Object.values(groupedByModel).reduce((total, entries) => total + entries.length, 0)}
# S/N sans W/O : ${snsWithoutWO.length}
# Format : Appareil : [MODEL]
#          [S/N] - [W/O] ou [S/N] - SANS_WO
#
`;
    
    return header + content;
}

// Tester la fonction
const summary = generateSummaryContent(testData);
console.log('\n=== RÉSUMÉ GÉNÉRÉ ===');
console.log(summary);

// Tester la logique de filtrage pour la génération d'étiquettes
console.log('\n=== TEST FILTRAGE POUR GÉNÉRATION D\'ÉTIQUETTES ===');
const validLabels = testData.filter(result => 
    result.model && result.sn && result.wo && result.wo !== null && result.wo !== undefined
);
console.log('S/N valides pour génération d\'étiquettes:', validLabels);

const invalidLabels = testData.filter(result => 
    result.model && result.sn && (!result.wo || result.wo === null || result.wo === undefined)
);
console.log('S/N invalides (ignorés pour génération d\'étiquettes):', invalidLabels);

console.log('\n=== TEST TERMINÉ ==='); 