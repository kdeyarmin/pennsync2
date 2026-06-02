import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, ShieldCheck } from 'lucide-react';
import TelehealthCall from '@/components/telehealth/TelehealthCall';

// Public, no-login page a patient lands on after following their telehealth
// invite link (/join?room=...&t=...). The token in the URL is the capability
// that authorizes audio/video access; the backend validates it and mints a
// Twilio grant scoped to this one room. No patient account is required.
export default function JoinTelehealth() {
  const [searchParams] = useSearchParams();
  const roomName = searchParams.get('room');
  const joinToken = searchParams.get('t');
  const [left, setLeft] = useState(false);

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

  if (left) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <Video className="w-12 h-12 text-blue-600 mx-auto" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">You&apos;ve left the visit</h1>
              <p className="text-gray-600 text-sm">If you left by accident, you can rejoin below.</p>
            </div>
            <Button onClick={() => setLeft(false)} className="bg-blue-600 hover:bg-blue-700 gap-2">
              <Video className="w-4 h-4" /> Rejoin visit
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-3 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <Badge className="bg-blue-100 text-blue-700 gap-1">
            <Video className="w-3.5 h-3.5" /> Telehealth Visit
          </Badge>
          <span className="text-xs text-gray-300 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Private &amp; secure
          </span>
        </div>
        <TelehealthCall
          roomName={roomName}
          joinToken={joinToken}
          identity="You"
          role="patient"
          waitingMessage="Waiting for your provider to join…"
          onDisconnect={() => setLeft(true)}
        />
      </div>
    </div>
  );
}
