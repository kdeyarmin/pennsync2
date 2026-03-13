import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function ProfileCompletenessAlert({ user }) {
  // Check for uploaded credentials
  const { data: credentials = [] } = useQuery({
    queryKey: ['myCredentials', user?.email],
    queryFn: () => user?.email ? base44.entities.PersonnelCredential.filter({ user_id: user.email }) : Promise.resolve([]),
    enabled: !!user?.email,
    initialData: [],
  });

  const validation = useMemo(() => {
    if (!user) return { isComplete: true, missing: [], needsCredentials: false };

    const requiredFields = [
      { key: 'phone', label: 'Phone Number' },
      { key: 'care_scope', label: 'Care Scope' },
      { key: 'credential_type', label: 'Credential Type' },
    ];

    const missing = requiredFields.filter(field => 
      !user[field.key] || user[field.key] === ''
    );

    // Check if user has at least one active credential
    const hasActiveCredential = credentials.some(c => c.status === 'approved' || c.status === 'pending_approval');

    return {
      isComplete: missing.length === 0 && hasActiveCredential,
      missing: missing.map(m => m.label),
      needsCredentials: !hasActiveCredential
    };
  }, [user, credentials]);

  if (validation.isComplete) {
    return null;
  }

  return (
    <Alert className="border-amber-300 bg-amber-50 mb-4">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800">
        <div>
          <p className="font-semibold mb-2">Complete Your Profile</p>
          
          {validation.missing.length > 0 && (
            <div className="mb-3">
              <p className="text-sm mb-2">Missing profile info: {validation.missing.join(', ')}</p>
              <Link to="/UserSettings">
                <Button size="sm" variant="outline" className="gap-2 min-h-[40px]">
                  Update Profile <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
          
          {validation.needsCredentials && (
            <div className={validation.missing.length > 0 ? "pt-3 border-t border-amber-200" : ""}>
              <p className="text-sm mb-2">Upload your license, certifications, and insurance</p>
              <Link to="/PersonnelFile">
                <Button size="sm" variant="outline" className="gap-2 min-h-[40px]">
                  <FileText className="h-4 w-4" />
                  Upload Credentials <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}