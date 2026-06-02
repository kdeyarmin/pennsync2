import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';

<<<<<<< HEAD
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
=======
// Connection quality via Twilio's Network Quality API. The local participant
// reports a level from 0 (lost) to 5 (excellent); we subscribe to changes.
// (The previous implementation called room.getStats() — which returns a
// Promise — synchronously, so it never actually reported anything.)
//
// `room` is the connected Twilio Room (a real value, not a ref) so this effect
// re-subscribes if/when the room becomes available or changes.
export default function NetworkMonitor({ room }) {
  const [level, setLevel] = useState(null);
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    const localParticipant = room?.localParticipant;
    if (!localParticipant) return;
    setLevel(localParticipant.networkQualityLevel);
    const handler = (lvl) => setLevel(lvl);
    localParticipant.on('networkQualityLevelChanged', handler);
    return () => localParticipant.removeListener('networkQualityLevelChanged', handler);
  }, [room]);

  if (!online || level === 0) {
    return (
      <Badge className="bg-red-100 text-red-700 border border-red-300 gap-1">
        <WifiOff className="w-3 h-3" />
        {online ? 'Connection lost' : 'No Internet'}
>>>>>>> origin/main
      </Badge>
    );
  }

<<<<<<< HEAD
  if (networkStatus === 'poor') {
    return (
      <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-300 gap-1">
        <AlertTriangle className="w-3 h-3" />
        Weak Connection
=======
  if (level !== null && level <= 2) {
    return (
      <Badge className="bg-amber-100 text-amber-700 border border-amber-300 gap-1">
        <AlertTriangle className="w-3 h-3" />
        Weak connection
      </Badge>
    );
  }

  if (level !== null && level === 3) {
    return (
      <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-300 gap-1">
        <Wifi className="w-3 h-3" />
        Fair connection
>>>>>>> origin/main
      </Badge>
    );
  }

  return (
    <Badge className="bg-green-100 text-green-700 border border-green-300 gap-1">
      <Wifi className="w-3 h-3" />
<<<<<<< HEAD
      Good Connection
    </Badge>
  );
}
=======
      {level === null ? 'Checking…' : 'Good connection'}
    </Badge>
  );
}
>>>>>>> origin/main
