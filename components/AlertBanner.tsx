'use client';

import React from 'react';
import { Alert } from '@/lib/types';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';

interface AlertBannerProps {
  alerts: Alert[];
  onDismiss: (alertId: string) => void;
}

export function AlertBanner({ alerts, onDismiss }: AlertBannerProps) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="space-y-2 mb-3">
      {alerts.map((alert) => {
        const isCritical = alert.severity === 'critical';

        return (
          <div
            key={alert.id}
            className={`p-3 rounded-xl border flex items-start justify-between gap-3 animate-slide-up shadow-sm transition-all ${
              isCritical
                ? 'bg-red-50/95 border-red-200 text-red-900'
                : 'bg-amber-50/95 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {isCritical ? (
                <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-0.5">
                  {isCritical ? 'Security Alert' : 'Notice'}
                </p>
                <p className="text-sm font-normal leading-relaxed">{alert.reason}</p>
                <p className="text-[11px] opacity-75 mt-1">
                  {new Date(alert.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onDismiss(alert.id)}
              className="text-gray-400 hover:text-gray-700 p-1 rounded-md hover:bg-black/5 transition-colors focus:outline-none"
              title="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
