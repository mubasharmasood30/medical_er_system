/* ============================================================
   KBS ER TRIAGE — App Logic
   Depends on: kbs-engine.js (loaded first)
   ============================================================ */

'use strict';

// ─────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────
let patientQueue   = [];
let nextId         = 1;
let currentFilter  = 'all';
let overrideTarget = null;
let selectedOverP  = null;
let pendingPatient = null;
let currentTheme   = 'dark';

// ─────────────────────────────────────────────────────────────
// LIVE NLP — fires as user types
// ─────────────────────────────────────────────────────────────
let nlpDebounce = null;
function onSymptomInput(e) {
  const text = e.target.value;
  document.getElementById('sym-char-count').textContent = text.length + ' chars';
  clearTimeout(nlpDebounce);
  nlpDebounce = setTimeout(() => renderLiveDetected(text), 280);
}

function renderLiveDetected(text) {
  const wrap = document.getElementById('detected-tags-wrap');
  if (!text.trim() || text.trim().length < 5) {
    wrap.innerHTML = '<span style="font-size:11px;color:var(--muted)">Start typing symptoms to see live detection…</span>';
    return;
  }
  const { detected } = parseSymptomText(text);
  if (!detected.length) {
    wrap.innerHTML = '<span style="font-size:11px;color:var(--muted)">No specific symptoms detected yet — try describing more clearly.</span>';
    return;
  }
  wrap.innerHTML = detected.map(d => {
    const pct = Math.round(d.score * 100);
    const color = pct >= 80 ? '#ff2d55' : pct >= 60 ? '#ff6b35' : pct >= 40 ? '#ffd60a' : '#56627e';
    return `<span class="det-tag" style="background:${color}18;border:1px solid ${color}44;color:${color}">
      ${d.label}
      <span class="det-tag-score">${pct}%</span>
    </span>`;
  }).join('');
}

// ─────────────────────────────────────────────────────────────
// INTAKE — ANALYZE
// ─────────────────────────────────────────────────────────────
function analyzePatient() {
  const name      = document.getElementById('p-name').value.trim();
  const age       = parseInt(document.getElementById('p-age').value);
  const gender    = document.getElementById('p-gender').value;
  const sympText  = document.getElementById('p-symptoms').value.trim();
  const complaint = document.getElementById('p-complaint').value.trim();

  if (!name)           { showToast('Please enter patient name.', 'error'); return; }
  if (isNaN(age)||age<0){ showToast('Please enter a valid age.', 'error'); return; }
  if (!sympText)       { showToast('Please describe patient symptoms.', 'error'); return; }

  const vitals = {
    hr:   parseFloatOrNull('v-hr'),
    sbp:  parseFloatOrNull('v-sbp'),
    dbp:  parseFloatOrNull('v-dbp'),
    spo2: parseFloatOrNull('v-spo2'),
    temp: parseFloatOrNull('v-temp'),
    rr:   parseFloatOrNull('v-rr'),
    pain: parseFloatOrNull('v-pain'),
    gcs:  parseFloatOrNull('v-gcs'),
  };

  const { detected, durationFactor } = parseSymptomText(sympText);
  const result = runKBS(vitals, detected, sympText);
  const pm = PRIORITY_META[result.priority];

  // Store pending
  pendingPatient = {
    id: nextId++,
    name, age, gender,
    complaint: complaint || sympText.slice(0, 80),
    sympText,
    vitals,
    detectedSymptoms: detected,
    priority: result.priority,
    originalPriority: result.priority,
    confidence: result.confidence,
    confidenceLabel: result.confidenceLabel,
    confidenceColor: result.confidenceColor,
    probableDisease: result.probableDisease,
    firedRules: result.firedRules,
    timestamp: new Date(),
    completed: false,
    overrideNote: null,
  };

  renderResultPanel(pendingPatient, pm, result);
  showToast(`KBS Analysis done — ESI Level ${result.priority} · ${result.confidence}% confidence`, result.priority <= 2 ? 'error' : 'info');
}

function parseFloatOrNull(id) {
  const v = parseFloat(document.getElementById(id).value);
  return isNaN(v) ? null : v;
}

