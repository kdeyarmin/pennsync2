import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { exportToPDF } from "../utils/pdfExporter";
import { format } from "date-fns";

export default function PatientOutcomesReport({ dateRange }) {
  const { data: patients = [] } = useQuery({
    queryKey: ['allPatients'],
    queryFn: () => base44.entities.Patient.list(),
    initialData: [],
  });

  const _filteredPatients = patients.filter(p => {
    const admissionDate = new Date(p.admission_date);
    return admissionDate >= new Date(dateRange.start) && admissionDate <= new Date(dateRange.end + 'T23:59:59.999');
  });

  const activePatients = patients.filter(p => p.status === 'active').length;
  const dischargedPatients = patients.filter(p => p.status === 'discharged').length;
  
  const dispositionData = [
    { name: 'Home', value: patients.filter(p => p.discharge_disposition === 'home').length },
    { name: 'Hospital', value: patients.filter(p => p.discharge_disposition === 'hospital').length },
    { name: 'SNF', value: patients.filter(p => p.discharge_disposition === 'skilled_nursing_facility').length },
    { name: 'Other', value: patients.filter(p => p.discharge_disposition === 'other').length }
  ];

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#6b7280'];

  const handleExport = () => {
    exportToPDF({
      filename: `patient-outcomes-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`,
      title: 'Patient Outcomes Report',
      subtitle: `Period: ${format(new Date(dateRange.start), 'MMM d, yyyy')} - ${format(new Date(dateRange.end + 'T23:59:59.999'), 'MMM d, yyyy')}`,
      content: [
        { type: 'heading', text: 'Outcome Summary' },
        { type: 'text', text: `Total Patients: ${patients.length}` },
        { type: 'text', text: `Active: ${activePatients}` },
        { type: 'text', text: `Discharged: ${dischargedPatients}` }
      ]
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-slate-900">Patient Outcomes Analysis</h3>
        <Button onClick={handleExport} className="bg-green-600 hover:bg-green-700">
          <Download className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600 mb-1">Total Patients</p>
            <p className="text-3xl font-bold text-slate-900">{patients.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600 mb-1">Active</p>
            <p className="text-3xl font-bold text-green-600">{activePatients}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600 mb-1">Discharged</p>
            <p className="text-3xl font-bold text-blue-600">{dischargedPatients}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Discharge Disposition</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={dispositionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={entry => `${entry.name}: ${entry.value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {dispositionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}