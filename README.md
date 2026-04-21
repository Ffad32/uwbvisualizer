# UWB Position Visualizer

A real-time 3D position visualization system for ESP32 + DW3000 UWB ranging, built with a **Node.js/TypeScript backend** and a **Vue.js 3 frontend**.

The system receives distance measurements from a UWB tag via HTTP POST, computes the tag's 2D position using trilateration, and streams the result over WebSocket to a browser-based 3D visualizer.

---

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Development Setup](#development-setup)
6. [Build](#build)
7. [REST API](#rest-api)
8. [WebSocket Message Protocol](#websocket-message-protocol)
9. [Configuring Anchor Positions](#configuring-anchor-positions)
10. [Camera Controls](#camera-controls)
11. [HUD Layout](#hud-layout)
12. [Testing with Simulated Data](#testing-with-simulated-data)
13. [Troubleshooting](#troubleshooting)

---

## Features

- **Real-time 3D visualization** – Three.js scene (OrthographicCamera) with floor grid, anchor cones, tag sphere, distance rings, and animated position trail (50 points).
- **WebSocket streaming** – Server broadcasts computed positions and anchor status to all connected clients instantly.
- **REST API** – Accepts `POST /api/status` from UWB tags; exposes anchor configuration endpoints.
- **Anchor configuration UI** – Adjust anchor X/Y positions via the web UI; changes are persisted to the backend immediately.
- **Battery status display** – Colour-coded battery voltage for the tag and all three anchors.
- **Auto-reconnecting WebSocket client** – The Vue composable handles reconnection automatically.
- **Connection status badge** – Live WebSocket connection indicator in the browser UI.
- **Interactive camera controls** – Pan, zoom, and reset the 3D view using mouse, keyboard, or touch gestures; zoom is cursor-anchored.
- **Camera HUD** – On-screen zoom level and world-coordinate readout with `+`, `−`, and reset buttons.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  ESP32 + DW3000 UWB Tag                                 │
│  POST /api/status  →  { chip_id, anchor_distances, ... }│
└───────────────────────────┬─────────────────────────────┘
                            │ HTTP POST
                            ▼
┌─────────────────────────────────────────────────────────┐
│  Node.js / TypeScript Backend  (port 8080)              │
│  ├── Express REST API                                   │
│  │   ├── POST /api/status        (tag data ingestion)   │
│  │   ├── GET  /api/anchors       (read anchor config)   │
│  │   ├── POST /api/anchors       (update anchor config) │
│  │   └── GET  /api/anchor-batteries (anchor battery)   │
│  ├── Trilateration engine                               │
│  └── WebSocket server  →  broadcasts position/status   │
└───────────────────────────┬─────────────────────────────┘
                            │ WebSocket (ws://)
                            ▼
┌─────────────────────────────────────────────────────────┐
│  Vue.js 3 Frontend  (Vite dev server, port 5173)        │
│  ├── useWebSocket composable  (auto-reconnect)          │
│  ├── ThreeScene.vue           (Three.js 3D canvas)      │
│  ├── TagStatusPanel.vue       (tag HUD, top-left)       │
│  ├── AnchorPanel.vue          (anchor config, top-right)│
│  ├── CameraControls.vue       (camera HUD, bottom-left) │
│  └── ConnectionBadge.vue      (WS status, bottom-right) │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | Vue.js 3 (Composition API) |
| Frontend language | TypeScript |
| Frontend build tool | Vite + `@vitejs/plugin-vue` |
| Frontend styling | Tailwind CSS |
| 3D rendering | Three.js |
| Backend runtime | Node.js |
| Backend language | TypeScript |
| Backend framework | Express |
| WebSocket | `ws` library |

---

## Project Structure

```
uwbvisualizer/
├── README.md
├── package.json
├── multilateration.md          # ESP32 firmware documentation
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── simulate.ts             # Simulation script for testing
│   └── src/
│       ├── server.ts           # Express + WebSocket server entry point
│       ├── trilateration.ts    # 2D position computation
│       └── types.ts            # Shared TypeScript interfaces
└── client/
    ├── index.html
    ├── package.json
    ├── vite.config.ts          # Vite config with @vitejs/plugin-vue
    ├── tsconfig.json
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/
        ├── main.ts             # Vue app entry: createApp(App).mount('#app')
        ├── App.vue             # Root component
        ├── types.ts            # TypeScript interfaces (Tag, Anchor, WsMessage)
        ├── index.css           # Tailwind CSS directives
        ├── vite-env.d.ts       # Vite / Vue type shims
        ├── composables/
        │   └── useWebSocket.ts # Auto-reconnecting WebSocket composable
        └── components/
            ├── ThreeScene.vue      # Three.js 3D canvas component
            ├── TagStatusPanel.vue  # Tag HUD (top-left overlay)
            ├── AnchorPanel.vue     # Anchor config HUD (top-right overlay)
            ├── CameraControls.vue  # Camera HUD: zoom buttons + coordinate readout (bottom-left)
            └── ConnectionBadge.vue # WS connection status (bottom-right)
```

---

## Development Setup

### Prerequisites

- Node.js v18 or later (see `.nvmrc`)

### Install dependencies

```bash
# Server
cd server && npm install

# Client
cd client && npm install
```

### Run the development servers

```bash
# Start the backend (port 8080)
cd server && npm run dev

# Start the frontend dev server (port 5173) — in a separate terminal
cd client && npm run dev
```

Open your browser to `http://localhost:5173`.

> The Vite dev server proxies WebSocket and API requests to the backend on port 8080.

---

## Build

```bash
# Build the Vue.js client for production
cd client && npm run build
```

The compiled output is placed in `client/dist/`. Serve it with any static file host, or configure the Express server to serve it directly.

---

## REST API

All endpoints are served by the backend on **port 8080**.

### `POST /api/status`

Receives a UWB tag or anchor status report.

**Tag payload:**
```json
{
  "chip_id": "F8B3B74973D4",
  "role": "tag",
  "anchor_distances": [1.23, 2.45, 3.67],
  "battery_v": 3.82
}
```

**Anchor payload:**
```json
{
  "chip_id": "A1B2C3D4E5F6",
  "role": "anchor",
  "anchor_number": 1,
  "battery_v": 3.91
}
```

**Response:**
```json
{ "status": "ok", "position": { "x": 1.5, "y": 2.3 } }
```

The server computes the 2D position via trilateration and broadcasts a `position` WebSocket message to all connected clients.

---

### `GET /api/anchors`

Returns the current anchor positions.

**Response:**
```json
[
  { "x": 0.0, "y": 0.0 },
  { "x": 3.0, "y": 0.0 },
  { "x": 1.5, "y": 2.598 }
]
```

---

### `POST /api/anchors`

Updates anchor positions.

**Request body:**
```json
[
  { "x": 0.0, "y": 0.0 },
  { "x": 4.0, "y": 0.0 },
  { "x": 2.0, "y": 3.464 }
]
```

**Response:**
```json
{ "status": "ok", "anchors": [ ... ] }
```

---

### `GET /api/anchor-batteries`

Returns the latest battery readings for all anchors.

**Response:**
```json
[
  { "chip_id": "A1B2C3D4E5F6", "battery_v": "3.91", "timestamp": 1713449816000 },
  { "chip_id": "B2C3D4E5F6A1", "battery_v": "3.75", "timestamp": 1713449810000 },
  { "chip_id": "C3D4E5F6A1B2", "battery_v": "3.60", "timestamp": 1713449805000 }
]
```

---

## WebSocket Message Protocol

The server sends JSON messages over WebSocket. The client connects to `ws://localhost:8080`.

### `position` — Tag position update

Sent after each successful trilateration.

```json
{
  "type": "position",
  "x": 1.5,
  "y": 2.3,
  "distances": [1.23, 2.45, 3.67],
  "battery_v": "3.82",
  "chip_id": "F8B3B74973D4",
  "timestamp": 1713449816000
}
```

| Field | Type | Description |
|---|---|---|
| `type` | `"position"` | Message discriminator |
| `x` | `number \| null` | Computed X position (null if trilateration failed) |
| `y` | `number \| null` | Computed Y position (null if trilateration failed) |
| `distances` | `number[]` | Raw distances to each anchor (metres) |
| `battery_v` | `string` | Tag battery voltage |
| `chip_id` | `string` | Tag chip ID (MAC address) |
| `timestamp` | `number` | Unix timestamp (ms) |

---

### `anchor_status` — Anchor battery update

Sent when an anchor reports its status.

```json
{
  "type": "anchor_status",
  "anchor_number": 1,
  "chip_id": "A1B2C3D4E5F6",
  "battery_v": "3.91",
  "timestamp": 1713449816000
}
```

| Field | Type | Description |
|---|---|---|
| `type` | `"anchor_status"` | Message discriminator |
| `anchor_number` | `1 \| 2 \| 3` | Anchor index |
| `chip_id` | `string` | Anchor chip ID |
| `battery_v` | `string` | Anchor battery voltage |
| `timestamp` | `number` | Unix timestamp (ms) |

---

### `anchors` — Anchor configuration update

Sent to all clients when anchor positions are changed via the REST API.

```json
{
  "type": "anchors",
  "anchors": [
    { "x": 0.0, "y": 0.0 },
    { "x": 3.0, "y": 0.0 },
    { "x": 1.5, "y": 2.598 }
  ]
}
```

---

## Camera Controls

The 3D view in [`ThreeScene.vue`](client/src/components/ThreeScene.vue) supports interactive pan, zoom, and reset via mouse, touch, and the on-screen HUD.

### Mouse & Touch Gestures

| Action | Mouse | Touch |
|---|---|---|
| **Pan** | Left-click drag | Single-finger drag |
| **Zoom in / out** | Scroll wheel (10 % per step) | Two-finger pinch |
| **Zoom toward cursor** | Zoom keeps the world point under the cursor fixed | Zoom keeps the midpoint of the pinch fixed |

### Zoom Limits

| Limit | Value |
|---|---|
| Minimum view height | 0.5 m |
| Maximum view height | 20 m |

### Programmatic API

[`ThreeScene.vue`](client/src/components/ThreeScene.vue) exposes the following functions via `defineExpose`:

| Function | Effect |
|---|---|
| `resetCamera()` | Resets the camera to the default centre (1.5 m, 1.3 m) and zoom level 1.0× |
| `zoomIn()` | Multiplies the view height by **0.8** (zooms in by ~25 %) |
| `zoomOut()` | Multiplies the view height by **1.25** (zooms out by ~25 %) |

The component emits a `cameraState` event on every camera change:

```ts
emit('cameraState', { zoom: number, centerX: number, centerY: number })
```

| Field | Type | Description |
|---|---|---|
| `zoom` | `number` | Current view height in metres |
| `centerX` | `number` | Camera centre X in world metres |
| `centerY` | `number` | Camera centre Y in world metres |

---

## HUD Layout

The browser UI is composed of four overlay panels positioned at the corners of the viewport:

| Panel | Component | Position | Contents |
|---|---|---|---|
| **Tag Status** | [`TagStatusPanel.vue`](client/src/components/TagStatusPanel.vue) | Top-left | Tag chip ID, computed X/Y position, battery voltage, distance to each anchor |
| **Anchor Configuration** | [`AnchorPanel.vue`](client/src/components/AnchorPanel.vue) | Top-right | Editable X/Y fields for each anchor, battery voltage, Apply button |
| **Camera Controls** | [`CameraControls.vue`](client/src/components/CameraControls.vue) | Bottom-left | Zoom Out `−`, zoom level readout (`1.0×`), Zoom In `+`, Reset `⊙`, world-coordinate readout |
| **Connection Badge** | [`ConnectionBadge.vue`](client/src/components/ConnectionBadge.vue) | Bottom-right | Live WebSocket connection indicator (Connected / Disconnected) |

### Camera Controls HUD detail

[`CameraControls.vue`](client/src/components/CameraControls.vue) is wired to [`ThreeScene.vue`](client/src/components/ThreeScene.vue) via the `cameraState` event in [`App.vue`](client/src/App.vue).

| Element | Description |
|---|---|
| **`−` button** | Calls `zoomOut()` — multiplies view height by 1.25 |
| **Zoom readout** | Displays the current zoom level as `"1.0×"` (1 decimal place) |
| **`+` button** | Calls `zoomIn()` — multiplies view height by 0.8 |
| **`⊙` button** | Calls `resetCamera()` — returns to default centre and zoom |
| **Coordinate readout** | Displays camera centre as `"X: 1.50m  Y: 1.30m"` in world metres |

---

## Configuring Anchor Positions

Default anchor positions form an equilateral triangle (side 3 m) centred at the origin:

| Anchor | X | Y |
|---|---|---|
| 1 | 0.0 | 0.0 |
| 2 | 3.0 | 0.0 |
| 3 | 1.5 | 2.598 |

You can change them in two ways:

1. **Via the web UI** – Open the **Anchor Configuration** panel (top-right overlay), edit the X/Y values, and click **Apply Anchor Positions**.
2. **Via the REST API** – Send a `POST /api/anchors` with the new coordinates array.

> **Note:** Anchors must not be collinear. If all three anchors lie on a straight line, the trilateration determinant becomes zero and no position can be computed.

---

## Testing with Simulated Data

Use the built-in simulation script to generate synthetic tag movement:

```bash
cd server && npx ts-node simulate.ts
```

Or send a one-off request with `curl`:

```bash
curl -X POST http://localhost:8080/api/status \
  -H "Content-Type: application/json" \
  -d '{"chip_id":"TEST123","role":"tag","anchor_distances":[1.5,2.0,2.5],"battery_v":3.7}'
```

Repeat with different distances to see the tag move in the visualizer.

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Browser shows "Disconnected" badge | Backend is not running. Start it with `cd server && npm run dev`. |
| Tag position is `null` | Anchor positions may be collinear, or fewer than 3 valid distances were received. |
| WebSocket connection fails in production | Ensure the client WebSocket URL matches the server host/port. Update the URL in `useWebSocket.ts` if deploying behind a proxy. |
| Vite dev server can't reach the backend | Check that the backend is running on port 8080 and that the Vite proxy config in `vite.config.ts` is correct. |
| `npm run build` fails | Run `cd client && npm install` to ensure all dependencies (including `@vitejs/plugin-vue`) are installed. |

---

## License

MIT – free to use and modify.
