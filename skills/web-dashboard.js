const fs = require('fs');
const path = require('path');

/**
 * Otonom Yetenek: Web-Dashboard
 * Amacı: state.json ve SUMMARY.md verilerini kullanarak dinamik bir kontrol paneli (index.html) üretmek.
 */
module.exports = {
    execute: (config) => {
        console.log('🖼️ [Skill: Web-Dashboard] Kontrol paneli oluşturuluyor...');
        
        const statePath = '/workspace/project-ecosystem/.planning/state.json';
        const outputPath = config.outputPath || '/workspace/project-ecosystem/docs/dashboard.html';
        
        if (!fs.existsSync(statePath)) throw new Error('State dosyası bulunamadı.');
        
        const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        const plans = Object.values(state.processed_plans);
        const completed = plans.filter(p => p.status === 'COMPLETED').length;
        const failed = plans.filter(p => p.status === 'FAILED').length;
        const rate = plans.length > 0 ? ((completed / plans.length) * 100).toFixed(2) : 0;
        const securityAlert = state.security_alert && state.security_alert.active;

        const html = `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>GSD Otonom Ekosistem Dashboard</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; }
        .container { max-width: 1000px; margin: auto; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1e293b; padding-bottom: 20px; }
        .alert-banner { background: #ef4444; color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center; font-weight: bold; display: ${securityAlert ? 'block' : 'none'}; animation: blink 2s infinite; }
        @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 30px 0; }
        .card { background: #1e293b; padding: 20px; border-radius: 12px; text-align: center; border: 1px solid #334155; }
        .card h2 { font-size: 2.5rem; margin: 10px 0; color: #38bdf8; }
        .table-container { background: #1e293b; border-radius: 12px; padding: 20px; border: 1px solid #334155; }
        table { width: 100%; border-collapse: collapse; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid #334155; }
        .status-ok { color: #4ade80; font-weight: bold; }
        .status-fail { color: #f87171; font-weight: bold; }
        .badge { background: #0ea5e9; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; }
    </style>
</head>
<body>
    <div class="container">
        <div class="alert-banner">🚨 GÜVENLİK ALARMI: Sistem saldırı girişimi engelledi! (Kaynak: ${state.security_alert?.source || 'Bilinmeyen'})</div>
        <div class="header">
            <h1>🏛️ Master Orkestratör Dashboard</h1>
            <div class="badge">Sistem Durumu: OTONOM</div>
        </div>
        
        <div class="stats-grid">
            <div class="card"><h3>Toplam Görev</h3><h2>${plans.length}</h2></div>
            <div class="card"><h3>Başarı Oranı</h3><h2 style="color: ${rate > 90 ? '#4ade80' : '#fbbf24'}">%${rate}</h2></div>
            <div class="card"><h3>Son Hata</h3><h2 style="color: #f87171">${failed}</h2></div>
        </div>

        <div class="table-container">
            <h3>📋 Son İşlemler</h3>
            <table>
                <thead>
                    <tr><th>Plan Adı</th><th>Kaynak</th><th>Durum</th><th>Güncelleme</th></tr>
                </thead>
                <tbody>
                    ${Object.keys(state.processed_plans).reverse().slice(0, 8).map(name => {
                        const p = state.processed_plans[name];
                        return `<tr>
                            <td>${name}</td>
                            <td><span class="badge">${p.source || 'internal'}</span></td>
                            <td class="${p.status === 'COMPLETED' ? 'status-ok' : 'status-fail'}">${p.status}</td>
                            <td>${new Date(p.updated_at).toLocaleString('tr-TR')}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>`;

        fs.writeFileSync(outputPath, html);
        return outputPath;
    }
};
