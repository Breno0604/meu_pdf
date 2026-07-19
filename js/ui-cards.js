let _thumbObserver = null;
function getThumbObserver() {
  if (!_thumbObserver) {
    _thumbObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const card = entry.target;
        const id = card.dataset.id;
        const page = pagePool.get(id);
        if (!page || page.thumbCanvas) return;
        renderThumb(page, card.querySelector('.card-thumb'));
        _thumbObserver.unobserve(card);
      });
    }, { rootMargin: '200px' });
  }
  return _thumbObserver;
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
  const obs = getThumbObserver();
  pages.forEach((page, idx) => {
    const card = currentViewMode === 'list' ? buildListCard(page, idx) : buildCard(page);
    grid.appendChild(card);
    if (page.thumbCanvas) {
      mountThumb(page, card.querySelector('.card-thumb'));
    } else {
      obs.observe(card);
    }
  });
  updateUI();
}

function buildCard(page) {
  const card = document.createElement('div');
  card.className = 'page-card' + (selIds.has(page.id) ? ' selected' : '') + (page.crop ? ' has-crop' : '');
  card.dataset.id = page.id; card.draggable = true;
  const dimLbl = page.customW ? `${page.customW}×${page.customH}px` : `${Math.round(page.origW)}×${Math.round(page.origH)}${page.type === 'pdf' ? 'pt' : 'px'}`;
  const comp = document.getElementById('exportComp')?.value || 'medium';
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
  const comp = document.getElementById('exportComp')?.value || 'medium';
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
