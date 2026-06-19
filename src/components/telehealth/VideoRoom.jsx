import { useEffect, useRef, useState, useCallback } from "react";
import { createTelehealthToken } from "@/functions/createTelehealthToken";
import { configNotReadyMessage } from "@/lib/aiFeatureError";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VideoOff, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import NetworkMonitor from "./NetworkMonitor";
import EnhancedVideoControls from "./EnhancedVideoControls";
import TelehealthChat from "./TelehealthChat";

export default function VideoRoom({ roomName, identity, onDisconnect, onParticipantListChange, joinToken, videoDeviceId, audioDeviceId, waitingMessage = "Waiting for patient to join..." }) {
  const [participants, setParticipants] = useState([]);
  const [status, setStatus] = useState("connecting"); // connecting | connected | reconnecting | error
  const [error, setError] = useState(null);
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [providerName, setProviderName] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const participantNames = [identity, ...participants.map((participant) => participant.identity)].filter(Boolean);
    onParticipantListChange?.([...new Set(participantNames)]);
  }, [participants, identity, onParticipantListChange]);

  const localVideoRef = useRef(null);
  const containerRef = useRef(null);
  const roomRef = useRef(null);
  const screenTrackRef = useRef(null);
  const cameraTrackRef = useRef(null);
  const dataTrackRef = useRef(null);
  const endedRef = useRef(false);

  // Append a chat message received over a remote participant's data track.
  const handleIncomingMessage = useCallback((raw, senderIdentity) => {
    let text = raw;
    let ts = Date.now();
    try {
      const parsed = JSON.parse(raw);
      text = parsed.text ?? raw;
      ts = parsed.ts ?? ts;
    } catch { /* fall back to the raw string */ }
    setMessages(prev => [...prev, {
      id: `${senderIdentity}-${ts}-${Math.random().toString(36).slice(2, 6)}`,
      sender: senderIdentity,
      text,
      timestamp: new Date(ts).toISOString(),
      isSelf: false,
    }]);
  }, []);

  const connectToRoom = useCallback(async () => {
    try {
      setStatus("connecting");
      // Patients authenticate with the per-session capability token from their
      // invite link; staff authenticate with their app session.
      const res = await createTelehealthToken(
        joinToken ? { room_name: roomName, join_token: joinToken } : { room_name: roomName, identity }
      );
      const { token } = res.data;
      // Surface the server's friendly reason (e.g. "Invalid or expired join
      // link") instead of a cryptic Twilio "invalid token" error downstream.
      if (!token) throw new Error(res.data?.error || "We couldn't start the visit. Please try again.");
      // For patients, greet them with the provider's name while they wait.
      if (joinToken && res.data.host_name) setProviderName(res.data.host_name);

      const Video = (await import("twilio-video")).default;

      // Honor the camera/mic chosen in the pre-join device check (bare deviceId
      // is an "ideal" hint, so a since-unplugged device falls back gracefully).
      const audioConstraint = audioDeviceId ? { deviceId: audioDeviceId } : true;
      const videoConstraint = { width: 1280, height: 720 };
      if (videoDeviceId) videoConstraint.deviceId = videoDeviceId;

      const connectedRoom = await Video.connect(token, {
        name: roomName,
        audio: audioConstraint,
        video: videoConstraint,
        networkQuality: { local: 1, remote: 1 }
      });

      roomRef.current = connectedRoom;
      endedRef.current = false;
      setStatus("connected");
      setSessionStartTime(new Date());

      // Publish a data track so in-call chat messages actually reach the other side.
      try {
        const dataTrack = new Video.LocalDataTrack();
        dataTrackRef.current = dataTrack;
        await connectedRoom.localParticipant.publishTrack(dataTrack);
      } catch (chatErr) {
        console.error("Chat data track error:", chatErr);
      }

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

      connectedRoom.on("participantConnected", p => {
        setParticipants(prev => [...prev, p]);
        if (p.identity) toast.success(`${p.identity} joined the visit`);
      });
      connectedRoom.on("participantDisconnected", p => setParticipants(prev => prev.filter(x => x !== p)));
      // Twilio recovers transient network drops on its own; surface that as a
      // "Reconnecting…" state instead of treating the blip as the visit ending.
      connectedRoom.on("reconnecting", () => setStatus("reconnecting"));
      connectedRoom.on("reconnected", () => setStatus("connected"));
      connectedRoom.on("disconnected", () => {
        setStatus("disconnected");
        if (!endedRef.current) {
          endedRef.current = true;
          onDisconnect && onDisconnect();
        }
      });

    } catch (err) {
      const friendly = configNotReadyMessage(err);
      if (!friendly) console.error("Video connect error:", err);
      setError(friendly || err.message);
      setStatus("error");
    }
  }, [roomName, identity, joinToken, videoDeviceId, audioDeviceId, onDisconnect]);

  useEffect(() => {
    connectToRoom();
    return () => {
      roomRef.current?.disconnect();
    };
  }, [connectToRoom]);

  // Live call timer (the previous duration display never ticked).
  useEffect(() => {
    if (!sessionStartTime) return;
    const id = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - sessionStartTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [sessionStartTime]);

  // Keep the fullscreen button in sync if the user exits with Esc.
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

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

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      containerRef.current?.requestFullscreen?.();
    }
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

  const sendMessage = (text) => {
    try {
      dataTrackRef.current?.send(JSON.stringify({ text, ts: Date.now() }));
    } catch (err) {
      console.error('Chat send error:', err);
    }
    // Data tracks don't echo back to the sender, so add our own message locally.
    setMessages(prev => [...prev, {
      id: `self-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sender: identity,
      text,
      timestamp: new Date().toISOString(),
      isSelf: true,
    }]);
  };

  if (status === "connecting") {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 bg-slate-900 rounded-xl">
        <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
        <p className="text-white text-lg">Connecting to session...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 bg-slate-900 rounded-xl">
        <p className="text-red-400 text-lg">Failed to connect: {error}</p>
        <Button onClick={connectToRoom} variant="outline">Retry</Button>
      </div>
    );
  }

  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
  const ss = String(elapsedSec % 60).padStart(2, "0");

  return (
    <div ref={containerRef} className={`flex flex-col gap-4 ${isFullscreen ? "h-full overflow-y-auto bg-slate-950 p-4" : ""}`}>
      {/* Status bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {status === "reconnecting" ? (
            <>
              <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
              <span className="text-sm font-medium text-amber-600">Reconnecting…</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-green-700">Live</span>
            </>
          )}
          <Badge variant="outline" className="text-xs">
            <Users className="w-3 h-3 mr-1" />
            {participants.length + 1} participant{participants.length !== 0 ? "s" : ""}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <NetworkMonitor room={roomRef.current} />
          <span className={`text-sm font-mono ${isFullscreen ? "text-slate-300" : "text-slate-500"}`}>{mm}:{ss}</span>
        </div>
      </div>

      {/* Video grid - responsive */}
      <div className={`grid gap-2 sm:gap-3 ${participants.length > 0 ? "sm:grid-cols-2 grid-cols-1" : "grid-cols-1"}`}>
        {/* Local video */}
        <div className="relative bg-slate-900 rounded-xl overflow-hidden aspect-video">
          <div ref={localVideoRef} className={`w-full h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover ${screenSharing ? "" : "[&>video]:[transform:scaleX(-1)]"}`} />
          {videoMuted && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
              <VideoOff className="w-12 h-12 text-slate-500" />
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
            You {audioMuted && "🔇"}
          </div>
        </div>

        {/* Remote participants */}
        {participants.map(participant => (
          <RemoteParticipant key={participant.sid} participant={participant} onMessage={handleIncomingMessage} />
        ))}

        {/* Waiting placeholder */}
        {participants.length === 0 && (
          <div className="bg-slate-800 rounded-xl aspect-video flex flex-col items-center justify-center gap-2">
            <Users className="w-10 h-10 text-slate-500" />
            <p className="text-slate-400 text-sm">{providerName ? `Waiting for ${providerName} to join…` : waitingMessage}</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <EnhancedVideoControls
        audioMuted={audioMuted}
        videoMuted={videoMuted}
        screenSharing={screenSharing}
        chatActive={showChat}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onDisconnect={disconnect}
        onToggleChat={() => setShowChat(v => !v)}
        onToggleScreenShare={toggleScreenShare}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      {showChat && (
        <TelehealthChat messages={messages} onSend={sendMessage} userName={identity} />
      )}
    </div>
  );
}

function RemoteParticipant({ participant, onMessage }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    const attachTrack = (track) => {
      if (track.kind === "video" && videoRef.current) videoRef.current.appendChild(track.attach());
      if (track.kind === "audio" && audioRef.current) audioRef.current.appendChild(track.attach());
      if (track.kind === "data") track.on("message", (data) => onMessage?.(data, participant.identity));
    };

    participant.tracks.forEach(pub => {
      if (pub.isSubscribed && pub.track) attachTrack(pub.track);
    });

    participant.on("trackSubscribed", attachTrack);
    participant.on("trackUnsubscribed", track => {
      if (typeof track.detach === "function") track.detach().forEach(el => el.remove());
    });

    return () => participant.removeAllListeners();
  }, [participant, onMessage]);

  return (
    <div className="relative bg-slate-900 rounded-xl overflow-hidden aspect-video">
      <div ref={videoRef} className="w-full h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover" />
      <div ref={audioRef} className="hidden" />
      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
        {participant.identity}
      </div>
    </div>
  );
}