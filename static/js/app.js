import {
  loadAppState,
  saveAppState,
  loadActiveRound,
  loadRoundById,
  saveRound,
  saveRoundToArchive,
  scheduleSave,
  flushSave,
  setupBeforeUnload,
  exportMxflow,
} from "./archive.js";
import {
  initRouter,
  getAppState,
  setAppState,
  showDashboard,
  showFlow,
  applyViewDom,
  onViewChange,
} from "./router.js";
import {
  renderDashboard,
  wireDashboard,
  wireDashboardControls,
  createAndOpenRound,
  handleBackupImport,
} from "./dashboard.js";
import {
  setRound,
  renderPartnerTabs,
  renderPositionTabs,
  renderFlowToolbar,
  renderGrid,
  onRender,
  addRow,
  closeCtxMenu,
  applyCellMark,
  getCtxTarget,
  getRound,
  getSelectedCell,
  focusCell,
  switchPartnerTab,
  setToolbarCallbacks,
  setSyncHook,
} from "./grid.js";
import { ShareSession } from "./share-session.js";
import { SyncEngine } from "./sync-engine.js";
import { SHARE_CODE_WARN_LEN } from "./share-protocol.js";
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
  migrateRoundDocument,
} from "./debate-model.js";
import { applyTheme, THEMES } from "./themes.js";

let round = null;
let appState = null;
let shareSession = null;
let shareEngine = null;

async function init() {
  setupBeforeUnload();
  appState = await loadAppState();
  initRouter(appState);

  round = await loadActiveRound();
  if (round) {
    setRound(round);
    setFilesRound(round);
  }

  applyTheme(appState.settings.theme, appState.settings.gridFontFamily);
  await checkCoachAvailable();
  initShare();
  wireUI();
  wireFileUpload();
  wireDashboard(getDashboardCallbacks());
  wireDashboardControls(appState);

  applyResponsiveCoach();
  window.addEventListener("resize", applyResponsiveCoach);

  onViewChange(async (state) => {
    if (state.view === "dashboard") await renderDashboard();
    else renderFlow();
  });

  applyViewDom();
  if (appState.view === "flow" && appState.activeRoundId && round) {
    renderFlow();
  } else {
    appState.view = "dashboard";
    await renderDashboard();
  }

  if (round && !round.settings.side) {
    setTimeout(() => openSettings(), 300);
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

function getDashboardCallbacks() {
  return {
    onOpenRound: async (id) => {
      round = await loadRoundById(id);
      if (!round) return;
      appState.activeRoundId = id;
      appState.view = "flow";
      await persistAppState();
      setRound(round);
      setFilesRound(round);
      showFlow(id);
      renderFlow();
    },
    onNewRound: async () => {
      round = await createAndOpenRound(appState);
      setRound(round);
      setFilesRound(round);
      renderFlow();
    },
    onSaveAppState: persistAppState,
  };
}

async function persistAppState() {
  setAppState(appState);
  await saveAppState(appState);
}

function wireUI() {
  setToolbarCallbacks({
    onBack: async () => {
      await saveRound(round, true);
      appState.view = "dashboard";
      await persistAppState();
      showDashboard();
      await renderDashboard();
    },
    onZoom: (delta) => {
      appState.settings.zoom = Math.min(2, Math.max(0.5, (appState.settings.zoom || 1) + delta));
      persistAppState();
      renderFlow();
    },
    onUpload: () => toggleFilesPanel(),
    onExport: () => exportMxflow(round),
    onShare: () => openShareModal(),
    onCoach: () => toggleCoachPanel(),
    onSettings: () => openSettings(),
    getShareState: () => shareSession?.state || "idle",
  });

  onRender(() => {
    if (round) {
      setRound(round);
      setFilesRound(round);
    }
    if (getAppState()?.view === "flow") renderFlow();
    else renderDashboard();
    if (round) scheduleSave(round);
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

  document.addEventListener("keydown", (e) => {
    if (e.target.matches("textarea, input") && e.key !== "Escape") return;
    if (getAppState()?.view !== "flow") return;
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
        renderFlow();
      }
    }
    if (e.key === "/" && !e.target.matches("textarea, input")) {
      e.preventDefault();
      toggleCoachPanel(true);
      document.getElementById("sb-input")?.focus();
    }
    if (e.key === "Escape") {
      closeSettings();
      closeFilesPanel();
      closeShareModal();
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
    toggleCoachPanel(false);
  });

  document.getElementById("close-settings")?.addEventListener("click", closeSettings);
  document.getElementById("save-settings")?.addEventListener("click", saveSettingsFromModal);
  document.getElementById("modal-overlay")?.addEventListener("click", (e) => {
    if (e.target.id === "modal-overlay") closeSettings();
  });

  document.getElementById("clear-flow-btn")?.addEventListener("click", async () => {
    if (!round || !confirm("Clear all flows for this round?")) return;
    round.partners.forEach((p) => {
      p.sheets = [];
      p.activeSheetId = null;
      p.affCount = 0;
      p.negCount = 0;
    });
    await saveRound(round, true);
    shareEngine?.sendFullSnapshot();
    renderFlow();
    closeSettings();
  });

  document.getElementById("backup-input")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await handleBackupImport(file, appState);
      if (imported) {
        round = imported;
        setRound(round);
        setFilesRound(round);
        renderFlow();
      }
    } catch (err) {
      alert(err.message);
    }
    e.target.value = "";
  });

  wireShareUI();
  renderThemeSwatches();
}

