import {
  getActivePartner,
  getActiveSheet,
  makeRow,
  newSheet,
  deleteSheet,
  getCellData,
  autoLabelSheet,
  extendArgument,
  formatRoundTitle,
  sheetTypeLabel,
} from "./debate-model.js";
import { scheduleSave } from "./archive.js";
import { getAppState } from "./router.js";

let roundRef = { current: null };
let selectedCell = null;
let ctxTarget = null;
let editing = false;
let editingDiv = null;
let editSnapshot = null;
let pendingKeyboardEdit = false;
let toolbarCallbacks = {};

const listeners = { render: [], cellSelect: [] };

export function setRound(round) {
  roundRef.current = round;
}

export function getRound() {
  return roundRef.current;
}

export function getSelectedCell() {
  return selectedCell;
}

export function onRender(fn) {
  listeners.render.push(fn);
}

export function onCellSelect(fn) {
  listeners.cellSelect.push(fn);
}

export function setToolbarCallbacks(cbs) {
  toolbarCallbacks = cbs;
}

function emitRender() {
  listeners.render.forEach((fn) => fn());
}

function emitCellSelect() {
  listeners.cellSelect.forEach((fn) => fn(selectedCell));
}

function touch() {
  if (roundRef.current) roundRef.current.lastEdited = Date.now();
  scheduleSave(roundRef.current);
  emitRender();
}

function getZoom() {
  return getAppState()?.settings?.zoom ?? 1;
}

function getCellStyleClass() {
  const style = getAppState()?.settings?.activeCellStyle || "outlineBlack";
  return style === "filledBlue" ? "style-filled" : "style-outline";
}

function getCellElement(sheetId, rowIdx, col) {
  const partner = getActivePartner(roundRef.current);
  const sheet = partner?.sheets.find((s) => s.id === sheetId);
  if (!sheet || partner.activeSheetId !== sheetId) return null;
  return document.querySelector(
    `#grid-wrap .flow-cell[data-row="${rowIdx}"][data-col="${CSS.escape(col)}"]`
  );
}

function getCellDataFromDiv(div) {
  const sheet = getActiveSheet(roundRef.current);
  if (!sheet) return null;
  const rowIdx = parseInt(div.dataset.row, 10);
  const col = div.dataset.col;
  return sheet.rows[rowIdx]?.cells[col] || null;
}

function refreshSheetLabel(sheet) {
  autoLabelSheet(sheet);
  const tab = document.querySelector(`.tab[data-id="${CSS.escape(sheet.id)}"] .tab-name`);
  if (tab) tab.textContent = sheet.name;
}

