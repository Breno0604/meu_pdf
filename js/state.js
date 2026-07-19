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
let exportComp = 'medium';
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

/* ════ CÁLCULO DE TAMANHO ════ */
function calcPageSize(page, comp) {
  const baseW = page.customW || page.origW;
  const baseH = page.customH || page.origH;
  let scale = 1;

  if (comp === 'medium') scale = Math.min(1, 1920 / Math.max(baseW, baseH));
  if (comp === 'high') scale = Math.min(1, 1500 / Math.max(baseW, baseH));
  if (comp === 'extreme') scale = Math.min(1, 1200 / Math.max(baseW, baseH));

  const rW = baseW * scale, rH = baseH * scale;
  const pixels = rW * rH;

  if (comp === 'original' && page.type === 'pdf' && !page.crop && !page.customW) {
    return (baseW * baseH * 0.5);
  } else if (comp === 'extreme') {
    return pixels * 0.08;
  } else if (comp === 'high') {
    return pixels * 0.12;
  } else if (comp === 'medium') {
    return pixels * 0.15;
  } else if (comp === 'basic') {
    return pixels * 0.20;
  } else {
    return pixels * 0.25;
  }
}