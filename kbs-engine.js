/* ============================================================
   KBS MEDICAL TRIAGE ENGINE
   Knowledge-Based System with NLP Symptom Parser
   ESI (Emergency Severity Index) Protocol — 5 Levels
   ============================================================ */

// ─────────────────────────────────────────────────────────────
// SECTION 1: NLP SYMPTOM LEXICON
// Maps natural language phrases → medical concepts with weights
// ─────────────────────────────────────────────────────────────
const SYMPTOM_LEXICON = [
  // CARDIAC
  { concepts: ['chest pain','chest hurt','chest tight','chest pressure','chest heaviness','chest discomfort','heart pain','chest ache','sternum pain','substernal','radiating to arm','radiating to jaw','left arm pain with chest','squeezing chest'],
    id: 'chest_pain', label: 'Chest Pain', system: 'cardiac', baseWeight: 0.95 },
  { concepts: ['palpitation','heart racing','heart pounding','fast heartbeat','rapid heart','heart flutter','heart skip','irregular heartbeat','my heart is beating fast','tachycardia'],
    id: 'palpitations', label: 'Palpitations', system: 'cardiac', baseWeight: 0.60 },

  // RESPIRATORY
  { concepts: ['difficulty breathing','can\'t breathe','hard to breathe','shortness of breath','short of breath','sob','breathless','out of breath','respiratory distress','gasping','choking','wheezing','no air'],
    id: 'dyspnea', label: 'Difficulty Breathing', system: 'respiratory', baseWeight: 0.90 },
  { concepts: ['cough','coughing','coughing up blood','hemoptysis','persistent cough'],
    id: 'cough', label: 'Cough', system: 'respiratory', baseWeight: 0.30 },

  // NEUROLOGICAL
  { concepts: ['unconscious','unresponsive','not waking','passed out','fainted','syncope','lost consciousness','collapsed','blacked out','no response'],
    id: 'unconscious', label: 'Unconscious / Unresponsive', system: 'neuro', baseWeight: 1.0 },
  { concepts: ['seizure','convulsion','fitting','shaking uncontrollably','epileptic','jerking movements','trembling badly'],
    id: 'seizure', label: 'Active Seizure', system: 'neuro', baseWeight: 1.0 },
  { concepts: ['stroke','face drooping','face droop','arm weak','slurred speech','speech problem','can\'t speak','sudden confusion','sudden headache','sudden weakness','facial droop','fast test','speech difficulty','sudden vision'],
    id: 'stroke_signs', label: 'Stroke Signs (FAST)', system: 'neuro', baseWeight: 0.98 },
  { concepts: ['headache','head pain','migraine','head ache','throbbing head','head is pounding','head is splitting'],
    id: 'headache', label: 'Headache', system: 'neuro', baseWeight: 0.40 },
  { concepts: ['dizziness','dizzy','lightheaded','light headed','vertigo','spinning','room spinning','balance problem','unsteady'],
    id: 'dizziness', label: 'Dizziness / Vertigo', system: 'neuro', baseWeight: 0.50 },
  { concepts: ['confusion','confused','disoriented','not making sense','altered mental','can\'t think','not lucid','delirious','delirium'],
    id: 'confusion', label: 'Confusion / Altered Mental', system: 'neuro', baseWeight: 0.80 },
  { concepts: ['numbness','tingling','pins and needles','can\'t feel','loss of sensation','numb'],
    id: 'numbness', label: 'Numbness / Tingling', system: 'neuro', baseWeight: 0.50 },

  // HAEMORRHAGE / TRAUMA
  { concepts: ['bleeding','blood','hemorrhage','haemorrhage','blood loss','bleeding out','blood everywhere','uncontrolled bleeding','heavy bleeding'],
    id: 'bleeding', label: 'Bleeding / Hemorrhage', system: 'trauma', baseWeight: 0.85 },
  { concepts: ['injury','trauma','accident','fall','hit','struck','collision','crash','wound','laceration','cut deep','cut badly'],
    id: 'trauma', label: 'Physical Trauma / Injury', system: 'trauma', baseWeight: 0.65 },
  { concepts: ['fracture','broken bone','bone broke','can\'t move arm','can\'t move leg','deformity','bone sticking'],
    id: 'fracture', label: 'Suspected Fracture', system: 'trauma', baseWeight: 0.60 },
  { concepts: ['head injury','hit head','head trauma','fell on head','head hit'],
    id: 'head_injury', label: 'Head Injury', system: 'trauma', baseWeight: 0.80 },
  { concepts: ['burn','burned','scald','scalded','fire injury'],
    id: 'burns', label: 'Burns', system: 'trauma', baseWeight: 0.75 },

  // ALLERGIC / ANAPHYLAXIS
  { concepts: ['allergic reaction','allergy','anaphylaxis','anaphylactic','throat closing','throat swelling','tongue swelling','lips swelling','hives','urticaria','swollen throat','can\'t swallow','bee sting','wasp sting'],
    id: 'anaphylaxis', label: 'Anaphylaxis / Severe Allergy', system: 'allergy', baseWeight: 0.95 },

  // GASTROINTESTINAL
  { concepts: ['abdominal pain','stomach pain','belly pain','gut pain','tummy ache','stomach ache','abdomen hurts','cramping','cramps','lower abdominal','upper abdominal','stomach is hurting'],
    id: 'abdominal_pain', label: 'Abdominal Pain', system: 'gi', baseWeight: 0.55 },
  { concepts: ['vomiting','vomit','throwing up','nausea','nauseous','sick to stomach','puking'],
    id: 'vomiting', label: 'Nausea / Vomiting', system: 'gi', baseWeight: 0.30 },
  { concepts: ['blood in stool','bloody stool','rectal bleeding','blood from rectum','dark stool','melena'],
    id: 'gi_bleed', label: 'GI Bleed', system: 'gi', baseWeight: 0.85 },
  { concepts: ['diarrhea','diarrhoea','loose stool','watery stool'],
    id: 'diarrhea', label: 'Diarrhea', system: 'gi', baseWeight: 0.20 },

  // FEVER / INFECTION
  { concepts: ['fever','high temperature','hot body','body is hot','feeling hot','temperature high','pyrexia','burning up','chills and fever','shivering with fever','rigors'],
    id: 'fever', label: 'Fever', system: 'infection', baseWeight: 0.45 },
  { concepts: ['infection','infected','sepsis','septic','pus','abscess'],
    id: 'infection', label: 'Infection / Sepsis Signs', system: 'infection', baseWeight: 0.65 },

  // PAIN MODIFIERS (general)
  { concepts: ['severe pain','excruciating','unbearable pain','worst pain','extreme pain','intense pain','agonizing'],
    id: 'severe_pain', label: 'Severe Pain', system: 'pain', baseWeight: 0.80 },

  // UROLOGICAL / OB-GYN
  { concepts: ['urinary','can\'t urinate','no urine','burning urination','painful urination','uti','frequent urination'],
    id: 'urinary', label: 'Urinary Complaint', system: 'urology', baseWeight: 0.25 },
  { concepts: ['pregnancy complication','pregnant','contractions','water broke','labor','labour','vaginal bleeding pregnant'],
    id: 'obstetric', label: 'Obstetric Emergency', system: 'obgyn', baseWeight: 0.90 },

  // MENTAL HEALTH
  { concepts: ['suicidal','want to die','kill myself','self harm','overdose','took too many pills','psychiatric emergency','mental health crisis','psychosis','hearing voices','hallucinating'],
    id: 'psychiatric', label: 'Psychiatric Emergency', system: 'psych', baseWeight: 0.75 },

  // EYE / ENT
  { concepts: ['eye injury','eye pain','eye bleeding','lost vision','vision loss','sudden blindness','eye chemical'],
    id: 'eye_injury', label: 'Eye Emergency', system: 'ent', baseWeight: 0.70 },

  // SKIN
  { concepts: ['rash','skin rash','red spots','skin eruption','itchy rash','hives'],
    id: 'rash', label: 'Skin Rash', system: 'skin', baseWeight: 0.20 },
];

