import {
  SCHEMA_VERSION,
  AFF_COLS,
  NEG_COLS,
  DEFAULT_ROUND_SETTINGS,
} from "./constants.js";

const uid = () => Math.random().toString(36).slice(2, 10);

export function makeRow(cols) {
  const cells = {};
  cols.forEach((c) => (cells[c] = { text: "", mark: "normal" }));
  return { cells };
}

function emptyPartner(id, name) {
  return {
    id,
    name,
    activeSheetId: null,
    sheets: [],
    affCount: 0,
    negCount: 0,
  };
}

function defaultMeta() {
  return {
    name: "",
    tournament: "",
    roundNum: "",
    judges: "",
    affSchool: "",
    affCode: "",
    negSchool: "",
    negCode: "",
    opponent: "",
    date: "",
    side: "",
  };
}

export function createEmptyRound({ folderId = null, withDefaultSheets = false } = {}) {
  const round = {
    schemaVersion: SCHEMA_VERSION,
    id: uid(),
    meta: defaultMeta(),
    folderId,
    lastEdited: Date.now(),
    partners: [emptyPartner("partner-1", "Partner 1"), emptyPartner("partner-2", "Partner 2")],
    uploadedFiles: [],
    settings: { ...DEFAULT_ROUND_SETTINGS },
    activePartnerId: "partner-1",
  };
  if (withDefaultSheets) {
    const p = round.partners[0];
    const aff = newSheet(round, "aff", { name: "Case", needsName: false });
    p.affCount = 1;
    const off = newSheet(round, "neg", { name: "Off 1", needsName: false });
    p.negCount = 1;
    p.activeSheetId = aff.id;
    p.sheets = [aff, off];
  }
  return round;
}

/** Display title matching reference New Sheet logic. */
export function formatRoundTitle(round) {
  const m = round.meta || {};
  const t = m.tournament?.trim();
  const n = m.roundNum?.trim();
  const aff = [m.affSchool, m.affCode].map((x) => x?.trim()).filter(Boolean).join(" ");
  const neg = [m.negSchool, m.negCode].map((x) => x?.trim()).filter(Boolean).join(" ");
  const opp = m.opponent?.trim();
  if (!t && !n && !aff && !neg && !opp) return m.name?.trim() || "New Round";
  const parts = [t, n ? (/^round\b/i.test(n) || !/^\d+$/.test(n) ? n : `Round ${n}`) : ""].filter(Boolean);
  if (aff || neg) parts.push(`${aff || "?"} vs ${neg || "?"}`);
  else if (opp) parts.push(`vs ${opp}`);
  return parts.join(" · ");
}

