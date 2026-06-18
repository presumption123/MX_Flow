import {
  loadActiveRound,
  saveActiveRound,
  scheduleSave,
  flushSave,
  setupBeforeUnload,
  listArchivedRounds,
  loadRoundById,
  forkRound,
  exportMxflow,
  importMxflow,
  saveRoundToArchive,
} from "./archive.js";
import {
  setRound,
  renderPartnerTabs,
  renderBreadcrumb,
  renderPositionTabs,
  renderGrid,
  onRender,
  addRow,
  closeCtxMenu,
  applyCellMark,
  getCtxTarget,
  getRound,
  getSelectedCell,
  selectCell,
  focusCell,
  setInsertMode,
  switchPartnerTab,
  switchPositionTab,
} from "./grid.js";
import {
  checkCoachAvailable,
  sendCoachMessage,
  generateForCell,
  onChatRender,
  renderMarkdown,
  setCellMode,
  isCellMode,
  applyResponsiveCoach,
  setCoachLayout,
} from "./coach.js";
import { setRound as setFilesRound, renderFiles, wireFileUpload } from "./files.js";
import {
  getCellData,
  getActiveSheet,
  updatePartnerNames,
  newSheet,
} from "./debate-model.js";

let round = null;

async function init() {
  setupBeforeUnload();
  round = await loadActiveRound();
  setRound(round);
  setFilesRound(round);

  await checkCoachAvailable();
  wireUI();
  wireFileUpload();
  applyResponsiveCoach();
  window.addEventListener("resize", applyResponsiveCoach);

  renderAll();

  if (!round.settings.side) {
    document.getElementById("side-overlay").style.display = "flex";
  }

  document.getElementById("status-banner")?.classList.add("hidden");

  window.addEventListener("mxflow:save-error", (e) => {
    const banner = document.getElementById("status-banner");
    if (banner) {
      banner.textContent =
        e.detail === "ARCHIVE_FULL"
          ? "Archive storage full — export a backup and delete old rounds."
          : "Could not save — edits kept in memory.";
      banner.classList.remove("hidden", "warn");
      banner.classList.add("error");
    }
  });

  window.addEventListener("mxflow:file-error", (e) => {
    alert(`Failed to read ${e.detail.name}: ${e.detail.message}`);
  });
}

