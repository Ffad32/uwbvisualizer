// Usage: node simulate.js
// Simulates a UWB tag moving along a Lissajous path and POSTs
// distance measurements to the local visualizer server.
// Start the server first: npm start

const http = require('http');

// Anchor positions (equilateral triangle, side 3 m)
const anchors = [
    { x: 0.0, y: 0.0 },
    { x: 3.0, y: 0.0 },
    { x: 1.5, y: 2.598 }
];

// Gaussian noise helper (Box-Muller transform)
function gaussianNoise(stddev) {
    const u1 = Math.random(), u2 = Math.random();
    return stddev * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// Euclidean distance between two points
function distance(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// Format number to 4 decimal places as string
function toFixed4(num) {
    return num.toFixed(4);
}

// Simulated tag position function (Lissajous)
function tagPosition(t) {
    // x(t) = 1.5 + 1.2 * sin(t * 0.8)
    // y(t) = 1.3 + 1.0 * sin(t * 0.5)
    const x = 1.5 + 1.2 * Math.sin(t * 0.8);
    const y = 1.3 + 1.0 * Math.sin(t * 0.5);
    return { x, y };
}

// Simulated battery voltage (oscillates between 3.7 and 4.2 V)
function batteryVoltage(t) {
    return 3.95 + 0.25 * Math.sin(t * 0.02); // period ~314 seconds
}

// POST data to server
function postData(distances, battery, chipId) {
    const postData = JSON.stringify({
        chip_id: chipId,
        anchor_distances: distances.map(toFixed4),
        battery_v: battery.toFixed(2),
        role: 'tag'
    });

    const options = {
        hostname: 'localhost',
        port: 8080,
        path: '/api/status',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            if (res.statusCode !== 200) {
                console.error(`[SIM] Server responded with ${res.statusCode}: ${data}`);
            }
        });
    });

    req.on('error', (err) => {
        if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
            console.log('[SIM] Server not reachable, retrying...');
        } else {
            console.error(`[SIM] Request error: ${err.message}`);
        }
    });

    req.write(postData);
    req.end();
}

function postAnchorData(anchorNumber, battery, chipId) {
    const postData = JSON.stringify({
        chip_id: chipId,
        role: 'anchor',
        anchor_number: anchorNumber,
        battery_v: battery.toFixed(2)
    });

    const options = {
        hostname: 'localhost',
        port: 8080,
        path: '/api/status',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            if (res.statusCode !== 200) {
                console.error(`[SIM] Server responded with ${res.statusCode}: ${data}`);
            }
        });
    });

    req.on('error', (err) => {
        if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
            console.log('[SIM] Server not reachable, retrying...');
        } else {
            console.error(`[SIM] Request error: ${err.message}`);
        }
    });

    req.write(postData);
    req.end();
}

// Main simulation loop
function runSimulation() {
    let t = 0;
    let tickCount = 0;
    const tagChipId = 'SIMULATED0001';
    const anchorChipIds = ['ANCHOR000001', 'ANCHOR000002', 'ANCHOR000003'];
    const noiseStdDev = 0.015; // 1.5 cm standard deviation

    console.log('[SIM] Starting UWB tag simulator');
    console.log('[SIM] Ensure server is running on http://localhost:8080');
    console.log('[SIM] Press Ctrl+C to stop\n');

    setInterval(() => {
        const pos = tagPosition(t);
        const bat = batteryVoltage(t);

        // Compute true distances
        const trueDistances = anchors.map(anchor => distance(pos, anchor));
        // Add Gaussian noise
        const noisyDistances = trueDistances.map(d => Math.max(0, d + gaussianNoise(noiseStdDev)));

        // Format for display
        const dispDist = noisyDistances.map(d => d.toFixed(2));
        console.log(`[SIM] t=${t.toFixed(2)}  tag=(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)})  d=[${dispDist.join(', ')}]  bat=${bat.toFixed(2)}V`);

        // POST tag payload
        postData(noisyDistances, bat, tagChipId);

        // POST anchor payload (cycle through anchors 1,2,3)
        const anchorNum = (tickCount % 3) + 1;
        const anchorBat = parseFloat((3.7 + 0.3 * Math.sin(t + anchorNum)).toFixed(2));
        postAnchorData(anchorNum, anchorBat, anchorChipIds[anchorNum - 1]);

        t += 0.05; // increment time
        tickCount++;
    }, 500); // tick every 500 ms
}

// Start simulation
runSimulation();