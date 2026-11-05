import React from 'react';
import ReactECharts from 'echarts-for-react';
import { t } from '../../lib/i18n';
import { CHART_AXIS_LABEL, CHART_AXIS_LABEL_MUTED, CHART_SPLIT_LINE, CHART_TOOLTIP, withColors, type ChartDatum } from '../../lib/chartTheme';

interface HorizontalBarChartProps {
  data: ChartDatum[];
  /** Palavra que acompanha o valor no tooltip ("tarefas", "R$"…). */
  unit?: string;
  /** Formata o valor no rótulo e no tooltip. */
  formatValue?: (value: number) => string;
  onSelect?: (key: string) => void;
  emptyMessage?: string;
  /** Altura mínima; cresce com a quantidade de barras. */
  minHeight?: number;
}

/**
 * Barras horizontais ordenadas: a maior no topo, rótulo do valor à direita e
 * trilho cinza de fundo. Padrão dos painéis do Fazello.
 */
export default function HorizontalBarChart({ data, unit = '', formatValue, onSelect, emptyMessage, minHeight = 160 }: HorizontalBarChartProps) {
  const rows = withColors(data).filter((d) => Number.isFinite(d.value));
  if (rows.length === 0 || rows.every((r) => r.value === 0)) {
    return <p className="py-10 text-center text-sm text-gray-400">{emptyMessage ?? t('common.no_data')}</p>;
  }

  const fmt = formatValue ?? ((value: number) => String(value));
  // O ECharts desenha o eixo de categoria de baixo para cima: invertido, a maior fica no topo.
  const ordered = [...rows].sort((a, b) => a.value - b.value);
  const height = Math.max(minHeight, ordered.length * 42 + 16);

  const option = {
    grid: { left: 4, right: 40, top: 6, bottom: 6, containLabel: true },
    tooltip: {
      ...CHART_TOOLTIP,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params;
        return `${p.name}<br/><strong>${fmt(p.value)}</strong> ${unit}`.trim();
      },
    },
    xAxis: { type: 'value', splitLine: CHART_SPLIT_LINE, axisLabel: { ...CHART_AXIS_LABEL_MUTED, formatter: (v: number) => fmt(v) }, minInterval: 1 },
    yAxis: {
      type: 'category',
      data: ordered.map((r) => r.name),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { ...CHART_AXIS_LABEL, color: '#374151', width: 110, overflow: 'truncate' },
    },
    series: [{
      type: 'bar',
      barMaxWidth: 18,
      cursor: onSelect ? 'pointer' : 'default',
      showBackground: true,
      backgroundStyle: { color: '#f9fafb', borderRadius: 8 },
      label: { show: true, position: 'right', color: '#6b7280', fontSize: 11, fontWeight: 600, formatter: (p: any) => fmt(p.value) },
      itemStyle: { borderRadius: [0, 8, 8, 0] },
      data: ordered.map((r) => ({ value: r.value, itemStyle: { color: r.color } })),
    }],
  };

  const onEvents = onSelect
    ? { click: (params: any) => { const row = ordered[params?.dataIndex ?? -1]; if (row) onSelect(row.key); } }
    : undefined;

  return (
    <ReactECharts option={option} style={{ height, width: '100%' }} notMerge lazyUpdate opts={{ renderer: 'canvas' }} onEvents={onEvents} />
  );
}
