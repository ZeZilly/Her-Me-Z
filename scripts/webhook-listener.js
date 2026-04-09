const http = require('http');
const { processInbox } = require('./hermez-adapter');
const { inspectTraffic } = require('./sentinel-agent');

const PORT = process.env.GATEWAY_PORT || 18789;

/**
 * Ekosistem Webhook Dinleyicisi
 * Dış dünyadan (Her-Me-Z, Telegram vb.) gelen tetikleyicileri karşılar.
 */
const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/trigger') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body);
                
                // --- SENTINEL GÜVENLİK SÜZGECİ ---
                const inspection = inspectTraffic(payload, { ip: req.socket.remoteAddress });
                if (!inspection.allowed) {
                    console.error(`🛡️ Sentinel: İstek engellendi. Sebep: ${inspection.reason}`);
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: inspection.reason }));
                    return;
                }
                // ---------------------------------

                console.log(`\n🔔 Webhook Tetiklendi: ${payload.task_name || 'Adsız Görev'}`);
                
                // Gelen yükü Her-Me-Z Inbox'ına bir JSON plan olarak bırak
                const fs = require('fs');
                const path = require('path');
                const id = payload.id || `web-${Date.now()}`;
                const inboxPath = path.join('/workspace/project-ecosystem/.planning/hermez_inbox', `${id}.json`);
                
                fs.writeFileSync(inboxPath, JSON.stringify(payload, null, 2));
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'accepted', id: id }));
            } catch (err) {
                res.writeHead(400);
                res.end('Geçersiz JSON');
            }
        });
    } else {
        res.writeHead(404);
        res.end('Bulunamadı');
    }
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`🌐 Otonom Orkestratör Webhook Portu Aktif: http://127.0.0.1:${PORT}/trigger`);
});
