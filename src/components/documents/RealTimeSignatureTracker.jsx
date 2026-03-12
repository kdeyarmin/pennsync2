import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  Clock,
  TrendingUp
} from "lucide-react";

export default function RealTimeSignatureTracker({ patientId }) {
  const { data: signatures = [] } = useQuery({
    queryKey: ['patient-signatures', patientId],
    queryFn: () => base44.entities.DocumentSignature.filter({ patient_id: patientId }),
    initialData: [],
    refetchInterval: 5000, // Real-time updates every 5 seconds
    enabled: !!patientId
  });

  const stats = {
    total: signatures.length,
    signed: signatures.filter(s => s.status === 'signed').length,
    pending: signatures.filter(s => s.status === 'pending').length,
    overdue: signatures.filter(s => 
      s.status === 'pending' && s.due_date && new Date(s.due_date) < new Date()
    ).length
  };

  const completionRate = stats.total > 0 ? (stats.signed / stats.total) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Signature Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Completion Rate</span>
            <span className="text-sm font-bold text-gray-900">{completionRate.toFixed(0)}%</span>
          </div>
          <Progress value={completionRate} className="h-2" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-600">Total</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.signed}</p>
            <p className="text-xs text-gray-600">Signed</p>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <p className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-xs text-gray-600">Pending</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <p className="text-xl sm:text-2xl font-bold text-red-600">{stats.overdue}</p>
            <p className="text-xs text-gray-600">Overdue</p>
          </div>
        </div>

        {/* Recent Signatures */}
        {signatures.length > 0 && (
          <div className="space-y-2 mt-4">
            <p className="text-sm font-medium text-gray-700">Recent Activity</p>
            {signatures.slice(0, 3).map(sig => (
              <div key={sig.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {sig.status === 'signed' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-yellow-600 shrink-0" />
                  )}
                  <span className="text-sm truncate">{sig.document_name}</span>
                </div>
                <Badge 
                  className={
                    sig.status === 'signed' 
                      ? "bg-green-100 text-green-800" 
                      : sig.due_date && new Date(sig.due_date) < new Date()
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                  }
                >
                  {sig.status === 'signed' ? 'Signed' : 
                   sig.due_date && new Date(sig.due_date) < new Date() ? 'Overdue' : 'Pending'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}