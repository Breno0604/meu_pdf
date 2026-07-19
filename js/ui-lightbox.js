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