function wireUI() {
  onRender(() => {
    setRound(round);
    setFilesRound(round);
    renderAll();
    scheduleSave(round);
  });

  onChatRender((messages) => renderChat(messages));

  document.getElementById("add-row-btn")?.addEventListener("click", addRow);

  document.getElementById("ctx-menu")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const action = btn.dataset.action;
    const target = getCtxTarget();
    if (!target) return;
    if (action === "generate") {
      const sheet = getActiveSheet(round) || round.partners.flatMap((p) => p.sheets).find((s) => s.id === target.sheetId);
      const cell = getCellData(round, target.sheetId, target.rowIdx, target.col);
      if (sheet) generateForCell(round, sheet, target.col, cell?.text || "");
    } else if (action === "dropped") applyCellMark("dropped");
    else if (action === "conceded") applyCellMark("conceded");
    else if (action === "normal") applyCellMark("normal");
    else if (action === "clear") applyCellMark("clear");
    closeCtxMenu();
  });
  document.addEventListener("click", (e) => {
    if (!document.getElementById("ctx-menu")?.contains(e.target)) closeCtxMenu();
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.target.matches("textarea, input") && e.key !== "Escape") return;
    if (e.ctrlKey && e.key === "[") {
      e.preventDefault();
      switchPartnerTab(-1);
    }
    if (e.ctrlKey && e.key === "]") {
      e.preventDefault();
      switchPartnerTab(1);
    }
    if (e.ctrlKey && /^[1-9]$/.test(e.key)) {
      const partner = round.partners.find((p) => p.id === round.activePartnerId);
      const idx = parseInt(e.key, 10) - 1;
      if (partner?.sheets[idx]) {
        partner.activeSheetId = partner.sheets[idx].id;
        scheduleSave(round);
        renderAll();
      }
    }
    if (e.key === "/" && !e.target.matches("textarea, input")) {
      e.preventDefault();
      document.getElementById("sb-input")?.focus();
    }
    if (e.key === "Escape") {
      closeArchivePanel();
      closeSettings();
    }
  });

  document.getElementById("mode-toggle")?.addEventListener("click", () => {
    setCellMode(!isCellMode());
    const btn = document.getElementById("mode-toggle");
    if (btn) {
      btn.textContent = isCellMode() ? "Cell mode" : "Free chat";
      btn.classList.toggle("cell-mode", isCellMode());
    }
    updateCellBanner();
  });

  document.getElementById("send-btn")?.addEventListener("click", doSend);
  document.getElementById("sb-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
  });

  document.getElementById("coach-collapse")?.addEventListener("click", () => {
    setCoachLayout("collapsed");
    document.getElementById("coach-reopen").style.display = "inline-block";
  });
  document.getElementById("coach-reopen")?.addEventListener("click", () => {
    setCoachLayout("full");
    document.getElementById("coach-reopen").style.display = "none";
  });

  document.getElementById("settings-btn")?.addEventListener("click", openSettings);
  document.getElementById("close-settings")?.addEventListener("click", closeSettings);
  document.getElementById("save-settings")?.addEventListener("click", saveSettingsFromModal);
  document.getElementById("modal-overlay")?.addEventListener("click", (e) => {
    if (e.target.id === "modal-overlay") closeSettings();
  });

  document.querySelectorAll(".side-pick").forEach((btn) => {
    btn.addEventListener("click", () => {
      round.settings.side = btn.dataset.side;
      scheduleSave(round);
      document.getElementById("side-overlay").style.display = "none";
      updateTopbarTitle();
    });
  });

  document.getElementById("clear-flow-btn")?.addEventListener("click", async () => {
    if (!confirm("Clear all flows for this round?")) return;
    round.partners.forEach((p) => {
      p.sheets = [];
      p.activeSheetId = null;
      p.affCount = 0;
      p.negCount = 0;
    });
    await saveActiveRound(round, true);
    renderAll();
    closeSettings();
  });

  document.getElementById("archive-btn")?.addEventListener("click", () => toggleArchivePanel());
  document.getElementById("archive-close")?.addEventListener("click", closeArchivePanel);
  document.getElementById("archive-save")?.addEventListener("click", async () => {
    await saveRoundToArchive(round);
    await refreshArchiveList();
    document.getElementById("archive-status").textContent = "Round saved to archive.";
  });
  document.getElementById("archive-export")?.addEventListener("click", () => exportMxflow(round));
  document.getElementById("archive-import")?.addEventListener("click", () => {
    document.getElementById("mxflow-input")?.click();
  });
  document.getElementById("mxflow-input")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      round = await importMxflow(file);
      setRound(round);
      setFilesRound(round);
      await saveActiveRound(round, true);
      renderAll();
      closeArchivePanel();
    } catch (err) {
      document.getElementById("archive-status").textContent = err.message;
    }
    e.target.value = "";
  });
  document.getElementById("archive-search")?.addEventListener("input", refreshArchiveList);

  document.getElementById("share-btn")?.addEventListener("click", () => {
    alert("Partner sync is coming in a follow-up release. Use Export to share .mxflow files.");
  });
}

function renderAll() {
  updateTopbarTitle();
  renderPartnerTabs(document.getElementById("partner-tabs"));
  renderBreadcrumb(document.getElementById("breadcrumb"));
  renderPositionTabs(
    document.getElementById("tabs"),
    () => {
      newSheet(round, "aff");
      scheduleSave(round);
      renderAll();
    },
    () => {
      newSheet(round, "neg");
      scheduleSave(round);
      renderAll();
    }
  );
  renderGrid(document.getElementById("grid-wrap"), document.getElementById("grid-footer"));
  renderFiles();
  updateCellBanner();
}

