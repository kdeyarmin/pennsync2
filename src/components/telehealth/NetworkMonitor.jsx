import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';

export default function NetworkMonitor({ roomRef }) {
  const [networkStatus, setNetworkStatus] = useState('good');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!roomRef?.current) return;

    const room = roomRef.current;

    // Monitor connection quality
    const updateStats = () => {
      const stats = room.getStats();
      if (stats && stats.size > 0) {
        let videoQuality = 'good';
        let audioQuality = 'good';

        stats.forEach(stat => {
          if (stat.videoSendBitrate < 500000) videoQuality = 'poor';
          if (stat.audioSendBitrate < 30000) audioQuality = 'poor';
        });

        const quality = videoQuality === 'poor' || audioQuality === 'poor' ? 'poor' : 'good';
        setNetworkStatus(quality);
        setStats({ videoQuality, audioQuality });
      }
    };

    const interval = setInterval(updateStats, 2000);
    return () => clearInterval(interval);
  }, [roomRef]);

  const isOnline = navigator.onLine;

  if (!isOnline) {
    return (
      <Badge className="bg-red-100 text-red-700 border border-red-300 gap-1">
        <WifiOff className="w-3 h-3" />
        No Internet
      </Badge>
    );
  }

  if (networkStatus === 'poor') {
    return (
      <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-300 gap-1">
        <AlertTriangle className="w-3 h-3" />
        Weak Connection
      </Badge>
    );
  }

  return (
    <Badge className="bg-green-100 text-green-700 border border-green-300 gap-1">
      <Wifi className="w-3 h-3" />
      Good Connection
    </Badge>
  );
}