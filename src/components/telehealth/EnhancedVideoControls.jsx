<<<<<<< HEAD
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, MessageSquare } from 'lucide-react';
=======
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, MessageSquare, Maximize, Minimize } from 'lucide-react';
>>>>>>> origin/main

export default function EnhancedVideoControls({
  audioMuted,
  videoMuted,
<<<<<<< HEAD
=======
  screenSharing = false,
  chatActive = false,
  isFullscreen = false,
>>>>>>> origin/main
  onToggleAudio,
  onToggleVideo,
  onDisconnect,
  onToggleChat,
<<<<<<< HEAD
  onToggleScreenShare
}) {
  const [screenSharing, setScreenSharing] = useState(false);

  const handleScreenShare = () => {
    onToggleScreenShare?.();
    setScreenSharing(!screenSharing);
  };

=======
  onToggleScreenShare,
  onToggleFullscreen
}) {
>>>>>>> origin/main
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
<<<<<<< HEAD
        onClick={handleScreenShare}
=======
        onClick={onToggleScreenShare}
>>>>>>> origin/main
        className={`rounded-full h-12 w-12 transition ${
          screenSharing
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-white'
        }`}
<<<<<<< HEAD
        title="Share screen"
=======
        title={screenSharing ? 'Stop sharing screen' : 'Share screen'}
>>>>>>> origin/main
      >
        <Monitor className="w-5 h-5" />
      </Button>

<<<<<<< HEAD
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleChat}
        className="rounded-full h-12 w-12 bg-gray-700 hover:bg-gray-600 text-white transition"
        title="Show chat"
      >
        <MessageSquare className="w-5 h-5" />
      </Button>
=======
      {onToggleChat && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleChat}
          className={`rounded-full h-12 w-12 transition ${
            chatActive
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-white'
          }`}
          title={chatActive ? 'Hide chat' : 'Show chat'}
        >
          <MessageSquare className="w-5 h-5" />
        </Button>
      )}

      {onToggleFullscreen && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleFullscreen}
          className="rounded-full h-12 w-12 bg-gray-700 hover:bg-gray-600 text-white transition"
          title={isFullscreen ? 'Exit full screen' : 'Full screen'}
        >
          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </Button>
      )}
>>>>>>> origin/main

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