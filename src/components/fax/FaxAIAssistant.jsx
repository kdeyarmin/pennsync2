import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { analyzeFaxContent } from "@/functions/analyzeFaxContent";
import {
  Sparkles,
  FileText,
  Send,
  Users,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Copy,
  RefreshCw,
  MessageSquare
} from "lucide-react";
import { toast } from "sonner";

export default function FaxAIAssistant({ faxLogId }) {
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [editedReply, setEditedReply] = useState("");


  const { data: faxLog } = useQuery({
    queryKey: ['fax-log', faxLogId],
    queryFn: async () => {
      const logs = await base44.entities.FaxLog.filter({ id: faxLogId });
      return logs[0];
    },
    enabled: !!faxLogId
  });

  const analyzeContent = async (type = 'full') => {
    if (!faxLogId) return;
    
    setIsAnalyzing(true);
    try {
      const result = await analyzeFaxContent({ fax_log_id: faxLogId, analysis_type: type });
      setAnalysis(result.data);
      if (result.data.reply_draft) {
        setEditedReply(result.data.reply_draft.body);
      }
      toast.success("AI analysis complete");
    } catch (error) {
      toast.error("Analysis failed: " + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleSendReply = () => {
    if (!editedReply.trim()) {
      toast.error("Reply is empty");
      return;
    }
    // Open fax sending interface with pre-filled reply
    toast.success("Opening fax sender with reply...");
    // You would typically navigate or open a modal here
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'medium':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default:
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
    }
  };

  if (!faxLog) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
          <p className="text-slate-500 mt-2">Loading fax details...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* AI Assistant Header */}
      <Card className="bg-gradient-to-br from-navy-50 to-indigo-50 border-navy-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-navy-600" />
            AI Fax Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">
            AI-powered analysis, summaries, and reply drafting for your faxes
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => analyzeContent('full')}
              disabled={isAnalyzing || !faxLog.ocr_processed}
              className="bg-navy-600 hover:bg-navy-700"
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Analyze Fax
            </Button>
            {analysis && (
              <Button
                variant="outline"
                onClick={() => analyzeContent('full')}
                disabled={isAnalyzing}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Re-analyze
              </Button>
            )}
          </div>
          {!faxLog.ocr_processed && (
            <p className="text-sm text-orange-600">
              ⚠️ OCR processing required before analysis
            </p>
          )}
        </CardContent>
      </Card>

      {/* Alerts */}
      {analysis?.alerts?.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Alerts & Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analysis.alerts.map((alert, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 bg-white rounded-lg border border-orange-200"
              >
                {getSeverityIcon(alert.severity)}
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{alert.message}</p>
                  {alert.action_required && (
                    <Badge className="mt-1 bg-orange-600 text-white">
                      Action Required
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {analysis?.summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Fax Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className={getUrgencyColor(analysis.summary.urgency)}>
                  {analysis.summary.urgency} urgency
                </Badge>
                <Badge variant="outline">{analysis.summary.category}</Badge>
              </div>
              <h4 className="font-semibold text-slate-900 mb-2">
                {analysis.summary.topic}
              </h4>
            </div>

            {analysis.summary.key_points?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Key Points:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
                  {analysis.summary.key_points.map((point, idx) => (
                    <li key={idx}>{point}</li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.summary.action_items?.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <p className="text-sm font-semibold text-blue-900 mb-2">
                  Action Items:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                  {analysis.summary.action_items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reply Draft */}
      {analysis?.reply_draft && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              Draft Reply
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-1">Subject:</p>
              <div className="flex items-center gap-2">
                <p className="text-slate-900 flex-1">{analysis.reply_draft.subject}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(analysis.reply_draft.subject)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-700">Message:</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(editedReply)}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
              </div>
              <Textarea
                value={editedReply}
                onChange={(e) => setEditedReply(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            {analysis.reply_draft.suggested_attachments?.length > 0 && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm font-semibold text-slate-700 mb-2">
                  Suggested Attachments:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
                  {analysis.reply_draft.suggested_attachments.map((att, idx) => (
                    <li key={idx}>{att}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button onClick={handleSendReply} className="w-full">
              <Send className="w-4 h-4 mr-2" />
              Send Reply
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Suggested Contacts */}
      {analysis?.suggested_contacts?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              Suggested Contacts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analysis.suggested_contacts.map((contact, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{contact.name}</p>
                    {contact.matched && (
                      <Badge className="bg-green-600 text-white text-xs">
                        In Contacts
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">{contact.fax_number}</p>
                  <p className="text-xs text-slate-500 mt-1">{contact.reason}</p>
                </div>
                <Button variant="outline" size="sm">
                  <Send className="w-3 h-3 mr-1" />
                  Send
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}