function beginEdit(div, { clear = false } = {}) {
  if (editing && editingDiv !== div) endEdit(editingDiv);
  const cellData = getCellDataFromDiv(div);
  if (!cellData) return;

  editSnapshot = cellData.text;
  editing = true;
  editingDiv = div;
  div.contentEditable = "true";
  div.classList.add("editing");

  if (clear) {
    div.textContent = "";
    cellData.text = "";
  }

  div.focus();
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(div);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

function endEdit(div) {
  if (!div || !editing || editingDiv !== div) return;
  const cellData = getCellDataFromDiv(div);
  const rowIdx = parseInt(div.dataset.row, 10);
  const sheet = getActiveSheet(roundRef.current);

  if (cellData) {
    cellData.text = div.textContent;
    scheduleSave(roundRef.current);
    if (sheet && rowIdx === 0) refreshSheetLabel(sheet);
  }

  div.contentEditable = "false";
  div.classList.remove("editing");
  editing = false;
  editingDiv = null;
  editSnapshot = null;
}

function cancelEdit(div) {
  if (!div) return;
  const cellData = getCellDataFromDiv(div);
  if (cellData && editSnapshot !== null) {
    cellData.text = editSnapshot;
    div.textContent = editSnapshot;
  }
  div.contentEditable = "false";
  div.classList.remove("editing");
  editing = false;
  editingDiv = null;
  editSnapshot = null;
}

function isModKey(e) {
  return e.metaKey || e.ctrlKey;
}

function insertRowBelow(sheet, rowIdx, col) {
  sheet.rows.splice(rowIdx + 1, 0, makeRow(sheet.cols));
  selectedCell = { sheetId: sheet.id, rowIdx: rowIdx + 1, col };
  pendingKeyboardEdit = true;
  touch();
}

function focusEquivalentCell(rowIdx, col) {
  const sheet = getActiveSheet(roundRef.current);
  if (!sheet) return;
  const safeRow = Math.min(rowIdx, Math.max(0, sheet.rows.length - 1));
  const safeCol = sheet.cols.includes(col) ? col : sheet.cols[0];
  selectedCell = { sheetId: sheet.id, rowIdx: safeRow, col: safeCol };
}

function handleEnterShortcuts(e, sheet, rowIdx, col, div, { inEdit = false } = {}) {
  if (e.key !== "Enter") return false;

  if (isModKey(e) && e.shiftKey) {
    e.preventDefault();
    if (inEdit) endEdit(div);
    switchPositionTab(1, { rowIdx, col });
    return true;
  }

  if (isModKey(e) && !e.shiftKey) {
    e.preventDefault();
    if (inEdit) endEdit(div);
    moveSelection(1, 0);
    return true;
  }

  if (inEdit && (e.shiftKey || e.altKey)) {
    return false;
  }

  e.preventDefault();
  if (inEdit) endEdit(div);
  insertRowBelow(sheet, rowIdx, col);
  return true;
}

function moveSelection(dRow, dCol) {
  if (!selectedCell) return;
  const sheet = getActiveSheet(roundRef.current);
  if (!sheet || selectedCell.sheetId !== sheet.id) return;

  const colIdx = sheet.cols.indexOf(selectedCell.col);
  const newRow = selectedCell.rowIdx + dRow;
  const newColIdx = colIdx + dCol;

  if (newRow < 0 || newRow >= sheet.rows.length) return;
  if (newColIdx < 0 || newColIdx >= sheet.cols.length) return;

  focusCell(sheet.id, newRow, sheet.cols[newColIdx], { edit: true });
}

function restoreGridFocus(sheet) {
  if (!selectedCell || selectedCell.sheetId !== sheet.id) return;
  const el = getCellElement(sheet.id, selectedCell.rowIdx, selectedCell.col);
  if (el) {
    el.focus();
    selectCell(sheet.id, selectedCell.rowIdx, selectedCell.col, el);
    if (pendingKeyboardEdit) {
      pendingKeyboardEdit = false;
      beginEdit(el, { clear: false });
    }
  } else {
    pendingKeyboardEdit = false;
  }
}

export function renderFlowToolbar(container) {
  const round = roundRef.current;
  if (!container || !round) return;
  container.innerHTML = "";

  const left = document.createElement("div");
  left.className = "flow-toolbar-left";

  const back = document.createElement("button");
  back.type = "button";
  back.className = "back-btn";
  back.textContent = "← Dashboard";
  back.addEventListener("click", () => toolbarCallbacks.onBack?.());
  left.appendChild(back);

  const title = document.createElement("input");
  title.className = "round-title-input";
  title.value = formatRoundTitle(round);
  title.title = "Round title";
  title.addEventListener("change", () => {
    round.meta.name = title.value.trim();
    touch();
  });
  left.appendChild(title);

  const chips = document.createElement("div");
  chips.className = "round-chips";
  const m = round.meta || {};
  if (m.tournament) {
    const c = document.createElement("span");
    c.className = "round-chip";
    c.textContent = m.tournament;
    chips.appendChild(c);
  }
  if (m.roundNum) {
    const c = document.createElement("span");
    c.className = "round-chip";
    c.textContent = m.roundNum;
    chips.appendChild(c);
  }
  const aff = [m.affSchool, m.affCode].filter(Boolean).join(" ");
  const neg = [m.negSchool, m.negCode].filter(Boolean).join(" ");
  if (aff) {
    const c = document.createElement("span");
    c.className = "round-chip aff";
    c.textContent = aff;
    chips.appendChild(c);
  }
  if (neg) {
    const c = document.createElement("span");
    c.className = "round-chip neg";
    c.textContent = neg;
    chips.appendChild(c);
  }
  left.appendChild(chips);
  container.appendChild(left);

  const right = document.createElement("div");
  right.className = "flow-toolbar-right";

  const zoomWrap = document.createElement("div");
  zoomWrap.className = "zoom-controls";
  const zoomOut = document.createElement("button");
  zoomOut.className = "zoom-btn";
  zoomOut.textContent = "−";
  zoomOut.addEventListener("click", () => toolbarCallbacks.onZoom?.(-0.1));
  const zoomLabel = document.createElement("span");
  zoomLabel.className = "zoom-label";
  zoomLabel.id = "zoom-label";
  zoomLabel.textContent = `${Math.round(getZoom() * 100)}%`;
  const zoomIn = document.createElement("button");
  zoomIn.className = "zoom-btn";
  zoomIn.textContent = "+";
  zoomIn.addEventListener("click", () => toolbarCallbacks.onZoom?.(0.1));
  zoomWrap.appendChild(zoomOut);
  zoomWrap.appendChild(zoomLabel);
  zoomWrap.appendChild(zoomIn);
  right.appendChild(zoomWrap);

  const uploadBtn = document.createElement("button");
  uploadBtn.type = "button";
  uploadBtn.className = "tb-btn";
  uploadBtn.textContent = "Cards";
  uploadBtn.addEventListener("click", () => toolbarCallbacks.onUpload?.());
  right.appendChild(uploadBtn);

  const exportBtn = document.createElement("button");
  exportBtn.type = "button";
  exportBtn.className = "tb-btn";
  exportBtn.textContent = "Export";
  exportBtn.addEventListener("click", () => toolbarCallbacks.onExport?.());
  right.appendChild(exportBtn);

  const coachBtn = document.createElement("button");
  coachBtn.type = "button";
  coachBtn.className = "tb-btn";
  coachBtn.textContent = "Coach";
  coachBtn.addEventListener("click", () => toolbarCallbacks.onCoach?.());
  right.appendChild(coachBtn);

  const settingsBtn = document.createElement("button");
  settingsBtn.type = "button";
  settingsBtn.className = "tb-btn";
  settingsBtn.textContent = "Settings";
  settingsBtn.addEventListener("click", () => toolbarCallbacks.onSettings?.());
  right.appendChild(settingsBtn);

  container.appendChild(right);
}

export function renderPartnerTabs(container) {
  const round = roundRef.current;
  if (!container) return;
  container.innerHTML = "";
  round.partners.forEach((p) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "partner-tab" + (p.id === round.activePartnerId ? " active" : "");
    btn.textContent = p.name;
    btn.dataset.id = p.id;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", p.id === round.activePartnerId ? "true" : "false");
    btn.addEventListener("click", () => {
      round.activePartnerId = p.id;
      touch();
    });
    btn.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      const key = p.id === "partner-1" ? "partner1Name" : "partner2Name";
      const name = prompt("Partner name:", p.name);
      if (name?.trim()) {
        round.settings[key] = name.trim();
        p.name = name.trim();
        touch();
      }
    });
    container.appendChild(btn);
  });
}

