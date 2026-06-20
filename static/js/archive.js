import {
  migrateRoundDocument,
  createEmptyRound,
} from "./debate-model.js";
import {
  SCHEMA_VERSION,
  APP_SCHEMA_VERSION,
  DEFAULT_APP_SETTINGS,
} from "./constants.js";

const DB_NAME = "mxflow";
const DB_VERSION = 2;
const STORE_ROUNDS = "rounds";
const STORE_ACTIVE = "activeRound";
const STORE_APP = "appState";
const STORE_OUTBOX = "syncOutbox";

let dbPromise = null;
let saveTimer = null;
let pendingRound = null;
let onSaveCallbacks = [];

export function onRoundSaved(fn) {
  onSaveCallbacks.push(fn);
}

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (ev) => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_ROUNDS)) {
        const store = db.createObjectStore(STORE_ROUNDS, { keyPath: "id" });
        store.createIndex("date", "meta.date", { unique: false });
        store.createIndex("opponent", "meta.opponent", { unique: false });
        store.createIndex("folderId", "folderId", { unique: false });
        store.createIndex("lastEdited", "lastEdited", { unique: false });
      } else if (ev.oldVersion < 2) {
        const store = ev.target.transaction.objectStore(STORE_ROUNDS);
        if (!store.indexNames.contains("folderId")) store.createIndex("folderId", "folderId", { unique: false });
        if (!store.indexNames.contains("lastEdited")) store.createIndex("lastEdited", "lastEdited", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_ACTIVE)) {
        db.createObjectStore(STORE_ACTIVE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORE_APP)) {
        db.createObjectStore(STORE_APP, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORE_OUTBOX)) {
        db.createObjectStore(STORE_OUTBOX, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx(storeName, mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(storeName, mode);
    const store = t.objectStore(storeName);
    const result = fn(store);
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
  });
}

export function createDefaultAppState() {
  return {
    schemaVersion: APP_SCHEMA_VERSION,
    folders: [],
    activeFolderId: "all",
    activeRoundId: null,
    view: "dashboard",
    settings: { ...DEFAULT_APP_SETTINGS },
  };
}

export async function loadAppState() {
  try {
    const stored = await tx(STORE_APP, "readonly", (store) => {
      return new Promise((res) => {
        const r = store.get("current");
        r.onsuccess = () => res(r.result?.state || null);
        r.onerror = () => res(null);
      });
    });
    if (stored) return { ...createDefaultAppState(), ...stored, settings: { ...DEFAULT_APP_SETTINGS, ...stored.settings } };
  } catch (e) {
    console.warn("App state load failed", e);
  }
  return createDefaultAppState();
}

export async function saveAppState(state) {
  await tx(STORE_APP, "readwrite", (store) => store.put({ key: "current", state }));
  return state;
}

/** Load active round from IDB or migrate v0 localStorage. */
export async function loadActiveRound() {
  const appState = await loadAppState();
  if (appState.activeRoundId) {
    const round = await loadRoundById(appState.activeRoundId);
    if (round) return round;
  }

  try {
    const active = await tx(STORE_ACTIVE, "readonly", (store) => {
      return new Promise((res) => {
        const r = store.get("current");
        r.onsuccess = () => res(r.result);
        r.onerror = () => res(null);
      });
    });
    if (active?.roundId) {
      const round = await loadRoundById(active.roundId);
      if (round) {
        appState.activeRoundId = round.id;
        appState.view = appState.view || "dashboard";
        await saveAppState(appState);
        await putRound(round);
        return round;
      }
    }
  } catch (e) {
    console.warn("IDB load failed", e);
  }

  try {
    const raw = localStorage.getItem("debateFlow.sheets");
    const settings = JSON.parse(localStorage.getItem("debateFlow.settings") || "null");
    if (raw) {
      const parsed = JSON.parse(raw);
      const activeId = localStorage.getItem("debateFlow.activeId");
      const migrated = migrateRoundDocument({
        ...parsed,
        activeId,
        settings: settings || {},
      });
      await putRound(migrated);
      appState.activeRoundId = migrated.id;
      await saveAppState(appState);
      return migrated;
    }
  } catch (e) {
    console.warn("localStorage migration failed", e);
  }

  return null;
}

async function putRound(round) {
  const doc = migrateRoundDocument(round);
  doc.lastEdited = Date.now();
  await tx(STORE_ROUNDS, "readwrite", (store) => store.put(doc));
  await tx(STORE_ACTIVE, "readwrite", (store) =>
    store.put({ key: "current", roundId: doc.id })
  );
  return doc;
}