// ─────────────────────────────────────────────────────────────
// SECTION 2: SEVERITY AMPLIFIERS & MODIFIERS
// These modify concept weights up or down
// ─────────────────────────────────────────────────────────────
const AMPLIFIERS = {
  increase: [
    { words: ['severe','very severe','extreme','extremely','worst','terrible','horrible','unbearable','excruciating','crushing','agonizing','intense'], factor: 1.4 },
    { words: ['sudden','suddenly','abrupt','abruptly','acute','rapid onset'], factor: 1.3 },
    { words: ['very','really','quite','significantly','majorly'], factor: 1.15 },
    { words: ['spreading','getting worse','worsening','increasing','worsened'], factor: 1.25 },
    { words: ['constant','continuous','non-stop','doesn\'t stop','persistent','all the time'], factor: 1.15 },
  ],
  decrease: [
    { words: ['mild','slight','little','minor','a bit','small','minor','tiny','manageable'], factor: 0.55 },
    { words: ['getting better','improving','subsiding','less now','easing'], factor: 0.65 },
    { words: ['sometimes','occasionally','on and off','intermittent','comes and goes'], factor: 0.80 },
  ],
};

// Duration modifier — recent acute onset is more dangerous
const DURATION_WEIGHTS = [
  { patterns: ['just now','right now','minutes ago','just started','sudden','suddenly','seconds ago'], factor: 1.3 },
  { patterns: ['hour ago','hours ago','this morning','few hours'], factor: 1.1 },
  { patterns: ['since yesterday','day ago','24 hours'], factor: 1.0 },
  { patterns: ['week','weeks','month','months','long time','chronic','always had'], factor: 0.75 },
];

