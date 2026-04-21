import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --------------------------------------------------------------------
// Global state
// --------------------------------------------------------------------
let scene, camera, renderer, controls;
let anchorMeshes = [];
let tagMesh, tagLine, trailLine;
let distanceRings = [];
let trailPositions = [];
const TRAIL_LENGTH = 50;
let currentTagPosition = new THREE.Vector3(0, 0, 0);
let targetTagPosition = new THREE.Vector3(0, 0, 0);
const LERP_FACTOR = 0.15;

// Anchor positions (will be fetched from server)
let anchors = [
    { x: 0.0, y: 0.0 },
    { x: 3.0, y: 0.0 },
    { x: 1.5, y: 2.598 }
];

// WebSocket
let ws = null;
let reconnectTimeout = null;
const WS_RETRY_DELAY = 3000;

// DOM elements
const chipIdEl = document.getElementById('chip-id');
const batteryEl = document.getElementById('battery');
const positionEl = document.getElementById('position');
const distA1El = document.getElementById('dist-a1');
const distA2El = document.getElementById('dist-a2');
const distA3El = document.getElementById('dist-a3');
const lastUpdateEl = document.getElementById('last-update');
const anchorBat1El = document.getElementById('anchor-bat-1');
const anchorBat2El = document.getElementById('anchor-bat-2');
const anchorBat3El = document.getElementById('anchor-bat-3');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');

// --------------------------------------------------------------------
// Three.js scene setup
// --------------------------------------------------------------------
function initScene() {
    const canvas = document.getElementById('scene-canvas');

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d0d1a);

    // Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 8);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    // Floor grid
    const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
    gridHelper.position.y = -0.01; // slightly below floor to avoid z‑fighting
    scene.add(gridHelper);

    // Create anchor markers
    createAnchors();

    // Create tag sphere
    createTag();

    // Create distance rings (initially invisible)
    createDistanceRings();

    // Create trail line
    createTrail();

    // Window resize handler
    window.addEventListener('resize', onWindowResize);
}

function createAnchors() {
    const coneGeometry = new THREE.ConeGeometry(0.15, 0.4, 8);
    const redMaterial = new THREE.MeshPhongMaterial({ color: 0xff4444 });

    for (let i = 0; i < 3; i++) {
        const cone = new THREE.Mesh(coneGeometry, redMaterial);
        cone.position.set(anchors[i].x, 0.2, anchors[i].y); // Y up, Z forward (we treat Y as vertical)
        cone.rotation.x = Math.PI; // cone points up by default, rotate to point up? Actually cone geometry points up along Y, we want tip up.
        scene.add(cone);
        anchorMeshes.push(cone);

        // Label (using a simple sprite or a plane with text texture)
        // For simplicity, we'll just use a small plane with a colored texture.
        // Since we don't have a CSS2DRenderer, we'll skip for now.
    }
}

function createTag() {
    // Tag sphere
    const sphereGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const blueMaterial = new THREE.MeshPhongMaterial({ color: 0x4fc3f7 });
    tagMesh = new THREE.Mesh(sphereGeometry, blueMaterial);
    tagMesh.position.set(0, 0.15, 0);
    scene.add(tagMesh);

    // Vertical line from tag to floor
    const lineGeometry = new THREE.BufferGeometry();
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.7 });
    tagLine = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(tagLine);
    updateTagLine();
}

function createDistanceRings() {
    const ringGeometry = new THREE.RingGeometry(0.5, 0.52, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0x4fc3f7,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.3
    });

    for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2; // lay flat on XZ plane (Y up)
        ring.position.set(anchors[i].x, 0.01, anchors[i].y);
        ring.visible = false;
        scene.add(ring);
        distanceRings.push(ring);
    }
}

function createTrail() {
    const trailGeometry = new THREE.BufferGeometry();
    const trailMaterial = new THREE.LineBasicMaterial({
        color: 0x4fc3f7,
        transparent: true,
        opacity: 0.8,
        linewidth: 2
    });
    trailLine = new THREE.Line(trailGeometry, trailMaterial);
    scene.add(trailLine);
}

