/** View router: dashboard vs flow */

let appStateRef = { current: null };
const listeners = [];

export function initRouter(appState) {
  appStateRef.current = appState;
}

export function getAppState() {
  return appStateRef.current;
}

export function setAppState(state) {
  appStateRef.current = state;
}

export function getView() {
  return appStateRef.current?.view || "dashboard";
}

export function onViewChange(fn) {
  listeners.push(fn);
}

function emit() {
  listeners.forEach((fn) => fn(appStateRef.current));
}

export function showDashboard() {
  if (!appStateRef.current) return;
  appStateRef.current.view = "dashboard";
  applyViewDom();
  emit();
}

export function showFlow(roundId) {
  if (!appStateRef.current) return;
  if (roundId) appStateRef.current.activeRoundId = roundId;
  appStateRef.current.view = "flow";
  applyViewDom();
  emit();
}

export function applyViewDom() {
  const view = getView();
  const dash = document.getElementById("dashboard-view");
  const flow = document.getElementById("flow-view");
  if (dash) dash.hidden = view !== "dashboard";
  if (flow) flow.hidden = view !== "flow";
  document.title = view === "dashboard" ? "New Sheet" : "New Sheet — Flow";
}

export function setActiveFolder(folderId) {
  if (!appStateRef.current) return;
  appStateRef.current.activeFolderId = folderId;
  emit();
}

export function getActiveFolderId() {
  return appStateRef.current?.activeFolderId || "all";
}

export function folderDisplayName(folderId, folders) {
  if (folderId === "all") return "All Rounds";
  if (folderId === "unfiled") return "Unfiled";
  return folders.find((f) => f.id === folderId)?.name || "Folder";
}