export function renderPositionTabs(container, onAddAff, onAddOff) {
  const round = roundRef.current;
  const partner = getActivePartner(round);
  if (!container) return;
  container.innerHTML = "";
  if (!partner) return;

  partner.sheets.forEach((sheet) => {
    const tab = document.createElement("div");
    tab.className = "tab" + (sheet.id === partner.activeSheetId ? " active" : "");
    tab.dataset.id = sheet.id;
    tab.setAttribute("role", "tab");

    const typeLabel = document.createElement("span");
    typeLabel.className = "tab-type " + (sheet.type === "aff" ? "aff" : "off");
    typeLabel.textContent = sheetTypeLabel(sheet.type);

    const nameEl = document.createElement("span");
    nameEl.className = "tab-name";
    nameEl.textContent = sheet.name;

    const closeBtn = document.createElement("button");
    closeBtn.className = "tab-close";
    closeBtn.textContent = "×";
    closeBtn.setAttribute("aria-label", `Close ${sheet.name}`);

    tab.appendChild(typeLabel);
    tab.appendChild(nameEl);
    tab.appendChild(closeBtn);

    tab.addEventListener("click", (e) => {
      if (e.target === closeBtn) return;
      partner.activeSheetId = sheet.id;
      touch();
    });
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!confirm(`Delete flow "${sheet.name}"?`)) return;
      deleteSheet(round, sheet.id);
      touch();
    });
    nameEl.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      nameEl.contentEditable = "true";
      nameEl.focus();
    });
    nameEl.addEventListener("blur", () => {
      nameEl.contentEditable = "false";
      sheet.name = nameEl.textContent.trim() || sheet.name;
      touch();
    });

    container.appendChild(tab);
  });

  const addWrap = document.createElement("div");
  addWrap.className = "tab-add-btns";
  const affBtn = document.createElement("button");
  affBtn.textContent = "+ Aff";
  affBtn.addEventListener("click", onAddAff);
  const offBtn = document.createElement("button");
  offBtn.textContent = "+ Off";
  offBtn.addEventListener("click", onAddOff);
  addWrap.appendChild(affBtn);
  addWrap.appendChild(offBtn);
  container.appendChild(addWrap);
}

