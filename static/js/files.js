import { scheduleSave } from "./archive.js";

let roundRef = { current: null };

export function setRound(round) {
  roundRef.current = round;
}

export function getUploadedFiles() {
  return roundRef.current?.uploadedFiles || [];
}

export function htmlToMarkedText(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("mark").forEach((m) => {
    m.replaceWith("⟦HL⟧" + m.textContent + "⟦/HL⟧");
  });
  const blocks = doc.body.querySelectorAll("p, li, h1, h2, h3, h4, h5, h6, tr, blockquote");
  let out = blocks.length
    ? Array.from(blocks)
        .map((b) => b.textContent.trim())
        .filter(Boolean)
        .join("\n")
    : doc.body.textContent.trim();
  out = out.replace(/⟦\/HL⟧(\s*)⟦HL⟧/g, "$1");
  return out;
}

export async function handleFiles(fileList, owner) {
  const round = roundRef.current;
  if (!round) return;
  owner = owner === "opponent" ? "opponent" : "ours";
  round.uploadedFiles = round.uploadedFiles || [];

  for (const file of fileList) {
    const name = file.name;
    try {
      let content = "";
      if (name.toLowerCase().endsWith(".docx")) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer }, { styleMap: ["highlight => mark"] });
        content = htmlToMarkedText(result.value);
      } else {
        content = await file.text();
      }
      round.uploadedFiles.push({ name, content, owner });
    } catch (e) {
      window.dispatchEvent(
        new CustomEvent("mxflow:file-error", { detail: { name, message: e.message } })
      );
    }
  }
  scheduleSave(round);
  renderFiles();
}

export function removeFile(file) {
  const round = roundRef.current;
  if (!round) return;
  const idx = round.uploadedFiles.indexOf(file);
  if (idx > -1) {
    round.uploadedFiles.splice(idx, 1);
    scheduleSave(round);
    renderFiles();
  }
}

export function renderFiles() {
  const round = roundRef.current;
  ["ours", "opponent"].forEach((owner) => {
    const list = document.querySelector(`.files-list[data-owner="${owner}"]`);
    if (!list) return;
    list.innerHTML = "";
    const files = (round?.uploadedFiles || []).filter((f) => (f.owner || "ours") === owner);
    if (!files.length) {
      list.innerHTML = '<div class="none">No cards uploaded</div>';
      return;
    }
    files.forEach((f) => {
      const item = document.createElement("div");
      item.className = "file-item";
      const nm = document.createElement("span");
      nm.className = "fname";
      nm.textContent = f.name;
      const rm = document.createElement("button");
      rm.className = "frm";
      rm.textContent = "×";
      rm.setAttribute("aria-label", `Remove ${f.name}`);
      rm.addEventListener("click", () => removeFile(f));
      item.appendChild(nm);
      item.appendChild(rm);
      list.appendChild(item);
    });
  });
}

export function wireFileUpload() {
  let pendingOwner = "ours";
  const panel = document.getElementById("files-panel");
  const input = document.getElementById("file-input");

  document.getElementById("upload-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (panel) panel.style.display = panel.style.display === "block" ? "none" : "block";
    renderFiles();
  });
  panel?.addEventListener("click", (e) => e.stopPropagation());
  document.addEventListener("click", () => {
    if (panel) panel.style.display = "none";
  });

  document.querySelectorAll(".pick-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      pendingOwner = btn.dataset.owner;
      input?.click();
    });
  });
  input?.addEventListener("change", (e) => {
    handleFiles(e.target.files, pendingOwner);
    e.target.value = "";
  });

  document.querySelectorAll(".dropzone").forEach((zone) => {
    ["dragenter", "dragover"].forEach((ev) =>
      zone.addEventListener(ev, (e) => {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.add("drag");
      })
    );
    ["dragleave", "dragend"].forEach((ev) =>
      zone.addEventListener(ev, (e) => {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.remove("drag");
      })
    );
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.remove("drag");
      if (e.dataTransfer?.files.length) handleFiles(e.dataTransfer.files, zone.dataset.owner);
    });
  });

  ["dragover", "drop"].forEach((ev) =>
    window.addEventListener(ev, (e) => e.preventDefault(), false)
  );
}
