/**
 * QuSec Web Bridge SDK for Shnik Social Media Platform
 * ----------------------------------------------------
 * Connects the browser frontend to the local QuSec Quantum Security Node running in your terminal.
 *
 * Default Gateway Ports:
 *   - Sender Node (Alice):   http://127.0.0.1:8765
 *   - Receiver Node (Bob):   http://127.0.0.1:8766 (on localhost loopback) or 8765 on separate laptop
 */

class QuSecBridge {
  constructor(gatewayUrl = "http://127.0.0.1:8765") {
    this.gatewayUrl = gatewayUrl.replace(/\/$/, "");
    this.statusListeners = [];
    this.messageListeners = [];
    this.eventListeners = [];
    this.eventSource = null;
    this.pollInterval = null;
    this.isConnected = false;
    this.nodeRole = null;
    this.peerRole = null;
    this.currentStatus = {
      status: "OFFLINE",
      session_id: null,
      role: "Node",
      peer_role: "Peer",
      channel: { fibre_ok: false, esp32_ok: false, qber: 0.0 },
      key_pool: { available_bits: 0 }
    };
  }

  /** Set new gateway URL (e.g. switch between 8765 and 8766) and reconnect */
  setGatewayUrl(newUrl) {
    if (!newUrl) return;
    this.gatewayUrl = newUrl.replace(/\/$/, "");
    this.stop();
    this.start();
  }

  /** Register listener for node status changes (fibre, ESP32, key pool, QBER) */
  onStatus(callback) {
    if (typeof callback === 'function') {
      this.statusListeners.push(callback);
      if (this.currentStatus && this.currentStatus.status !== "OFFLINE") {
        try { callback(this.currentStatus); } catch (e) { console.error(e); }
      }
    }
  }

  /** Register listener for incoming quantum decrypted messages & threat alerts */
  onMessage(callback) {
    if (typeof callback === 'function') {
      this.messageListeners.push(callback);
    }
  }

  /** Register listener for all low-level quantum pipeline events */
  onEvent(callback) {
    if (typeof callback === 'function') {
      this.eventListeners.push(callback);
    }
  }

  /** Start listening to QuSec node via SSE stream and status polling */
  async start() {
    await this.fetchStatus();
    this.startEventStream();
    if (!this.pollInterval) {
      this.pollInterval = setInterval(() => this.fetchStatus(), 3000);
    }
  }

  /** Stop listeners & close SSE connection */
  stop() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isConnected = false;
  }

  /** Fetch live status from local QuSec node */
  async fetchStatus() {
    try {
      const res = await fetch(`${this.gatewayUrl}/api/status`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });

      if (res.ok) {
        const data = await res.json();
        this.isConnected = true;
        this.nodeRole = data.role || "Node";
        this.peerRole = data.peer_role || (this.nodeRole === "Sender" ? "Receiver" : "Sender");
        this.currentStatus = {
          ...data,
          channel: {
            fibre_ok: data.channel?.fibre_ok ?? false,
            esp32_ok: data.channel?.esp32_ok ?? false,
            qber: data.channel?.qber ?? 0.0,
          },
          key_pool: {
            available_bits: data.key_pool?.available_bits ?? 0,
          }
        };

        this.statusListeners.forEach((cb) => {
          try { cb(this.currentStatus); } catch (e) { console.error(e); }
        });
        return this.currentStatus;
      }
    } catch (_) {
      this.isConnected = false;
      const offlineStatus = {
        status: "OFFLINE",
        session_id: null,
        role: this.nodeRole || "Offline",
        channel: { fibre_ok: false, esp32_ok: false, qber: 0.0 },
        key_pool: { available_bits: 0 },
        error: "Cannot connect to local QuSec node at " + this.gatewayUrl
      };
      this.currentStatus = offlineStatus;
      this.statusListeners.forEach((cb) => {
        try { cb(offlineStatus); } catch (e) { console.error(e); }
      });
    }
    return null;
  }

  /** Subscribe to Server-Sent Events (SSE) stream for real-time messages & alerts */
  startEventStream() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (typeof EventSource === 'undefined') return;

    try {
      this.eventSource = new EventSource(`${this.gatewayUrl}/api/events`);

      this.eventSource.onopen = () => {
        this.isConnected = true;
        console.log("[QuSecBridge] SSE stream connected to", this.gatewayUrl);
      };

      this.eventSource.onmessage = (e) => {
        try {
          if (!e.data || e.data.startsWith(":")) return; // ignore keepalive comments
          const packet = JSON.parse(e.data);

          this.eventListeners.forEach((cb) => {
            try { cb(packet); } catch (err) { console.error(err); }
          });

          if (packet.event === "message_received" && packet.data) {
            console.log("[QuSecBridge] Quantum message received:", packet.data);
            this.messageListeners.forEach((cb) => {
              try { cb(packet.data); } catch (err) { console.error(err); }
            });
          } else if (packet.event === "threat_alarm" || packet.event === "threat_detected") {
            console.warn("[QuSecBridge] Threat Alarm event:", packet.data);
            this.fetchStatus();
          } else if (packet.event === "session_established") {
            this.fetchStatus();
          }
        } catch (_) {
          // Heartbeat or raw non-JSON
        }
      };

      this.eventSource.onerror = () => {
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        // Retry connection after brief backoff
        setTimeout(() => {
          this.startEventStream();
        }, 4000);
      };
    } catch (err) {
      console.warn("[QuSecBridge] EventSource initialization failed:", err);
    }
  }

  /**
   * Send a chat message over the quantum link.
   * @param {string} text - Message plaintext to transmit
   * @param {string} mode - 'teleportation' (state teleportation) or 'otp' (One-Time-Pad)
   * @param {string} recipient - Optional explicit target peer ('receiver' or 'sender')
   */
  async sendMessage(text, mode = "teleportation", recipient = null) {
    const payload = {
      to: recipient || this.peerRole || (this.nodeRole === "Sender" ? "Receiver" : "Sender"),
      message: text,
      mode: mode,
    };

    console.log(`[QuSecBridge] Dispatching ${mode} message to ${payload.to} via ${this.gatewayUrl}/api/send`);
    const res = await fetch(`${this.gatewayUrl}/api/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to send message: ${res.statusText}`);
    }

    return await res.json();
  }

  /** Trigger quantum session initialization and key pool generation */
  async initSession() {
    const res = await fetch(`${this.gatewayUrl}/api/session/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to init session: ${res.statusText}`);
    }
    return await res.json();
  }

  /** Fetch past message history from node cache */
  async getMessages() {
    try {
      const res = await fetch(`${this.gatewayUrl}/api/messages`);
      if (res.ok) {
        const data = await res.json();
        return data.messages || [];
      }
    } catch (_) {}
    return [];
  }
}

// Export for ES modules and browser window
if (typeof module !== "undefined" && module.exports) {
  module.exports = { QuSecBridge };
}
if (typeof window !== "undefined") {
  window.QuSecBridge = QuSecBridge;
}
if (typeof globalThis !== "undefined") {
  globalThis.QuSecBridge = QuSecBridge;
}