export function renderBreadcrumb() {}

export function renderGrid(wrapEl, footerEl) {
  const round = roundRef.current;
  const sheet = getActiveSheet(round);
  if (!wrapEl) return;

  const zoom = getZoom();
  document.documentElement.style.setProperty("--zoom", String(zoom));
  const zoomLabel = document.getElementById("zoom-label");
  if (zoomLabel) zoomLabel.textContent = `${Math.round(zoom * 100)}%`;

  if (editing && editingDiv) endEdit(editingDiv);

  wrapEl.innerHTML = "";
  if (footerEl) footerEl.style.display = sheet ? "block" : "none";

  if (!sheet) {
    wrapEl.innerHTML = `
      <div id="empty-state" class="empty-state">
        <p>No positions yet.</p>
        <div class="empty-actions">
          <button type="button" class="tb-btn" data-add="aff">Add Aff flow</button>
          <button type="button" class="tb-btn" data-add="off">Add Off flow</button>
        </div>
      </div>`;
    wrapEl.querySelector('[data-add="aff"]')?.addEventListener("click", () => {
      newSheet(round, "aff");
      touch();
    });
    wrapEl.querySelector('[data-add="off"]')?.addEventListener("click", () => {
      newSheet(round, "neg");
      touch();
    });
    return;
  }

  const sheetEl = document.createElement("div");
  sheetEl.className = "flow-sheet";

  const colTemplate = `28px repeat(${sheet.cols.length}, minmax(calc(140px * var(--zoom)), 1fr))`;

  const header = document.createElement("div");
  header.className = "flow-header";
  header.style.gridTemplateColumns = colTemplate;

  const corner = document.createElement("div");
  corner.className = "flow-header-cell";
  corner.textContent = "#";
  header.appendChild(corner);

  sheet.cols.forEach((col) => {
    const h = document.createElement("div");
    h.className = "flow-header-cell";
    h.dataset.col = col;
    h.textContent = col;
    header.appendChild(h);
  });
  sheetEl.appendChild(header);

  const body = document.createElement("div");
  body.className = "flow-body";

  const styleClass = getCellStyleClass();

  sheet.rows.forEach((row, rowIdx) => {
    const rowEl = document.createElement("div");
    rowEl.className = "flow-row";
    rowEl.style.gridTemplateColumns = colTemplate;

    const num = document.createElement("div");
    num.className = "flow-row-num";
    num.textContent = String(rowIdx + 1);
    rowEl.appendChild(num);

    sheet.cols.forEach((col, colIdx) => {
      const cellData = row.cells[col] || (row.cells[col] = { text: "", mark: "normal" });
      const wrap = document.createElement("div");
      wrap.className = "flow-cell-wrap";

      const div = document.createElement("div");
      div.className = "flow-cell" + (cellData.mark !== "normal" ? " " + cellData.mark : "");
      div.contentEditable = "false";
      div.tabIndex = 0;
      div.textContent = cellData.text;
      div.dataset.row = rowIdx;
      div.dataset.col = col;
      div.setAttribute("role", "gridcell");

      if (
        selectedCell &&
        selectedCell.sheetId === sheet.id &&
        selectedCell.rowIdx === rowIdx &&
        selectedCell.col === col
      ) {
        div.classList.add("selected", styleClass);
      }

      if (cellData.mark === "dropped") {
        const badge = document.createElement("span");
        badge.className = "mark-badge";
        badge.textContent = "DROP";
        wrap.appendChild(badge);
      } else if (cellData.mark === "conceded") {
        const badge = document.createElement("span");
        badge.className = "mark-badge conceded-badge";
        badge.textContent = "CONC";
        wrap.appendChild(badge);
      }

      wireCellEvents(div, sheet, row, rowIdx, col, colIdx);
      wrap.appendChild(div);
      rowEl.appendChild(wrap);
    });
    body.appendChild(rowEl);
  });

  const extendRow = document.createElement("div");
  extendRow.className = "flow-extend-row";
  extendRow.style.gridTemplateColumns = colTemplate;

  const extendCorner = document.createElement("div");
  extendCorner.className = "flow-row-num";
  extendRow.appendChild(extendCorner);

  sheet.cols.forEach((col) => {
    const wrap = document.createElement("div");
    wrap.className = "flow-cell-wrap";
    const btn = document.createElement("button");
    btn.className = "extend-btn";
    btn.textContent = "+";
    btn.title = `Extend argument in ${col}`;
    btn.addEventListener("click", () => {
      extendArgument(sheet, col);
      touch();
    });
    wrap.appendChild(btn);
    extendRow.appendChild(wrap);
  });
  body.appendChild(extendRow);

  sheetEl.appendChild(body);
  wrapEl.appendChild(sheetEl);
  restoreGridFocus(sheet);
}

