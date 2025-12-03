import { base44 } from "@/api/base44Client";

// Track a recommendation for a nurse
export async function trackRecommendation({
  nurseEmail,
  type,
  text,
  source,
  severity = "medium",
  patientId = null,
  visitId = null
}) {
  if (!nurseEmail || !type || !text || !source) return null;
  
  try {
    return await base44.entities.TrainingRecommendation.create({
      nurse_email: nurseEmail,
      recommendation_type: type,
      recommendation_text: text,
      source,
      severity,
      patient_id: patientId,
      visit_id: visitId,
      addressed: false
    });
  } catch (error) {
    console.error("Error tracking recommendation:", error);
    return null;
  }
}

// Categorize recommendation text into a type
export function categorizeRecommendation(text) {
  const lower = text.toLowerCase();
  
  if (lower.includes("document") || lower.includes("note") || lower.includes("chart") || lower.includes("record")) {
    return "documentation";
  }
  if (lower.includes("compliance") || lower.includes("medicare") || lower.includes("regulation") || lower.includes("homebound")) {
    return "compliance";
  }
  if (lower.includes("safety") || lower.includes("fall") || lower.includes("infection") || lower.includes("risk")) {
    return "safety";
  }
  if (lower.includes("vital") || lower.includes("assess") || lower.includes("clinical") || lower.includes("diagnos")) {
    return "clinical";
  }
  if (lower.includes("patient education") || lower.includes("teach") || lower.includes("communication") || lower.includes("family")) {
    return "communication";
  }
  
  return "documentation";
}

// Map recommendation types to suggested training modules
export const trainingModuleMap = {
  documentation: [
    { title: "Medicare Documentation Essentials", duration: 30, priority: "high" },
    { title: "Clinical Narrative Writing", duration: 20, priority: "medium" },
    { title: "OASIS Documentation Accuracy", duration: 45, priority: "high" }
  ],
  compliance: [
    { title: "Medicare Compliance Fundamentals", duration: 45, priority: "high" },
    { title: "Homebound Status Documentation", duration: 20, priority: "high" },
    { title: "Skilled Need Justification", duration: 30, priority: "medium" }
  ],
  clinical: [
    { title: "Clinical Assessment Best Practices", duration: 40, priority: "high" },
    { title: "Vital Signs Interpretation", duration: 25, priority: "medium" },
    { title: "Disease-Specific Care Protocols", duration: 60, priority: "medium" }
  ],
  safety: [
    { title: "Fall Prevention Strategies", duration: 30, priority: "high" },
    { title: "Infection Control in Home Health", duration: 35, priority: "high" },
    { title: "Patient Safety Assessment", duration: 25, priority: "medium" }
  ],
  communication: [
    { title: "Effective Patient Education", duration: 30, priority: "medium" },
    { title: "Family Caregiver Communication", duration: 25, priority: "medium" },
    { title: "Teach-Back Techniques", duration: 20, priority: "low" }
  ],
  technology: [
    { title: "EHR Efficiency Training", duration: 30, priority: "medium" },
    { title: "Voice Documentation Tools", duration: 20, priority: "low" },
    { title: "Mobile Documentation Best Practices", duration: 25, priority: "low" }
  ]
};