function updateTagLine() {
    const points = [
        new THREE.Vector3(currentTagPosition.x, currentTagPosition.y, currentTagPosition.z),
        new THREE.Vector3(currentTagPosition.x, -0.01, currentTagPosition.z)
    ];
    tagLine.geometry.setFromPoints(points);
}

function updateTrail() {
    if (trailPositions.length < 2) {
        trailLine.geometry.setFromPoints([]);
        return;
    }
    const points = trailPositions.map(p => new THREE.Vector3(p.x, p.y + 0.05, p.z)); // slight lift
    trailLine.geometry.setFromPoints(points);
}

// --------------------------------------------------------------------
// Anchor position updates
// --------------------------------------------------------------------
function updateAnchorPositions(newAnchors) {
    anchors = newAnchors;
    // Update anchor meshes
    for (let i = 0; i < 3; i++) {
        anchorMeshes[i].position.set(anchors[i].x, 0.2, anchors[i].y);
        // Update distance rings positions
        distanceRings[i].position.set(anchors[i].x, 0.01, anchors[i].y);
    }
    // Update UI inputs
    document.getElementById('a1-x').value = anchors[0].x.toFixed(2);
    document.getElementById('a1-y').value = anchors[0].y.toFixed(2);
    document.getElementById('a2-x').value = anchors[1].x.toFixed(2);
    document.getElementById('a2-y').value = anchors[1].y.toFixed(2);
    document.getElementById('a3-x').value = anchors[2].x.toFixed(2);
    document.getElementById('a3-y').value = anchors[2].y.toFixed(2);
}

// --------------------------------------------------------------------
// UI updates
// --------------------------------------------------------------------
function updateHUD(data) {
    chipIdEl.textContent = data.chip_id || '—';
    const voltage = parseFloat(data.battery_v);
    batteryEl.textContent = `${voltage.toFixed(2)} V`;
    batteryEl.className = 'hud-value';
    if (voltage >= 3.5) {
        batteryEl.classList.add('battery-green');
    } else if (voltage >= 3.3) {
        batteryEl.classList.add('battery-orange');
    } else {
        batteryEl.classList.add('battery-red');
    }

    const x = data.x !== null ? data.x.toFixed(2) : '—';
    const y = data.y !== null ? data.y.toFixed(2) : '—';
    positionEl.textContent = `(${x}, ${y})`;

    distA1El.textContent = `${data.distances[0]} m`;
    distA2El.textContent = `${data.distances[1]} m`;
    distA3El.textContent = `${data.distances[2]} m`;

    const date = new Date(data.timestamp);
    lastUpdateEl.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function updateAnchorBattery(anchorNumber, batteryVoltage, chipId, timestamp) {
    const el = anchorNumber === 1 ? anchorBat1El : anchorNumber === 2 ? anchorBat2El : anchorBat3El;
    const voltage = parseFloat(batteryVoltage);
    el.textContent = `${voltage.toFixed(2)} V`;
    el.className = 'hud-value';
    if (voltage >= 3.5) {
        el.classList.add('battery-green');
    } else if (voltage >= 3.3) {
        el.classList.add('battery-orange');
    } else {
        el.classList.add('battery-red');
    }
}

function updateDistanceRings(distances) {
    for (let i = 0; i < 3; i++) {
        const d = parseFloat(distances[i]);
        if (isNaN(d) || d <= 0) {
            distanceRings[i].visible = false;
            continue;
        }
        distanceRings[i].visible = true;
        // Scale ring to radius d
        distanceRings[i].scale.set(d, d, d);
    }
}

// --------------------------------------------------------------------
// WebSocket
// --------------------------------------------------------------------
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('WebSocket connected');
        setConnectionStatus(true);
        // Fetch current anchors
        fetch('/api/anchors')
            .then(res => res.json())
            .then(anchors => updateAnchorPositions(anchors))
            .catch(err => console.error('Failed to fetch anchors:', err));
        // Fetch anchor batteries
        fetch('/api/anchor-batteries')
            .then(res => res.json())
            .then(batteries => {
                // batteries is an object with keys 1,2,3
                for (const [anchorNum, data] of Object.entries(batteries)) {
                    if (data && data.battery_v !== null) {
                        updateAnchorBattery(parseInt(anchorNum), data.battery_v, data.chip_id, data.timestamp);
                    }
                }
            })
            .catch(err => console.error('Failed to fetch anchor batteries:', err));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'position') {
            // Update target position for smooth interpolation
            if (data.x !== null && data.y !== null) {
                targetTagPosition.set(data.x, 0.15, data.y);
                // Add to trail
                trailPositions.push(targetTagPosition.clone());
                if (trailPositions.length > TRAIL_LENGTH) {
                    trailPositions.shift();
                }
            }
            updateHUD(data);
            updateDistanceRings(data.distances);
        } else if (data.type === 'anchors') {
            updateAnchorPositions(data.anchors);
        } else if (data.type === 'anchor_status') {
            updateAnchorBattery(data.anchor_number, data.battery_v, data.chip_id, data.timestamp);
        }
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
        setConnectionStatus(false);
        // Attempt reconnect after delay
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(connectWebSocket, WS_RETRY_DELAY);
    };

    ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        ws.close();
    };
}