// ─────────────────────────────────────────────────────────────
// SECTION 3: NLP PARSER
// ─────────────────────────────────────────────────────────────
function parseSymptomText(text) {
  const lower = text.toLowerCase().trim();
  const detected = [];

  // Find duration modifier
  let durationFactor = 1.0;
  for (const d of DURATION_WEIGHTS) {
    if (d.patterns.some(p => lower.includes(p))) {
      durationFactor = d.factor;
      break;
    }
  }

  // Find amplitude modifier (window of ±50 chars around each concept match)
  function getLocalAmplifier(text, matchStart, matchEnd) {
    const window = text.slice(Math.max(0, matchStart - 60), Math.min(text.length, matchEnd + 60));
    let factor = 1.0;
    for (const amp of AMPLIFIERS.increase) {
      if (amp.words.some(w => window.includes(w))) { factor = Math.max(factor, amp.factor); }
    }
    for (const amp of AMPLIFIERS.decrease) {
      if (amp.words.some(w => window.includes(w))) { factor = Math.min(factor, amp.factor); }
    }
    return factor;
  }

  for (const symptomDef of SYMPTOM_LEXICON) {
    let bestScore = 0;
    let matchedPhrase = null;

    for (const phrase of symptomDef.concepts) {
      const idx = lower.indexOf(phrase);
      if (idx !== -1) {
        const ampFactor = getLocalAmplifier(lower, idx, idx + phrase.length);
        const score = symptomDef.baseWeight * ampFactor * durationFactor;
        if (score > bestScore) {
          bestScore = score;
          matchedPhrase = phrase;
        }
      }
    }

    if (matchedPhrase) {
      detected.push({
        id: symptomDef.id,
        label: symptomDef.label,
        system: symptomDef.system,
        score: Math.min(bestScore, 1.0),
        matchedPhrase,
      });
    }
  }

  // Deduplicate — keep highest scoring per id
  const seen = {};
  const unique = [];
  for (const d of detected) {
    if (!seen[d.id] || d.score > seen[d.id].score) {
      seen[d.id] = d;
    }
  }
  for (const id in seen) unique.push(seen[id]);
  unique.sort((a, b) => b.score - a.score);

  return { detected: unique, durationFactor };
}

