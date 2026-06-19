import {
  getActivePartner,
  getActiveSheet,
  makeRow,
  newSheet,
  deleteSheet,
  getCellData,
  autoLabelSheet,
} from "./debate-model.js";
import { scheduleSave } from "./archive.js";

let roundRef = { current: null };
let selectedCell = null;
let ctxTarget = null;
let insertMode = false;
let editing = false;
let editingDiv = null;
let editSnapshot = null;

const listeners = { render: [], cellSelect: [] };

export function setRound(round) {
  roundRef.current = round;
  insertMode = round.settings?.insertMode === true;
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

function emitRender() {
  listeners.render.forEach((fn) => fn());
}

function emitCellSelect() {
  listeners.cellSelect.forEach((fn) => fn(selectedCell));
}

function touch() {
  scheduleSave(roundRef.current);
  emitRender();
}

function getCellElement(sheetId, rowIdx, col) {
  const partner = getActivePartner(roundRef.current);
  const sheet = partner?.sheets.find((s) => s.id === sheetId);
  if (!sheet || partner.activeSheetId !== sheetId) return null;
  return document.querySelector(
    `#grid-wrap .cell[data-row="${rowIdx}"][data-col="${CSS.escape(col)}"]`
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
  renderBreadcrumb(document.getElementById("breadcrumb"));
}

function beginEdit(div, { clear = false } = {}) {
  if (editing && editingDiv !== div) {
    endEdit(editingDiv);
  }
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

function moveSelection(dRow, dCol) {
  if (!selectedCell) return;
  const sheet = getActiveSheet(roundRef.current);
  if (!sheet || selectedCell.sheetId !== sheet.id) return;

  const colIdx = sheet.cols.indexOf(selectedCell.col);
  const newRow = selectedCell.rowIdx + dRow;
  const newColIdx = colIdx + dCol;

  if (newRow < 0 || newRow >= sheet.rows.length) return;
  if (newColIdx < 0 || newColIdx >= sheet.cols.length) return;

  focusCell(sheet.id, newRow, sheet.cols[newColIdx]);
}

function restoreGridFocus(sheet) {
  if (!selectedCell || selectedCell.sheetId !== sheet.id) return;
  const el = getCellElement(sheet.id, selectedCell.rowIdx, selectedCell.col);
  if (el) {
    el.focus();
    selectCell(sheet.id, selectedCell.rowIdx, selectedCell.col, el);
  }
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

export function renderBreadcrumb(el) {
  const round = roundRef.current;
  const partner = getActivePartner(round);
  const sheet = getActiveSheet(round);
  if (!el) return;
  if (!partner) {
    el.textContent = "";
    return;
  }
  const sheetLabel = sheet
    ? `${sheet.name} › ${sheet.type === "aff" ? "Aff" : "Neg"} flow`
    : "No position";
  el.textContent = `${partner.name} › ${sheetLabel}`;
}

export function renderPositionTabs(container, onAddAff, onAddNeg) {
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
    typeLabel.className = "tab-type";
    typeLabel.textContent = sheet.type === "aff" ? "AFF" : "NEG";

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
  const negBtn = document.createElement("button");
  negBtn.textContent = "+ Neg";
  negBtn.addEventListener("click", onAddNeg);
  addWrap.appendChild(affBtn);
  addWrap.appendChild(negBtn);
  container.appendChild(addWrap);
}

export function renderGrid(wrapEl, footerEl) {
  const round = roundRef.current;
  const sheet = getActiveSheet(round);
  if (!wrapEl) return;

  if (editing && editingDiv) {
    endEdit(editingDiv);
  }

  wrapEl.innerHTML = "";
  if (footerEl) footerEl.style.display = sheet ? "block" : "none";

  if (!sheet) {
    wrapEl.innerHTML = `
      <div id="empty-state" class="empty-state">
        <p>No positions yet.</p>
        <div class="empty-actions">
          <button type="button" class="tb-btn" data-add="aff">Add Aff flow</button>
          <button type="button" class="tb-btn" data-add="neg">Add Neg flow</button>
        </div>
      </div>`;
    wrapEl.querySelector('[data-add="aff"]')?.addEventListener("click", () => {
      newSheet(round, "aff");
      touch();
    });
    wrapEl.querySelector('[data-add="neg"]')?.addEventListener("click", () => {
      newSheet(round, "neg");
      touch();
    });
    return;
  }

  const table = document.createElement("table");
  table.className = "flow";
  table.setAttribute("role", "grid");
  table.setAttribute("aria-label", `${sheet.name} flow sheet`);

  const thead = document.createElement("thead");
  const htr = document.createElement("tr");
  const corner = document.createElement("th");
  corner.className = "rownum-h";
  corner.textContent = "#";
  htr.appendChild(corner);
  sheet.cols.forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col;
    th.setAttribute("scope", "col");
    th.setAttribute("aria-label", `${col} speech column`);
    htr.appendChild(th);
  });
  thead.appendChild(htr);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  sheet.rows.forEach((row, rowIdx) => {
    const tr = document.createElement("tr");
    const numTd = document.createElement("td");
    numTd.className = "rownum";
    numTd.textContent = String(rowIdx + 1);
    const delBtn = document.createElement("button");
    delBtn.className = "del-row";
    delBtn.textContent = "×";
    delBtn.setAttribute("aria-label", `Delete row ${rowIdx + 1}`);
    delBtn.addEventListener("click", () => {
      if (sheet.rows.length <= 1) sheet.rows = [makeRow(sheet.cols)];
      else sheet.rows.splice(rowIdx, 1);
      touch();
    });
    numTd.appendChild(delBtn);
    tr.appendChild(numTd);

    sheet.cols.forEach((col, colIdx) => {
      const cellData = row.cells[col] || (row.cells[col] = { text: "", mark: "normal" });
      const td = document.createElement("td");
      td.style.position = "relative";
      const div = document.createElement("div");
      div.className = "cell" + (cellData.mark !== "normal" ? " " + cellData.mark : "");
      div.contentEditable = "false";
      div.tabIndex = 0;
      div.textContent = cellData.text;
      div.dataset.row = rowIdx;
      div.dataset.col = col;
      div.setAttribute("role", "gridcell");

      if (cellData.mark === "dropped") {
        const badge = document.createElement("span");
        badge.className = "mark-badge";
        badge.textContent = "DROP";
        badge.setAttribute("aria-hidden", "true");
        td.appendChild(badge);
      } else if (cellData.mark === "conceded") {
        const badge = document.createElement("span");
        badge.className = "mark-badge conceded-badge";
        badge.textContent = "CONC";
        badge.setAttribute("aria-hidden", "true");
        td.appendChild(badge);
      }

      if (
        selectedCell &&
        selectedCell.sheetId === sheet.id &&
        selectedCell.rowIdx === rowIdx &&
        selectedCell.col === col
      ) {
        div.classList.add("selected");
      }

      div.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;
        if (editing && editingDiv !== div) {
          endEdit(editingDiv);
        }
      });
      div.addEventListener("click", () => {
        if (!editing || editingDiv !== div) {
          selectCell(sheet.id, rowIdx, col, div);
        }
      });
      div.addEventListener("dblclick", (e) => {
        e.preventDefault();
        selectCell(sheet.id, rowIdx, col, div);
        beginEdit(div, { clear: false });
      });
      div.addEventListener("focus", () => {
        selectCell(sheet.id, rowIdx, col, div);
      });
      div.addEventListener("blur", () => {
        if (editing && editingDiv === div) {
          endEdit(div);
        }
      });
      div.addEventListener("input", () => {
        cellData.text = div.textContent;
        scheduleSave(roundRef.current);
        if (rowIdx === 0) refreshSheetLabel(sheet);
      });
      div.addEventListener("keydown", (e) =>
        handleCellKeydown(e, sheet, row, rowIdx, col, colIdx, div)
      );
      div.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        if (editing && editingDiv === div) {
          endEdit(div);
        }
        selectCell(sheet.id, rowIdx, col, div);
        openCtxMenu(e.clientX, e.clientY, sheet.id, rowIdx, col);
      });

      td.appendChild(div);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrapEl.appendChild(table);
  restoreGridFocus(sheet);
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
  if (e.key === "Enter") {
    e.preventDefault();
    moveSelection(1, 0);
    return;
  }
  if (e.key === "F2") {
    e.preventDefault();
    beginEdit(div, { clear: false });
    return;
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    moveSelection(-1, 0);
    return;
  }
  if (e.key === "ArrowDown") {
    e.preventDefault();
    moveSelection(1, 0);
    return;
  }
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    moveSelection(0, -1);
    return;
  }
  if (e.key === "ArrowRight") {
    e.preventDefault();
    moveSelection(0, 1);
    return;
  }
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
    cellDataFromRow(row, col).text = div.textContent;
    scheduleSave(roundRef.current);
  }
}

