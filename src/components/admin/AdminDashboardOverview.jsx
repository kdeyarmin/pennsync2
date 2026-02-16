import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, FileText, PenTool, Settings, ArrowRight, Loader2, AlertCircle, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import ComprehensiveFaxDashboard from "../fax/ComprehensiveFaxDashboard";

const StatCard = ({ icon: Icon, label, value, trend }) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {trend && <p className="text-xs text-green-600 mt-1">↑ {trend}</p>}
        </div>
        <div className="p-3 bg-blue-100 rounded-lg">
          <Icon className="w-6 h-6 text-blue-600" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function AdminDashboardOverview() {
  const [showFaxDashboard, setShowFaxDashboard] = useState(false);

  // Fetch user count
  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.entities.User.list('-created_date', 1000),
    initialData: [],
  });

  // Fetch recent documents
  const { data: recentDocuments = [] } = useQuery({
    queryKey: ['admin-documents'],
    queryFn: () => base44.entities.DocumentSignature.list('-created_date', 10),
    initialData: [],
  });

  // Fetch pending signatures
  const { data: pendingSignatures = [] } = useQuery({
    queryKey: ['admin-pending-sigs'],
    queryFn: () => base44.entities.DocumentSignature.filter({ status: 'pending' }, '-created_date', 50),
    initialData: [],
  });

  // Fetch in-progress signatures
  const { data: inProgressSignatures = [] } = useQuery({
    queryKey: ['admin-inprogress-sigs'],
    queryFn: () => base44.entities.DocumentSignature.filter({ status: 'in_progress' }, '-created_date', 50),
    initialData: [],
  });

  const totalUsers = users.length;
  const pendingRequests = pendingSignatures.length + inProgressSignatures.length;
  const this30Days = users.filter(u => {
    const createdDate = new Date(u.created_date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return createdDate >= thirtyDaysAgo;
  }).length;

  const adminQuickLinks = [
    {
      title: "User Setup",
      description: "Create and manage user accounts",
      icon: Users,
      page: "AdminUserSetup",
      color: "blue"
    },
    {
      title: "User Management",
      description: "View and manage all users",
      icon: Settings,
      page: "UserManagement",
      color: "purple"
    },
    {
      title: "Document Templates",
      description: "Manage document templates",
      icon: FileText,
      page: "DocumentManagement",
      color: "green"
    },
    {
      title: "E-Signatures",
      description: "Monitor signature requests",
      icon: PenTool,
      page: "DocumentSignatures",
      color: "orange"
    }
  ];

  const colorMap = {
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
    green: "bg-green-100 text-green-600",
    orange: "bg-orange-100 text-orange-600"
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">System overview and administrative controls</p>
        </div>
        <Button
          onClick={() => setShowFaxDashboard(!showFaxDashboard)}
          variant={showFaxDashboard ? "default" : "outline"}
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          {showFaxDashboard ? "Hide" : "View"} Fax Analytics
        </Button>
      </div>

      {/* Fax Analytics Dashboard */}
      {showFaxDashboard && (
        <div className="border-t pt-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Fax Analytics Dashboard</h2>
          <ComprehensiveFaxDashboard />
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid md:grid-cols-3 gap-4">
        <StatCard
          icon={Users}
          label="Total Users"
          value={totalUsers}
          trend={`${this30Days} new this month`}
        />
        <StatCard
          icon={FileText}
          label="Recent Documents"
          value={recentDocuments.length}
          trend="Last 10 documents"
        />
        <StatCard
          icon={PenTool}
          label="Pending Signatures"
          value={pendingRequests}
          trend={`${pendingSignatures.length} pending, ${inProgressSignatures.length} in progress`}
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Quick Admin Links
          </CardTitle>
          <CardDescription>Fast access to key administrative functions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {adminQuickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.page}
                  to={createPageUrl(link.page)}
                  className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${colorMap[link.color]}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-gray-600">{link.title}</h3>
                        <p className="text-sm text-gray-600">{link.description}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 flex-shrink-0 mt-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Documents */}
      {recentDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Recently Generated Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentDocuments.slice(0, 5).map((doc) => (
                <div key={doc.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{doc.document_title}</p>
                    <p className="text-sm text-gray-600">{doc.document_type}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Created: {format(new Date(doc.created_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    doc.status === 'completed' ? 'bg-green-100 text-green-700' :
                    doc.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    doc.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {doc.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Signatures */}
      {pendingRequests > 0 && (
        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertCircle className="w-5 h-5" />
              Pending E-Signature Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              <p className="text-sm text-orange-900">
                <strong>{pendingSignatures.length}</strong> documents awaiting signatures
              </p>
              <p className="text-sm text-orange-900">
                <strong>{inProgressSignatures.length}</strong> documents in progress
              </p>
            </div>
            <Link to={createPageUrl("DocumentSignatures")}>
              <Button className="w-full bg-orange-600 hover:bg-orange-700">
                Review Signature Requests
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}