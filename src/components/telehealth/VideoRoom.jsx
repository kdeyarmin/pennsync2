import React, { useEffect, useRef, useState, useCallback } from "react";
import { createTelehealthToken } from "@/functions/createTelehealthToken";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  Monitor, Users, Loader2
} from "lucide-react";

export default function VideoRoom({ roomName, identity, onDisconnect }) {
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [status, setStatus] = useState("connecting"); // connecting | connected | error
  const [error, setError] = useState(null);
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);

  const localVideoRef = useRef(null);
  const roomRef = useRef(null);

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
      setRoom(connectedRoom);
      setStatus("connected");

      // Attach local video
      connectedRoom.localParticipant.videoTracks.forEach(publication => {
        if (localVideoRef.current && publication.track) {
          localVideoRef.current.appendChild(publication.track.attach());
        }
      });

      // Existing remote participants
      setParticipants([...connectedRoom.participants.values()]);

      connectedRoom.on("participantConnected", p => setParticipants(prev => [...prev, p]));
      connectedRoom.on("participantDisconnected", p => setParticipants(prev => prev.filter(x => x !== p)));
      connectedRoom.on("disconnected", () => {
        setStatus("disconnected");
        onDisconnect && onDisconnect();
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
      audioMuted ? pub.track.enable() : pub.track.disable();
    });
    setAudioMuted(m => !m);
  };

  const toggleVideo = () => {
    roomRef.current?.localParticipant.videoTracks.forEach(pub => {
      videoMuted ? pub.track.enable() : pub.track.disable();
    });
    setVideoMuted(m => !m);
  };

  const disconnect = () => {
    roomRef.current?.disconnect();
    onDisconnect && onDisconnect();
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

  return (
    <div className="flex flex-col gap-4">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-green-700">Live</span>
          <Badge variant="outline" className="text-xs">
            <Users className="w-3 h-3 mr-1" />
            {participants.length + 1} participant{participants.length !== 0 ? "s" : ""}
          </Badge>
        </div>
        <span className="text-sm text-gray-500 font-mono">{roomName}</span>
      </div>

      {/* Video grid */}
      <div className={`grid gap-3 ${participants.length > 0 ? "grid-cols-2" : "grid-cols-1"}`}>
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
      <div className="flex items-center justify-center gap-4 py-3 bg-gray-900 rounded-xl">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleAudio}
          className={`rounded-full h-12 w-12 ${audioMuted ? "bg-red-600 hover:bg-red-700 text-white" : "bg-gray-700 hover:bg-gray-600 text-white"}`}
        >
          {audioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleVideo}
          className={`rounded-full h-12 w-12 ${videoMuted ? "bg-red-600 hover:bg-red-700 text-white" : "bg-gray-700 hover:bg-gray-600 text-white"}`}
        >
          {videoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={disconnect}
          className="rounded-full h-14 w-14 bg-red-600 hover:bg-red-700 text-white"
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
      </div>
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