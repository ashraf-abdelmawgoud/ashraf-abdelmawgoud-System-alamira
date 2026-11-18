import React from 'react';
import type { ReportMetric } from '../../domain/reportCalculations';

interface ReportMetricCardsProps {
  metrics: ReportMetric[];
}

export const ReportMetricCards: React.FC<ReportMetricCardsProps> = ({ metrics }) => {
  if (!metrics || metrics.length === 0) return null;

  const colorStyles: Record<
    string,
    { border: string; bg: string; text: string; subText: string }
  > = {
    emerald: {
      border: 'border-emerald-200',
      bg: 'bg-emerald-50/70',
      text: 'text-emerald-800',
      subText: 'text-emerald-600',
    },
    amber: {
      border: 'border-amber-200',
      bg: 'bg-amber-50/70',
      text: 'text-amber-800',
      subText: 'text-amber-600',
    },
    rose: {
      border: 'border-rose-200',
      bg: 'bg-rose-50/70',
      text: 'text-rose-800',
      subText: 'text-rose-600',
    },
    navy: {
      border: 'border-[#E2E8F0]',
      bg: 'bg-white',
      text: 'text-[#11243A]',
      subText: 'text-[#64748B]',
    },
    blue: {
      border: 'border-blue-200',
      bg: 'bg-blue-50/70',
      text: 'text-blue-800',
      subText: 'text-blue-600',
    },
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {metrics.map((m) => {
        const style = colorStyles[m.highlightColor || 'navy'] || colorStyles.navy;
        return (
          <div
            key={m.id}
            className={`p-3.5 rounded-xl border ${style.border} ${style.bg} shadow-2xs transition-all`}
          >
            <span className={`block text-xs font-semibold ${style.subText} mb-1`}>
              {m.label}
            </span>
            <strong className={`block text-lg font-black ${style.text} tracking-tight`}>
              {m.value}
            </strong>
          </div>
        );
      })}
    </div>
  );
};
