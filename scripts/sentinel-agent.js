const fs = require('fs');
const path = require('path');
const { updateReputation } = require('./reputation-engine');

const BREACH_LOG = '/workspace/project-ecosystem/.planning/LOGS/SECURITY_BREACH.md';

/**
 * Sentinel Agent - Otonom Siber Bağışıklık Sistemi
 */
function inspectTraffic(payload, reqInfo) {
    console.log(`🛡️ Sentinel: Trafik analizi yapılıyor... [Kaynak: ${payload.source || 'bilinmeyen'}]`);
    
    const dangerousPatterns = [
        /rm\s+-rf/i,
        /sudo/i,
        /chmod\s+777/i,
        /sh\s/i,
        /bash\s/i,
        /\.env/i,
        /password/i,
        /token/i
    ];

    const cmd = payload.cmd || '';
    const isMalicious = dangerousPatterns.some(pattern => pattern.test(cmd));

    if (isMalicious) {
        handleBreach(payload, reqInfo, 'Malicious Command Pattern Detected');
        return { allowed: false, reason: 'SECURITY_ALERT: Malicious pattern blocked.' };
    }

    // Trafik Yoğunluğu (Frequency) Kontrolü Simülasyonu
    // (Gerçek IDS için IP tabanlı rate-limiting eklenmelidir)
    
    return { allowed: true };
}

function handleBreach(payload, reqInfo, reason) {
    const source = payload.source || 'unknown';
    console.error(`🚨 SENTINEL ALARMI: '${source}' kaynaklı saldırı girişimi engellendi! Sebep: ${reason}`);

    // 1. İtibarı Sıfırla
    updateReputation(source, 'FAILED'); // Puan düşür
    updateReputation(source, 'FAILED'); // Kritik düşüş için tekrarla
    
    // 2. Mühürlü Log Kaydı
    const logEntry = `\n### 🚨 GÜVENLİK İHLALİ [${new Date().toISOString()}]\n` +
                     `- **Kaynak:** ${source}\n` +
                     `- **Sebep:** ${reason}\n` +
                     `- **Engellenen Komut:** \`${payload.cmd}\`\n` +
                     `- **IP Bilgisi:** ${reqInfo.ip || '127.0.0.1'}\n` +
                     `---\n`;

    fs.appendFileSync(BREACH_LOG, logEntry);

    // 3. Dashboard Alarmı (State'e işle)
    const statePath = '/workspace/project-ecosystem/.planning/state.json';
    if (fs.existsSync(statePath)) {
        const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        state.security_alert = {
            active: true,
            last_breach: new Date().toISOString(),
            source: source
        };
        fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    }
}

module.exports = { inspectTraffic };
