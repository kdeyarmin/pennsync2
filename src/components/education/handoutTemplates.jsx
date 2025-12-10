// Template structures for preview (mirrored from backend)
export const handoutTemplates = {
  'chf': {
    sections: [
      { heading: 'What is CHF?', content: 'Congestive Heart Failure (CHF) occurs when your heart doesn\'t pump blood as well as it should...' },
      { heading: 'Warning Signs', bullets: ['Shortness of breath', 'Swelling in legs', 'Rapid weight gain', 'Persistent cough', 'Fatigue', 'Irregular heartbeat'] },
      { heading: 'Self-Care Tips', bullets: ['Weigh yourself daily', 'Limit salt intake', 'Limit fluid intake', 'Take medications as prescribed', 'Elevate legs', 'Stay active'] },
      { heading: 'When to Call Your Doctor', bullets: ['Weight gain of 2-3 pounds in one day', 'Increased swelling', 'Increased shortness of breath', 'New or worsening cough', 'Difficulty sleeping'] },
      { heading: 'Emergency - Call 911 If:', bullets: ['Severe shortness of breath', 'Chest pain', 'Fainting', 'Coughing up pink mucus'], emergency: true }
    ]
  },
  'copd': {
    sections: [
      { heading: 'What is COPD?', content: 'COPD is a chronic lung disease that makes it hard to breathe...' },
      { heading: 'Common Symptoms', bullets: ['Chronic cough', 'Shortness of breath', 'Wheezing', 'Chest tightness', 'Frequent infections', 'Fatigue'] },
      { heading: 'Managing Your COPD', bullets: ['STOP SMOKING', 'Use inhalers as prescribed', 'Practice pursed-lip breathing', 'Stay active', 'Avoid lung irritants', 'Get vaccinated'] },
      { heading: 'Breathing Techniques', bullets: ['Pursed-lip breathing', 'Diaphragmatic breathing', 'Take breaks', 'Use oxygen as prescribed'] },
      { heading: 'Call Your Doctor If:', bullets: ['Increased shortness of breath', 'Change in mucus color', 'Increased cough', 'Fever over 100.4°F', 'Confusion', 'Chest pain'], important: true }
    ]
  },
  'copd_oxygen': {
    sections: [
      { heading: 'Why You Need Oxygen', content: 'Supplemental oxygen helps ensure your body gets the oxygen it needs...', highlight: true },
      { heading: 'Understanding Your Prescription', bullets: ['Follow prescribed flow rate', 'Different rates for rest/activity/sleep', 'Keep prescription with equipment', 'Oxygen is a medication'] },
      { heading: 'Using Your Oxygen Safely', bullets: ['NO SMOKING', 'Keep away from flames', 'Stay away from heat sources', 'No aerosol products nearby', 'Post "No Smoking" signs'], important: true },
      { heading: 'When to Call Your Doctor', bullets: ['Increased shortness of breath', 'Needing higher flow rates', 'Chest pain', 'Confusion', 'Morning headaches', 'Bluish color to lips'] }
    ]
  },
  'diabetes': {
    sections: [
      { heading: 'Understanding Diabetes', content: 'Diabetes is a condition where your body cannot properly use or produce insulin...' },
      { heading: 'Blood Sugar Targets', bullets: ['Before meals: 80-130 mg/dL', 'After meals: Less than 180 mg/dL', 'Bedtime: 100-140 mg/dL'] },
      { heading: 'Daily Management', bullets: ['Check blood sugar', 'Take medications on time', 'Eat regular meals', 'Limit sugary foods', 'Exercise regularly', 'Check feet daily'] },
      { heading: 'Signs of Low Blood Sugar', bullets: ['Shaking', 'Sweating', 'Fast heartbeat', 'Dizziness', 'Hunger', 'Confusion'], important: true },
      { heading: 'Foot Care', bullets: ['Inspect feet daily', 'Wash and dry thoroughly', 'Never go barefoot', 'Wear fitted shoes', 'Trim nails carefully', 'Report problems'] }
    ]
  },
  'hypertension': {
    sections: [
      { heading: 'What is High Blood Pressure?', content: 'High blood pressure occurs when the force of blood against your artery walls is too high...' },
      { heading: 'Lifestyle Changes', bullets: ['Reduce sodium', 'Eat fruits and vegetables', 'Limit alcohol', 'Quit smoking', 'Maintain healthy weight', 'Exercise regularly', 'Manage stress'] },
      { heading: 'Taking Your Blood Pressure at Home', bullets: ['Use validated monitor', 'Measure same time daily', 'Sit quietly for 5 minutes', 'Keep arm at heart level', 'Take 2-3 readings', 'Keep a log'] }
    ]
  },
  'stroke': {
    sections: [
      { heading: 'What is a Stroke?', content: 'A stroke occurs when blood flow to part of the brain is blocked...' },
      { heading: 'Remember F.A.S.T.', bullets: ['Face drooping', 'Arm weakness', 'Speech difficulty', 'Time to call 911'], emergency: true },
      { heading: 'Recovery Tips', bullets: ['Attend all therapy sessions', 'Practice exercises at home', 'Take medications', 'Use assistive devices', 'Ask for help', 'Be patient'] },
      { heading: 'Preventing Another Stroke', bullets: ['Control blood pressure', 'Manage diabetes', 'Lower cholesterol', 'Quit smoking', 'Eat heart-healthy', 'Exercise', 'Limit alcohol'] }
    ]
  },
  'wound_care': {
    sections: [
      { heading: 'Daily Wound Care', bullets: ['Wash hands thoroughly', 'Clean wound as instructed', 'Apply dressings correctly', 'Keep wound dry', 'Don\'t remove dressings', 'Dispose properly'] },
      { heading: 'Signs of Infection - Call Your Nurse', bullets: ['Increased redness', 'Increased swelling', 'Increased pain', 'Warmth', 'Pus or drainage', 'Foul odor', 'Fever', 'Red streaks'], important: true },
      { heading: 'Promoting Healing', bullets: ['Eat balanced diet with protein', 'Stay hydrated', 'Take vitamins', 'Elevate affected area', 'Avoid smoking', 'Control blood sugar'] }
    ]
  },
  'fall_prevention': {
    sections: [
      { heading: 'Home Safety Checklist', bullets: ['Remove throw rugs', 'Keep floors clear', 'Install grab bars', 'Use non-slip mats', 'Ensure good lighting', 'Use nightlights', 'Keep stairs clear', 'Install handrails'] },
      { heading: 'Personal Safety', bullets: ['Wear non-slip footwear', 'Use assistive devices', 'Rise slowly', 'Don\'t rush', 'Turn on lights', 'Use step stool with handle', 'Keep phone within reach'] }
    ]
  },
  'pain_management': {
    sections: [
      { heading: 'Medication Safety', bullets: ['Take as prescribed', 'Don\'t wait until severe', 'Take with food if needed', 'Don\'t mix with alcohol', 'Store safely', 'Dispose properly', 'Report side effects'], important: true },
      { heading: 'Non-Drug Pain Relief', bullets: ['Apply ice or heat', 'Deep breathing', 'Meditation', 'Distraction', 'Gentle exercise', 'Massage', 'Position changes', 'Rest'] }
    ]
  },
  'ckd': {
    sections: [
      { heading: 'What is Chronic Kidney Disease?', content: 'CKD means your kidneys are damaged and can\'t filter blood properly...', highlight: true },
      { heading: 'Managing Your Diet', bullets: ['Moderate protein intake', 'Limit sodium', 'May need to limit potassium', 'Limit phosphorus', 'Take phosphate binders'] },
      { heading: 'Daily Management', bullets: ['Take medications as prescribed', 'Monitor blood pressure', 'Stay hydrated', 'Exercise regularly', 'Avoid NSAIDs', 'Keep appointments'] },
      { heading: 'Warning Signs - Call Your Doctor', bullets: ['Swelling', 'Shortness of breath', 'Extreme fatigue', 'Nausea', 'Changes in urination', 'Confusion', 'Chest pain', 'Itching'], important: true }
    ]
  },
  'osteoporosis': {
    sections: [
      { heading: 'Understanding Osteoporosis', content: 'Osteoporosis is a condition where bones become weak and brittle...', highlight: true },
      { heading: 'Building Strong Bones', bullets: ['Get 1,200mg calcium daily', 'Take vitamin D', 'Eat protein', 'Limit caffeine', 'Weight-bearing exercises', 'Strength training', 'Balance exercises'] },
      { heading: 'Fall Prevention', bullets: ['Remove tripping hazards', 'Install grab bars', 'Use non-slip mats', 'Ensure good lighting', 'Wear supportive shoes', 'Check vision', 'Review medications'] }
    ]
  },
  'dementia_care': {
    sections: [
      { heading: 'Understanding Dementia', content: 'Dementia is not a single disease but a general term for decline in mental ability...', highlight: true },
      { heading: 'Communication Strategies', bullets: ['Speak slowly and clearly', 'Use simple words', 'Give one instruction at a time', 'Allow time for response', 'Use touch and eye contact', 'Show respect'] },
      { heading: 'Daily Care Tips', bullets: ['Establish routine', 'Keep environment calm', 'Use memory aids', 'Simplify tasks', 'Reduce clutter', 'Ensure adequate lighting', 'Monitor for pain', 'Encourage independence'] },
      { heading: 'Caregiver Self-Care', bullets: ['Take breaks', 'Accept help', 'Join support group', 'Maintain health appointments', 'Stay active', 'Get adequate sleep', 'Seek help if overwhelmed'], important: true }
    ]
  },
  'anticoagulation': {
    sections: [
      { heading: 'Why You\'re Taking Blood Thinners', content: 'Blood thinners help prevent blood clots that can cause heart attack or stroke...', highlight: true },
      { heading: 'Taking Your Medication Safely', bullets: ['Take exactly as prescribed', 'Same time every day', 'Don\'t stop without doctor approval', 'Tell all providers', 'Carry medical alert card', 'Keep INR appointments', 'Report missed doses'], important: true },
      { heading: 'Safety Precautions', bullets: ['Use electric razor', 'Use soft toothbrush', 'Wear gloves for yard work', 'Avoid contact sports', 'Be careful with sharp objects', 'Don\'t go barefoot', 'No aspirin or NSAIDs', 'Check before new medications'] },
      { heading: 'Warning Signs of Bleeding', bullets: ['Unusual bruising', 'Nosebleeds', 'Bleeding gums', 'Blood in urine', 'Blood in stool', 'Vomiting blood', 'Coughing blood', 'Heavy menstrual bleeding', 'Severe headache'], important: true },
      { heading: 'CALL 911 IMMEDIATELY IF:', bullets: ['Severe headache', 'Difficulty speaking', 'Weakness on one side', 'Chest pain', 'Severe shortness of breath', 'Severe abdominal pain', 'Major fall or head injury', 'Uncontrolled bleeding'], emergency: true }
    ]
  },
  'nutrition': {
    sections: [
      { heading: 'Why Good Nutrition Matters', content: 'Proper nutrition helps maintain strength, energy, immune function, and overall health...', highlight: true },
      { heading: 'Building a Healthy Plate', bullets: ['Half plate: fruits and vegetables', 'Quarter plate: lean protein', 'Quarter plate: whole grains', 'Include low-fat dairy', 'Use healthy fats', 'Drink water'] },
      { heading: 'Staying Hydrated', bullets: ['Drink 6-8 glasses water daily', 'Don\'t wait until thirsty', 'Limit caffeine and alcohol', 'Eat water-rich foods', 'Keep water bottle handy', 'Watch for dehydration signs'], important: true }
    ]
  },
  'pneumonia': {
    sections: [
      { heading: 'What is Pneumonia?', content: 'Pneumonia is an infection that inflames the air sacs in your lungs...', highlight: true },
      { heading: 'Recovery at Home', bullets: ['Get plenty of rest', 'Take all antibiotics', 'Drink plenty of fluids', 'Use a humidifier', 'Take fever reducers', 'Eat nutritious meals'] },
      { heading: 'Breathing Techniques', bullets: ['Use incentive spirometer', 'Practice deep breathing', 'Cough to clear mucus', 'Sit upright', 'Use oxygen as prescribed'] },
      { heading: 'Warning Signs - Call Your Doctor', bullets: ['Fever over 100.4°F', 'Increased shortness of breath', 'Chest pain worsens', 'Coughing up blood', 'Confusion', 'Blue lips', 'Unable to keep fluids down'], important: true }
    ]
  },
  'uti': {
    sections: [
      { heading: 'Understanding UTIs', content: 'A urinary tract infection is an infection in any part of your urinary system...', highlight: true },
      { heading: 'Treatment', bullets: ['Take all antibiotics', 'Drink plenty of water', 'Urinate frequently', 'Use heating pad', 'Avoid caffeine and alcohol', 'Cranberry juice may help'] },
      { heading: 'Prevention Tips', bullets: ['Drink plenty of water', 'Urinate after sex', 'Wipe front to back', 'Avoid irritating products', 'Change incontinence products', 'Keep area clean', 'Wear cotton underwear', 'Avoid tight pants'] },
      { heading: 'When to Seek Help', bullets: ['Symptoms don\'t improve', 'Fever over 101°F', 'Severe back pain', 'Nausea and vomiting', 'Blood in urine', 'Confusion'], important: true }
    ]
  },
  'parkinsons': {
    sections: [
      { heading: 'Understanding Parkinson\'s Disease', content: 'Parkinson\'s disease is a progressive nervous system disorder that affects movement...', highlight: true },
      { heading: 'Medication Management', bullets: ['Take medications on schedule', 'Take with/without food as directed', 'Don\'t stop suddenly', 'Keep medication diary', 'Report wearing off effects', 'Store properly'], important: true },
      { heading: 'Daily Living Strategies', bullets: ['Exercise daily', 'Physical therapy', 'Move slowly', 'Practice balance exercises', 'Use assistive devices', 'Speak slowly', 'Take small bites', 'Sit upright when eating'] }
    ]
  },
  'catheter_care': {
    sections: [
      { heading: 'Daily Catheter Care', bullets: ['Wash hands before/after', 'Clean insertion site twice daily', 'Rinse and pat dry', 'Keep catheter secured', 'Avoid pulling', 'Check for kinks'] },
      { heading: 'Drainage Bag Care', bullets: ['Keep bag below bladder level', 'Empty when 2/3 full', 'Don\'t let spout touch toilet', 'Clean spout with alcohol', 'Use leg bag during day', 'Change bags weekly'] },
      { heading: 'Preventing Infection', bullets: ['Drink 8-10 glasses water', 'Clean site daily', 'Never disconnect unnecessarily', 'Shower instead of bath', 'Take prescribed antibiotics', 'Watch for infection signs'], important: true }
    ]
  },
  'tube_feeding': {
    sections: [
      { heading: 'Tube Site Care', bullets: ['Wash hands before touching', 'Clean around tube daily', 'Rotate tube gently', 'Check for redness/swelling', 'Keep site dry', 'Change dressing as instructed', 'Secure tube'] },
      { heading: 'Giving Feedings', bullets: ['Wash hands', 'Sit upright 30-45 degrees', 'Check tube placement', 'Flush tube with water', 'Use room temperature feeding', 'Control feeding rate', 'Stay upright 30-60 minutes after'] },
      { heading: 'Preventing Problems', bullets: ['Flush tube before/after feedings', 'Flush after medications', 'Keep head elevated', 'Give medications separately', 'Provide mouth care', 'Store formula properly', 'Discard unused formula'], important: true }
    ]
  },
  'hospice_comfort': {
    sections: [
      { heading: 'Understanding Hospice Care', content: 'Hospice care focuses on comfort and quality of life when curative treatment is no longer the goal...', highlight: true },
      { heading: 'Managing Common Symptoms', bullets: ['Give pain medications on schedule', 'Report uncontrolled pain', 'Use comfort measures', 'Keep environment calm', 'Elevate head of bed', 'Use fan for air circulation', 'Provide oxygen as prescribed'] },
      { heading: 'Providing Comfort', bullets: ['Keep patient clean and dry', 'Turn and reposition every 2 hours', 'Use soft pillows', 'Play soothing music', 'Read or talk about memories', 'Hold hands', 'Respect wishes for visitors', 'Maintain dignity'] },
      { heading: 'Caregiver Self-Care', bullets: ['Accept help from others', 'Take breaks', 'Eat regular meals and rest', 'Talk about your feelings', 'Call hospice team anytime', 'Remember: you are not alone'], important: true }
    ]
  }
};