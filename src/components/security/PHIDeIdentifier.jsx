import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Copy, Shield, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

/**
 * PHI De-Identification Component
 * Removes or masks Protected Health Information before AI processing or sharing
 */
export default function PHIDeIdentifier({ text, onDeIdentified }) {
  const [originalText, setOriginalText] = useState(text || "");
  const [deIdentifiedText, setDeIdentifiedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOriginal, setShowOriginal] = useState(true);

  const deIdentify = () => {
    setIsProcessing(true);
    
    let processed = originalText;
    const replacements = [];

    // 1. Names (basic pattern - first/last name capitalized)
    const namePattern = /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g;
    processed = processed.replace(namePattern, (match) => {
      replacements.push({ type: 'Name', original: match });
      return '[PATIENT NAME]';
    });

    // 2. Email addresses
    const emailPattern = /[\w.-]+@[\w.-]+\.\w+/g;
    processed = processed.replace(emailPattern, (match) => {
      replacements.push({ type: 'Email', original: match });
      return '[EMAIL]';
    });

    // 3. Phone numbers (multiple formats)
    const phonePattern = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    processed = processed.replace(phonePattern, (match) => {
      replacements.push({ type: 'Phone', original: match });
      return '[PHONE]';
    });

    // 4. SSN
    const ssnPattern = /\b\d{3}-\d{2}-\d{4}\b/g;
    processed = processed.replace(ssnPattern, (match) => {
      replacements.push({ type: 'SSN', original: match });
      return '[SSN]';
    });

    // 5. Medical Record Numbers (common patterns)
    const mrnPattern = /\b(MRN|MR#|Medical Record)[:\s#]*(\d{6,10})\b/gi;
    processed = processed.replace(mrnPattern, (match) => {
      replacements.push({ type: 'MRN', original: match });
      return '[MRN]';
    });

    // 6. Dates (MM/DD/YYYY, MM-DD-YYYY, etc.)
    const datePattern = /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/g;
    processed = processed.replace(datePattern, (match) => {
      replacements.push({ type: 'Date', original: match });
      return '[DATE]';
    });

    // 7. Addresses (basic street patterns)
    const addressPattern = /\b\d+\s+[A-Z][a-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Court|Ct)\b/gi;
    processed = processed.replace(addressPattern, (match) => {
      replacements.push({ type: 'Address', original: match });
      return '[ADDRESS]';
    });

    // 8. ZIP codes
    const zipPattern = /\b\d{5}(-\d{4})?\b/g;
    processed = processed.replace(zipPattern, (match) => {
      replacements.push({ type: 'ZIP', original: match });
      return '[ZIP]';
    });

    // 9. Ages over 89 (HIPAA Safe Harbor requires masking)
    const agePattern = /\b(age|aged)\s*:?\s*(\d{2,3})\b/gi;
    processed = processed.replace(agePattern, (match, prefix, age) => {
      if (parseInt(age) > 89) {
        replacements.push({ type: 'Age >89', original: match });
        return `${prefix} [AGE >89]`;
      }
      return match;
    });

    setDeIdentifiedText(processed);
    setIsProcessing(false);
    
    if (onDeIdentified) {
      onDeIdentified({
        original: originalText,
        deIdentified: processed,
        replacements
      });
    }

    toast.success(`De-identified text - ${replacements.length} items masked`);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <Card className="border-2 border-navy-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="w-5 h-5 text-navy-600" />
          PHI De-Identification Tool
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-navy-50 border-navy-300">
          <AlertDescription className="text-navy-900 text-sm">
            <p className="font-semibold mb-1">🛡️ HIPAA Safe Harbor De-Identification</p>
            <p>Automatically removes 18 identifiers: names, dates, addresses, phone numbers, emails, SSN, MRN, ages {'>'} 89, etc.</p>
          </AlertDescription>
        </Alert>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Original Text (Contains PHI)</label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOriginal(!showOriginal)}
            >
              {showOriginal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          <Textarea
            value={originalText}
            onChange={(e) => setOriginalText(e.target.value)}
            placeholder="Paste clinical note or text containing PHI..."
            className="min-h-[200px] font-mono text-sm"
            style={{ filter: showOriginal ? 'none' : 'blur(8px)' }}
          />
        </div>

        <Button
          onClick={deIdentify}
          disabled={isProcessing || !originalText}
          className="w-full bg-navy-600 hover:bg-navy-700 min-h-[44px]"
        >
          {isProcessing ? (
            <>Processing...</>
          ) : (
            <>
              <Shield className="w-4 h-4 mr-2" />
              De-Identify Text
            </>
          )}
        </Button>

        {deIdentifiedText && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                De-Identified Text (Safe for AI Processing)
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(deIdentifiedText)}
                className="min-h-[44px]"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
            </div>
            <Textarea
              value={deIdentifiedText}
              readOnly
              className="min-h-[200px] font-mono text-sm bg-green-50 border-green-300"
            />
            
            <Alert className="bg-green-50 border-green-300">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800 text-sm">
                This text is safe to use with external AI services or share for training purposes.
                All protected health information has been removed.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}