import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Loader2, CheckCircle2 } from "lucide-react";

export default function LocationTracker({ visitId, onLocationCaptured }) {
  const [location, setLocation] = useState(null);
  const [isGetting, setIsGetting] = useState(false);
  const [error, setError] = useState(null);

  const getCurrentLocation = () => {
    setIsGetting(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      setIsGetting(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString()
        };
        
        setLocation(loc);
        setIsGetting(false);
        
        onLocationCaptured?.(loc);
      },
      (error) => {
        setError(error.message);
        setIsGetting(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Auto-capture location on mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            {isGetting ? (
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            ) : location ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <MapPin className="w-5 h-5 text-blue-600" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm mb-1">Visit Location</p>
            
            {location && (
              <div className="text-xs text-gray-600 space-y-1">
                <p>Lat: {location.latitude.toFixed(6)}</p>
                <p>Lng: {location.longitude.toFixed(6)}</p>
                <p className="text-green-600">✓ Location captured</p>
              </div>
            )}
            
            {error && (
              <p className="text-xs text-red-600">{error}</p>
            )}
            
            {!location && !isGetting && (
              <Button
                onClick={getCurrentLocation}
                size="sm"
                variant="outline"
                className="mt-2"
              >
                <Navigation className="w-3 h-3 mr-1" />
                Get Location
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}