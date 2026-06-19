import {
  listAllRounds,
  filterRoundsByFolder,
  saveRound,
  saveRoundToArchive,
  deleteRoundById,
  forkRound,
  exportBackup,
  importMxflow,
} from "./archive.js";
import {
  createEmptyRound,
  formatRoundTitle,
  relativeTime,
} from "./debate-model.js";
import {
  getAppState,
  setActiveFolder,
  getActiveFolderId,
  folderDisplayName,
  showFlow,
} from "./router.js";

const uid = () => Math.random().toString(36).slice(2, 10);

let callbacks = { onOpenRound: null, onNewRound: null, onImport: null, onSaveAppState: null };

export function wireDashboard(cbs) {
  callbacks = { ...callbacks, ...cbs };
}

export async function renderDashboard() {
  const appState = getAppState();
  if (!appState) return;

  renderFolders(appState);
  await renderRoundList(appState);
}

function renderFolders(appState) {
  const list = document.getElementById("folder-list");
  if (!list) return;
  list.innerHTML = "";

  const virtual = [
    { id: "all", name: "All Rounds" },
    { id: "unfiled", name: "Unfiled" },
  ];
  const all = [...virtual, ...appState.folders];

  all.forEach((folder) => {
    const item = document.createElement("div");
    item.className = "folder-item" + (appState.activeFolderId === folder.id ? " active" : "");
    item.dataset.id = folder.id;

    const label = document.createElement("span");
    label.textContent = folder.name;
    item.appendChild(label);

    item.addEventListener("click", async () => {
      setActiveFolder(folder.id);
      appState.activeFolderId = folder.id;
      await callbacks.onSaveAppState?.(appState);
      await renderDashboard();
    });

    if (!["all", "unfiled"].includes(folder.id)) {
      item.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        const action = prompt("Folder: rename or delete?", "rename/delete");
        if (action === "delete") {
          if (!confirm(`Delete folder "${folder.name}"? Rounds move to Unfiled.`)) return;
          appState.folders = appState.folders.filter((f) => f.id !== folder.id);
          if (appState.activeFolderId === folder.id) appState.activeFolderId = "all";
          callbacks.onSaveAppState?.(appState);
          renderDashboard();
        } else if (action === "rename") {
          const name = prompt("Folder name:", folder.name);
          if (name?.trim()) {
            folder.name = name.trim();
            callbacks.onSaveAppState?.(appState);
            renderDashboard();
          }
        }
      });
    }

    list.appendChild(item);
  });
}

async function renderRoundList(appState) {
  const container = document.getElementById("round-list");
  const headerTitle = document.getElementById("dashboard-folder-title");
  if (!container) return;

  const folderName = folderDisplayName(appState.activeFolderId, appState.folders);
  if (headerTitle) headerTitle.textContent = folderName;

  const q = (document.getElementById("dashboard-search")?.value || "").toLowerCase();
  const allRounds = await listAllRounds();
  let rounds = filterRoundsByFolder(allRounds, appState.activeFolderId);

  if (q) {
    rounds = rounds.filter((r) => {
      const label = formatRoundTitle(r).toLowerCase();
      const meta = `${r.meta?.opponent || ""} ${r.meta?.tournament || ""}`.toLowerCase();
      return label.includes(q) || meta.includes(q);
    });
  }

  rounds.sort((a, b) => (b.lastEdited || 0) - (a.lastEdited || 0));
  container.innerHTML = "";

  if (!rounds.length) {
    container.innerHTML = `
      <div class="dashboard-empty">
        <h2>No rounds in ${escapeHtml(folderName)}</h2>
        <p>Create or import a policy debate flow</p>
        <button type="button" class="tb-btn primary" id="empty-new-round">+ New Round</button>
      </div>`;
    container.querySelector("#empty-new-round")?.addEventListener("click", () => callbacks.onNewRound?.());
    return;
  }

  rounds.forEach((round) => {
    const card = document.createElement("div");
    card.className = "round-card";

    const info = document.createElement("div");
    const title = document.createElement("div");
    title.className = "round-card-title";
    title.textContent = formatRoundTitle(round);
    const meta = document.createElement("div");
    meta.className = "round-card-meta";
    meta.textContent = relativeTime(round.lastEdited);
    info.appendChild(title);
    info.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "round-card-actions";

    const openBtn = document.createElement("button");
    openBtn.className = "tb-btn";
    openBtn.textContent = "Open";
    openBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      callbacks.onOpenRound?.(round.id);
    });

    const dupBtn = document.createElement("button");
    dupBtn.className = "tb-btn";
    dupBtn.textContent = "Duplicate";
    dupBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await forkRound(round);
      await renderDashboard();
    });

    const delBtn = document.createElement("button");
    delBtn.className = "tb-btn";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!confirm("Delete this round?")) return;
      await deleteRoundById(round.id);
      if (appState.activeRoundId === round.id) appState.activeRoundId = null;
      await callbacks.onSaveAppState?.(appState);
      await renderDashboard();
    });

    actions.appendChild(openBtn);
    actions.appendChild(dupBtn);
    actions.appendChild(delBtn);

    card.appendChild(info);
    card.appendChild(actions);
    card.addEventListener("click", () => callbacks.onOpenRound?.(round.id));
    container.appendChild(card);
  });
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function wireDashboardControls(appState) {
  document.getElementById("sidebar-new-round")?.addEventListener("click", () => callbacks.onNewRound?.());
  document.getElementById("sidebar-settings")?.addEventListener("click", () => {
    document.getElementById("modal-overlay").style.display = "flex";
  });
  document.getElementById("sidebar-import")?.addEventListener("click", () => {
    document.getElementById("backup-input")?.click();
  });
  document.getElementById("folder-add-btn")?.addEventListener("click", () => {
    const name = prompt("New folder name:");
    if (!name?.trim()) return;
    appState.folders.push({ id: uid(), name: name.trim() });
    callbacks.onSaveAppState?.(appState);
    renderDashboard();
  });
  document.getElementById("dashboard-search")?.addEventListener("input", () => renderDashboard());
}

export async function createAndOpenRound(appState) {
  let folderId = null;
  if (appState.activeFolderId !== "all" && appState.activeFolderId !== "unfiled") {
    folderId = appState.activeFolderId;
  }
  const round = createEmptyRound({ folderId, withDefaultSheets: true });
  await saveRoundToArchive(round);
  appState.activeRoundId = round.id;
  await callbacks.onSaveAppState?.(appState);
  showFlow(round.id);
  return round;
}

export async function handleBackupImport(file, appState) {
  const result = await importMxflow(file);
  if (result.type === "backup") {
    for (const r of result.rounds) await saveRoundToArchive(r);
    if (result.appState?.folders) appState.folders = result.appState.folders;
    await callbacks.onSaveAppState?.(appState);
    await renderDashboard();
    return null;
  }
  await saveRoundToArchive(result.round);
  appState.activeRoundId = result.round.id;
  await callbacks.onSaveAppState?.(appState);
  showFlow(result.round.id);
  return result.round;
}

export async function exportFullBackup(appState) {
  const rounds = await listAllRounds();
  await exportBackup(appState, rounds);
}