function wireCellEvents(div, sheet, row, rowIdx, col, colIdx) {
  div.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    if (editing && editingDiv !== div) endEdit(editingDiv);
  });
  div.addEventListener("click", () => {
    if (!editing || editingDiv !== div) selectCell(sheet.id, rowIdx, col, div);
  });
  div.addEventListener("dblclick", (e) => {
    e.preventDefault();
    selectCell(sheet.id, rowIdx, col, div);
    beginEdit(div, { clear: false });
  });
  div.addEventListener("focus", () => selectCell(sheet.id, rowIdx, col, div));
  div.addEventListener("blur", () => {
    if (editing && editingDiv === div) endEdit(div);
  });
  div.addEventListener("input", () => {
    const cellData = row.cells[col];
    cellData.text = div.textContent;
    scheduleSave(roundRef.current);
    if (rowIdx === 0) refreshSheetLabel(sheet);
  });
  div.addEventListener("keydown", (e) =>
    handleCellKeydown(e, sheet, row, rowIdx, col, colIdx, div)
  );
  div.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    if (editing && editingDiv === div) endEdit(div);
    selectCell(sheet.id, rowIdx, col, div);
    openCtxMenu(e.clientX, e.clientY, sheet.id, rowIdx, col);
  });
}

function handleCellKeydown(e, sheet, row, rowIdx, col, colIdx, div) {
  if (editing && editingDiv === div) {
    handleEditingKeydown(e, sheet, rowIdx, col, colIdx, div);
    return;
  }

  if (e.key === "Tab") {
    e.preventDefault();
    moveSelection(0, e.shiftKey ? -1 : 1);
    return;
  }
  if (handleEnterShortcuts(e, sheet, rowIdx, col, div)) return;
  if (e.key === "F2") {
    e.preventDefault();
    beginEdit(div, { clear: false });
    return;
  }
  if (e.key === "ArrowUp") { e.preventDefault(); moveSelection(-1, 0); return; }
  if (e.key === "ArrowDown") { e.preventDefault(); moveSelection(1, 0); return; }
  if (e.key === "ArrowLeft") { e.preventDefault(); moveSelection(0, -1); return; }
  if (e.key === "ArrowRight") { e.preventDefault(); moveSelection(0, 1); return; }
  if (e.key === "Backspace" || e.key === "Delete") {
    e.preventDefault();
    const cellData = row.cells[col] || (row.cells[col] = { text: "", mark: "normal" });
    cellData.text = "";
    div.textContent = "";
    scheduleSave(roundRef.current);
    if (rowIdx === 0) refreshSheetLabel(sheet);
    return;
  }
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    beginEdit(div, { clear: true });
    document.execCommand("insertText", false, e.key);
    row.cells[col].text = div.textContent;
    scheduleSave(roundRef.current);
  }
}

