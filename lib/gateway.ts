'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { QuantumStatusEvent, QuantumStage } from './types';
import { mockStore } from './mockStore';

export type GatewayConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'mock';

export function useGateway(token: string = 'demo-token') {
  const isMock = process.env.NEXT_PUBLIC_MOCK === 'true' || !process.env.NEXT_PUBLIC_QUSEC_WS;
  const [connectionStatus, setConnectionStatus] = useState<GatewayConnectionStatus>(
    isMock ? 'mock' : 'connecting'
  );
  const [stageEvents, setStageEvents] = useState<Record<string, QuantumStatusEvent>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to mock store quantum events if in mock mode
  useEffect(() => {
    if (isMock) {
      setConnectionStatus('mock');
      const unsubscribe = mockStore.subscribeQuantum((event: QuantumStatusEvent) => {
        setStageEvents((prev) => ({
          ...prev,
          [event.id]: event,
        }));
      });
      return () => unsubscribe();
    }

    // Real WebSocket implementation with auto-reconnect
    const wsUrl = `${process.env.NEXT_PUBLIC_QUSEC_WS}?token=${encodeURIComponent(token)}`;
    let isUnmounted = false;

    function connect() {
      if (isUnmounted) return;
      try {
        setConnectionStatus('connecting');
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isUnmounted) return;
          setConnectionStatus('connected');
        };

        ws.onmessage = (event) => {
          try {
            const data: QuantumStatusEvent = JSON.parse(event.data);
            if (data.type === 'status' && data.id) {
              setStageEvents((prev) => ({
                ...prev,
                [data.id]: data,
              }));
            }
          } catch (e) {
            console.error('Failed to parse gateway WS message', e);
          }
        };

        ws.onclose = () => {
          if (isUnmounted) return;
          setConnectionStatus('disconnected');
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        };

        ws.onerror = (err) => {
          console.warn('Gateway WS error, falling back / reconnecting:', err);
          ws.close();
        };
      } catch (err) {
        console.error('WS Connection error', err);
        setConnectionStatus('disconnected');
        reconnectTimeoutRef.current = setTimeout(connect, 4000);
      }
    }

    connect();

    return () => {
      isUnmounted = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isMock, token]);

  const updateStageEvent = useCallback((event: QuantumStatusEvent) => {
    setStageEvents((prev) => ({
      ...prev,
      [event.id]: event,
    }));
  }, []);

  const getStageForMessage = useCallback(
    (messageId: string, fallbackStage?: QuantumStage): QuantumStatusEvent | null => {
      return stageEvents[messageId] || (fallbackStage ? { type: 'status', id: messageId, stage: fallbackStage, ok: fallbackStage !== 'failed' } : null);
    },
    [stageEvents]
  );

  return {
    connectionStatus,
    stageEvents,
    updateStageEvent,
    getStageForMessage,
    isMock,
  };
}