export async function saveRound(round, immediate = false) {
  pendingRound = round;
  if (immediate) {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = null;
    try {
      const saved = await putRound(round);
      pendingRound = null;
      onSaveCallbacks.forEach((fn) => fn(saved));
      return saved;
    } catch (e) {
      if (e?.name === "QuotaExceededError") throw new Error("ARCHIVE_FULL");
      throw e;
    }
  }
  scheduleSave(round);
}

/** @deprecated alias */
export const saveActiveRound = saveRound;

export function scheduleSave(round) {
  if (round) pendingRound = round;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    if (!pendingRound) return;
    try {
      const saved = await putRound(pendingRound);
      pendingRound = null;
      onSaveCallbacks.forEach((fn) => fn(saved));
    } catch (e) {
      console.error("Autosave failed", e);
      window.dispatchEvent(new CustomEvent("mxflow:save-error", { detail: e.message }));
    }
  }, 300);
}

export function flushSave() {
  if (pendingRound) return saveRound(pendingRound, true);
  return Promise.resolve();
}

export async function listArchivedRounds() {
  return listAllRounds();
}

export async function listAllRounds() {
  return tx(STORE_ROUNDS, "readonly", (store) => {
    return new Promise((res) => {
      const r = store.getAll();
      r.onsuccess = () => res((r.result || []).map(migrateRoundDocument));
      r.onerror = () => res([]);
    });
  });
}

export function filterRoundsByFolder(rounds, folderId) {
  if (folderId === "all") return rounds;
  if (folderId === "unfiled") return rounds.filter((r) => !r.folderId);
  return rounds.filter((r) => r.folderId === folderId);
}

export async function saveRoundToArchive(round) {
  const doc = migrateRoundDocument({ ...round });
  doc.meta = doc.meta || {};
  if (!doc.meta.date) doc.meta.date = new Date().toISOString().slice(0, 10);
  doc.lastEdited = Date.now();
  await tx(STORE_ROUNDS, "readwrite", (store) => store.put(doc));
  return doc;
}

export async function loadRoundById(id) {
  return tx(STORE_ROUNDS, "readonly", (store) => {
    return new Promise((res) => {
      const r = store.get(id);
      r.onsuccess = () => res(r.result ? migrateRoundDocument(r.result) : null);
      r.onerror = () => res(null);
    });
  });
}

export async function deleteRoundById(id) {
  await tx(STORE_ROUNDS, "readwrite", (store) => store.delete(id));
}

export async function forkRound(round) {
  const forked = migrateRoundDocument(JSON.parse(JSON.stringify(round)));
  forked.id = crypto.randomUUID().slice(0, 8);
  forked.meta = { ...forked.meta, date: new Date().toISOString().slice(0, 10) };
  forked.lastEdited = Date.now();
  await saveRoundToArchive(forked);
  return forked;
}

export function exportMxflow(round) {
  const doc = migrateRoundDocument(round);
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
  const name =
    doc.meta?.opponent
      ? `Round_vs_${doc.meta.opponent.replace(/\s+/g, "_")}_${doc.meta.date || "export"}.mxflow`
      : `round_${doc.id}.mxflow`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name.endsWith(".mxflow") ? name : name + ".mxflow";
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function exportBackup(appState, rounds) {
  const payload = {
    type: "mxflow-backup",
    exportedAt: new Date().toISOString(),
    appState,
    rounds: rounds.map(migrateRoundDocument),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `mxflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function importMxflow(file) {
  const text = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON file");
  }
  if (parsed.type === "mxflow-backup") {
    return { type: "backup", appState: parsed.appState, rounds: (parsed.rounds || []).map(migrateRoundDocument) };
  }
  if (!parsed.schemaVersion && !parsed.sheets && !parsed.partners) {
    throw new Error("Not a valid .mxflow file");
  }
  return { type: "round", round: migrateRoundDocument(parsed) };
}

export function setupBeforeUnload() {
  window.addEventListener("beforeunload", (e) => {
    if (pendingRound) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && pendingRound) {
      flushSave();
    }
  });
}

export async function enqueueSyncPatch(patch) {
  await tx(STORE_OUTBOX, "readwrite", (store) =>
    store.add({ ...patch, ts: Date.now() })
  );
}

/** Read and clear every queued sync patch (used to resend after reconnecting). */
export async function drainSyncOutbox() {
  const items = await tx(STORE_OUTBOX, "readonly", (store) => {
    return new Promise((res) => {
      const r = store.getAll();
      r.onsuccess = () => res(r.result || []);
      r.onerror = () => res([]);
    });
  });
  await tx(STORE_OUTBOX, "readwrite", (store) => store.clear());
  return items;
}

export { SCHEMA_VERSION, APP_SCHEMA_VERSION };