function setConnectionStatus(connected) {
    if (connected) {
        statusDot.className = 'status-dot status-connected';
        statusText.textContent = 'Connected';
    } else {
        statusDot.className = 'status-dot status-disconnected';
        statusText.textContent = 'Disconnected';
    }
}

// --------------------------------------------------------------------
// Anchor config panel
// --------------------------------------------------------------------
function setupAnchorPanel() {
    // Populate inputs with current anchors
    updateAnchorPositions(anchors);

    // Apply button
    document.getElementById('apply-anchors').addEventListener('click', () => {
        const newAnchors = [
            {
                x: parseFloat(document.getElementById('a1-x').value),
                y: parseFloat(document.getElementById('a1-y').value)
            },
            {
                x: parseFloat(document.getElementById('a2-x').value),
                y: parseFloat(document.getElementById('a2-y').value)
            },
            {
                x: parseFloat(document.getElementById('a3-x').value),
                y: parseFloat(document.getElementById('a3-y').value)
            }
        ];
        // Validate
        if (newAnchors.some(a => isNaN(a.x) || isNaN(a.y))) {
            alert('Please enter valid numbers for all coordinates.');
            return;
        }

        // POST to server
        fetch('/api/anchors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newAnchors)
        })
            .then(res => res.json())
            .then(data => {
                console.log('Anchors updated:', data);
                // Server will broadcast via WebSocket, which will trigger update
            })
            .catch(err => console.error('Failed to update anchors:', err));
    });

    // Toggle panel
    document.getElementById('panel-toggle').addEventListener('click', () => {
        const panel = document.getElementById('anchor-panel');
        const btn = document.getElementById('toggle-btn');
        if (panel.classList.contains('hidden')) {
            panel.classList.remove('hidden');
            btn.textContent = '−';
        } else {
            panel.classList.add('hidden');
            btn.textContent = '+';
        }
    });
}

// --------------------------------------------------------------------
// Window resize
// --------------------------------------------------------------------
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --------------------------------------------------------------------
// Animation loop
// --------------------------------------------------------------------
function animate() {
    requestAnimationFrame(animate);

    // Smoothly interpolate tag position
    currentTagPosition.lerp(targetTagPosition, LERP_FACTOR);
    tagMesh.position.copy(currentTagPosition);
    updateTagLine();
    updateTrail();

    controls.update();
    renderer.render(scene, camera);
}

// --------------------------------------------------------------------
// Initialization
// --------------------------------------------------------------------
function init() {
    initScene();
    setupAnchorPanel();
    connectWebSocket();
    animate();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}