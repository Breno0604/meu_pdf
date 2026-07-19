// ================= UTILS =================
function estimatePdfSize(pages, comp) {
  let total = 0;
  for (const p of pages) total += calcPageSize(p, comp);
  return (total / (1024 * 1024)).toFixed(2);
}

async function processInBatches(items, batchSize, fn) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(fn));
  }
}

// ================= LOAD =================
async function handleFiles(fileList) {
  const files = Array.from(fileList).filter(f => f.type === 'application/pdf' || f.type.startsWith('image/'));
  if (!files.length) return;

  showEditor();
  openModal('progressModal');

  if (pages.length) saveHistory();

  for (let i = 0; i < files.length; i++) {
    setProgress(i, files.length, `Carregando: ${files[i].name}`);
    try {
      if (files[i].type === 'application/pdf') await loadPDF(files[i]);
      else await loadImage(files[i]);
    } catch (err) {
      console.warn('Erro:', files[i].name, err);
    }
    await tick();
  }

  setProgress(files.length, files.length, 'Pronto!');
  await delay(250);
  closeModal('progressModal');
  renderGrid();
}

async function loadPDF(file) {
  const bytes = await file.arrayBuffer();

  const [pdfjs, pdflib] = await Promise.all([
    pdfjsLib.getDocument({ data: bytes }).promise,
    PDFLib.PDFDocument.load(bytes)
  ]);

  const srcIdx = pdfSources.length;
  pdfSources.push({ pdfjs, pdflib, filename: file.name });

  const n = pdfjs.numPages;

  for (let p = 1; p <= n; p++) {
    const plPage = pdflib.getPage(p - 1);
    const { width: origW, height: origH } = plPage.getSize();

    const obj = {
      id: newId(),
      type: 'pdf',
      rotation: 0,
      thumbCanvas: null,
      label: n > 1 ? `${stripExt(file.name)} — p.${p}` : stripExt(file.name),
      pdfSrcIdx: srcIdx,
      pdfPageIdx: p - 1,
      pdfPageNum: p,
      origW,
      origH,
      customW: null,
      customH: null,
      crop: null
    };

    pagePool.set(obj.id, obj);
    pages.push(obj);
  }
}

async function loadImage(file) {
  const bytes = await file.arrayBuffer();
  const url = URL.createObjectURL(new Blob([bytes], { type: file.type }));

  const imgEl = await new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = url;
  });

  const obj = {
    id: newId(),
    type: 'image',
    rotation: 0,
    thumbCanvas: null,
    label: file.name,
    imageBytes: bytes,
    mimeType: file.type,
    imgEl,
    imgUrl: url,
    origW: imgEl.naturalWidth,
    origH: imgEl.naturalHeight,
    customW: null,
    customH: null,
    crop: null
  };

  pagePool.set(obj.id, obj);
  pages.push(obj);
}

// ================= RENDER =================
async function renderPageToCanvas(page, comp) {
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const baseW = page.customW || page.origW;
  const baseH = page.customH || page.origH;

  const conf = COMP_CONFIG[comp] || COMP_CONFIG.medium;
  const scale = Math.min(1, conf.max / Math.max(baseW, baseH));

  const rW = Math.round(baseW * scale);
  const rH = Math.round(baseH * scale);

  const tmp = document.createElement('canvas');
  const tc = tmp.getContext('2d');

  tc.imageSmoothingEnabled = true;
  tc.imageSmoothingQuality = 'high';

  if (page.type === 'pdf') {
    const src = pdfSources[page.pdfSrcIdx];
    const pg = await src.pdfjs.getPage(page.pdfPageNum);

    const vp0 = pg.getViewport({ scale: 1 });
    const sc = rW / vp0.width;

    const vp = pg.getViewport({ scale: sc, rotation: norm(page.rotation) });

    tmp.width = vp.width;
    tmp.height = vp.height;

    await pg.render({ canvasContext: tc, viewport: vp }).promise;

  } else {
    const r = norm(page.rotation);

    tmp.width = (r === 90 || r === 270) ? rH : rW;
    tmp.height = (r === 90 || r === 270) ? rW : rH;

    tc.save();
    tc.translate(tmp.width / 2, tmp.height / 2);
    tc.rotate(r * Math.PI / 180);

    // 🔥 downscale progressivo
    let source = page.imgEl;
    let sw = source.width;
    let sh = source.height;

    while (sw > rW * 2) {
      sw *= 0.5;
      sh *= 0.5;

      const c = document.createElement('canvas');
      c.width = sw;
      c.height = sh;
      c.getContext('2d').drawImage(source, 0, 0, sw, sh);
      source = c;
    }

    tc.drawImage(source, -rW / 2, -rH / 2, rW, rH);

    tc.restore();
  }

  if (page.crop) {
    const { x, y, w, h } = page.crop;

    const cx = Math.round(x * tmp.width);
    const cy = Math.round(y * tmp.height);
    const cw = Math.round(w * tmp.width);
    const ch = Math.round(h * tmp.height);

    cv.width = Math.max(1, cw);
    cv.height = Math.max(1, ch);

    ctx.drawImage(tmp, cx, cy, cw, ch, 0, 0, cw, ch);
  } else {
    cv.width = tmp.width;
    cv.height = tmp.height;
    ctx.drawImage(tmp, 0, 0);
  }

  return cv;
}

