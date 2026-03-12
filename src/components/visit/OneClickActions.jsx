import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Calendar, Package, FileText } from "lucide-react";

export default function OneClickActions({ 
  patient, 
  visit,
  onMarkUrgent,
  onScheduleFollowUp,
  onRequestSupplies
}) {
  return (
    <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-3 hover:bg-red-50 hover:border-red-300"
            onClick={onMarkUrgent}
          >
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-xs font-medium">Mark Urgent</span>
          </Button>

          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-3 hover:bg-blue-50 hover:border-blue-300"
            onClick={onScheduleFollowUp}
          >
            <Calendar className="w-5 h-5 text-blue-600" />
            <span className="text-xs font-medium">Schedule Follow-Up</span>
          </Button>

          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-3 hover:bg-green-50 hover:border-green-300"
            onClick={onRequestSupplies}
          >
            <Package className="w-5 h-5 text-green-600" />
            <span className="text-xs font-medium">Order Supplies</span>
          </Button>

          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-3 hover:bg-purple-50 hover:border-purple-300"
            onClick={() => window.print()}
          >
            <FileText className="w-5 h-5 text-purple-600" />
            <span className="text-xs font-medium">Print Summary</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}