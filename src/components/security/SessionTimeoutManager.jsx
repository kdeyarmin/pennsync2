import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, AlertTriangle, RefreshCw } from "lucide-react";
import { logSecurityEvent } from "../utils/security";

/**
 * Session Timeout Manager Component
 * HIPAA-compliant automatic session timeout with warning
 */
export default function SessionTimeoutManager({ 
  timeoutMinutes = 15,
  warningMinutes = 2 
}) {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(warningMinutes * 60);
  const [lastActivity, setLastActivity] = useState(Date.now());

  const handleLogout = useCallback(async () => {
    await logSecurityEvent('SESSION_TIMEOUT', {
      timeout_minutes: timeoutMinutes,
      last_activity: new Date(lastActivity).toISOString()
    }, 'warning');
    
    // Clear sensitive data from memory
    sessionStorage.clear();
    
    // Logout and redirect
    base44.auth.logout();
  }, [timeoutMinutes, lastActivity]);

  const handleExtendSession = useCallback(() => {
    setShowWarning(false);
    setLastActivity(Date.now());
    setSecondsRemaining(warningMinutes * 60);
    
    logSecurityEvent('SESSION_EXTENDED', {
      extended_at: new Date().toISOString()
    }, 'info');
  }, [warningMinutes]);

  const resetActivity = useCallback(() => {
    setLastActivity(Date.now());
    setShowWarning(false);
  }, []);

  useEffect(() => {
    // Activity listeners
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      window.addEventListener(event, resetActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetActivity);
      });
    };
  }, [resetActivity]);

  useEffect(() => {
    const warningThreshold = (timeoutMinutes - warningMinutes) * 60 * 1000;
    const timeoutThreshold = timeoutMinutes * 60 * 1000;

    const checkInterval = setInterval(() => {
      const inactive = Date.now() - lastActivity;

      if (inactive >= timeoutThreshold) {
        handleLogout();
      } else if (inactive >= warningThreshold && !showWarning) {
        setShowWarning(true);
      }

      if (showWarning) {
        const remaining = Math.max(0, Math.floor((timeoutThreshold - inactive) / 1000));
        setSecondsRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [lastActivity, showWarning, timeoutMinutes, warningMinutes, handleLogout]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={showWarning} onOpenChange={setShowWarning}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-yellow-900">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            Session Timeout Warning
          </DialogTitle>
          <DialogDescription>
            Your session will expire due to inactivity
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <Alert className="bg-yellow-50 border-yellow-300">
            <Clock className="w-5 h-5 text-yellow-600" />
            <AlertDescription>
              <p className="font-semibold text-yellow-900 mb-2">
                Time Remaining: {formatTime(secondsRemaining)}
              </p>
              <p className="text-sm text-yellow-800">
                Your session will automatically log out in {formatTime(secondsRemaining)} to protect patient data.
                Click "Stay Logged In" to continue working.
              </p>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="min-h-[44px]"
          >
            Log Out Now
          </Button>
          <Button
            onClick={handleExtendSession}
            className="bg-green-600 hover:bg-green-700 min-h-[44px]"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Stay Logged In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}