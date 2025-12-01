
/**
 * Voice Command Registry
 * Defines all available voice commands for different contexts
 */

export const dashboardCommands = [
  {
    name: "Navigate to Patients",
    category: "Navigation",
    triggers: ["go to patients", "show patients", "open patients", "patients page"],
    action: "navigate_patients",
    description: "Navigate to the patients list page",
    example: "Say 'go to patients' to view all patients"
  },
  {
    name: "Navigate to Dashboard",
    category: "Navigation",
    triggers: ["go to dashboard", "show dashboard", "home page", "go home"],
    action: "navigate_dashboard",
    description: "Return to the main dashboard",
    example: "Say 'go to dashboard' to return to today's visits"
  },
  {
    name: "Refresh Data",
    category: "Actions",
    triggers: ["refresh", "reload", "update data", "get latest"],
    action: "refresh_data",
    description: "Refresh the current page data",
    example: "Say 'refresh' to reload the current data"
  },
  {
    name: "Search",
    category: "Actions",
    triggers: ["search for", "find patient", "look for"],
    action: "search",
    description: "Activate search functionality",
    example: "Say 'search for John Smith' to find a patient"
  }
];

export const documentationCommands = [
  // Navigation sections
  {
    name: "Cardiovascular Section",
    category: "Documentation",
    triggers: ["cardiovascular section", "cardio section", "heart assessment"],
    action: "insert_cardiovascular",
    description: "Insert cardiovascular assessment template",
    example: "Say 'cardiovascular section' to add heart assessment"
  },
  {
    name: "Respiratory Section",
    category: "Documentation",
    triggers: ["respiratory section", "lung section", "breathing assessment"],
    action: "insert_respiratory",
    description: "Insert respiratory assessment template",
    example: "Say 'respiratory section' to add lung assessment"
  },
  {
    name: "Medication Section",
    category: "Documentation",
    triggers: ["medication section", "med review", "medication management"],
    action: "insert_medication",
    description: "Insert medication management template",
    example: "Say 'medication section' to add medication review"
  },
  {
    name: "Education Section",
    category: "Documentation",
    triggers: ["education section", "teaching section", "patient education"],
    action: "insert_education",
    description: "Insert patient education template",
    example: "Say 'education section' to add teaching documentation"
  },

  // Auto-fill commands
  {
    name: "Normal Findings",
    category: "Quick Fill",
    triggers: ["add normal findings", "normal assessment", "all normal"],
    action: "insert_normal_findings",
    description: "Insert comprehensive normal assessment",
    example: "Say 'add normal findings' for standard normal assessment"
  },
  {
    name: "Normal Cardiovascular",
    category: "Quick Fill",
    triggers: ["add normal cardiovascular", "normal heart", "normal cardiac"],
    action: "insert_normal_cardiovascular",
    description: "Insert normal cardiovascular findings",
    example: "Say 'normal heart' for normal cardiac exam"
  },
  {
    name: "Normal Respiratory",
    category: "Quick Fill",
    triggers: ["add normal respiratory", "lungs clear", "clear lungs"],
    action: "insert_normal_respiratory",
    description: "Insert normal respiratory findings",
    example: "Say 'lungs clear' for normal lung assessment"
  },

  // Medicare compliance
  {
    name: "Homebound Status",
    category: "Medicare Compliance",
    triggers: ["add homebound", "homebound status", "homebound justification"],
    action: "insert_homebound",
    description: "Insert homebound status justification",
    example: "Say 'add homebound' for homebound documentation"
  },
  {
    name: "Skilled Need",
    category: "Medicare Compliance",
    triggers: ["skilled need", "skilled nursing", "skilled justification"],
    action: "insert_skilled_need",
    description: "Insert skilled nursing necessity rationale",
    example: "Say 'skilled need' for skilled nursing justification"
  },
  {
    name: "Physician Notification",
    category: "Communication",
    triggers: ["notify physician", "called doctor", "physician notification"],
    action: "insert_physician_notification",
    description: "Insert physician notification template",
    example: "Say 'notify physician' to document MD communication"
  },

  // Data insertion
  {
    name: "Insert Vital Signs",
    category: "Data Entry",
    triggers: ["insert vital signs", "add vitals", "vital signs narrative"],
    action: "insert_vitals",
    description: "Add entered vital signs to narrative",
    example: "Say 'insert vital signs' to add vitals to note"
  },
  {
    name: "Copy Previous Visit",
    category: "Efficiency",
    triggers: ["copy from last visit", "same as previous", "use last note"],
    action: "copy_previous",
    description: "Copy content from previous visit",
    example: "Say 'copy from last visit' to use previous documentation"
  },

  // Visit actions
  {
    name: "Save Documentation",
    category: "Actions",
    triggers: ["save note", "save documentation", "complete visit"],
    action: "save_documentation",
    description: "Save and complete visit documentation",
    example: "Say 'save note' to save your documentation"
  },
  {
    name: "Generate Template",
    category: "Actions",
    triggers: ["generate template", "smart template", "create template"],
    action: "generate_template",
    description: "Generate AI smart template",
    example: "Say 'generate template' for AI-generated note template"
  },
  
  // Incident reporting
  {
    name: "Report Fall",
    category: "Incidents",
    triggers: ["patient fall", "report fall", "fall incident"],
    action: "report_fall",
    description: "Open fall incident report",
    example: "Say 'patient fall' to start fall incident report"
  },
  {
    name: "Report Hospitalization",
    category: "Incidents",
    triggers: ["patient hospitalized", "report hospitalization", "er visit"],
    action: "report_hospitalization",
    description: "Open hospitalization incident report",
    example: "Say 'patient hospitalized' for hospitalization report"
  },

  // Care Plan commands
  {
    name: "Generate Care Plans",
    category: "Care Planning",
    triggers: ["generate care plans", "create care plans", "ai care plan"],
    action: "generate_care_plans",
    description: "Launch AI care plan generator",
    example: "Say 'generate care plans' to create AI-suggested care plans"
  }
];

