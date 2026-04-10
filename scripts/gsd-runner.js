const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

/**
 * GSD-OpenClaw Adapter (Runner) - Production Grade
 * Amacı: .planning/plans/ dizinindeki XML/Markdown görevlerini otonom, güvenli ve proaktif şekilde execute etmek.
 */

const PLANS_DIR = path.join('/workspace/project-ecosystem', '.planning/plans');
const LOGS_DIR = path.join('/workspace/project-ecosystem', '.planning/LOGS');
const STATE_FILE = path.join('/workspace/project-ecosystem', '.planning/state.json');
const LOCK_FILE = path.join('/workspace/project-ecosystem', '.runner.lock');

const { processInbox, sendFeedback } = require('./hermez-adapter');
const { evaluateNetworkHealth } = require('./decision-engine');
const { evaluateRiskAndReputation, updateReputation } = require('./reputation-engine');

const COMMAND_WHITELIST = [
    'echo', 'git pull', 'git status', 'git log', 'git reset', 'git clone',
    'npm install', 'npm prune', 'ls', 'df -h', 'uname -a', 'cat', 'node'
];

function getPlanHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
}

function loadState() {
    if (fs.existsSync(STATE_FILE)) {
        return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
    return { last_run: null, processed_plans: {} };
}

function saveState(state) {
    state.last_run = new Date().toISOString();
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function sanitizeCommand(cmd) {
    return cmd.trim();
}

function isCommandAllowed(cmd) {
    return COMMAND_WHITELIST.some(allowed => cmd.startsWith(allowed));
}

const { installSkill, loadSkill, initializeRegistry } = require('./skill-manager');

// ... existing code

const { generateInterface } = require('./interface-generator');

// ... (existing includes)

async function runGSD() {
    initializeRegistry();
    // ...
    // ...
    if (fs.existsSync(LOCK_FILE)) {
        console.log('⚠️ Runner zaten çalışıyor (Lock dosyası mevcut). Çıkılıyor...');
        return;
    }
    fs.writeFileSync(LOCK_FILE, process.pid.toString());

    try {
        console.log('🚀 GSD-OpenClaw Runner (Autonomous Master) Başlatıldı...');
        
        // 1. Dağıtık İstihbarat & Ağ Sağlığı Kontrolü
        const networkHealth = evaluateNetworkHealth();
        
        // 2. Bakım ve Öngörücü Planlama
        try {
            require('./maintenance-engine'); 
        } catch (mErr) {
            console.error('⚠️ Bakım Motoru hatası:', mErr.message);
        }

        // 3. Harici Girdi (Her-Me-Z) İşleme
        processInbox();
        
        const state = loadState();
        if (!fs.existsSync(PLANS_DIR)) fs.mkdirSync(PLANS_DIR, { recursive: true });
        
        const plans = fs.readdirSync(PLANS_DIR).filter(f => f.endsWith('.md') || f.endsWith('.xml'));

        if (plans.length === 0) {
            console.log('📭 Bekleyen plan bulunamadı.');
        } else {
            // 4. İstemci Risk Analizi ve Sıralama
            const executionQueue = [];
            for (const planFile of plans) {
                const planPath = path.join(PLANS_DIR, planFile);
                let content;
                try { content = fs.readFileSync(planPath, 'utf8'); } catch (e) { continue; }

                const planHash = getPlanHash(content);
                const planState = state.processed_plans[planFile];

                if (planState && planState.hash === planHash && planState.status === 'COMPLETED') continue;

                const source = planState?.source || 'internal';
                const actionMatch = content.match(/<action>(.*?)<\/action>/s);
                const cmd = actionMatch ? actionMatch[1].trim() : '';
                
                // Risk & İtibar Değerlendirmesi
                const riskEval = evaluateRiskAndReputation(
                    { id: planFile, source, cmd, priority: 1 }, 
                    { success_rate: 100 }
                );

                if (riskEval.action === 'EXECUTE') {
                    executionQueue.push({ file: planFile, content, hash: planHash, source, cmd });
                } else {
                    console.log(`🚫 Görev Askıya Alındı (${planFile}): ${riskEval.reason}`);
                    if (!state.processed_plans[planFile]) {
                        state.processed_plans[planFile] = { hash: planHash, status: riskEval.action, updated_at: new Date().toISOString(), source };
                    } else {
                        state.processed_plans[planFile].status = riskEval.action;
                    }
                }
            }

            // 5. İnfaz Döngüsü
            for (const item of executionQueue) {
                const planFile = item.file;
                console.log(`\n📖 İşleniyor: ${planFile} (Kaynak: ${item.source})`);
                
                state.processed_plans[planFile] = {
                    hash: item.hash,
                    status: 'IN_PROGRESS',
                    updated_at: new Date().toISOString(),
                    source: item.source
                };

                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const logPath = path.join(LOGS_DIR, `exec-${planFile}-${timestamp}.json`);
                const startTime = Date.now();

                try {
                    if (planFile.endsWith('.xml') && (!item.content.includes('<task>') || !item.content.includes('</task>'))) {
                        throw new Error('Geçersiz GSD XML formatı.');
                    }

                    if (item.cmd) {
                        const sanitizedCmd = sanitizeCommand(item.cmd);
                        if (!isCommandAllowed(sanitizedCmd)) throw new Error(`Güvenlik: '${sanitizedCmd}' Whitelist dışı.`);

                        console.log(`🛠️ İnfaz: ${sanitizedCmd}`);
                        const output = execSync(sanitizedCmd, { cwd: '/workspace/project-ecosystem' }).toString();
                        console.log('✅ Çıktı Alındı.');
                    }
                    
                    const endTime = Date.now();
                    state.processed_plans[planFile].status = 'COMPLETED';
                    state.processed_plans[planFile].runtime_ms = endTime - startTime;
                    updateReputation(item.source, 'COMPLETED');
                    if (item.source === 'hermez') sendFeedback(planFile.replace('hermez_', '').replace('.xml', ''), 'COMPLETED', logPath);

                } catch (err) {
                    state.processed_plans[planFile].status = 'FAILED';
                    state.processed_plans[planFile].error = err.message;
                    updateReputation(item.source, 'FAILED');
                    if (item.source === 'hermez') sendFeedback(planFile.replace('hermez_', '').replace('.xml', ''), 'FAILED', logPath, err.message);
                    console.error(`❌ Hata:`, err.message);
                }

                fs.writeFileSync(logPath, JSON.stringify({ ...state.processed_plans[planFile], plan: planFile, executed_at: new Date().toISOString() }, null, 2));
            }
        }
        saveState(state);
        
        // Aşama 7: Otonom Görselleştirme (Dashboard Güncelleme)
        await generateInterface();

    } finally {
        if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
    }
}

runGSD().catch(err => console.error('❌ Runner hatası:', err));
