import React from 'react';
import ReactECharts from 'echarts-for-react';
import { t } from '../../lib/i18n';
import { hexToRgba } from '../../lib/colors';
import { CHART_TOOLTIP, withColors, type ChartDatum } from '../../lib/chartTheme';

interface DonutChartProps {
  data: ChartDatum[];
  /** Texto sob o total no centro ("em aberto", "no mês"). */
  centerLabel?: string;
  formatValue?: (value: number) => string;
  onSelect?: (key: string) => void;
  emptyMessage?: string;
  height?: number;
  /** Lista de legenda clicável abaixo do anel. */
  legend?: boolean;
}

/**
 * Rosca com total no centro e legenda em lista (nome, valor e %). Uma fatia
 * clicada devolve a `key` — use para filtrar o painel ao lado.
 */
export default function DonutChart({ data, centerLabel, formatValue, onSelect, emptyMessage, height = 190, legend = true }: DonutChartProps) {
  const entries = withColors(data);
  const total = entries.reduce((sum, e) => sum + (Number.isFinite(e.value) ? e.value : 0), 0);
  const fmt = formatValue ?? ((value: number) => String(value));

  if (total === 0) {
    return <p className="py-10 text-center text-sm text-gray-400">{emptyMessage ?? t('common.no_data')}</p>;
  }

  const option = {
    tooltip: {
      ...CHART_TOOLTIP,
      trigger: 'item',
      formatter: (p: any) => `${p.name}<br/><strong>${fmt(p.value)}</strong> (${p.percent}%)`,
    },
    legend: { show: false },
    series: [{
      type: 'pie',
      radius: ['62%', '86%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: false,
      cursor: onSelect ? 'pointer' : 'default',
      itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 3 },
      label: { show: false },
      emphasis: { scaleSize: 6 },
      data: entries.filter((e) => e.value > 0).map((e) => ({ name: e.name, value: e.value, key: e.key, itemStyle: { color: e.color } })),
    }],
  };

  const onEvents = onSelect
    ? { click: (params: any) => { const key = params?.data?.key; if (key) onSelect(key); } }
    : undefined;

  return (
    <div className="w-full">
      <div className="relative w-full">
        <ReactECharts option={option} style={{ height, width: '100%' }} notMerge lazyUpdate opts={{ renderer: 'canvas' }} onEvents={onEvents} />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold leading-none tracking-tight text-gray-900">{fmt(total)}</span>
          {centerLabel && <span className="mt-1 text-[11px] text-gray-400">{centerLabel}</span>}
        </div>
      </div>
      {legend && (
        <ul className="mt-4 space-y-1.5">
          {entries.map((e) => {
            const pct = total > 0 ? Math.round((e.value / total) * 100) : 0;
            const clickable = Boolean(onSelect) && e.value > 0;
            return (
              <li key={e.key}>
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => onSelect?.(e.key)}
                  className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors ${clickable ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'}`}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: e.color, boxShadow: `0 0 0 3px ${hexToRgba(e.color, 0.15)}` }} />
                  <span className="flex-1 truncate text-sm text-gray-700">{e.name}</span>
                  <span className="text-sm font-semibold tabular-nums text-gray-900">{fmt(e.value)}</span>
                  <span className="w-9 text-right text-xs tabular-nums text-gray-400">{pct}%</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
