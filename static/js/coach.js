import { buildCoachPayload } from "./debate-model.js";

let chatMessages = [];
let cellMode = false;
let abortController = null;
let coachAvailable = null;

const listeners = { render: [] };

export function onChatRender(fn) {
  listeners.render.push(fn);
}

function emitRender() {
  listeners.render.forEach((fn) => fn(chatMessages, cellMode));
}

export async function checkCoachAvailable() {
  try {
    const r = await fetch("/api/health");
    const j = await r.json();
    coachAvailable = j.coach === true;
  } catch {
    coachAvailable = false;
  }
  return coachAvailable;
}

export function isCoachAvailable() {
  return coachAvailable;
}

export function getChatMessages() {
  return chatMessages;
}

export function setCellMode(on) {
  cellMode = on;
  emitRender();
}

export function isCellMode() {
  return cellMode;
}

export async function sendCoachMessage(round, userMessage) {
  if (!userMessage?.trim()) return;

  if (!coachAvailable) {
    chatMessages.push({
      role: "assistant",
      text: "Start the Python server for AI coach: pip install -r requirements.txt && uvicorn server.main:app --reload",
      error: true,
    });
    emitRender();
    return;
  }

  if (abortController) abortController.abort();
  abortController = new AbortController();

  chatMessages.push({ role: "user", text: userMessage });
  const thinking = { role: "assistant", thinking: true, text: "Coach is thinking…" };
  chatMessages.push(thinking);
  emitRender();

  const payload = buildCoachPayload(round, userMessage);
  payload.messages = chatMessages
    .filter((m) => !m.thinking && !m.error)
    .map((m) => ({ role: m.role, content: m.text }));

  try {
    const resp = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: abortController.signal,
    });

    chatMessages = chatMessages.filter((m) => m !== thinking);

    if (!resp.ok) {
      let errText = `API error ${resp.status}`;
      try {
        const j = await resp.json();
        errText = j.detail || j.error || errText;
      } catch {}
      chatMessages.push({ role: "assistant", text: errText, error: true });
    } else {
      const data = await resp.json();
      chatMessages.push({ role: "assistant", text: data.text || "(empty response)" });
      if (data.truncated) {
        chatMessages.push({
          role: "assistant",
          text: "(Context was truncated to fit model limits.)",
          error: false,
        });
      }
    }
  } catch (err) {
    if (err.name === "AbortError") return;
    chatMessages = chatMessages.filter((m) => m !== thinking);
    chatMessages.push({ role: "assistant", text: "Request failed: " + err.message, error: true });
  }
  abortController = null;
  emitRender();
}

export function generateForCell(round, sheet, col, text) {
  const typeLabel = sheet.type === "aff" ? "Aff Flow" : "Neg Flow";
  const msg = `Generate a response to this argument from the ${col} column on the ${typeLabel} "${sheet.name}":\n\n"${text}"`;
  return sendCoachMessage(round, msg);
}

export function clearChat() {
  chatMessages = [];
  emitRender();
}

export function renderMarkdown(text) {
  let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  return html;
}

export function setCoachLayout(mode) {
  const split = document.getElementById("flow-main-split");
  const panel = document.getElementById("coach-panel");
  if (!split) return;

  split.classList.remove("coach-collapsed", "coach-bottom");
  if (mode === "collapsed") {
    split.classList.add("coach-collapsed");
    if (panel) panel.hidden = true;
  } else if (mode === "bottom") {
    split.classList.add("coach-bottom");
    if (panel) panel.hidden = false;
  } else if (panel) {
    panel.hidden = false;
  }
}

export function detectCoachLayout() {
  const w = window.innerWidth;
  if (w < 768) return "hidden";
  if (w < 1024) return "bottom";
  if (w < 1280) return "collapsed";
  return "full";
}

export function applyResponsiveCoach() {
  const layout = detectCoachLayout();
  const banner = document.getElementById("mobile-banner");
  if (banner) banner.style.display = window.innerWidth < 768 ? "block" : "none";

  if (layout === "hidden") {
    setCoachLayout("collapsed");
  } else if (layout === "bottom") {
    setCoachLayout("bottom");
  } else if (layout === "collapsed") {
    setCoachLayout("collapsed");
  } else {
    setCoachLayout("full");
  }
}
