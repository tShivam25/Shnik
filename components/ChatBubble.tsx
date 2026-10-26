'use client';

import React from 'react';
import { Message, QuantumStatusEvent } from '@/lib/types';
import { StageStepper } from './StageStepper';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

interface ChatBubbleProps {
  message: Message;
  isMine: boolean;
  gatewayEvent?: QuantumStatusEvent | null;
  otherUserAvatar?: string | null;
  otherUserName?: string;
}

export function ChatBubble({
  message,
  isMine,
  gatewayEvent,
}: ChatBubbleProps) {
  const currentStage = gatewayEvent?.stage || message.stage || (message.status === 'delivered' ? 'delivered' : 'encoding');
  const isFailed = currentStage === 'failed' || message.status === 'failed' || gatewayEvent?.ok === false;
  const detail = gatewayEvent?.detail || message.stageDetail;

  return (
    <div
      className={`flex flex-col mb-2.5 ${
        isMine ? 'items-end' : 'items-start'
      } animate-slide-up group`}
    >
      <div
        className={`max-w-[78%] sm:max-w-[65%] px-3.5 py-2 rounded-[20px] text-[15px] leading-snug transition-all ${
          isMine
            ? isFailed
              ? 'bg-red-50 text-red-950 border border-red-200 rounded-br-sm'
              : 'bg-[#0095F6] text-white rounded-br-sm'
            : 'bg-[#EFEFEF] text-black rounded-bl-sm'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
      </div>

      {/* Received Message Verification Badge */}
      {!isMine && message.verified === true && (
        <div className="mt-0.5 ml-1 flex items-center gap-1 text-[11px] text-gray-400">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          <span>Verified ✓</span>
        </div>
      )}

      {/* Sent Message Delivery Status */}
      {isMine && (
        <StageStepper
          currentStage={currentStage}
          isFailed={isFailed}
          detail={detail}
        />
      )}
    </div>
  );
}