export const patientCommands = [
  {
    name: "Add New Patient",
    category: "Actions",
    triggers: ["add patient", "new patient", "create patient"],
    action: "add_patient",
    description: "Open new patient form",
    example: "Say 'add patient' to register a new patient"
  },
  {
    name: "Schedule Visit",
    category: "Actions",
    triggers: ["schedule visit", "add visit", "new visit"],
    action: "schedule_visit",
    description: "Open visit scheduling form",
    example: "Say 'schedule visit' to book a new appointment"
  },
  {
    name: "Search Patients",
    category: "Actions",
    triggers: ["search for", "find patient", "look up"],
    action: "search_patients",
    description: "Activate patient search",
    example: "Say 'search for John Smith' to find a patient"
  }
];

export const adminCommands = [
  {
    name: "View Users",
    category: "Navigation",
    triggers: ["show users", "view users", "user management"],
    action: "view_users",
    description: "Navigate to user management",
    example: "Say 'show users' to manage users"
  },
  {
    name: "View Security Logs",
    category: "Navigation",
    triggers: ["show logs", "security logs", "audit trail"],
    action: "view_security_logs",
    description: "Navigate to security audit logs",
    example: "Say 'security logs' to view audit trail"
  },
  {
    name: "View Quality Metrics",
    category: "Navigation",
    triggers: ["quality metrics", "show quality", "quality dashboard"],
    action: "view_quality_metrics",
    description: "Navigate to quality metrics dashboard",
    example: "Say 'quality metrics' to view quality data"
  },
  {
    name: "View Reports",
    category: "Navigation",
    triggers: ["show reports", "reports center", "generate reports"],
    action: "view_reports",
    description: "Navigate to reports center",
    example: "Say 'show reports' to access reports"
  },
  {
    name: "Refresh Dashboard",
    category: "Actions",
    triggers: ["refresh", "reload", "update metrics"],
    action: "refresh_admin",
    description: "Refresh admin dashboard data",
    example: "Say 'refresh' to reload dashboard metrics"
  }
];

// Helper function to get commands for specific context
export function getCommandsForContext(context) {
  switch (context) {
    case 'dashboard':
      return dashboardCommands;
    case 'documentation':
      return documentationCommands;
    case 'patients':
      return patientCommands;
    case 'admin':
      return adminCommands;
    default:
      return [...dashboardCommands, ...documentationCommands, ...patientCommands];
  }
}
