'use client';

import React from 'react';
import { QuantumStage } from '@/lib/types';
import { AlertCircle, Check } from 'lucide-react';

interface StageStepperProps {
  currentStage?: QuantumStage;
  isFailed?: boolean;
  detail?: string;
}

export function StageStepper({
  currentStage = 'delivered',
  isFailed = false,
  detail,
}: StageStepperProps) {
  if (currentStage === 'queued') {
    return (
      <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse" />
        <span>Queued</span>
      </div>
    );
  }

  if (isFailed || currentStage === 'failed') {
    return (
      <div className="mt-1 flex items-center gap-1 text-[11px] text-red-500 font-medium">
        <AlertCircle className="w-3 h-3" />
        <span>Failed to send</span>
      </div>
    );
  }

  if (currentStage === 'delivered') {
    return (
      <div className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-gray-400">
        <span>Delivered</span>
      </div>
    );
  }

  // Active in-flight stages
  return (
    <div className="mt-0.5 flex items-center justify-end gap-1.5 text-[11px] text-gray-400">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
      <span>Sending...</span>
    </div>
  );
}
