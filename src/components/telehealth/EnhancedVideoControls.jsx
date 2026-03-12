import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, MessageSquare } from 'lucide-react';

export default function EnhancedVideoControls({
  audioMuted,
  videoMuted,
  onToggleAudio,
  onToggleVideo,
  onDisconnect,
  onToggleChat,
  onToggleScreenShare
}) {
  const [screenSharing, setScreenSharing] = useState(false);

  const handleScreenShare = () => {
    onToggleScreenShare?.();
    setScreenSharing(!screenSharing);
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 p-4 bg-gray-900 rounded-xl">
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleAudio}
        className={`rounded-full h-12 w-12 transition ${
          audioMuted
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-white'
        }`}
        title={audioMuted ? 'Unmute' : 'Mute'}
      >
        {audioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleVideo}
        className={`rounded-full h-12 w-12 transition ${
          videoMuted
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-white'
        }`}
        title={videoMuted ? 'Turn on camera' : 'Turn off camera'}
      >
        {videoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleScreenShare}
        className={`rounded-full h-12 w-12 transition ${
          screenSharing
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-white'
        }`}
        title="Share screen"
      >
        <Monitor className="w-5 h-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleChat}
        className="rounded-full h-12 w-12 bg-gray-700 hover:bg-gray-600 text-white transition"
        title="Show chat"
      >
        <MessageSquare className="w-5 h-5" />
      </Button>

      <div className="mx-2 w-px h-8 bg-gray-700" />

      <Button
        variant="ghost"
        size="icon"
        onClick={onDisconnect}
        className="rounded-full h-14 w-14 bg-red-600 hover:bg-red-700 text-white transition"
        title="End session"
      >
        <PhoneOff className="w-6 h-6" />
      </Button>
    </div>
  );
}