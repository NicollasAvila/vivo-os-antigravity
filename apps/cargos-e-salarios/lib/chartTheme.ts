// Tema único dos gráficos (ECharts), alinhado ao tooltip escuro e à tipografia
// do app. Todo gráfico do app parte daqui — nunca configure cor de eixo ou
// tooltip à mão em cada tela.
import { SWATCHES } from './colors';

export interface ChartDatum {
  /** Identificador devolvido em `onSelect`. */
  key: string;
  name: string;
  value: number;
  /** Cor da série/fatia. Padrão: cor primária do app ou a paleta em sequência. */
  color?: string;
}

export const CHART_TOOLTIP = {
  backgroundColor: '#111827',
  borderWidth: 0,
  padding: [6, 10],
  textStyle: { color: '#fff', fontSize: 12 },
  extraCssText: 'border-radius: 6px; box-shadow: 0 10px 15px -3px rgba(17,24,39,.25);',
};

export const CHART_AXIS_LABEL = { color: '#6b7280', fontSize: 11 };
export const CHART_AXIS_LABEL_MUTED = { color: '#9ca3af', fontSize: 11 };
export const CHART_SPLIT_LINE = { lineStyle: { color: '#f3f4f6' } };
export const CHART_GRID = { left: 4, right: 16, top: 12, bottom: 4, containLabel: true };

/** Lê a cor primária do app (token CSS) — o ECharts não entende `var(--x)`. */
export function primaryColor(shade: 500 | 600 = 500): string {
  if (typeof window === 'undefined') return '#6366f1';
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--color-primary-${shade}`).trim();
  return value || '#6366f1';
}

/** Paleta categórica: primária primeiro, depois as amostras do app. */
export function chartPalette(): string[] {
  const primary = primaryColor();
  return [primary, ...SWATCHES.map((s) => s.value).filter((c) => c !== primary)];
}

export function colorAt(index: number, palette: string[] = chartPalette()): string {
  return palette[index % palette.length];
}

export function withColors(data: ChartDatum[]): Required<ChartDatum>[] {
  const palette = chartPalette();
  return data.map((d, i) => ({ ...d, color: d.color || colorAt(i, palette) }));
}
