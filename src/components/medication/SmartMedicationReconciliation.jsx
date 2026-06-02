import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Pill,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Shield,
  TrendingUp,
  FileText,
  Brain
} from 'lucide-react';
import { toast } from 'sonner';

export default function SmartMedicationReconciliation({ patient }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);

  const { data: currentMedications = [] } = useQuery({
    queryKey: ['patient-medications', patient?.id],
    queryFn: () => base44.entities.Medication.filter({ patient_id: patient?.id }),
    enabled: !!patient?.id,
    initialData: [],
  });

  const analyzeMedications = async () => {
    if (!patient || currentMedications.length === 0) {
      toast.error('No medications found to analyze');
      return;
    }

    setAnalyzing(true);
    try {
      const response = await base44.functions.invoke('analyzeMedicationReconciliation', {
        patient_id: patient.id,
        medications: currentMedications,
        patient_conditions: [
          patient.primary_diagnosis,
          ...(patient.secondary_diagnoses || [])
        ],
        patient_age: calculateAge(patient.date_of_birth),
        allergies: patient.allergies
      });

      setAnalysisResults(response.data);
      toast.success('Medication analysis complete');
    } catch (error) {
      console.error('Error analyzing medications:', error);
      toast.error('Failed to analyze medications');
    } finally {
      setAnalyzing(false);
    }
  };

  const calculateAge = (dob) => {
    if (!dob) return null;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'moderate': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-slate-500';
    }
  };

  const getRiskIcon = (severity) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-5 h-5" />;
      case 'high': return <AlertTriangle className="w-5 h-5" />;
      case 'moderate': return <AlertTriangle className="w-5 h-5" />;
      default: return <Shield className="w-5 h-5" />;
    }
  };

  if (!patient) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-slate-500">
          <Pill className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>Select a patient to view medication reconciliation</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Smart Medication Reconciliation</CardTitle>
                <p className="text-sm text-slate-500">
                  AI-powered analysis with drug interactions & guidelines
                </p>
              </div>
            </div>
            <Button
              onClick={analyzeMedications}
              disabled={analyzing || currentMedications.length === 0}
              className="bg-gradient-to-r from-purple-600 to-indigo-600"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Analyze Medications
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total Medications</p>
                  <p className="text-2xl font-bold text-blue-900">{currentMedications.length}</p>
                </div>
                <Pill className="w-8 h-8 text-blue-400" />
              </div>
            </div>

            {analysisResults && (
              <>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-600 font-medium">Critical Issues</p>
                      <p className="text-2xl font-bold text-red-900">
                        {analysisResults.interactions?.filter(i => i.severity === 'critical').length || 0}
                      </p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">Guideline Compliant</p>
                      <p className="text-2xl font-bold text-green-900">
                        {analysisResults.guidelines_compliance?.compliant_count || 0}
                      </p>
                    </div>
                    <CheckCircle2 className="w-8 h-8 text-green-400" />
                  </div>
                </div>
              </>
            )}
          </div>

          {!analysisResults && !analyzing && (
            <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
              <Pill className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                Ready to Analyze
              </h3>
              <p className="text-slate-500 mb-4">
                Click "Analyze Medications" to check for drug interactions and guideline compliance
              </p>
            </div>
          )}

          {analysisResults && (
            <Tabs defaultValue="interactions" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="interactions" className="text-xs sm:text-sm">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Interactions
                  {analysisResults.interactions?.length > 0 && (
                    <Badge className="ml-2 bg-red-500">{analysisResults.interactions.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="guidelines" className="text-xs sm:text-sm">
                  <FileText className="w-4 h-4 mr-1" />
                  Guidelines
                </TabsTrigger>
                <TabsTrigger value="risks" className="text-xs sm:text-sm">
                  <Shield className="w-4 h-4 mr-1" />
                  Age/Condition
                </TabsTrigger>
                <TabsTrigger value="recommendations" className="text-xs sm:text-sm">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Actions
                </TabsTrigger>
              </TabsList>

              <TabsContent value="interactions" className="space-y-3 mt-4">
                {analysisResults.interactions?.length === 0 ? (
                  <div className="text-center py-8 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
                    <p className="text-green-700 font-medium">No drug interactions detected</p>
                  </div>
                ) : (
                  analysisResults.interactions?.map((interaction, idx) => (
                    <Card key={idx} className={`border-l-4 ${interaction.severity === 'critical' ? 'border-l-red-500' : interaction.severity === 'high' ? 'border-l-orange-500' : 'border-l-yellow-500'}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${interaction.severity === 'critical' ? 'bg-red-100' : interaction.severity === 'high' ? 'bg-orange-100' : 'bg-yellow-100'}`}>
                            {getRiskIcon(interaction.severity)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-slate-900">
                                {interaction.drug1} + {interaction.drug2}
                              </h4>
                              <Badge className={getSeverityColor(interaction.severity)}>
                                {interaction.severity.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-700 mb-2">{interaction.description}</p>
                            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mt-2">
                              <p className="text-xs font-semibold text-amber-900 mb-1">Clinical Action:</p>
                              <p className="text-sm text-amber-800">{interaction.recommendation}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="guidelines" className="space-y-3 mt-4">
                {analysisResults.guidelines_issues?.length === 0 ? (
                  <div className="text-center py-8 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
                    <p className="text-green-700 font-medium">All medications are guideline-compliant</p>
                  </div>
                ) : (
                  analysisResults.guidelines_issues?.map((issue, idx) => (
                    <Card key={idx} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-blue-100">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900 mb-1">{issue.medication}</h4>
                            <p className="text-sm text-slate-700 mb-2">{issue.issue}</p>
                            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                              <p className="text-xs font-semibold text-blue-900 mb-1">Guideline:</p>
                              <p className="text-sm text-blue-800">{issue.guideline}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="risks" className="space-y-3 mt-4">
                {analysisResults.age_condition_risks?.length === 0 ? (
                  <div className="text-center py-8 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
                    <p className="text-green-700 font-medium">No age or condition-specific risks detected</p>
                  </div>
                ) : (
                  analysisResults.age_condition_risks?.map((risk, idx) => (
                    <Card key={idx} className="border-l-4 border-l-purple-500">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-purple-100">
                            <Shield className="w-5 h-5 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-slate-900">{risk.medication}</h4>
                              <Badge className={getSeverityColor(risk.severity)}>
                                {risk.risk_type}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-700 mb-2">{risk.description}</p>
                            <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
                              <p className="text-xs font-semibold text-purple-900 mb-1">Recommendation:</p>
                              <p className="text-sm text-purple-800">{risk.recommendation}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="recommendations" className="space-y-3 mt-4">
                <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-indigo-600" />
                      Clinical Actions Required
                    </h3>
                    <div className="space-y-3">
                      {analysisResults.action_items?.map((action, idx) => (
                        <div key={idx} className="flex items-start gap-3 bg-white rounded-lg p-3 border border-indigo-200">
                          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900 mb-1">{action.title}</p>
                            <p className="text-sm text-slate-600">{action.description}</p>
                            {action.priority === 'urgent' && (
                              <Badge className="bg-red-500 mt-2">URGENT - Contact Physician</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-slate-900 mb-3">Documentation Notes</h4>
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <p className="text-sm text-slate-700 whitespace-pre-line">
                        {analysisResults.documentation_summary}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}