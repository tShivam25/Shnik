'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

export interface QuSecStatus {
  status?: string;
  role?: string;
  peer_role?: string;
  ready?: boolean;
  is_ready?: boolean;
  link_ok?: boolean;
  connected?: boolean;
  session_id?: string | null;
  dynamic_threshold?: {
    q_threshold?: number;
    traffic_rate_msgs_per_sec?: number;
    auto_adjusting?: boolean;
    formula?: string;
    status?: string;
  };
  channel?: {
    fibre_ok?: boolean;
    esp32_ok?: boolean;
    ready?: boolean;
    is_ready?: boolean;
    qber?: number;
    fidelity?: number;
    chsh?: number;
    trusted?: boolean;
  };
  key_pool?: {
    available_bits?: number;
  };
  quantum_keys?: {
    public_key?: string;
    peer_public_key?: string;
    encryption_scheme?: string;
    signature_scheme?: string;
  };
  last_security_report?: any;
  error?: string;
}

export interface QuSecMessage {
  id?: string;
  from: string;
  to?: string;
  text: string;
  mode: string;
  threat?: boolean;
  qber?: number;
  decision?: string;
  qusec_report?: any;
}

interface QuSecBridgeContextType {
  status: QuSecStatus | null;
  lastMessage: QuSecMessage | null;
  isConnected: boolean;
  isReady: boolean;
  linkDownReason: string | null;
  gatewayPort: number;
  setGatewayPort: (port: number) => void;
  onSendClicked: (userText: string, mode?: string, recipientRole?: string) => Promise<any>;
  onInitSessionClicked: () => Promise<void>;
}

const QuSecBridgeContext = createContext<QuSecBridgeContextType>({
  status: null,
  lastMessage: null,
  isConnected: false,
  isReady: false,
  linkDownReason: "Initializing QuSec link...",
  gatewayPort: 8765,
  setGatewayPort: () => {},
  onSendClicked: async () => {},
  onInitSessionClicked: async () => {},
});

export function QuSecBridgeProvider({ children }: { children: React.ReactNode }) {
  const [gatewayPort, setGatewayPortState] = useState<number>(8765);
  const [status, setStatus] = useState<QuSecStatus | null>(null);
  const [lastMessage, setLastMessage] = useState<QuSecMessage | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const qusecRef = useRef<any>(null);

  // Initialize port from query param, user identity, or localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const paramPort = urlParams.get('qusec_port') || urlParams.get('port');
    const savedPort = localStorage.getItem('qusec_gateway_port');
    const asUser = urlParams.get('as');

    let initialPort = paramPort ? parseInt(paramPort, 10) : (savedPort ? parseInt(savedPort, 10) : null);
    if (!initialPort) {
      initialPort = (asUser === 'bob') ? 8766 : 8765;
    }

    if (!isNaN(initialPort) && (initialPort === 8765 || initialPort === 8766 || initialPort > 1024)) {
      setGatewayPortState(initialPort);
    }
  }, []);

  const setGatewayPort = useCallback((port: number) => {
    setGatewayPortState(port);
    if (typeof window !== 'undefined') {
      localStorage.setItem('qusec_gateway_port', port.toString());
    }
    if (qusecRef.current) {
      qusecRef.current.setGatewayUrl(`http://127.0.0.1:${port}`);
    }
  }, []);

  // Continuous auto-discovery of active local QuSec node (supports 8765 & 8766)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let active = true;

    const probeActiveNode = async () => {
      if (isConnected) return;

      for (const p of [8765, 8766]) {
        try {
          const res = await fetch(`http://127.0.0.1:${p}/api/status`, {
            cache: 'no-store',
            headers: { 'Accept': 'application/json' },
          });
          if (res.ok) {
            const data = await res.json();
            if (data && (data.status === 'ONLINE' || data.ready !== undefined)) {
              if (active && gatewayPort !== p) {
                console.log(`[QuSecBridge] Auto-detected QuSec node on port ${p}`);
                setGatewayPort(p);
                return;
              }
            }
          }
        } catch (_) {}
      }
    };

    probeActiveNode();
    const probeInterval = setInterval(probeActiveNode, 2000);

    return () => {
      active = false;
      clearInterval(probeInterval);
    };
  }, [isConnected, gatewayPort, setGatewayPort]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let probeAttempted = false;

    const initBridge = () => {
      const BridgeClass = (window as any).QuSecBridge;
      if (!BridgeClass) return;

      const gatewayUrl = `http://127.0.0.1:${gatewayPort}`;

      if (!qusecRef.current) {
        const qusec = new BridgeClass(gatewayUrl);
        qusecRef.current = qusec;
        (window as any).qusec = qusec;

        // 1. Listen for live hardware and session status
        qusec.onStatus((newStatus: any) => {
          setStatus(newStatus);
          const online = newStatus.status !== 'OFFLINE';
          setIsConnected(online);
        });

        // 2. Listen for incoming decrypted chat messages from the peer
        qusec.onMessage((msg: QuSecMessage) => {
          console.log('[QuSec incoming]', msg);
          setLastMessage(msg);
          if (typeof (window as any).displayChatMessage === 'function') {
            (window as any).displayChatMessage(msg.from, msg.text, msg.mode, msg);
          }
        });

        // 3. Connect to the local terminal runtime
        qusec.start();

        // Global convenience hooks
        (window as any).onSendClicked = async (userText: string, mode: string = 'teleportation') => {
          await qusec.sendMessage(userText, mode);
        };
        (window as any).onInitSessionClicked = async () => {
          await qusec.initSession();
        };
      } else {
        qusecRef.current.setGatewayUrl(gatewayUrl);
      }
    };

    if ((window as any).QuSecBridge) {
      initBridge();
    } else {
      const script = document.createElement('script');
      script.src = '/qusec-web-bridge.js';
      script.async = true;
      script.onload = () => {
        initBridge();
      };
      document.body.appendChild(script);
    }

    return () => {
      if (qusecRef.current) {
        qusecRef.current.stop();
        qusecRef.current = null;
      }
    };
  }, [gatewayPort]);

  const onSendClicked = useCallback(async (userText: string, mode: string = 'teleportation', recipientRole?: string) => {
    if (qusecRef.current) {
      return await qusecRef.current.sendMessage(userText, mode, recipientRole);
    }
    return null;
  }, []);

  const onInitSessionClicked = useCallback(async () => {
    if (qusecRef.current) {
      await qusecRef.current.initSession();
    }
  }, []);

  const isReady = Boolean(
    isConnected &&
    (status?.ready !== undefined ? status.ready : (status?.channel?.fibre_ok && status?.channel?.esp32_ok))
  );

  let linkDownReason: string | null = null;
  if (!isConnected) {
    linkDownReason = "QuSec node offline (Gateway disconnected)";
  } else if (!isReady) {
    const reasons: string[] = [];
    if (status?.channel && !status.channel.fibre_ok) {
      reasons.push("Optical fibre carrier lost");
    }
    if (status?.channel && !status.channel.esp32_ok) {
      reasons.push("ESP32 classical link disconnected");
    }
    linkDownReason = reasons.length > 0 ? reasons.join(" & ") : "Physical link down";
  }

  return (
    <QuSecBridgeContext.Provider
      value={{
        status,
        lastMessage,
        isConnected,
        isReady,
        linkDownReason,
        gatewayPort,
        setGatewayPort,
        onSendClicked,
        onInitSessionClicked,
      }}
    >
      {children}
    </QuSecBridgeContext.Provider>
  );
}

export function useQuSecBridge() {
  return useContext(QuSecBridgeContext);
}
