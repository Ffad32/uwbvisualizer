import { Wifi, WifiOff } from 'lucide-react';

interface ConnectionBadgeProps {
  connected: boolean;
}

export default function ConnectionBadge({ connected }: ConnectionBadgeProps) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-full ${connected ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'} border ${connected ? 'border-green-700/50' : 'border-red-700/50'} backdrop-blur-sm`}>
      {connected ? <Wifi size={16} /> : <WifiOff size={16} />}
      <span className="text-sm font-medium">{connected ? 'Connected' : 'Disconnected'}</span>
    </div>
  );
}