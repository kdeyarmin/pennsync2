import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Star, ThumbsUp, ThumbsDown, Send } from "lucide-react";

export default function ModuleFeedbackForm({ completionId, moduleTitle, onSubmit }) {
  const [effectiveness, setEffectiveness] = useState(0);
  const [difficulty, setDifficulty] = useState('just_right');
  const [relevance, setRelevance] = useState(0);
  const [wouldRecommend, setWouldRecommend] = useState(null);
  const [suggestions, setSuggestions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TrainingCompletion.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingCompletions'] });
      if (onSubmit) onSubmit();
    }
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      await updateMutation.mutateAsync({
        id: completionId,
        data: {
          effectiveness_rating: effectiveness,
          difficulty_rating: difficulty,
          relevance_rating: relevance,
          would_recommend: wouldRecommend,
          improvement_suggestions: suggestions || undefined
        }
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback');
    }
    
    setIsSubmitting(false);
  };

  const renderStars = (rating, setRating) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setRating(star)}
          className="focus:outline-none"
        >
          <Star
            className={`w-8 h-8 transition-colors ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );

  return (
    <Card className="border-2 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5 text-blue-600" />
          Help Us Improve: Rate This Module
        </CardTitle>
        <p className="text-sm text-gray-600">Your feedback helps create better learning experiences</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Effectiveness Rating */}
        <div>
          <Label className="text-base font-semibold mb-2 block">
            How effective was "{moduleTitle}" for your learning?
          </Label>
          {renderStars(effectiveness, setEffectiveness)}
        </div>

        {/* Difficulty Rating */}
        <div>
          <Label className="text-base font-semibold mb-3 block">
            How was the difficulty level?
          </Label>
          <RadioGroup value={difficulty} onValueChange={setDifficulty}>
            <div className="grid grid-cols-3 gap-3">
              <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                difficulty === 'too_easy' ? 'border-blue-500 bg-blue-100' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <RadioGroupItem value="too_easy" id="too_easy" className="sr-only" />
                <Label htmlFor="too_easy" className="cursor-pointer block text-center">
                  <div className="text-2xl mb-1">😴</div>
                  <div className="text-sm font-medium">Too Easy</div>
                </Label>
              </div>
              <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                difficulty === 'just_right' ? 'border-green-500 bg-green-100' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <RadioGroupItem value="just_right" id="just_right" className="sr-only" />
                <Label htmlFor="just_right" className="cursor-pointer block text-center">
                  <div className="text-2xl mb-1">👍</div>
                  <div className="text-sm font-medium">Just Right</div>
                </Label>
              </div>
              <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                difficulty === 'too_hard' ? 'border-red-500 bg-red-100' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <RadioGroupItem value="too_hard" id="too_hard" className="sr-only" />
                <Label htmlFor="too_hard" className="cursor-pointer block text-center">
                  <div className="text-2xl mb-1">😰</div>
                  <div className="text-sm font-medium">Too Hard</div>
                </Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Relevance Rating */}
        <div>
          <Label className="text-base font-semibold mb-2 block">
            How relevant was this to your daily work?
          </Label>
          {renderStars(relevance, setRelevance)}
        </div>

        {/* Would Recommend */}
        <div>
          <Label className="text-base font-semibold mb-3 block">
            Would you recommend this module to colleagues?
          </Label>
          <div className="flex gap-3">
            <Button
              type="button"
              variant={wouldRecommend === true ? 'default' : 'outline'}
              onClick={() => setWouldRecommend(true)}
              className={wouldRecommend === true ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              <ThumbsUp className="w-4 h-4 mr-2" />
              Yes
            </Button>
            <Button
              type="button"
              variant={wouldRecommend === false ? 'default' : 'outline'}
              onClick={() => setWouldRecommend(false)}
              className={wouldRecommend === false ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              <ThumbsDown className="w-4 h-4 mr-2" />
              No
            </Button>
          </div>
        </div>

        {/* Improvement Suggestions */}
        <div>
          <Label htmlFor="suggestions" className="text-base font-semibold mb-2 block">
            Suggestions for Improvement (Optional)
          </Label>
          <Textarea
            id="suggestions"
            value={suggestions}
            onChange={(e) => setSuggestions(e.target.value)}
            placeholder="What could make this module better?"
            rows={3}
          />
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || effectiveness === 0 || relevance === 0 || wouldRecommend === null}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          <Send className="w-4 h-4 mr-2" />
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </Button>
      </CardContent>
    </Card>
  );
}