'use client';

import React, { useState } from 'react';
import { Message, QuantumStatusEvent } from '@/lib/types';
import { StageStepper } from './StageStepper';
import { ShieldCheck, ShieldAlert, ChevronDown, ChevronUp, Cpu, Activity } from 'lucide-react';

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
  const [showReport, setShowReport] = useState(false);

  const currentStage = gatewayEvent?.stage || message.stage || (message.status === 'delivered' ? 'delivered' : 'encoding');
  const isFailed = currentStage === 'failed' || message.status === 'failed' || gatewayEvent?.ok === false;
  const detail = gatewayEvent?.detail || message.stageDetail;

  const report = message.qusec_report;
  const hasReport = !!report;
  const qberVal = report?.calculated_qber ?? message.qber;
  const thresholdVal = report?.threshold ?? 0.06;
  const isThreat = isFailed || (qberVal !== undefined && qberVal > thresholdVal) || (report?.decision && report.decision !== 'VERIFIED');

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
            : isThreat
              ? 'bg-red-50 text-red-900 border border-red-200 rounded-bl-sm'
              : 'bg-[#EFEFEF] text-black rounded-bl-sm'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
      </div>

      {/* QuSec Quantum Security Report Toggle Pill */}
      {hasReport && (
        <div className="mt-1 max-w-[85%] sm:max-w-[70%]">
          <button
            type="button"
            onClick={() => setShowReport(!showReport)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border transition ${
              isThreat
                ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            {isThreat ? (
              <ShieldAlert className="w-3 h-3 text-red-600" />
            ) : (
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
            )}
            <span>
              {isThreat ? 'Threat Blocked' : 'QuSec Security Report'}
              {qberVal !== undefined ? ` · QBER: ${(qberVal * 100).toFixed(1)}%` : ''}
            </span>
            {showReport ? (
              <ChevronUp className="w-2.5 h-2.5 opacity-70" />
            ) : (
              <ChevronDown className="w-2.5 h-2.5 opacity-70" />
            )}
          </button>

          {/* Expanded Security Report Card */}
          {showReport && (
            <div className="mt-1.5 p-2.5 rounded-xl bg-white border border-gray-200 shadow-md text-[11px] text-gray-700 space-y-1.5">
              <div className="flex items-center justify-between pb-1 border-b border-gray-100 font-semibold text-gray-900">
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3 text-cyan-600" />
                  Quantum Security Audit
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    isThreat ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {report.decision || (isThreat ? 'REJECTED' : 'VERIFIED')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                <div>
                  <span className="text-gray-400">Direction:</span>{' '}
                  <span className="font-semibold">{report.sender || 'Sender'} ➔ {report.recipient || 'Receiver'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Measured QBER:</span>{' '}
                  <span className={`font-mono font-semibold ${isThreat ? 'text-red-600' : 'text-emerald-600'}`}>
                    {(qberVal * 100).toFixed(2)}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Dynamic Q_th:</span>{' '}
                  <span className="font-mono font-semibold">{(thresholdVal * 100).toFixed(2)}%</span>
                </div>
                <div>
                  <span className="text-gray-400">Total Qubits:</span>{' '}
                  <span className="font-mono">{report.total_qubits ?? 208}</span>
                </div>
                <div>
                  <span className="text-gray-400">Pauli Corrections:</span>{' '}
                  <span className="font-mono">X={report.pauli_x_count ?? 0}, Z={report.pauli_z_count ?? 0}</span>
                </div>
                <div>
                  <span className="text-gray-400">Sifted Conclusive (μ):</span>{' '}
                  <span className="font-mono">{report.conclusive_sifted ?? 36}</span>
                </div>
              </div>

              {report.sig_decision && (
                <div className="pt-1 border-t border-gray-100 flex justify-between text-[9px]">
                  <span className="text-gray-400">Signature:</span>
                  <span className="font-mono text-emerald-700">{report.sig_decision}</span>
                </div>
              )}
            </div>
          )}
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
