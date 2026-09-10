/* Raspored — PWA. Podaci su u istom JSON formatu kao Android aplikacija. */
'use strict';

/* ---------- Pomoćne funkcije ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, attrs = {}, ...children) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k === 'style') n.style.cssText = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined && v !== false) n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) n.append(c.nodeType ? c : document.createTextNode(String(c)));
  return n;
};
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const sameDay = (a, b) => iso(a) === iso(b);
const toMin = hhmm => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const fromMin = t => { t = ((t % 1440) + 1440) % 1440; return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`; };
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const dow = d => (d.getDay() + 6) % 7 + 1; // 1 = pon … 7 = ned
const mondayOf = d => addDays(d, 1 - dow(d));
const daysBetween = (a, b) => Math.round((parseISO(iso(b)) - parseISO(iso(a))) / 86400000);
const weekNumber = d => { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - y0) / 86400000 + 1) / 7); };

const DAY_NAMES = ['Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota', 'Nedjelja'];
const DAY_SHORT = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet'];
const MONTH_GEN = ['siječnja', 'veljače', 'ožujka', 'travnja', 'svibnja', 'lipnja', 'srpnja', 'kolovoza', 'rujna', 'listopada', 'studenoga', 'prosinca'];
const hrDate = d => `${d.getDate()}. ${MONTH_GEN[d.getMonth()]}`;
const hrShort = d => `${d.getDate()}.${d.getMonth() + 1}.`;
const hrFull = s => { const d = parseISO(s); return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}.`; };
const shiftLabel = s => s === 'MORNING' ? 'jutarnja smjena' : 'popodnevna smjena';
const other = s => s === 'MORNING' ? 'AFTERNOON' : 'MORNING';

/* Boje: u JSON-u su ARGB kao decimalni Long (isto kao Android). */
const colorHex = argb => '#' + (Number(argb) & 0xffffff).toString(16).padStart(6, '0');
const hexToArgb = hex => (0xff000000 + parseInt(hex.slice(1), 16)) >>> 0;
const isDark = () => document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
const mix = (hex, t) => { const n = parseInt(hex.slice(1), 16); const r = n >> 16, g = (n >> 8) & 255, b = n & 255; const f = c => Math.round(c + (255 - c) * t); return `rgb(${f(r)},${f(g)},${f(b)})`; };
const subjFg = c => isDark() ? mix(colorHex(c), 0.5) : colorHex(c);
const subjBg = c => { const n = parseInt(colorHex(c).slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${isDark() ? 0.3 : 0.14})`; };

const SUBJECT_PALETTE = [0xFF534AB7, 0xFF0F6E56, 0xFF993C1D, 0xFF185FA5, 0xFF3B6D11, 0xFF854F0B, 0xFF993556, 0xFFA32D2D];
const ACCENT_PALETTE = [0xFF7F77DD, 0xFF1D9E75, 0xFFD85A30, 0xFF378ADD, 0xFFD4537E, 0xFF639922];
const DEFAULT_ITEMS = ['Udžbenik', 'Radna bilježnica', 'Bilježnica'];
const PRESET_ITEMS = ['Udžbenik', 'Radna bilježnica', 'Bilježnica', 'Zbirka zadataka', 'Čitanka', 'Oprema za tjelesni', 'Likovni pribor', 'Geometrijski pribor', 'Kalkulator', 'Mapa'];
const CITIES = [['Zagreb', 45.815, 15.982], ['Rijeka', 45.327, 14.442], ['Split', 43.508, 16.44], ['Osijek', 45.555, 18.695], ['Zadar', 44.119, 15.232], ['Pula', 44.867, 13.85], ['Varaždin', 46.306, 16.338], ['Slavonski Brod', 45.16, 18.016], ['Karlovac', 45.487, 15.548], ['Sisak', 45.487, 16.376], ['Šibenik', 43.735, 15.89], ['Dubrovnik', 42.65, 18.094]];

/* ---------- Zadani podaci ---------- */
function generatePeriods(start, lessons = 7, pre = 0) {
  const out = [];
  let t = toMin(start), p = t;
  for (let n = pre; n >= 1; n--) { p -= 50; out.unshift({ index: n - pre - 1, label: `${n}. predsat`, start: fromMin(p), end: fromMin(p + 45) }); }
  for (let i = 1; i <= lessons; i++) { out.push({ index: i, label: `${i}. sat`, start: fromMin(t), end: fromMin(t + 45) }); t += 45 + ([2, 3].includes(i) ? 10 : 5); }
  return out;
}
const defaultData = () => ({
  subjects: [
    { id: uid(), name: 'Matematika', short: 'MAT', color: SUBJECT_PALETTE[0], teacher: '', room: '', items: DEFAULT_ITEMS },
    { id: uid(), name: 'Hrvatski jezik', short: 'HRV', color: SUBJECT_PALETTE[1], teacher: '', room: '', items: DEFAULT_ITEMS },
    { id: uid(), name: 'Engleski jezik', short: 'ENG', color: SUBJECT_PALETTE[2], teacher: '', room: '', items: DEFAULT_ITEMS },
    { id: uid(), name: 'Tjelesna i zdravstvena kultura', short: 'TZK', color: SUBJECT_PALETTE[5], teacher: '', room: '', items: ['Oprema za tjelesni'] }
  ],
  morning: { periods: generatePeriods('08:00', 7), lessons: {} },
  afternoon: { periods: generatePeriods('14:00', 7, 2), lessons: {} },
  settings: {
    theme: 'system', accent: ACCENT_PALETTE[0], shiftMode: 'weekly', fixedShift: 'MORNING',
    referenceMonday: '2026-09-07', referenceShift: 'MORNING', reminderTime: '17:00', remindTwoDaysOral: true,
    bagReminderEnabled: false, bagReminderTime: '19:00', bagReminderMorningTime: '08:00', backupFolderUri: '',
    editLocked: false, city: 'Zagreb', dailyItems: ['Šlape', 'Voda']
  },
  holidays: [
    { id: 'h1', name: 'Dan sjećanja na žrtve Domovinskog rata', start: '2026-11-18', end: '2026-11-18' },
    { id: 'h2', name: 'Zimski odmor (1. dio)', start: '2026-12-24', end: '2027-01-06' },
    { id: 'h3', name: 'Zimski odmor (2. dio)', start: '2027-02-22', end: '2027-02-26' },
    { id: 'h4', name: 'Proljetni odmor', start: '2027-03-25', end: '2027-04-02' },
    { id: 'h5', name: 'Tijelovo', start: '2027-06-03', end: '2027-06-03' },
    { id: 'h6', name: 'Ljetni odmor', start: '2027-06-16', end: '2027-09-05' }
  ],
  exams: [], homework: [], exceptions: []
});

/* ---------- Stanje ---------- */
const STORE = 'raspored';
let D = load();
let tab = 'today';
let dayOffset = 0, weekOffset = 0;

function load() {
  const base = defaultData();
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) return base;
    return normalize(JSON.parse(raw), base);
  } catch { return base; }
}
function normalize(d, base = defaultData()) {
  const out = { ...base, ...d, settings: { ...base.settings, ...(d.settings || {}) } };
  for (const k of ['subjects', 'holidays', 'exams', 'homework', 'exceptions']) if (!Array.isArray(out[k])) out[k] = [];
  for (const s of ['morning', 'afternoon']) { out[s] = out[s] || base[s]; out[s].periods = out[s].periods || []; out[s].lessons = out[s].lessons || {}; }
  out.subjects = out.subjects.map(s => ({ teacher: '', room: '', items: DEFAULT_ITEMS, ...s, id: s.id || uid() }));
  return out;
}
function save() {
  localStorage.setItem(STORE, JSON.stringify(D));
  applyTheme();
  render();
}
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2200); }

/* ---------- Logika rasporeda ---------- */
const subject = id => D.subjects.find(s => s.id === id) || null;
const schedule = shift => shift === 'MORNING' ? D.morning : D.afternoon;
function shiftFor(monday) {
  const s = D.settings;
  if (s.shiftMode === 'fixed') return s.fixedShift;
  const ref = mondayOf(parseISO(s.referenceMonday));
  const weeks = Math.round(daysBetween(ref, monday) / 7);
  return weeks % 2 === 0 ? s.referenceShift : other(s.referenceShift);
}
const holidayOn = d => D.holidays.find(h => h.start <= iso(d) && iso(d) <= (h.end || h.start)) || null;

function dayView(date, live) {
  const shift = shiftFor(mondayOf(date));
  const day = dow(date), s = iso(date);
  const holiday = holidayOn(date);
  const base = { date, shift, lessons: [], isWeekend: day > 5, holiday };
  if (day > 5 || holiday) return base;
  const off = D.exceptions.find(e => e.date === s && e.period == null && e.kind === 'DAY_OFF');
  if (off) return { ...base, holiday: { name: off.note || 'Nema nastave', start: s, end: s, id: off.id } };
  const per = {}; D.exceptions.filter(e => e.date === s && e.period != null).forEach(e => per[e.period] = e);
  const sched = schedule(shift);
  const n = live ? nowMin() : null;
  const lessons = [];
  for (const p of sched.periods) {
    const ex = per[p.index];
    const original = subject((sched.lessons[day] || {})[p.index]);
    const subj = (ex && ex.kind === 'REPLACED' ? subject(ex.subjectId) : null) || original;
    if (!subj) continue;
    const status = n == null ? 'FUTURE' : n >= toMin(p.end) ? 'PAST' : n >= toMin(p.start) ? 'NOW' : 'FUTURE';
    lessons.push({
      period: p, subject: subj, status, cancelled: !!ex && ex.kind === 'CANCELLED', changed: !!ex, note: ex ? ex.note || '' : '',
      exams: D.exams.filter(e => e.subjectId === subj.id && e.date === s),
      homework: D.homework.filter(h => h.subjectId === subj.id && h.due === s)
    });
  }
  return { ...base, lessons };
}
const active = v => v.lessons.filter(l => !l.cancelled);
const isSchoolDay = v => !v.isWeekend && !v.holiday;
function nextSchoolDay(after) { let d = addDays(after, 1); for (let i = 0; i < 60; i++, d = addDays(d, 1)) if (isSchoolDay(dayView(d))) return d; return null; }
function nextOccurrence(subjectId, after) { let d = addDays(after, 1); for (let i = 0; i < 60; i++, d = addDays(d, 1)) if (active(dayView(d)).some(l => l.subject.id === subjectId)) return d; return null; }
function bagTargetDay() {
  const today = new Date(); const v = dayView(today);
  if (isSchoolDay(v)) { const first = active(v)[0]; if (first && nowMin() < toMin(first.period.start)) return today; }
  return nextSchoolDay(today);
}
const upcomingExams = (days = 60) => { const a = iso(new Date()), b = iso(addDays(new Date(), days)); return D.exams.filter(e => e.date >= a && e.date <= b).sort((x, y) => x.date.localeCompare(y.date)); };
const pendingHomework = () => { const a = iso(new Date()); return D.homework.filter(h => !h.done && h.due >= a).sort((x, y) => x.due.localeCompare(y.due)); };

/* ---------- Tema ---------- */
function applyTheme() {
  const t = D.settings.theme;
  if (t === 'system') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  document.documentElement.style.setProperty('--tint', colorHex(D.settings.accent));
  const n = parseInt(colorHex(D.settings.accent).slice(1), 16);
  document.documentElement.style.setProperty('--tint-soft', `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${isDark() ? 0.3 : 0.16})`);
}

/* ---------- Zaglavlje i navigacija ---------- */
function setHeader(title, subtitle, actions = [], extra = null) {
  $('#title').textContent = title; $('#subtitle').textContent = subtitle || '';
  const a = $('#nav-actions'); a.replaceChildren(...actions);
  const e = $('#nav-extra'); e.replaceChildren(); if (extra) e.append(extra);
}
const ICONS = {
  bag: '<svg viewBox="0 0 24 24"><path d="M6 8h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/><path d="M9 14h6"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  unlock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>'
};
const iconBtn = (name, label, onclick) => { const b = el('button', { class: 'icon-btn', 'aria-label': label, onclick }); b.innerHTML = ICONS[name]; return b; };
const lockBtn = () => iconBtn(D.settings.editLocked ? 'lock' : 'unlock', D.settings.editLocked ? 'Otključaj uređivanje' : 'Zaključaj uređivanje', () => { D.settings.editLocked = !D.settings.editLocked; save(); });
const lockedNote = () => el('div', { class: 'group' }, el('div', { class: 'empty' }, 'Uređivanje je zaključano da se raspored ne promijeni slučajno. Dodirni bravu za otključavanje.'));

$('#tabbar').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; tab = b.dataset.tab; render(); });

function render() {
  document.querySelectorAll('#tabbar button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  const main = $('#main'); main.replaceChildren(); window.scrollTo(0, 0);
  ({ today: renderToday, week: renderWeek, edit: renderEdit, subjects: renderSubjects, settings: renderSettings })[tab](main);
}

/* Horizontalno listanje (swipe) */
function swipeable(node, onSwipe) {
  let x0 = null, y0 = null;
  node.classList.add('pager');
  node.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  node.addEventListener('touchend', e => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) onSwipe(dx < 0 ? 1 : -1);
  });
}

/* ---------- Danas ---------- */
function renderToday(main) {
  const today = new Date(); const date = addDays(today, dayOffset);
  const live = dayOffset === 0; const v = dayView(date, live);
  const title = dayOffset === 0 ? 'Danas' : dayOffset === 1 ? 'Sutra' : dayOffset === -1 ? 'Jučer' : DAY_NAMES[dow(date) - 1];
  let sub = (Math.abs(dayOffset) <= 1 ? DAY_NAMES[dow(date) - 1] + ', ' : '') + hrDate(date);
  if (isSchoolDay(v)) sub += ' · ' + shiftLabel(v.shift);
  const actions = [];
  if (dayOffset !== 0) actions.push(el('button', { class: 'pill-btn', onclick: () => { dayOffset = 0; render(); } }, 'Danas'));
  actions.push(iconBtn('list', 'Ispiti i zadaće', openOverview), iconBtn('bag', 'U torbu', openBag));
  const tags = el('div', { class: 'tags', style: 'padding:0 0 4px' });
  if (dayOffset === 0) {
    const ex = upcomingExams()[0];
    if (ex) { const d = daysBetween(today, parseISO(ex.date)); tags.append(el('span', { class: 'tag exam' }, `Ispit ${subject(ex.subjectId)?.short || ''} · ${d === 0 ? 'danas' : d === 1 ? 'sutra' : 'za ' + d + ' d.'}`)); }
    const hw = pendingHomework().length; if (hw) tags.append(el('span', { class: 'tag hw' }, `${hw} ${hw === 1 ? 'zadaća' : 'zadaće'}`));
  }
  setHeader(title, sub, actions, tags.childElementCount ? tags : null);

  const page = el('div');
  if (v.holiday) page.append(el('div', { class: 'banner' }, 'Nema nastave', el('b', {}, v.holiday.name)));
  else if (v.isWeekend) page.append(el('div', { class: 'empty' }, 'Vikend — nema nastave.'));
  else if (!v.lessons.length) page.append(el('div', { class: 'empty' }, 'Nema unesenih sati. Dodaj ih u tabu Uredi.'));
  else for (const l of v.lessons) page.append(lessonRow(l, date));
  page.append(el('div', { class: 'note', style: 'text-align:center;padding-top:12px' }, 'Povuci lijevo ili desno za drugi dan'));
  swipeable(page, dir => { dayOffset += dir; render(); });
  main.append(page);
  if (live) { clearTimeout(renderToday.t); renderToday.t = setTimeout(() => { if (tab === 'today' && dayOffset === 0) render(); }, 30000); }
}
function lessonRow(l, date) {
  const isNow = l.status === 'NOW' && !l.cancelled;
  const fg = l.cancelled ? 'var(--text3)' : subjFg(l.subject.color);
  const row = el('div', { class: `lesson${isNow ? ' now' : ''}${l.cancelled ? ' cancelled' : ''}`, style: `--c:${fg};--cbg:${subjBg(l.subject.color)}`, onclick: () => openLesson(l, date) });
  const left = Math.max(0, toMin(l.period.end) - nowMin());
  let info = l.cancelled ? 'Otkazano' + (l.note ? ' · ' + l.note : '') : l.status === 'NOW' ? `Sada · još ${left} min` : l.status === 'PAST' ? 'Završeno' : l.period.label;
  if (!l.cancelled && l.subject.room) info += ` · uč. ${l.subject.room}`;
  if (l.changed && !l.cancelled) info += ' · promjena';
  const body = el('div', { class: 'grow' }, el('div', { class: 'name' }, l.subject.name), el('div', { class: 'info' }, info));
  if (l.exams.length || l.homework.length) {
    const t = el('div', { class: 'tags' });
    l.exams.forEach(e => t.append(el('span', { class: 'tag exam' }, `${e.type === 'PISMENI' ? 'Pismeni' : 'Usmeni'} ispit${e.note ? ' · ' + e.note : ''}`)));
    l.homework.forEach(h => t.append(el('span', { class: `tag hw${h.done ? ' done' : ''}` }, `Zadaća: ${h.text}`)));
    body.append(t);
  }
  row.append(el('div', { class: 'bar' }), el('div', { class: 'times' }, l.period.start, el('br'), l.period.end), body);
  return row;
}

/* ---------- Tjedan ---------- */
function renderWeek(main) {
  const today = new Date(); const monday = addDays(mondayOf(today), weekOffset * 7);
  const shift = shiftFor(monday);
  const actions = weekOffset ? [el('button', { class: 'pill-btn', onclick: () => { weekOffset = 0; render(); } }, 'Ovaj tjedan')] : [];
  setHeader(weekOffset ? `Tjedan ${weekNumber(monday)}` : 'Ovaj tjedan', `${hrShort(monday)} – ${hrShort(addDays(monday, 4))} · ${shiftLabel(shift)}`, actions);
  const days = [0, 1, 2, 3, 4].map(i => addDays(monday, i));
  const views = days.map(d => dayView(d));
  const sched = schedule(shift);
  const table = el('table', { class: 'week' });
  const head = el('tr', {}, el('th'));
  days.forEach((d, i) => head.append(el('th', { class: sameDay(d, today) ? 'today' : '' }, DAY_SHORT[i], el('small', {}, `${d.getDate()}.`))));
  table.append(head);
  for (const p of sched.periods) {
    const tr = el('tr', {}, el('td', { class: 'idx' }, p.index > 0 ? `${p.index}.` : `P${p.index + 3}`, el('small', {}, p.start)));
    views.forEach(v => {
      const l = v.lessons.find(x => x.period.index === p.index);
      const td = el('td', { class: 'cell' + (v.holiday ? ' holiday' : '') + (l && l.cancelled ? ' cancelled' : '') });
      if (!v.holiday) {
        if (l) { td.style.background = subjBg(l.subject.color); td.style.color = subjFg(l.subject.color); }
        td.append(el('span', {}, l ? l.subject.short : '–'));
        if (l && (l.exams.length || l.homework.some(h => !h.done))) td.append(el('i', { class: 'dot' + (l.exams.length ? ' exam' : '') }));
      }
      tr.append(td);
    });
    table.append(tr);
  }
  const page = el('div', {}, table);
  const hol = {}; views.forEach((v, i) => { if (v.holiday) (hol[v.holiday.name] = hol[v.holiday.name] || []).push(DAY_SHORT[i]); });
  for (const [name, ds] of Object.entries(hol)) page.append(el('div', { class: 'note', style: 'padding-top:10px;color:var(--holiday-text)' }, `${ds.join(', ')} — nema nastave: ${name}`));
  page.append(el('div', { class: 'note', style: 'padding-top:10px' }, 'P1 i P2 su predsati u popodnevnoj smjeni. Crvena točka = ispit, obojena točka = zadaća. Povuci za drugi tjedan.'));
  swipeable(page, dir => { weekOffset += dir; render(); });
  main.append(page);
}

/* ---------- Uredi ---------- */
let editShift = 'MORNING', editDay = 1;
function renderEdit(main) {
  setHeader('Uredi raspored', 'Satnica, predmeti po danima, praznici', [lockBtn()]);
  if (D.settings.editLocked) { main.append(lockedNote()); return; }
  const sched = schedule(editShift);
  const seg = el('div', { class: 'seg' }, ...[['MORNING', 'Jutarnja'], ['AFTERNOON', 'Popodnevna']].map(([k, t]) => el('button', { class: editShift === k ? 'on' : '', onclick: () => { editShift = k; render(); } }, t)));
  main.append(seg);

  main.append(el('div', { class: 'group-title' }, 'Satnica'));
  const g = el('div', { class: 'group' });
  for (const p of sched.periods) {
    g.append(el('div', { class: 'row' },
      el('div', { class: 'label', style: 'width:92px' }, p.label),
      el('input', { type: 'time', value: p.start, onchange: e => { p.start = e.target.value; save(); } }),
      el('span', { class: 'value' }, '–'),
      el('input', { type: 'time', value: p.end, onchange: e => { p.end = e.target.value; save(); } }),
      el('div', { class: 'grow' }),
      el('button', { class: 'destructive', 'aria-label': 'Ukloni', onclick: () => { sched.periods = sched.periods.filter(x => x !== p); for (const d in sched.lessons) delete sched.lessons[d][p.index]; save(); } }, trashIcon())
    ));
  }
  g.append(el('div', { class: 'row' },
    el('button', { class: 'link', onclick: () => { const next = Math.max(0, ...sched.periods.map(p => p.index)) + 1; const last = sched.periods[sched.periods.length - 1]; const st = last ? fromMin(toMin(last.end) + 5) : '08:00'; sched.periods.push({ index: next, label: `${next}. sat`, start: st, end: fromMin(toMin(st) + 45) }); save(); } }, 'Dodaj sat'),
    el('div', { class: 'grow' }),
    el('button', { class: 'link', onclick: openGenerate }, 'Generiraj satnicu')
  ));
  main.append(g, el('div', { class: 'note' }, 'Sat traje 45 min, odmori 5 min, nakon 2. i 3. sata 10 min. Vremena možeš ručno ispraviti.'));

  main.append(el('div', { class: 'group-title' }, 'Predmeti po danima'));
  main.append(el('div', { class: 'chips', style: 'padding:0 4px 8px' }, ...DAY_SHORT.map((t, i) => el('button', { class: 'chip' + (editDay === i + 1 ? ' on' : ''), onclick: () => { editDay = i + 1; render(); } }, t))));
  const g2 = el('div', { class: 'group' });
  for (const p of sched.periods) {
    const cur = (sched.lessons[editDay] || {})[p.index] || '';
    const sel = el('select', { onchange: e => { sched.lessons[editDay] = sched.lessons[editDay] || {}; if (e.target.value) sched.lessons[editDay][p.index] = e.target.value; else delete sched.lessons[editDay][p.index]; save(); } },
      el('option', { value: '' }, '— slobodno'), ...D.subjects.map(s => el('option', { value: s.id, selected: s.id === cur }, `${s.short} · ${s.name}`)));
    const s = subject(cur); if (s) { sel.style.background = subjBg(s.color); sel.style.color = subjFg(s.color); sel.style.fontWeight = '600'; }
    g2.append(el('div', { class: 'row' }, el('div', { class: 'label grow', style: 'color:var(--text3)' }, p.label), sel));
  }
  main.append(g2);

  main.append(el('div', { class: 'group-title' }, 'Praznici i neradni dani'));
  const g3 = el('div', { class: 'group' });
  for (const h of [...D.holidays].sort((a, b) => a.start.localeCompare(b.start))) {
    g3.append(el('div', { class: 'row' },
      el('div', { class: 'grow' }, el('div', { class: 'label' }, h.name), el('div', { class: 'detail' }, h.start === h.end ? hrFull(h.start) : `${hrFull(h.start)} – ${hrFull(h.end)}`)),
      el('button', { class: 'destructive', 'aria-label': 'Ukloni', onclick: () => { D.holidays = D.holidays.filter(x => x !== h); save(); } }, trashIcon())));
  }
  g3.append(el('div', { class: 'row' }, el('button', { class: 'link', onclick: openHoliday }, 'Dodaj praznik')));
  main.append(g3);
}
function trashIcon() { const s = el('span', { class: 'icon-btn', style: 'width:32px;height:32px;background:none;color:var(--red)' }); s.innerHTML = ICONS.trash; return s; }

/* ---------- Predmeti ---------- */
function renderSubjects(main) {
  const actions = [lockBtn()];
  if (!D.settings.editLocked) actions.push(el('button', { class: 'pill-btn', onclick: () => openSubject(null) }, 'Novi'));
  setHeader('Predmeti', 'Ime, kratica, boja i što se nosi', actions);
  if (D.settings.editLocked) { main.append(lockedNote()); return; }
  if (!D.subjects.length) { main.append(el('div', { class: 'empty' }, 'Još nema predmeta. Dodaj prvi gumbom Novi.')); return; }
  const g = el('div', { class: 'group' });
  for (const s of D.subjects) {
    const extra = [s.teacher, s.room ? 'uč. ' + s.room : ''].filter(Boolean).join(' · ');
    g.append(el('div', { class: 'row tappable', onclick: () => openSubject(s) },
      el('div', { class: 'swatch', style: `background:${subjBg(s.color)};color:${subjFg(s.color)}` }, s.short),
      el('div', { class: 'grow' }, el('div', { class: 'label', style: 'font-weight:600' }, s.name), extra && el('div', { class: 'detail' }, extra), el('div', { class: 'detail' }, s.items.length ? s.items.join(', ') : 'Ništa za nositi')),
      chevron()));
  }
  main.append(g);
}
function chevron() { const c = el('svg', { class: 'chev', viewBox: '0 0 8 14' }); c.innerHTML = '<path d="M1 1l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'; return c; }

/* ---------- Postavke ---------- */
function renderSettings(main) {
  setHeader('Postavke', 'Izgled, smjene, torba, podaci');
  const s = D.settings;
  const set = (k, v) => { s[k] = v; save(); };
  const toggle = (k) => el('button', { class: 'toggle' + (s[k] ? ' on' : ''), role: 'switch', 'aria-checked': !!s[k], onclick: () => set(k, !s[k]) });

  main.append(el('div', { class: 'group-title' }, 'Izgled'),
    el('div', { class: 'seg' }, ...[['system', 'Sustav'], ['light', 'Svijetla'], ['dark', 'Tamna']].map(([k, t]) => el('button', { class: s.theme === k ? 'on' : '', onclick: () => set('theme', k) }, t))),
    el('div', { class: 'group' }, el('div', { class: 'row' }, el('div', { class: 'label grow' }, 'Naglasna boja'),
      el('div', { class: 'colors' }, ...ACCENT_PALETTE.map(c => el('button', { class: 'color' + (s.accent === c ? ' on' : ''), style: `background:${colorHex(c)}`, 'aria-label': colorHex(c), onclick: () => set('accent', c) }))))));

  const monday = mondayOf(new Date());
  const cur = shiftFor(monday);
  const shiftSeg = (val, on) => el('div', { class: 'seg', style: 'margin:0;width:190px' }, ...[['MORNING', 'Jutarnja'], ['AFTERNOON', 'Popodnevna']].map(([k, t]) => el('button', { class: val === k ? 'on' : '', onclick: () => on(k) }, t)));
  main.append(el('div', { class: 'group-title' }, 'Smjene'),
    el('div', { class: 'seg' }, ...[['weekly', 'Izmjena tjedno'], ['fixed', 'Uvijek ista']].map(([k, t]) => el('button', { class: s.shiftMode === k ? 'on' : '', onclick: () => set('shiftMode', k) }, t))),
    el('div', { class: 'group' }, s.shiftMode === 'fixed'
      ? el('div', { class: 'row' }, el('div', { class: 'label grow' }, 'Smjena'), shiftSeg(s.fixedShift, k => set('fixedShift', k)))
      : el('div', { class: 'row' }, el('div', { class: 'grow' }, el('div', { class: 'label' }, 'Ovaj tjedan je'), el('div', { class: 'detail' }, 'Sljedeći tjedan se sama prebacuje')), shiftSeg(cur, k => { s.referenceMonday = iso(monday); s.referenceShift = k; save(); }))));

  main.append(el('div', { class: 'group-title' }, 'U torbu'),
    el('div', { class: 'group' },
      el('div', { class: 'row' }, el('div', { class: 'label grow' }, 'Grad za prognozu'),
        el('select', { onchange: e => set('city', e.target.value) }, ...CITIES.map(c => el('option', { value: c[0], selected: c[0] === s.city }, c[0])))),
      el('div', { class: 'row' }, el('div', { class: 'grow' }, el('div', { class: 'label' }, 'Svaki dan u torbu'),
        el('input', { type: 'text', value: s.dailyItems.join(', '), placeholder: 'Šlape, Voda', onchange: e => set('dailyItems', e.target.value.split(',').map(x => x.trim()).filter(Boolean)) })))),
    el('div', { class: 'note' }, 'Odvoji zarezom. Prognoza dolazi s Open-Meteo, bez računa.'));

  const exportBtn = el('button', { class: 'link', onclick: exportData }, 'Izvoz (JSON)');
  const fileIn = el('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: e => importFile(e.target.files[0]) });
  main.append(el('div', { class: 'group-title' }, 'Podaci'),
    el('div', { class: 'group' },
      el('div', { class: 'row' }, el('div', { class: 'grow' }, el('div', { class: 'label' }, 'Izvoz i uvoz'), el('div', { class: 'detail' }, 'Isti format kao Android aplikacija; uvoz zamjenjuje sve podatke')),),
      el('div', { class: 'row' }, exportBtn, el('div', { class: 'grow' }), el('button', { class: 'link', onclick: () => fileIn.click() }, 'Uvoz'), fileIn),
      el('div', { class: 'row' }, el('button', { class: 'destructive', onclick: () => { if (confirm('Vratiti zadane podatke? Sve uneseno se briše.')) { D = defaultData(); save(); } } }, 'Vrati zadane podatke'))),
    el('div', { class: 'note' }, 'Podaci se čuvaju u Safariju na ovom uređaju. Izvezi ih povremeno u Datoteke/iCloud Drive kao sigurnosnu kopiju.'));

  if (!isStandalone()) {
    const g = el('div', { class: 'group' });
    if (installPrompt) g.append(el('div', { class: 'row' }, el('div', { class: 'grow' }, el('div', { class: 'label' }, 'Instaliraj na telefon'), el('div', { class: 'detail' }, 'Ikona na početnom zaslonu, radi offline')), el('button', { class: 'pill-btn', onclick: async () => { installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; render(); } }, 'Instaliraj')));
    else if (IS_IOS) g.append(el('div', { class: 'row' }, el('div', { class: 'grow' }, el('div', { class: 'label' }, 'Dodaj na početni zaslon'), el('div', { class: 'detail' }, 'U Safariju: Dijeli → Dodaj na početni zaslon'))));
    else g.append(el('div', { class: 'row' }, el('div', { class: 'grow' }, el('div', { class: 'label' }, 'Instaliraj na telefon'), el('div', { class: 'detail' }, 'U Chromeu: izbornik ⋮ → Dodaj na početni zaslon / Instaliraj aplikaciju'))));
    main.append(el('div', { class: 'group-title' }, 'Instalacija'), g);
  }
  main.append(el('div', { class: 'group-title' }, 'O aplikaciji'),
    el('div', { class: 'group' },
      el('div', { class: 'row' }, el('div', { class: 'grow' }, el('div', { class: 'label' }, 'Raspored (web) 2.0'), el('div', { class: 'detail' }, IS_ANDROID ? 'Web verzija nema podsjetnike ni widgete — za njih instaliraj APK verziju. Podaci se sele izvozom/uvozom.' : 'Podsjetnici i widgeti nisu dostupni u web verziji na iPhoneu.')))));
}

/* ---------- Sheet (donji panel) ---------- */
function openSheet(build) {
  const sh = $('#sheet'), bd = $('#sheet-backdrop');
  sh.replaceChildren(el('div', { class: 'handle' })); build(sh);
  sh.hidden = false; bd.hidden = false;
  bd.onclick = closeSheet;
}
function closeSheet() { $('#sheet').hidden = true; $('#sheet-backdrop').hidden = true; }
const rowInput = (label, input) => el('div', { class: 'row' }, el('div', { class: 'label', style: 'min-width:90px' }, label), el('div', { class: 'grow' }, input));
const btn = (t, onclick, cls = '') => el('button', { class: cls, onclick }, t);

/* Detalji sata */
function openLesson(l, date) {
  const s = iso(date);
  openSheet(sh => {
    sh.append(el('h2', {}, l.subject.name),
      el('div', { class: 'sub' }, `${DAY_NAMES[dow(date) - 1]}, ${hrDate(date)} · ${l.period.label} · ${l.period.start}–${l.period.end}` + (l.subject.teacher ? ' · ' + l.subject.teacher : '') + (l.subject.room ? ' · uč. ' + l.subject.room : '')));
    if (l.changed) sh.append(el('div', { class: 'note', style: 'padding:6px 0;color:var(--holiday-text)' }, (l.cancelled ? 'Sat je otkazan za ovaj dan' : 'Jednokratna promjena za ovaj dan') + (l.note ? ': ' + l.note : '')));
    if (l.exams.length) {
      const g = el('div', { class: 'group' });
      l.exams.forEach(e => g.append(el('div', { class: 'row' }, el('div', { class: 'label grow' }, `${e.type === 'PISMENI' ? 'Pismeni' : 'Usmeni'} ispit${e.note ? ' · ' + e.note : ''}`), btn(trashIcon(), () => { D.exams = D.exams.filter(x => x.id !== e.id); save(); closeSheet(); }))));
      sh.append(el('div', { class: 'group-title' }, 'Ispit'), g);
    }
    const hw = D.homework.filter(h => h.subjectId === l.subject.id && (h.due === s || h.assigned === s));
    if (hw.length) {
      const g = el('div', { class: 'group' });
      hw.forEach(h => g.append(homeworkRow(h, s, () => openHomework(l.subject, date, h))));
      sh.append(el('div', { class: 'group-title' }, 'Zadaća'), g);
    }
    sh.append(el('div', { class: 'actions' }, btn('Zadaća', () => openHomework(l.subject, date, null)), btn('Ispit', () => openExam(l.subject, date)), btn('Promjena', () => openException(l, date))));
  });
}
function homeworkRow(h, contextIso, onEdit) {
  const chk = el('button', { class: 'check' + (h.done ? ' on' : ''), 'aria-label': 'Riješeno', onclick: e => { e.stopPropagation(); h.done = !h.done; save(); chk.classList.toggle('on', h.done); txt.classList.toggle('done', h.done); } });
  chk.innerHTML = ICONS.check;
  const txt = el('div', { class: 'label' + (h.done ? ' done' : '') }, h.text);
  return el('div', { class: 'row' }, chk, el('div', { class: 'grow' }, txt, el('div', { class: 'detail' }, h.due === contextIso ? 'Za predati ovaj dan' : `Za ${hrFull(h.due)}`)), onEdit && btn('Uredi', onEdit, 'link'));
}

/* Zadaća */
function openHomework(subj, date, existing) {
  const due = existing ? existing.due : iso(nextOccurrence(subj.id, date) || addDays(date, 1));
  openSheet(sh => {
    const text = el('textarea', { placeholder: 'Udžbenik str. 42, zad. 1–5; RB str. 18' }); text.value = existing ? existing.text : '';
    const dueIn = el('input', { type: 'date', value: due });
    sh.append(el('h2', {}, existing ? 'Uredi zadaću' : `Zadaća · ${subj.short}`),
      el('div', { class: 'group' }, el('div', { class: 'row' }, text), rowInput('Do kad', dueIn)),
      el('div', { class: 'note' }, `Zadano: sljedeći sat ${subj.short} po rasporedu.`),
      el('div', { class: 'actions' },
        existing && btn('Obriši', () => { D.homework = D.homework.filter(x => x.id !== existing.id); save(); closeSheet(); }, 'destructive'),
        btn('Odustani', closeSheet),
        btn('Spremi', () => {
          if (!text.value.trim()) { toast('Upiši što treba napraviti'); return; }
          if (existing) { existing.text = text.value.trim(); existing.due = dueIn.value; }
          else D.homework.push({ id: uid(), subjectId: subj.id, assigned: iso(date), due: dueIn.value, text: text.value.trim(), done: false });
          save(); closeSheet();
        }, 'primary')));
    setTimeout(() => text.focus(), 50);
  });
}

/* Ispit */
function openExam(subjPreset, date) {
  let subj = subjPreset || D.subjects[0]; let type = 'PISMENI';
  openSheet(sh => {
    const chips = el('div', { class: 'chips' });
    const drawChips = () => { chips.replaceChildren(...D.subjects.map(s => el('button', { class: 'chip' + (subj && s.id === subj.id ? ' on' : ''), onclick: () => { subj = s; drawChips(); } }, s.short))); };
    drawChips();
    const dateIn = el('input', { type: 'date', value: iso(date) });
    const note = el('input', { type: 'text', placeholder: 'Gradivo (neobavezno)' });
    const seg = el('div', { class: 'seg' }, ...[['PISMENI', 'Pismeni'], ['USMENI', 'Usmeni']].map(([k, t]) => el('button', { class: type === k ? 'on' : '', onclick: e => { type = k; [...seg.children].forEach(b => b.classList.toggle('on', b === e.currentTarget)); } }, t)));
    sh.append(el('h2', {}, 'Novi ispit'),
      el('div', { class: 'group' }, el('div', { class: 'row' }, chips), rowInput('Datum', dateIn), el('div', { class: 'row' }, seg), el('div', { class: 'row' }, note)),
      el('div', { class: 'actions' }, btn('Odustani', closeSheet), btn('Spremi', () => { if (!subj) return; D.exams.push({ id: uid(), subjectId: subj.id, date: dateIn.value, type, note: note.value.trim() }); save(); closeSheet(); }, 'primary')));
  });
}

/* Jednokratna promjena */
function openException(l, date) {
  const s = iso(date); let kind = 0, repl = null;
  openSheet(sh => {
    const kinds = ['Otkazan sat', 'Zamjena predmeta', 'Cijeli dan slobodan'];
    const g = el('div', { class: 'group' });
    const replRow = el('div', { class: 'row', hidden: true }, el('div', { class: 'chips' }));
    const drawRepl = () => { $('.chips', replRow).replaceChildren(...D.subjects.filter(x => x.id !== l.subject.id).map(x => el('button', { class: 'chip' + (repl && repl.id === x.id ? ' on' : ''), onclick: () => { repl = x; drawRepl(); } }, x.short))); };
    const draw = () => {
      g.replaceChildren(...kinds.map((k, i) => el('div', { class: 'row tappable', onclick: () => { kind = i; draw(); replRow.hidden = kind !== 1; } }, el('span', { class: 'radio' + (kind === i ? ' on' : '') }), el('div', { class: 'label grow' }, k))));
    };
    draw(); drawRepl();
    const note = el('input', { type: 'text', placeholder: 'Napomena (npr. Izlet, zamjena)' });
    sh.append(el('h2', {}, `Promjena za ${hrDate(date)}`), g, el('div', { class: 'group' }, replRow, el('div', { class: 'row' }, note)));
    const acts = el('div', { class: 'actions' });
    if (l.changed) acts.append(btn('Ukloni promjenu', () => { D.exceptions = D.exceptions.filter(e => !(e.date === s && e.period === l.period.index)); save(); closeSheet(); }, 'destructive'));
    acts.append(btn('Odustani', closeSheet), btn('Spremi', () => {
      if (kind === 1 && !repl) { toast('Odaberi zamjenski predmet'); return; }
      D.exceptions = kind === 2 ? D.exceptions.filter(e => e.date !== s) : D.exceptions.filter(e => !(e.date === s && e.period === l.period.index));
      D.exceptions.push(kind === 2 ? { id: uid(), date: s, period: null, kind: 'DAY_OFF', subjectId: null, note: note.value.trim() }
        : { id: uid(), date: s, period: l.period.index, kind: kind === 0 ? 'CANCELLED' : 'REPLACED', subjectId: kind === 1 ? repl.id : null, note: note.value.trim() });
      save(); closeSheet();
    }, 'primary'));
    sh.append(acts);
  });
}

/* Praznik */
function openHoliday() {
  openSheet(sh => {
    const name = el('input', { type: 'text', placeholder: 'Naziv' });
    const a = el('input', { type: 'date', value: iso(new Date()) }), b = el('input', { type: 'date', value: iso(new Date()) });
    a.onchange = () => { if (b.value < a.value) b.value = a.value; }; b.onchange = () => { if (a.value > b.value) a.value = b.value; };
    sh.append(el('h2', {}, 'Novi praznik'), el('div', { class: 'group' }, el('div', { class: 'row' }, name), rowInput('Od', a), rowInput('Do', b)),
      el('div', { class: 'actions' }, btn('Odustani', closeSheet), btn('Spremi', () => { if (!name.value.trim()) { toast('Unesi naziv'); return; } D.holidays.push({ id: uid(), name: name.value.trim(), start: a.value, end: b.value }); save(); closeSheet(); }, 'primary')));
  });
}

/* Generiraj satnicu */
function openGenerate() {
  const sched = schedule(editShift);
  openSheet(sh => {
    const start = el('input', { type: 'time', value: editShift === 'MORNING' ? '08:00' : '14:00' });
    const count = el('select', {}, ...[...Array(12)].map((_, i) => el('option', { value: i + 1, selected: i + 1 === 7 }, i + 1)));
    const pre = el('select', {}, ...[0, 1, 2, 3].map(n => el('option', { value: n, selected: n === (editShift === 'MORNING' ? 0 : 2) }, n)));
    sh.append(el('h2', {}, 'Generiraj satnicu'), el('div', { class: 'group' }, rowInput('Početak 1. sata', start), rowInput('Broj sati', count), rowInput('Predsati', pre)),
      el('div', { class: 'note' }, 'Postojeći predmeti ostaju na istim rednim brojevima sati.'),
      el('div', { class: 'actions' }, btn('Odustani', closeSheet), btn('Generiraj', () => {
        sched.periods = generatePeriods(start.value, Number(count.value), Number(pre.value));
        const valid = new Set(sched.periods.map(p => p.index));
        for (const d in sched.lessons) for (const k of Object.keys(sched.lessons[d])) if (!valid.has(Number(k))) delete sched.lessons[d][k];
        save(); closeSheet();
      }, 'primary')));
  });
}

/* Predmet */
function openSubject(existing) {
  let color = existing ? existing.color : SUBJECT_PALETTE[0]; let items = existing ? [...existing.items] : [...DEFAULT_ITEMS];
  openSheet(sh => {
    const name = el('input', { type: 'text', placeholder: 'Puno ime', value: existing ? existing.name : '' });
    const short = el('input', { type: 'text', placeholder: 'Kratica', maxlength: 5, value: existing ? existing.short : '', oninput: e => e.target.value = e.target.value.toUpperCase() });
    const teacher = el('input', { type: 'text', placeholder: 'Profesor (neobavezno)', value: existing ? existing.teacher : '' });
    const room = el('input', { type: 'text', placeholder: 'Učionica (neobavezno)', value: existing ? existing.room : '' });
    const colors = el('div', { class: 'colors' });
    const drawColors = () => colors.replaceChildren(...SUBJECT_PALETTE.map(c => el('button', { class: 'color' + (c === color ? ' on' : ''), style: `background:${colorHex(c)}`, 'aria-label': colorHex(c), onclick: () => { color = c; drawColors(); } })));
    drawColors();
    const chips = el('div', { class: 'chips' });
    const drawChips = () => chips.replaceChildren(...[...new Set([...PRESET_ITEMS, ...items])].map(it => el('button', { class: 'chip' + (items.includes(it) ? ' on' : ''), onclick: () => { items = items.includes(it) ? items.filter(x => x !== it) : [...items, it]; drawChips(); } }, it)));
    drawChips();
    const custom = el('input', { type: 'text', placeholder: 'Drugo…' });
    sh.append(el('h2', {}, existing ? 'Uredi predmet' : 'Novi predmet'),
      el('div', { class: 'group' }, el('div', { class: 'row' }, name), el('div', { class: 'row' }, short), el('div', { class: 'row' }, teacher), el('div', { class: 'row' }, room), el('div', { class: 'row' }, el('div', { class: 'label', style: 'min-width:90px' }, 'Boja'), colors)),
      el('div', { class: 'group-title' }, 'Što se nosi na sat'),
      el('div', { class: 'group' }, el('div', { class: 'row' }, chips), el('div', { class: 'row' }, el('div', { class: 'grow' }, custom), btn('Dodaj', () => { if (custom.value.trim()) { items.push(custom.value.trim()); custom.value = ''; drawChips(); } }, 'link'))),
      el('div', { class: 'actions' },
        existing && btn('Obriši', () => { if (!confirm(`Obrisati ${existing.name}?`)) return; D.subjects = D.subjects.filter(x => x.id !== existing.id); for (const sc of [D.morning, D.afternoon]) for (const d in sc.lessons) for (const k of Object.keys(sc.lessons[d])) if (sc.lessons[d][k] === existing.id) delete sc.lessons[d][k]; save(); closeSheet(); }, 'destructive'),
        btn('Odustani', closeSheet),
        btn('Spremi', () => {
          if (!name.value.trim() || !short.value.trim()) { toast('Unesi ime i kraticu'); return; }
          const v = { name: name.value.trim(), short: short.value.trim(), teacher: teacher.value.trim(), room: room.value.trim(), color, items };
          if (existing) Object.assign(existing, v); else D.subjects.push({ id: uid(), ...v });
          save(); closeSheet();
        }, 'primary')));
  });
}

/* U torbu */
let bagWeatherCache = {};
async function forecastFor(cityName, date) {
  const c = CITIES.find(x => x[0] === cityName) || CITIES[0];
  const key = `${c[0]}-${iso(new Date())}`;
  if (!bagWeatherCache[key]) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${c[1]}&longitude=${c[2]}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FZagreb&forecast_days=7`;
    const r = await fetch(url); const j = await r.json(); bagWeatherCache[key] = j.daily;
  }
  const d = bagWeatherCache[key]; const i = d.time.indexOf(iso(date)); if (i < 0) return null;
  const code = d.weather_code[i]; const RAINY = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99, 71, 73, 75, 85, 86];
  const desc = code === 0 ? 'vedro' : code <= 2 ? 'djelomično oblačno' : code === 3 ? 'oblačno' : code <= 48 ? 'magla' : code <= 57 ? 'rosulja' : [71, 73, 75, 77, 85, 86].includes(code) ? 'snijeg' : code >= 95 ? 'grmljavina' : 'kiša';
  const prob = Math.round(d.precipitation_probability_max[i] || 0);
  return { tMin: Math.round(d.temperature_2m_min[i]), tMax: Math.round(d.temperature_2m_max[i]), prob, desc, umbrella: prob >= 40 || RAINY.includes(code) };
}
function openBag() {
  const today = new Date(); let target = bagTargetDay();
  openSheet(sh => {
    const draw = async () => {
      sh.replaceChildren(el('div', { class: 'handle' }), el('h2', {}, 'U torbu'));
      if (!target) { sh.append(el('div', { class: 'empty' }, 'Nema školskih dana u sljedeća dva mjeseca.')); return; }
      const v = dayView(target); const away = daysBetween(today, target);
      sh.append(el('div', { class: 'sub' }, (away === 0 ? 'Danas, ' : away === 1 ? 'Sutra, ' : '') + `${DAY_NAMES[dow(target) - 1].toLowerCase()} ${hrDate(target)} · ${shiftLabel(v.shift)}`));
      if (away === 0) sh.append(el('div', { class: 'note', style: 'padding:4px 0' }, 'Nastava danas još nije počela, pa je ovo torba za danas.'));
      const next = nextSchoolDay(today);
      if (isSchoolDay(dayView(today)) && next) sh.append(el('div', { class: 'seg' }, el('button', { class: sameDay(target, today) ? 'on' : '', onclick: () => { target = today; draw(); } }, 'Danas'), el('button', { class: sameDay(target, today) ? '' : 'on', onclick: () => { target = next; draw(); } }, daysBetween(today, next) === 1 ? 'Sutra' : DAY_SHORT[dow(next) - 1])));
      const w = el('div', { class: 'group' }, el('div', { class: 'weather' }, el('span', { class: 'label' }, `Dohvaćam prognozu za ${D.settings.city}…`)));
      sh.append(w);
      const g1 = el('div', { class: 'group' }); D.settings.dailyItems.forEach(it => g1.append(checkLine(it)));
      sh.append(el('div', { class: 'group-title' }, 'Svaki dan'), g1);
      const subjects = []; active(v).forEach(l => { if (!subjects.some(s => s.id === l.subject.id)) subjects.push(l.subject); });
      const g2 = el('div', { class: 'group' });
      if (!subjects.length) g2.append(el('div', { class: 'empty' }, 'Nema unesenih sati.'));
      subjects.forEach(s => { g2.append(el('div', { class: 'row' }, el('div', { class: 'swatch', style: `width:32px;height:32px;background:${subjBg(s.color)};color:${subjFg(s.color)}` }, s.short), el('div', { class: 'label', style: 'font-weight:600' }, s.name))); s.items.forEach(it => g2.append(checkLine(it))); });
      sh.append(el('div', { class: 'group-title' }, 'Po predmetima'), g2);
      const hw = D.homework.filter(h => !h.done && h.due === iso(target)), ex = D.exams.filter(e => e.date === iso(target));
      if (hw.length || ex.length) {
        const g3 = el('div', { class: 'group' });
        ex.forEach(e => g3.append(el('div', { class: 'row' }, el('span', { class: 'tag exam' }, 'Ispit'), el('div', { class: 'label' }, `${e.type === 'PISMENI' ? 'Pismeni' : 'Usmeni'} ${subject(e.subjectId)?.short || ''}${e.note ? ' — ' + e.note : ''}`))));
        hw.forEach(h => g3.append(el('div', { class: 'row' }, el('span', { class: 'tag hw' }, 'Zadaća'), el('div', { class: 'label' }, `${subject(h.subjectId)?.short || ''}: ${h.text}`))));
        sh.append(el('div', { class: 'group-title' }, 'Ne zaboravi'), g3);
      }
      try {
        const f = await forecastFor(D.settings.city, target);
        w.replaceChildren(el('div', { class: 'weather' }, f ? el('div', {}, el('b', {}, f.umbrella ? 'Kišobran!' : 'Bez kišobrana'), el('div', { class: 'detail' }, `${f.desc}, ${f.tMin}–${f.tMax} °C, vjerojatnost kiše ${f.prob} %`)) : el('span', { class: 'detail' }, 'Prognoza za taj dan još nije dostupna')));
      } catch { w.replaceChildren(el('div', { class: 'weather' }, el('span', { class: 'detail' }, 'Prognoza nije dostupna (provjeri internet)'))); }
    };
    draw();
  });
}
function checkLine(text) {
  const c = el('button', { class: 'check', 'aria-label': text }); c.innerHTML = ICONS.check;
  const t = el('div', { class: 'label grow' }, text);
  const row = el('div', { class: 'row tappable' }, c, t);
  row.onclick = () => { c.classList.toggle('on'); t.classList.toggle('done'); };
  return row;
}

