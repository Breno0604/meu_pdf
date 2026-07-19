function toggleTheme() {
  isDark = !isDark;
  document.body.classList.toggle('light', !isDark);
  document.getElementById('icoMoon').style.display = isDark ? '' : 'none';
  document.getElementById('icoSun').style.display = isDark ? 'none' : '';
}

function showEditor() {
  document.getElementById('dropzone').style.display = 'none';
  document.getElementById('editorView').style.display = 'block';
  document.getElementById('headerExportBtn').style.display = '';
  document.getElementById('resetBtn').style.display = '';
  document.getElementById('undoGroup').style.display = '';
}

function updateUI() {
  document.getElementById('pagesStat').textContent = `${pages.length} página${pages.length !== 1 ? 's' : ''}`;

  const target = getTarget();
  const comp = document.getElementById('exportComp')?.value || 'medium';
  let totalBytes = 0;
  for (const p of target) totalBytes += calcPageSize(p, comp);
  document.getElementById('topSizeEst').textContent = `Tamanho: ~${formatBytes(totalBytes)}`;

  updateSelUI(); updateUndoUI();
}

function handleCardClick(id, shiftKey) {
  if (shiftKey && lastSelectedId != null) {
    const idx1 = pages.findIndex(p => p.id === lastSelectedId);
    const idx2 = pages.findIndex(p => p.id === id);
    const start = Math.min(idx1, idx2);
    const end = Math.max(idx1, idx2);
    for (let i = start; i <= end; i++) {
      selIds.add(pages[i].id);
      document.querySelector(`.page-card[data-id="${pages[i].id}"]`)?.classList.add('selected');
    }
  } else {
    toggleSel(id);
    lastSelectedId = selIds.has(id) ? id : null;
  }
  updateUI();
}

function toggleSel(id) {
  selIds.has(id) ? selIds.delete(id) : selIds.add(id);
  document.querySelector(`.page-card[data-id="${id}"]`)?.classList.toggle('selected', selIds.has(id));
  updateUI();
}
function updateSelUI() {
  const n = selIds.size;
  document.getElementById('selBar').classList.toggle('on', n > 0);
  document.getElementById('selLabel').textContent = `${n} selecionada${n !== 1 ? 's' : ''}`;
  document.getElementById('selAllTxt').textContent = (n === pages.length && pages.length > 0) ? 'Desmarcar todas' : 'Selecionar todas';
}
function clearSelection() { selIds.clear(); document.querySelectorAll('.page-card.selected').forEach(c => c.classList.remove('selected')); updateUI(); lastSelectedId = null; }
function toggleSelectAll() { if (selIds.size === pages.length && pages.length) clearSelection(); else { pages.forEach(p => selIds.add(p.id)); document.querySelectorAll('.page-card').forEach(c => c.classList.add('selected')); updateUI(); } }
function getTarget() { return selIds.size > 0 ? pages.filter(p => selIds.has(p.id)) : [...pages]; }

function rotatePage(id, deg) {
  saveHistory();
  const page = pagePool.get(id); if (!page) return;
  page.rotation = norm(page.rotation + deg);
  refreshCard(id);
  if (document.getElementById('lightbox').classList.contains('on') && pages[lbIdx]?.id === id) renderLbPage(lbIdx);
}
function rotateSelected(deg) {
  saveHistory();
  (selIds.size > 0 ? pages.filter(p => selIds.has(p.id)) : pages).forEach(p => { p.rotation = norm(p.rotation + deg); refreshCard(p.id); });
}
function duplicatePage(id) {
  saveHistory();
  const idx = pages.findIndex(p => p.id === id); if (idx === -1) return;
  const src = pages[idx];
  const copy = { ...src, id: newId(), thumbCanvas: null, crop: src.crop ? { ...src.crop } : null };
  pagePool.set(copy.id, copy);
  pages.splice(idx + 1, 0, copy);
  renderGrid(); showToast('Página duplicada');
}
function duplicateSelected() {
  saveHistory();
  const targets = selIds.size > 0 ? [...pages.filter(p => selIds.has(p.id))] : [...pages];
  for (let i = targets.length - 1; i >= 0; i--) {
    const src = targets[i];
    const idx = pages.findIndex(p => p.id === src.id);
    const copy = { ...src, id: newId(), thumbCanvas: null, crop: src.crop ? { ...src.crop } : null };
    pagePool.set(copy.id, copy);
    pages.splice(idx + 1, 0, copy);
  }
  renderGrid(); showToast(`${targets.length} página${targets.length !== 1 ? 's' : ''} duplicada${targets.length !== 1 ? 's' : ''}`);
}
function deletePage(id) {
  saveHistory();
  pages = pages.filter(p => p.id !== id); selIds.delete(id);
  const card = document.querySelector(`.page-card[data-id="${id}"]`);
  if (card) { card.style.transform = 'scale(0.82)'; card.style.opacity = '0'; setTimeout(() => { card.remove(); updateUI(); }, 160); }
  else updateUI();
  if (!pages.length) setTimeout(resetApp, 200);
}
function deleteSelected() {
  saveHistory();
  const ids = selIds.size > 0 ? new Set(selIds) : new Set(pages.map(p => p.id));
  pages = pages.filter(p => !ids.has(p.id));
  ids.forEach(id => { selIds.delete(id); document.querySelector(`.page-card[data-id="${id}"]`)?.remove(); });
  updateUI(); if (!pages.length) setTimeout(resetApp, 200);
}

