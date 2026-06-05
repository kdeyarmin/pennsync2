import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toCsvRows } from "@/components/admin/csvExport";

export default function CredentialComplianceReport() {
  const { data: users = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list('-created_date', 500),
    initialData: [],
  });

  const { data: credentials = [] } = useQuery({
    queryKey: ['all-credentials'],
    queryFn: () => base44.entities.PersonnelCredential.list('-expiration_date', 1000),
    initialData: [],
  });

  const complianceData = useMemo(() => {
    const now = new Date();
    const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysOut = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysOut = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const staffStatus = users.map(user => {
      const userCreds = credentials.filter(c => c.user_id === user.email);
      
      const expired = userCreds.filter(c => new Date(c.expiration_date) < now);
      const expiring30 = userCreds.filter(c => {
        const exp = new Date(c.expiration_date);
        return exp >= now && exp <= thirtyDaysOut;
      });
      const expiring60 = userCreds.filter(c => {
        const exp = new Date(c.expiration_date);
        return exp > thirtyDaysOut && exp <= sixtyDaysOut;
      });
      const expiring90 = userCreds.filter(c => {
        const exp = new Date(c.expiration_date);
        return exp > sixtyDaysOut && exp <= ninetyDaysOut;
      });

      return {
        email: user.email,
        name: user.full_name,
        total_credentials: userCreds.length,
        expired_count: expired.length,
        expiring_30: expiring30.length,
        expiring_60: expiring60.length,
        expiring_90: expiring90.length,
        expired_items: expired,
        expiring_soon: expiring30,
        status: expired.length > 0 ? 'expired' : expiring30.length > 0 ? 'critical' : expiring60.length > 0 ? 'warning' : 'good'
      };
    });

    return {
      staff: staffStatus,
      no_credentials: staffStatus.filter(s => s.total_credentials === 0),
      expired: staffStatus.filter(s => s.expired_count > 0),
      expiring_30: staffStatus.filter(s => s.expiring_30 > 0),
      expiring_60: staffStatus.filter(s => s.expiring_60 > 0),
      expiring_90: staffStatus.filter(s => s.expiring_90 > 0),
    };
  }, [users, credentials]);

  const downloadCSV = () => {
    const headers = ['Employee', 'Email', 'Total Credentials', 'Expired', 'Expiring 30 Days', 'Expiring 60 Days', 'Expiring 90 Days', 'Status'];
    const rows = complianceData.staff.map(s => [
      s.name,
      s.email,
      s.total_credentials,
      s.expired_count,
      s.expiring_30,
      s.expiring_60,
      s.expiring_90,
      s.status
    ]);

    const csv = toCsvRows([headers, ...rows]);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credential-compliance-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Credential Compliance Status</h3>
          <p className="text-sm text-slate-500">Track expiring licenses, certifications, and insurance</p>
        </div>
        <Button onClick={downloadCSV} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className={complianceData.no_credentials.length > 0 ? "border-red-300" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">No Credentials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{complianceData.no_credentials.length}</div>
            <p className="text-xs text-slate-500">Need upload</p>
          </CardContent>
        </Card>

        <Card className={complianceData.expired.length > 0 ? "border-red-300" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{complianceData.expired.length}</div>
            <p className="text-xs text-slate-500">Immediate action</p>
          </CardContent>
        </Card>

        <Card className={complianceData.expiring_30.length > 0 ? "border-amber-300" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Expiring (30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{complianceData.expiring_30.length}</div>
            <p className="text-xs text-slate-500">Critical</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Expiring (60-90 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {complianceData.expiring_60.length + complianceData.expiring_90.length}
            </div>
            <p className="text-xs text-slate-500">Plan ahead</p>
          </CardContent>
        </Card>
      </div>

      {complianceData.expired.length > 0 && (
        <Alert className="border-red-300 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>{complianceData.expired.length} employees have expired credentials.</strong> Immediate action required.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Staff Credential Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {complianceData.staff
              .filter(s => s.status !== 'good' || s.total_credentials === 0)
              .map(staff => (
                <div key={staff.email} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{staff.name}</p>
                    <p className="text-xs text-slate-500">{staff.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {staff.total_credentials === 0 && (
                      <Badge variant="destructive">No Credentials</Badge>
                    )}
                    {staff.expired_count > 0 && (
                      <Badge variant="destructive">{staff.expired_count} Expired</Badge>
                    )}
                    {staff.expiring_30 > 0 && (
                      <Badge className="bg-amber-100 text-amber-800">{staff.expiring_30} Expiring Soon</Badge>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}