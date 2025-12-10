import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

const LOGO_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee80d98929370f9e8f2932/c39653ba3_PennHomeHealthInc.png';

const handoutTemplates = {
  'chf': {
    title: 'Congestive Heart Failure (CHF)',
    sections: [
      {
        heading: 'What is CHF?',
        content: 'Congestive Heart Failure (CHF) occurs when your heart doesn\'t pump blood as well as it should. This causes fluid to build up in your lungs and other parts of your body.'
      },
      {
        heading: 'Warning Signs',
        bullets: [
          'Shortness of breath, especially when lying down',
          'Swelling in legs, ankles, or feet',
          'Rapid weight gain (2-3 pounds in a day)',
          'Persistent cough or wheezing',
          'Fatigue and weakness',
          'Irregular or rapid heartbeat'
        ]
      },
      {
        heading: 'Self-Care Tips',
        bullets: [
          'Weigh yourself daily at the same time',
          'Limit salt intake to less than 2 grams per day',
          'Limit fluid intake as directed by your doctor',
          'Take all medications as prescribed',
          'Elevate your legs when sitting',
          'Stay active with approved exercises'
        ]
      },
      {
        heading: 'When to Call Your Doctor',
        bullets: [
          'Weight gain of 2-3 pounds in one day or 5 pounds in a week',
          'Increased swelling in legs, ankles, or abdomen',
          'Increased shortness of breath',
          'New or worsening cough',
          'Difficulty sleeping due to breathing problems'
        ]
      },
      {
        heading: 'Emergency - Call 911 If:',
        bullets: [
          'Severe shortness of breath',
          'Chest pain or pressure',
          'Fainting or severe weakness',
          'Coughing up pink, frothy mucus'
        ]
      }
    ]
  },
  'copd': {
    title: 'Chronic Obstructive Pulmonary Disease (COPD)',
    sections: [
      {
        heading: 'What is COPD?',
        content: 'COPD is a chronic lung disease that makes it hard to breathe. It includes emphysema and chronic bronchitis. The airways become inflamed and narrowed, making it difficult to get air in and out of your lungs.'
      },
      {
        heading: 'Common Symptoms',
        bullets: [
          'Chronic cough with mucus',
          'Shortness of breath, especially during activities',
          'Wheezing',
          'Chest tightness',
          'Frequent respiratory infections',
          'Fatigue'
        ]
      },
      {
        heading: 'Managing Your COPD',
        bullets: [
          'STOP SMOKING - this is the most important step',
          'Use your inhalers exactly as prescribed',
          'Practice pursed-lip breathing',
          'Stay active with pulmonary rehabilitation',
          'Avoid lung irritants (smoke, dust, fumes)',
          'Get vaccinated (flu and pneumonia shots)'
        ]
      },
      {
        heading: 'Breathing Techniques',
        bullets: [
          'Pursed-lip breathing: Breathe in through nose, breathe out slowly through pursed lips',
          'Diaphragmatic breathing: Focus on belly breathing',
          'Take breaks during activities',
          'Use oxygen as prescribed'
        ]
      },
      {
        heading: 'Call Your Doctor If:',
        bullets: [
          'Increased shortness of breath',
          'Change in mucus color (yellow, green, or bloody)',
          'Increased cough or wheezing',
          'Fever over 100.4°F',
          'Confusion or extreme fatigue',
          'Chest pain'
        ]
      }
    ]
  },
  'diabetes': {
    title: 'Diabetes Management',
    sections: [
      {
        heading: 'Understanding Diabetes',
        content: 'Diabetes is a condition where your body cannot properly use or produce insulin, leading to high blood sugar levels. Managing your blood sugar is essential to prevent complications.'
      },
      {
        heading: 'Blood Sugar Targets',
        bullets: [
          'Before meals: 80-130 mg/dL',
          'Two hours after meals: Less than 180 mg/dL',
          'Bedtime: 100-140 mg/dL',
          'Your doctor may set different targets for you'
        ]
      },
      {
        heading: 'Daily Management',
        bullets: [
          'Check blood sugar as directed',
          'Take medications at the same time each day',
          'Eat regular, balanced meals',
          'Limit sugary foods and drinks',
          'Exercise regularly (30 minutes most days)',
          'Check your feet daily for cuts or sores'
        ]
      },
      {
        heading: 'Signs of Low Blood Sugar (Hypoglycemia)',
        bullets: [
          'Shaking or trembling',
          'Sweating',
          'Fast heartbeat',
          'Dizziness or lightheadedness',
          'Hunger',
          'Confusion or irritability',
          'TREAT IMMEDIATELY: 15g fast-acting carbs (juice, glucose tablets)'
        ]
      },
      {
        heading: 'Signs of High Blood Sugar (Hyperglycemia)',
        bullets: [
          'Increased thirst',
          'Frequent urination',
          'Blurred vision',
          'Fatigue',
          'Headache',
          'Slow-healing wounds'
        ]
      },
      {
        heading: 'Foot Care',
        bullets: [
          'Inspect feet daily for cuts, blisters, or redness',
          'Wash feet daily and dry thoroughly',
          'Never go barefoot',
          'Wear properly fitted shoes',
          'Trim toenails carefully',
          'Report any foot problems immediately'
        ]
      }
    ]
  },
  'hypertension': {
    title: 'High Blood Pressure (Hypertension)',
    sections: [
      {
        heading: 'What is High Blood Pressure?',
        content: 'High blood pressure occurs when the force of blood against your artery walls is too high. Often called the "silent killer," it usually has no symptoms but can lead to heart attack, stroke, and kidney disease.'
      },
      {
        heading: 'Blood Pressure Goals',
        bullets: [
          'Normal: Less than 120/80 mmHg',
          'Your target may be different based on your health',
          'Know your personal blood pressure goal'
        ]
      },
      {
        heading: 'Lifestyle Changes',
        bullets: [
          'Reduce sodium (salt) to less than 2,300mg per day',
          'Eat plenty of fruits, vegetables, and whole grains',
          'Limit alcohol consumption',
          'Quit smoking',
          'Maintain a healthy weight',
          'Exercise regularly (30 minutes most days)',
          'Manage stress through relaxation techniques'
        ]
      },
      {
        heading: 'Taking Your Blood Pressure at Home',
        bullets: [
          'Use a validated home blood pressure monitor',
          'Measure at the same time each day',
          'Sit quietly for 5 minutes before measuring',
          'Keep arm supported at heart level',
          'Take 2-3 readings, 1 minute apart',
          'Keep a log of your readings'
        ]
      },
      {
        heading: 'Medications',
        bullets: [
          'Take all medications as prescribed',
          'Don\'t stop medications without talking to your doctor',
          'Report side effects to your healthcare team',
          'Use a pill organizer to stay organized',
          'Refill prescriptions on time'
        ]
      },
      {
        heading: 'Call Your Doctor If:',
        bullets: [
          'Blood pressure is consistently above your target',
          'You experience side effects from medications',
          'Severe headache with blurred vision',
          'Chest pain or shortness of breath',
          'Nosebleeds that won\'t stop'
        ]
      }
    ]
  },
  'stroke': {
    title: 'Stroke Recovery and Prevention',
    sections: [
      {
        heading: 'What is a Stroke?',
        content: 'A stroke occurs when blood flow to part of the brain is blocked or a blood vessel bursts. Brain cells begin to die, which can cause lasting brain damage, disability, or death.'
      },
      {
        heading: 'Remember F.A.S.T.',
        bullets: [
          'F - Face drooping: Does one side of the face droop?',
          'A - Arm weakness: Is one arm weak or numb?',
          'S - Speech difficulty: Is speech slurred or hard to understand?',
          'T - Time to call 911: If you see any of these signs, call 911 immediately'
        ]
      },
      {
        heading: 'Recovery Tips',
        bullets: [
          'Attend all therapy sessions (physical, occupational, speech)',
          'Practice exercises at home as instructed',
          'Take medications to prevent another stroke',
          'Use assistive devices as recommended',
          'Ask for help when needed',
          'Be patient - recovery takes time'
        ]
      },
      {
        heading: 'Preventing Another Stroke',
        bullets: [
          'Control blood pressure',
          'Manage diabetes',
          'Lower cholesterol',
          'Quit smoking',
          'Eat a heart-healthy diet',
          'Exercise regularly',
          'Limit alcohol',
          'Take blood thinners as prescribed'
        ]
      },
      {
        heading: 'Safety at Home',
        bullets: [
          'Remove tripping hazards (rugs, cords)',
          'Install grab bars in bathroom',
          'Use non-slip mats in tub/shower',
          'Keep walkways clear and well-lit',
          'Wear non-slip footwear',
          'Keep frequently used items within easy reach'
        ]
      },
      {
        heading: 'Call 911 Immediately If:',
        bullets: [
          'New or worsening stroke symptoms',
          'Sudden severe headache',
          'Sudden vision changes',
          'Sudden trouble walking or balance problems',
          'Sudden confusion or trouble speaking'
        ]
      }
    ]
  },
  'wound_care': {
    title: 'Wound Care Instructions',
    sections: [
      {
        heading: 'Keeping Your Wound Clean',
        content: 'Proper wound care is essential for healing and preventing infection. Follow your nurse\'s instructions carefully.'
      },
      {
        heading: 'Daily Wound Care',
        bullets: [
          'Wash hands thoroughly before touching wound',
          'Clean wound as instructed by your nurse',
          'Apply dressings exactly as shown',
          'Keep wound dry between dressing changes',
          'Don\'t remove dressings unless instructed',
          'Dispose of used dressings in plastic bag'
        ]
      },
      {
        heading: 'Signs Your Wound is Healing',
        bullets: [
          'Wound is getting smaller',
          'Less drainage',
          'Pink or red tissue in wound bed',
          'Less pain',
          'No foul odor'
        ]
      },
      {
        heading: 'Signs of Infection - Call Your Nurse',
        bullets: [
          'Increased redness around wound',
          'Increased swelling',
          'Increased pain',
          'Warmth around wound',
          'Pus or cloudy drainage',
          'Foul odor',
          'Fever over 100.4°F',
          'Red streaks from wound',
          'Wound getting larger instead of smaller'
        ]
      },
      {
        heading: 'Promoting Healing',
        bullets: [
          'Eat a balanced diet with protein',
          'Stay hydrated - drink 6-8 glasses of water daily',
          'Take vitamins as prescribed',
          'Elevate affected area when possible',
          'Avoid smoking - it slows healing',
          'Keep blood sugar controlled if diabetic',
          'Follow weight-bearing restrictions'
        ]
      },
      {
        heading: 'Supplies',
        bullets: [
          'Keep enough supplies on hand',
          'Store in a clean, dry place',
          'Check expiration dates',
          'Reorder before running out',
          'Tell your nurse if supplies are low'
        ]
      }
    ]
  },
  'fall_prevention': {
    title: 'Fall Prevention at Home',
    sections: [
      {
        heading: 'Why Fall Prevention Matters',
        content: 'Falls are a leading cause of injury in older adults. Most falls happen at home. The good news is that many falls can be prevented with simple changes to your home and habits.'
      },
      {
        heading: 'Home Safety Checklist',
        bullets: [
          'Remove throw rugs or secure with non-slip backing',
          'Keep floors clear of clutter, cords, and small objects',
          'Install grab bars in bathroom (tub, shower, toilet)',
          'Use non-slip mats in tub and shower',
          'Ensure good lighting in all rooms and hallways',
          'Use nightlights in bedroom, bathroom, and hallways',
          'Keep stairways clear and well-lit',
          'Install handrails on both sides of stairs',
          'Secure loose carpeting',
          'Store frequently used items within easy reach'
        ]
      },
      {
        heading: 'Personal Safety',
        bullets: [
          'Wear non-slip, well-fitting footwear',
          'Don\'t wear loose clothing that can cause tripping',
          'Use assistive devices (cane, walker) as prescribed',
          'Rise slowly from sitting or lying position',
          'Don\'t rush - take your time',
          'Turn on lights before entering a room',
          'Use step stool with handle, never stand on chairs',
          'Keep phone within reach',
          'Consider a medical alert system'
        ]
      },
      {
        heading: 'Medications and Falls',
        bullets: [
          'Some medications can cause dizziness or drowsiness',
          'Review all medications with your doctor',
          'Be extra careful when starting new medications',
          'Don\'t mix alcohol with medications',
          'Stand up slowly if medications cause dizziness'
        ]
      },
      {
        heading: 'Stay Strong and Active',
        bullets: [
          'Exercise regularly to maintain strength and balance',
          'Practice balance exercises as recommended',
          'Stay active but know your limits',
          'Have vision checked yearly',
          'Eat a healthy diet to maintain bone strength',
          'Get adequate calcium and vitamin D'
        ]
      },
      {
        heading: 'If You Do Fall',
        bullets: [
          'Stay calm',
          'Check for injuries before getting up',
          'Roll to your side, push up to hands and knees',
          'Crawl to sturdy furniture and pull yourself up',
          'Rest before resuming activities',
          'Call for help if you can\'t get up',
          'Tell your doctor about all falls'
        ]
      }
    ]
  },
  'pain_management': {
    title: 'Pain Management',
    sections: [
      {
        heading: 'Understanding Pain',
        content: 'Pain is your body\'s way of signaling that something needs attention. Managing pain effectively helps you heal, stay active, and maintain quality of life.'
      },
      {
        heading: 'Describing Your Pain',
        content: 'Help your healthcare team understand your pain by describing:',
        bullets: [
          'Location: Where exactly does it hurt?',
          'Intensity: On a scale of 0-10, how severe is it?',
          'Quality: Sharp, dull, burning, aching, shooting?',
          'Timing: Constant or comes and goes?',
          'What makes it better or worse?',
          'How it affects your daily activities'
        ]
      },
      {
        heading: 'Medication Safety',
        bullets: [
          'Take pain medication as prescribed',
          'Don\'t wait until pain is severe - stay ahead of it',
          'Take with food if it upsets your stomach',
          'Don\'t mix with alcohol',
          'Store medications safely away from children',
          'Dispose of unused medications properly',
          'Tell your doctor about all medications you take',
          'Report side effects immediately'
        ]
      },
      {
        heading: 'Non-Drug Pain Relief',
        bullets: [
          'Apply ice for acute injuries (first 48 hours)',
          'Apply heat for chronic pain or muscle tension',
          'Practice deep breathing and relaxation',
          'Try meditation or guided imagery',
          'Use distraction (music, TV, reading)',
          'Gentle exercise or stretching',
          'Massage',
          'Position changes',
          'Rest when needed'
        ]
      },
      {
        heading: 'When to Call Your Doctor',
        bullets: [
          'Pain is not controlled with prescribed medications',
          'New or different pain',
          'Pain interferes with sleep or daily activities',
          'Side effects from pain medications',
          'Signs of infection (fever, redness, swelling)',
          'Chest pain or shortness of breath',
          'Severe abdominal pain'
        ]
      }
    ]
  },
  'ckd': {
    title: 'Chronic Kidney Disease (CKD)',
    sections: [
      {
        heading: 'What is Chronic Kidney Disease?',
        content: 'Chronic Kidney Disease means your kidneys are damaged and can\'t filter blood the way they should. This can cause waste to build up in your body and lead to other health problems.',
        highlight: true
      },
      {
        heading: 'Understanding Your Stage',
        content: 'CKD has 5 stages based on how well your kidneys work:',
        bullets: [
          'Stage 1-2: Mild kidney damage with normal or slightly reduced function',
          'Stage 3: Moderate kidney damage (3A mild to moderate, 3B moderate to severe)',
          'Stage 4: Severe kidney damage - prepare for kidney replacement therapy',
          'Stage 5: Kidney failure - dialysis or transplant needed'
        ]
      },
      {
        heading: 'Managing Your Diet',
        subsections: [
          {
            subheading: 'Protein',
            bullets: ['Moderate protein intake as directed by your dietitian', 'Choose high-quality proteins (chicken, fish, eggs)']
          },
          {
            subheading: 'Sodium',
            bullets: ['Limit to 2,000mg or less per day', 'Avoid processed and canned foods', 'Use herbs and spices instead of salt']
          },
          {
            subheading: 'Potassium',
            bullets: ['May need to limit high-potassium foods (bananas, oranges, potatoes)', 'Ask your doctor if potassium restriction is needed']
          },
          {
            subheading: 'Phosphorus',
            bullets: ['Limit dairy, nuts, beans, and dark sodas', 'Take phosphate binders with meals as prescribed']
          }
        ]
      },
      {
        heading: 'Daily Management',
        bullets: [
          'Take all medications exactly as prescribed',
          'Monitor blood pressure daily',
          'Stay hydrated unless fluid restricted',
          'Exercise regularly (30 minutes most days)',
          'Avoid NSAIDs (ibuprofen, naproxen) - use acetaminophen instead',
          'Keep all doctor appointments and lab tests'
        ]
      },
      {
        heading: 'Warning Signs - Call Your Doctor',
        important: true,
        bullets: [
          'Swelling in legs, ankles, feet, or face',
          'Shortness of breath',
          'Extreme fatigue or weakness',
          'Nausea, vomiting, loss of appetite',
          'Changes in urination (amount, color, frequency)',
          'Confusion or difficulty concentrating',
          'Chest pain or pressure',
          'Persistent itching'
        ]
      }
    ]
  },
  'osteoporosis': {
    title: 'Osteoporosis and Bone Health',
    sections: [
      {
        heading: 'Understanding Osteoporosis',
        content: 'Osteoporosis is a condition where bones become weak and brittle, making them more likely to break from minor falls or even simple activities like coughing or bending.',
        highlight: true
      },
      {
        heading: 'Risk Factors You Can\'t Change',
        bullets: [
          'Age over 50',
          'Female gender (especially after menopause)',
          'Family history of osteoporosis or fractures',
          'Small body frame',
          'Previous fracture after age 50'
        ]
      },
      {
        heading: 'Risk Factors You Can Change',
        bullets: [
          'Low calcium and vitamin D intake',
          'Lack of exercise',
          'Smoking',
          'Excessive alcohol consumption',
          'Low body weight',
          'Certain medications (long-term steroids)'
        ]
      },
      {
        heading: 'Building Strong Bones',
        subsections: [
          {
            subheading: 'Nutrition',
            bullets: [
              'Get 1,200mg calcium daily (dairy, leafy greens, fortified foods)',
              'Take 800-1,000 IU vitamin D daily',
              'Eat protein at each meal',
              'Limit caffeine and carbonated drinks'
            ]
          },
          {
            subheading: 'Exercise',
            bullets: [
              'Weight-bearing exercises (walking, dancing, tennis)',
              'Strength training 2-3 times per week',
              'Balance exercises to prevent falls',
              'Tai chi or yoga for flexibility and balance'
            ]
          },
          {
            subheading: 'Medications',
            bullets: [
              'Take osteoporosis medications exactly as prescribed',
              'Follow special instructions (some must be taken on empty stomach)',
              'Report any side effects to your doctor',
              'Don\'t stop medications without consulting your doctor'
            ]
          }
        ]
      },
      {
        heading: 'Fall Prevention',
        bullets: [
          'Remove tripping hazards at home',
          'Install grab bars in bathroom',
          'Use non-slip mats',
          'Ensure good lighting throughout home',
          'Wear supportive, non-slip shoes',
          'Have vision checked regularly',
          'Review medications that may cause dizziness'
        ]
      },
      {
        heading: 'When to Call Your Doctor',
        bullets: [
          'You have a fall, even if no obvious injury',
          'Sudden severe back pain',
          'Loss of height or stooped posture',
          'Difficulty with daily activities due to pain',
          'Side effects from osteoporosis medications'
        ]
      }
    ]
  },
  'dementia_care': {
    title: 'Dementia and Memory Care',
    sections: [
      {
        heading: 'Understanding Dementia',
        content: 'Dementia is not a single disease but a general term for a decline in mental ability severe enough to interfere with daily life. Alzheimer\'s disease is the most common type of dementia.',
        highlight: true
      },
      {
        heading: 'Common Signs and Symptoms',
        bullets: [
          'Memory loss that disrupts daily life',
          'Challenges in planning or solving problems',
          'Difficulty completing familiar tasks',
          'Confusion with time or place',
          'Trouble understanding visual images or spatial relationships',
          'Problems with words in speaking or writing',
          'Misplacing things and losing ability to retrace steps',
          'Decreased or poor judgment',
          'Withdrawal from work or social activities',
          'Changes in mood and personality'
        ]
      },
      {
        heading: 'Communication Strategies',
        subsections: [
          {
            subheading: 'Do',
            bullets: [
              'Speak slowly and clearly',
              'Use simple words and short sentences',
              'Give one instruction at a time',
              'Allow plenty of time for response',
              'Use touch and eye contact',
              'Show respect and avoid talking down'
            ]
          },
          {
            subheading: 'Don\'t',
            bullets: [
              'Argue or try to convince',
              'Ask "don\'t you remember?"',
              'Say "I just told you that"',
              'Talk about the person as if they aren\'t there',
              'Raise your voice or use a harsh tone'
            ]
          }
        ]
      },
      {
        heading: 'Daily Care Tips',
        bullets: [
          'Establish a daily routine and stick to it',
          'Keep environment calm and predictable',
          'Use memory aids (calendars, labels, photos)',
          'Simplify tasks - break into small steps',
          'Reduce clutter and distractions',
          'Ensure adequate lighting',
          'Monitor for signs of pain or discomfort',
          'Encourage independence in safe activities'
        ]
      },
      {
        heading: 'Managing Challenging Behaviors',
        subsections: [
          {
            subheading: 'Agitation or Aggression',
            bullets: [
              'Stay calm and reassuring',
              'Try to identify triggers',
              'Redirect attention to something pleasant',
              'Provide a quiet, calming environment'
            ]
          },
          {
            subheading: 'Wandering',
            bullets: [
              'Ensure doors and windows are secure',
              'Consider ID bracelet with contact information',
              'Provide safe space to walk',
              'Redirect to another activity'
            ]
          },
          {
            subheading: 'Sundowning (late-day confusion)',
            bullets: [
              'Maintain consistent schedule',
              'Limit caffeine and naps',
              'Ensure adequate lighting in evening',
              'Reduce noise and activity in evening'
            ]
          }
        ]
      },
      {
        heading: 'Caregiver Self-Care',
        important: true,
        bullets: [
          'Take breaks - you can\'t pour from an empty cup',
          'Accept help from family and friends',
          'Join a support group',
          'Maintain your own health appointments',
          'Stay physically active',
          'Get adequate sleep',
          'Seek professional help if feeling overwhelmed'
        ]
      },
      {
        heading: 'When to Call for Help',
        bullets: [
          'Significant changes in behavior or abilities',
          'Signs of depression or anxiety',
          'Difficulty managing medications',
          'Safety concerns at home',
          'Caregiver stress or burnout',
          'Physical aggression or threats',
          'Inability to meet basic needs'
        ]
      }
    ]
  },
  'anticoagulation': {
    title: 'Blood Thinner (Anticoagulation) Management',
    sections: [
      {
        heading: 'Why You\'re Taking Blood Thinners',
        content: 'Blood thinners (anticoagulants) help prevent blood clots that can cause heart attack, stroke, or other serious conditions. Common reasons include atrial fibrillation, previous blood clots, mechanical heart valves, or other heart conditions.',
        highlight: true
      },
      {
        heading: 'Common Blood Thinners',
        bullets: [
          'Warfarin (Coumadin) - requires regular INR monitoring',
          'Apixaban (Eliquis)',
          'Rivaroxaban (Xarelto)',
          'Dabigatran (Pradaxa)',
          'Edoxaban (Savaysa)',
          'Enoxaparin (Lovenox) - injection'
        ]
      },
      {
        heading: 'Taking Your Medication Safely',
        important: true,
        bullets: [
          'Take exactly as prescribed - never skip or double doses',
          'Take at the same time every day',
          'Don\'t stop taking without talking to your doctor',
          'Tell all healthcare providers you take blood thinners',
          'Carry a card or wear medical alert jewelry',
          'Keep all INR monitoring appointments (if on warfarin)',
          'Report any missed doses to your doctor'
        ]
      },
      {
        heading: 'Diet Considerations',
        subsections: [
          {
            subheading: 'If Taking Warfarin',
            bullets: [
              'Be consistent with vitamin K intake (leafy greens)',
              'Don\'t make sudden diet changes',
              'Limit alcohol to 1-2 drinks per day',
              'Avoid cranberry juice and grapefruit juice'
            ]
          },
          {
            subheading: 'If Taking Other Blood Thinners',
            bullets: [
              'No special diet restrictions',
              'Limit alcohol consumption',
              'Stay well hydrated',
              'Maintain balanced, healthy diet'
            ]
          }
        ]
      },
      {
        heading: 'Safety Precautions',
        bullets: [
          'Use electric razor instead of blade',
          'Use soft toothbrush and waxed dental floss',
          'Wear gloves when gardening or doing yard work',
          'Avoid contact sports and activities with high fall risk',
          'Be careful with sharp objects (knives, scissors)',
          'Avoid going barefoot',
          'Don\'t take aspirin or NSAIDs unless approved by doctor',
          'Check with doctor before taking any new medications or supplements'
        ]
      },
      {
        heading: 'Warning Signs of Bleeding',
        important: true,
        bullets: [
          'Unusual bruising or bleeding',
          'Nosebleeds that won\'t stop',
          'Bleeding gums',
          'Blood in urine (pink, red, or dark brown)',
          'Blood in stool (red or black, tarry stools)',
          'Vomiting blood or material that looks like coffee grounds',
          'Coughing up blood',
          'Heavier than normal menstrual bleeding',
          'Severe headache or dizziness'
        ]
      },
      {
        heading: 'CALL 911 IMMEDIATELY IF:',
        emergency: true,
        bullets: [
          'Severe headache or confusion',
          'Difficulty speaking or vision changes',
          'Weakness or numbness on one side',
          'Chest pain or pressure',
          'Severe shortness of breath',
          'Severe abdominal pain',
          'Major fall or head injury',
          'Uncontrolled bleeding'
        ]
      }
    ]
  },
  'nutrition': {
    title: 'Healthy Eating for Seniors',
    sections: [
      {
        heading: 'Why Good Nutrition Matters',
        content: 'Proper nutrition helps maintain strength, energy, immune function, and overall health. As we age, our nutritional needs change, and eating well becomes even more important for preventing disease and maintaining independence.',
        highlight: true
      },
      {
        heading: 'Essential Nutrients',
        subsections: [
          {
            subheading: 'Protein',
            bullets: [
              'Builds and maintains muscle mass',
              'Aim for protein at every meal',
              'Good sources: lean meats, fish, eggs, dairy, beans, nuts'
            ]
          },
          {
            subheading: 'Fiber',
            bullets: [
              'Promotes digestive health',
              'Aim for 25-30 grams daily',
              'Good sources: whole grains, fruits, vegetables, beans'
            ]
          },
          {
            subheading: 'Calcium and Vitamin D',
            bullets: [
              'Essential for bone health',
              '1,200mg calcium and 800-1,000 IU vitamin D daily',
              'Sources: dairy, fortified foods, fatty fish, sunshine'
            ]
          },
          {
            subheading: 'B Vitamins',
            bullets: [
              'Support energy and brain function',
              'Sources: whole grains, leafy greens, eggs, meat',
              'May need B12 supplement - ask your doctor'
            ]
          }
        ]
      },
      {
        heading: 'Building a Healthy Plate',
        bullets: [
          'Half your plate: colorful fruits and vegetables',
          'Quarter of your plate: lean protein',
          'Quarter of your plate: whole grains',
          'Include low-fat dairy or alternative',
          'Use healthy fats in moderation (olive oil, nuts, avocado)',
          'Drink water throughout the day'
        ]
      },
      {
        heading: 'Overcoming Common Challenges',
        subsections: [
          {
            subheading: 'Loss of Appetite',
            bullets: [
              'Eat smaller, more frequent meals',
              'Choose nutrient-dense foods',
              'Make meals social and enjoyable',
              'Try light exercise to stimulate appetite'
            ]
          },
          {
            subheading: 'Difficulty Chewing or Swallowing',
            bullets: [
              'Choose softer foods or modify texture',
              'Use sauces and gravies to moisten foods',
              'Cut food into small pieces',
              'Try smoothies and soups',
              'See dentist if dental issues'
            ]
          },
          {
            subheading: 'Changes in Taste',
            bullets: [
              'Use herbs and spices for flavor',
              'Vary food temperature and texture',
              'Try new foods and recipes',
              'Limit salt - use lemon, garlic, herbs instead'
            ]
          }
        ]
      },
      {
        heading: 'Meal Planning Tips',
        bullets: [
          'Keep nutritious snacks on hand',
          'Prepare meals in batches and freeze portions',
          'Make use of healthy convenience foods',
          'Consider meal delivery services if needed',
          'Shop with a list to avoid impulse purchases',
          'Read nutrition labels',
          'Stock pantry with staples'
        ]
      },
      {
        heading: 'Staying Hydrated',
        important: true,
        bullets: [
          'Drink 6-8 glasses of water daily',
          'Don\'t wait until thirsty to drink',
          'Limit caffeine and alcohol',
          'Eat water-rich foods (fruits, vegetables, soups)',
          'Keep water bottle handy',
          'Watch for signs of dehydration: dark urine, dizziness, confusion'
        ]
      }
    ]
  },
  'copd_oxygen': {
    title: 'Home Oxygen Therapy for COPD',
    sections: [
      {
        heading: 'Why You Need Oxygen',
        content: 'Supplemental oxygen helps ensure your body gets the oxygen it needs when your lungs can\'t provide enough on their own. Proper oxygen use can improve your energy, reduce shortness of breath, and protect your heart and other organs.',
        highlight: true
      },
      {
        heading: 'Understanding Your Prescription',
        bullets: [
          'Your doctor prescribes specific oxygen flow rate (liters per minute)',
          'Follow your prescription exactly - don\'t adjust on your own',
          'You may have different rates for rest, activity, and sleep',
          'Keep your prescription information with your equipment',
          'Oxygen is a medication - treat it as such'
        ]
      },
      {
        heading: 'Types of Oxygen Equipment',
        subsections: [
          {
            subheading: 'Oxygen Concentrator',
            bullets: [
              'Runs on electricity',
              'Takes oxygen from room air',
              'Most common for home use',
              'Keep backup portable system'
            ]
          },
          {
            subheading: 'Portable Oxygen Concentrator (POC)',
            bullets: [
              'Battery powered for mobility',
              'Lighter weight for travel',
              'Allows more independence'
            ]
          },
          {
            subheading: 'Oxygen Tanks',
            bullets: [
              'Compressed gas in cylinders',
              'Portable options available',
              'Good for backup/emergencies'
            ]
          }
        ]
      },
      {
        heading: 'Using Your Oxygen Safely',
        important: true,
        bullets: [
          'NO SMOKING - you, visitors, or anyone in the home',
          'Keep oxygen away from open flames, candles, gas stoves',
          'Stay at least 5-10 feet from heat sources',
          'Don\'t use aerosol products near oxygen',
          'Keep oxygen equipment away from oils and greases',
          'Post "No Smoking - Oxygen in Use" signs',
          'Know where fire extinguisher is located',
          'Have working smoke detectors'
        ]
      },
      {
        heading: 'Daily Oxygen Use',
        bullets: [
          'Use oxygen as prescribed - typically 15+ hours daily',
          'Wear during sleep if prescribed',
          'Use during activities and exercise',
          'Check tubing daily for kinks or damage',
          'Clean nasal cannula weekly with mild soap and water',
          'Keep extra supplies on hand (tubing, cannulas)',
          'Arrange equipment to prevent tripping',
          'Keep oxygen supplier\'s phone number handy'
        ]
      },
      {
        heading: 'Traveling with Oxygen',
        bullets: [
          'Contact oxygen supplier 2 weeks before travel',
          'Airlines require advance notice for oxygen',
          'Bring extra supplies and batteries',
          'Keep prescription information with you',
          'Know location of oxygen suppliers at destination',
          'Plan for power outages with backup system'
        ]
      },
      {
        heading: 'Troubleshooting',
        subsections: [
          {
            subheading: 'Equipment Not Working',
            bullets: [
              'Check power source and connections',
              'Ensure tubing not kinked',
              'Switch to backup system if available',
              'Contact supplier for emergencies'
            ]
          },
          {
            subheading: 'Still Short of Breath',
            bullets: [
              'Verify oxygen is flowing',
              'Check flow rate matches prescription',
              'Try pursed-lip breathing',
              'Rest and use oxygen continuously',
              'Call doctor if not improving'
            ]
          }
        ]
      },
      {
        heading: 'When to Call Your Doctor',
        bullets: [
          'Increased shortness of breath despite oxygen',
          'Needing higher flow rates than prescribed',
          'Chest pain or irregular heartbeat',
          'Confusion or extreme drowsiness',
          'Headaches, especially in morning',
          'Bluish color to lips or fingernails',
          'Swelling in ankles or legs'
        ]
      }
    ]
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { condition, patientName, patientEmail, action, selectedSections, customNotes } = await req.json();
    
    if (!condition || !handoutTemplates[condition]) {
      return Response.json({ error: 'Invalid condition' }, { status: 400 });
    }

    const template = handoutTemplates[condition];
    
    // Create PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPos = margin;

    // Skip logo in Deno environment (FileReader not available)
    yPos += 10;

    // Title
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text(template.title, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Patient name if provided
    if (patientName) {
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      doc.text(`Prepared for: ${patientName}`, margin, yPos);
      yPos += 10;
    }

    // Date
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, yPos);
    yPos += 15;
    doc.setTextColor(0);

    // Filter sections based on selection
    const sectionsToInclude = selectedSections 
      ? template.sections.filter(section => selectedSections[section.heading]?.included)
      : template.sections;

    // Content sections
    doc.setFontSize(11);
    sectionsToInclude.forEach(section => {
      // Check if we need a new page
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = margin;
      }

      // Section heading with color coding
      doc.setFont(undefined, 'bold');
      doc.setFontSize(14);
      
      // Color code based on section type
      if (section.emergency) {
        doc.setTextColor(220, 38, 38); // Red for emergency
      } else if (section.important) {
        doc.setTextColor(234, 88, 12); // Orange for important
      } else {
        doc.setTextColor(0);
      }
      
      doc.text(section.heading, margin, yPos);
      yPos += 8;
      doc.setTextColor(0); // Reset color

      // Section content with optional highlight
      doc.setFont(undefined, 'normal');
      doc.setFontSize(11);
      
      if (section.content) {
        // Highlight box for special content
        if (section.highlight) {
          doc.setFillColor(219, 234, 254); // Light blue background
          const contentHeight = doc.splitTextToSize(section.content, pageWidth - 2 * margin - 10).length * 6 + 6;
          doc.rect(margin, yPos - 4, pageWidth - 2 * margin, contentHeight, 'F');
        }
        
        const lines = doc.splitTextToSize(section.content, pageWidth - 2 * margin - (section.highlight ? 10 : 0));
        lines.forEach(line => {
          if (yPos > pageHeight - 20) {
            doc.addPage();
            yPos = margin;
          }
          doc.text(line, margin + (section.highlight ? 5 : 0), yPos);
          yPos += 6;
        });
        yPos += 5;
      }

      // Handle subsections
      if (section.subsections) {
        section.subsections.forEach(subsection => {
          if (yPos > pageHeight - 30) {
            doc.addPage();
            yPos = margin;
          }
          
          // Subsection heading
          doc.setFont(undefined, 'bold');
          doc.setFontSize(12);
          doc.setTextColor(59, 130, 246); // Blue for subsections
          doc.text(`  ${subsection.subheading}`, margin, yPos);
          yPos += 7;
          doc.setTextColor(0);
          doc.setFont(undefined, 'normal');
          doc.setFontSize(11);
          
          // Subsection bullets
          if (subsection.bullets) {
            subsection.bullets.forEach(bullet => {
              if (yPos > pageHeight - 20) {
                doc.addPage();
                yPos = margin;
              }
              const bulletLines = doc.splitTextToSize(`    • ${bullet}`, pageWidth - 2 * margin - 10);
              bulletLines.forEach((line, idx) => {
                doc.text(line, margin + (idx === 0 ? 5 : 10), yPos);
                yPos += 6;
              });
            });
          }
          yPos += 3;
        });
      }

      // Regular bullets
      if (section.bullets) {
        // Filter bullets based on selection
        const bulletsToInclude = selectedSections?.[section.heading]?.bullets
          ? section.bullets.filter((bullet, idx) => selectedSections[section.heading].bullets[idx])
          : section.bullets;
        
        bulletsToInclude.forEach(bullet => {
          if (yPos > pageHeight - 20) {
            doc.addPage();
            yPos = margin;
          }
          const bulletLines = doc.splitTextToSize(`• ${bullet}`, pageWidth - 2 * margin - 5);
          bulletLines.forEach((line, idx) => {
            doc.text(line, margin + (idx === 0 ? 0 : 5), yPos);
            yPos += 6;
          });
        });
        yPos += 3;
      }
      
      yPos += 5;
    });

    // Custom notes section
    if (customNotes && customNotes.trim()) {
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = margin;
      }
      
      yPos += 10;
      doc.setFont(undefined, 'bold');
      doc.setFontSize(14);
      doc.setTextColor(59, 130, 246); // Blue color
      doc.text('Special Instructions from Your Nurse', margin, yPos);
      yPos += 8;
      
      doc.setFont(undefined, 'normal');
      doc.setFontSize(11);
      doc.setTextColor(0);
      const notesLines = doc.splitTextToSize(customNotes, pageWidth - 2 * margin);
      notesLines.forEach(line => {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = margin;
        }
        doc.text(line, margin, yPos);
        yPos += 6;
      });
      yPos += 10;
    }

    // Footer
    const footerY = pageHeight - 15;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text('Penn Home Health Inc. | For questions, contact your nurse', pageWidth / 2, footerY, { align: 'center' });
    doc.text('This information is for educational purposes only. Always follow your doctor\'s advice.', pageWidth / 2, footerY + 5, { align: 'center' });

    // Generate PDF
    const pdfBytes = doc.output('arraybuffer');
    const base64Pdf = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));

    // If action is email, send it
    if (action === 'email' && patientEmail) {
      await base44.integrations.Core.SendEmail({
        to: patientEmail,
        subject: `Patient Education: ${template.title}`,
        body: `
          <p>Dear ${patientName || 'Patient'},</p>
          
          <p>Attached is educational information about ${template.title} from Penn Home Health Inc.</p>
          
          <p>Please review this information and contact your nurse if you have any questions.</p>
          
          <p>Best regards,<br>Penn Home Health Team</p>
        `
      });

      return Response.json({ 
        success: true, 
        message: `Handout emailed to ${patientEmail}` 
      });
    }

    // Return PDF as base64 for download
    return Response.json({
      success: true,
      pdf: base64Pdf,
      filename: `${condition}_handout.pdf`
    });

  } catch (error) {
    console.error('Error generating handout:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});