function renderThemeSwatches() {
  const container = document.getElementById("theme-swatches");
  if (!container) return;
  container.innerHTML = "";
  Object.entries(THEMES).forEach(([key, theme]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-swatch" + (appState.settings.theme === key ? " active" : "");
    btn.textContent = theme.label;
    btn.dataset.theme = key;
    btn.addEventListener("click", () => {
      appState.settings.theme = key;
      applyTheme(key, appState.settings.gridFontFamily);
      renderThemeSwatches();
    });
    container.appendChild(btn);
  });
}

function renderFlow() {
  if (!round) return;
  renderFlowToolbar(document.getElementById("flow-toolbar"));
  renderPartnerTabs(document.getElementById("partner-tabs"));
  renderPositionTabs(
    document.getElementById("tabs"),
    () => {
      const sheet = newSheet(round, "aff");
      shareEngine?.recordOp({ type: "sheet_add", payload: { partnerId: round.activePartnerId, sheet } });
      scheduleSave(round);
      renderFlow();
    },
    () => {
      const sheet = newSheet(round, "neg");
      shareEngine?.recordOp({ type: "sheet_add", payload: { partnerId: round.activePartnerId, sheet } });
      scheduleSave(round);
      renderFlow();
    }
  );
  renderGrid(document.getElementById("grid-wrap"), document.getElementById("grid-footer"));
  renderFiles();
  updateCellBanner();
  updateCoachPanelVisibility();
}

function toggleCoachPanel(forceOpen) {
  const panel = document.getElementById("coach-panel");
  const split = document.getElementById("flow-main-split");
  if (!panel || !split) return;
  const open = forceOpen === true ? true : forceOpen === false ? false : panel.hidden;
  panel.hidden = !open;
  appState.settings.coachOpen = open;
  persistAppState();
  if (open) {
    split.classList.remove("coach-collapsed");
    setCoachLayout(window.innerWidth < 1024 ? "bottom" : "full");
  } else {
    split.classList.add("coach-collapsed");
    setCoachLayout("collapsed");
  }
}

function updateCoachPanelVisibility() {
  const panel = document.getElementById("coach-panel");
  const split = document.getElementById("flow-main-split");
  if (!panel || !split) return;
  const open = appState.settings.coachOpen === true;
  panel.hidden = !open;
  split.classList.toggle("coach-collapsed", !open);
}

function toggleFilesPanel() {
  document.getElementById("files-panel")?.classList.toggle("open");
}

function closeFilesPanel() {
  document.getElementById("files-panel")?.classList.remove("open");
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
  const partnerId = round.partners.find((p) => p.sheets.some((s) => s.id === sel.sheetId))?.id;
  shareEngine?.recordOp({ type: "cell_set", payload: { partnerId, sheetId: sel.sheetId, rowIdx: sel.rowIdx, col: sel.col, text: cell.text } });
  renderFlow();
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
  if (!banner || !round) return;
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
  if (round) {
    document.getElementById("set-side").value = round.settings.side || "aff";
    document.getElementById("set-model").value = round.settings.model;
    document.getElementById("set-maxtokens").value = round.settings.maxTokens;
    document.getElementById("set-partner1").value = round.settings.partner1Name || "Partner 1";
    document.getElementById("set-partner2").value = round.settings.partner2Name || "Partner 2";
    document.getElementById("set-opponent").value = round.meta?.opponent || "";
    document.getElementById("set-tournament").value = round.meta?.tournament || "";
    document.getElementById("set-round-num").value = round.meta?.roundNum || "";
    document.getElementById("set-judges").value = round.meta?.judges || "";
    document.getElementById("set-aff-school").value = round.meta?.affSchool || "";
    document.getElementById("set-aff-code").value = round.meta?.affCode || "";
    document.getElementById("set-neg-school").value = round.meta?.negSchool || "";
    document.getElementById("set-neg-code").value = round.meta?.negCode || "";
  }
  document.getElementById("set-grid-font").value = appState.settings.gridFontFamily || "Arial, sans-serif";
  document.getElementById("set-cell-style").value = appState.settings.activeCellStyle || "outlineBlack";
  renderThemeSwatches();
  document.getElementById("modal-overlay").style.display = "flex";
}