// ─────────────────────────────────────────────────────────────
// RESULT PANEL RENDER
// ─────────────────────────────────────────────────────────────
function renderResultPanel(p, pm, result) {
  document.getElementById('result-empty').style.display = 'none';
  const content = document.getElementById('result-content');
  content.style.display = 'block';

  // Priority hero
  document.getElementById('res-priority-hero').innerHTML = `
    <div class="pri-badge" style="background:${pm.bg};border-color:${pm.border};color:${pm.color}">
      <div class="dot" style="background:${pm.color}"></div>
      ESI LEVEL ${p.priority} — ${pm.label}
    </div>
    <div class="result-name">${p.name}</div>
    <div class="result-meta">${p.age} yrs · ${p.gender||'N/A'} · ${new Date().toLocaleTimeString()}
      &nbsp;·&nbsp;
      <span class="wait-pill" style="color:${pm.color};border-color:${pm.color}44">⏱ ${pm.wait}</span>
    </div>
    <div class="conf-block">
      <div class="conf-row">
        <span class="conf-label">KBS Confidence</span>
        <span class="conf-pct" style="color:${result.confidenceColor}">${result.confidence}%</span>
      </div>
      <div class="conf-bar-bg">
        <div class="conf-bar-fill" style="width:${result.confidence}%;background:${result.confidenceColor}"></div>
      </div>
      <div class="conf-sub">${result.confidenceLabel}</div>
    </div>
    <div class="probable-disease-card">
      <div class="probable-disease-label">Most Probable Disease</div>
      <div class="probable-disease-value">${result.probableDisease || 'General Emergency Condition'}</div>
      <div class="probable-disease-note">Decision support only — clinical confirmation required.</div>
    </div>
  `;

  // Fired rules
  document.getElementById('res-rules').innerHTML = `
    <div class="rules-title">🔍 KBS Forward-Chaining Rules Activated</div>
    ${result.firedRules.map(r => `
      <div class="rule-row">
        <span class="rule-arrow">▶</span>
        <span>${r.desc}</span>
        <span style="margin-left:auto;flex-shrink:0;font-size:9px;opacity:0.6;padding-left:8px">${Math.round(r.conf*100)}%</span>
      </div>
    `).join('')}
  `;

  // Detected symptoms
  document.getElementById('res-syms').innerHTML = `
    <div class="rules-title" style="margin-bottom:8px">🧠 NLP-Detected Symptoms</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px">
      ${result.detectedSymptoms.map(d => {
        const pct = Math.round(d.score*100);
        const col = pct>=80?'var(--p1)':pct>=60?'var(--p2)':pct>=40?'var(--p3)':'var(--p5)';
        return `<span class="det-tag" style="background:${col}18;border:1px solid ${col}44;color:${col}">
          ${d.label}<span class="det-tag-score">${pct}%</span></span>`;
      }).join('') || '<span style="color:var(--muted);font-size:12px">No specific symptoms parsed</span>'}
    </div>
  `;

  // Vitals mini
  const vitals = p.vitals;
  const vItems = [
    vitals.hr   != null ? { lbl:'HR',    val:`${vitals.hr} bpm`, color: vitals.hr>100||vitals.hr<60?'var(--p2)':'var(--p4)' } : null,
    vitals.sbp  != null ? { lbl:'BP',    val:`${vitals.sbp}/${vitals.dbp||'–'}`, color: vitals.sbp>=140?'var(--p2)':vitals.sbp<90?'var(--p1)':'var(--p4)' } : null,
    vitals.spo2 != null ? { lbl:'SpO₂',  val:`${vitals.spo2}%`, color: vitals.spo2<90?'var(--p1)':vitals.spo2<94?'var(--p2)':'var(--p4)' } : null,
    vitals.temp != null ? { lbl:'Temp',  val:`${vitals.temp}°C`, color: vitals.temp>=39?'var(--p2)':vitals.temp>=38?'var(--p3)':'var(--p4)' } : null,
    vitals.rr   != null ? { lbl:'RR',    val:`${vitals.rr}/min`, color: vitals.rr>25||vitals.rr<12?'var(--p2)':'var(--p4)' } : null,
    vitals.pain != null ? { lbl:'Pain',  val:`${vitals.pain}/10`, color: vitals.pain>=8?'var(--p1)':vitals.pain>=5?'var(--p2)':'var(--p4)' } : null,
    vitals.gcs  != null ? { lbl:'GCS',   val:`${vitals.gcs}/15`, color: vitals.gcs<=8?'var(--p1)':vitals.gcs<=12?'var(--p2)':'var(--p4)' } : null,
  ].filter(Boolean);

  document.getElementById('res-vitals').innerHTML = vItems.length
    ? vItems.map(v => `<div class="vmini"><div class="vmini-lbl">${v.lbl}</div><div class="vmini-val" style="color:${v.color}">${v.val}</div></div>`).join('')
    : '<div style="color:var(--muted);font-size:12px;padding:4px">No vitals entered</div>';
}

