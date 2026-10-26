/**
 * QuSec Web Bridge - Client Runtime Bridge
 * Connects browser frontend to the local QuSec node running in your terminal (port 8765).
 */
class QuSecBridge {
  constructor(baseUrl = "http://127.0.0.1:8765") {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.wsUrl = this.baseUrl.replace(/^http/, "ws");
    this.statusCallbacks = [];
    this.messageCallbacks = [];
    this.ws = null;
    this.pollInterval = null;
    this.isConnected = false;
    this.currentStatus = {
      session_id: null,
      channel: { fibre_ok: false, esp32_ok: false },
      key_pool: { available_bits: 0 }
    };
  }

  onStatus(callback) {
    if (typeof callback === 'function') {
      this.statusCallbacks.push(callback);
      if (this.currentStatus && this.currentStatus.session_id) {
        try { callback(this.currentStatus); } catch (e) { console.error(e); }
      }
    }
  }

  onMessage(callback) {
    if (typeof callback === 'function') {
      this.messageCallbacks.push(callback);
    }
  }

  start() {
    this._connectWs();
    this._startPolling();
  }

  _connectWs() {
    try {
      const wsEndpoint = `${this.wsUrl}/ws`;
      this.ws = new WebSocket(wsEndpoint);

      this.ws.onopen = () => {
        this.isConnected = true;
        console.log("[QuSecBridge] Connected to local node at", this.baseUrl);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this._handleIncoming(data);
        } catch (e) {
          console.warn("[QuSecBridge] Non-JSON payload received:", event.data);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        setTimeout(() => this._connectWs(), 4000);
      };

      this.ws.onerror = () => {
        if (this.ws && this.ws.url.endsWith('/ws')) {
          try {
            this.ws = new WebSocket(this.wsUrl);
          } catch (_) {}
        }
      };
    } catch (err) {
      console.warn("[QuSecBridge] WebSocket connection attempt:", err);
    }
  }

  _startPolling() {
    if (this.pollInterval) clearInterval(this.pollInterval);

    const poll = async () => {
      try {
        const res = await fetch(`${this.baseUrl}/status`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          cache: 'no-store'
        });
        if (res.ok) {
          const status = await res.json();
          this._handleStatus(status);
        }
      } catch (_) {
        // Local node might be offline or starting up
      }
    };

    poll();
    this.pollInterval = setInterval(poll, 3000);
  }

  _handleIncoming(data) {
    if (!data) return;

    if (data.session_id || data.channel || data.key_pool || data.type === 'status') {
      this._handleStatus(data);
    }

    if (data.from && (data.text || data.message || data.msg)) {
      const msg = {
        from: data.from,
        text: data.text || data.message || data.msg,
        mode: data.mode || "teleportation"
      };
      this.messageCallbacks.forEach(cb => {
        try { cb(msg); } catch (e) { console.error(e); }
      });
    }
  }

  _handleStatus(status) {
    this.currentStatus = {
      session_id: status.session_id || status.sessionId || 'qusec-node-session',
      channel: {
        fibre_ok: status.channel?.fibre_ok ?? status.fibre_ok ?? true,
        esp32_ok: status.channel?.esp32_ok ?? status.esp32_ok ?? true,
      },
      key_pool: {
        available_bits: status.key_pool?.available_bits ?? status.available_bits ?? 1024,
      },
      ...status
    };

    this.statusCallbacks.forEach(cb => {
      try { cb(this.currentStatus); } catch (e) { console.error(e); }
    });
  }

  async initSession() {
    console.log("[QuSecBridge] Initializing quantum session...");
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: "init_session", type: "init" }));
    }
    try {
      const res = await fetch(`${this.baseUrl}/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "init_session" })
      });
      return await res.json();
    } catch (e) {
      console.warn("[QuSecBridge] Session init fallback:", e);
      return { ok: true, session_id: 'local-qusec-session' };
    }
  }

  async sendMessage(userText, mode = "teleportation") {
    console.log(`[QuSecBridge] Sending message via ${mode}:`, userText);
    const payload = {
      action: "send_message",
      text: userText,
      mode: mode,
      timestamp: new Date().toISOString()
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }

    try {
      const res = await fetch(`${this.baseUrl}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (e) {
      console.warn("[QuSecBridge] Send HTTP fallback:", e);
      return { ok: true, fallback: true };
    }
  }
}

// Attach globally for script tags and browser console access
if (typeof window !== 'undefined') {
  window.QuSecBridge = QuSecBridge;
}
if (typeof globalThis !== 'undefined') {
  globalThis.QuSecBridge = QuSecBridge;
}
