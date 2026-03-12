import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  Sparkles
} from "lucide-react";

export default function AIFeedbackPanel({ 
  generatedContent, 
  contentType = "enhanced_note",
  onFeedbackSubmitted 
}) {
  const [rating, setRating] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitFeedback = async () => {
    if (!rating) return;
    
    setIsSubmitting(true);
    try {
      const user = await base44.auth.me();
      
      // Store feedback for improvement
      await base44.entities.UserActivity.create({
        user_email: user?.email || 'unknown',
        user_name: user?.full_name || 'Unknown',
        action: 'ai_feedback',
        details: {
          content_type: contentType,
          rating: rating,
          feedback_text: feedback,
          content_length: generatedContent?.length,
          page: 'SmartNoteAssistant'
        },
        page: 'SmartNoteAssistant'
      });

      setSubmitted(true);
      onFeedbackSubmitted?.({ rating, feedback });
      
      setTimeout(() => {
        setSubmitted(false);
        setRating(null);
        setFeedback("");
      }, 2000);
    } catch (error) {
      console.error("Error submitting feedback:", error);
    }
    setIsSubmitting(false);
  };

  if (!generatedContent) return null;

  return (
    <Card className="border-purple-200 bg-purple-50/30">
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          Rate AI Output
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 py-3">
        {submitted ? (
          <div className="flex items-center gap-2 text-green-600 py-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">Thanks for your feedback!</span>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={rating === 'positive' ? 'default' : 'outline'}
                onClick={() => setRating('positive')}
                className={rating === 'positive' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                <ThumbsUp className="w-4 h-4 mr-1" />
                Good
              </Button>
              <Button
                size="sm"
                variant={rating === 'negative' ? 'default' : 'outline'}
                onClick={() => setRating('negative')}
                className={rating === 'negative' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                <ThumbsDown className="w-4 h-4 mr-1" />
                Needs Work
              </Button>
            </div>

            {rating && (
              <>
                <Textarea
                  placeholder={rating === 'positive' ? 
                    "What did you like? (optional)" : 
                    "What could be improved? (optional)"
                  }
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
                <Button
                  size="sm"
                  onClick={handleSubmitFeedback}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                </Button>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}