// ─────────────────────────────────────────────────────────────
// ADD TO QUEUE
// ─────────────────────────────────────────────────────────────
function addToQueue() {
  if (!pendingPatient) return;
  patientQueue.push(pendingPatient);
  sortQueue();
  updateHeaderStats();
  renderQueue();
  renderDoctorList();
  showToast(`${pendingPatient.name} added to priority queue!`, 'success');
  pendingPatient = null;
  document.getElementById('result-content').style.display = 'none';
  document.getElementById('result-empty').style.display = 'flex';
  resetForm();
}

function sortQueue() {
  patientQueue.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.timestamp - b.timestamp;
  });
}

function resetForm() {
  ['p-name','p-age','p-complaint','p-symptoms','v-hr','v-sbp','v-dbp','v-spo2','v-temp','v-rr','v-pain','v-gcs'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('p-gender').value = '';
  document.getElementById('detected-tags-wrap').innerHTML = '<span style="font-size:11px;color:var(--muted)">Start typing symptoms to see live detection…</span>';
  document.getElementById('sym-char-count').textContent = '0 chars';
}

// ─────────────────────────────────────────────────────────────
// QUEUE RENDER
// ─────────────────────────────────────────────────────────────
function setFilter(f, btn) {
  currentFilter = f;
  document.querySelectorAll('.q-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderQueue();
}

function renderQueue() {
  const list = document.getElementById('queue-list');
  let patients = patientQueue.filter(p => !p.completed);

  if (currentFilter !== 'all') {
    const f = parseInt(currentFilter);
    patients = f === 4
      ? patients.filter(p => p.priority >= 4)
      : patients.filter(p => p.priority === f);
  }

  if (!patients.length) {
    list.innerHTML = `<div class="q-empty"><div class="qe-icon">🏥</div><div>No patients${currentFilter !== 'all' ? ' at this priority' : ''} in queue</div></div>`;
    return;
  }

  list.innerHTML = patients.map(p => {
    const pm = PRIORITY_META[p.priority];
    const waitMins = Math.floor((Date.now() - p.timestamp) / 60000);
    const confColor = p.confidence >= 95 ? '#30d158' : p.confidence >= 90 ? '#00c8ff' : p.confidence >= 80 ? '#ffd60a' : '#ff6b35';
    const topSymptoms = p.detectedSymptoms.slice(0,3).map(s => s.label).join(', ');

    return `<div class="p-card${p.completed?' done':''}" style="border-left-color:${pm.color}">
      <div class="p-pri-badge" style="background:${pm.bg};color:${pm.color}">
        <div>${p.priority}</div>
        <div class="p-pri-lbl">${pm.label.slice(0,3)}</div>
      </div>
      <div class="p-info">
        <div class="p-name">${p.name} <span style="font-size:11px;color:var(--muted);font-weight:400;font-family:'Space Mono',monospace">#${String(p.id).padStart(3,'0')}</span></div>
        <div class="p-sub">
          ${p.age} yrs · ${p.gender||'–'} &nbsp;·&nbsp;
          <span class="wait-pill" style="color:${pm.color};border-color:${pm.color}44">⏱ ${waitMins}m</span>
          &nbsp;
          <span class="conf-chip" style="color:${confColor};border-color:${confColor}44">🎯 ${p.confidence}%</span>
          ${p.overrideNote ? '&nbsp;<span class="override-tag">⚠ Dr Override</span>' : ''}
        </div>
        <div class="p-complaint">${topSymptoms || p.complaint}</div>
        <div class="p-disease">Likely: ${p.probableDisease || 'General Emergency Condition'}</div>
      </div>
      <div class="p-vitals">
        ${p.vitals.hr   != null ? `<div class="pv"><div class="pv-val">${p.vitals.hr}</div><div class="pv-lbl">HR</div></div>` : ''}
        ${p.vitals.sbp  != null ? `<div class="pv"><div class="pv-val">${p.vitals.sbp}</div><div class="pv-lbl">SBP</div></div>` : ''}
        ${p.vitals.spo2 != null ? `<div class="pv"><div class="pv-val">${p.vitals.spo2}%</div><div class="pv-lbl">SpO₂</div></div>` : ''}
        ${p.vitals.temp != null ? `<div class="pv"><div class="pv-val">${p.vitals.temp}°</div><div class="pv-lbl">Temp</div></div>` : ''}
      </div>
      <div class="p-actions">
        <button class="btn btn-ghost btn-sm" onclick="viewRules(${p.id})">📋 Rules</button>
      </div>
    </div>`;
  }).join('');
}

function viewRules(id) {
  const p = patientQueue.find(x => x.id === id);
  if (!p) return;
  const pm = PRIORITY_META[p.priority];
  const rules = p.firedRules.map((r,i) => `${i+1}. ${r.desc}  [${Math.round(r.conf*100)}%]`).join('\n');
  alert(`━━━ KBS ANALYSIS REPORT ━━━\nPatient: ${p.name} (#${String(p.id).padStart(3,'0')})\nESI Level: ${p.priority} — ${pm.label}\nConfidence: ${p.confidence}% (${p.confidenceLabel})\nMost Probable Disease: ${p.probableDisease || 'General Emergency Condition'}\n\n📋 RULES FIRED:\n${rules}\n\n🧠 DETECTED SYMPTOMS:\n${p.detectedSymptoms.map(s=>`• ${s.label} (${Math.round(s.score*100)}%)`).join('\n')}`);
}

function setTheme(theme) {
  currentTheme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);
  const btn = document.getElementById('theme-toggle');
  const label = document.getElementById('theme-toggle-label');
  if (btn) btn.setAttribute('aria-pressed', String(currentTheme === 'light'));
  if (label) label.textContent = currentTheme === 'light' ? 'Light' : 'Dark';
  localStorage.setItem('kbs-theme', currentTheme);
}

function toggleTheme() {
  setTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

function initTheme() {
  const savedTheme = localStorage.getItem('kbs-theme');
  setTheme(savedTheme === 'light' ? 'light' : 'dark');
}

// ─────────────────────────────────────────────────────────────
// DOCTOR DASHBOARD
// ─────────────────────────────────────────────────────────────
function renderDoctorList() {
  updateDoctorStats();
  const list = document.getElementById('doctor-list-body');

  if (!patientQueue.length) {
    list.innerHTML = '<div style="text-align:center;padding:48px;color:var(--muted)">No patients registered yet.</div>';
    return;
  }

  const active = patientQueue.filter(p => !p.completed);
  const done   = patientQueue.filter(p => p.completed);

  const renderRows = (patients, title) => {
    if (!patients.length) return '';
    return `
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);margin:18px 0 10px 0;padding-left:2px">${title}</div>
      ${patients.map(p => {
        const pm = PRIORITY_META[p.priority];
        const confColor = p.confidence >= 95 ? '#30d158' : p.confidence >= 90 ? '#00c8ff' : p.confidence >= 80 ? '#ffd60a' : '#ff6b35';
        return `
          <div class="doc-patient-row${p.completed?' done':''}" style="border-left-color:${pm.color}">
            <div>
              <div class="dpr-name">${p.name} <span style="font-family:'Space Mono',monospace;font-size:10px;color:var(--muted);font-weight:400">#${String(p.id).padStart(3,'0')}</span></div>
              <div class="dpr-meta">${p.age} yrs · ${p.gender||'–'} · ${p.complaint.slice(0,60)}${p.complaint.length>60?'…':''}</div>
              <div class="dpr-tags">
                <span style="font-size:11px;padding:3px 10px;border-radius:20px;background:${pm.bg};color:${pm.color};border:1px solid ${pm.border};font-weight:700">P${p.priority} ${pm.label}</span>
                <span class="conf-chip" style="color:${confColor};border-color:${confColor}44">🎯 ${p.confidence}%</span>
                ${p.originalPriority !== p.priority ? `<span style="font-size:10px;color:var(--muted)">KBS: P${p.originalPriority} → Dr: P${p.priority}</span>` : ''}
                ${p.overrideNote ? `<span class="override-tag">⚠ ${p.overrideNote.slice(0,40)}</span>` : ''}
              </div>
            </div>
            ${!p.completed ? `
              <div class="dpr-actions">
                <button class="btn btn-warn btn-sm" onclick="openOverride(${p.id})">✏️ Override</button>
                <button class="btn btn-success btn-sm" onclick="markComplete(${p.id})">✔ Done</button>
              </div>
            ` : `<span style="color:var(--muted);font-size:11px">Completed</span>`}
          </div>`;
      }).join('')}
    `;
  };

  list.innerHTML = renderRows(active, `Active (${active.length})`) + renderRows(done, `Completed (${done.length})`);
}

function updateDoctorStats() {
  const active = patientQueue.filter(p => !p.completed);
  const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
  set('d-total', active.length);
  set('d-p1',   active.filter(p => p.priority === 1).length);
  set('d-p2',   active.filter(p => p.priority === 2).length);
  set('d-p3',   active.filter(p => p.priority === 3).length);
  set('d-low',  active.filter(p => p.priority >= 4).length);
  set('d-done', patientQueue.filter(p => p.completed).length);
}

// ─────────────────────────────────────────────────────────────
// OVERRIDE MODAL
// ─────────────────────────────────────────────────────────────
function openOverride(id) {
  overrideTarget = patientQueue.find(p => p.id === id);
  if (!overrideTarget) return;
  selectedOverP = overrideTarget.priority;

  document.getElementById('modal-patient-name').textContent = `${overrideTarget.name} — Current: P${overrideTarget.priority} (${PRIORITY_META[overrideTarget.priority].label})`;
  document.getElementById('override-note').value = '';

  const grid = document.getElementById('pri-selector');
  grid.innerHTML = [1,2,3,4,5].map(i => {
    const pm = PRIORITY_META[i];
    return `<button class="pri-opt${i===selectedOverP?' sel':''}"
      style="color:${pm.color};border-color:${i===selectedOverP?pm.color:'var(--border2)'};${i===selectedOverP?'background:'+pm.bg:''}"
      onclick="selectOverridePri(${i},this)">
      ${i}<span class="opt-lbl">${pm.label.slice(0,4)}</span>
    </button>`;
  }).join('');

  document.getElementById('override-modal').classList.remove('hidden');
}

function selectOverridePri(p, btn) {
  selectedOverP = p;
  const pm = PRIORITY_META[p];
  document.querySelectorAll('.pri-opt').forEach(b => {
    b.classList.remove('sel');
    b.style.background = 'transparent';
    b.style.borderColor = 'var(--border2)';
  });
  btn.classList.add('sel');
  btn.style.background = pm.bg;
  btn.style.borderColor = pm.color;
}

function confirmOverride() {
  if (!overrideTarget || !selectedOverP) { showToast('Select a priority level.', 'error'); return; }
  const note = document.getElementById('override-note').value.trim() || 'Priority changed by doctor';
  overrideTarget.priority = selectedOverP;
  overrideTarget.overrideNote = note;
  sortQueue();
  updateHeaderStats();
  renderQueue();
  renderDoctorList();
  closeModal();
  showToast(`Priority updated → P${selectedOverP} for ${overrideTarget.name}`, 'success');
  overrideTarget = null; selectedOverP = null;
}

function closeModal() {
  document.getElementById('override-modal').classList.add('hidden');
  overrideTarget = null; selectedOverP = null;
}

function markComplete(id) {
  const p = patientQueue.find(x => x.id === id);
  if (!p) return;
  p.completed = true;
  updateHeaderStats();
  renderQueue();
  renderDoctorList();
  showToast(`${p.name} marked as completed ✔`, 'success');
}

// ─────────────────────────────────────────────────────────────
// VIEW SWITCHING
// ─────────────────────────────────────────────────────────────
function switchView(v, btn) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('view-' + v).classList.add('active');
  btn.classList.add('active');
  if (v === 'queue')  renderQueue();
  if (v === 'doctor') renderDoctorList();
}

// ─────────────────────────────────────────────────────────────
// HEADER STATS
// ─────────────────────────────────────────────────────────────
function updateHeaderStats() {
  const active = patientQueue.filter(p => !p.completed);
  document.getElementById('h-total').textContent   = active.length;
  document.getElementById('h-critical').textContent = active.filter(p => p.priority === 1).length;
}

// ─────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3200);
}

