/**
 * Operation-based sync over a connected ShareSession.
 *
 * High-frequency cell edits travel as small ops merged with last-writer-wins per
 * target; structural changes (rows, sheets, renames, meta) are smaller ops keyed
 * by id-dedup. On connect both sides exchange a full snapshot so a fresh joiner
 * (or a reconnecting partner) converges to the newer document.
 */
import { makeRow } from "./debate-model.js";
import { enqueueSyncPatch, drainSyncOutbox } from "./archive.js";
import { PROTOCOL_VERSION } from "./share-protocol.js";

const DEBOUNCE_MS = 150;
const MAX_SEEN = 500;

const uuid = () =>
  crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

// Ops whose target carries a partner/sheet identity that won't survive snapshot
// replacement; last-writer-wins keyed by a stable target string.
const LWW_KEYS = {
  cell_set: (p) => `cell:${p.partnerId}:${p.sheetId}:${p.rowIdx}:${p.col}`,
  cell_mark: (p) => `cell:${p.partnerId}:${p.sheetId}:${p.rowIdx}:${p.col}`,
  sheet_rename: (p) => `sheet:${p.partnerId}:${p.sheetId}:name`,
  partner_rename: (p) => `partner:${p.partnerId}:name`,
  meta_set: (p) => `meta:${p.field}`,
};

function targetKey(op, payload) {
  return LWW_KEYS[op] ? LWW_KEYS[op](payload) : null;
}

function findPartner(round, partnerId) {
  return round.partners.find((p) => p.id === partnerId) || null;
}

function findSheet(round, partnerId, sheetId) {
  return findPartner(round, partnerId)?.sheets.find((s) => s.id === sheetId) || null;
}

function ensureCell(sheet, rowIdx, col) {
  while (sheet.rows.length <= rowIdx) sheet.rows.push(makeRow(sheet.cols));
  const row = sheet.rows[rowIdx];
  if (!row.cells[col]) row.cells[col] = { text: "", mark: "normal" };
  return row.cells[col];
}

function applyOp(round, op, payload) {
  switch (op) {
    case "cell_set": {
      const sheet = findSheet(round, payload.partnerId, payload.sheetId);
      if (sheet) ensureCell(sheet, payload.rowIdx, payload.col).text = payload.text;
      break;
    }
    case "cell_mark": {
      const sheet = findSheet(round, payload.partnerId, payload.sheetId);
      if (sheet) ensureCell(sheet, payload.rowIdx, payload.col).mark = payload.mark;
      break;
    }
    case "row_add": {
      const sheet = findSheet(round, payload.partnerId, payload.sheetId);
      if (sheet) {
        const idx = Math.min(payload.rowIdx, sheet.rows.length);
        sheet.rows.splice(idx, 0, payload.row || makeRow(sheet.cols));
      }
      break;
    }
    case "row_delete": {
      const sheet = findSheet(round, payload.partnerId, payload.sheetId);
      if (sheet && sheet.rows[payload.rowIdx]) sheet.rows.splice(payload.rowIdx, 1);
      break;
    }
    case "sheet_add": {
      const partner = findPartner(round, payload.partnerId);
      if (partner && !partner.sheets.some((s) => s.id === payload.sheet.id)) {
        partner.sheets.push(payload.sheet);
      }
      break;
    }
    case "sheet_delete": {
      const partner = findPartner(round, payload.partnerId);
      if (partner) {
        partner.sheets = partner.sheets.filter((s) => s.id !== payload.sheetId);
        if (partner.activeSheetId === payload.sheetId) {
          partner.activeSheetId = partner.sheets[0]?.id || null;
        }
      }
      break;
    }
    case "sheet_rename": {
      const sheet = findSheet(round, payload.partnerId, payload.sheetId);
      if (sheet) sheet.name = payload.name;
      break;
    }
    case "partner_rename": {
      const partner = findPartner(round, payload.partnerId);
      if (partner) partner.name = payload.name;
      break;
    }
    case "meta_set": {
      round.meta = round.meta || {};
      round.meta[payload.field] = payload.value;
      break;
    }
    default:
      break;
  }
}

/** Replace round contents in place, keeping each viewer's local tab selection. */
function applyFullSnapshot(round, snapshot) {
  if (!snapshot) return;
  const localActivePartner = round.activePartnerId;
  const localSheetByPartner = new Map(round.partners.map((p) => [p.id, p.activeSheetId]));

  for (const key of Object.keys(round)) delete round[key];
  Object.assign(round, JSON.parse(JSON.stringify(snapshot)));

  round.activePartnerId = localActivePartner || round.activePartnerId;
  for (const partner of round.partners) {
    const localSheet = localSheetByPartner.get(partner.id);
    if (localSheet && partner.sheets.some((s) => s.id === localSheet)) {
      partner.activeSheetId = localSheet;
    }
  }
}

