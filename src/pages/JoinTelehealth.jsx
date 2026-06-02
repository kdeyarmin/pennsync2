import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Video, Loader2, CheckCircle } from 'lucide-react';
import PreVisitChecklist from '@/components/telehealth/PreVisitChecklist';
import VideoRoom from '@/components/telehealth/VideoRoom';

export default function JoinTelehealth() {
  const [searchParams] = useSearchParams();
  const roomName = searchParams.get('room');
  const [name, setName] = useState('');
  const [joined, setJoined] = useState(false);
  const [preCheckComplete, setPreCheckComplete] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Try to get name from localStorage or session
    const savedName = sessionStorage.getItem('telehealthName');
    if (savedName) setName(savedName);
  }, []);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!preCheckComplete) {
      setError('Please complete the pre-visit checklist');
      return;
    }
    sessionStorage.setItem('telehealthName', name);
    setError(null);
    setJoined(true);
  };

  if (!roomName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Video className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-900 mb-2">Invalid Session Link</h1>
            <p className="text-slate-600 text-sm">The telehealth session link is invalid or expired.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="min-h-screen bg-slate-900 p-2 sm:p-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-4">
            <Badge className="bg-green-100 text-green-700 gap-1">
              <CheckCircle className="w-4 h-4" />
              Session Started
            </Badge>
          </div>
          <VideoRoom
            roomName={roomName}
            identity={name}
            onDisconnect={() => {
              sessionStorage.removeItem('telehealthName');
              setJoined(false);
              setName('');
              setPreCheckComplete(false);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Welcome Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Video className="w-8 h-8 text-blue-600" />
              <div>
                <CardTitle className="text-2xl">Ready for Your Visit?</CardTitle>
                <p className="text-sm text-slate-600 mt-1">Prepare your device and join the telehealth session</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Name Input */}
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Your Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="h-11 text-base"
              />
              {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            </div>

            {/* Pre-Visit Checklist */}
            <PreVisitChecklist onReadyChange={setPreCheckComplete} isNurse={false} />

            {/* Join Button */}
            <Button
              onClick={handleJoin}
              disabled={!name.trim() || !preCheckComplete}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-2"
            >
              {name && preCheckComplete ? (
                <>
                  <Video className="w-5 h-5" />
                  Join Now
                </>
              ) : (
                <>
                  <Loader2 className="w-5 h-5" />
                  {!name ? 'Enter your name' : 'Complete checklist'}
                </>
              )}
            </Button>

            {/* Security Info */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-900">
                <strong>Privacy Notice:</strong> This is a secure, encrypted video session. Your information is protected.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tips Card */}
        <Card className="bg-white/80">
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm text-slate-900 mb-3">Quick Tips</h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>✓ Find a quiet, well-lit space</li>
              <li>✓ Use headphones if available</li>
              <li>✓ Position camera at eye level</li>
              <li>✓ Check your internet connection</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}