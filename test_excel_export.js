// Test de l'export Excel avec S/N sans W/O
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

console.log('=== TEST EXPORT EXCEL AVEC S/N SANS W/O ===');
console.log('Données de test:', testData);

// Simuler la fonction organizeDataForExcel
function organizeDataForExcel(processedFiles) {
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
            
            const deviceRef = result.model; // Simplifié pour le test
            const wo = result.wo || null; // W/O peut être null
            
            console.log(`organizeDataForExcel - deviceRef: ${deviceRef}, wo: ${wo}, wo type: ${typeof wo}`);
            
            if (!organizedData[deviceRef]) {
                organizedData[deviceRef] = {
                    patterns: new Map(), // Map W/O → Pattern
                    sns: [], // S/N avec leurs W/O correspondants
                    snsWithoutWO: [] // S/N sans W/O - séparés complètement
                };
            }
            
            if (wo && wo !== null && wo !== undefined && wo !== '') {
                console.log(`S/N ${result.sn} avec W/O: ${wo}`);
                // Créer ou mettre à jour le pattern pour ce W/O
                if (!organizedData[deviceRef].patterns.has(wo)) {
                    // Générer un pattern basé sur le S/N
                    const pattern = result.sn.substring(0, 8) + 'XXXX'; // Pattern simplifié
                    organizedData[deviceRef].patterns.set(wo, pattern);
                }
                
                organizedData[deviceRef].sns.push({
                    sn: result.sn,
                    wo: wo,
                    filename: result.filename
                });
            } else {
                // S/N sans W/O - complètement séparé
                console.log(`S/N ${result.sn} sans W/O - ajouté au groupe SANS_WO séparé`);
                organizedData[deviceRef].snsWithoutWO.push({
                    sn: result.sn,
                    filename: result.filename
                });
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

// Tester la fonction
const organizedData = organizeDataForExcel(testData);

console.log('\n=== RÉSULTATS ===');
Object.entries(organizedData).forEach(([deviceRef, data]) => {
    console.log(`\nAppareil: ${deviceRef}`);
    console.log(`S/N avec W/O: ${data.sns.length}`);
    data.sns.forEach(item => {
        console.log(`  - ${item.sn} (W/O: ${item.wo})`);
    });
    
    console.log(`S/N sans W/O: ${data.snsWithoutWO.length}`);
    data.snsWithoutWO.forEach(item => {
        console.log(`  - ${item.sn} (Sans W/O)`);
    });
});

console.log('\n=== TEST TERMINÉ ==='); 