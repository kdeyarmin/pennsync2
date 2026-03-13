import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight } from "lucide-react";

export default function ProfileCompletenessAlert({ user }) {
  const validation = useMemo(() => {
    if (!user) return { isComplete: true, missing: [] };

    const requiredFields = [
      { key: 'phone', label: 'Phone Number' },
      { key: 'care_scope', label: 'Care Scope' },
      { key: 'credential_type', label: 'Credential Type' },
    ];

    const missing = requiredFields.filter(field => 
      !user[field.key] || user[field.key] === ''
    );

    return {
      isComplete: missing.length === 0,
      missing: missing.map(m => m.label)
    };
  }, [user]);

  if (validation.isComplete) {
    return null;
  }

  return (
    <Alert className="border-amber-300 bg-amber-50 mb-4">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold mb-1">Complete Your Profile</p>
            <p className="text-sm">Missing: {validation.missing.join(', ')}</p>
          </div>
          <Link to="/UserSettings">
            <Button size="sm" variant="outline" className="gap-2">
              Update Profile <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </AlertDescription>
    </Alert>
  );
}