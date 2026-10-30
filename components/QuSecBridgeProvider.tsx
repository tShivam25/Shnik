'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

export interface QuSecStatus {
  status?: string;
  role?: string;
  peer_role?: string;
  session_id?: string | null;
  channel?: {
    fibre_ok?: boolean;
    esp32_ok?: boolean;
    qber?: number;
  };
  key_pool?: {
    available_bits?: number;
  };
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
}

interface QuSecBridgeContextType {
  status: QuSecStatus | null;
  lastMessage: QuSecMessage | null;
  isConnected: boolean;
  gatewayPort: number;
  setGatewayPort: (port: number) => void;
  onSendClicked: (userText: string, mode?: string, recipientRole?: string) => Promise<void>;
  onInitSessionClicked: () => Promise<void>;
}

const QuSecBridgeContext = createContext<QuSecBridgeContextType>({
  status: null,
  lastMessage: null,
  isConnected: false,
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

  // Initialize port from query param or localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const paramPort = urlParams.get('qusec_port') || urlParams.get('port');
    const savedPort = localStorage.getItem('qusec_gateway_port');

    const initialPort = paramPort ? parseInt(paramPort, 10) : (savedPort ? parseInt(savedPort, 10) : 8765);
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

  useEffect(() => {
    if (typeof window === 'undefined') return;

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
          setIsConnected(newStatus.status !== 'OFFLINE');
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
      await qusecRef.current.sendMessage(userText, mode, recipientRole);
    }
  }, []);

  const onInitSessionClicked = useCallback(async () => {
    if (qusecRef.current) {
      await qusecRef.current.initSession();
    }
  }, []);

  return (
    <QuSecBridgeContext.Provider
      value={{
        status,
        lastMessage,
        isConnected,
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