// ─────────────────────────────────────────────────────────────
// SECTION 4: KBS RULE ENGINE (Forward Chaining)
// Returns priority (1–5), fired rules array, and confidence
// ─────────────────────────────────────────────────────────────
function runKBS(vitals, parsedSymptoms, rawText) {
  const firedRules = [];
  const priorityVotes = []; // Each rule votes with { priority, confidence }

  // Helper: check if a symptom was detected at or above threshold
  function hasSym(id, threshold = 0.35) {
    const s = parsedSymptoms.find(p => p.id === id);
    return s && s.score >= threshold;
  }
  function symScore(id) {
    const s = parsedSymptoms.find(p => p.id === id);
    return s ? s.score : 0;
  }

  function addRule(desc, priority, conf) {
    firedRules.push({ desc, priority, conf });
    priorityVotes.push({ priority, conf });
  }

  // ── LEVEL 1 RULES ──────────────────────────────────────────
  if (hasSym('unconscious', 0.4)) {
    addRule('IF unconscious OR unresponsive → RESUSCITATION REQUIRED', 1, 0.99);
  }
  if (hasSym('seizure', 0.4)) {
    addRule('IF active seizure → NEUROLOGICAL EMERGENCY (P1)', 1, 0.98);
  }
  if (hasSym('stroke_signs', 0.4)) {
    addRule('IF stroke signs detected (FAST) → STROKE PROTOCOL ACTIVATION (P1)', 1, 0.97);
  }
  if (hasSym('anaphylaxis', 0.5) && (hasSym('dyspnea', 0.3) || rawText.includes('throat'))) {
    addRule('IF anaphylaxis WITH airway compromise → ANAPHYLACTIC SHOCK (P1)', 1, 0.98);
  }
  if (hasSym('bleeding', 0.6) && symScore('bleeding') > 0.80) {
    addRule('IF severe/uncontrolled hemorrhage → HEMORRHAGIC EMERGENCY (P1)', 1, 0.96);
  }
  if (hasSym('chest_pain', 0.6) && hasSym('dyspnea', 0.5)) {
    addRule('IF chest pain AND difficulty breathing → SUSPECTED ACS / PULMONARY EMBOLISM (P1)', 1, 0.97);
  }
  if (hasSym('obstetric', 0.5)) {
    addRule('IF obstetric emergency → IMMEDIATE OB ASSESSMENT (P1)', 1, 0.95);
  }
  if (hasSym('gi_bleed', 0.6)) {
    addRule('IF GI bleeding signs → ACTIVE HEMORRHAGE RISK (P1)', 1, 0.94);
  }
  if (hasSym('burns', 0.5) && symScore('burns') > 0.7) {
    addRule('IF severe burns → BURN UNIT PROTOCOL (P1)', 1, 0.95);
  }

  // Vital-sign triggered P1 rules
  if (vitals.spo2 && vitals.spo2 < 90) {
    addRule(`IF SpO₂ < 90% (measured: ${vitals.spo2}%) → CRITICAL HYPOXEMIA (P1)`, 1, 0.99);
  }
  if (vitals.sbp && vitals.sbp < 80) {
    addRule(`IF SBP < 80 mmHg (measured: ${vitals.sbp}) → HEMODYNAMIC SHOCK (P1)`, 1, 0.99);
  }
  if (vitals.hr && vitals.hr > 150) {
    addRule(`IF HR > 150 bpm (measured: ${vitals.hr}) → SEVERE TACHYCARDIA / ARRHYTHMIA (P1)`, 1, 0.97);
  }
  if (vitals.hr && vitals.hr < 40) {
    addRule(`IF HR < 40 bpm (measured: ${vitals.hr}) → SEVERE BRADYCARDIA / CARDIAC ARREST RISK (P1)`, 1, 0.98);
  }
  if (vitals.rr && vitals.rr > 30) {
    addRule(`IF RR > 30/min (measured: ${vitals.rr}) → SEVERE RESPIRATORY FAILURE (P1)`, 1, 0.97);
  }
  if (vitals.rr && vitals.rr < 8) {
    addRule(`IF RR < 8/min (measured: ${vitals.rr}) → RESPIRATORY ARREST RISK (P1)`, 1, 0.98);
  }
  if (vitals.gcs && vitals.gcs <= 8) {
    addRule(`IF GCS ≤ 8 (measured: ${vitals.gcs}/15) → SEVERE NEUROLOGICAL IMPAIRMENT (P1)`, 1, 0.99);
  }
  if (vitals.temp && vitals.temp >= 41.0) {
    addRule(`IF Temp ≥ 41°C (measured: ${vitals.temp}°C) → HYPERPYREXIA / HEAT STROKE (P1)`, 1, 0.96);
  }
  if (vitals.sbp && vitals.sbp < 90 && vitals.hr && vitals.hr > 120) {
    addRule(`IF SBP ${vitals.sbp} mmHg AND HR ${vitals.hr} bpm → SHOCK INDEX HIGH, HEMODYNAMIC COMPROMISE (P1)`, 1, 0.98);
  }

  // ── LEVEL 2 RULES ──────────────────────────────────────────
  if (hasSym('chest_pain', 0.4) && !priorityVotes.some(v => v.priority === 1)) {
    addRule('IF chest pain (stable vitals) → CARDIAC EVALUATION URGENT (P2)', 2, 0.91);
  }
  if (hasSym('dyspnea', 0.4) && !priorityVotes.some(v => v.priority === 1)) {
    addRule('IF breathing difficulty → RESPIRATORY ASSESSMENT URGENT (P2)', 2, 0.90);
  }
  if (hasSym('anaphylaxis', 0.4) && !priorityVotes.some(v => v.priority === 1)) {
    addRule('IF allergic reaction / anaphylaxis (no airway compromise yet) → URGENT INTERVENTION (P2)', 2, 0.93);
  }
  if (hasSym('head_injury', 0.5) && vitals.gcs && vitals.gcs < 15 && vitals.gcs > 8) {
    addRule(`IF head injury AND GCS ${vitals.gcs}/15 → HIGH-RISK HEAD TRAUMA (P2)`, 2, 0.92);
  }
  if (hasSym('confusion', 0.5)) {
    addRule('IF confusion / altered mental status → NEUROLOGICAL ASSESSMENT URGENT (P2)', 2, 0.88);
  }
  if (hasSym('stroke_signs', 0.3) && !priorityVotes.some(v => v.priority === 1)) {
    addRule('IF possible stroke signs → HIGH-RISK NEUROLOGICAL EVENT (P2)', 2, 0.90);
  }
  if (hasSym('psychiatric', 0.5)) {
    addRule('IF psychiatric emergency / suicidal ideation → MENTAL HEALTH URGENT (P2)', 2, 0.88);
  }
  if (vitals.sbp && vitals.sbp >= 180) {
    addRule(`IF SBP ≥ 180 mmHg (measured: ${vitals.sbp}) → HYPERTENSIVE CRISIS (P2)`, 2, 0.95);
  }
  if (vitals.spo2 && vitals.spo2 >= 90 && vitals.spo2 < 94) {
    addRule(`IF SpO₂ 90–93% (measured: ${vitals.spo2}%) → HYPOXEMIA — CLOSE MONITORING (P2)`, 2, 0.92);
  }
  if (vitals.hr && vitals.hr >= 120 && vitals.hr <= 150) {
    addRule(`IF HR 120–150 bpm (measured: ${vitals.hr}) → TACHYCARDIA — EVALUATE (P2)`, 2, 0.90);
  }
  if (vitals.pain && vitals.pain >= 9) {
    addRule(`IF pain score ≥ 9/10 (scored: ${vitals.pain}) → SEVERE PAIN, URGENT RELIEF (P2)`, 2, 0.91);
  }
  if (vitals.temp && vitals.temp >= 40.0 && vitals.temp < 41.0) {
    addRule(`IF Temp 40–41°C (measured: ${vitals.temp}°C) → HIGH FEVER WITH RISK (P2)`, 2, 0.91);
  }
  if (hasSym('severe_pain', 0.7)) {
    addRule('IF excruciating / unbearable pain described → HIGH PAIN ACUITY (P2)', 2, 0.88);
  }
  if (hasSym('gi_bleed', 0.4) && !priorityVotes.some(v => v.priority === 1)) {
    addRule('IF GI bleeding suspected → URGENT GI ASSESSMENT (P2)', 2, 0.90);
  }
  if (hasSym('eye_injury', 0.5)) {
    addRule('IF eye emergency → URGENT OPHTHALMOLOGY (P2)', 2, 0.89);
  }

  // ── LEVEL 3 RULES ──────────────────────────────────────────
  const existingMaxPriority = priorityVotes.length ? Math.min(...priorityVotes.map(v => v.priority)) : 5;

  if (existingMaxPriority > 3) {
    if (hasSym('fever', 0.4) && vitals.temp && vitals.temp >= 38.5) {
      addRule(`IF fever ${vitals.temp}°C with systemic symptoms → FEBRILE ILLNESS (P3)`, 3, 0.87);
    }
    if (hasSym('abdominal_pain', 0.4) && vitals.pain && vitals.pain >= 5) {
      addRule(`IF abdominal pain (pain score ${vitals.pain}) → ABDOMINAL ASSESSMENT (P3)`, 3, 0.85);
    }
    if (hasSym('fracture', 0.4)) {
      addRule('IF suspected fracture → ORTHOPAEDIC ASSESSMENT (P3)', 3, 0.86);
    }
    if (hasSym('dizziness', 0.5)) {
      addRule('IF significant dizziness / syncope → NEUROLOGICAL REVIEW (P3)', 3, 0.82);
    }
    if (hasSym('head_injury', 0.4)) {
      addRule('IF head injury (stable GCS) → OBSERVATION + CT IMAGING (P3)', 3, 0.85);
    }
    if (hasSym('infection', 0.4)) {
      addRule('IF infection signs without sepsis → INFECTION WORKUP (P3)', 3, 0.83);
    }
    if (hasSym('numbness', 0.5)) {
      addRule('IF significant numbness / sensory loss → NEUROLOGICAL REVIEW (P3)', 3, 0.82);
    }
    if (vitals.sbp && vitals.sbp >= 160 && vitals.sbp < 180) {
      addRule(`IF SBP 160–179 mmHg (${vitals.sbp}) → ELEVATED BP, REVIEW (P3)`, 3, 0.88);
    }
    if (vitals.pain && vitals.pain >= 6 && vitals.pain < 9) {
      addRule(`IF pain score 6–8/10 (${vitals.pain}) → MODERATE-SEVERE PAIN (P3)`, 3, 0.86);
    }
    if (hasSym('headache', 0.5) && symScore('headache') > 0.6) {
      addRule('IF severe headache (possible thunderclap) → NEUROLOGICAL ASSESSMENT (P3)', 3, 0.84);
    }
    if (hasSym('trauma', 0.5)) {
      addRule('IF significant trauma / injury → TRAUMA ASSESSMENT (P3)', 3, 0.84);
    }
    if (hasSym('burns', 0.3) && !priorityVotes.some(v => v.priority <= 2)) {
      addRule('IF minor burns → WOUND CARE (P3)', 3, 0.82);
    }
  }

  // ── LEVEL 4 RULES ──────────────────────────────────────────
  if (existingMaxPriority > 4) {
    if (hasSym('vomiting', 0.3)) {
      addRule('IF nausea/vomiting (stable vitals) → SUPPORTIVE CARE (P4)', 4, 0.80);
    }
    if (hasSym('rash', 0.3)) {
      addRule('IF skin rash (stable) → DERMATOLOGY REVIEW (P4)', 4, 0.78);
    }
    if (hasSym('urinary', 0.3)) {
      addRule('IF urinary complaint → UROLOGICAL REVIEW (P4)', 4, 0.79);
    }
    if (hasSym('diarrhea', 0.3)) {
      addRule('IF diarrhea (stable) → SUPPORTIVE CARE (P4)', 4, 0.77);
    }
    if (hasSym('cough', 0.4) && !hasSym('dyspnea')) {
      addRule('IF cough without distress → NON-URGENT RESPIRATORY (P4)', 4, 0.78);
    }
    if (vitals.pain && vitals.pain >= 3 && vitals.pain <= 5) {
      addRule(`IF pain score 3–5/10 (${vitals.pain}) → MILD-MODERATE PAIN (P4)`, 4, 0.80);
    }
    if (vitals.temp && vitals.temp >= 37.5 && vitals.temp < 38.5) {
      addRule(`IF mild fever ${vitals.temp}°C → LOW-ACUITY MONITORING (P4)`, 4, 0.78);
    }
  }

  // ── LEVEL 5 FALLBACK ──────────────────────────────────────
  if (firedRules.length === 0) {
    addRule('IF all vitals within normal range AND no acute symptoms → MINIMAL ACUITY (P5)', 5, 0.75);
  }

  // ── PRIORITY RESOLUTION ──────────────────────────────────
  // Weighted majority vote — lowest winning priority
  const finalPriority = priorityVotes.length
    ? Math.min(...priorityVotes.map(v => v.priority))
    : 5;

  // ── CONFIDENCE CALCULATION ────────────────────────────────
  // Base confidence = weighted avg of fired rules for winning priority
  const winningRules = firedRules.filter(r => r.priority === finalPriority);
  const baseConf = winningRules.length
    ? winningRules.reduce((sum, r) => sum + r.conf, 0) / winningRules.length
    : 0.70;

  // Bonus: more corroborating evidence → higher confidence
  const corroborationBonus = Math.min(0.06, (winningRules.length - 1) * 0.02);

  // Vitals bonus: if vitals confirm symptoms
  let vitalsBonus = 0;
  const hasVitals = Object.values(vitals).some(v => v !== null && !isNaN(v));
  if (hasVitals) vitalsBonus = 0.02;

  // Symptom clarity bonus: high-score symptoms
  const highScoreSyms = parsedSymptoms.filter(s => s.score > 0.7).length;
  const clarityBonus = Math.min(0.04, highScoreSyms * 0.02);

  let finalConf = baseConf + corroborationBonus + vitalsBonus + clarityBonus;
  finalConf = Math.min(0.99, Math.max(0.75, finalConf));
  const confidencePct = Math.round(finalConf * 100);

  // ── EXPLANATION TIER ─────────────────────────────────────
  // How confident we label it
  let confidenceLabel, confidenceColor;
  if (confidencePct >= 95) { confidenceLabel = 'Very High Confidence'; confidenceColor = '#30d158'; }
  else if (confidencePct >= 90) { confidenceLabel = 'High Confidence'; confidenceColor = '#00c8ff'; }
  else if (confidencePct >= 80) { confidenceLabel = 'Moderate Confidence'; confidenceColor = '#ffd60a'; }
  else { confidenceLabel = 'Low Confidence — Doctor Review Advised'; confidenceColor = '#ff6b35'; }

  const probableDisease = inferProbableDisease(finalPriority, firedRules, parsedSymptoms, vitals);

  return {
    priority: finalPriority,
    confidence: confidencePct,
    confidenceLabel,
    confidenceColor,
    firedRules,
    detectedSymptoms: parsedSymptoms,
    probableDisease,
  };
}

