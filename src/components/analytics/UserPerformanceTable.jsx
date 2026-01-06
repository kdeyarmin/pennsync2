import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";

export default function UserPerformanceTable({ users }) {
  const [sortBy, setSortBy] = useState('notesCount');
  const [sortDirection, setSortDirection] = useState('desc');

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    const aVal = parseFloat(a[sortBy]) || 0;
    const bVal = parseFloat(b[sortBy]) || 0;
    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const getComplianceBadge = (score) => {
    const val = parseFloat(score);
    if (val >= 85) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
    if (val >= 70) return <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>;
    return <Badge className="bg-red-100 text-red-800">Needs Improvement</Badge>;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="text-left p-3 font-semibold">User</th>
            <th className="text-left p-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleSort('notesCount')}
                className="h-auto p-0 hover:bg-transparent font-semibold"
              >
                Enhancements <ArrowUpDown className="w-3 h-3 ml-1 inline" />
              </Button>
            </th>
            <th className="text-left p-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleSort('avgDocTime')}
                className="h-auto p-0 hover:bg-transparent font-semibold"
              >
                Avg Time <ArrowUpDown className="w-3 h-3 ml-1 inline" />
              </Button>
            </th>
            <th className="text-left p-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleSort('avgCompliance')}
                className="h-auto p-0 hover:bg-transparent font-semibold"
              >
                Compliance <ArrowUpDown className="w-3 h-3 ml-1 inline" />
              </Button>
            </th>
            <th className="text-left p-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleSort('avgQuality')}
                className="h-auto p-0 hover:bg-transparent font-semibold"
              >
                Quality <ArrowUpDown className="w-3 h-3 ml-1 inline" />
              </Button>
            </th>
            <th className="text-left p-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleSort('aiUtilization')}
                className="h-auto p-0 hover:bg-transparent font-semibold"
              >
                AI Usage <ArrowUpDown className="w-3 h-3 ml-1 inline" />
              </Button>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedUsers.map((user, idx) => (
            <tr key={idx} className="border-b hover:bg-gray-50">
              <td className="p-3">
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </td>
              <td className="p-3">{user.notesCount}</td>
              <td className="p-3">{user.avgDocTime} min</td>
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <span>{user.avgCompliance}%</span>
                  {getComplianceBadge(user.avgCompliance)}
                </div>
              </td>
              <td className="p-3">{user.avgQuality}%</td>
              <td className="p-3">{user.aiUtilization}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}