export class SyncEngine {
  constructor({ session, getRound, onApply }) {
    this.session = session;
    this.getRound = getRound;
    this.onApply = onApply;
    this.applyingRemote = false;
    this.seen = [];
    this.seenSet = new Set();
    this.lww = new Map();
    this.floorTs = 0;
    this.queue = [];
    this.queueKeys = new Map();
    this.flushTimer = null;
  }

  reset() {
    this.seen = [];
    this.seenSet.clear();
    this.lww.clear();
    this.floorTs = 0;
    this.queue = [];
    this.queueKeys.clear();
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = null;
  }

  _markSeen(id) {
    if (this.seenSet.has(id)) return false;
    this.seenSet.add(id);
    this.seen.push(id);
    if (this.seen.length > MAX_SEEN) this.seenSet.delete(this.seen.shift());
    return true;
  }

  _lwwAccept(key, ts, clientId) {
    const cur = this.lww.get(key);
    if (cur && (ts < cur.ts || (ts === cur.ts && clientId <= cur.clientId))) return false;
    this.lww.set(key, { ts, clientId });
    return true;
  }

  /** Record a locally-produced change for broadcast. */
  recordOp({ type, payload }) {
    if (this.applyingRemote) return;
    const session = this.session;
    if (!session || !session.role) return; // not in a share session

    const msg = {
      v: PROTOCOL_VERSION,
      type: "op",
      id: uuid(),
      clientId: session.clientId,
      ts: Date.now(),
      op: type,
      payload,
    };
    const key = targetKey(type, payload);
    if (key) this._lwwAccept(key, msg.ts, msg.clientId);
    this._markSeen(msg.id);

    if (session.isConnected()) {
      this._enqueueLocal(msg, key);
    } else if (session.state !== "idle") {
      enqueueSyncPatch({ msg }).catch(() => {});
    }
  }

  _enqueueLocal(msg, key) {
    if (key && this.queueKeys.has(key)) {
      this.queue[this.queueKeys.get(key)] = msg; // coalesce repeated edits to one cell
    } else {
      if (key) this.queueKeys.set(key, this.queue.length);
      this.queue.push(msg);
    }
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null;
        this._flush();
      }, DEBOUNCE_MS);
    }
  }

  _flush() {
    if (this.session?.isConnected()) {
      for (const msg of this.queue) this.session.send(msg);
    }
    this.queue = [];
    this.queueKeys.clear();
  }

  sendFullSnapshot() {
    const round = this.getRound();
    if (!round || !this.session?.isConnected()) return;
    this.session.send({
      v: PROTOCOL_VERSION,
      type: "op",
      id: uuid(),
      clientId: this.session.clientId,
      ts: Date.now(),
      op: "full_snapshot",
      payload: { round: JSON.parse(JSON.stringify(round)), lastEdited: round.lastEdited || 0 },
    });
  }

  /** Called once the data channel opens: sync full state, then resend queued ops. */
  async onConnect() {
    this.sendFullSnapshot();
    try {
      const queued = await drainSyncOutbox();
      for (const item of queued) {
        if (item.msg) this.session.send(item.msg);
      }
    } catch {
      /* ignore */
    }
  }

  handleMessage(msg) {
    if (!msg || msg.type !== "op") return;
    if (!this._markSeen(msg.id)) return;
    const round = this.getRound();
    if (!round) return;

    if (msg.op === "full_snapshot") {
      const incoming = msg.payload?.round;
      const incomingEdited = msg.payload?.lastEdited || 0;
      if (round.lastEdited && incomingEdited < round.lastEdited) return; // ours is newer
      this.floorTs = Math.max(this.floorTs, incomingEdited);
      this.lww.clear();
      this.applyingRemote = true;
      applyFullSnapshot(round, incoming);
      this.applyingRemote = false;
      this.onApply?.({ op: "full_snapshot", payload: {} });
      return;
    }

    if (msg.ts < this.floorTs) return; // predates the last accepted snapshot
    const key = targetKey(msg.op, msg.payload);
    if (key && !this._lwwAccept(key, msg.ts, msg.clientId)) return;

    this.applyingRemote = true;
    applyOp(round, msg.op, msg.payload);
    this.applyingRemote = false;
    this.onApply?.({ op: msg.op, payload: msg.payload });
  }
}
