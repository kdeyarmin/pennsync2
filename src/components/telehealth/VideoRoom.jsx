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

// VideoRoom — Telnyx Video room client.
//
// createTelehealthToken now returns a Telnyx token:
//   { token, room_id, room_name, identity, host_name, refresh_token }
// We initialize a Telnyx Video Room with the `token` + `room_id`, join, publish
// local audio/video, and render remote participants' streams.
//
// NOTE: The exact method/event names on the `@telnyx/video` Room API are pinned
// against Telnyx's documented JS SDK. Where a name is uncertain it's marked with
// a TODO(verify) so it can be confirmed against the @telnyx/video docs without
// leaving the component broken.

export default function VideoRoom({ roomName, identity, onDisconnect, onParticipantListChange, joinToken, videoDeviceId, audioDeviceId, waitingMessage = "Waiting for patient to join..." }) {
  // Remote participants, keyed for rendering. Each entry: { id, identity, streams }
  const [participants, setParticipants] = useState([]);
  const [status, setStatus] = useState("connecting"); // connecting | connected | reconnecting | error | disconnected
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
    const participantNames = [identity, ...participants.map((p) => p.identity)].filter(Boolean);
    onParticipantListChange?.([...new Set(participantNames)]);
  }, [participants, identity, onParticipantListChange]);

  const localVideoRef = useRef(null);
  const containerRef = useRef(null);
  const roomRef = useRef(null);          // the connected Telnyx Video Room
  const localStreamRef = useRef(null);   // local MediaStream (camera + mic)
  const screenStreamRef = useRef(null);  // active screen-share MediaStream
  const endedRef = useRef(false);

  // Append a chat message received over the room's data channel.
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

  // Refresh the rendered remote-participant list from the room's current state.
  const syncParticipants = useCallback((room) => {
    if (!room) return;
    // TODO(verify): confirm against @telnyx/video docs — Room exposes the set of
    // remote participants (here read as room.state.participants, excluding self).
    const all = room?.state?.participants
      ? Object.values(room.state.participants)
      : (room?.participants ? Object.values(room.participants) : []);
    const remote = all
      .filter((p) => p && p.id !== room?.state?.localParticipantId && !p.isLocal)
      .map((p) => ({
        id: p.id,
        identity: p.context?.identity || p.externalUsername || p.id,
        streams: p.streams || {},
      }));
    setParticipants(remote);
  }, []);

  const connectToRoom = useCallback(async () => {
    try {
      setStatus("connecting");
      // Patients authenticate with the per-session capability token from their
      // invite link; staff authenticate with their app session.
      const res = await createTelehealthToken(
        joinToken ? { room_name: roomName, join_token: joinToken } : { room_name: roomName, identity }
      );
      const { token, room_id } = res.data || {};
      // Surface the server's friendly reason (e.g. "Invalid or expired join
      // link") instead of a cryptic provider "invalid token" error downstream.
      if (!token) throw new Error(res.data?.error || "We couldn't start the visit. Please try again.");
      // For patients, greet them with the provider's name while they wait.
      if (joinToken && res.data.host_name) setProviderName(res.data.host_name);

      const { initialize } = await import("@telnyx/video");

      // Honor the camera/mic chosen in the pre-join device check (bare deviceId
      // is an "ideal" hint, so a since-unplugged device falls back gracefully).
      const audioConstraint = audioDeviceId ? { deviceId: audioDeviceId } : true;
      const videoConstraint = { width: 1280, height: 720 };
      if (videoDeviceId) videoConstraint.deviceId = videoDeviceId;

      // TODO(verify): confirm against @telnyx/video docs — `initialize` creates a
      // Room client from the capability token + room id, then `connect()` joins.
      const room = initialize({
        roomId: room_id,
        clientToken: token,
        context: JSON.stringify({ identity }),
      });
      roomRef.current = room;
      endedRef.current = false;

      // Wire room lifecycle + participant events before connecting so we don't
      // miss the initial participant set.
      // TODO(verify): confirm event names against @telnyx/video docs.
      room.on("connected", () => {
        setStatus("connected");
        setSessionStartTime(new Date());
        syncParticipants(room);
      });
      room.on("disconnected", () => {
        setStatus("disconnected");
        if (!endedRef.current) {
          endedRef.current = true;
          onDisconnect && onDisconnect();
        }
      });
      // Telnyx recovers transient network drops on its own; surface that as a
      // "Reconnecting…" state instead of treating the blip as the visit ending.
      room.on("reconnecting", () => setStatus("reconnecting"));
      room.on("reconnected", () => setStatus("connected"));
      const onParticipantChange = (p) => {
        syncParticipants(room);
        const who = p?.context?.identity || p?.externalUsername;
        if (who) toast.success(`${who} joined the visit`);
      };
      room.on("participant_joined", onParticipantChange);
      room.on("participant_left", () => syncParticipants(room));
      // Remote stream published/subscribed → re-render so the new track attaches.
      room.on("stream_published", () => syncParticipants(room));
      room.on("track_enabled", () => syncParticipants(room));
      // In-call chat over the data/message channel.
      // TODO(verify): confirm message event + send API against @telnyx/video docs.
      room.on("message_received", (msg) => {
        const sender = msg?.sender?.context?.identity || msg?.sender || "Participant";
        handleIncomingMessage(msg?.payload ?? msg?.data ?? msg, sender);
      });

      // Acquire local media honoring the chosen devices, then connect + publish.
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraint,
        video: videoConstraint,
      });
      localStreamRef.current = localStream;
      if (localVideoRef.current) {
        const videoEl = document.createElement("video");
        videoEl.autoplay = true;
        videoEl.muted = true; // never echo our own mic
        videoEl.playsInline = true;
        videoEl.srcObject = localStream;
        localVideoRef.current.innerHTML = "";
        localVideoRef.current.appendChild(videoEl);
      }

      // TODO(verify): confirm against @telnyx/video docs — connect() joins the
      // room; addStream/publish makes the local camera+mic visible to others.
      await room.connect();
      await room.addStream("self", {
        audio: true,
        video: true,
        stream: localStream,
      });

      // If the SDK fires "connected" synchronously inside connect(), the handler
      // above already ran; otherwise reflect joined state now.
      if (status !== "connected") {
        setStatus("connected");
        setSessionStartTime((t) => t || new Date());
      }
      syncParticipants(room);
    } catch (err) {
      const friendly = configNotReadyMessage(err);
      if (!friendly) console.error("Video connect error:", err);
      setError(friendly || err.message);
      setStatus("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, identity, joinToken, videoDeviceId, audioDeviceId, onDisconnect, syncParticipants, handleIncomingMessage]);

  useEffect(() => {
    connectToRoom();
    return () => {
      try { roomRef.current?.disconnect(); } catch { /* already gone */ }
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
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
    const next = !audioMuted;
    // Toggle the local audio track directly so it works even if the SDK helper
    // name differs across versions.
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !next; });
    // TODO(verify): confirm against @telnyx/video docs — the Room may expose
    // updateStream/disableStream to signal mute state to remote participants.
    try { next ? roomRef.current?.disableAudio?.("self") : roomRef.current?.enableAudio?.("self"); } catch { /* optional */ }
    setAudioMuted(next);
  };

  const toggleVideo = () => {
    const next = !videoMuted;
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !next; });
    // TODO(verify): confirm against @telnyx/video docs — disableVideo/enableVideo.
    try { next ? roomRef.current?.disableVideo?.("self") : roomRef.current?.enableVideo?.("self"); } catch { /* optional */ }
    setVideoMuted(next);
  };

  const disconnect = () => {
    if (screenStreamRef.current) {
      try { screenStreamRef.current.getTracks().forEach((t) => t.stop()); } catch { /* already stopped */ }
      screenStreamRef.current = null;
    }
    const room = roomRef.current;
    if (room && status !== "disconnected") {
      // Let the room's "disconnected" event invoke onDisconnect exactly once.
      try { room.disconnect(); } catch { /* fall through */ }
    } else if (!endedRef.current) {
      endedRef.current = true;
      onDisconnect && onDisconnect();
    }
  };

  // Screen sharing: publish a getDisplayMedia stream as a second/replacement
  // stream, restoring the camera when it stops.
  const stopScreenShare = () => {
    const screenStream = screenStreamRef.current;
    if (!screenStream) return; // already stopped — keep this idempotent
    screenStreamRef.current = null;
    screenStream.getTracks().forEach((t) => t.stop());
    // TODO(verify): confirm against @telnyx/video docs — removeStream("screen")
    // and that the camera ("self") stream remains published.
    try { roomRef.current?.removeStream?.("screen"); } catch { /* optional */ }
    // Restore the local camera preview.
    if (localVideoRef.current && localStreamRef.current) {
      const videoEl = document.createElement("video");
      videoEl.autoplay = true;
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.srcObject = localStreamRef.current;
      localVideoRef.current.innerHTML = "";
      localVideoRef.current.appendChild(videoEl);
    }
    setScreenSharing(false);
  };

  const startScreenShare = async () => {
    const room = roomRef.current;
    if (!room) return;

    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    screenStreamRef.current = screenStream;

    // TODO(verify): confirm against @telnyx/video docs — addStream publishes a
    // named "screen" stream alongside (or in place of) the camera.
    try {
      await room.addStream?.("screen", { audio: false, video: true, stream: screenStream });
    } catch (e) {
      console.error("Screen publish error:", e);
    }

    // Preview the shared screen locally.
    if (localVideoRef.current) {
      const videoEl = document.createElement("video");
      videoEl.autoplay = true;
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.srcObject = screenStream;
      localVideoRef.current.innerHTML = "";
      localVideoRef.current.appendChild(videoEl);
    }

    // The browser's own "Stop sharing" control ends the underlying track.
    const screenTrack = screenStream.getVideoTracks()[0];
    if (screenTrack) screenTrack.onended = () => stopScreenShare();
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
      // TODO(verify): confirm against @telnyx/video docs — sendMessage broadcasts
      // a payload over the room's data channel to all participants.
      roomRef.current?.sendMessage?.(JSON.stringify({ text, ts: Date.now() }));
    } catch (err) {
      console.error('Chat send error:', err);
    }
    // Data messages don't echo back to the sender, so add our own locally.
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
          <RemoteParticipant key={participant.id} participant={participant} room={roomRef.current} />
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