function inferProbableDisease(priority, firedRules, parsedSymptoms, vitals) {
  const topRule = firedRules
    .filter(r => r.priority === priority)
    .sort((a, b) => b.conf - a.conf)[0];

  const hasSym = (id, threshold = 0.35) => {
    const symptom = parsedSymptoms.find(s => s.id === id);
    return Boolean(symptom && symptom.score >= threshold);
  };

  if (topRule) {
    const diseaseMap = [
      { match: 'SUSPECTED ACS / PULMONARY EMBOLISM', label: 'Acute Coronary Syndrome / Pulmonary Embolism' },
      { match: 'STROKE PROTOCOL ACTIVATION', label: 'Acute Stroke' },
      { match: 'ANAPHYLACTIC SHOCK', label: 'Anaphylaxis' },
      { match: 'HEMORRHAGIC EMERGENCY', label: 'Severe Hemorrhage / Hemorrhagic Shock' },
      { match: 'ACTIVE HEMORRHAGE RISK', label: 'Gastrointestinal Bleeding' },
      { match: 'CRITICAL HYPOXEMIA', label: 'Critical Hypoxemia / Respiratory Failure' },
      { match: 'HEMODYNAMIC SHOCK', label: 'Hemodynamic Shock' },
      { match: 'SEVERE TACHYCARDIA / ARRHYTHMIA', label: 'Severe Tachyarrhythmia' },
      { match: 'SEVERE BRADYCARDIA / CARDIAC ARREST RISK', label: 'Severe Bradycardia' },
      { match: 'SEVERE RESPIRATORY FAILURE', label: 'Severe Respiratory Failure' },
      { match: 'RESPIRATORY ARREST RISK', label: 'Impending Respiratory Arrest' },
      { match: 'SEVERE NEUROLOGICAL IMPAIRMENT', label: 'Severe Neurological Impairment' },
      { match: 'HYPERPYREXIA / HEAT STROKE', label: 'Hyperpyrexia / Heat Stroke' },
      { match: 'HIGH-RISK HEAD TRAUMA', label: 'High-Risk Head Trauma' },
      { match: 'HYPERTENSIVE CRISIS', label: 'Hypertensive Crisis' },
      { match: 'FEBRILE ILLNESS', label: 'Acute Febrile Illness' },
      { match: 'ABDOMINAL ASSESSMENT', label: 'Acute Abdominal Condition' },
      { match: 'ORTHOPAEDIC ASSESSMENT', label: 'Suspected Fracture' },
      { match: 'INFECTION WORKUP', label: 'Acute Infection' },
      { match: 'DERMATOLOGY REVIEW', label: 'Skin Rash / Dermatitis' },
      { match: 'UROLOGICAL REVIEW', label: 'Urinary Tract Condition' },
      { match: 'NON-URGENT RESPIRATORY', label: 'Upper Respiratory Illness' },
      { match: 'MENTAL HEALTH URGENT', label: 'Acute Psychiatric Crisis' },
      { match: 'BURN UNIT PROTOCOL', label: 'Severe Burn Injury' },
      { match: 'WOUND CARE', label: 'Minor Burn Injury' },
      { match: 'IMMEDIATE OB ASSESSMENT', label: 'Obstetric Emergency' },
    ];

    const mapped = diseaseMap.find(entry => topRule.desc.includes(entry.match));
    if (mapped) {
      return mapped.label;
    }
  }

  if (hasSym('chest_pain', 0.5) && hasSym('dyspnea', 0.4)) return 'Acute Coronary Syndrome';
  if (hasSym('stroke_signs', 0.4)) return 'Acute Stroke';
  if (hasSym('anaphylaxis', 0.4)) return 'Anaphylaxis';
  if (hasSym('gi_bleed', 0.4)) return 'Gastrointestinal Bleeding';
  if (hasSym('fever', 0.4) && hasSym('rash', 0.3)) return 'Febrile Rash Illness';
  if (hasSym('fever', 0.4) && hasSym('vomiting', 0.3)) return 'Acute Febrile Illness';
  if (hasSym('abdominal_pain', 0.4) && hasSym('vomiting', 0.3)) return 'Acute Gastrointestinal Condition';
  if (hasSym('fracture', 0.4) || hasSym('trauma', 0.5)) return 'Traumatic Injury';
  if (hasSym('cough', 0.4) || hasSym('dyspnea', 0.4)) return 'Respiratory Condition';
  if (hasSym('urinary', 0.3)) return 'Urinary Tract Condition';
  if (hasSym('rash', 0.3)) return 'Dermatologic Condition';
  if (vitals.temp && vitals.temp >= 38.5) return 'Acute Febrile Illness';

  return 'General Emergency Condition';
}