// ─────────────────────────────────────────────────────────────
// CLOCK
// ─────────────────────────────────────────────────────────────
function updateClock() {
  const el = document.getElementById('header-clock');
  if (el) el.textContent = new Date().toLocaleTimeString();
}

// Wait time updater (refresh pills every 30s)
function refreshWaitTimes() {
  if (document.getElementById('view-queue').classList.contains('active')) renderQueue();
}

// ─────────────────────────────────────────────────────────────
// DEMO SEED DATA
// ─────────────────────────────────────────────────────────────
function seedDemoPatients() {
  const demos = [
    {
      name: 'Tariq Mahmood', age: 62, gender: 'Male',
      sympText: 'I have crushing chest pain radiating to my left arm, I can\'t breathe properly and I feel very dizzy. It started suddenly 30 minutes ago. Sweating heavily.',
      complaint: 'Crushing chest pain + SOB',
      vitals: { hr: 118, sbp: 88, dbp: 60, spo2: 91, temp: 37.2, rr: 24, pain: 9, gcs: 14 },
    },
    {
      name: 'Fatima Bibi', age: 34, gender: 'Female',
      sympText: 'Sudden severe headache, worst of my life, my face is drooping on one side and I can\'t speak properly. My right arm is very weak.',
      complaint: 'Sudden severe headache + facial droop',
      vitals: { hr: 96, sbp: 175, dbp: 108, spo2: 97, temp: 37.8, rr: 18, pain: 8, gcs: 14 },
    },
    {
      name: 'Ali Hassan', age: 8, gender: 'Male',
      sympText: 'The child has high fever since yesterday, he has a rash spreading on his body and he is vomiting. Feels very hot. Not eating anything.',
      complaint: 'High fever + rash + vomiting',
      vitals: { hr: 112, sbp: 105, dbp: 68, spo2: 96, temp: 39.6, rr: 22, pain: 5, gcs: 15 },
    },
    {
      name: 'Sara Akhtar', age: 27, gender: 'Female',
      sympText: 'I twisted my ankle badly while running. It hurts a lot when I put weight on it. Mild swelling. No other complaints.',
      complaint: 'Ankle injury',
      vitals: { hr: 80, sbp: 118, dbp: 76, spo2: 99, temp: 37.0, rr: 16, pain: 4, gcs: 15 },
    },
  ];

  demos.forEach(d => {
    const { detected } = parseSymptomText(d.sympText);
    const result = runKBS(d.vitals, detected, d.sympText);
    patientQueue.push({
      id: nextId++,
      name: d.name, age: d.age, gender: d.gender,
      complaint: d.complaint, sympText: d.sympText,
      vitals: d.vitals,
      detectedSymptoms: detected,
      priority: result.priority,
      originalPriority: result.priority,
      confidence: result.confidence,
      confidenceLabel: result.confidenceLabel,
      confidenceColor: result.confidenceColor,
      probableDisease: result.probableDisease,
      firedRules: result.firedRules,
      timestamp: new Date(Date.now() - Math.random() * 1800000),
      completed: false, overrideNote: null,
    });
  });

  sortQueue();
  updateHeaderStats();
}

// ─────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  updateClock();
  setInterval(updateClock, 1000);
  setInterval(refreshWaitTimes, 30000);
  seedDemoPatients();

  // Symptom textarea live NLP
  const symArea = document.getElementById('p-symptoms');
  if (symArea) symArea.addEventListener('input', onSymptomInput);
});
