export const OASIS_SECTIONS = [
  {
    id: "demographics",
    title: "Clinical Record & Status",
    icon: "👤",
    questions: [
      {
        id: "m0069",
        label: "M0069 — Prognosis",
        description: "Does this patient have a condition that has a life expectancy of a year or less?",
        type: "radio",
        options: [{ value: 0, label: "0 — No" }, { value: 1, label: "1 — Yes" }],
      },
      {
        id: "m1020",
        label: "M1020 — Primary Diagnosis",
        description: "Primary diagnosis that prompted home care admission.",
        type: "select",
        options: [
          { value: 0, label: "Select primary diagnosis..." },
          { value: 1, label: "Diabetes Mellitus" },
          { value: 2, label: "Heart Failure / CHF" },
          { value: 3, label: "COPD / Asthma" },
          { value: 4, label: "Hypertension" },
          { value: 5, label: "Wound / Pressure Ulcer" },
          { value: 6, label: "Orthopedic (Hip/Knee)" },
          { value: 7, label: "Stroke / CVA" },
          { value: 8, label: "Other" },
        ],
      },
      {
        id: "m1030",
        label: "M1030 — Therapies at Home",
        description: "Intravenous/infusion therapy, parenteral nutrition, or enteral nutrition received at home.",
        type: "radio",
        options: [
          { value: 0, label: "0 — None" },
          { value: 1, label: "1 — IV/Infusion therapy" },
          { value: 2, label: "2 — Parenteral/Enteral nutrition" },
        ],
      },
    ],
  },
  {
    id: "living",
    title: "Living Arrangements & Supports",
    icon: "🏠",
    questions: [
      {
        id: "m1100",
        label: "M1100 — Patient Living Situation",
        description: "Which of the following best describes the patient's residential circumstance and availability of assistance?",
        type: "radio",
        options: [
          { value: 0, label: "01 — Patient lives alone with no assistance available" },
          { value: 1, label: "02 — Patient lives alone with scheduled assistance" },
          { value: 2, label: "03 — Patient lives with others with no assistance from them" },
          { value: 3, label: "04 — Patient lives with others who provide assistance" },
        ],
      },
    ],
  },
  {
    id: "sensory",
    title: "Sensory Status",
    icon: "👁",
    questions: [
      {
        id: "m1730",
        label: "M1730 — Depression Screening",
        description: "PHQ-2 positive screen — 'Little interest or pleasure in doing things' or 'Feeling down, depressed, or hopeless' in last 2 weeks?",
        type: "radio",
        options: [
          { value: 0, label: "0 — No (negative screen)" },
          { value: 1, label: "1 — Yes to one question (positive screen)" },
          { value: 2, label: "2 — Yes to both questions (positive screen)" },
        ],
        alert: { threshold: 1, message: "Positive depression screen — psychosocial assessment indicated." }
      },
      {
        id: "m1740",
        label: "M1740 — Cognitive, Behavioral & Psychiatric Symptoms",
        description: "Behavioral symptoms that could be due to a cognitive, mental, or behavioral impairment.",
        type: "radio",
        options: [
          { value: 0, label: "0 — None of the behaviors" },
          { value: 1, label: "1 — Memory deficit / recall difficulty" },
          { value: 2, label: "2 — Impaired decision-making" },
          { value: 3, label: "3 — Verbal disruption / disruptive behavior" },
          { value: 4, label: "4 — Physical aggression" },
        ],
      },
      {
        id: "m1700",
        label: "M1700 — Cognitive Functioning",
        description: "Patient's current (day of assessment) level of alertness, orientation, comprehension, concentration, and immediate memory.",
        type: "radio",
        options: [
          { value: 0, label: "0 — Alert/oriented, able to focus and shift attention" },
          { value: 1, label: "1 — Requires prompting (cues) to focus" },
          { value: 2, label: "2 — Requires assistance and clinical supervision" },
          { value: 3, label: "3 — Requires considerable assistance — very short attention span" },
          { value: 4, label: "4 — Totally dependent due to disturbances" },
        ],
      },
    ],
  },
  {
    id: "respiratory",
    title: "Respiratory Status",
    icon: "🫁",
    questions: [
      {
        id: "m1400",
        label: "M1400 — Respiratory Status: Dyspnea",
        description: "Shortness of breath or labored breathing observed at assessment.",
        type: "radio",
        alert: { threshold: 2, message: "Significant dyspnea — respiratory management interventions strongly recommended." },
        options: [
          { value: 0, label: "0 — Not short of breath" },
          { value: 1, label: "1 — Short of breath when walking over 20 feet" },
          { value: 2, label: "2 — Short of breath with moderate exertion" },
          { value: 3, label: "3 — Short of breath with minimal exertion at rest" },
          { value: 4, label: "4 — Short of breath with minimal exertion or at rest" },
        ],
      },
    ],
  },
  {
    id: "cardiac",
    title: "Cardiac & Elimination",
    icon: "❤️",
    questions: [
      {
        id: "m1340",
        label: "M1340 — Surgical Wound",
        description: "Does the patient have a surgical wound?",
        type: "radio",
        options: [
          { value: 0, label: "0 — No" },
          { value: 1, label: "1 — Yes — not infected" },
          { value: 2, label: "2 — Yes — infected/complications" },
        ],
        alert: { threshold: 1, message: "Surgical wound present — wound care protocol required." }
      },
      {
        id: "m1306",
        label: "M1306 — Unhealed Pressure Ulcer(s)",
        description: "Does the patient have at least one unhealed pressure ulcer/injury at any stage?",
        type: "radio",
        options: [
          { value: 0, label: "0 — No" },
          { value: 1, label: "1 — Yes" },
        ],
        alert: { threshold: 1, message: "Pressure ulcer present — wound care interventions required for compliance." }
      },
      {
        id: "m1350",
        label: "M1350 — Skin Lesion or Open Wound",
        description: "Does the patient have a skin lesion or open wound, excluding pressure ulcers and surgical wounds?",
        type: "radio",
        options: [
          { value: 0, label: "0 — No" },
          { value: 1, label: "1 — Yes" },
        ],
      },
    ],
  },
  {
    id: "functional",
    title: "Functional Status & ADLs",
    icon: "🧍",
    questions: [
      {
        id: "m1800",
        label: "M1800 — Grooming",
        description: "Current ability to tend to personal hygiene needs (i.e., washing face and hands, hair care, shaving).",
        type: "radio",
        options: [
          { value: 0, label: "0 — Able to groom self unaided" },
          { value: 1, label: "1 — Grooming utensils must be placed within reach" },
          { value: 2, label: "2 — Someone must assist the patient" },
          { value: 3, label: "3 — Patient depends entirely upon someone else" },
        ],
      },
      {
        id: "m1860",
        label: "M1860 — Ambulation/Locomotion",
        description: "Current ability to walk safely, once in a standing position.",
        type: "radio",
        alert: { threshold: 2, message: "Impaired ambulation detected — fall prevention interventions strongly recommended." },
        options: [
          { value: 0, label: "0 — Able to ambulate on even/uneven surfaces" },
          { value: 1, label: "1 — With minor difficulty on uneven surfaces" },
          { value: 2, label: "2 — Requires use of a one-handed device" },
          { value: 3, label: "3 — Requires use of a two-handed device" },
          { value: 4, label: "4 — Requires use of a wheelchair" },
          { value: 5, label: "5 — Unable to ambulate" },
        ],
      },
      {
        id: "m1810",
        label: "M1810 — Upper Body Dressing",
        description: "Current ability to dress upper body safely (excluding prostheses).",
        type: "radio",
        options: [
          { value: 0, label: "0 — No assistance needed" },
          { value: 1, label: "1 — With minor difficulty or helper makes adaptations" },
          { value: 2, label: "2 — Someone must assist" },
          { value: 3, label: "3 — Totally dependent" },
        ],
      },
      {
        id: "m1820",
        label: "M1820 — Lower Body Dressing",
        description: "Current ability to dress lower body safely (excluding prostheses).",
        type: "radio",
        options: [
          { value: 0, label: "0 — No assistance needed" },
          { value: 1, label: "1 — With minor difficulty or helper makes adaptations" },
          { value: 2, label: "2 — Someone must assist" },
          { value: 3, label: "3 — Totally dependent" },
        ],
      },
    ],
  },
  {
    id: "medications",
    title: "Medications",
    icon: "💊",
    questions: [
      {
        id: "m2001",
        label: "M2001 — Drug Regimen Review",
        description: "Was a complete drug regimen review conducted? Did any identified drug issues require follow-up?",
        type: "radio",
        alert: { threshold: 1, message: "Drug regimen issues identified — medication management education is required." },
        options: [
          { value: 0, label: "0 — No issues found during review" },
          { value: 1, label: "1 — Issues found, physician contacted within 24 hours" },
          { value: 2, label: "2 — Issues found, physician not contacted" },
        ],
      },
      {
        id: "m2010",
        label: "M2010 — High-Risk Drug Education",
        description: "Has the patient/caregiver received education on high-risk drug?",
        type: "radio",
        options: [
          { value: 0, label: "0 — Not applicable — no high-risk drugs" },
          { value: 1, label: "1 — Education completed" },
          { value: 2, label: "2 — Education not completed" },
        ],
      },
      {
        id: "m2020",
        label: "M2020 — Management of Oral Medications",
        description: "Patient's current ability to prepare and take all oral medications reliably and safely.",
        type: "radio",
        options: [
          { value: 0, label: "0 — Able to independently take correct medications" },
          { value: 1, label: "1 — Able if given daily reminders" },
          { value: 2, label: "2 — Able to take only if medication is prepared" },
          { value: 3, label: "3 — Unable to take medication" },
        ],
      },
    ],
  },
  {
    id: "fallrisk",
    title: "Fall Risk",
    icon: "⚠️",
    questions: [
      {
        id: "m1910",
        label: "M1910 — Fall Risk Assessment",
        description: "Has the patient had two or more falls in the past year or any fall with injury?",
        type: "radio",
        alert: { threshold: 1, message: "Fall history identified — comprehensive fall prevention protocol is required." },
        options: [
          { value: 0, label: "0 — No falls in past year" },
          { value: 1, label: "1 — One fall or any fall with injury" },
          { value: 2, label: "2 — Two or more falls" },
        ],
      },
      {
        id: "m1900",
        label: "M1900 — Prior Functioning",
        description: "In the 2 weeks prior to the current illness, exacerbation, or injury, patient's ADL ability was:",
        type: "radio",
        options: [
          { value: 0, label: "0 — Independent — no assistance needed" },
          { value: 1, label: "1 — Required some assistance" },
          { value: 2, label: "2 — Required considerable assistance" },
          { value: 3, label: "3 — Mostly or totally dependent" },
          { value: 4, label: "4 — Unknown" },
        ],
      },
    ],
  },
];