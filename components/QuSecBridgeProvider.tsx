'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

export interface QuSecStatus {
  session_id?: string | null;
  channel?: {
    fibre_ok?: boolean;
    esp32_ok?: boolean;
  };
  key_pool?: {
    available_bits?: number;
  };
}

export interface QuSecMessage {
  from: string;
  text: string;
  mode: string;
}

interface QuSecBridgeContextType {
  status: QuSecStatus | null;
  lastMessage: QuSecMessage | null;
  isConnected: boolean;
  onSendClicked: (userText: string, mode?: string) => Promise<void>;
  onInitSessionClicked: () => Promise<void>;
}

const QuSecBridgeContext = createContext<QuSecBridgeContextType>({
  status: null,
  lastMessage: null,
  isConnected: false,
  onSendClicked: async () => {},
  onInitSessionClicked: async () => {},
});

export function QuSecBridgeProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<QuSecStatus | null>(null);
  const [lastMessage, setLastMessage] = useState<QuSecMessage | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const qusecRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Dynamically load qusec-web-bridge.js if not yet loaded
    const initBridge = () => {
      const BridgeClass = (window as any).QuSecBridge;
      if (!BridgeClass) return;

      if (!qusecRef.current) {
        // Connect to the local QuSec node running in your terminal (port 8765)
        const qusec = new BridgeClass('http://127.0.0.1:8765');
        qusecRef.current = qusec;
        (window as any).qusec = qusec;

        // 1. Listen for live hardware and session status
        qusec.onStatus((newStatus: any) => {
          console.log('Session:', newStatus.session_id);
          console.log('Fibre OK:', newStatus.channel?.fibre_ok);
          console.log('ESP32 OK:', newStatus.channel?.esp32_ok);
          console.log('Key Pool bits:', newStatus.key_pool?.available_bits);
          setStatus(newStatus);
          setIsConnected(true);
        });

        // 2. Listen for incoming decrypted chat messages from the peer
        qusec.onMessage((msg: QuSecMessage) => {
          console.log('[QuSec incoming]', msg);
          setLastMessage(msg);
          if (typeof (window as any).displayChatMessage === 'function') {
            (window as any).displayChatMessage(msg.from, msg.text, msg.mode);
          }
        });

        // 3. Connect to the local terminal runtime
        qusec.start();

        // 4. Send a message over the quantum link when the user clicks 'Send'
        const sendFn = async (userText: string, mode: string = 'teleportation') => {
          await qusec.sendMessage(userText, mode);
        };
        (window as any).onSendClicked = sendFn;

        // 5. Initialize the session before chatting
        const initFn = async () => {
          await qusec.initSession();
        };
        (window as any).onInitSessionClicked = initFn;
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
  }, []);

  const onSendClicked = useCallback(async (userText: string, mode: string = 'teleportation') => {
    if (qusecRef.current) {
      await qusecRef.current.sendMessage(userText, mode);
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