function cellDataFromRow(row, col) {
  return row.cells[col] || (row.cells[col] = { text: "", mark: "normal" });
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
    if (insertMode && !e.shiftKey && !e.altKey) {
      return;
    }
    if (e.shiftKey || e.altKey) {
      return;
    }
    e.preventDefault();
    endEdit(div);
    moveSelection(1, 0);
  }
}

export function selectCell(sheetId, rowIdx, col, div) {
  selectedCell = { sheetId, rowIdx, col };
  document.querySelectorAll(".cell.selected").forEach((c) => c.classList.remove("selected"));
  if (div) div.classList.add("selected");
  emitCellSelect();
}

export function focusCell(sheetId, rowIdx, col) {
  const el = getCellElement(sheetId, rowIdx, col);
  if (el) {
    el.focus();
    selectCell(sheetId, rowIdx, col, el);
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

export function setInsertMode(on) {
  insertMode = on;
  if (roundRef.current?.settings) roundRef.current.settings.insertMode = on;
}

export function switchPositionTab(dir) {
  const partner = getActivePartner(roundRef.current);
  if (!partner?.sheets.length) return;
  const idx = partner.sheets.findIndex((s) => s.id === partner.activeSheetId);
  const next = (idx + dir + partner.sheets.length) % partner.sheets.length;
  partner.activeSheetId = partner.sheets[next].id;
  touch();
}

export function switchPartnerTab(dir) {
  const round = roundRef.current;
  const idx = round.partners.findIndex((p) => p.id === round.activePartnerId);
  const next = (idx + dir + round.partners.length) % round.partners.length;
  round.activePartnerId = round.partners[next].id;
  touch();
}