function updateTopbarTitle() {
  const el = document.getElementById("round-title");
  if (!el) return;
  const opp = round.meta?.opponent ? ` vs ${round.meta.opponent}` : "";
  const tourn = round.meta?.tournament ? ` · ${round.meta.tournament}` : "";
  el.textContent = `MX Flow${opp}${tourn}`;
  document.title = `MX Flow${opp}`;
}

function renderChat(messages) {
  const hist = document.getElementById("chat-history");
  if (!hist) return;
  hist.innerHTML = "";
  if (!messages.length) {
    hist.innerHTML = '<div class="chat-placeholder">Ask about an argument or right-click a cell to generate a response.</div>';
    return;
  }
  messages.forEach((m) => {
    const div = document.createElement("div");
    div.className = "msg " + (m.role === "user" ? "user" : m.error ? "claude error" : "claude");
    if (m.thinking) {
      div.className = "msg claude thinking";
      div.textContent = m.text;
      hist.appendChild(div);
      return;
    }
    const body = document.createElement("div");
    body.className = "msg-body";
    if (m.role === "assistant" && !m.error) body.innerHTML = renderMarkdown(m.text);
    else body.textContent = m.text;
    div.appendChild(body);
    if (m.role === "assistant" && !m.error) {
      const actions = document.createElement("div");
      actions.className = "msg-actions";
      const insertBtn = document.createElement("button");
      insertBtn.textContent = "Insert into cell";
      insertBtn.addEventListener("click", () => insertIntoCell(m.text));
      const copyBtn = document.createElement("button");
      copyBtn.textContent = "Copy";
      copyBtn.addEventListener("click", () => navigator.clipboard.writeText(m.text));
      const retryBtn = document.createElement("button");
      retryBtn.textContent = "Retry";
      retryBtn.style.display = "none";
      actions.appendChild(insertBtn);
      actions.appendChild(copyBtn);
      div.appendChild(actions);
    }
    if (m.error) {
      const retry = document.createElement("button");
      retry.className = "retry-btn";
      retry.textContent = "Retry";
      retry.addEventListener("click", () => {
        const lastUser = [...messages].reverse().find((x) => x.role === "user");
        if (lastUser) sendCoachMessage(round, lastUser.text);
      });
      div.appendChild(retry);
    }
    hist.appendChild(div);
  });
  hist.scrollTop = hist.scrollHeight;
}

function insertIntoCell(text) {
  const sel = getSelectedCell();
  if (!sel) {
    alert("Select a cell first.");
    return;
  }
  const cell = getCellData(round, sel.sheetId, sel.rowIdx, sel.col);
  if (!cell) return;
  cell.text = (cell.text ? cell.text + "\n" : "") + text;
  scheduleSave(round);
  renderAll();
  focusCell(sel.sheetId, sel.rowIdx, sel.col);
}

function doSend() {
  const input = document.getElementById("sb-input");
  const text = input?.value.trim();
  if (!text) return;
  input.value = "";
  sendCoachMessage(round, text);
}

function updateCellBanner() {
  const banner = document.getElementById("cell-context-banner");
  const input = document.getElementById("sb-input");
  if (!banner) return;
  if (isCellMode() && getSelectedCell()) {
    const sel = getSelectedCell();
    const sheet = round.partners.flatMap((p) => p.sheets).find((s) => s.id === sel.sheetId);
    banner.style.display = "block";
    banner.textContent = `Cell mode → ${sheet?.name || ""} / ${sel.col}`;
    const cell = getCellData(round, sel.sheetId, sel.rowIdx, sel.col);
    if (cell?.text?.trim() && !input.value.trim()) {
      input.value = `Argument in ${sel.col}:\n"${cell.text.trim()}"\n\nGenerate a response.`;
    }
  } else if (isCellMode()) {
    banner.style.display = "block";
    banner.textContent = "Cell mode → select a cell";
  } else {
    banner.style.display = "none";
  }
}

