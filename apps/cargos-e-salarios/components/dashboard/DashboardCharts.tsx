// DashboardCharts — zero useMemo, zero arrow-function em closures aninhadas
// Funções puras fora do componente eliminam o bug do esbuild
// "Cannot access 'v' before initialization"
import React from 'react';
import ReactECharts from 'echarts-for-react';
import { Colaborador, colabCargo } from '../../services/rbac';

// ── Paleta como constantes primitivas separadas ──────────────────────────────
const C0 = '#660199';
const C1 = '#9AD851';
const C2 = '#3b82f6';
const C3 = '#f59e0b';
const C4 = '#10b981';
const C5 = '#ef4444';
const C6 = '#8b5cf6';
const C7 = '#06b6d4';
const C8 = '#f97316';
const C9 = '#64748b';
const CGRAY = '#9ca3af';
const PALETTE_LIST: string[] = [C0, C1, C2, C3, C4, C5, C6, C7, C8, C9];

const HC_MESES: string[] = ['Maio', 'Junho', 'Julho', 'Agosto'];
const HC_VALS: number[]  = [274, 273, 268, 273];
const EST_VALS: number[] = [7, 7, 5, 4];

// ── Funções puras de módulo ───────────────────────────────────────────────────
function getPaletteColor(i: number): string {
  return PALETTE_LIST[i % PALETTE_LIST.length];
}

type CargoItem = { name: string; value: number; color: string };

function calcCargosData(colaboradores: Colaborador[]): CargoItem[] {
  const map: Record<string, number> = {};
  for (let i = 0; i < colaboradores.length; i++) {
    const cargo = colabCargo(colaboradores[i]);
    if (!cargo) continue;
    map[cargo] = (map[cargo] ?? 0) + 1;
  }
  const sorted = Object.entries(map).sort(function sortDesc(a, b) { return b[1] - a[1]; });
  const top8 = sorted.slice(0, 8);
  let outros = 0;
  for (let j = 8; j < sorted.length; j++) { outros += sorted[j][1]; }
  const out: CargoItem[] = [];
  for (let k = 0; k < top8.length; k++) {
    out.push({ name: top8[k][0], value: top8[k][1], color: getPaletteColor(k) });
  }
  if (outros > 0) { out.push({ name: 'Outros', value: outros, color: CGRAY }); }
  return out;
}

function buildDonutOpt(items: CargoItem[]): object {
  const sd: object[] = [];
  for (let i = 0; i < items.length; i++) {
    sd.push({ name: items[i].name, value: items[i].value, itemStyle: { color: items[i].color } });
  }
  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1f2937',
      borderColor: 'transparent',
      textStyle: { color: '#f9fafb', fontSize: 12 },
      extraCssText: 'box-shadow:0 4px 12px rgba(0,0,0,.18);border-radius:8px;padding:8px 12px',
      formatter: function fmtDonut(p: any) {
        return p.name + '<br/><strong>' + p.value + '</strong> colaboradores (' + p.percent + '%)';
      },
    },
    legend: { show: false },
    series: [{
      type: 'pie',
      radius: ['55%', '80%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 3 },
      label: { show: false },
      emphasis: { scaleSize: 6 },
      data: sd,
    }],
  };
}

function buildLineOpt(): object {
  return {
    grid: { top: 20, right: 16, bottom: 32, left: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1f2937',
      borderColor: 'transparent',
      textStyle: { color: '#f9fafb', fontSize: 12 },
      extraCssText: 'box-shadow:0 4px 12px rgba(0,0,0,.18);border-radius:8px;padding:8px 12px',
      axisPointer: { type: 'cross', crossStyle: { color: '#9ca3af' } },
      formatter: function fmtLine(params: any) {
        const ps: any[] = Array.isArray(params) ? params : [params];
        let out = '';
        for (let i = 0; i < ps.length; i++) {
          if (i > 0) out += '<br/>';
          out += ps[i].marker + ps[i].seriesName + ': <strong>' + ps[i].value + '</strong>';
        }
        return out;
      },
    },
    legend: { bottom: 0, textStyle: { color: '#6b7280', fontSize: 11 }, icon: 'circle', itemWidth: 8, itemHeight: 8 },
    xAxis: {
      type: 'category',
      data: HC_MESES,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisLabel: { color: '#9ca3af', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f3f4f6' } },
      axisLabel: { color: '#9ca3af', fontSize: 11 },
      min: function calcMin(v: any) { return Math.max(0, Math.floor(v.min - 10)); },
    },
    series: [
      {
        name: 'Head Count',
        type: 'line',
        data: HC_VALS,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2.5 },
        areaStyle: { opacity: 0.08 },
        itemStyle: { color: C0 },
      },
      {
        name: 'Estagiários',
        type: 'line',
        data: EST_VALS,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2, type: 'dashed' },
        itemStyle: { color: C1 },
      },
    ],
  };
}

// ── Componente ────────────────────────────────────────────────────────────────
interface Props {
  colaboradores: Colaborador[];
}

export default function DashboardCharts({ colaboradores }: Props) {
  if (colaboradores.length === 0) return null;

  const cargosData = calcCargosData(colaboradores);
  let total = 0;
  for (let i = 0; i < cargosData.length; i++) { total += cargosData[i].value; }
  const donutOpt = buildDonutOpt(cargosData);
  const lineOpt  = buildLineOpt();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

      {/* Rosquinha */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Distribuição por Cargo</h3>
          <p className="text-xs text-gray-500 mt-0.5">{total} colaboradores · top cargos</p>
        </div>
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="relative shrink-0" style={{ width: 180, height: 180 }}>
            <ReactECharts
              option={donutOpt}
              style={{ width: 180, height: 180 }}
              notMerge
              lazyUpdate
              opts={{ renderer: 'canvas' }}
            />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-gray-900">{total}</span>
              <span className="text-[10px] text-gray-400">colaboradores</span>
            </div>
          </div>
          <ul className="flex-1 min-w-0 space-y-1 w-full">
            {cargosData.slice(0, 6).map(function renderItem(d) {
              const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
              return (
                <li key={d.name} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="flex-1 truncate text-gray-700">{d.name}</span>
                  <span className="font-semibold tabular-nums text-gray-900">{d.value}</span>
                  <span className="w-7 text-right text-gray-400">{pct}%</span>
                </li>
              );
            })}
            {cargosData.length > 6 && (
              <li className="text-xs text-gray-400 pl-4">+{cargosData.length - 6} outros cargos</li>
            )}
          </ul>
        </div>
      </div>

      {/* Linha headcount */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Evolução do Headcount</h3>
          <p className="text-xs text-gray-500 mt-0.5">Maio – Agosto 2025</p>
        </div>
        <ReactECharts
          option={lineOpt}
          style={{ height: 200, width: '100%' }}
          notMerge
          lazyUpdate
          opts={{ renderer: 'canvas' }}
        />
      </div>

    </div>
  );
}
