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
let insertMode = true;

const listeners = { render: [], cellSelect: [] };

export function setRound(round) {
  roundRef.current = round;
  insertMode = round.settings?.insertMode !== false;
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
      div.contentEditable = "true";
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

      div.addEventListener("input", () => {
        cellData.text = div.textContent;
        if (rowIdx === 0) autoLabelSheet(sheet);
        touch();
      });
      div.addEventListener("focus", () => selectCell(sheet.id, rowIdx, col, div));
      div.addEventListener("keydown", (e) => handleCellKeydown(e, sheet, rowIdx, col, colIdx));
      div.addEventListener("contextmenu", (e) => {
        e.preventDefault();
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
}

function handleCellKeydown(e, sheet, rowIdx, col, colIdx) {
  const round = roundRef.current;
  if (e.key === "Tab") {
    e.preventDefault();
    const next = e.shiftKey ? colIdx - 1 : colIdx + 1;
    if (next >= 0 && next < sheet.cols.length) {
      focusCell(sheet.id, rowIdx, sheet.cols[next]);
    }
    return;
  }
  if (e.key === "Enter" && e.shiftKey) {
    e.preventDefault();
    sheet.rows.splice(rowIdx + 1, 0, makeRow(sheet.cols));
    touch();
    focusCell(sheet.id, rowIdx + 1, col);
    return;
  }
  if (e.key === "Enter" && !e.shiftKey && !insertMode) {
    e.preventDefault();
    sheet.rows.splice(rowIdx + 1, 0, makeRow(sheet.cols));
    touch();
    focusCell(sheet.id, rowIdx + 1, col);
  }
  // insertMode: Enter inserts newline inside cell (default contenteditable)
}

export function selectCell(sheetId, rowIdx, col, div) {
  selectedCell = { sheetId, rowIdx, col };
  document.querySelectorAll(".cell.selected").forEach((c) => c.classList.remove("selected"));
  if (div) div.classList.add("selected");
  emitCellSelect();
}

export function focusCell(sheetId, rowIdx, col) {
  const partner = getActivePartner(roundRef.current);
  const sheet = partner?.sheets.find((s) => s.id === sheetId);
  if (!sheet || partner.activeSheetId !== sheetId) return;
  const el = document.querySelector(
    `#grid-wrap .cell[data-row="${rowIdx}"][data-col="${CSS.escape(col)}"]`
  );
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
