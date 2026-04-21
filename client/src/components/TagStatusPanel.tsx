import { Radio, Battery, MapPin, Clock, Hash } from 'lucide-react';
import type { TagState } from '../types';

interface TagStatusPanelProps {
  tagState: TagState;
}

export default function TagStatusPanel({ tagState }: TagStatusPanelProps) {
  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return '—';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour12: false });
  };

  const batteryColor = (v: string) => {
    const num = parseFloat(v);
    if (isNaN(num)) return 'text-gray-400';
    if (num >= 3.6) return 'text-green-400';
    if (num >= 3.3) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-[#1a1a2e]/90 border border-[#4fc3f7]/50 rounded-xl p-4 backdrop-blur-sm shadow-2xl min-w-[280px]">
      <div className="flex items-center gap-2 mb-4">
        <Radio className="text-[#4fc3f7]" size={20} />
        <h2 className="text-lg font-bold text-uwb-text">UWB Tag Status</h2>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-uwb-muted">
            <Hash size={16} />
            <span>Chip ID</span>
          </div>
          <span className="font-mono text-uwb-text">{tagState.chip_id}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-uwb-muted">
            <Battery size={16} />
            <span>Battery</span>
          </div>
          <span className={`font-mono ${batteryColor(tagState.battery_v)}`}>
            {tagState.battery_v} V
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-uwb-muted">
            <MapPin size={16} />
            <span>Position</span>
          </div>
          <span className="font-mono text-uwb-text">
            {tagState.x !== null && tagState.y !== null
              ? `${tagState.x.toFixed(2)} m, ${tagState.y.toFixed(2)} m`
              : '—'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="text-center">
            <div className="text-xs text-uwb-muted">A1</div>
            <div className="font-mono text-sm">
              {tagState.distances[0]?.toFixed(2) ?? '—'} m
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-uwb-muted">A2</div>
            <div className="font-mono text-sm">
              {tagState.distances[1]?.toFixed(2) ?? '—'} m
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-uwb-muted">A3</div>
            <div className="font-mono text-sm">
              {tagState.distances[2]?.toFixed(2) ?? '—'} m
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-uwb-border/30">
          <div className="flex items-center gap-2 text-uwb-muted">
            <Clock size={16} />
            <span>Last update</span>
          </div>
          <span className="font-mono text-sm text-uwb-text">
            {formatTime(tagState.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
}