function closeSettings() {
  document.getElementById("modal-overlay").style.display = "none";
}

function saveSettingsFromModal() {
  if (round) {
    round.settings.side = document.getElementById("set-side").value;
    round.settings.model = document.getElementById("set-model").value;
    round.settings.maxTokens = parseInt(document.getElementById("set-maxtokens").value, 10) || 1000;
    round.settings.partner1Name = document.getElementById("set-partner1").value.trim() || "Partner 1";
    round.settings.partner2Name = document.getElementById("set-partner2").value.trim() || "Partner 2";
    round.meta = round.meta || {};
    round.meta.opponent = document.getElementById("set-opponent").value.trim();
    round.meta.tournament = document.getElementById("set-tournament").value.trim();
    round.meta.roundNum = document.getElementById("set-round-num").value.trim();
    round.meta.judges = document.getElementById("set-judges").value.trim();
    round.meta.affSchool = document.getElementById("set-aff-school").value.trim();
    round.meta.affCode = document.getElementById("set-aff-code").value.trim();
    round.meta.negSchool = document.getElementById("set-neg-school").value.trim();
    round.meta.negCode = document.getElementById("set-neg-code").value.trim();
    updatePartnerNames(round);
    scheduleSave(round);
  }
  appState.settings.gridFontFamily = document.getElementById("set-grid-font").value;
  appState.settings.activeCellStyle = document.getElementById("set-cell-style").value;
  applyTheme(appState.settings.theme, appState.settings.gridFontFamily);
  persistAppState();
  closeSettings();
  if (getAppState()?.view === "flow") renderFlow();
}

function initShare() {
  shareSession = new ShareSession({
    onState: () => renderShareStatus(),
    onMessage: (msg) => shareEngine.handleMessage(msg),
    onConnected: () => {
      shareEngine.onConnect();
      renderShareStatus();
    },
    onDisconnected: () => renderShareStatus(),
  });
  shareEngine = new SyncEngine({
    session: shareSession,
    getRound: () => round,
    onApply: onSyncApply,
  });
  setSyncHook((op) => shareEngine.recordOp(op));
}

function affectsActiveView(payload) {
  if (!round || !payload) return true;
  if (payload.partnerId && payload.partnerId !== round.activePartnerId) return false;
  const sheet = getActiveSheet(round);
  if (payload.sheetId && sheet && payload.sheetId !== sheet.id) return false;
  return true;
}

function onSyncApply(info) {
  if (!round) return;
  scheduleSave(round);
  setRound(round);
  setFilesRound(round);
  const visible = info.op === "full_snapshot" || affectsActiveView(info.payload);
  if (visible && getAppState()?.view === "flow") renderFlow();
}

function renderShareStatus() {
  if (getAppState()?.view === "flow") {
    renderFlowToolbar(document.getElementById("flow-toolbar"));
  }
  const overlay = document.getElementById("share-overlay");
  if (overlay && overlay.style.display === "flex") updateShareModal();
}

function setShareStatus(text, kind = "") {
  const el = document.getElementById("share-status");
  if (!el) return;
  el.textContent = text || "";
  el.className = "share-status" + (kind ? " " + kind : "");
}

function warnIfLongCode(code) {
  if (code.length > SHARE_CODE_WARN_LEN) {
    setShareStatus(
      "This code is large because of uploaded cards. It should still work, but may be slow to send over some chat apps.",
      "warn"
    );
  }
}

function showShareSection(id) {
  ["share-chooser", "share-start", "share-join"].forEach((s) => {
    const el = document.getElementById(s);
    if (el) el.hidden = s !== id;
  });
}

function updateShareModal() {
  const connected = shareSession?.connected;
  document.getElementById("share-disconnect").hidden = !connected;
  if (connected) {
    showShareSection(null);
    setShareStatus("Connected — you and your partner are editing this flow together.", "ok");
  }
}

