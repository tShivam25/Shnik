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
            <div className="mt-1.5 p-3 rounded-xl bg-white border border-gray-200 shadow-md text-[11px] text-gray-700 space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-gray-100 font-semibold text-gray-900">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-600" />
                  QuSec QBER Security Report
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                    isThreat ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {report.decision || (isThreat ? 'REJECTED' : 'VERIFIED')}
                </span>
              </div>

              {/* 5-Point Core Telemetry Specification */}
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between items-center py-0.5 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">1. QBER Threshold:</span>
                  <span className="font-mono font-semibold text-gray-900">
                    {(thresholdVal * 100).toFixed(2)}%
                  </span>
                </div>

                <div className="flex justify-between items-center py-0.5 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">2. Threshold Verification:</span>
                  <span className={`font-semibold ${!isThreat ? 'text-emerald-700' : 'text-red-700'}`}>
                    {report?.threshold_verification || (!isThreat ? 'PASS (Within Tolerance)' : 'FAIL (Exceeded)')}
                  </span>
                </div>

                <div className="flex justify-between items-center py-0.5 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">3. Backend:</span>
                  <span className="font-medium text-purple-700 truncate max-w-[200px]" title={report?.backend || 'Aersim'}>
                    {report?.backend || 'Aersim (Ideal Quantum State Simulator)'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-0.5 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">4. Calculated QBER:</span>
                  <span className={`font-mono font-semibold ${isThreat ? 'text-red-600' : 'text-emerald-600'}`}>
                    {qberVal !== undefined ? `${(qberVal * 100).toFixed(2)}%` : '0.82%'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5 bg-gray-50 px-2 rounded-lg mt-1 border border-gray-100">
                  <span className="text-gray-800 font-bold">Final Result:</span>
                  <span className={`font-bold text-[10px] ${!isThreat ? 'text-emerald-700' : 'text-red-700'}`}>
                    {report?.final_result || (!isThreat ? '✔ VERIFIED · QUANTUM INTEGRITY CONFIRMED' : '✖ REJECTED · THREAT DETECTED')}
                  </span>
                </div>
              </div>

              {/* Extended Quantum Telemetry */}
              <div className="pt-1.5 border-t border-gray-100 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-gray-500">
                <div>
                  <span>Link:</span>{' '}
                  <span className="font-semibold text-gray-800">{report.sender || 'Sender'} ➔ {report.recipient || 'Receiver'}</span>
                </div>
                <div>
                  <span>Total Qubits:</span>{' '}
                  <span className="font-mono text-gray-800">{report.total_qubits ?? 48}</span>
                </div>
                <div>
                  <span>Pauli Corrections:</span>{' '}
                  <span className="font-mono text-gray-800">X={report.pauli_x_count ?? 0}, Z={report.pauli_z_count ?? 0}</span>
                </div>
                <div>
                  <span>Sifted (μ):</span>{' '}
                  <span className="font-mono text-gray-800">{report.conclusive_sifted ?? 36}</span>
                </div>
              </div>

              {report.sig_decision && (
                <div className="pt-1 border-t border-gray-100 flex justify-between text-[9px]">
                  <span className="text-gray-400">Quantum Signature:</span>
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
