import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Copy, RotateCcw } from "lucide-react";
import SmartNotePDFExporterEnhanced from "./SmartNotePDFExporterEnhanced";
import NoteDiffView from "./NoteDiffView";
import SignatureCapture from "./SignatureCapture";

export default function FinalNoteDisplay({ finalNote, setFinalNote, onCopy, copied, patient, visitType, analysisScore, currentUser, signatureImage, setSignatureImage, onReset, originalNote, noteSections, onCopySection }) {
  const [copiedSection, setCopiedSection] = useState(null);

  const copySection = async (key, text) => {
    await navigator.clipboard.writeText(text);
    setCopiedSection(key);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const parseNoteSections = (text) => {
    if (!text) return null;
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const vitals = sentences.filter(s => /bp|blood pressure|hr|heart rate|o2|oxygen|temp|weight|respir|pain/i.test(s));
    const assessment = sentences.filter(s => /assess|exam|appear|ambul|mobil|wound|skin|edema|breath|lung|bowel/i.test(s));
    const education = sentences.filter(s => /teach|educat|instruct|verbali|understand|demonstrat/i.test(s));
    const safety = sentences.filter(s => /fall|safe|hazard|medic|adher|complian/i.test(s));
    const plan = sentences.filter(s => /plan|next|follow|return|notif|physician|refer|schedul/i.test(s));
    const rest = sentences.filter(s => ![...vitals, ...assessment, ...education, ...safety, ...plan].includes(s));
    const secs = [
      { key: "vitals", label: "Vital Signs", text: vitals.join(" ").trim() },
      { key: "assessment", label: "Assessment", text: assessment.join(" ").trim() },
      { key: "education", label: "Education / Teaching", text: education.join(" ").trim() },
      { key: "safety", label: "Safety", text: safety.join(" ").trim() },
      { key: "plan", label: "Plan", text: plan.join(" ").trim() },
      { key: "other", label: "Clinical Narrative", text: rest.join(" ").trim() },
    ].filter(s => s.text.length > 10);
    return secs.length > 1 ? secs : null;
  };

  const sections = parseNoteSections(finalNote);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 bg-white border-2 border-green-400 rounded-xl px-4 py-3 shadow-sm">
        <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-green-800">Medicare-Compliant Note Ready</p>
          <p className="text-xs text-gray-400">Based only on information you provided</p>
        </div>
        {analysisScore && <Badge className="bg-green-600 text-white px-2.5 py-1 text-sm">{analysisScore}%</Badge>}
        <Button onClick={onCopy} className="bg-green-600 hover:bg-green-700 h-10 px-4 gap-2 font-semibold shrink-0">
          {copied ? <><CheckCircle2 className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-700">Final Clinical Note</span>
          <span className="text-xs text-gray-400">editable · {finalNote.length} chars</span>
        </div>
        <textarea
          value={finalNote}
          onChange={e => {
            setFinalNote(e.target.value);
          }}
          className="w-full min-h-[320px] font-mono text-sm border-0 px-4 py-3 focus:ring-0 bg-white resize-none outline-none"
        />
        <div className="flex gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50">
          <Button onClick={onCopy} className="flex-1 bg-green-600 hover:bg-green-700 h-12 sm:h-10 gap-2 font-semibold">
            {copied ? <><CheckCircle2 className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy All</>}
          </Button>
          <SmartNotePDFExporterEnhanced finalNote={finalNote} patient={patient} visitType={visitType} analysisScore={analysisScore} currentUser={currentUser} signatureImage={signatureImage} />
          <Button variant="outline" className="h-12 sm:h-10 px-4 text-sm">Save</Button>
          <Button variant="outline" className="h-12 sm:h-10 px-3" onClick={onReset}><RotateCcw className="w-4 h-4" /></Button>
        </div>
      </div>

      <NoteDiffView originalNote={originalNote} enhancedNote={finalNote} />
    </div>
  );
}