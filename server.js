/**
 * SmartRail - High Performance Node.js Server
 * Features built-in SQLite persistence (node:sqlite) for zero external dependencies.
 * Tracks:
 * 1. Recommended train clicks
 * 2. Active chat users and live commuter messages
 * 3. Real-time statistics and analytics
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 8080;
const DB_PATH = path.join(__dirname, 'smartrail.db');

// Initialize SQLite Database
const db = new DatabaseSync(DB_PATH);

// Setup Schema
db.exec(`
    CREATE TABLE IF NOT EXISTS recommendation_clicks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        username TEXT DEFAULT 'Commuter',
        train_time TEXT NOT NULL,
        train_type TEXT NOT NULL,
        route TEXT NOT NULL,
        crowd_pct INTEGER NOT NULL,
        preference TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chat_users (
        user_id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        station TEXT DEFAULT 'General',
        last_active INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        username TEXT NOT NULL,
        message TEXT NOT NULL,
        station_tag TEXT DEFAULT 'General',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

// Pre-seed realistic seed data if empty
const countClicks = db.prepare('SELECT COUNT(*) as count FROM recommendation_clicks').get().count;
if (countClicks === 0) {
    const seedClicks = [
        ['usr_bandra_101', 'Rohan (Bandra)', '05:51 PM', 'FAST', 'Churchgate → Dadar', 54, 'balanced'],
        ['usr_andheri_204', 'Pooja (Andheri)', '05:51 PM', 'FAST', 'Churchgate → Dadar', 54, 'least_crowded'],
        ['usr_dadar_309', 'Amit (Dadar)', '08:32 AM', 'SLOW', 'Borivali → Churchgate', 48, 'fastest'],
        ['usr_thane_412', 'Sneha (Thane)', '09:05 AM', 'FAST', 'Thane → CSMT', 62, 'balanced'],
        ['usr_kurla_551', 'Vikram (Kurla)', '06:15 PM', 'FAST', 'CSMT → Kalyan', 58, 'least_crowded']
    ];
    const insertClick = db.prepare(`
        INSERT INTO recommendation_clicks (user_id, username, train_time, train_type, route, crowd_pct, preference)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    seedClicks.forEach(c => insertClick.run(...c));
}

const countMsgs = db.prepare('SELECT COUNT(*) as count FROM chat_messages').get().count;
if (countMsgs === 0) {
    const seedMsgs = [
        ['usr_seed_1', 'Kunal (Borivali)', 'Fast local from platform 3 just left, moderate crowd inside.', 'Borivali'],
        ['usr_seed_2', 'Neha (Churchgate)', 'Evening rush starting early today at Churchgate. Recommend waiting for originating train.', 'Churchgate'],
        ['usr_seed_3', 'Farhan (Dadar)', 'Dadar interchange bridge is reasonably smooth right now.', 'Dadar'],
        ['usr_seed_4', 'Ananya (Bandra)', 'SmartRail recommendation saved me from the 5:34 packed train!', 'Bandra'],
        ['usr_seed_5', 'Rajesh (Andheri)', 'AC local arriving on platform 5 in 10 mins.', 'Andheri']
    ];
    const insertMsg = db.prepare(`
        INSERT INTO chat_messages (user_id, username, message, station_tag)
        VALUES (?, ?, ?, ?)
    `);
    seedMsgs.forEach(m => insertMsg.run(...m));

    // Seed some active simulated commuters for realism
    const nowSec = Math.floor(Date.now() / 1000);
    const insertUser = db.prepare(`
        INSERT OR REPLACE INTO chat_users (user_id, username, station, last_active)
        VALUES (?, ?, ?, ?)
    `);
    insertUser.run('usr_seed_1', 'Kunal (Borivali)', 'Borivali', nowSec - 45);
    insertUser.run('usr_seed_2', 'Neha (Churchgate)', 'Churchgate', nowSec - 70);
    insertUser.run('usr_seed_3', 'Farhan (Dadar)', 'Dadar', nowSec - 110);
    insertUser.run('usr_seed_4', 'Ananya (Bandra)', 'Bandra', nowSec - 15);
    insertUser.run('usr_seed_5', 'Rajesh (Andheri)', 'Andheri', nowSec - 180);
}

// Keep simulated baseline commuters lively in Mumbai local network
function refreshBaselineCommuters() {
    try {
        const now = Math.floor(Date.now() / 1000);
        const refreshUser = db.prepare("UPDATE chat_users SET last_active = ? WHERE user_id LIKE 'usr_seed_%'");
        refreshUser.run(now);
    } catch (e) {
        // silent
    }
}
refreshBaselineCommuters();
setInterval(refreshBaselineCommuters, 120000);




// Helpers for Clean Active Chat Calculation
function getActiveChatUsersCount() {
    const activeCutoff = Math.floor(Date.now() / 1000) - 300; // Active within 5 minutes
    const row = db.prepare('SELECT COUNT(*) as count FROM chat_users WHERE last_active >= ?').get(activeCutoff);
    return row ? row.count : 0;
}

function getActiveChatUsersList() {
    const activeCutoff = Math.floor(Date.now() / 1000) - 300;
    return db.prepare('SELECT user_id, username, station, last_active FROM chat_users WHERE last_active >= ? ORDER BY last_active DESC LIMIT 20').all(activeCutoff);
}

// MIME types
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon'
};

// Parse JSON Body Helper
function parseJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
            if (body.length > 1e6) {
                req.destroy();
                reject(new Error('Payload too large'));
            }
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (err) {
                reject(err);
            }
        });
    });
}

const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // API ENDPOINTS
    try {
        // 1. Get Live Stats (Recommendation clicks, active chat users, breakdown)
        if (pathname === '/api/stats' && req.method === 'GET') {
            const totalClicks = db.prepare('SELECT COUNT(*) as count FROM recommendation_clicks').get().count;
            const activeUsers = getActiveChatUsersCount();
            const totalMessages = db.prepare('SELECT COUNT(*) as count FROM chat_messages').get().count;
            
            const recentClicks = db.prepare(`
                SELECT id, user_id, username, train_time, train_type, route, crowd_pct, preference, created_at 
                FROM recommendation_clicks 
                ORDER BY id DESC LIMIT 10
            `).all();

            const prefBreakdown = db.prepare(`
                SELECT preference, COUNT(*) as count 
                FROM recommendation_clicks 
                GROUP BY preference
            `).all();

            const routeBreakdown = db.prepare(`
                SELECT route, COUNT(*) as count 
                FROM recommendation_clicks 
                GROUP BY route 
                ORDER BY count DESC LIMIT 5
            `).all();

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                stats: {
                    totalClicks,
                    activeChatUsers: activeUsers,
                    totalMessages,
                    recentClicks,
                    prefBreakdown,
                    routeBreakdown
                }
            }));
            return;
        }

        // 2. Track a click on the Recommended Train
        if (pathname === '/api/recommendations/click' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const { userId, username, trainTime, trainType, route, crowdPct, preference } = body;

            if (!trainTime || !route) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing required train click fields' }));
                return;
            }

            const stmt = db.prepare(`
                INSERT INTO recommendation_clicks (user_id, username, train_time, train_type, route, crowd_pct, preference)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            const info = stmt.run(
                userId || 'anonymous',
                username || 'Mumbai Commuter',
                trainTime,
                trainType || 'FAST',
                route,
                Number(crowdPct) || 50,
                preference || 'balanced'
            );

            const totalClicks = db.prepare('SELECT COUNT(*) as count FROM recommendation_clicks').get().count;

            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                insertedId: info.lastInsertRowid,
                totalClicks
            }));
            return;
        }

        // 3. Get Chat Messages and Active Users
        if (pathname === '/api/chat/messages' && req.method === 'GET') {
            const limit = parseInt(url.searchParams.get('limit')) || 30;
            const messages = db.prepare(`
                SELECT id, user_id, username, message, station_tag, created_at 
                FROM chat_messages 
                ORDER BY id DESC LIMIT ?
            `).all(limit).reverse();

            const activeUsers = getActiveChatUsersCount();
            const activeList = getActiveChatUsersList();

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                messages,
                activeChatUsers: activeUsers,
                activeList
            }));
            return;
        }

        // 4. Post a Chat Message
        if (pathname === '/api/chat/messages' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const { userId, username, message, stationTag } = body;

            if (!userId || !message || !message.trim()) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'User ID and non-empty message required' }));
                return;
            }

            const cleanMsg = message.trim().slice(0, 300);
            const cleanUser = (username || 'Commuter').trim().slice(0, 40);
            const cleanStation = (stationTag || 'General').trim().slice(0, 30);
            const nowSec = Math.floor(Date.now() / 1000);

            // Insert message
            const stmt = db.prepare(`
                INSERT INTO chat_messages (user_id, username, message, station_tag)
                VALUES (?, ?, ?, ?)
            `);
            const info = stmt.run(userId, cleanUser, cleanMsg, cleanStation);

            // Update user's last_active
            const userStmt = db.prepare(`
                INSERT OR REPLACE INTO chat_users (user_id, username, station, last_active)
                VALUES (?, ?, ?, ?)
            `);
            userStmt.run(userId, cleanUser, cleanStation, nowSec);

            const activeUsers = getActiveChatUsersCount();

            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                messageId: info.lastInsertRowid,
                activeChatUsers: activeUsers
            }));
            return;
        }

        // 5. Chat Heartbeat (User presence)
        if (pathname === '/api/chat/heartbeat' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const { userId, username, station } = body;

            if (userId) {
                const nowSec = Math.floor(Date.now() / 1000);
                const userStmt = db.prepare(`
                    INSERT OR REPLACE INTO chat_users (user_id, username, station, last_active)
                    VALUES (?, ?, ?, ?)
                `);
                userStmt.run(
                    userId,
                    (username || 'Commuter').trim().slice(0, 40),
                    (station || 'General').trim().slice(0, 30),
                    nowSec
                );
            }

            const activeUsers = getActiveChatUsersCount();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, activeChatUsers: activeUsers }));
            return;
        }

        // 6. Database raw export / inspection
        if (pathname === '/api/database/export' && req.method === 'GET') {
            const clicks = db.prepare('SELECT * FROM recommendation_clicks ORDER BY id DESC').all();
            const users = db.prepare('SELECT * FROM chat_users ORDER BY last_active DESC').all();
            const messages = db.prepare('SELECT * FROM chat_messages ORDER BY id DESC').all();

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                database: 'smartrail.db',
                exportedAt: new Date().toISOString(),
                tables: {
                    recommendation_clicks: clicks,
                    chat_users: users,
                    chat_messages: messages
                }
            }, null, 2));
            return;
        }

    } catch (apiError) {
        console.error('API Error:', apiError);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: apiError.message }));
        return;
    }

    // STATIC FILE SERVING
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

    // Security check: ensure path is within directory
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(__dirname))) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
    }

    fs.stat(resolvedPath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 - Not Found');
            return;
        }

        const ext = path.extname(resolvedPath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType });
        const stream = fs.createReadStream(resolvedPath);
        stream.pipe(res);
    });
});

server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` 🚆 SmartRail Classy Mumbai Server is Running`);
    console.log(` 📍 URL: http://localhost:${PORT}`);
    console.log(` 💾 Database: SQLite (smartrail.db)`);
    console.log(`====================================================`);
});