export function relativeTime(ts) {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

/** Migrate v0 localStorage or older RoundDocument shapes to schema v1. */
export function migrateRoundDocument(doc) {
  if (!doc || typeof doc !== "object") return createEmptyRound();
  if (doc.schemaVersion === SCHEMA_VERSION && doc.partners) {
    return normalizeRound(doc);
  }

  if (doc.sheets && !doc.partners) {
    const sheets = (doc.sheets || []).map((s) => ({
      id: s.id || uid(),
      name: s.name || "Flow",
      type: s.type || "aff",
      cols: s.cols || (s.type === "neg" ? [...NEG_COLS] : [...AFF_COLS]),
      rows: (s.rows || []).map((row) => ({
        cells: Object.fromEntries(
          Object.entries(row.cells || {}).map(([col, cell]) => [
            col,
            typeof cell === "object"
              ? { text: cell.text || "", mark: cell.mark || "normal" }
              : { text: String(cell), mark: "normal" },
          ])
        ),
      })),
      extensionLinks: s.extensionLinks || [],
    }));
    return normalizeRound({
      schemaVersion: SCHEMA_VERSION,
      id: doc.id || uid(),
      meta: doc.meta || {},
      partners: [
        {
          id: "partner-1",
          name: doc.settings?.partner1Name || "Partner 1",
          activeSheetId: doc.activeId || sheets[0]?.id || null,
          sheets,
          affCount: doc.affCount || 0,
          negCount: doc.negCount || 0,
        },
        emptyPartner("partner-2", doc.settings?.partner2Name || "Partner 2"),
      ],
      uploadedFiles: doc.uploadedFiles || [],
      settings: { ...DEFAULT_ROUND_SETTINGS, ...(doc.settings || {}) },
      activePartnerId: "partner-1",
    });
  }

  return normalizeRound({
    ...createEmptyRound(),
    ...doc,
    schemaVersion: SCHEMA_VERSION,
  });
}

function normalizeRound(doc) {
  const round = { ...doc };
  round.schemaVersion = SCHEMA_VERSION;
  round.meta = { ...defaultMeta(), ...(round.meta || {}) };
  round.settings = { ...DEFAULT_ROUND_SETTINGS, ...(round.settings || {}) };
  round.uploadedFiles = round.uploadedFiles || [];
  round.folderId = round.folderId ?? null;
  round.lastEdited = round.lastEdited || Date.now();
  round.partners = (round.partners || []).map((p) => ({
    ...emptyPartner(p.id, p.name),
    ...p,
    sheets: (p.sheets || []).map((s) => ({
      ...s,
      extensionLinks: s.extensionLinks || [],
      rows: s.rows?.length ? s.rows : [makeRow(s.cols || AFF_COLS)],
    })),
    affCount: p.affCount || 0,
    negCount: p.negCount || 0,
  }));
  if (round.partners.length < 2) {
    while (round.partners.length < 2) {
      round.partners.push(emptyPartner(`partner-${round.partners.length + 1}`, `Partner ${round.partners.length + 1}`));
    }
  }
  if (!round.activePartnerId) round.activePartnerId = round.partners[0].id;
  if (!round.id) round.id = uid();
  return round;
}

export function getActivePartner(round) {
  return round.partners.find((p) => p.id === round.activePartnerId) || round.partners[0];
}

export function getActiveSheet(round) {
  const partner = getActivePartner(round);
  if (!partner) return null;
  return partner.sheets.find((s) => s.id === partner.activeSheetId) || partner.sheets[0] || null;
}

export function newSheet(round, type, opts = {}) {
  const partner = getActivePartner(round);
  const cols = type === "aff" ? [...AFF_COLS] : [...NEG_COLS];
  let name;
  if (opts.name) {
    name = opts.name;
  } else if (type === "aff") {
    partner.affCount++;
    name = `Aff ${partner.affCount}`;
  } else {
    partner.negCount++;
    name = `Off ${partner.negCount}`;
  }
  const sheet = {
    id: uid(),
    name,
    type,
    cols,
    rows: [makeRow(cols), makeRow(cols), makeRow(cols)],
    extensionLinks: [],
    needsName: opts.needsName !== false,
  };
  partner.sheets.push(sheet);
  partner.activeSheetId = sheet.id;
  return sheet;
}

export function deleteSheet(round, sheetId) {
  const partner = getActivePartner(round);
  partner.sheets = partner.sheets.filter((s) => s.id !== sheetId);
  if (partner.activeSheetId === sheetId) {
    partner.activeSheetId = partner.sheets[0]?.id || null;
  }
}

export function extendArgument(sheet, col) {
  sheet.rows.push(makeRow(sheet.cols));
  sheet.extensionLinks.push({ col, rowIdx: sheet.rows.length - 1 });
}

export function getCellData(round, sheetId, rowIdx, col) {
  for (const p of round.partners) {
    const sheet = p.sheets.find((s) => s.id === sheetId);
    if (sheet?.rows[rowIdx]?.cells[col]) return sheet.rows[rowIdx].cells[col];
  }
  return null;
}

export function serializeFlows(round) {
  const parts = [];
  for (const partner of round.partners) {
    for (const sheet of partner.sheets) {
      const typeLabel = sheet.type === "aff" ? "Aff Flow" : "Off Flow";
      const header = `[${partner.name} — ${typeLabel} — "${sheet.name}"]`;
      const lines = [];
      sheet.rows.forEach((row, ri) => {
        const rowParts = [];
        sheet.cols.forEach((col) => {
          const c = row.cells[col];
          if (c?.text?.trim()) {
            let tag = "";
            if (c.mark === "dropped") tag = " (DROPPED)";
            else if (c.mark === "conceded") tag = " (CONCEDED)";
            rowParts.push(`${col}: ${c.text.trim()}${tag}`);
          }
        });
        if (rowParts.length) lines.push(`  Row ${ri + 1} | ` + rowParts.join("  |  "));
      });
      parts.push(header + (lines.length ? "\n" + lines.join("\n") : "\n  (empty)"));
    }
  }
  return parts.length ? parts.join("\n\n") : "(No flow sheets yet.)";
}

export function serializeSide(settings) {
  const side = settings.side === "neg" ? "NEG" : "AFF";
  const ours = side === "AFF" ? "1AC, 2AC, 1AR, 2AR" : "1NC, Block (2NC/1NR), 2NR";
  const theirs = side === "AFF" ? "1NC, Block (2NC/1NR), 2NR" : "1AC, 2AC, 1AR, 2AR";
  return (
    "=== SIDE ===\n" +
    `The debater is on the ${side} side this round. OUR speeches are: ${ours}. ` +
    `The OPPONENT's speeches are: ${theirs}.\n\n`
  );
}

export function serializeFiles(uploadedFiles) {
  if (!uploadedFiles?.length) return "";
  const fmt = (arr) => arr.map((f) => `\n--- FILE: ${f.name} ---\n${f.content}`).join("\n");
  const ours = uploadedFiles.filter((f) => (f.owner || "ours") === "ours");
  const opp = uploadedFiles.filter((f) => f.owner === "opponent");
  return (
    "\n\n=== UPLOADED EVIDENCE CARDS ===\n" +
    "\n\n>>> OUR CARDS <<<" +
    (ours.length ? fmt(ours) : "\n(none uploaded)") +
    "\n\n>>> OPPONENT CARDS <<<" +
    (opp.length ? fmt(opp) : "\n(none uploaded)")
  );
}

export function buildCoachPayload(round, userMessage) {
  return {
    round,
    message: userMessage,
    context: {
      side: serializeSide(round.settings),
      flows: serializeFlows(round),
      files: serializeFiles(round.uploadedFiles),
    },
  };
}

export function autoLabelSheet(sheet) {
  const firstRow = sheet.rows[0];
  if (!firstRow) return;
  for (const col of sheet.cols) {
    const text = firstRow.cells[col]?.text?.trim();
    if (text) {
      sheet.name = text.slice(0, 40);
      break;
    }
  }
}

export function updatePartnerNames(round) {
  if (round.partners[0]) round.partners[0].name = round.settings.partner1Name || "Partner 1";
  if (round.partners[1]) round.partners[1].name = round.settings.partner2Name || "Partner 2";
}

export function sheetTypeLabel(type) {
  return type === "aff" ? "AFF" : "OFF";
}
