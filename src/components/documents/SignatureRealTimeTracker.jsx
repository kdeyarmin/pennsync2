import { useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { CheckCircle2 } from 'lucide-react';

export default function SignatureRealTimeTracker({ packageId, onSignatureUpdate }) {
  useEffect(() => {
    let unsubscribe = null;

    const setupSubscription = async () => {
      try {
        // Subscribe to all DocumentSignature changes
        unsubscribe = base44.entities.DocumentSignature.subscribe((event) => {
          if (event.type === 'update' && event.data) {
            const sig = event.data;

            // Check if this signature is in our package
            if (sig.package_id === packageId && sig.status === 'signed') {
              // Notify admin
              toast.success(
                <div className="flex gap-2 items-start">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Document Signed</p>
                    <p className="text-sm text-slate-600">{sig.signer_name} signed the document</p>
                  </div>
                </div>,
                { duration: 4000 }
              );

              // Update parent component
              if (onSignatureUpdate) {
                onSignatureUpdate(sig);
              }
            }
          }
        });
      } catch (error) {
        console.error('Failed to setup signature subscription:', error);
      }
    };

    setupSubscription();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [packageId, onSignatureUpdate]);

  return null;
}