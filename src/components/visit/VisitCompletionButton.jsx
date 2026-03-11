import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { processCompletedVisit } from '@/functions/processCompletedVisit';

export default function VisitCompletionButton({ visitId, currentStatus, onCompleted }) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleComplete = async () => {
    if (currentStatus === 'completed') {
      toast.info('Visit is already completed');
      return;
    }

    setIsProcessing(true);

    try {
      // Call the AI processing function
      const result = await processCompletedVisit({ visit_id: visitId });

      if (result.success) {
        toast.success('Visit completed successfully', {
          description: `Medicare-compliant narrative generated. ${result.tasks_created} follow-up task${result.tasks_created !== 1 ? 's' : ''} created.`,
          duration: 5000
        });

        if (onCompleted) {
          onCompleted(result);
        }
      } else {
        throw new Error(result.error || 'Processing failed');
      }
    } catch (error) {
      console.error('Visit completion error:', error);
      toast.error('Failed to complete visit', {
        description: error.message
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button
      onClick={handleComplete}
      disabled={isProcessing || currentStatus === 'completed'}
      className="gap-2"
      size="lg"
    >
      {isProcessing ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Processing with AI...
        </>
      ) : currentStatus === 'completed' ? (
        <>
          <CheckCircle2 className="w-4 h-4" />
          Completed
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4" />
          Complete Visit with AI
        </>
      )}
    </Button>
  );
}