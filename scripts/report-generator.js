const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join('/workspace/project-ecosystem', '.planning/state.json');
const SUMMARY_FILE = path.join('/workspace/project-ecosystem', 'SUMMARY.md');

function generateReport() {
    console.log('📊 Rapor Oluşturucu: Veriler işleniyor...');
    
    if (!fs.existsSync(STATE_FILE)) {
        console.error('Hata: state.json bulunamadı.');
        return;
    }

    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    const plans = Object.values(state.processed_plans);
    
    const total = plans.length;
    const completed = plans.filter(p => p.status === 'COMPLETED').length;
    const failed = plans.filter(p => p.status === 'FAILED').length;
    const successRate = total > 0 ? ((completed / total) * 100).toFixed(2) : 0;

    let markdown = `# GSD EKOSİSTEM ÖZETİ (SUMMARY)\n\n`;
    markdown += `📅 **Son Güncelleme:** ${new Date().toLocaleString('tr-TR')}\n`;
    markdown += `🔄 **Son Çalıştırma:** ${state.last_run || 'N/A'}\n\n`;
    
    markdown += `## 📈 Genel İstatistikler\n`;
    markdown += `- **Toplam Plan Sayısı:** ${total}\n`;
    markdown += `- **Başarıyla Tamamlanan:** ✅ ${completed}\n`;
    markdown += `- **Başarısız Olan:** ❌ ${failed}\n`;
    markdown += `- **Başarı Oranı:** %${successRate}\n\n`;

    markdown += `## 📋 Son İşlemler (processed_plans)\n`;
    markdown += `| Plan Adı | Durum | Son Güncelleme | Kaynak |\n`;
    markdown += `| :--- | :--- | :--- | :--- |\n`;
    
    Object.keys(state.processed_plans).reverse().slice(0, 10).forEach(name => {
        const p = state.processed_plans[name];
        const statusIcon = p.status === 'COMPLETED' ? '✅' : '❌';
        markdown += `| ${name} | ${statusIcon} ${p.status} | ${p.updated_at} | ${p.source || 'internal'} |\n`;
    });

    markdown += `\n---\n*Bu rapor otonom GSD-OpenClaw Ekosistemi tarafından otomatik oluşturulmuştur.*`;

    fs.writeFileSync(SUMMARY_FILE, markdown);
    console.log(`✅ SUMMARY.md güncellendi.`);
}

generateReport();
