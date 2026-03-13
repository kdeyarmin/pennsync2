import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import DataQualityDashboard from "@/components/admin/DataQualityDashboard";
import { Card, CardContent } from "@/components/ui/card";

export default function DataQualityMonitor() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
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
    <div className="max-w-7xl mx-auto">
      <DataQualityDashboard />
    </div>
  );
}