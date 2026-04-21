# UWB Position Visualizer

A real‑time 2D position visualization system for ESP32 + DW3000 UWB ranging, built with Node.js, Express, WebSocket, and Three.js.

## Overview

This project receives distance measurements from a UWB tag via HTTP POST, computes the tag's 2D position using trilateration, and streams the result to a browser‑based 3D visualizer. The visualizer displays anchors, tag position, distance rings, a position trail, and a live HUD.

## Features

- **REST API** – Accepts POST `/api/status` with JSON payload from the UWB tag.
- **WebSocket real‑time updates** – Broadcasts computed positions to all connected clients.
- **Interactive 3D visualization** – Three.js scene with floor grid, anchor cones, tag sphere, distance rings, and position trail.
- **Anchor configuration** – Adjust anchor positions via a web UI; changes are reflected immediately.
- **Live HUD** – Shows chip ID, battery voltage (colour‑coded), distances, and timestamp.
- **Smooth interpolation** – Tag motion is smoothly animated.
- **Dark theme** – Custom styling with dark background and blue accents.

## Project Structure

```
c:/uwbproject/uwbvisualizer/
├── package.json
├── server.js
├── trilateration.js
├── public/
│   ├── index.html
│   └── main.js
└── README.md
```

## Installation

1. Ensure Node.js (v16 or later) is installed.
2. Clone or copy the project files into `c:/uwbproject/uwbvisualizer`.
3. Install dependencies:

```bash
cd c:/uwbproject/uwbvisualizer
npm install
```

## Running the Server

Start the server with:

```bash
npm start
```

The server will listen on **port 8080** (or the environment variable `PORT`).  
Open your browser to `http://localhost:8080`.

## API Endpoints

### `POST /api/status`

Receives UWB tag data.

**Request body (example):**
```json
{
  "chip_id": "F8B3B74973D4",
  "anchor_distances": ["1.23", "2.45", "3.67"],
  "battery_v": "3.82"
}
```

**Response:**
```json
{"status":"ok","position":{"x":1.5,"y":2.3}}
```

The server computes the 2D position using trilateration and broadcasts a WebSocket message to all connected clients.

### `GET /api/anchors`

Returns the current anchor positions as an array of `{x, y}` objects.

### `POST /api/anchors`

Updates the anchor positions.  
**Request body:** `[{x,y}, {x,y}, {x,y}]`  
**Response:** `{"status":"ok","anchors":[...]}`

## WebSocket Messages

The server sends two types of messages:

1. **Position update**
   ```json
   {
     "type": "position",
     "x": 1.5,
     "y": 2.3,
     "distances": ["1.23","2.45","3.67"],
     "battery_v": "3.82",
     "chip_id": "F8B3B74973D4",
     "timestamp": 1713449816000
   }
   ```

2. **Anchor update**
   ```json
   {
     "type": "anchors",
     "anchors": [...]
   }
   ```

## Configuring Anchor Positions

Default anchor positions form an equilateral triangle (side 3 m) centred at the origin:

- Anchor 1: `{ x: 0.0, y: 0.0 }`
- Anchor 2: `{ x: 3.0, y: 0.0 }`
- Anchor 3: `{ x: 1.5, y: 2.598 }`

You can change them in two ways:

1. **Via the web UI** – Open the “Anchor Configuration” panel (top‑right), edit the X/Y values, and click “Apply Anchor Positions”.
2. **Via the REST API** – Send a `POST /api/anchors` with the new coordinates.

## Visualizer Controls

- **Left drag** – Rotate the camera.
- **Right drag** – Pan the camera.
- **Scroll** – Zoom in/out.
- **Toggle anchor panel** – Click the `−`/`+` button in the top‑right corner.

## Testing with Simulated Data

You can simulate a UWB tag using `curl`:

```bash
curl -X POST http://localhost:8080/api/status \
  -H "Content-Type: application/json" \
  -d '{"chip_id":"TEST123","anchor_distances":["1.5","2.0","2.5"],"battery_v":"3.7"}'
```

Repeat with different distances to see the tag move in the visualizer.

## Dependencies

- **express** – Web server and REST API.
- **ws** – WebSocket server.
- **Three.js** – 3D graphics (loaded from CDN in the browser).

All dependencies are listed in `package.json`.

## Troubleshooting

- **“Cannot GET /”** – Ensure the server is running and the `public` folder exists.
- **WebSocket connection fails** – Check that the server is using the same port as the browser (default 8080). If behind a proxy, adjust the WebSocket URL in `main.js`.
- **Trilateration fails** – If anchor positions are colinear, the determinant becomes zero and no position is computed. Ensure anchors are not in a straight line.

## License

MIT – free to use and modify.