/* Pregled ispita i zadaća */
function openOverview() {
  const today = new Date();
  openSheet(sh => {
    sh.append(el('div', { style: 'display:flex;align-items:center;justify-content:space-between' }, el('h2', {}, 'Ispiti i zadaće'), el('button', { class: 'pill-btn', onclick: () => openExam(null, today) }, 'Novi ispit')));
    const ex = upcomingExams(); const g = el('div', { class: 'group' });
    if (!ex.length) g.append(el('div', { class: 'empty' }, 'Nema najavljenih ispita.'));
    ex.forEach(e => { const d = parseISO(e.date), n = daysBetween(today, d); g.append(el('div', { class: 'row' }, el('div', { class: 'grow' }, el('div', { class: 'label', style: 'font-weight:600' }, `${subject(e.subjectId)?.name || '?'} · ${e.type === 'PISMENI' ? 'pismeni' : 'usmeni'}`), el('div', { class: 'detail' }, `${DAY_NAMES[dow(d) - 1]}, ${hrDate(d)} · ${n === 0 ? 'danas' : n === 1 ? 'sutra' : 'za ' + n + ' dana'}${e.note ? ' · ' + e.note : ''}`)), btn(trashIcon(), () => { D.exams = D.exams.filter(x => x.id !== e.id); save(); openOverview(); }))); });
    sh.append(el('div', { class: 'group-title' }, 'Nadolazeći ispiti'), g);
    const hw = pendingHomework(); const g2 = el('div', { class: 'group' });
    if (!hw.length) g2.append(el('div', { class: 'empty' }, 'Sve je riješeno.'));
    hw.forEach(h => g2.append(homeworkRow(h, '', () => { const s = subject(h.subjectId); if (s) openHomework(s, parseISO(h.assigned), h); })));
    sh.append(el('div', { class: 'group-title' }, 'Zadaće za predati'), g2);
    const done = D.homework.filter(h => h.done).length;
    if (done) sh.append(el('div', { class: 'actions' }, btn(`Očisti riješene zadaće (${done})`, () => { D.homework = D.homework.filter(h => !h.done); save(); openOverview(); })));
  });
}

/* ---------- Izvoz / uvoz ---------- */
async function exportData() {
  const name = `raspored-${iso(new Date())}.json`;
  const blob = new Blob([JSON.stringify(D, null, 2)], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Raspored' }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = el('a', { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click(); a.remove();
}
function importFile(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => { try { D = normalize(JSON.parse(r.result)); save(); toast('Podaci uvezeni'); } catch { toast('Datoteka nije u ispravnom formatu'); } };
  r.readAsText(file);
}

/* ---------- Platforma i instalacija ---------- */
const IS_ANDROID = /Android/i.test(navigator.userAgent);
const IS_IOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
if (IS_ANDROID) document.documentElement.dataset.platform = 'android';
let installPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; if (tab === 'settings') render(); });
window.addEventListener('appinstalled', () => { installPrompt = null; toast('Aplikacija je instalirana'); if (tab === 'settings') render(); });
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

/* ---------- Start ---------- */
applyTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { applyTheme(); render(); });
render();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
