import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Bell,
  RefreshCw,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  BookOpen,
  FileText,
  Settings,
  Eye,
  XCircle,
  Sparkles,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Calendar
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

export default function RegulatoryMonitor({ isAdmin = false }) {
  const queryClient = useQueryClient();
  const [isScanning, setIsScanning] = useState(false);
  const [selectedUpdate, setSelectedUpdate] = useState(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [implementationNotes, setImplementationNotes] = useState("");
  const [lastScanDate, setLastScanDate] = useState(null);

  const { data: updates = [] } = useQuery({
    queryKey: ['regulatoryUpdates'],
    queryFn: () => base44.entities.RegulatoryUpdate.filter({}, '-created_date'),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  useEffect(() => {
    const cached = localStorage.getItem('last_regulatory_scan');
    if (cached) setLastScanDate(new Date(cached));
  }, []);

  const createUpdateMutation = useMutation({
    mutationFn: (data) => base44.entities.RegulatoryUpdate.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['regulatoryUpdates'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RegulatoryUpdate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regulatoryUpdates'] });
      setReviewDialogOpen(false);
      setSelectedUpdate(null);
    },
  });

  const scanForUpdates = async () => {
    setIsScanning(true);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a healthcare regulatory monitoring AI. Generate realistic recent regulatory updates that a home health/hospice agency should be aware of.

Current date: ${format(new Date(), 'yyyy-MM-dd')}

Generate 3-5 realistic regulatory updates from sources like CMS, Medicare, State health departments, OSHA, CDC. 
Include a mix of:
- Documentation requirement changes
- Quality measure updates  
- Safety/infection control updates
- Billing/coding changes
- Patient rights updates

For each update, provide detailed information about:
1. What changed
2. When it takes effect
3. How it impacts nursing practice
4. What compliance checks need updating
5. What training nurses need

Return JSON:
{
  "updates": [
    {
      "title": "update title",
      "source": "CMS" | "Medicare" | "Medicaid" | "State" | "OSHA" | "CDC" | "Joint_Commission" | "Other",
      "category": "documentation" | "oasis" | "safety" | "billing" | "quality" | "infection_control" | "patient_rights" | "hipaa" | "staffing",
      "effective_date": "YYYY-MM-DD",
      "summary": "2-3 sentence summary",
      "full_details": "detailed explanation of the change and requirements",
      "impact_level": "critical" | "high" | "medium" | "low",
      "affected_areas": ["list of affected practice areas"],
      "required_actions": ["specific actions agency must take"],
      "compliance_check_updates": [
        {
          "check_name": "name of check to update",
          "old_requirement": "what was required before",
          "new_requirement": "what is required now"
        }
      ],
      "suggested_training": ["training topics for nurses"],
      "reference_url": "example.gov/regulation-link"
    }
  ],
  "scan_summary": "brief summary of regulatory landscape"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            updates: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  source: { type: "string" },
                  category: { type: "string" },
                  effective_date: { type: "string" },
                  summary: { type: "string" },
                  full_details: { type: "string" },
                  impact_level: { type: "string" },
                  affected_areas: { type: "array", items: { type: "string" } },
                  required_actions: { type: "array", items: { type: "string" } },
                  compliance_check_updates: { type: "array" },
                  suggested_training: { type: "array", items: { type: "string" } },
                  reference_url: { type: "string" }
                }
              }
            },
            scan_summary: { type: "string" }
          }
        },
        add_context_from_internet: true
      });

      // Create regulatory updates in database
      for (const update of result.updates || []) {
        await createUpdateMutation.mutateAsync({
          ...update,
          status: 'pending_review'
        });
      }

      localStorage.setItem('last_regulatory_scan', new Date().toISOString());
      setLastScanDate(new Date());

    } catch (error) {
      console.error("Error scanning for updates:", error);
    }

    setIsScanning(false);
  };

  const handleReview = (update) => {
    setSelectedUpdate(update);
    setImplementationNotes("");
    setReviewDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedUpdate) return;

    await updateMutation.mutateAsync({
      id: selectedUpdate.id,
      data: {
        status: 'approved',
        reviewed_by: currentUser?.email,
        reviewed_at: new Date().toISOString(),
        implementation_notes: implementationNotes
      }
    });
  };

  const handleImplement = async () => {
    if (!selectedUpdate) return;

    await updateMutation.mutateAsync({
      id: selectedUpdate.id,
      data: {
        status: 'implemented',
        reviewed_by: currentUser?.email,
        reviewed_at: new Date().toISOString(),
        implementation_notes: implementationNotes
      }
    });

    // Here you would trigger actual compliance check updates and training assignments
    // For now we log it
    console.log('Implementing regulatory update:', selectedUpdate.title);
    console.log('Compliance checks to update:', selectedUpdate.compliance_check_updates);
    console.log('Training to assign:', selectedUpdate.suggested_training);
  };

  const handleDismiss = async () => {
    if (!selectedUpdate) return;

    await updateMutation.mutateAsync({
      id: selectedUpdate.id,
      data: {
        status: 'dismissed',
        reviewed_by: currentUser?.email,
        reviewed_at: new Date().toISOString(),
        implementation_notes: implementationNotes
      }
    });
  };

  const pendingUpdates = updates.filter(u => u.status === 'pending_review');
  const approvedUpdates = updates.filter(u => u.status === 'approved');
  const implementedUpdates = updates.filter(u => u.status === 'implemented');

  const getImpactColor = (level) => {
    switch (level) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending_review': return 'bg-yellow-100 text-yellow-800';
      case 'under_review': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'implemented': return 'bg-purple-100 text-purple-800';
      case 'dismissed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'documentation': return <FileText className="w-4 h-4" />;
      case 'safety': return <Shield className="w-4 h-4" />;
      case 'quality': return <CheckCircle2 className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-indigo-200">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              Regulatory Change Monitor
            </CardTitle>
            <div className="flex items-center gap-2">
              {lastScanDate && (
                <span className="text-xs text-gray-500">
                  Last scan: {format(lastScanDate, 'MMM d, h:mm a')}
                </span>
              )}
              {isAdmin && (
                <Button
                  onClick={scanForUpdates}
                  disabled={isScanning}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {isScanning ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Scan for Updates
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">{pendingUpdates.length}</p>
              <p className="text-xs text-gray-600">Pending Review</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{approvedUpdates.length}</p>
              <p className="text-xs text-gray-600">Approved</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{implementedUpdates.length}</p>
              <p className="text-xs text-gray-600">Implemented</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">
                {updates.filter(u => u.impact_level === 'critical' && u.status === 'pending_review').length}
              </p>
              <p className="text-xs text-gray-600">Critical Pending</p>
            </div>
          </div>

          {/* Pending Critical Alert */}
          {pendingUpdates.filter(u => u.impact_level === 'critical').length > 0 && (
            <Alert className="bg-red-50 border-red-200 mb-4">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-900">
                <strong>Action Required:</strong> {pendingUpdates.filter(u => u.impact_level === 'critical').length} critical regulatory update(s) require immediate review
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Updates Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto gap-1">
          <TabsTrigger value="pending" className="flex flex-col md:flex-row gap-1 py-2 px-2 text-xs md:text-sm">
            <Clock className="w-3 h-3 md:w-4 md:h-4" />
            <span>Pending ({pendingUpdates.length})</span>
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex flex-col md:flex-row gap-1 py-2 px-2 text-xs md:text-sm">
            <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4" />
            <span>Approved ({approvedUpdates.length})</span>
          </TabsTrigger>
          <TabsTrigger value="implemented" className="flex flex-col md:flex-row gap-1 py-2 px-2 text-xs md:text-sm">
            <Settings className="w-3 h-3 md:w-4 md:h-4" />
            <span>Implemented ({implementedUpdates.length})</span>
          </TabsTrigger>
          <TabsTrigger value="all" className="flex flex-col md:flex-row gap-1 py-2 px-2 text-xs md:text-sm">
            <FileText className="w-3 h-3 md:w-4 md:h-4" />
            <span>All ({updates.length})</span>
          </TabsTrigger>
        </TabsList>

        {['pending', 'approved', 'implemented', 'all'].map(tab => (
          <TabsContent key={tab} value={tab} className="space-y-3">
            {(tab === 'pending' ? pendingUpdates :
              tab === 'approved' ? approvedUpdates :
              tab === 'implemented' ? implementedUpdates :
              updates
            ).length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-300" />
                  <p className="text-gray-500">No updates in this category</p>
                </CardContent>
              </Card>
            ) : (
              (tab === 'pending' ? pendingUpdates :
                tab === 'approved' ? approvedUpdates :
                tab === 'implemented' ? implementedUpdates :
                updates
              ).map(update => (
                <RegulatoryUpdateCard
                  key={update.id}
                  update={update}
                  isAdmin={isAdmin}
                  onReview={() => handleReview(update)}
                  getImpactColor={getImpactColor}
                  getStatusColor={getStatusColor}
                  getCategoryIcon={getCategoryIcon}
                />
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              Review Regulatory Update
            </DialogTitle>
          </DialogHeader>

          {selectedUpdate && (
            <div className="space-y-4">
              {/* Update Details */}
              <div>
                <h3 className="font-semibold text-lg">{selectedUpdate.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getImpactColor(selectedUpdate.impact_level)}>
                    {selectedUpdate.impact_level}
                  </Badge>
                  <Badge variant="outline">{selectedUpdate.source}</Badge>
                  <Badge variant="outline">{selectedUpdate.category}</Badge>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-700">{selectedUpdate.summary}</p>
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Effective Date:</p>
                <p className="text-sm text-gray-700">
                  {selectedUpdate.effective_date ? format(new Date(selectedUpdate.effective_date), 'MMMM d, yyyy') : 'TBD'}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Full Details:</p>
                <p className="text-sm text-gray-700">{selectedUpdate.full_details}</p>
              </div>

              {/* Required Actions */}
              {selectedUpdate.required_actions?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">Required Actions:</p>
                  <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                    {selectedUpdate.required_actions.map((action, idx) => (
                      <li key={idx}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Compliance Check Updates */}
              {selectedUpdate.compliance_check_updates?.length > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-1">
                    <Settings className="w-4 h-4" />
                    Compliance Check Updates Required:
                  </p>
                  {selectedUpdate.compliance_check_updates.map((check, idx) => (
                    <div key={idx} className="text-xs bg-white p-2 rounded mb-1 last:mb-0">
                      <p className="font-medium text-blue-900">{check.check_name}</p>
                      <p className="text-gray-500">Old: {check.old_requirement}</p>
                      <p className="text-green-700">New: {check.new_requirement}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Suggested Training */}
              {selectedUpdate.suggested_training?.length > 0 && (
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-1">
                    <GraduationCap className="w-4 h-4" />
                    Training to Assign to Nurses:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selectedUpdate.suggested_training.map((topic, idx) => (
                      <Badge key={idx} className="bg-purple-100 text-purple-800">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Implementation Notes */}
              <div>
                <p className="text-sm font-medium mb-1">Implementation Notes:</p>
                <Textarea
                  placeholder="Add notes about how this update will be implemented..."
                  value={implementationNotes}
                  onChange={(e) => setImplementationNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDismiss}
              className="text-red-600 hover:text-red-700"
            >
              <XCircle className="w-4 h-4 mr-1" />
              Dismiss
            </Button>
            <Button 
              onClick={handleApprove}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Approve
            </Button>
            <Button 
              onClick={handleImplement}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Settings className="w-4 h-4 mr-1" />
              Implement Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RegulatoryUpdateCard({ update, isAdmin, onReview, getImpactColor, getStatusColor, getCategoryIcon }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className={`border-l-4 ${
      update.impact_level === 'critical' ? 'border-l-red-500 bg-red-50/30' :
      update.impact_level === 'high' ? 'border-l-orange-500' :
      'border-l-blue-500'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {getCategoryIcon(update.category)}
              <h4 className="font-semibold">{update.title}</h4>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className={getImpactColor(update.impact_level)}>
                {update.impact_level}
              </Badge>
              <Badge variant="outline">{update.source}</Badge>
              <Badge className={getStatusColor(update.status)}>
                {update.status.replace('_', ' ')}
              </Badge>
              {update.effective_date && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Effective: {format(new Date(update.effective_date), 'MMM d, yyyy')}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-700">{update.summary}</p>

            {expanded && (
              <div className="mt-3 space-y-2 text-sm">
                <p className="text-gray-600">{update.full_details}</p>
                {update.suggested_training?.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <GraduationCap className="w-4 h-4 text-purple-600" />
                    {update.suggested_training.map((t, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            {isAdmin && update.status === 'pending_review' && (
              <Button size="sm" onClick={onReview}>
                <Eye className="w-4 h-4 mr-1" />
                Review
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}