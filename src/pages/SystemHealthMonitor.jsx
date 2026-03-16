import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, Activity } from "lucide-react";
import { testAutomations } from "@/functions/testAutomations";
import SystemHealthPanel from "@/components/admin/SystemHealthPanel";

export default function SystemHealthMonitor() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: automationTest, isLoading, refetch } = useQuery({
    queryKey: ['automation-health'],
    queryFn: async () => {
      const response = await testAutomations({});
      return response.data;
    },
    enabled: currentUser?.role === 'admin',
    refetchOnMount: false,
    staleTime: 300000, // 5 minutes
  });

  if (currentUser?.role !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">This page is only accessible to administrators.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <SystemHealthPanel />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Health Monitor</h1>
          <p className="text-gray-500">Test automations and monitor system functions</p>
        </div>
        <Button onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Test All Functions
        </Button>
      </div>

      {automationTest && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{automationTest.summary.total_tests}</div>
              </CardContent>
            </Card>

            <Card className="border-green-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Successful</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{automationTest.summary.successful}</div>
              </CardContent>
            </Card>

            <Card className={automationTest.summary.failed > 0 ? "border-red-300" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Failed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{automationTest.summary.failed}</div>
              </CardContent>
            </Card>
          </div>

          {automationTest.summary.failed > 0 && (
            <Alert className="border-red-300 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {automationTest.summary.failed} automation function(s) failed. Review details below.
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Function Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {automationTest.details.map((test, index) => (
                  <div key={index} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      {test.status === 'success' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{test.function}</p>
                        {test.error && (
                          <p className="text-xs text-red-600 mt-1">{test.error}</p>
                        )}
                        {test.result && (
                          <p className="text-xs text-gray-500 mt-1">
                            {JSON.stringify(test.result).substring(0, 200)}...
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant={test.status === 'success' ? 'outline' : 'destructive'}>
                      {test.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!automationTest && !isLoading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Click "Test All Functions" to run system health checks</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}