import { useRef, useState, useEffect } from "react";
import { Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { enhanceTranscription } from "@/components/utils/medicalDictionary";

/**
 * A small, self-contained push-to-dictate mic button. Uses the browser's
 * SpeechRecognition (same engine as the main note dictation) and passes each
 * finalized, medical-dictionary-enhanced chunk to `onText`. Designed to sit
 * next to a textarea so a nurse can speak an answer instead of typing it.
 *
 * Props:
 *   onText(text)  — called with each enhanced transcript chunk (append it)
 *   disabled      — disables the button
 *   title         — accessible label / tooltip
 */
export default function DictationButton({ onText, disabled = false, title = "Dictate this answer" }) {
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);

  // Stop any in-flight recognition if the button unmounts mid-dictation.
  useEffect(() => () => { try { recRef.current?.stop(); } catch { /* already stopped */ } }, []);

  const toggle = () => {
    if (listening) { recRef.current?.stop(); setListening(false); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error("Speech recognition isn't supported in this browser."); return; }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (e) => {
      const t = Array.from(e.results).slice(e.resultIndex).map((r) => r[0].transcript).join(" ");
      const enhanced = enhanceTranscription(t);
      if (enhanced?.trim()) onText?.(enhanced.trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      title={listening ? "Stop dictation" : title}
      aria-label={listening ? "Stop dictation" : title}
      aria-pressed={listening}
      className={`shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-colors disabled:opacity-50 ${listening ? "bg-red-500 border-red-500 text-white animate-pulse" : "bg-white border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300"}`}
    >
      {listening ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-4 h-4" />}
    </button>
  );
}
