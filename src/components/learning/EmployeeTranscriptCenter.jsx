import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Printer, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function EmployeeTranscriptCenter() {
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [certificateSelection, setCertificateSelection] = useState({});

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list('full_name', 500),
    initialData: []
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['employee-certificates', selectedEmployee],
    queryFn: () => selectedEmployee
      ? base44.entities.TrainingCertificate.filter({ user_id: selectedEmployee, revoked: false }, '-issued_at')
      : [],
    initialData: [],
    enabled: !!selectedEmployee
  });

  const sortedCertificates = [...certificates].sort((a, b) => {
    const dateA = new Date(a.issued_at);
    const dateB = new Date(b.issued_at);
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  const employee = employees.find(e => e.email === selectedEmployee);

  const handleGenerateTranscriptPDF = async () => {
    if (!selectedEmployee) return;
    try {
      const response = await base44.functions.invoke('generateLearningTranscriptPDF', {
        employeeId: selectedEmployee,
        businessLine: employee?.business_line || 'all'
      });
      // Download logic
      window.open(response.data.url, '_blank');
    } catch (error) {
      console.error('Failed to generate transcript:', error);
    }
  };

  const handleGenerateCertificatePacket = async () => {
    if (!selectedEmployee) return;
    const certIds = Object.keys(certificateSelection).filter(k => certificateSelection[k]);
    try {
      const response = await base44.functions.invoke('generateAndCacheCertificatePacket', {
        employeeId: selectedEmployee,
        certificateIds: certIds.length > 0 ? certIds : undefined
      });
      
      if (response.download_url) {
        // Download the PDF
        const link = document.createElement('a');
        link.href = response.download_url;
        link.download = `certificate_packet_${selectedEmployee}_${new Date().getTime()}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Failed to generate certificate packet:', error);
    }
  };

  const toggleCertificateSelection = (certId) => {
    setCertificateSelection(prev => ({
      ...prev,
      [certId]: !prev[certId]
    }));
  };

  const selectedCount = Object.values(certificateSelection).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Employee Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Employee</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger>
              <SelectValue placeholder="Search and select employee..." />
            </SelectTrigger>
            <SelectContent>
              {employees.map(emp => (
                <SelectItem key={emp.email} value={emp.email}>
                  {emp.full_name} ({emp.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedEmployee && employee && (
        <>
          {/* Transcript Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Transcript</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {employee.full_name} • {employee.business_line}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateTranscriptPDF}
                  className="gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Print PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {certificates.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No certificates found for this employee</p>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex gap-2 items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
                    >
                      Sort: {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
                    </Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Completion Date</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Learning Plan</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Certificate Code</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedCertificates.map(cert => (
                        <TableRow key={cert.id}>
                          <TableCell>{new Date(cert.issued_at).toLocaleDateString()}</TableCell>
                          <TableCell>{cert.course_title}</TableCell>
                          <TableCell>-</TableCell>
                          <TableCell>{cert.score}%</TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800">Completed</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{cert.certificate_id}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>

          {/* Certificates Packet Section */}
          {certificates.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Certificate Packet ({selectedCount} selected)</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {certificates.length} total certificates available • Cached for 24 hours
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateCertificatePacket}
                    disabled={selectedCount === 0}
                    className="gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Print Selected
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleGenerateCertificatePacket}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sortedCertificates.map(cert => (
                    <div
                      key={cert.id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={certificateSelection[cert.id] || false}
                        onChange={() => toggleCertificateSelection(cert.id)}
                        className="rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{cert.course_title}</p>
                        <p className="text-sm text-gray-600">
                          Issued {new Date(cert.issued_at).toLocaleDateString()}
                          {cert.expiration_date && ` • Expires ${new Date(cert.expiration_date).toLocaleDateString()}`}
                        </p>
                      </div>
                      <Badge variant="outline">{cert.certificate_id}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}