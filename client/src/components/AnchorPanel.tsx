import { useState, useEffect } from 'react';
import { Battery, Settings, Save } from 'lucide-react';
import type { AnchorPosition, AnchorBatteryRecord } from '../types';

interface AnchorPanelProps {
  anchorBatteries: Record<number, AnchorBatteryRecord>;
  anchors: AnchorPosition[];
  onUpdate: (anchors: AnchorPosition[]) => void;
}

export default function AnchorPanel({ anchorBatteries, anchors, onUpdate }: AnchorPanelProps) {
  const [editing, setEditing] = useState(false);
  const [localAnchors, setLocalAnchors] = useState<AnchorPosition[]>(anchors.map(a => ({ ...a })));

  // Sync localAnchors with prop anchors when anchors change and not editing
  useEffect(() => {
    if (!editing) {
      console.log('AnchorPanel: anchors prop changed, updating localAnchors', anchors);
      setLocalAnchors(anchors.map(a => ({ ...a })));
    }
  }, [anchors, editing]);

  const handleSave = () => {
    console.log('AnchorPanel: saving anchor positions', localAnchors);
    onUpdate(localAnchors);
    setEditing(false);
  };

  const handleCancel = () => {
    console.log('AnchorPanel: cancel editing, revert to anchors', anchors);
    setLocalAnchors(anchors.map(a => ({ ...a })));
    setEditing(false);
  };

  const batteryColor = (v: string) => {
    const num = parseFloat(v);
    if (isNaN(num)) return 'text-gray-400';
    if (num >= 3.6) return 'text-green-400';
    if (num >= 3.3) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatChipId = (chipId: string) => {
    if (!chipId) return '—';
    return chipId.length > 8 ? `${chipId.substring(0, 8)}…` : chipId;
  };

  return (
    <div className="bg-[#1a1a2e]/90 border border-[#4fc3f7]/50 rounded-xl p-4 backdrop-blur-sm shadow-2xl min-w-[300px] max-w-md">
      {/* Anchor Batteries Section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Battery className="text-[#4fc3f7]" size={18} />
          <h3 className="text-lg font-bold text-uwb-text">Anchor Batteries</h3>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((num) => {
            const battery = anchorBatteries[num];
            return (
              <div key={num} className="flex items-center justify-between py-2 px-3 rounded-lg bg-uwb-panel/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-uwb-border/20 flex items-center justify-center">
                    <span className="font-bold text-uwb-text">A{num}</span>
                  </div>
                  <div>
                    <div className="text-sm text-uwb-muted">Chip ID</div>
                    <div className="font-mono text-sm">{formatChipId(battery?.chip_id || '')}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-uwb-muted">Voltage</div>
                  <div className={`font-mono ${battery ? batteryColor(battery.battery_v) : 'text-gray-500'}`}>
                    {battery?.battery_v ? `${battery.battery_v} V` : '—'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Anchor Positions Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Settings className="text-[#4fc3f7]" size={18} />
            <h3 className="text-lg font-bold text-uwb-text">Anchor Positions</h3>
          </div>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1 text-sm bg-uwb-border/20 text-uwb-border rounded-lg hover:bg-uwb-border/30 transition"
            >
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="px-3 py-1 text-sm bg-red-900/30 text-red-400 rounded-lg hover:bg-red-900/50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1 text-sm bg-green-900/30 text-green-400 rounded-lg hover:bg-green-900/50 transition flex items-center gap-1"
              >
                <Save size={14} />
                Apply
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {[0, 1, 2].map((idx) => (
            <div key={idx} className="grid grid-cols-3 gap-3 items-center">
              <div className="text-center font-bold text-uwb-text">A{idx + 1}</div>
              <div>
                <label className="block text-xs text-uwb-muted mb-1">X (m)</label>
                <input
                  type="number"
                  step="0.01"
                  value={localAnchors[idx].x}
                  disabled={!editing}
                  onChange={(e) => {
                    const newAnchors = localAnchors.map((a, i) => i === idx ? { ...a, x: parseFloat(e.target.value) || 0 } : a);
                    setLocalAnchors(newAnchors);
                  }}
                  className="w-full px-3 py-2 bg-uwb-panel border border-uwb-border/30 rounded-lg text-uwb-text disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs text-uwb-muted mb-1">Y (m)</label>
                <input
                  type="number"
                  step="0.01"
                  value={localAnchors[idx].y}
                  disabled={!editing}
                  onChange={(e) => {
                    const newAnchors = localAnchors.map((a, i) => i === idx ? { ...a, y: parseFloat(e.target.value) || 0 } : a);
                    setLocalAnchors(newAnchors);
                  }}
                  className="w-full px-3 py-2 bg-uwb-panel border border-uwb-border/30 rounded-lg text-uwb-text disabled:opacity-50"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}