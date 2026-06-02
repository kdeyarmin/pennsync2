import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, CheckCircle, ShieldCheck } from 'lucide-react';
import PreVisitChecklist from '@/components/telehealth/PreVisitChecklist';
import VideoRoom from '@/components/telehealth/VideoRoom';

// Public, no-login page a patient lands on after following their telehealth
// invite link (/join?room=...&t=...). The token in the URL is the capability
// that authorizes audio/video access; the backend validates it and mints a
// Twilio grant scoped to this one room. No patient account is required.
export default function JoinTelehealth() {
  const [searchParams] = useSearchParams();
  const roomName = searchParams.get('room');
  const joinToken = searchParams.get('t');
  const [ready, setReady] = useState(false);
  const [joined, setJoined] = useState(false);

  if (!roomName || !joinToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Video className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid Visit Link</h1>
            <p className="text-gray-600 text-sm">
              This telehealth link is missing information or has expired. Please use the most recent
              link your care team sent you, or contact the office.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="min-h-screen bg-gray-900 p-2 sm:p-4">
        <div className="max-w-5xl mx-auto">
          <div className="mb-4 flex items-center justify-between">
            <Badge className="bg-green-100 text-green-700 gap-1">
              <CheckCircle className="w-4 h-4" />
              Connected
            </Badge>
            <span className="text-sm text-gray-300">Telehealth Visit</span>
          </div>
          <VideoRoom
            roomName={roomName}
            joinToken={joinToken}
            identity="You"
            waitingMessage="Waiting for your provider to join…"
            onDisconnect={() => setJoined(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Video className="w-8 h-8 text-blue-600" />
              <div>
                <CardTitle className="text-2xl">Ready for your visit?</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Confirm a few things below, then join your provider.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <PreVisitChecklist onReadyChange={setReady} isNurse={false} />

            <Button
              onClick={() => setJoined(true)}
              disabled={!ready}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-2"
            >
              <Video className="w-5 h-5" />
              {ready ? 'Join Now' : 'Complete the checklist to join'}
            </Button>

            <p className="text-xs text-gray-500 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Your video visit is private and secure.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
