import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Award, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Download,
  Calendar,
  TrendingUp
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";

export default function CertificationTracker({ nurseEmail, isAdminView = false }) {
  const { data: completions = [] } = useQuery({
    queryKey: ['certifications', nurseEmail],
    queryFn: () => base44.entities.TrainingCompletion.filter(
      isAdminView ? {} : { nurse_email: nurseEmail },
      '-completion_date'
    ),
    initialData: [],
  });

  const { data: trainingModules = [] } = useQuery({
    queryKey: ['trainingModules'],
    queryFn: () => base44.entities.TrainingModule.list(),
    initialData: [],
  });

  const { data: nurseSkills = [] } = useQuery({
    queryKey: ['nurseSkills', nurseEmail],
    queryFn: () => base44.entities.NurseSkill.filter({ nurse_email: nurseEmail }),
    initialData: [],
  });

  const certifiedCompletions = completions.filter(c => 
    c.status === 'completed' && c.score >= 80 && c.certificate_url
  );

  const expiringCerts = certifiedCompletions.filter(c => {
    if (!c.expiration_date) return false;
    const daysUntilExpiration = differenceInDays(parseISO(c.expiration_date), new Date());
    return daysUntilExpiration <= 30 && daysUntilExpiration >= 0;
  });

  const expiredCerts = certifiedCompletions.filter(c => {
    if (!c.expiration_date) return false;
    return differenceInDays(parseISO(c.expiration_date), new Date()) < 0;
  });

  const getModuleName = (moduleId) => {
    const module = trainingModules.find(m => m.id === moduleId);
    return module?.title || 'Unknown Module';
  };

  const downloadCertificate = async (completion) => {
    if (!completion.certificate_url) return;
    window.open(completion.certificate_url, '_blank');
  };

  const calculateCompletionRate = () => {
    const requiredModules = trainingModules.filter(m => m.is_required);
    if (requiredModules.length === 0) return 100;
    const completed = completions.filter(c => 
      c.status === 'completed' && 
      requiredModules.some(m => m.id === c.training_module_id)
    ).length;
    return Math.round((completed / requiredModules.length) * 100);
  };

  const completionRate = calculateCompletionRate();

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Certifications</p>
                <p className="text-2xl font-bold">{certifiedCompletions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Completion Rate</p>
                <p className="text-2xl font-bold">{completionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Expiring Soon</p>
                <p className="text-2xl font-bold">{expiringCerts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Expired</p>
                <p className="text-2xl font-bold">{expiredCerts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Completion Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Required Training Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Progress value={completionRate} className="h-2" />
            <p className="text-sm text-slate-600">
              {completionRate}% of required training completed
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Expiring Certifications Alert */}
      {expiringCerts.length > 0 && (
        <Alert className="bg-orange-50 border-orange-300">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          <AlertDescription>
            <p className="font-semibold mb-2">Certifications Expiring Soon</p>
            <div className="space-y-1">
              {expiringCerts.map((cert, idx) => {
                const daysLeft = differenceInDays(parseISO(cert.expiration_date), new Date());
                return (
                  <p key={idx} className="text-sm">
                    • {getModuleName(cert.training_module_id)} - Expires in {daysLeft} days
                  </p>
                );
              })}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Expired Certifications Alert */}
      {expiredCerts.length > 0 && (
        <Alert className="bg-red-50 border-red-300">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription>
            <p className="font-semibold mb-2">Expired Certifications - Action Required</p>
            <div className="space-y-1">
              {expiredCerts.map((cert, idx) => (
                <p key={idx} className="text-sm">
                  • {getModuleName(cert.training_module_id)} - Expired {format(parseISO(cert.expiration_date), 'MMM d, yyyy')}
                </p>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Active Certifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-green-600" />
            Active Certifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {certifiedCompletions.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No certifications yet</p>
          ) : (
            <div className="space-y-3">
              {certifiedCompletions.map((cert) => (
                <Card key={cert.id} className="border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-slate-900">
                            {getModuleName(cert.training_module_id)}
                          </h4>
                          <Badge className="bg-green-600">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Certified
                          </Badge>
                          {cert.score && (
                            <Badge variant="outline">{cert.score}%</Badge>
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-slate-600">
                          <p className="flex items-center gap-2">
                            <Calendar className="w-3 h-3" />
                            Completed: {format(parseISO(cert.completion_date), 'MMM d, yyyy')}
                          </p>
                          {cert.expiration_date && (
                            <p className="flex items-center gap-2">
                              <Clock className="w-3 h-3" />
                              Expires: {format(parseISO(cert.expiration_date), 'MMM d, yyyy')}
                            </p>
                          )}
                        </div>
                      </div>
                      {cert.certificate_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadCertificate(cert)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Certificate
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Skills Summary */}
      {nurseSkills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Verified Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {nurseSkills.map((skill) => (
                <Badge key={skill.id} variant="outline" className="text-sm">
                  {skill.skill_name} - {skill.proficiency_level}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}