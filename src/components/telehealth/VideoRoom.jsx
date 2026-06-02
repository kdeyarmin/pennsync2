import { useEffect, useRef, useState, useCallback } from "react";
import { createTelehealthToken } from "@/functions/createTelehealthToken";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VideoOff, Users, Loader2
} from "lucide-react";
import NetworkMonitor from "./NetworkMonitor";
import EnhancedVideoControls from "./EnhancedVideoControls";

export default function VideoRoom({ roomName, identity, onDisconnect, onParticipantListChange, onToggleChat }) {
  const [participants, setParticipants] = useState([]);
  const [status, setStatus] = useState("connecting"); // connecting | connected | error
  const [error, setError] = useState(null);
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);

  useEffect(() => {
    const participantNames = [identity, ...participants.map((participant) => participant.identity)].filter(Boolean);
    onParticipantListChange?.([...new Set(participantNames)]);
  }, [participants, identity, onParticipantListChange]);

  const localVideoRef = useRef(null);
  const roomRef = useRef(null);
  const screenTrackRef = useRef(null);
  const cameraTrackRef = useRef(null);
  const endedRef = useRef(false);

  const connectToRoom = useCallback(async () => {
    try {
      setStatus("connecting");
      const res = await createTelehealthToken({ room_name: roomName, identity });
      const { token } = res.data;

      const Video = (await import("twilio-video")).default;

      const connectedRoom = await Video.connect(token, {
        name: roomName,
        audio: true,
        video: { width: 1280, height: 720 }
      });

      roomRef.current = connectedRoom;
      endedRef.current = false;
      setStatus("connected");
      setSessionStartTime(new Date());

      // Attach local camera video and keep a handle to the camera track so it
      // can be restored after a screen share ends.
      connectedRoom.localParticipant.videoTracks.forEach(publication => {
        if (publication.track) {
          cameraTrackRef.current = publication.track;
          if (localVideoRef.current) {
            localVideoRef.current.appendChild(publication.track.attach());
          }
        }
      });

      // Existing remote participants
      setParticipants([...connectedRoom.participants.values()]);

      connectedRoom.on("participantConnected", p => setParticipants(prev => [...prev, p]));
      connectedRoom.on("participantDisconnected", p => setParticipants(prev => prev.filter(x => x !== p)));
      connectedRoom.on("disconnected", () => {
        setStatus("disconnected");
        if (!endedRef.current) {
          endedRef.current = true;
          onDisconnect && onDisconnect();
        }
      });

    } catch (err) {
      console.error("Video connect error:", err);
      setError(err.message);
      setStatus("error");
    }
  }, [roomName, identity, onDisconnect]);

  useEffect(() => {
    connectToRoom();
    return () => {
      roomRef.current?.disconnect();
    };
  }, [connectToRoom]);

  const toggleAudio = () => {
    roomRef.current?.localParticipant.audioTracks.forEach(pub => {
      audioMuted ? pub.track?.enable() : pub.track?.disable();
    });
    setAudioMuted(m => !m);
  };

  const toggleVideo = () => {
    roomRef.current?.localParticipant.videoTracks.forEach(pub => {
      videoMuted ? pub.track?.enable() : pub.track?.disable();
    });
    setVideoMuted(m => !m);
  };

  const disconnect = () => {
    // Stop any active screen share so the capture indicator clears.
    if (screenTrackRef.current) {
      try { screenTrackRef.current.stop(); } catch { /* already stopped */ }
      screenTrackRef.current = null;
    }
    const activeRoom = roomRef.current;
    if (activeRoom && activeRoom.state !== "disconnected") {
      // Let the room's "disconnected" event invoke onDisconnect exactly once.
      activeRoom.disconnect();
    } else if (!endedRef.current) {
      endedRef.current = true;
      onDisconnect && onDisconnect();
    }
  };

  // Twilio's LocalVideoTrack has no replaceTrack(); screen sharing works by
  // unpublishing the camera track and publishing a screen-capture track, then
  // restoring the camera when sharing stops.
  const stopScreenShare = () => {
    const screenTrack = screenTrackRef.current;
    if (!screenTrack) return; // already stopped — keep this idempotent
    screenTrackRef.current = null;

    const localParticipant = roomRef.current?.localParticipant;
    localParticipant?.unpublishTrack(screenTrack);
    screenTrack.detach().forEach(el => el.remove());
    screenTrack.stop();

    const camera = cameraTrackRef.current;
    if (camera && localParticipant) {
      localParticipant.publishTrack(camera);
      if (localVideoRef.current) {
        localVideoRef.current.appendChild(camera.attach());
      }
      videoMuted ? camera.disable() : camera.enable();
    }
    setScreenSharing(false);
  };

  const startScreenShare = async () => {
    const localParticipant = roomRef.current?.localParticipant;
    if (!localParticipant) return;

    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const screenMediaTrack = screenStream.getVideoTracks()[0];
    if (!screenMediaTrack) return;

    // Swap the camera out of the published video slot.
    const camera = cameraTrackRef.current;
    if (camera) {
      localParticipant.unpublishTrack(camera);
      camera.detach().forEach(el => el.remove());
    }

    const publication = await localParticipant.publishTrack(screenMediaTrack, { name: `screen-${Date.now()}` });
    const screenTrack = publication.track;
    screenTrackRef.current = screenTrack;
    if (localVideoRef.current) {
      localVideoRef.current.appendChild(screenTrack.attach());
    }

    // The browser's own "Stop sharing" control ends the underlying track.
    screenMediaTrack.onended = () => stopScreenShare();
    setScreenSharing(true);
  };

  const toggleScreenShare = async () => {
    try {
      if (screenSharing) {
        stopScreenShare();
      } else {
        await startScreenShare();
      }
    } catch (err) {
      // Most commonly the user dismissed the screen picker — leave the call as-is.
      console.error('Screen share error:', err);
      setScreenSharing(false);
    }
  };

  if (status === "connecting") {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 bg-gray-900 rounded-xl">
        <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
        <p className="text-white text-lg">Connecting to session...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 bg-gray-900 rounded-xl">
        <p className="text-red-400 text-lg">Failed to connect: {error}</p>
        <Button onClick={connectToRoom} variant="outline">Retry</Button>
      </div>
    );
  }

  const sessionDuration = sessionStartTime
    ? Math.floor((new Date() - sessionStartTime) / 60000)
    : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Status bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-green-700">Live</span>
          <Badge variant="outline" className="text-xs">
            <Users className="w-3 h-3 mr-1" />
            {participants.length + 1} participant{participants.length !== 0 ? "s" : ""}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <NetworkMonitor roomRef={roomRef} />
          <span className="text-sm text-gray-500 font-mono">{sessionDuration} min</span>
        </div>
      </div>

      {/* Video grid - responsive */}
      <div className={`grid gap-2 sm:gap-3 ${participants.length > 0 ? "sm:grid-cols-2 grid-cols-1" : "grid-cols-1"}`}>
        {/* Local video */}
        <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video">
          <div ref={localVideoRef} className="w-full h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover" />
          {videoMuted && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <VideoOff className="w-12 h-12 text-gray-500" />
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
            You {audioMuted && "🔇"}
          </div>
        </div>

        {/* Remote participants */}
        {participants.map(participant => (
          <RemoteParticipant key={participant.sid} participant={participant} />
        ))}

        {/* Waiting placeholder */}
        {participants.length === 0 && (
          <div className="bg-gray-800 rounded-xl aspect-video flex flex-col items-center justify-center gap-2">
            <Users className="w-10 h-10 text-gray-500" />
            <p className="text-gray-400 text-sm">Waiting for patient to join...</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <EnhancedVideoControls
        audioMuted={audioMuted}
        videoMuted={videoMuted}
        screenSharing={screenSharing}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onDisconnect={disconnect}
        onToggleChat={onToggleChat}
        onToggleScreenShare={toggleScreenShare}
      />
    </div>
  );
}

function RemoteParticipant({ participant }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    const attachTrack = (track) => {
      if (track.kind === "video" && videoRef.current) videoRef.current.appendChild(track.attach());
      if (track.kind === "audio" && audioRef.current) audioRef.current.appendChild(track.attach());
    };

    participant.tracks.forEach(pub => {
      if (pub.isSubscribed && pub.track) attachTrack(pub.track);
    });

    participant.on("trackSubscribed", attachTrack);
    participant.on("trackUnsubscribed", track => track.detach().forEach(el => el.remove()));

    return () => participant.removeAllListeners();
  }, [participant]);

  return (
    <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video">
      <div ref={videoRef} className="w-full h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover" />
      <div ref={audioRef} className="hidden" />
      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
        {participant.identity}
      </div>
    </div>
  );
}