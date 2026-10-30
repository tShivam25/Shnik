# 🔐 QuSec & Shnik: Quantum Security Integration & Bug Fixes Guide

This document details the issues identified with direct messaging in **Shnik**, the code changes made to resolve them, and complete instructions for demonstrating the **Sender (Alice)**, **Receiver (Bob)**, and **Attacker (Eve)** using physical ESP32 microcontrollers and the web interface.

---

## 📋 Table of Contents
1. [Root Cause Analysis (Why Messages Were Broken)](#1-root-cause-analysis)
2. [Summary of Code Changes](#2-summary-of-code-changes)
3. [System Architecture & Hardware Topology](#3-system-architecture--hardware-topology)
4. [Step-by-Step Execution & Demonstration Guide](#4-step-by-step-execution--demonstration-guide)
   - [A. Firmware Flashing](#a-firmware-flashing)
   - [B. Running on a Single Laptop (Loopback Mode)](#b-running-on-a-single-laptop-loopback-mode)
   - [C. Running Across Multiple Physical Laptops](#c-running-across-multiple-physical-laptops)
   - [D. Demonstrating Cyber Attacks (Eve)](#d-demonstrating-cyber-attacks-eve)
5. [Future Roadmap & Recommended Improvements](#5-future-roadmap--recommended-improvements)

---

## 1. Root Cause Analysis

Before these changes, messages sent via the web interface failed to transmit or appear on the recipient's screen due to four distinct issues:

### 1.1 Web Bridge Protocol Mismatch (`public/qusec-web-bridge.js`)
* **Problem**: The web bridge in Shnik was attempting to connect to a WebSocket at `ws://127.0.0.1:8765/ws` and polling non-existent endpoints (`GET /status`, `POST /send`, `POST /init`).
* **Reality**: The Python QuSec Gateway (`QuSec/src/qusec/gateway/server.py`) is an HTTP REST + Server-Sent Events (SSE) server. It exposes `/api/status`, `/api/send`, `/api/session/init`, and an SSE stream on `/api/events`.
* **Impact**: Message sending failed with HTTP `404 Not Found` or fell back silently, and incoming quantum messages were never received by the browser because there was no active SSE listener.

### 1.2 Single-Port Limitation on Localhost
* **Problem**: `QuSecBridgeProvider.tsx` had `http://127.0.0.1:8765` hardcoded.
* **Reality**: In local loopback mode, QuSec binds the **Sender (Alice) to Port 8765** and the **Receiver (Bob) to Port 8766**.
* **Impact**: When Bob opened Shnik, his browser connected to Alice’s gateway (8765) rather than his own (8766), meaning Bob could never receive incoming message events routed to his node.

### 1.3 Database RLS Policy Block (Supabase Mode)
* **Problem**: Messages were inserted into PostgreSQL with `status = 'in_transit'`.
* **Reality**: The Supabase Row-Level Security (RLS) policy in `001_initial_schema.sql` explicitly states:
  ```sql
  create policy "Recipient can view messages once delivered"
    on public.messages for select
    using (auth.uid() = recipient_id and status = 'delivered');
  ```
* **Impact**: Because no automated service called `/api/messages/deliver`, messages remained `in_transit` permanently and were hidden from the recipient.

### 1.4 Empty Mock Store & Follow Barrier (Local Mode)
* **Problem**: `mockData.ts` initialized with `INITIAL_MOCK_USERS = []`, and `mockStore.ts` relied entirely on isolated `localStorage`.
* **Impact**: Two different browser windows or incognito sessions could not find each other. Furthermore, `page.tsx` blocked dispatching messages if `isFollowing` was false.

---

## 2. Summary of Code Changes

### 2.1 `public/qusec-web-bridge.js`
* Rewritten to adhere to the official QuSec API:
  - `GET /api/status`: Polls hardware link status (Fibre, ESP32, QBER, Key Pool).
  - `POST /api/send`: Transmits payloads formatted as `{ to, message, mode: "teleportation" }`.
  - `POST /api/session/init`: Triggers entanglement and key pool replenishment.
  - `EventSource(/api/events)`: Subscribes to live SSE events (`message_received`, `threat_alarm`, `session_established`).
* Added `setGatewayUrl(url)` for dynamic port switching between 8765 and 8766.

### 2.2 `components/QuSecBridgeProvider.tsx`
* Added dynamic port management (`gatewayPort`, `setGatewayPort`).
* Automatically inspects URL query parameters (`?port=8766` or `?qusec_port=8766`) and `localStorage`.
* Exposes clean handlers for sending messages and processing incoming threat alerts.

### 2.3 `app/(app)/messages/[userId]/page.tsx`
* **Role-Aware Routing**: `handleSendMessage` detects whether the peer is Alice or Bob and passes the appropriate recipient role (`sender` or `receiver`) to the QuSec engine.
* **Live Threat Visualizer**: When QuSec flags an attack (`threat: true`), Shnik:
  1. Displays a high-visibility, critical `AlertBanner` showing the calculated QBER and detection reason.
  2. Renders the chat bubble as `[BLOCKED: REJECTED (...)]` with a failed state.
* **Interactive Header Pill**: Added a one-click toggle button (`Port 8765 ⇄ 8766`) to switch gateway connections directly from the UI header.

### 2.4 `lib/mockData.ts` & `lib/mockStore.ts`
* Pre-seeded three persistent demo accounts:
  - **Alice (Sender)** (`user-alice` / `alice`)
  - **Bob (Receiver)** (`user-bob` / `bob`)
  - **Eve (Attacker)** (`user-eve` / `eve`)
* Pre-seeded mutual follow records between Alice and Bob.
* Added `BroadcastChannel('shnik_sync')` and `window.addEventListener('storage', ...)` so two browser tabs update and exchange messages in real-time without requiring a backend server.
* Added URL parameter override (`?as=alice` and `?as=bob`) to allow running multiple identities simultaneously in the same browser profile.

### 2.5 `app/api/messages/send/route.ts` & `.env.local`
* Updated the Supabase insert routine so that if no external delivery webhook is configured, messages are automatically flagged as `'delivered'`, satisfying RLS visibility rules.
* Created a default `.env.local` pre-configured with `NEXT_PUBLIC_MOCK=true`.

---

## 3. System Architecture & Hardware Topology

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   PHYSICAL TOPOLOGY                                    │
│                                                                                        │
│   SENDER (Alice)                      ATTACKER (Eve)                    RECEIVER (Bob) │
│ ┌────────────────┐                  ┌────────────────┐                ┌────────────────┐
│ │ Shnik Website  │                  │attacker_eve.py │                │ Shnik Website  │
│ │ (Port 8765)    │                  │(Adversary CLI) │                │ (Port 8766)    │
│ └───────┬────────┘                  └───────┬────────┘                └───────┬────────┘
│         │ HTTP/SSE                          │ USB Serial                      │ HTTP/SSE
│ ┌───────▼────────┐                          │ 115200                  ┌───────▼────────┐
│ │ QuSec Node     │                          │                         │ QuSec Node     │
│ │ (Sender)       │                          │                         │ (Receiver)     │
│ └───────┬────────┘                          │                         └───────┬────────┘
│         │ USB Serial                        │                                 │ USB Serial
│ ┌───────▼────────┐                  ┌───────▼────────┐                ┌───────▼────────┐
│ │ ESP32 #1       │◄───Wi-Fi UDP────►│ ESP32 #3 (Eve) │◄──Wi-Fi UDP───►│ ESP32 #2       │
│ │ (SoftAP Host)  │     Port 9877    │ (TRNG Noise)   │    Port 9877   │ (Threat Alarm) │
│ │ GPIO 2: Status │                  │ GPIO 4: Attack │                │ GPIO 4: LED    │
│ └───────┬────────┘                  └────────────────┘                └───────┬────────┘
│         │ Ethernet                                                            │ Ethernet
│ ┌───────▼────────┐                                                    ┌───────▼────────┐
│ │ Media Conv. #1 │◄══════════ Optical Fibre (Quantum UDP 9876) ══════►│ Media Conv. #2 │
│ └────────────────┘                                                    └────────────────┘
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Hardware Roles
1. **ESP32 #1 (Sender / Alice)**:
   - Hosts the SoftAP Wi-Fi network `QuSec_ESP32_QuantumNet` (`192.168.4.1`).
   - Generates hardware quantum randomness via `esp_random()`.
   - Onboard LED (GPIO 2) indicates power and classical wireless relay activity.
2. **ESP32 #2 (Receiver / Bob)**:
   - Connects as a Station client to the SoftAP network (`192.168.4.2`).
   - Controls the **Physical Threat Alarm LED (GPIO 4)**. Strobes rapidly whenever a threat is detected ($QBER > 6\%$ or MAC forgery).
3. **ESP32 #3 (Attacker / Eve)**:
   - Queries true hardware randomness (`RNG` command) to inject unbiased noise and quantum state collapse into transit frames.
   - Flashes GPIO 4 during active attack transmission bursts.

---

## 4. Step-by-Step Execution & Demonstration Guide

### A. Firmware Flashing
Open `QuSec/firmware/esp32_qusec/esp32_qusec.ino` in the Arduino IDE and flash it to all 3 ESP32 microcontrollers. Connect the boards to your computer via USB.

---

### B. Running on a Single Laptop (Loopback Mode)

#### 1. Start Bob (Receiver Node)
Open a PowerShell terminal:
```powershell
cd d:\College\Programming\QuSec-Quantum-Cyber-Threat-Detection-main\QuSec
qusec chat --role receiver
```
* Bob listens on Classical Port `9879`, Optical Port `9878`, and Gateway `http://127.0.0.1:8766`.

#### 2. Start Alice (Sender Node)
Open a second PowerShell terminal:
```powershell
cd d:\College\Programming\QuSec-Quantum-Cyber-Threat-Detection-main\QuSec
qusec chat --role sender
```
* Alice listens on Classical Port `9877`, Optical Port `9876`, and Gateway `http://127.0.0.1:8765`.

#### 3. Start the Shnik Next.js Web App
Open a third terminal:
```powershell
cd d:\College\Programming\Shnik-main
npm run dev
```

#### 4. Open the Web Interfaces
* **Alice's Browser Window**:
  Navigate to: `http://localhost:3000/messages/user-bob?as=alice&port=8765`
  - Header pill shows: **QuSec Sender :8765** (Green).
* **Bob's Browser Window** (open in an Incognito window or second browser):
  Navigate to: `http://localhost:3000/messages/user-alice?as=bob&port=8766`
  - Header pill shows: **QuSec Receiver :8766** (Green).

#### 5. Verify Honest Quantum Teleportation
1. In Alice's window, type: `"Hello Bob, this message is quantum-teleported."` and click **Send**.
2. Alice's terminal records the Bell State Measurement (BSM) and classical transmission.
3. Bob's terminal verifies the Pauli corrections and decoy states ($QBER < 2\%$).
4. The message appears in Bob's browser with status **Delivered**. Bob's physical ESP32 alarm LED stays OFF.

---

### C. Running Across Multiple Physical Laptops

1. **Laptop 1 (Alice / Sender)**:
   - Connect ESP32 #1 via USB and Media Converter #1 via Ethernet.
   - Run: `qusec node --peer-host <BOB_IP> --role dual --port 8765`
   - Start Shnik: `npm run dev`
   - Open: `http://localhost:3000/messages/user-bob?as=alice`
2. **Laptop 2 (Bob / Receiver)**:
   - Connect ESP32 #2 via USB and Media Converter #2 via Ethernet.
   - Run: `qusec node --peer-host <ALICE_IP> --role dual --port 8766`
   - Start Shnik: `npm run dev`
   - Open: `http://localhost:3000/messages/user-alice?as=bob`
3. **Laptop 3 (Eve / Attacker)**:
   - Connect ESP32 #3 via USB (flashed with `qusec-attacker/firmware/esp32_attacker/esp32_attacker.ino`).
   - Run: `qusec-attacker --target-host <BOB_IP>`

---

### D. Demonstrating Cyber Attacks with the Adversary Console (Eve)

On Laptop 3, launch the standalone `qusec-attacker` adversary console:
```bash
qusec-attacker --target-host <BOB_IP>
```

```text
╭─ ⚡ QUSEC ATTACKER · Eve Adversary Engine · Interactive TUI ────────────────────────────╮
│ Real-world tampering, intercept-resend, Pauli bit manipulation & hardware TRNG jamming │
│                                                                                        │
│ Target Host:    192.168.4.2           Attacker ESP32: Connected (/dev/ttyUSB0)         │
│ Classical Port: 9877                  Dynamic Q_th:   8.72% (Auto-Adapted)             │
│ Optical Port:   9876                  Auto-Attacks:   ACTIVE (In-Between Chats)        │
╰────────────────────────────────────────────────────────────────────────────────────────╯
Type /help to view attack vectors, or /attack <type> to execute.

╭─ qusec-attacker · Eve Adversary
╰─ ❯ 
```

#### Slash Commands in Adversary TUI:
- `/attack qber [rate]` — Intercept optical photons and inject conjugate state collapse
- `/attack tamper [ratio]` — Flip classical feed-forward Pauli coordinates ($c_0, c_1$)
- `/attack forgery [message]` — Send forged packet with invalid Wegman-Carter MAC
- `/attack replay` — Re-inject previously captured frame with expired nonce
- `/attack jam [count]` — Emit high-frequency hardware TRNG entropy jamming bursts
- `/random on 8 20` — **Automated in-between chat attacks**: Randomly tampers with chats every 8–20s
- `/mitm start` — Start transparent hardware packet proxy and live packet sniffer
- `/threshold` — Inspect mathematical Hoeffding margin & dynamic QBER threshold proof
- `/stats` — Print real-time attack telemetry and injected packet counts

#### Attack 1: Intercept-Resend (State Collapse & QBER Spike)
* Select `[1]` and press Enter.
* **Adversary Action**: Eve intercepts optical photons and resends replacement states using her ESP32 TRNG.
* **Detection**:
  - Bob's terminal calculates $QBER \approx 33\%\text{--}40\%$ (above the $6\%$ threshold).
  - Decision: **`REJECTED (QBER THRESHOLD EXCEEDED)`**.
  - **Physical Response**: **Bob's ESP32 GPIO 4 LED blinks rapidly** in alert mode.
  - **Web Response**: Bob's Shnik screen shows a critical red banner:
    > **SECURITY ALERT:** Security Threat Detected: REJECTED (QBER THRESHOLD EXCEEDED) (QBER: 33.3%)
  - The message appears as `[BLOCKED: REJECTED (QBER THRESHOLD EXCEEDED)]`.

#### Attack 2: Impersonation & MAC Forgery
* Select `[3]` and press Enter.
* **Adversary Action**: Eve injects a counterfeit command signed with a forged MAC (`deadbeef...`).
* **Detection**:
  - Wegman-Carter MAC authentication fails on Bob's endpoint.
  - Decision: **`REJECTED (MAC VERIFICATION FAILED)`**.
  - **Bob's physical ESP32 GPIO 4 LED flashes**, and Shnik blocks the transmission.

---

## 5. Future Roadmap & Recommended Improvements

1. **Embedded Web Attack Panel for Eve**:
   - Add a `/demo/attacker` view in Shnik allowing evaluators to click buttons (e.g., *"Inject QBER Disturbance"*, *"Tamper Coordinates"*) directly in the browser during presentations, triggering `attacker_eve.py` via a local REST bridge.

2. **Real-Time QBER & Telemetry Visualizer**:
   - Add a live gauge component in the chat header displaying current QBER ($Q$), Bell pair fidelity, and remaining Key Pool bits streamed directly from the `/api/events` SSE channel.

3. **Audio-Visual Threat Alerts**:
   - Add an optional audio alert and red pulse animation across the chat window when `threat_alarm` triggers, mirroring the physical ESP32 LED strobe.

4. **Multi-Party Decoy Routing**:
   - Extend the single peer-to-peer setup to support small group chats, where Alice distributes SARG04 decoy states across multiple ESP32 receiver nodes simultaneously.
