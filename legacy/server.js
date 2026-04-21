const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const trilaterate = require('./trilateration.js');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Default anchor positions (equilateral triangle, side 3 m, centred at origin)
let anchors = [
    { x: 0.0, y: 0.0 },
    { x: 3.0, y: 0.0 },
    { x: 1.5, y: 2.598 }
];

// Anchor battery statuses keyed by anchor_number (1‑3)
let anchorBatteries = {
    1: { chip_id: null, battery_v: null, timestamp: null },
    2: { chip_id: null, battery_v: null, timestamp: null },
    3: { chip_id: null, battery_v: null, timestamp: null }
};

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Parse JSON bodies
app.use(express.json());

// Request logging middleware (must be after express.json() to have req.body)
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const timestamp = new Date().toISOString();
        let logLine = `[${timestamp}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;
        // Add payload for specific POST endpoints
        if (req.method === 'POST' && req.body && (req.originalUrl === '/api/status' || req.originalUrl === '/api/anchors')) {
            const payload = JSON.stringify(req.body);
            // Truncate if too long (e.g., > 200 chars)
            const truncated = payload.length > 200 ? payload.substring(0, 200) + '...' : payload;
            logLine += ` payload=${truncated}`;
        }
        console.log(logLine);
    });
    next();
});

// POST /api/status - receive UWB tag or anchor data
app.post('/api/status', (req, res) => {
    const { chip_id, anchor_distances, battery_v, role, anchor_number } = req.body;
    const timestamp = Date.now();

    // Default role to "tag" for backward compatibility
    const effectiveRole = role || 'tag';

    if (effectiveRole === 'tag') {
        // Validate required fields for tag
        if (chip_id == null || anchor_distances == null || battery_v == null) {
            return res.status(400).json({ error: 'Missing required fields for tag' });
        }

        // Ensure we have three distances (allow numbers or strings)
        if (!Array.isArray(anchor_distances) || anchor_distances.length !== 3) {
            return res.status(400).json({ error: 'anchor_distances must be an array of three numbers or strings' });
        }

        // Convert distances to numbers (accept numbers or strings)
        const distances = anchor_distances.map(d => typeof d === 'number' ? d : parseFloat(d));
        if (distances.some(d => isNaN(d) || typeof d !== 'number')) {
            return res.status(400).json({ error: 'Invalid distance values' });
        }

        // Compute tag position via trilateration
        const position = trilaterate(anchors, distances);

        // Convert battery_v to string (if number, format to two decimal places)
        const batteryStr = typeof battery_v === 'number' ? battery_v.toFixed(2) : String(battery_v);

        // Prepare WebSocket message
        const wsMessage = {
            type: 'position',
            x: position ? position.x : null,
            y: position ? position.y : null,
            distances: distances, // use numeric distances
            battery_v: batteryStr,
            chip_id,
            timestamp
        };

        // Broadcast to all connected clients
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(wsMessage));
            }
        });

        // Respond with success
        res.json({ status: 'ok', position });
    } else if (effectiveRole === 'anchor') {
        // Validate required fields for anchor
        if (chip_id == null || battery_v == null || anchor_number == null) {
            return res.status(400).json({ error: 'Missing required fields for anchor' });
        }
        if (![1, 2, 3].includes(anchor_number)) {
            return res.status(400).json({ error: 'anchor_number must be 1, 2, or 3' });
        }

        // Convert battery_v to string (if number, format to two decimal places)
        const batteryStr = typeof battery_v === 'number' ? battery_v.toFixed(2) : String(battery_v);

        // Update anchor battery status
        anchorBatteries[anchor_number] = {
            chip_id,
            battery_v: batteryStr,
            timestamp
        };

        // Broadcast anchor status to clients
        const wsMessage = {
            type: 'anchor_status',
            anchor_number,
            chip_id,
            battery_v: batteryStr,
            timestamp
        };
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(wsMessage));
            }
        });

        res.json({ status: 'ok', anchor_number, battery_v: batteryStr });
    } else {
        res.status(400).json({ error: 'Invalid role, must be "tag" or "anchor"' });
    }
});

// GET /api/anchors - return current anchor positions
app.get('/api/anchors', (req, res) => {
    res.json(anchors);
});

// GET /api/anchor-batteries - return current anchor battery statuses
app.get('/api/anchor-batteries', (req, res) => {
    res.json(anchorBatteries);
});

// POST /api/anchors - update anchor positions
app.post('/api/anchors', (req, res) => {
    const newAnchors = req.body;
    if (!Array.isArray(newAnchors) || newAnchors.length !== 3) {
        return res.status(400).json({ error: 'Expected array of three {x, y} objects' });
    }
    // Validate each anchor has x and y numbers
    for (let i = 0; i < newAnchors.length; i++) {
        if (typeof newAnchors[i].x !== 'number' || typeof newAnchors[i].y !== 'number') {
            return res.status(400).json({ error: `Anchor ${i} missing numeric x or y` });
        }
    }
    anchors = newAnchors;
    // Broadcast anchor update to clients
    const wsMessage = {
        type: 'anchors',
        anchors
    };
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(wsMessage));
        }
    });
    res.json({ status: 'ok', anchors });
});

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('New WebSocket client connected');
    // Send current anchors to the newly connected client
    ws.send(JSON.stringify({ type: 'anchors', anchors }));
});

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Static files served from ${path.join(__dirname, 'public')}`);
});