function setDim(page, w) { if (!w || isNaN(w) || w < 10) return; page.customW = Math.round(w); page.customH = Math.round(w * page.origH / page.origW); }
function applyBatchDim() { const w = parseInt(document.getElementById('batchW').value); if (!w || w < 10) return; saveHistory(); getTarget().forEach(p => { setDim(p, w); refreshCard(p.id); }); document.getElementById('batchW').value = ''; updateUI(); }
function resetBatchDim() { saveHistory(); getTarget().forEach(p => { p.customW = null; p.customH = null; refreshCard(p.id); }); updateUI(); }

function applyCanvasRot(canvas, rot) {
  const r = norm(rot);
  canvas.style.transform = r === 0 ? '' : r === 180 ? 'rotate(180deg)' :
    r === 90 ? 'rotate(90deg) scale(0.7)' : 'rotate(270deg) scale(0.7)';
}

function mountThumb(page, container) {
  if (!page.thumbCanvas) return;
  container.innerHTML = '';
  applyCanvasRot(page.thumbCanvas, page.rotation);
  container.appendChild(page.thumbCanvas);
}

function refreshCard(id) {
  const card = document.querySelector(`.page-card[data-id="${id}"]`);
  const page = pagePool.get(id);
  if (!card || !page) return;
  const dimEl = card.querySelector('.card-dim');
  const dimLbl = page.customW ? `${page.customW}×${page.customH}px` : `${Math.round(page.origW)}×${Math.round(page.origH)}${page.type === 'pdf' ? 'pt' : 'px'}`;
  dimEl.textContent = dimLbl;
  dimEl.className = 'card-dim' + (page.customW ? ' custom' : '');

  const szEl = card.querySelector('.card-sz');
  const comp = document.getElementById('exportComp')?.value || 'medium';
  if (szEl) szEl.textContent = `~${formatBytes(calcPageSize(page, comp))}`;

  card.classList.toggle('has-crop', !!page.crop);
  if (page.thumbCanvas) mountThumb(page, card.querySelector('.card-thumb'));
}

/* ════ UTILS DE MODAL E TOAST ════ */
function openModal(id) { document.getElementById(id).classList.add('on'); }
function closeModal(id) { document.getElementById(id).classList.remove('on'); }
function setProgress(done, total, msg) {
  const pct = total === 0 ? 100 : Math.round(done / total * 100);
  document.getElementById('progFill').style.width = pct + '%';
  document.getElementById('progPct').textContent = pct + '%';
  document.getElementById('progMsg').textContent = msg;
}

let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ════ CONTROLES DE VISÃO E GRID ════ */
function applyGridZoom(val) {
  gridZoom = parseInt(val);
  const grid = document.getElementById('pagesGrid');
  if (currentViewMode === 'grid') {
    grid.style.gridTemplateColumns = `repeat(auto-fill,minmax(${gridZoom}px,1fr))`;
  }
}

function setViewMode(mode) {
  if (currentViewMode === mode) return;
  currentViewMode = mode;
  const grid = document.getElementById('pagesGrid');
  document.getElementById('vtGrid').classList.toggle('active', mode === 'grid');
  document.getElementById('vtList').classList.toggle('active', mode === 'list');

  grid.classList.add('animating');
  setTimeout(() => {
    if (mode === 'list') {
      grid.classList.add('list-view');
      grid.style.gridTemplateColumns = '';
    } else {
      grid.classList.remove('list-view');
      grid.style.gridTemplateColumns = `repeat(auto-fill,minmax(${gridZoom}px,1fr))`;
    }
    renderGrid();
    grid.classList.remove('animating');
  }, 200);
}

function resetApp() {
  pdfSources = []; pagePool.clear(); pages = []; selIds.clear(); uid = 0;
  historyStack = []; redoStack = []; multiResults = [];
  document.getElementById('pagesGrid').innerHTML = '';
  document.getElementById('editorView').style.display = 'none';
  document.getElementById('dropzone').style.display = '';
  document.getElementById('headerExportBtn').style.display = 'none';
  document.getElementById('resetBtn').style.display = 'none';
  document.getElementById('undoGroup').style.display = 'none';
  document.getElementById('selBar').classList.remove('on');
  closeLightbox();
}
