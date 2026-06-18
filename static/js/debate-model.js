import {
  SCHEMA_VERSION,
  AFF_COLS,
  NEG_COLS,
  DEFAULT_SETTINGS,
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

export function createEmptyRound() {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: uid(),
    meta: { tournament: "", opponent: "", date: "", side: "" },
    partners: [emptyPartner("partner-1", "Partner 1"), emptyPartner("partner-2", "Partner 2")],
    uploadedFiles: [],
    settings: { ...DEFAULT_SETTINGS },
    activePartnerId: "partner-1",
  };
}

/** Migrate v0 localStorage or older RoundDocument shapes to schema v1. */
export function migrateRoundDocument(doc) {
  if (!doc || typeof doc !== "object") return createEmptyRound();
  if (doc.schemaVersion === SCHEMA_VERSION && doc.partners) {
    return normalizeRound(doc);
  }

  // v0 prototype: { sheets, affCount, negCount } + separate settings
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
      settings: { ...DEFAULT_SETTINGS, ...(doc.settings || {}) },
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
  round.settings = { ...DEFAULT_SETTINGS, ...(round.settings || {}) };
  round.uploadedFiles = round.uploadedFiles || [];
  round.partners = (round.partners || []).map((p) => ({
    ...emptyPartner(p.id, p.name),
    ...p,
    sheets: p.sheets || [],
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

export function newSheet(round, type) {
  const partner = getActivePartner(round);
  const cols = type === "aff" ? [...AFF_COLS] : [...NEG_COLS];
  let name;
  if (type === "aff") {
    partner.affCount++;
    name = `Aff ${partner.affCount}`;
  } else {
    partner.negCount++;
    name = `Neg ${partner.negCount}`;
  }
  const sheet = {
    id: uid(),
    name,
    type,
    cols,
    rows: [makeRow(cols), makeRow(cols), makeRow(cols)],
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
      const typeLabel = sheet.type === "aff" ? "Aff Flow" : "Neg Flow";
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