function openSettings() {
  document.getElementById("set-side").value = round.settings.side || "aff";
  document.getElementById("set-model").value = round.settings.model;
  document.getElementById("set-maxtokens").value = round.settings.maxTokens;
  document.getElementById("set-insert").checked = round.settings.insertMode !== false;
  document.getElementById("set-partner1").value = round.settings.partner1Name || "Partner 1";
  document.getElementById("set-partner2").value = round.settings.partner2Name || "Partner 2";
  document.getElementById("set-opponent").value = round.meta?.opponent || "";
  document.getElementById("set-tournament").value = round.meta?.tournament || "";
  document.getElementById("modal-overlay").style.display = "flex";
}

function closeSettings() {
  document.getElementById("modal-overlay").style.display = "none";
}

function saveSettingsFromModal() {
  round.settings.side = document.getElementById("set-side").value;
  round.settings.model = document.getElementById("set-model").value;
  round.settings.maxTokens = parseInt(document.getElementById("set-maxtokens").value, 10) || 1000;
  round.settings.insertMode = document.getElementById("set-insert").checked;
  round.settings.partner1Name = document.getElementById("set-partner1").value.trim() || "Partner 1";
  round.settings.partner2Name = document.getElementById("set-partner2").value.trim() || "Partner 2";
  round.meta = round.meta || {};
  round.meta.opponent = document.getElementById("set-opponent").value.trim();
  round.meta.tournament = document.getElementById("set-tournament").value.trim();
  updatePartnerNames(round);
  setInsertMode(round.settings.insertMode);
  scheduleSave(round);
  closeSettings();
  renderAll();
}

async function toggleArchivePanel() {
  const panel = document.getElementById("archive-panel");
  if (!panel) return;
  const open = panel.classList.toggle("open");
  if (open) await refreshArchiveList();
}

function closeArchivePanel() {
  document.getElementById("archive-panel")?.classList.remove("open");
}

async function refreshArchiveList() {
  const list = document.getElementById("archive-list");
  const q = (document.getElementById("archive-search")?.value || "").toLowerCase();
  const rounds = await listArchivedRounds();
  list.innerHTML = "";
  const filtered = rounds.filter((r) => {
    const label = `${r.meta?.opponent || ""} ${r.meta?.tournament || ""} ${r.meta?.date || ""}`.toLowerCase();
    return !q || label.includes(q);
  });
  if (!filtered.length) {
    list.innerHTML = '<div class="archive-empty">No saved rounds yet. Finish a round and click Save to archive.</div>';
    return;
  }
  filtered.sort((a, b) => (b.meta?.date || "").localeCompare(a.meta?.date || ""));
  filtered.forEach((r) => {
    const item = document.createElement("div");
    item.className = "archive-item";
    const label = `vs ${r.meta?.opponent || "Unknown"} · ${r.meta?.tournament || "Round"} · ${r.meta?.date || ""}`;
    item.innerHTML = `<span class="archive-label">${label}</span>`;
    const actions = document.createElement("div");
    actions.className = "archive-actions";
    const openBtn = document.createElement("button");
    openBtn.textContent = "Open";
    openBtn.addEventListener("click", async () => {
      round = await loadRoundById(r.id);
      setRound(round);
      setFilesRound(round);
      await saveActiveRound(round, true);
      renderAll();
      closeArchivePanel();
    });
    const forkBtn = document.createElement("button");
    forkBtn.textContent = "Fork";
    forkBtn.addEventListener("click", async () => {
      round = await forkRound(r);
      setRound(round);
      setFilesRound(round);
      await saveActiveRound(round, true);
      renderAll();
      closeArchivePanel();
    });
    const expBtn = document.createElement("button");
    expBtn.textContent = "Export";
    expBtn.addEventListener("click", () => exportMxflow(r));
    actions.appendChild(openBtn);
    actions.appendChild(forkBtn);
    actions.appendChild(expBtn);
    item.appendChild(actions);
    list.appendChild(item);
  });
}

init();
