pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

/* ════ UTILS ════ */
const tick = () => new Promise(r => setTimeout(r, 0));
const delay = ms => new Promise(r => setTimeout(r, ms));
const norm = r => ((r % 360) + 360) % 360;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const stripExt = n => n.replace(/\.[^.]+$/, '');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/* ════ STATE GERAL ════ */
let uid = 0, pdfSources = [], pagePool = new Map(), pages = [], selIds = new Set();
let lbIdx = 0, dragId = null, lastSelectedId = null;
let historyStack = [], redoStack = [];
let exportFmt = 'pdf';
let exportComp = 'original';
let multiResults = [];
let isDark = true;
let currentViewMode = 'grid';
let gridZoom = 146;

// Estado de Crop
let cropPageId = null, cropRect = { x: 0, y: 0, w: 1, h: 1 }, cropOrigW = 0, cropOrigH = 0;
let cropCanvasScale = 1, cropDragging = false;
let cropRawW = 0, cropRawH = 0;
let cropSelPx = { x: 0, y: 0, w: 0, h: 0 };

const newId = () => ++uid;

/* ════ HISTÓRICO ════ */
function snapshotPages() {
  return {
    ids: pages.map(p => p.id),
    meta: Object.fromEntries(pages.map(p => [p.id, {
      rotation: p.rotation, customW: p.customW, customH: p.customH,
      crop: p.crop ? { ...p.crop } : null
    }]))
  };
}

function saveHistory() {
  historyStack.push(snapshotPages());
  if (historyStack.length > 60) historyStack.shift();
  redoStack = [];
  updateUndoUI();
}

function undo() {
  if (!historyStack.length) return;
  redoStack.push(snapshotPages());
  restoreSnapshot(historyStack.pop());
  updateUndoUI();
  if (typeof showToast === 'function') showToast('Ação desfeita');
}

function redo() {
  if (!redoStack.length) return;
  historyStack.push(snapshotPages());
  restoreSnapshot(redoStack.pop());
  updateUndoUI();
  if (typeof showToast === 'function') showToast('Ação refeita');
}

function restoreSnapshot(snap) {
  pages = snap.ids.map(id => {
    const p = pagePool.get(id); if (!p) return null;
    const m = snap.meta[id];
    p.rotation = m.rotation; p.customW = m.customW; p.customH = m.customH;
    p.crop = m.crop ? { ...m.crop } : null;
    return p;
  }).filter(Boolean);
  if (typeof renderGrid === 'function') renderGrid();
}

function updateUndoUI() {
  document.getElementById('undoBtn').disabled = historyStack.length === 0;
  document.getElementById('redoBtn').disabled = redoStack.length === 0;
}

/* ════ COMPRESSION CONFIG ════ */
const COMP_CONFIG = {
  original: { max: 3000, quality: 0.96, mime: 'image/png',  byteFactor: 0.50 },
  basic:    { max: 1900, quality: 0.92, mime: 'image/jpeg', byteFactor: 0.20 },
  medium:   { max: 1500, quality: 0.80, mime: 'image/jpeg', byteFactor: 0.15 },
  high:     { max: 1200, quality: 0.75, mime: 'image/jpeg', byteFactor: 0.12 },
  extreme:  { max: 900,  quality: 0.65, mime: 'image/jpeg', byteFactor: 0.08 }
};

/* ════ CÁLCULO DE TAMANHO ════ */
function calcPageSize(page, comp) {
  const baseW = page.customW || page.origW;
  const baseH = page.customH || page.origH;
  const conf = COMP_CONFIG[comp] || COMP_CONFIG.medium;

  const scale = Math.min(1, conf.max / Math.max(baseW, baseH));
  const rW = baseW * scale, rH = baseH * scale;

  return rW * rH * conf.byteFactor;
}