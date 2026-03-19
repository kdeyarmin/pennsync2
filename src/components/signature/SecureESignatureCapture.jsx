import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import SignatureCanvas from 'react-signature-canvas';
import { 
  PenTool, 
  RotateCcw, 
  Check, 
  AlertTriangle, 
  Lock,
  Shield,
  Calendar,
  User,
  MapPin
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { buildSignatureIntegrityPayload, generateSignatureHash } from './signatureUtils';

export default function SecureESignatureCapture({ 
  documentType, 
  documentId, 
  documentTitle,
  onSignatureComplete,
  requireWitness = false,
  signatureRole = 'signer'
}) {
  const signatureRef = useRef(null);
  const [signatureData, setSignatureData] = useState(null);
  const [credentials, setCredentials] = useState('');
  const [attestation, setAttestation] = useState(false);
  const [locationData, setLocationData] = useState(null);
  const [ipAddress, setIpAddress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (isMounted) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Failed to load user:', error);
      }
    };

    loadUser();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!isMounted) {
            return;
          }

          setLocationData({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          console.warn('Location access denied:', error);
        }
      );
    }

    fetch('https://api.ipify.org?format=json', { signal: abortController.signal })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setIpAddress(data.ip);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIpAddress('Unknown');
        }
      });

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  const handleClear = () => {
    signatureRef.current?.clear();
    setSignatureData(null);
  };

  const handleEnd = () => {
    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      setSignatureData(signatureRef.current.toDataURL());
    }
  };


  const handleSubmitSignature = async () => {
    if (!signatureData) {
      toast.error('Please provide a signature');
      return;
    }

    if (!credentials.trim()) {
      toast.error('Please enter your credentials');
      return;
    }

    if (!attestation) {
      toast.error('Please accept the attestation statement');
      return;
    }

    setLoading(true);

    try {
      const timestamp = new Date().toISOString();
      
      // Create signature record with audit trail
      const signatureRecord = {
        document_type: documentType,
        document_id: documentId,
        document_title: documentTitle,
        signature_data: signatureData,
        signed_by: user.email,
        signed_by_name: user.full_name,
        signed_by_credentials: credentials,
        signed_date: timestamp,
        ip_address: ipAddress,
        location_data: locationData,
        user_agent: navigator.userAgent,
        attestation_accepted: attestation,
        attestation_text: `I attest that I am ${user.full_name} and that the information in this ${documentType} is accurate and complete to the best of my knowledge.`,
        signature_method: 'electronic_capture',
        signature_role: signatureRole,
        device_type: /mobile|android|iphone/i.test(navigator.userAgent) ? 'mobile' : /tablet|ipad/i.test(navigator.userAgent) ? 'tablet' : 'desktop',
      };

      // Generate tamper-evident hash
      const signatureHash = generateSignatureHash(buildSignatureIntegrityPayload(signatureRecord));
      signatureRecord.signature_hash = signatureHash;

      // Save to DocumentSignature entity
      const savedSignature = await base44.entities.DocumentSignature.create(signatureRecord);

      // Create audit log entry
      await base44.entities.SecurityLog.create({
        event_type: 'signature_captured',
        user_email: user.email,
        user_name: user.full_name,
        event_details: {
          document_type: documentType,
          document_id: documentId,
          signature_id: savedSignature.id,
          signature_role: signatureRole,
          signature_hash: signatureHash,
          timestamp: timestamp,
          ip_address: ipAddress,
          location: locationData
        },
        severity: 'info',
        ip_address: ipAddress
      });

      toast.success('Signature captured successfully');
      
      if (onSignatureComplete) {
        onSignatureComplete(savedSignature);
      }
    } catch (error) {
      console.error('Signature capture failed:', error);
      toast.error('Failed to capture signature');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-2 border-indigo-200">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-600" />
          <CardTitle className="text-lg">Secure Electronic Signature</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Document Info */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Lock className="w-4 h-4 text-gray-600" />
            <span className="font-semibold text-gray-900">Document:</span>
            <span className="text-gray-700">{documentTitle}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-gray-600" />
            <span className="font-semibold text-gray-900">Signer:</span>
            <span className="text-gray-700">{user?.full_name} {signatureRole ? `(${signatureRole})` : ''}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-600" />
            <span className="font-semibold text-gray-900">Date:</span>
            <span className="text-gray-700">{new Date().toLocaleString()}</span>
          </div>
          {locationData && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-gray-600" />
              <span className="font-semibold text-gray-900">Location:</span>
              <span className="text-gray-700">
                {locationData.latitude.toFixed(6)}, {locationData.longitude.toFixed(6)}
              </span>
            </div>
          )}
        </div>

        {requireWitness && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-800 text-sm">
              This signature requires a witness. Capture the primary signer first, then collect the witness signature in the next workflow step.
            </AlertDescription>
          </Alert>
        )}

        {/* Credentials Input */}
        <div className="space-y-2">
          <Label htmlFor="credentials" className="text-sm font-semibold text-gray-900">
            Your Credentials <span className="text-red-500">*</span>
          </Label>
          <Input
            id="credentials"
            placeholder="e.g., RN, BSN, MSN"
            value={credentials}
            onChange={(e) => setCredentials(e.target.value)}
          />
          <p className="text-xs text-gray-600">Enter your professional credentials as they should appear on the signature</p>
        </div>

        {/* Signature Canvas */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-gray-900">
            Draw Your Signature <span className="text-red-500">*</span>
          </Label>
          <div className="border-2 border-gray-300 rounded-lg bg-white">
            <SignatureCanvas
              ref={signatureRef}
              canvasProps={{
                className: 'w-full h-40 cursor-crosshair',
                style: { touchAction: 'none' }
              }}
              onEnd={handleEnd}
              backgroundColor="white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Clear Signature
            </Button>
            {signatureData && (
              <Badge className="bg-green-500">
                <Check className="w-3 h-3 mr-1" />
                Signature Captured
              </Badge>
            )}
          </div>
        </div>

        {/* Attestation */}
        <Alert className="bg-yellow-50 border-yellow-300">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <AlertDescription className="text-sm text-yellow-900">
            <div className="flex items-start gap-2 mt-2">
              <Checkbox
                id="attestation"
                checked={attestation}
                onCheckedChange={setAttestation}
                className="mt-0.5"
              />
              <label htmlFor="attestation" className="text-sm cursor-pointer">
                I attest that I am <strong>{user?.full_name}</strong> and that the information in this {documentType} is accurate and complete to the best of my knowledge. I understand that my electronic signature has the same legal effect as a handwritten signature.
              </label>
            </div>
          </AlertDescription>
        </Alert>

        {/* Security Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Tamper-Evident Security</p>
              <p>Your signature is secured with cryptographic hashing and includes your IP address, timestamp, and location data for regulatory compliance. Any modification to the signed document will invalidate the signature.</p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmitSignature}
          disabled={loading || !signatureData || !credentials || !attestation}
          className="w-full bg-indigo-600 hover:bg-indigo-700"
        >
          <PenTool className="w-4 h-4 mr-2" />
          {loading ? 'Capturing Signature...' : 'Sign Document'}
        </Button>
      </CardContent>
    </Card>
  );
}