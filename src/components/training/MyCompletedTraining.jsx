import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Award, Download, Search, Calendar, Star } from "lucide-react";

export default function MyCompletedTraining({ nurseEmail }) {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: completions = [] } = useQuery({
    queryKey: ['completedTraining', nurseEmail],
    queryFn: () => base44.entities.TrainingCompletion.filter({
      nurse_email: nurseEmail,
      status: 'completed'
    }, '-completion_date'),
    enabled: !!nurseEmail,
  });

  const { data: modules = [] } = useQuery({
    queryKey: ['trainingModules'],
    queryFn: () => base44.entities.TrainingModule.list(),
  });

  const handleDownloadCertificate = async (completion, module) => {
    try {
      const response = await base44.functions.invoke('generateTrainingCertificate', {
        completion_id: completion.id,
        module_id: module.id
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Certificate_${module.title.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Error downloading certificate:', error);
      alert('Failed to generate certificate');
    }
  };

  const filteredCompletions = completions.filter(c => {
    const module = modules.find(m => m.id === c.training_module_id);
    return module?.title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Award className="w-6 h-6 text-yellow-500" />
          My Certificates
        </h2>
        <Badge className="bg-green-600">
          {completions.length} Completed
        </Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search completed training..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Completions List */}
      <div className="grid gap-4">
        {filteredCompletions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">
                {searchTerm ? 'No matching certificates found' : 'No completed training yet'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredCompletions.map((completion) => {
            const module = modules.find(m => m.id === completion.training_module_id);
            if (!module) return null;

            return (
              <Card key={completion.id} className="border-2 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1">{module.title}</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">
                          {module.category}
                        </Badge>
                        {completion.score && (
                          <Badge className="bg-green-600 text-xs">
                            Score: {completion.score}%
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(completion.completion_date).toLocaleDateString()}</span>
                    </div>
                    {completion.effectiveness_rating && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Star className="w-4 h-4" />
                        <span>{completion.effectiveness_rating}/5 stars</span>
                      </div>
                    )}
                  </div>

                  {completion.feedback && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-xs font-semibold text-blue-900 mb-1">Your Feedback:</p>
                      <p className="text-sm text-blue-800">{completion.feedback}</p>
                    </div>
                  )}

                  <Button
                    onClick={() => handleDownloadCertificate(completion, module)}
                    variant="outline"
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Certificate
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}