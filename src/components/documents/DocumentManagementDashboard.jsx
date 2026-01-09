import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  XCircle,
  AlertTriangle,
  Search,
  Eye,
  Package
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

export default function DocumentManagementDashboard() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: documentSignatures = [], isLoading: docsLoading } = useQuery({
    queryKey: ['document-signatures-dashboard'],
    queryFn: () => base44.entities.DocumentSignature.list('-created_date', 200),
    initialData: []
  });

  const { data: documentPackages = [], isLoading: packagesLoading } = useQuery({
    queryKey: ['document-packages'],
    queryFn: () => base44.entities.DocumentPackage.list('-created_date', 100),
    initialData: []
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients-list'],
    queryFn: () => base44.entities.Patient.list('-created_date', 500),
    initialData: []
  });

  // Calculate statistics
  const stats = useMemo(() => {
    const pending = documentSignatures.filter(d => d.status === 'pending').length;
    const signed = documentSignatures.filter(d => d.status === 'signed').length;
    const declined = documentSignatures.filter(d => d.status === 'declined').length;
    const overdue = documentSignatures.filter(d => 
      d.status === 'pending' && d.due_date && new Date(d.due_date) < new Date()
    ).length;

    return { pending, signed, declined, overdue, total: documentSignatures.length };
  }, [documentSignatures]);

  // Group documents by patient
  const documentsByPatient = useMemo(() => {
    const grouped = {};
    
    documentSignatures.forEach(doc => {
      if (!grouped[doc.patient_id]) {
        const patient = patients.find(p => p.id === doc.patient_id);
        grouped[doc.patient_id] = {
          patient_id: doc.patient_id,
          patient_name: patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient',
          documents: []
        };
      }
      grouped[doc.patient_id].documents.push(doc);
    });

    return Object.values(grouped);
  }, [documentSignatures, patients]);

  // Filter documents
  const filteredGroups = useMemo(() => {
    let groups = documentsByPatient;

    // Filter by status
    if (statusFilter !== 'all') {
      groups = groups.map(group => ({
        ...group,
        documents: group.documents.filter(d => d.status === statusFilter)
      })).filter(group => group.documents.length > 0);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      groups = groups.filter(group =>
        group.patient_name.toLowerCase().includes(query) ||
        group.documents.some(d => 
          d.document_name.toLowerCase().includes(query) ||
          d.document_type.toLowerCase().includes(query)
        )
      );
    }

    return groups;
  }, [documentsByPatient, statusFilter, searchQuery]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'signed': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'declined': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      signed: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      declined: "bg-red-100 text-red-800"
    };
    return <Badge className={styles[status] || ""}>{status}</Badge>;
  };

  const isOverdue = (doc) => {
    return doc.status === 'pending' && doc.due_date && new Date(doc.due_date) < new Date();
  };

  if (docsLoading || packagesLoading) {
    return <div className="text-center py-8">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Documents</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Signed</p>
                <p className="text-2xl font-bold text-green-600">{stats.signed}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Packages</p>
                <p className="text-2xl font-bold text-blue-600">{documentPackages.length}</p>
              </div>
              <Package className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by patient or document..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="signed">Signed</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents by Patient */}
      <div className="space-y-4">
        {filteredGroups.map((group) => (
          <Card key={group.patient_id}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <Link 
                  to={createPageUrl(`PatientDetails?id=${group.patient_id}`)}
                  className="hover:text-blue-600 transition-colors"
                >
                  {group.patient_name}
                </Link>
                <Badge variant="outline">{group.documents.length} document(s)</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {group.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                  >
                    {getStatusIcon(doc.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">{doc.document_name}</h4>
                        {getStatusBadge(doc.status)}
                        {isOverdue(doc) && (
                          <Badge className="bg-red-100 text-red-700">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Overdue
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        Type: {doc.document_type} 
                        {doc.due_date && ` • Due: ${new Date(doc.due_date).toLocaleDateString()}`}
                        {doc.signed_at && ` • Signed: ${new Date(doc.signed_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    {doc.signed_pdf_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(doc.signed_pdf_url, '_blank')}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredGroups.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No documents found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}