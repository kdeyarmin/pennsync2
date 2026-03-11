import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, Printer } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { generateTrainingCertificate } from "@/functions/generateTrainingCertificate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const formatDate = (value) => value ? new Date(value).toLocaleDateString() : "—";

export default function AnnualTranscriptCenter() {
  const currentYear = new Date().getFullYear();
  const { data: currentUser } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });
  const { data: certificates = [] } = useQuery({
    queryKey: ["annual-transcript-certificates", currentUser?.email],
    queryFn: async () => {
      const all = await base44.entities.TrainingCertificate.filter({ user_id: currentUser?.email }, '-issued_at', 500);
      return all.filter((certificate) => certificate.annual_cycle_year === currentYear);
    },
    enabled: !!currentUser?.email,
    initialData: []
  });

  const createBlobUrl = async (certificate) => {
    const response = await generateTrainingCertificate({
      moduleName: certificate.course_title,
      completionDate: certificate.completion_date || certificate.issued_at,
      score: certificate.score
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    return window.URL.createObjectURL(blob);
  };

  const printCertificate = async (certificate) => {
    const url = await createBlobUrl(certificate);
    const printWindow = window.open(url, '_blank');
    setTimeout(() => printWindow?.print(), 600);
  };

  const downloadCertificate = async (certificate) => {
    const url = await createBlobUrl(certificate);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${certificate.course_title.replace(/\s+/g, '_')}_annual_certificate.pdf`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 to-indigo-700 text-white p-6 shadow-xl">
        <h1 className="text-3xl font-bold mb-2">Annual Education Transcript</h1>
        <p className="text-indigo-100">All completed annual mandatory education and certificates in chronological order.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Annual certificate history</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {certificates.map((certificate) => (
            <div key={certificate.id} className="rounded-2xl border p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white">
              <div>
                <div className="flex items-center gap-2 mb-1"><Award className="w-5 h-5 text-amber-500" /><h2 className="font-semibold text-slate-900">{certificate.course_title}</h2></div>
                <p className="text-sm text-slate-500">Completed {formatDate(certificate.completion_date || certificate.issued_at)} • Score {certificate.score}%</p>
                <p className="text-sm text-slate-500">Certificate ID: {certificate.certificate_id}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => printCertificate(certificate)}><Printer className="w-4 h-4 mr-2" />Print</Button>
                <Button onClick={() => downloadCertificate(certificate)}>Download PDF</Button>
              </div>
            </div>
          ))}
          {certificates.length === 0 && <div className="text-center text-slate-500 py-10">No annual certificates available yet.</div>}
        </CardContent>
      </Card>
    </div>
  );
}