function handleEditingKeydown(e, sheet, rowIdx, col, colIdx, div) {
  if (e.key === "Escape") {
    e.preventDefault();
    cancelEdit(div);
    div.focus();
    return;
  }
  if (e.key === "Tab") {
    e.preventDefault();
    endEdit(div);
    moveSelection(0, e.shiftKey ? -1 : 1);
    return;
  }
  if (e.key === "Enter") {
    handleEnterShortcuts(e, sheet, rowIdx, col, div, { inEdit: true });
  }
}

export function selectCell(sheetId, rowIdx, col, div) {
  selectedCell = { sheetId, rowIdx, col };
  document.querySelectorAll(".flow-cell.selected").forEach((c) => {
    c.classList.remove("selected", "style-outline", "style-filled");
  });
  if (div) div.classList.add("selected", getCellStyleClass());
  emitCellSelect();
}

export function focusCell(sheetId, rowIdx, col, { edit = false } = {}) {
  const el = getCellElement(sheetId, rowIdx, col);
  if (el) {
    el.focus();
    selectCell(sheetId, rowIdx, col, el);
    if (edit) beginEdit(el, { clear: false });
  }
}

export function addRow() {
  const sheet = getActiveSheet(roundRef.current);
  if (!sheet) return;
  sheet.rows.push(makeRow(sheet.cols));
  touch();
}

export function applyCellMark(mark) {
  if (!ctxTarget) return;
  const cell = getCellData(roundRef.current, ctxTarget.sheetId, ctxTarget.rowIdx, ctxTarget.col);
  if (!cell) return;
  if (mark === "clear") {
    cell.text = "";
    cell.mark = "normal";
  } else {
    cell.mark = mark;
  }
  touch();
}

export function openCtxMenu(x, y, sheetId, rowIdx, col) {
  ctxTarget = { sheetId, rowIdx, col };
  const menu = document.getElementById("ctx-menu");
  if (!menu) return;
  menu.style.display = "block";
  menu.style.left = Math.min(x, window.innerWidth - 240) + "px";
  menu.style.top = Math.min(y, window.innerHeight - 220) + "px";
}

export function closeCtxMenu() {
  ctxTarget = null;
  const menu = document.getElementById("ctx-menu");
  if (menu) menu.style.display = "none";
}

export function getCtxTarget() {
  return ctxTarget;
}

export function switchPositionTab(dir, focusHint) {
  const partner = getActivePartner(roundRef.current);
  if (!partner?.sheets.length) return;
  const idx = partner.sheets.findIndex((s) => s.id === partner.activeSheetId);
  const next = (idx + dir + partner.sheets.length) % partner.sheets.length;
  partner.activeSheetId = partner.sheets[next].id;
  if (focusHint) {
    focusEquivalentCell(focusHint.rowIdx, focusHint.col);
    pendingKeyboardEdit = true;
  }
  touch();
}

export function switchPartnerTab(dir) {
  const round = roundRef.current;
  const idx = round.partners.findIndex((p) => p.id === round.activePartnerId);
  const next = (idx + dir + round.partners.length) % round.partners.length;
  round.activePartnerId = round.partners[next].id;
  touch();
}
