/**
 * Share code wire format for P2P partner sharing.
 *
 * A code looks like `MXSH1.<base64url(gzip(JSON))>`. The JSON payload carries a
 * WebRTC offer/answer (the connection handshake) plus, for the first code, an
 * initial snapshot of the round so the joiner can start from the right state.
 */

export const PROTOCOL_VERSION = 1;
const PREFIX = "MXSH1.";

// Codes longer than this are awkward to paste into a message; warn the user.
export const SHARE_CODE_WARN_LEN = 80000;

async function gzip(str) {
  const stream = new Blob([str]).stream().pipeThrough(new CompressionStream("gzip"));
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

async function gunzip(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

function bytesToBase64url(bytes) {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToBytes(str) {
  let s = str.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function encodeShareCode(payload) {
  const bytes = await gzip(JSON.stringify(payload));
  return PREFIX + bytesToBase64url(bytes);
}

export async function decodeShareCode(code) {
  const trimmed = (code || "").trim();
  if (!trimmed.startsWith(PREFIX)) {
    throw new Error("That does not look like an MX Flow share code.");
  }
  let payload;
  try {
    const json = await gunzip(base64urlToBytes(trimmed.slice(PREFIX.length)));
    payload = JSON.parse(json);
  } catch {
    throw new Error("Share code is incomplete or corrupted — copy the whole code and try again.");
  }
  if (payload.v !== PROTOCOL_VERSION) {
    throw new Error("This share code was made with a different version of MX Flow.");
  }
  return payload;
}
