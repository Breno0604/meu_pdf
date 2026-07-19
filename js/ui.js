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

function renderGrid() {
  const grid = document.getElementById('pagesGrid');
  grid.innerHTML = '';
  if (currentViewMode === 'list') {
    grid.style.gridTemplateColumns = '';
  } else {
    grid.style.gridTemplateColumns = `repeat(auto-fill,minmax(${gridZoom}px,1fr))`;
  }
  if (!pages.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--muted);font-size:14px">
      Nenhuma página — <button class="btn btn-secondary btn-sm" style="display:inline-flex" id="emptyAddBtn">+ Adicionar</button>
    </div>`;
    const btn = document.getElementById('emptyAddBtn');
    if (btn) btn.addEventListener('click', () => document.getElementById('addMoreInput').click());
    updateUI(); return;
  }
  pages.forEach((page, idx) => {
    const card = currentViewMode === 'list' ? buildListCard(page, idx) : buildCard(page);
    grid.appendChild(card);
    if (!page.thumbCanvas) renderThumb(page, card.querySelector('.card-thumb'));
    else mountThumb(page, card.querySelector('.card-thumb'));
  });
  updateUI();
}

function updateUI() {
  document.getElementById('pagesStat').textContent = `${pages.length} página${pages.length !== 1 ? 's' : ''}`;

  // Atualizar tamanho estimado global baseado na opção selecionada
  const target = getTarget();
  const comp = document.getElementById('exportComp')?.value || 'original';
  let totalBytes = 0;
  for (const p of target) totalBytes += calcPageSize(p, comp);
  document.getElementById('topSizeEst').textContent = `Tamanho: ~${formatBytes(totalBytes)}`;

  updateSelUI(); updateUndoUI();
}

function buildCard(page) {
  const card = document.createElement('div');
  card.className = 'page-card' + (selIds.has(page.id) ? ' selected' : '') + (page.crop ? ' has-crop' : '');
  card.dataset.id = page.id; card.draggable = true;
  const dimLbl = page.customW ? `${page.customW}×${page.customH}px` : `${Math.round(page.origW)}×${Math.round(page.origH)}${page.type === 'pdf' ? 'pt' : 'px'}`;
  const comp = document.getElementById('exportComp')?.value || 'original';
  const sizeLbl = `~${formatBytes(calcPageSize(page, comp))}`;

  card.innerHTML = `
    <div class="card-check" title="Selecionar"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg></div>
    <div class="card-dim${page.customW ? ' custom' : ''}">${dimLbl}</div>
    <div class="card-sz" title="Tamanho Estimado">${sizeLbl}</div>
    <div class="card-crop-badge">✂ Recortado</div>
    <div class="card-thumb"><div class="spin-wrap"><div class="spinner"></div></div></div>
    <div class="card-actions">
      <button class="ca-btn" data-a="rl" title="↺ Girar"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.38"/></svg></button>
      <button class="ca-btn" data-a="rr" title="↻ Girar"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.49-4.38"/></svg></button>
      <button class="ca-btn dup" data-a="dup" title="Duplicar"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
      <button class="ca-btn crop" data-a="crop" title="Recortar"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 2 3 2 3 22"/><polyline points="18 22 21 22 21 2"/><line x1="3" y1="8" x2="21" y2="8"/><line x1="3" y1="16" x2="21" y2="16"/></svg></button>
      <div class="ca-sep"></div>
      <button class="ca-btn del" data-a="del" title="Excluir"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg></button>
    </div>
    <div class="card-label" title="${esc(page.label)}">${esc(page.label)}</div>
  `;
  bindCardEvents(card, page);
  return card;
}

function buildListCard(page, idx) {
  const card = document.createElement('div');
  card.className = 'page-card' + (selIds.has(page.id) ? ' selected' : '') + (page.crop ? ' has-crop' : '');
  card.dataset.id = page.id; card.draggable = true;
  const dimLbl = page.customW ? `${page.customW}×${page.customH}px` : `${Math.round(page.origW)}×${Math.round(page.origH)}${page.type === 'pdf' ? 'pt' : 'px'}`;
  const comp = document.getElementById('exportComp')?.value || 'original';
  const sizeLbl = `~${formatBytes(calcPageSize(page, comp))}`;

  card.innerHTML = `
    <div class="card-check" title="Selecionar"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg></div>
    <span class="list-idx">${idx + 1}</span>
    <div class="card-thumb"><div class="spin-wrap"><div class="spinner"></div></div></div>
    <div class="list-meta">
      <div class="card-label" title="${esc(page.label)}">${esc(page.label)}</div>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        <span class="card-dim${page.customW ? ' custom' : ''}" style="position:static;opacity:1;font-size:10px">${dimLbl}</span>
        ${page.crop ? '<span class="card-crop-badge" style="position:static;display:inline-flex">✂ Recortado</span>' : ''}
      </div>
    </div>
    <span class="card-sz" style="position:static;opacity:1;font-size:10px;margin-left:auto;margin-right:12px;">${sizeLbl}</span>
    <div class="card-actions" style="position:static;opacity:1;pointer-events:all;transform:none;background:none;border:none;padding:0">
      <button class="ca-btn" data-a="rl" title="↺ Girar"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.38"/></svg></button>
      <button class="ca-btn" data-a="rr" title="↻ Girar"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.49-4.38"/></svg></button>
      <button class="ca-btn dup" data-a="dup" title="Duplicar"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
      <button class="ca-btn crop" data-a="crop" title="Recortar"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 2 3 2 3 22"/><polyline points="18 22 21 22 21 2"/><line x1="3" y1="8" x2="21" y2="8"/><line x1="3" y1="16" x2="21" y2="16"/></svg></button>
      <div class="ca-sep"></div>
      <button class="ca-btn del" data-a="del" title="Excluir"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg></button>
    </div>
  `;
  bindCardEvents(card, page);
  return card;
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

function bindCardEvents(card, page) {
  card.querySelector('[data-a="rl"]').addEventListener('click', e => { e.stopPropagation(); rotatePage(page.id, -90); });
  card.querySelector('[data-a="rr"]').addEventListener('click', e => { e.stopPropagation(); rotatePage(page.id, 90); });
  card.querySelector('[data-a="dup"]').addEventListener('click', e => { e.stopPropagation(); duplicatePage(page.id); });
  card.querySelector('[data-a="crop"]').addEventListener('click', e => { e.stopPropagation(); openCrop(page.id); });
  card.querySelector('[data-a="del"]').addEventListener('click', e => { e.stopPropagation(); deletePage(page.id); });

  card.querySelector('.card-check').addEventListener('click', e => {
    e.stopPropagation();
    handleCardClick(page.id, e.shiftKey);
  });

  card.addEventListener('click', e => {
    if (e.target.closest('.card-actions') || e.target.closest('.card-check')) return;
    openLightbox(pages.findIndex(p => p.id === page.id));
  });

  card.addEventListener('dragstart', e => { dragId = page.id; card.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'card'); });
  card.addEventListener('dragover', e => {
    e.preventDefault();
    if (!dragId || dragId === page.id) return;
    document.querySelectorAll('.page-card').forEach(c => c.classList.remove('drop-before', 'drop-after'));
    if (currentViewMode === 'list') {
      card.classList.add('drop-before');
    } else {
      const mid = card.getBoundingClientRect().left + card.getBoundingClientRect().width / 2;
      card.classList.add(e.clientX < mid ? 'drop-before' : 'drop-after');
    }
  });
  card.addEventListener('drop', e => {
    e.preventDefault();
    if (!dragId || dragId === page.id) return;
    saveHistory();
    const fromIdx = pages.findIndex(p => p.id === dragId);
    if (fromIdx === -1) return;
    const item = pages.splice(fromIdx, 1)[0];
    const toIdx = pages.findIndex(p => p.id === page.id);
    if (currentViewMode === 'list') {
      pages.splice(toIdx, 0, item);
    } else {
      const after = e.clientX >= card.getBoundingClientRect().left + card.getBoundingClientRect().width / 2;
      pages.splice(after ? toIdx + 1 : toIdx, 0, item);
    }
    renderGrid();
  });
}

async function renderThumb(page, container) {
  try {
    const cv = document.createElement('canvas');
    const ctx = cv.getContext('2d');
    if (page.type === 'pdf') {
      const src = pdfSources[page.pdfSrcIdx];
      const pg = await src.pdfjs.getPage(page.pdfPageNum);
      const vp0 = pg.getViewport({ scale: 1 });
      const sc = 140 / vp0.width;
      const vp = pg.getViewport({ scale: sc });
      cv.width = vp.width; cv.height = vp.height;
      await pg.render({ canvasContext: ctx, viewport: vp }).promise;
    } else {
      const sc = Math.min(140 / page.origW, 186 / page.origH, 1);
      cv.width = page.origW * sc; cv.height = page.origH * sc;
      ctx.drawImage(page.imgEl, 0, 0, cv.width, cv.height);
    }
    page.thumbCanvas = cv;
    mountThumb(page, container);
  } catch { container.innerHTML = `<div style="font-size:10px;color:var(--muted);padding:8px;text-align:center">Erro</div>`; }
}

function mountThumb(page, container) {
  if (!page.thumbCanvas) return;
  container.innerHTML = '';
  applyCanvasRot(page.thumbCanvas, page.rotation);
  container.appendChild(page.thumbCanvas);
}

function applyCanvasRot(canvas, rot) {
  const r = norm(rot);
  canvas.style.transform = r === 0 ? '' : r === 180 ? 'rotate(180deg)' :
    r === 90 ? 'rotate(90deg) scale(0.7)' : 'rotate(270deg) scale(0.7)';
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
  const comp = document.getElementById('exportComp')?.value || 'original';
  if (szEl) szEl.textContent = `~${formatBytes(calcPageSize(page, comp))}`;

  card.classList.toggle('has-crop', !!page.crop);
  if (page.thumbCanvas) mountThumb(page, card.querySelector('.card-thumb'));
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

/* ════ LIGHTBOX ZOOM & PAN ════ */
let lbScale = 1;
let lbPanX = 0, lbPanY = 0;
let lbIsPanning = false, lbStartPanX, lbStartPanY;

function resetLbTransform() {
  lbScale = 1; lbPanX = 0; lbPanY = 0;
  applyLbTransform();
}
function applyLbTransform() {
  const wrap = document.getElementById('lbTransformWrap');
  if (!wrap) return;
  wrap.style.transform = `translate(${lbPanX}px, ${lbPanY}px) scale(${lbScale})`;
}

function openLightbox(idx) {
  if (idx < 0 || idx >= pages.length) return;
  lbIdx = idx;
  const lb = document.getElementById('lightbox');
  lb.style.display = 'flex';
  resetLbTransform();
  requestAnimationFrame(() => { lb.classList.add('on'); renderLbPage(idx); });
}
function closeLightbox() { const lb = document.getElementById('lightbox'); lb.classList.remove('on'); setTimeout(() => { lb.style.display = 'none'; }, 240); }

async function navLb(dir) {
  const ni = lbIdx + dir; if (ni < 0 || ni >= pages.length) return;
  const cv = document.getElementById('lbCanvas');
  cv.style.opacity = '0'; cv.style.transform = `translateX(${dir > 0 ? '24px' : '-24px'})`;
  await delay(160);
  lbIdx = ni; resetLbTransform(); await renderLbPage(ni);
  cv.style.transition = 'opacity .2s,transform .2s var(--out)';
  cv.style.opacity = '1'; cv.style.transform = '';
  setTimeout(() => { cv.style.transition = ''; }, 220);
}

async function renderLbPage(idx) {
  const page = pages[idx]; if (!page) return;
  document.getElementById('lbTitle').textContent = page.label;
  document.getElementById('lbNavInfo').textContent = `${idx + 1} / ${pages.length}`;
  document.getElementById('lbPrev').classList.toggle('disabled', idx === 0);
  document.getElementById('lbNext').classList.toggle('disabled', idx === pages.length - 1);
  const selBtn = document.getElementById('lbSelBtn');
  selBtn.textContent = selIds.has(page.id) ? 'Desmarcar' : 'Selecionar';
  selBtn.className = selIds.has(page.id) ? 'btn btn-ghost btn-sm' : 'btn btn-secondary btn-sm';
  const w = document.getElementById('lbDimW'), h = document.getElementById('lbDimH');
  w.value = page.customW || ''; w.placeholder = Math.round(page.origW) + '';
  h.value = page.customH || ''; h.placeholder = Math.round(page.origH) + '';
  document.getElementById('lbDimUnit').textContent = page.type === 'pdf' ? 'pt' : 'px';
  const canvas = document.getElementById('lbCanvas');
  const ctx = canvas.getContext('2d');
  const maxW = window.innerWidth - 240, maxH = window.innerHeight - 180;
  if (page.type === 'pdf') {
    const src = pdfSources[page.pdfSrcIdx];
    const pg = await src.pdfjs.getPage(page.pdfPageNum);
    const vp0 = pg.getViewport({ scale: 1 });
    const sc = Math.min(maxW / vp0.width, maxH / vp0.height, 2);
    const vp = pg.getViewport({ scale: sc });
    canvas.width = vp.width; canvas.height = vp.height;
    await pg.render({ canvasContext: ctx, viewport: vp }).promise;
  } else {
    const sc = Math.min(maxW / page.origW, maxH / page.origH, 1);
    canvas.width = page.origW * sc; canvas.height = page.origH * sc;
    ctx.drawImage(page.imgEl, 0, 0, canvas.width, canvas.height);
  }
  applyCanvasRot(canvas, page.rotation);
}

function onLbDimChange() { const page = pages[lbIdx]; if (!page) return; const w = parseInt(document.getElementById('lbDimW').value); document.getElementById('lbDimH').value = w > 0 ? Math.round(w * page.origH / page.origW) : ''; }
function applyLbDim() { const page = pages[lbIdx]; if (!page) return; const w = parseInt(document.getElementById('lbDimW').value); if (!w || w < 10) return; saveHistory(); setDim(page, w); refreshCard(page.id); updateUI(); document.getElementById('lbDimW').classList.add('flash'); setTimeout(() => document.getElementById('lbDimW').classList.remove('flash'), 350); }
function resetLbDim() { const page = pages[lbIdx]; if (!page) return; saveHistory(); page.customW = null; page.customH = null; refreshCard(page.id); updateUI(); document.getElementById('lbDimW').value = ''; document.getElementById('lbDimH').value = ''; }
function lbRotate(deg) { const p = pages[lbIdx]; if (p) { rotatePage(p.id, deg); renderLbPage(lbIdx); } }
function lbDelete() { const p = pages[lbIdx]; if (p) { deletePage(p.id); closeLightbox(); } }
function lbDuplicate() { const p = pages[lbIdx]; if (p) { duplicatePage(p.id); } }
function toggleLbSelect() { const page = pages[lbIdx]; if (!page) return; toggleSel(page.id); const btn = document.getElementById('lbSelBtn'); btn.textContent = selIds.has(page.id) ? 'Desmarcar' : 'Selecionar'; btn.className = selIds.has(page.id) ? 'btn btn-ghost btn-sm' : 'btn btn-secondary btn-sm'; }
function openCropFromLb() { const p = pages[lbIdx]; if (p) { closeLightbox(); setTimeout(() => openCrop(p.id), 260); } }

/* ════ CROP ════ */
async function openCrop(pageId) {
  cropPageId = pageId;
  const page = pagePool.get(pageId); if (!page) return;
  const cm = document.getElementById('cropModal');
  cm.style.display = 'flex';
  requestAnimationFrame(() => cm.classList.add('on'));
  document.getElementById('cropTitle').textContent = `Recortar: ${page.label}`;

  const bgCv = document.getElementById('cropImageCanvas');
  const bgCtx = bgCv.getContext('2d');
  const cv = document.getElementById('cropCanvas');
  cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);

  const maxW = window.innerWidth - 120, maxH = window.innerHeight - 200;

  if (page.type === 'pdf') {
    const src = pdfSources[page.pdfSrcIdx];
    const pg = await src.pdfjs.getPage(page.pdfPageNum);
    const vp0 = pg.getViewport({ scale: 1 });
    const sc = Math.min(maxW / vp0.width, maxH / vp0.height, 2);
    const vp = pg.getViewport({ scale: sc });
    bgCv.width = vp.width; bgCv.height = vp.height;
    cv.width = vp.width; cv.height = vp.height;
    await pg.render({ canvasContext: bgCtx, viewport: vp }).promise;
    cropRawW = vp0.width; cropRawH = vp0.height;
    cropCanvasScale = sc;
  } else {
    const sc = Math.min(maxW / page.origW, maxH / page.origH, 1);
    bgCv.width = Math.round(page.origW * sc); bgCv.height = Math.round(page.origH * sc);
    cv.width = bgCv.width; cv.height = bgCv.height;
    bgCtx.drawImage(page.imgEl, 0, 0, bgCv.width, bgCv.height);
    cropRawW = page.origW; cropRawH = page.origH;
    cropCanvasScale = sc;
  }

  const c = page.crop;
  if (c) {
    cropSelPx = { x: c.x * cv.width, y: c.y * cv.height, w: c.w * cv.width, h: c.h * cv.height };
  } else {
    cropSelPx = { x: 0, y: 0, w: cv.width, h: cv.height };
  }
  drawCropOverlay(); syncCropInputs(); bindCropEvents(cv);
}

function closeCrop() {
  const cm = document.getElementById('cropModal');
  cm.classList.remove('on');
  setTimeout(() => { cm.style.display = 'none'; unbindCropEvents(); }, 240);
}

function applyCrop() {
  const page = pagePool.get(cropPageId); if (!page) return;
  const cv = document.getElementById('cropCanvas');
  const nx = cropSelPx.x / cv.width, ny = cropSelPx.y / cv.height;
  const nw = cropSelPx.w / cv.width, nh = cropSelPx.h / cv.height;
  if (nx <= 0.001 && ny <= 0.001 && nw >= 0.998 && nh >= 0.998) {
    saveHistory(); page.crop = null;
  } else {
    saveHistory(); page.crop = { x: nx, y: ny, w: nw, h: nh };
  }
  page.thumbCanvas = null;
  refreshCard(page.id);
  const card = document.querySelector(`.page-card[data-id="${page.id}"]`);
  if (card) renderThumb(page, card.querySelector('.card-thumb'));
  closeCrop(); updateUI();
  showToast(page.crop ? 'Recorte aplicado' : 'Recorte removido');
}

function cropReset() {
  const cv = document.getElementById('cropCanvas');
  cropSelPx = { x: 0, y: 0, w: cv.width, h: cv.height };
  drawCropOverlay(); syncCropInputs();
}

function drawCropOverlay() {
  const cv = document.getElementById('cropCanvas');
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.clearRect(cropSelPx.x, cropSelPx.y, cropSelPx.w, cropSelPx.h);
  ctx.strokeStyle = 'rgba(59,130,246,1)';
  ctx.lineWidth = 2;
  ctx.strokeRect(cropSelPx.x, cropSelPx.y, cropSelPx.w, cropSelPx.h);
  const hs = 8;
  ctx.fillStyle = '#3B82F6';
  [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([fx, fy]) => {
    ctx.fillRect(cropSelPx.x + fx * cropSelPx.w - hs / 2, cropSelPx.y + fy * cropSelPx.h - hs / 2, hs, hs);
  });
  ctx.strokeStyle = 'rgba(255,255,255,.15)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(cropSelPx.x + cropSelPx.w * i / 3, cropSelPx.y); ctx.lineTo(cropSelPx.x + cropSelPx.w * i / 3, cropSelPx.y + cropSelPx.h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cropSelPx.x, cropSelPx.y + cropSelPx.h * i / 3); ctx.lineTo(cropSelPx.x + cropSelPx.w, cropSelPx.y + cropSelPx.h * i / 3); ctx.stroke();
  }
}

function syncCropInputs() {
  const cv = document.getElementById('cropCanvas');
  const sc = cropRawW / cv.width;
  document.getElementById('cropX').value = Math.round(cropSelPx.x * sc);
  document.getElementById('cropY').value = Math.round(cropSelPx.y * sc);
  document.getElementById('cropW').value = Math.round(cropSelPx.w * sc);
  document.getElementById('cropH').value = Math.round(cropSelPx.h * sc);
}

function bindCropEvents(cv) {
  unbindCropEvents();
  let startX, startY;
  cv.onmousedown = e => {
    const rect = cv.getBoundingClientRect();
    const scaleX = cv.width / rect.width;
    const scaleY = cv.height / rect.height;
    startX = (e.clientX - rect.left) * scaleX;
    startY = (e.clientY - rect.top) * scaleY;
    cropDragging = true;
  };
  cv.onmousemove = e => {
    if (!cropDragging) return;
    const rect = cv.getBoundingClientRect();
    const scaleX = cv.width / rect.width;
    const scaleY = cv.height / rect.height;
    const mx = clamp((e.clientX - rect.left) * scaleX, 0, cv.width);
    const my = clamp((e.clientY - rect.top) * scaleY, 0, cv.height);
    const x = Math.min(startX, mx), y = Math.min(startY, my);
    const w = Math.abs(mx - startX), h = Math.abs(my - startY);
    cropSelPx = { x, y, w: Math.max(1, w), h: Math.max(1, h) };
    drawCropOverlay(); syncCropInputs();
  };
  cv.onmouseup = () => { cropDragging = false; };
  cv.onmouseleave = () => { cropDragging = false; };
}

function unbindCropEvents() {
  const cv = document.getElementById('cropCanvas');
  if (cv) { cv.onmousedown = null; cv.onmousemove = null; cv.onmouseup = null; cv.onmouseleave = null; }
}

/* ════ RESULT MODAL ════ */
function showMultiResults(title, msg) {
  document.getElementById('resMultiTitle').textContent = title;
  document.getElementById('resMultiMsg').textContent = msg;
  const list = document.getElementById('resMultiList');
  list.innerHTML = '';
  multiResults.forEach((r, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="result-name">${esc(r.name)}</span><button class="dl-btn">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      Baixar</button>`;
    li.querySelector('.dl-btn').addEventListener('click', () => triggerDlBlob(multiResults[i].blob, multiResults[i].name));
    list.appendChild(li);
  });
  openModal('resultMultiModal');
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