// ================= PDF =================
async function addPageToPdfDoc(outDoc, page, comp) {
  const needsRaster = comp !== 'original' || page.type !== 'pdf' || page.customW != null || page.crop != null;

  if (!needsRaster) {
    const src = pdfSources[page.pdfSrcIdx];
    const [copied] = await outDoc.copyPages(src.pdflib, [page.pdfPageIdx]);

    const existRot = copied.getRotation().angle || 0;
    copied.setRotation(PDFLib.degrees(norm(existRot + page.rotation)));

    outDoc.addPage(copied);
    return;
  }

  const cv = await renderPageToCanvas(page, comp);
  const conf = COMP_CONFIG[comp] || COMP_CONFIG.medium;

  const blob = await new Promise(r => cv.toBlob(r, conf.mime, conf.quality));
  if (!blob) throw new Error('toBlob falhou');

  const buf = new Uint8Array(await blob.arrayBuffer());

  let embImg;
  try {
    embImg = conf.mime === 'image/png'
      ? await outDoc.embedPng(buf)
      : await outDoc.embedJpg(buf);
  } catch {
    const fb = await new Promise(r => cv.toBlob(r, 'image/png', 1));
    embImg = await outDoc.embedPng(new Uint8Array(await fb.arrayBuffer()));
  }

  const pg = outDoc.addPage([embImg.width, embImg.height]);
  pg.drawImage(embImg, { x: 0, y: 0, width: embImg.width, height: embImg.height });
}

// ================= EXPORT =================
async function doExport() {
  const target = getTarget();
  if (!target.length) return;

  const comp = document.getElementById('exportComp').value;

  // 📊 estimativa
  const estimated = estimatePdfSize(target, comp);
  console.log(`Tamanho estimado: ${estimated} MB`);

  const rawName = (document.getElementById('exportFilename').value || formatDefaultFilename()).replace(/[\\/:*?"<>|]/g, '_');
  const mode = document.getElementById('exportMode').value;

  openModal('progressModal');

  if (mode === 'create') {
    try {
      const out = await PDFLib.PDFDocument.create();

      let index = 0;

      await processInBatches(target, 3, async (page) => {
        setProgress(index, target.length, `Adicionando página ${index + 1}/${target.length}…`);
        await addPageToPdfDoc(out, page, comp);
        index++;
      });

      const pdfBytes = await out.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });

      closeModal('progressModal');
      triggerDlBlob(blob, rawName + '.pdf');

    } catch (e) {
      closeModal('progressModal');
      alert('Erro: ' + e.message);
    }

  } else {
    multiResults = [];

    try {
      let index = 0;

      await processInBatches(target, 3, async (page) => {
        setProgress(index, target.length, `Página ${index + 1}/${target.length}…`);

        const out = await PDFLib.PDFDocument.create();
        await addPageToPdfDoc(out, page, comp);

        const bytes = await out.save();

        multiResults.push({
          name: `${rawName}_${String(index + 1).padStart(3, '0')}.pdf`,
          blob: new Blob([bytes], { type: 'application/pdf' })
        });

        index++;
      });

      closeModal('progressModal');

      if (multiResults.length === 1) {
        triggerDlBlob(multiResults[0].blob, multiResults[0].name);
      } else {
        showMultiResults('PDFs criados!', `${multiResults.length} arquivos gerados.`);
      }

    } catch (e) {
      closeModal('progressModal');
      alert('Erro: ' + e.message);
    }
  }
}

// ================= ZIP =================
async function dlAllZip() {
  const btn = document.getElementById('dlZipBtn');

  btn.disabled = true;
  btn.textContent = 'Compactando…';

  const zip = new JSZip();

  for (const r of multiResults) {
    zip.file(r.name, r.blob);
  }

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  triggerDlBlob(zipBlob, 'arquivos.zip');

  btn.disabled = false;
  btn.textContent = 'Baixar todos (.zip)';
}

// ================= UTILS =================
function formatDefaultFilename() {
  const d = new Date();
  const pad = (n) => n.toString().padStart(2, '0');

  return `documento_${pad(d.getDate())}_${pad(d.getMonth() + 1)}_${d.getFullYear().toString().slice(-2)}-${pad(d.getHours())}_${pad(d.getMinutes())}_${pad(d.getSeconds())}`;
}

function triggerDlBlob(blob, name) {
  const url = URL.createObjectURL(blob);

  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: name
  });

  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 100);
}