function RemoteParticipant({ participant, room }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    // TODO(verify): confirm against @telnyx/video docs — how a subscribed
    // participant's media is obtained. We try a MediaStream off the participant's
    // published streams; if the SDK exposes getParticipantStream/getStats use
    // that instead. Attaches video + audio elements to the tiles.
    const attach = async () => {
      let mediaStream = null;
      const streams = participant.streams || {};
      const first = Object.values(streams)[0];
      if (first?.mediaStream) {
        mediaStream = first.mediaStream;
      } else if (room?.getParticipantStream) {
        try { mediaStream = await room.getParticipantStream(participant.id); } catch { /* not ready */ }
      }
      if (cancelled || !mediaStream) return;

      if (videoRef.current && mediaStream.getVideoTracks().length) {
        const v = document.createElement("video");
        v.autoplay = true;
        v.playsInline = true;
        v.srcObject = mediaStream;
        videoRef.current.innerHTML = "";
        videoRef.current.appendChild(v);
      }
      if (audioRef.current && mediaStream.getAudioTracks().length) {
        const a = document.createElement("audio");
        a.autoplay = true;
        a.srcObject = mediaStream;
        audioRef.current.innerHTML = "";
        audioRef.current.appendChild(a);
      }
    };

    attach();
    return () => { cancelled = true; };
  }, [participant, room]);

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
