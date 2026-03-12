import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, AlertOctagon, Info, Activity, 
  Loader2, ChevronDown, ChevronUp, Shield
} from 'lucide-react';
import { toast } from 'sonner';

export default function DrugInteractionAlert({ medications, patientId, autoCheck = true }) {
  const [isChecking, setIsChecking] = useState(false);
  const [interactionResults, setInteractionResults] = useState(null);
  const [expandedInteractions, setExpandedInteractions] = useState({});

  useEffect(() => {
    if (autoCheck && medications && medications.length >= 2) {
      checkInteractions();
    }
  }, [medications, autoCheck]);

  const checkInteractions = async () => {
    if (!medications || medications.length < 2) {
      toast.error('Need at least 2 medications to check for interactions');
      return;
    }

    setIsChecking(true);
    try {
      const result = await base44.functions.invoke('checkDrugInteractions', {
        medications: medications
      });

      setInteractionResults(result.data);

      if (result.data.critical_count > 0) {
        toast.error(`Critical drug interactions detected!`, {
          duration: 5000
        });
      } else if (result.data.major_count > 0) {
        toast.warning(`Major drug interactions found`, {
          duration: 4000
        });
      }
    } catch (error) {
      toast.error('Failed to check drug interactions: ' + error.message);
    } finally {
      setIsChecking(false);
    }
  };

  const toggleExpanded = (index) => {
    setExpandedInteractions(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const getSeverityConfig = (severity) => {
    switch (severity) {
      case 'critical':
        return {
          icon: AlertOctagon,
          color: 'bg-red-100 text-red-900 border-red-300',
          bgCard: 'bg-red-50 border-red-300',
          textColor: 'text-red-900',
          iconColor: 'text-red-600'
        };
      case 'major':
        return {
          icon: AlertTriangle,
          color: 'bg-orange-100 text-orange-900 border-orange-300',
          bgCard: 'bg-orange-50 border-orange-300',
          textColor: 'text-orange-900',
          iconColor: 'text-orange-600'
        };
      case 'moderate':
        return {
          icon: AlertTriangle,
          color: 'bg-yellow-100 text-yellow-900 border-yellow-300',
          bgCard: 'bg-yellow-50 border-yellow-300',
          textColor: 'text-yellow-900',
          iconColor: 'text-yellow-600'
        };
      default:
        return {
          icon: Info,
          color: 'bg-blue-100 text-blue-900 border-blue-300',
          bgCard: 'bg-blue-50 border-blue-300',
          textColor: 'text-blue-900',
          iconColor: 'text-blue-600'
        };
    }
  };

  const getRiskLevelConfig = (level) => {
    switch (level) {
      case 'critical':
        return { color: 'bg-red-600', label: 'Critical Risk', icon: AlertOctagon };
      case 'high':
        return { color: 'bg-orange-600', label: 'High Risk', icon: AlertTriangle };
      case 'moderate':
        return { color: 'bg-yellow-600', label: 'Moderate Risk', icon: Activity };
      default:
        return { color: 'bg-green-600', label: 'Low Risk', icon: Shield };
    }
  };

  if (isChecking) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-3 text-blue-900">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Checking for drug interactions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!interactionResults) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Button 
            onClick={checkInteractions} 
            disabled={!medications || medications.length < 2}
            className="w-full"
          >
            <Shield className="w-4 h-4 mr-2" />
            Check for Drug Interactions
          </Button>
        </CardContent>
      </Card>
    );
  }

  const riskConfig = getRiskLevelConfig(interactionResults.overall_risk_level);
  const RiskIcon = riskConfig.icon;

  return (
    <div className="space-y-4">
      {/* Overall Risk Summary */}
      <Card className={`border-2 ${
        interactionResults.overall_risk_level === 'critical' ? 'border-red-500 bg-red-50' :
        interactionResults.overall_risk_level === 'high' ? 'border-orange-500 bg-orange-50' :
        interactionResults.overall_risk_level === 'moderate' ? 'border-yellow-500 bg-yellow-50' :
        'border-green-500 bg-green-50'
      }`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RiskIcon className={`w-5 h-5 ${
              interactionResults.overall_risk_level === 'critical' ? 'text-red-600' :
              interactionResults.overall_risk_level === 'high' ? 'text-orange-600' :
              interactionResults.overall_risk_level === 'moderate' ? 'text-yellow-600' :
              'text-green-600'
            }`} />
            Drug Interaction Safety Check
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge className={`${riskConfig.color} text-white px-3 py-1 text-sm`}>
              {riskConfig.label}
            </Badge>
            <div className="text-sm text-gray-700">
              {interactionResults.total_interactions} interaction{interactionResults.total_interactions !== 1 ? 's' : ''} found
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white rounded-lg p-3 border border-red-200">
              <p className="text-2xl font-bold text-red-600">{interactionResults.critical_count}</p>
              <p className="text-xs text-gray-600">Critical</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-orange-200">
              <p className="text-2xl font-bold text-orange-600">{interactionResults.major_count}</p>
              <p className="text-xs text-gray-600">Major</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-2xl font-bold text-gray-600">{interactionResults.medications_analyzed}</p>
              <p className="text-xs text-gray-600">Meds Checked</p>
            </div>
          </div>

          <Alert className="bg-white border-gray-300">
            <Info className="w-4 h-4" />
            <AlertDescription>
              <strong>Summary:</strong> {interactionResults.summary}
            </AlertDescription>
          </Alert>

          {interactionResults.immediate_actions?.length > 0 && (
            <Alert className="bg-red-100 border-red-300">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription>
                <strong className="text-red-900">Immediate Actions Required:</strong>
                <ul className="mt-2 space-y-1 text-sm text-red-900">
                  {interactionResults.immediate_actions.map((action, idx) => (
                    <li key={idx}>• {action}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Detailed Interactions */}
      {interactionResults.interactions?.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Detailed Interactions</h3>
          {interactionResults.interactions.map((interaction, idx) => {
            const config = getSeverityConfig(interaction.severity);
            const Icon = config.icon;
            const isExpanded = expandedInteractions[idx];

            return (
              <Card key={idx} className={`${config.bgCard} border-2`}>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={`w-4 h-4 ${config.iconColor}`} />
                          <Badge className={config.color}>
                            {interaction.severity.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">
                            {interaction.interaction_type.replace(/_/g, ' ')}
                          </Badge>
                          {interaction.requires_intervention && (
                            <Badge className="bg-purple-100 text-purple-800 border-purple-300">
                              Intervention Required
                            </Badge>
                          )}
                        </div>
                        <h4 className={`font-semibold ${config.textColor} mb-1`}>
                          {interaction.drug_a} ↔️ {interaction.drug_b}
                        </h4>
                        <p className="text-sm text-gray-700">{interaction.description}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleExpanded(idx)}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>

                    {isExpanded && (
                      <div className="space-y-3 pt-3 border-t border-gray-300">
                        <div className="bg-white rounded-lg p-3 border">
                          <p className="text-xs font-semibold text-gray-600 mb-1">Clinical Significance</p>
                          <p className="text-sm text-gray-900">{interaction.clinical_significance}</p>
                        </div>

                        <div className="bg-white rounded-lg p-3 border">
                          <p className="text-xs font-semibold text-gray-600 mb-1">Recommendation</p>
                          <p className="text-sm text-gray-900">{interaction.recommendation}</p>
                        </div>

                        {interaction.monitoring_required && (
                          <Alert className="bg-blue-50 border-blue-300">
                            <Activity className="w-4 h-4 text-blue-600" />
                            <AlertDescription className="text-blue-900 text-sm">
                              <strong>Monitoring Required:</strong> Close clinical monitoring needed for this drug combination.
                            </AlertDescription>
                          </Alert>
                        )}

                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Source: {interaction.source}</span>
                          {interaction.verified && (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              Verified
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={checkInteractions}>
          <Activity className="w-4 h-4 mr-2" />
          Re-check Interactions
        </Button>
      </div>
    </div>
  );
}