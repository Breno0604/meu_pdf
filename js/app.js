document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("logoLink").addEventListener("click", e => e.preventDefault());

  // Injetar Data/Hora como filename default no input ao carregar
  document.getElementById("exportFilename").value = formatDefaultFilename();

  document.getElementById("undoBtn").addEventListener("click", undo);
  document.getElementById("redoBtn").addEventListener("click", redo);
  document.getElementById("themeToggleBtn").addEventListener("click", toggleTheme);
  document.getElementById("resetBtn").addEventListener("click", resetApp);
  document.getElementById("headerExportBtn").addEventListener("click", doExport);

  // File Inputs
  const fileInput = document.getElementById("fileInput");
  const addMoreInput = document.getElementById("addMoreInput");
  document.getElementById("dzAddBtn").addEventListener("click", () => fileInput.click());
  document.getElementById("tbAddBtn").addEventListener("click", () => addMoreInput.click());
  fileInput.addEventListener("change", e => { handleFiles(e.target.files); fileInput.value = ''; });
  addMoreInput.addEventListener("change", e => { handleFiles(e.target.files); addMoreInput.value = ''; });

  // Dropzone drag & drop
  const dzEl = document.getElementById("dropzone");
  dzEl.addEventListener("dragover", e => { e.preventDefault(); dzEl.classList.add("drag-over"); });
  dzEl.addEventListener("dragleave", () => dzEl.classList.remove("drag-over"));
  dzEl.addEventListener("drop", e => { e.preventDefault(); dzEl.classList.remove("drag-over"); handleFiles(e.dataTransfer.files); });
  dzEl.addEventListener("click", e => { if (e.target.closest(".dz-add-btn")) return; fileInput.click(); });

  const hint = document.getElementById("editorDropHint");
  document.addEventListener("dragover", e => {
    if (!e.dataTransfer.types.includes("Files")) return;
    if (!pages.length) return;
    e.preventDefault();
    hint.classList.add("on");
  });
  document.addEventListener("dragleave", e => {
    if (e.relatedTarget == null || e.relatedTarget === document.documentElement) hint.classList.remove("on");
  });
  document.addEventListener("drop", e => {
    hint.classList.remove("on");
    if (!e.dataTransfer.types.includes("Files")) return;
    if (!pages.length) return;
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  });

  document.addEventListener("dragend", () => {
    dragId = null;
    document.querySelectorAll(".page-card").forEach(c => c.classList.remove("dragging", "drop-before", "drop-after"));
  });

  // Toolbar & Top Settings
  document.getElementById("gridZoomSlider").addEventListener("input", e => applyGridZoom(e.target.value));
  document.getElementById("vtGrid").addEventListener("click", () => setViewMode("grid"));
  document.getElementById("vtList").addEventListener("click", () => setViewMode("list"));
  document.getElementById("selAllBtn").addEventListener("click", toggleSelectAll);
  document.getElementById("exportComp").addEventListener("change", updateUI); // Recalcular peso global ao mudar

  // Selection Bar
  document.getElementById("selRotLeftBtn").addEventListener("click", () => rotateSelected(-90));
  document.getElementById("selRotRightBtn").addEventListener("click", () => rotateSelected(90));
  document.getElementById("selDupBtn").addEventListener("click", duplicateSelected);
  document.getElementById("batchApplyBtn").addEventListener("click", applyBatchDim);
  document.getElementById("batchResetBtn").addEventListener("click", resetBatchDim);
  document.getElementById("selDelBtn").addEventListener("click", deleteSelected);
  document.getElementById("selClearBtn").addEventListener("click", clearSelection);

  // Marquee Selection (Caixa Azul)
  const grid = document.getElementById("pagesGrid");
  const marquee = document.createElement("div");
  marquee.id = "marqueeBox";
  document.body.appendChild(marquee);

  let isMarquee = false, startX, startY;
  grid.addEventListener("mousedown", e => {
    // Só iniciar marquee se clicou no fundo do grid (espaço vazio)
    if (e.target !== grid && e.target.id !== "editorView") return;
    if (e.button !== 0) return; // Somente botão esquerdo
    isMarquee = true;
    startX = e.pageX; startY = e.pageY;
    marquee.style.left = startX + "px";
    marquee.style.top = startY + "px";
    marquee.style.width = "0px";
    marquee.style.height = "0px";
    marquee.style.display = "block";
    if (!e.shiftKey) clearSelection();
  });

  document.addEventListener("mousemove", e => {
    if (!isMarquee) return;
    const curX = e.pageX, curY = e.pageY;
    const x = Math.min(startX, curX);
    const y = Math.min(startY, curY);
    const w = Math.abs(curX - startX);
    const h = Math.abs(curY - startY);
    marquee.style.left = x + "px";
    marquee.style.top = y + "px";
    marquee.style.width = w + "px";
    marquee.style.height = h + "px";

    const rect = marquee.getBoundingClientRect();
    document.querySelectorAll(".page-card").forEach(card => {
      const cr = card.getBoundingClientRect();
      const overlap = !(rect.right < cr.left || rect.left > cr.right || rect.bottom < cr.top || rect.top > cr.bottom);
      const id = parseInt(card.dataset.id);
      if (overlap) {
        selIds.add(id);
        card.classList.add("selected");
      }
    });
    updateSelUI();
  });

  document.addEventListener("mouseup", () => {
    if (isMarquee) {
      isMarquee = false;
      marquee.style.display = "none";
      updateUI(); // Reforçar UI
    }
  });

  // Lightbox
  document.getElementById("lbCloseBtn").addEventListener("click", closeLightbox);
  document.getElementById("lbSelBtn").addEventListener("click", toggleLbSelect);
  document.getElementById("lbPrev").addEventListener("click", () => navLb(-1));
  document.getElementById("lbNext").addEventListener("click", () => navLb(1));
  document.getElementById("lbRotLeftBtn").addEventListener("click", () => lbRotate(-90));
  document.getElementById("lbRotRightBtn").addEventListener("click", () => lbRotate(90));
  document.getElementById("lbDupBtn").addEventListener("click", lbDuplicate);
  document.getElementById("lbCropBtn").addEventListener("click", openCropFromLb);
  document.getElementById("lbDimW").addEventListener("input", onLbDimChange);
  document.getElementById("lbApplyDimBtn").addEventListener("click", applyLbDim);
  document.getElementById("lbResetDimBtn").addEventListener("click", resetLbDim);
  document.getElementById("lbDelBtn").addEventListener("click", lbDelete);

  // Lightbox Zoom e Pan
  const lbBody = document.getElementById("lbBodyContainer");
  lbBody.addEventListener("wheel", e => {
    e.preventDefault();
    lbScale += e.deltaY * -0.0015; // Velocidade do zoom
    lbScale = clamp(lbScale, 0.2, 5); // Limites de zoom
    applyLbTransform();
  });

  lbBody.addEventListener("mousedown", e => {
    // Prevenir pan ao clicar em botoes (setas)
    if (e.target.closest(".lb-arrow")) return;
    lbIsPanning = true;
    lbStartPanX = e.clientX - lbPanX;
    lbStartPanY = e.clientY - lbPanY;
  });

  window.addEventListener("mousemove", e => {
    if (lbIsPanning) {
      lbPanX = e.clientX - lbStartPanX;
      lbPanY = e.clientY - lbStartPanY;
      applyLbTransform();
    }
  });
  window.addEventListener("mouseup", () => { lbIsPanning = false; });

  // Pinch-to-zoom (Eventos de Toque) no Lightbox
  let initialDist = 0, initialScale = 1;
  lbBody.addEventListener("touchstart", e => {
    if (e.touches.length === 2) {
      e.preventDefault();
      initialDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      initialScale = lbScale;
    }
  }, { passive: false });

  lbBody.addEventListener("touchmove", e => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      lbScale = clamp(initialScale * (dist / initialDist), 0.2, 5);
      applyLbTransform();
    }
  }, { passive: false });

  // Crop Modal
  document.getElementById("cropCloseBtn").addEventListener("click", closeCrop);
  document.getElementById("cropCancelBtn").addEventListener("click", closeCrop);
  document.getElementById("cropApplyBtn").addEventListener("click", applyCrop);
  document.getElementById("cropResetBtn").addEventListener("click", cropReset);
  ['cropX', 'cropY', 'cropW', 'cropH'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      const cv = document.getElementById('cropCanvas');
      const sc = cv.width / cropRawW;
      const x = parseFloat(document.getElementById('cropX').value) || 0;
      const y = parseFloat(document.getElementById('cropY').value) || 0;
      const w = parseFloat(document.getElementById('cropW').value) || cropRawW;
      const h = parseFloat(document.getElementById('cropH').value) || cropRawH;
      cropSelPx = {
        x: clamp(x * sc, 0, cv.width - 1),
        y: clamp(y * sc, 0, cv.height - 1),
        w: clamp(w * sc, 1, cv.width),
        h: clamp(h * sc, 1, cv.height)
      };
      drawCropOverlay();
    });
  });

  // Result Modal
  document.getElementById("resTopCloseBtn").addEventListener("click", () => closeModal("resultMultiModal"));
  document.getElementById("resCloseBtn").addEventListener("click", () => closeModal("resultMultiModal"));
  document.getElementById("dlZipBtn").addEventListener("click", dlAllZip);

  // Modals Overlay
  document.querySelectorAll(".modal-overlay").forEach(o => {
    o.addEventListener("click", e => { if (e.target === o) closeModal(o.id); });
  });

  // Keyboard Shortcuts Globais
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      if (document.getElementById("cropModal").classList.contains("on")) { closeCrop(); return; }
      closeLightbox();
    }
    if (document.getElementById("lightbox").classList.contains("on")) {
      if (e.key === "ArrowLeft") navLb(-1);
      if (e.key === "ArrowRight") navLb(1);
    }
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;

    // Delete para apagar
    if (e.key === "Delete" || e.key === "Backspace") {
      if (selIds.size > 0 && document.getElementById('editorView').style.display === 'block') {
        e.preventDefault(); deleteSelected();
      }
    }
    // Ctrl + A para Selecionar Todos
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
      e.preventDefault(); toggleSelectAll();
    }
    // Ctrl + Z e Ctrl + Y
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) { e.preventDefault(); redo(); }
  });
});