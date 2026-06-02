import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { validateSignerToken } from '@/functions/validateSignerToken';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Lock } from 'lucide-react';
import SignerPackageViewer from '@/components/signer/SignerPackageViewer';

export default function SignerPortal() {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [packageData, setPackageData] = useState(null);
  const [error, setError] = useState(null);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('No access token provided. Please use the link from your email.');
      setIsLoading(false);
      return;
    }

    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      setIsLoading(true);
      const response = await validateSignerToken({ token });
      
      if (response.valid) {
        setIsValid(true);
        setPackageData(response);
      } else {
        setError(response.error || 'Invalid or expired access link.');
      }
    } catch (err) {
      setError(err.message || 'Failed to validate access link.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }



  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 mb-4">{error}</p>
            <p className="text-xs text-gray-600">
              If you believe this is an error, please contact the document administrator or try accessing the link again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValid || !packageData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Public Portal Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Document Signing Portal</h1>
            <p className="text-sm text-gray-600">Secure access for authorized signers</p>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Lock className="w-4 h-4" />
            <span className="text-sm">Secure Session</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Greeting */}
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-sm">
              <span className="font-semibold text-gray-900">Hello {packageData.signerName},</span>
            </p>
            <p className="text-sm text-gray-700 mt-2">
              You have been invited to review and sign documents. Please complete all required signatures by{' '}
              <span className="font-medium">
                {new Date(packageData.dueDate).toLocaleDateString()}
              </span>
              .
            </p>
          </CardContent>
        </Card>

        {/* Package Status Overview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">{packageData.packageName}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {/* Total Documents */}
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">
                  {packageData.documents.length}
                </p>
                <p className="text-xs text-gray-600 mt-1">Total Documents</p>
              </div>

              {/* Signed Documents */}
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {packageData.documents.filter((d) => d.status === 'signed').length}
                </p>
                <p className="text-xs text-gray-600 mt-1">Signed</p>
              </div>

              {/* Pending Documents */}
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <p className="text-2xl font-bold text-amber-600">
                  {packageData.documents.filter((d) => d.status !== 'signed').length}
                </p>
                <p className="text-xs text-gray-600 mt-1">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Document Viewer */}
        <SignerPackageViewer
          packageData={packageData}
          token={token}
          onSignatureComplete={validateToken}
        />

        {/* Security Notice */}
        <Card className="mt-6 bg-gray-50">
          <CardContent className="pt-6">
            <p className="text-xs text-gray-700 leading-relaxed">
              <strong>Security Notice:</strong> This portal uses secure, token-based authentication to protect your sensitive information. Your signing activity is encrypted and logged for audit purposes. Do not share this link with others.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}