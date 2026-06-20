/**
 * WebRTC peer session for partner sharing.
 *
 * Two browsers pair by copy-pasting codes: the initiator produces an offer code,
 * the joiner answers with a second code, and once ICE settles a data channel
 * carries sync messages. ICE is gathered fully before a code is produced (no
 * trickle) so each code is self-contained and copyable in one shot.
 */
import { encodeShareCode, decodeShareCode, PROTOCOL_VERSION } from "./share-protocol.js";

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];
const ICE_TIMEOUT_MS = 5000;
const CHANNEL_LABEL = "mxflow-sync";

const uuid = () =>
  crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

/**
 * @typedef {"idle"|"code1_ready"|"waiting_answer"|"joining"|"code2_ready"|"connecting"|"connected"|"disconnected"} ShareState
 */
export class ShareSession {
  constructor(handlers = {}) {
    this.handlers = handlers; // { onState, onMessage, onConnected, onDisconnected }
    this.pc = null;
    this.channel = null;
    this.role = null; // "initiator" | "joiner"
    this.state = "idle";
    this.sessionId = null;
    this.clientId = uuid();
    this.remoteClientId = null;
  }

  get connected() {
    return this.channel?.readyState === "open";
  }

  isConnected() {
    return this.connected;
  }

  _setState(state) {
    this.state = state;
    this.handlers.onState?.(state);
  }

  _newPeer() {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.onconnectionstatechange = () => {
      const cs = pc.connectionState;
      if ((cs === "failed" || cs === "disconnected" || cs === "closed") && this.state === "connected") {
        this._setState("disconnected");
        this.handlers.onDisconnected?.(cs);
      }
    };
    return pc;
  }

  _wireChannel(channel) {
    this.channel = channel;
    channel.onopen = () => {
      this._setState("connected");
      this.handlers.onConnected?.();
    };
    channel.onclose = () => {
      if (this.state === "connected") {
        this._setState("disconnected");
        this.handlers.onDisconnected?.("closed");
      }
    };
    channel.onmessage = (e) => {
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      this.handlers.onMessage?.(msg);
    };
  }

  _waitForIce(pc) {
    if (pc.iceGatheringState === "complete") return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => {
        pc.removeEventListener("icegatheringstatechange", check);
        clearTimeout(timer);
        resolve();
      };
      const check = () => {
        if (pc.iceGatheringState === "complete") done();
      };
      pc.addEventListener("icegatheringstatechange", check);
      const timer = setTimeout(done, ICE_TIMEOUT_MS);
    });
  }

  /** Initiator: build the first code carrying the offer and round snapshot. */
  async createOffer(roundSnapshot) {
    this.role = "initiator";
    this.sessionId = uuid();
    this.pc = this._newPeer();
    this._wireChannel(this.pc.createDataChannel(CHANNEL_LABEL, { ordered: true }));
    await this.pc.setLocalDescription(await this.pc.createOffer());
    await this._waitForIce(this.pc);
    this._setState("code1_ready");
    return encodeShareCode({
      v: PROTOCOL_VERSION,
      kind: "offer",
      sessionId: this.sessionId,
      clientId: this.clientId,
      sdp: this.pc.localDescription,
      round: roundSnapshot,
    });
  }

  /** Initiator: apply the partner's answer code to finish connecting. */
  async acceptAnswer(code) {
    if (this.role !== "initiator" || !this.pc) {
      throw new Error("Start a session before pasting a response code.");
    }
    const payload = await decodeShareCode(code);
    if (payload.kind !== "answer") {
      throw new Error("That looks like a starting code, not your partner's response.");
    }
    if (payload.sessionId && this.sessionId && payload.sessionId !== this.sessionId) {
      throw new Error("This response code is from a different share session.");
    }
    this.remoteClientId = payload.clientId;
    await this.pc.setRemoteDescription(payload.sdp);
    this._setState("connecting");
  }

  /**
   * Joiner: apply the partner's offer code, returning the shared round snapshot
   * and the answer code to send back.
   */
  async acceptOffer(code) {
    this.role = "joiner";
    const payload = await decodeShareCode(code);
    if (payload.kind !== "offer") {
      throw new Error("That looks like a response code — paste the starting code from your partner.");
    }
    this.sessionId = payload.sessionId;
    this.remoteClientId = payload.clientId;
    this.pc = this._newPeer();
    this.pc.ondatachannel = (e) => this._wireChannel(e.channel);
    await this.pc.setRemoteDescription(payload.sdp);
    await this.pc.setLocalDescription(await this.pc.createAnswer());
    await this._waitForIce(this.pc);
    this._setState("code2_ready");
    const code2 = await encodeShareCode({
      v: PROTOCOL_VERSION,
      kind: "answer",
      sessionId: this.sessionId,
      clientId: this.clientId,
      sdp: this.pc.localDescription,
    });
    return { round: payload.round, code2 };
  }

  send(msg) {
    if (!this.connected) return false;
    this.channel.send(JSON.stringify(msg));
    return true;
  }

  close() {
    try {
      this.channel?.close();
    } catch {
      /* ignore */
    }
    try {
      this.pc?.close();
    } catch {
      /* ignore */
    }
    this.channel = null;
    this.pc = null;
    this.role = null;
    this.sessionId = null;
    this.remoteClientId = null;
    this._setState("idle");
  }
}
