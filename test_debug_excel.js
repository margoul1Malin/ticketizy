// Test de debug pour l'export Excel
console.log('=== TEST DEBUG EXPORT EXCEL ===');

// Simuler les données organisées
const deviceData = {
    patterns: new Map([
        ['4EMGL11L', '404XXXNQXXXX'],
        ['4GMGL05L', '406XXXKSXXXX']
    ]),
    sns: [
        { sn: '404M4PNQOY84', wo: '4EMGL11L', filename: 'test1.jpg' },
        { sn: '406MAAKSVG24', wo: '4GMGL05L', filename: 'test3.jpg' }
    ],
    snsWithoutWO: [
        { sn: '404M4BTQOW81', filename: 'test2.jpg' },
        { sn: '406MABTSVG05', filename: 'test4.jpg' }
    ]
};

console.log('Données de test:', {
    patterns: Array.from(deviceData.patterns.entries()),
    sns: deviceData.sns,
    snsWithoutWO: deviceData.snsWithoutWO
});

// Simuler la logique d'export Excel
const woHeaders = ['W/O', '', '', '', ''];
const patterns = Array.from(deviceData.patterns.entries());

patterns.forEach(([wo, pattern], index) => {
    if (index < 4) {
        woHeaders[index + 1] = wo;
    }
});

// Ajouter colonne SANS_WO
if (deviceData.snsWithoutWO && deviceData.snsWithoutWO.length > 0) {
    woHeaders.push('SANS_WO');
    console.log(`Colonne SANS_WO ajoutée avec ${deviceData.snsWithoutWO.length} S/N`);
}

console.log('En-têtes:', woHeaders);

// Créer les lignes de données
const snByWO = {};
deviceData.sns.forEach(item => {
    if (!snByWO[item.wo]) {
        snByWO[item.wo] = [];
    }
    snByWO[item.wo].push(item.sn);
});

const maxSNs = Math.max(...Object.values(snByWO).map(sns => sns.length), 0);

console.log(`Export Excel:`);
console.log(`  - S/N avec W/O: ${deviceData.sns.length}`);
console.log(`  - S/N sans W/O: ${deviceData.snsWithoutWO.length}`);
console.log(`  - Max S/N par W/O: ${maxSNs}`);

// Créer les lignes
for (let i = 0; i < maxSNs; i++) {
    const dataRow = ['', '', '', '', ''];
    
    patterns.forEach(([wo, pattern], colIndex) => {
        if (colIndex < 4 && snByWO[wo] && snByWO[wo][i]) {
            dataRow[colIndex + 1] = snByWO[wo][i];
        }
    });
    
    // Ajouter S/N sans W/O
    if (deviceData.snsWithoutWO && deviceData.snsWithoutWO[i]) {
        dataRow.push(deviceData.snsWithoutWO[i].sn);
        console.log(`  - Ligne ${i + 4}: S/N sans W/O ajouté: ${deviceData.snsWithoutWO[i].sn}`);
    } else if (deviceData.snsWithoutWO && deviceData.snsWithoutWO.length > 0) {
        dataRow.push('');
    }
    
    console.log(`Ligne ${i + 4}:`, dataRow);
}

// Lignes supplémentaires pour S/N sans W/O
if (deviceData.snsWithoutWO && deviceData.snsWithoutWO.length > maxSNs) {
    console.log(`Ajout de ${deviceData.snsWithoutWO.length - maxSNs} lignes supplémentaires`);
    for (let i = maxSNs; i < deviceData.snsWithoutWO.length; i++) {
        const dataRow = ['', '', '', '', ''];
        dataRow.push(deviceData.snsWithoutWO[i].sn);
        console.log(`Ligne supplémentaire:`, dataRow);
    }
}

console.log('=== TEST TERMINÉ ==='); 