// ============================================================================
// DiagCampos — Diagnóstico de campos reais da coleção 'colaboradores'
// Mostra: chaves exatas, valores, cobertura em % dos registros
// ============================================================================
import React, { useMemo, useState } from 'react';
import { useCollection } from '../hooks/useCollection';
import type { Colaborador } from '../services/rbac';
import {
  colabNome, colabEmail, colabMatricula, colabSalario, colabArea,
  colabCargo, colabEmpresa, colabGerente, colabCoordenador,
  colabAdmissao, colabEmailTelefonica,
  colabMatriculaSap, colabTipoContratacao, colabGrauInstrucao,
  colabSexo, colabCentroCusto, colabField,
} from '../services/rbac';

const SKIP = new Set(['id', '_created_by', '_allowed_user_ids', 'created_at', 'updated_at']);

export default function DiagCampos() {
  const { items, loading, error } = useCollection<Colaborador>('colaboradores');
  const [showRaw, setShowRaw] = useState(false);
  const [sampleIdx, setSampleIdx] = useState(0);

  // Agrega cobertura de cada campo sobre todos os registros
  const { allKeys, coverage, primeiro } = useMemo(() => {
    if (!items.length) return { allKeys: [], coverage: {}, primeiro: null };

    const keySet = new Set<string>();
    items.forEach(r => Object.keys(r).forEach(k => { if (!SKIP.has(k)) keySet.add(k); }));
    const allKeys = Array.from(keySet).sort();

    const coverage: Record<string, { filled: number; sample: string }> = {};
    allKeys.forEach(k => {
      let filled = 0;
      let sample = '';
      items.forEach(r => {
        const v = r[k];
        if (v !== null && v !== undefined && String(v).trim() !== '') {
          filled++;
          if (!sample) sample = String(v).slice(0, 60);
        }
      });
      coverage[k] = { filled, sample };
    });

    return { allKeys, coverage, primeiro: items[Math.min(sampleIdx, items.length - 1)] };
  }, [items, sampleIdx]);

  // Helpers canônicos aplicados ao registro amostral
  const canonicalValues = primeiro ? [
    { label: 'colabNome()', value: colabNome(primeiro) },
    { label: 'colabEmail()', value: colabEmail(primeiro) },
    { label: 'colabMatricula()', value: colabMatricula(primeiro) },
    { label: 'colabSalario()', value: String(colabSalario(primeiro)) },
    { label: 'colabArea()', value: colabArea(primeiro) },
    { label: 'colabCargo()', value: colabCargo(primeiro) },
    { label: 'colabEmpresa()', value: colabEmpresa(primeiro) },
    { label: 'colabGerente()', value: colabGerente(primeiro) },
    { label: 'colabCoordenador()', value: colabCoordenador(primeiro) },
    { label: 'colabAdmissao()', value: colabAdmissao(primeiro) },
    { label: 'colabSenioridade()', value: colabField(primeiro, 'NÍVEL DE SENIORIDADE', 'NIVEL DE SENIORIDADE', 'senioridade', 'nivel_senioridade') },
    { label: 'colabEmailTelefonica()', value: colabEmailTelefonica(primeiro) },
    { label: 'colabMatriculaSap()', value: colabMatriculaSap(primeiro) },
    { label: 'colabTipoContratacao()', value: colabTipoContratacao(primeiro) },
    { label: 'colabGrauInstrucao()', value: colabGrauInstrucao(primeiro) },
    { label: 'colabSexo()', value: colabSexo(primeiro) },
    { label: 'colabCentroCusto()', value: colabCentroCusto(primeiro) },
  ] : [];

  if (loading) return <div className="p-8 text-gray-500">Carregando…</div>;
  if (error)   return <div className="p-8 text-red-600">Erro: {String(error)}</div>;
  if (!items.length) return <div className="p-8 text-gray-500">Nenhum colaborador encontrado.</div>;

  const pct = (n: number) => Math.round((n / items.length) * 100);

  return (
    <div className="w-full p-4 md:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Diagnóstico de Campos</h1>
        <p className="mt-1 text-sm text-gray-500">
          {items.length} colaboradores carregados · {allKeys.length} campos distintos encontrados
        </p>
      </div>

      {/* Helpers canônicos aplicados ao registro de amostra */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">Helpers canônicos — Registro #{sampleIdx + 1}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSampleIdx(i => Math.max(0, i - 1))}
              disabled={sampleIdx === 0}
              className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-40"
            >◀</button>
            <span className="text-xs text-gray-500">{sampleIdx + 1} / {items.length}</span>
            <button
              onClick={() => setSampleIdx(i => Math.min(items.length - 1, i + 1))}
              disabled={sampleIdx >= items.length - 1}
              className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-40"
            >▶</button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
          {canonicalValues.map(({ label, value }) => {
            const empty = !value || value === '0';
            return (
              <div key={label} className={`px-4 py-3 ${empty ? 'bg-red-50' : ''}`}>
                <p className="text-xs font-mono text-gray-500">{label}</p>
                <p className={`mt-0.5 text-sm font-medium truncate ${empty ? 'text-red-400 italic' : 'text-gray-900'}`}>
                  {empty ? '(vazio)' : value}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cobertura de todos os campos */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">Todos os campos — cobertura em {items.length} registros</h2>
          <p className="text-xs text-gray-400 mt-0.5">Vermelho = vazio neste registro · Barra = % de registros com valor</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-2 font-semibold text-gray-700 w-8">#</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-700">Chave exata</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-700 w-24">Cobertura</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-700">Valor no registro #{sampleIdx + 1}</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-700">Exemplo (1º com valor)</th>
              </tr>
            </thead>
            <tbody>
              {allKeys.map((k, i) => {
                const v = primeiro ? primeiro[k] : undefined;
                const isEmpty = v === null || v === undefined || String(v).trim() === '';
                const vStr = isEmpty ? '' : String(v).slice(0, 80);
                const cov = coverage[k] || { filled: 0, sample: '' };
                const p = pct(cov.filled);
                return (
                  <tr key={k} className={`border-b border-gray-100 ${isEmpty ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-2 text-gray-400 font-mono text-xs">{i + 1}</td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-800 whitespace-pre max-w-[220px]">
                      {JSON.stringify(k)}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full">
                          <div
                            className={`h-1.5 rounded-full ${p > 80 ? 'bg-green-500' : p > 40 ? 'bg-yellow-400' : 'bg-red-400'}`}
                            style={{ width: `${p}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-7 text-right">{p}%</span>
                      </div>
                    </td>
                    <td className={`px-4 py-2 text-xs max-w-[200px] truncate ${isEmpty ? 'text-red-400 italic' : 'text-gray-700'}`}>
                      {isEmpty ? '(vazio)' : vStr}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-400 max-w-[200px] truncate">
                      {cov.sample || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON bruto do registro amostral */}
      <div>
        <button
          onClick={() => setShowRaw(v => !v)}
          className="text-sm text-[var(--color-primary-600)] hover:underline"
        >
          {showRaw ? '▲ Ocultar' : '▼ Ver'} JSON bruto do registro #{sampleIdx + 1}
        </button>
        {showRaw && primeiro && (
          <pre className="mt-2 text-xs bg-gray-50 p-4 rounded-lg overflow-x-auto border border-gray-200 whitespace-pre-wrap">
            {JSON.stringify(primeiro, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
