// Test de la génération d'étiquettes avec et sans W/O
const testData = [
    {
        model: 'OLED77C54LA',
        wo: '4EMGL11L',
        sn: '404M4PNQOY84',
        filename: 'test1.jpg'
    },
    {
        model: 'OLED77C54LA',
        wo: null, // Pas de W/O
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
        wo: undefined, // Pas de W/O
        sn: '406MABTSVG05',
        filename: 'test4.jpg'
    }
];

console.log('=== TEST GÉNÉRATION D\'ÉTIQUETTES AVEC ET SANS W/O ===');
console.log('Données de test:', testData);

// Simuler la fonction getAllLabels
function getAllLabels(processedFiles) {
    const labels = [];
    
    // Grouper par modèle
    const groupedByModel = {};
    const snsWithoutWO = [];
    
    processedFiles.forEach(result => {
        if (result.model && result.sn) {
            if (result.wo && result.wo !== null && result.wo !== undefined) {
                // S/N avec W/O - étiquette complète
                if (!groupedByModel[result.model]) {
                    groupedByModel[result.model] = [];
                }
                groupedByModel[result.model].push({
                    sn: result.sn,
                    wo: result.wo,
                    type: 'complete'
                });
            } else {
                // S/N sans W/O - seulement codes-barres S/N et modèle
                snsWithoutWO.push({
                    model: result.model,
                    sn: result.sn,
                    type: 'sans_wo'
                });
            }
        }
    });

    // Générer les étiquettes complètes
    Object.entries(groupedByModel).forEach(([model, entries]) => {
        entries.forEach(entry => {
            labels.push({
                model: model,
                wo: entry.wo,
                sn: entry.sn,
                format: '014454078${last4chars}EUQLJP',
                type: 'complete'
            });
        });
    });

    // Générer les étiquettes sans W/O
    snsWithoutWO.forEach(entry => {
        labels.push({
            model: entry.model,
            wo: null,
            sn: entry.sn,
            format: null,
            type: 'sans_wo'
        });
    });

    return labels;
}

// Tester la fonction
const labels = getAllLabels(testData);
console.log('\n=== ÉTIQUETTES GÉNÉRÉES ===');
console.log('Étiquettes complètes (avec W/O):');
labels.filter(label => label.type === 'complete').forEach(label => {
    console.log(`  - ${label.model} | ${label.sn} | ${label.wo} | ${label.format}`);
});

console.log('\nÉtiquettes sans W/O (seulement S/N et modèle):');
labels.filter(label => label.type === 'sans_wo').forEach(label => {
    console.log(`  - ${label.model} | ${label.sn} | (Sans W/O) | Pas de format`);
});

console.log('\n=== RÉSUMÉ ===');
console.log(`Total des étiquettes: ${labels.length}`);
console.log(`Étiquettes complètes: ${labels.filter(l => l.type === 'complete').length}`);
console.log(`Étiquettes sans W/O: ${labels.filter(l => l.type === 'sans_wo').length}`);

console.log('\n=== TEST TERMINÉ ==='); 