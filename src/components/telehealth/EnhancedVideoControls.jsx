import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff,
  Monitor, MonitorOff, Settings, MessageSquare, Hand
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function EnhancedVideoControls({
  audioMuted,
  videoMuted,
  screenSharing,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onDisconnect,
  onOpenChat,
  duration
}) {
  const [handRaised, setHandRaised] = useState(false);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-gray-900 rounded-xl">
      {/* Left side - Session info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-white text-sm font-medium">Live</span>
        </div>
        {duration && (
          <Badge variant="outline" className="bg-gray-800 text-white border-gray-700">
            {formatDuration(duration)}
          </Badge>
        )}
      </div>

      {/* Center - Main controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleAudio}
          className={`rounded-full h-12 w-12 transition-all ${
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
          className={`rounded-full h-12 w-12 transition-all ${
            videoMuted 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'bg-gray-700 hover:bg-gray-600 text-white'
          }`}
          title={videoMuted ? 'Turn on camera' : 'Turn off camera'}
        >
          {videoMuted ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleScreenShare}
          className={`rounded-full h-12 w-12 transition-all ${
            screenSharing 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-gray-700 hover:bg-gray-600 text-white'
          }`}
          title={screenSharing ? 'Stop sharing' : 'Share screen'}
        >
          {screenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onDisconnect}
          className="rounded-full h-14 w-14 bg-red-600 hover:bg-red-700 text-white transition-all"
          title="End call"
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
      </div>

      {/* Right side - Additional controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenChat}
          className="rounded-full h-10 w-10 bg-gray-700 hover:bg-gray-600 text-white"
          title="Open chat"
        >
          <MessageSquare className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setHandRaised(!handRaised)}
          className={`rounded-full h-10 w-10 transition-all ${
            handRaised 
              ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
              : 'bg-gray-700 hover:bg-gray-600 text-white'
          }`}
          title={handRaised ? 'Lower hand' : 'Raise hand'}
        >
          <Hand className="w-4 h-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-10 w-10 bg-gray-700 hover:bg-gray-600 text-white"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-gray-800 text-white border-gray-700">
            <DropdownMenuItem>Audio settings</DropdownMenuItem>
            <DropdownMenuItem>Video settings</DropdownMenuItem>
            <DropdownMenuItem>Background blur</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}