function openShareJoin() {
  setShareStatus("Paste the code your partner sent you.");
  document.getElementById("share-offer-in").value = "";
  document.getElementById("share-join-step2").hidden = true;
  document.getElementById("share-disconnect").hidden = !shareSession?.connected;
  showShareSection("share-join");
  document.getElementById("share-overlay").style.display = "flex";
}

function openShareModal() {
  if (!round) return;
  setShareStatus("");
  document.getElementById("share-answer-in").value = "";
  document.getElementById("share-offer-in").value = "";
  document.getElementById("share-join-step2").hidden = true;
  if (shareSession?.connected) {
    updateShareModal();
  } else {
    showShareSection("share-chooser");
    document.getElementById("share-disconnect").hidden = true;
  }
  document.getElementById("share-overlay").style.display = "flex";
}

function closeShareModal() {
  document.getElementById("share-overlay").style.display = "none";
}

async function startShareSession() {
  showShareSection("share-start");
  setShareStatus("Preparing your code…");
  try {
    shareEngine.reset();
    const snapshot = JSON.parse(JSON.stringify(round));
    const code = await shareSession.createOffer(snapshot);
    document.getElementById("share-code-out").value = code;
    setShareStatus("Copy code 1 and send it to your partner, then paste their reply below.");
    warnIfLongCode(code);
  } catch (e) {
    setShareStatus(e.message || "Could not create a share code.", "error");
  }
}

async function continueShareJoin() {
  const code = document.getElementById("share-offer-in").value;
  setShareStatus("Reading your partner's code…");
  try {
    shareEngine.reset();
    const { round: snapshot, code2 } = await shareSession.acceptOffer(code);
    await flushSave();
    await applyJoinedRound(snapshot);
    document.getElementById("share-code-back").value = code2;
    document.getElementById("share-join-step2").hidden = false;
    setShareStatus("Send code 2 back to your partner to finish connecting.");
    warnIfLongCode(code2);
  } catch (e) {
    setShareStatus(e.message || "Could not read that code.", "error");
  }
}

async function connectShareAnswer() {
  const code = document.getElementById("share-answer-in").value;
  setShareStatus("Connecting…");
  try {
    await shareSession.acceptAnswer(code);
    setShareStatus("Connecting… waiting for the link to open.");
  } catch (e) {
    setShareStatus(e.message || "Could not use that response code.", "error");
  }
}

async function applyJoinedRound(snapshot) {
  round = migrateRoundDocument(snapshot);
  await saveRoundToArchive(round);
  appState.activeRoundId = round.id;
  appState.view = "flow";
  await persistAppState();
  setRound(round);
  setFilesRound(round);
  showFlow(round.id);
  renderFlow();
}

function disconnectShare() {
  shareSession.close();
  shareEngine.reset();
  closeShareModal();
}

function wireShareUI() {
  document.getElementById("share-start-btn")?.addEventListener("click", startShareSession);
  document.getElementById("share-join-btn")?.addEventListener("click", () => {
    showShareSection("share-join");
    setShareStatus("Paste the code your partner sent you.");
  });
  document.getElementById("share-continue-btn")?.addEventListener("click", continueShareJoin);
  document.getElementById("share-connect-btn")?.addEventListener("click", connectShareAnswer);
  document.getElementById("share-disconnect")?.addEventListener("click", disconnectShare);
  document.getElementById("share-close")?.addEventListener("click", closeShareModal);
  document.getElementById("sidebar-join")?.addEventListener("click", openShareJoin);
  document.getElementById("share-overlay")?.addEventListener("click", (e) => {
    if (e.target.id === "share-overlay") closeShareModal();
  });
  document.getElementById("share-copy-out")?.addEventListener("click", () =>
    copyShareCode("share-code-out", "share-copy-out")
  );
  document.getElementById("share-copy-back")?.addEventListener("click", () =>
    copyShareCode("share-code-back", "share-copy-back")
  );
}

async function copyShareCode(textareaId, btnId) {
  const ta = document.getElementById(textareaId);
  const btn = document.getElementById(btnId);
  if (!ta?.value) return;
  try {
    await navigator.clipboard.writeText(ta.value);
  } catch {
    ta.select();
    document.execCommand("copy");
  }
  if (btn) {
    const original = btn.textContent;
    btn.textContent = "Copied";
    setTimeout(() => (btn.textContent = original), 1500);
  }
}

init();
