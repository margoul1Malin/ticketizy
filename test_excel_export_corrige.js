// Test de l'export Excel corrigé avec chaînes vides
const testData = [
    {
        model: 'OLED77C54LA',
        wo: '4EMGL11L',
        sn: '404M4PNQOY84',
        filename: 'test1.jpg'
    },
    {
        model: 'OLED77C54LA',
        wo: '', // Chaîne vide - pas de W/O
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
        wo: '   ', // Espaces - pas de W/O
        sn: '406MABTSVG05',
        filename: 'test4.jpg'
    }
];

console.log('=== TEST EXPORT EXCEL CORRIGÉ ===');
console.log('Données de test:', testData);

// Simuler la fonction organizeDataForExcel
function organizeDataForExcel(processedFiles) {
    const organizedData = {};
    
    processedFiles.forEach((result, index) => {
        if (result && result.sn && result.model) {
            const deviceRef = result.model; // Simplifié pour le test
            const wo = result.wo || null;
            
            if (!organizedData[deviceRef]) {
                organizedData[deviceRef] = {
                    patterns: new Map(),
                    sns: [],
                    snsWithoutWO: []
                };
            }
            
            if (wo && wo !== null && wo !== undefined && wo.trim() !== '') {
                // S/N avec W/O valide
                if (!organizedData[deviceRef].patterns.has(wo)) {
                    organizedData[deviceRef].patterns.set(wo, 'pattern');
                }
                
                organizedData[deviceRef].sns.push({
                    sn: result.sn,
                    wo: wo,
                    filename: result.filename
                });
            } else {
                // S/N sans W/O
                console.log(`S/N ${result.sn} sans W/O - ajouté au groupe SANS_WO`);
                organizedData[deviceRef].snsWithoutWO.push({
                    sn: result.sn,
                    filename: result.filename
                });
            }
        }
    });
    
    return organizedData;
}

// Tester la fonction
const organizedData = organizeDataForExcel(testData);
console.log('\n=== DONNÉES ORGANISÉES ===');
console.log(JSON.stringify(organizedData, null, 2));

// Vérifier que les S/N sans W/O sont bien séparés
Object.entries(organizedData).forEach(([deviceRef, data]) => {
    console.log(`\n${deviceRef}:`);
    console.log(`  S/N avec W/O: ${data.sns.length}`);
    console.log(`  S/N sans W/O: ${data.snsWithoutWO.length}`);
    
    if (data.snsWithoutWO.length > 0) {
        console.log(`  S/N sans W/O:`, data.snsWithoutWO.map(item => item.sn));
    }
});

console.log('\n=== TEST TERMINÉ ==='); 