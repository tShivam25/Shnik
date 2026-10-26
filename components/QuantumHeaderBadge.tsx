'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import { GatewayConnectionStatus } from '@/lib/gateway';

interface QuantumHeaderBadgeProps {
  connectionStatus?: GatewayConnectionStatus;
  fidelity?: string;
  onSimulateAttack?: () => void;
}

export function QuantumHeaderBadge({
  connectionStatus = 'mock',
}: QuantumHeaderBadgeProps) {
  return (
    <div className="flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-[#FAFAFA] border border-[#EFEFEF] px-2.5 py-1 rounded-full">
      <Lock className="w-3 h-3 text-gray-500" />
      <span>Encrypted</span>
    </div>
  );
}