// ─────────────────────────────────────────────────────────────
// SECTION 5: PRIORITY METADATA
// ─────────────────────────────────────────────────────────────
const PRIORITY_META = {
  1: { label: 'CRITICAL',  color: '#ff2d55', bg: 'rgba(255,45,85,0.12)',   border: 'rgba(255,45,85,0.35)',   wait: 'IMMEDIATE',   waitColor: '#ff2d55' },
  2: { label: 'HIGH RISK', color: '#ff6b35', bg: 'rgba(255,107,53,0.12)',  border: 'rgba(255,107,53,0.35)',  wait: '< 10 min',    waitColor: '#ff6b35' },
  3: { label: 'MODERATE',  color: '#ffd60a', bg: 'rgba(255,214,10,0.10)',  border: 'rgba(255,214,10,0.30)',  wait: '< 30 min',    waitColor: '#ffd60a' },
  4: { label: 'LOW',       color: '#30d158', bg: 'rgba(48,209,88,0.10)',   border: 'rgba(48,209,88,0.28)',   wait: '< 60 min',    waitColor: '#30d158' },
  5: { label: 'MINIMAL',   color: '#636e8a', bg: 'rgba(99,110,138,0.10)',  border: 'rgba(99,110,138,0.25)', wait: '< 120 min',   waitColor: '#636e8a' },
};
