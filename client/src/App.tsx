import { useState, useEffect } from 'react';
import ThreeScene from './components/ThreeScene';
import TagStatusPanel from './components/TagStatusPanel';
import AnchorPanel from './components/AnchorPanel';
import ConnectionBadge from './components/ConnectionBadge';
import { useWebSocket } from './hooks/useWebSocket';
import type { TagState, AnchorBatteryRecord, AnchorPosition } from './types';

const DEFAULT_ANCHORS: AnchorPosition[] = [
  { x: 0.0, y: 0.0 },
  { x: 3.0, y: 0.0 },
  { x: 1.5, y: 2.598 }
];

export default function App() {
  const { lastMessage, connected } = useWebSocket();
  const [tagState, setTagState] = useState<TagState>({
    chip_id: '—', x: null, y: null, distances: [], battery_v: '—', timestamp: null
  });
  const [anchorBatteries, setAnchorBatteries] = useState<Record<number, AnchorBatteryRecord>>({});
  const [anchors, setAnchors] = useState<AnchorPosition[]>(DEFAULT_ANCHORS);

  // Log anchors changes
  useEffect(() => {
    console.log('App: anchors state updated', anchors);
  }, [anchors]);

  // Fetch initial anchor positions and batteries
  useEffect(() => {
    fetch('/api/anchors').then(r => r.json()).then(setAnchors).catch(() => {});
    fetch('/api/anchor-batteries').then(r => r.json()).then(data => {
      const rec: Record<number, AnchorBatteryRecord> = {};
      Object.entries(data).forEach(([k, v]) => { rec[Number(k)] = v as AnchorBatteryRecord; });
      setAnchorBatteries(rec);
    }).catch(() => {});
  }, []);

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;
    console.log('WebSocket message received:', lastMessage);
    if (lastMessage.type === 'position') {
      setTagState({
        chip_id: lastMessage.chip_id,
        x: lastMessage.x,
        y: lastMessage.y,
        distances: lastMessage.distances,
        battery_v: lastMessage.battery_v,
        timestamp: lastMessage.timestamp
      });
    } else if (lastMessage.type === 'anchor_status') {
      setAnchorBatteries(prev => ({
        ...prev,
        [lastMessage.anchor_number]: {
          chip_id: lastMessage.chip_id,
          battery_v: lastMessage.battery_v,
          timestamp: lastMessage.timestamp
        }
      }));
    } else if (lastMessage.type === 'anchors') {
      console.log('Updating anchors from WebSocket:', lastMessage.anchors);
      setAnchors(lastMessage.anchors);
    }
  }, [lastMessage]);

  const handleAnchorsUpdate = (newAnchors: AnchorPosition[]) => {
    console.log('Saving anchor positions:', newAnchors);
    fetch('/api/anchors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAnchors)
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log('Anchor positions saved successfully:', data);
        setAnchors(newAnchors.map(a => ({ ...a })));
      })
      .catch((error) => {
        console.error('Failed to save anchor positions:', error);
        // Optionally show an error to the user
      });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0d0d1a]">
      {/* Three.js canvas fills the background */}
      <ThreeScene tagState={tagState} anchors={anchors} />

      {/* Top-left: Tag status */}
      <div className="absolute top-4 left-4 z-10">
        <TagStatusPanel tagState={tagState} />
      </div>

      {/* Top-right: Anchor panel (batteries + config) */}
      <div className="absolute top-4 right-4 z-10 max-h-[calc(100vh-2rem)] overflow-y-auto">
        <AnchorPanel
          anchorBatteries={anchorBatteries}
          anchors={anchors}
          onUpdate={handleAnchorsUpdate}
        />
      </div>

      {/* Bottom-right: Connection badge */}
      <div className="absolute bottom-4 right-4 z-10">
        <ConnectionBadge connected={connected} />
      </div>
    </div>
  );
}