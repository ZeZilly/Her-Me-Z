const { loadSkill, initializeRegistry } = require('./skill-manager');
const fs = require('fs');
const path = require('path');

/**
 * Interface Generator Agent
 * Amacı: Sistem verilerini görsel arayüzlere (Dashboard vb.) dönüştürmek.
 */
async function generateInterface() {
    console.log('🖥️ Interface Generator: Dashboard güncelleniyor...');
    
    try {
        initializeRegistry();
        
        // Dashboard skill'ini yükle ve çalıştır
        const dashboard = loadSkill('web-dashboard');
        const outputPath = dashboard.execute({
            outputPath: '/workspace/project-ecosystem/docs/index.html'
        });
        
        console.log(`✅ Arayüz başarıyla mühürlendi: ${outputPath}`);
    } catch (err) {
        console.error('❌ Arayüz oluşturma hatası:', err.message);
    }
}

if (require.main === module) {
    generateInterface();
}

module.exports = { generateInterface };
