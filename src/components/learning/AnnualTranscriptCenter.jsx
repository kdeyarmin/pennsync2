import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, Search, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import CertificateDownloadButton from "@/components/training/CertificateDownloadButton";

const formatDate = (value) => value ? new Date(value).toLocaleDateString() : "—";

export default function AnnualTranscriptCenter() {
  const currentYear = new Date().getFullYear();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: currentUser } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });
  const { data: certificates = [], isLoading } = useQuery({
    queryKey: ["annual-transcript-certificates", currentUser?.email],
    queryFn: async () => {
      const all = await base44.entities.TrainingCertificate.filter({ user_id: currentUser?.email }, '-issued_at', 500);
      return all.filter((certificate) => certificate.annual_cycle_year === currentYear);
    },
    enabled: !!currentUser?.email,
    initialData: []
  });

  const filtered = searchQuery
    ? certificates.filter(c => c.course_title?.toLowerCase().includes(searchQuery.toLowerCase()))
    : certificates;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-700 text-white p-6 shadow-xl">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Annual Education Transcript</h1>
        <p className="text-indigo-100">All completed annual mandatory education and certificates for {currentYear}.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle>Annual Certificate History ({certificates.length})</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search certificates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10">
              <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">
                {searchQuery ? 'No annual certificates match your search.' : 'No annual certificates available yet.'}
              </p>
            </div>
          ) : (
            filtered.map((certificate) => (
              <div key={certificate.id} className="rounded-xl border p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white transition-all hover:shadow-sm">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <h2 className="font-semibold text-slate-900 truncate">{certificate.course_title}</h2>
                  </div>
                  <p className="text-sm text-slate-500">
                    Completed {formatDate(certificate.completion_date || certificate.issued_at)}
                    {certificate.score != null && <> &middot; Score {certificate.score}%</>}
                  </p>
                  {certificate.certificate_id && (
                    <p className="text-xs text-slate-400">Certificate ID: {certificate.certificate_id}</p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <CertificateDownloadButton certificate={certificate} size="sm" />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
