// ============================================================================
// DetalheColaborador — Tela 2: dados cadastrais + histórico salarial em abas
// ============================================================================
import React, { useState, useMemo } from 'react';
import { ArrowLeftIcon, UserCircleIcon, CalendarIcon, BuildingOfficeIcon, AcademicCapIcon, UserIcon } from '@heroicons/react/24/outline';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import EmptyState from '../components/ui/EmptyState';
import { useCollection } from '../hooks/useCollection';
import { tHR } from '../lib/i18nHR';
import { Colaborador, AlteracaoSalarial, formatSalario, parseSalario, formatData, colabEmail, colabNome, colabSalario, colabSenioridade, colabAdmissao, colabEmailCoord, colabMatricula } from '../services/rbac';

interface DetalheColaboradorProps {
  colaborador: Colaborador;
  onBack: () => void;
}

type Tab = 'dados' | 'historico';

const MOTIVO_COLORS: Record<string, 'green' | 'blue' | 'yellow' | 'red' | 'gray'> = {
  'MÉRITO': 'green',
  'MERITO': 'green',
  'PROMOÇÃO': 'blue',
  'PROMOCAO': 'blue',
  'ENQUADRAMENTO': 'yellow',
  'TRANSFERÊNCIA': 'yellow',
  'TRANSFERENCIA': 'yellow',
  'RESCISÃO': 'red',
  'RESCISAO': 'red',
};

function motivoColor(motivo: string): 'green' | 'blue' | 'yellow' | 'red' | 'gray' {
  const up = (motivo ?? '').toUpperCase().trim();
  for (const [key, color] of Object.entries(MOTIVO_COLORS)) {
    if (up.includes(key)) return color;
  }
  return 'gray';
}

// helpers para ler campos canônicos OU originais do Excel
function hData(row: AlteracaoSalarial): string {
  return String((row as any).a_partir_de || (row as any)['A PARTIR DE'] || '');
}
function hMotivo(row: AlteracaoSalarial): string {
  return String((row as any).motivo || (row as any)['MOTIVO'] || '');
}
function hCargoAnt(row: AlteracaoSalarial): string {
  return String((row as any).cargo_anterior || (row as any)['CARGO ANTERIOR'] || '—');
}
function hCargoNovo(row: AlteracaoSalarial): string {
  return String((row as any).novo_cargo || (row as any)['NOVO CARGO'] || '—');
}
function hSalAnt(row: AlteracaoSalarial): number {
  const v = (row as any).salario_anterior !== undefined ? (row as any).salario_anterior : (row as any)['SALÁRIO ANTERIOR'];
  return parseSalario(v);
}
function hSalNovo(row: AlteracaoSalarial): number {
  const v = (row as any).salario_novo !== undefined ? (row as any).salario_novo : (row as any)['SALÁRIO NOVO'];
  return parseSalario(v);
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="text-gray-400 mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm text-gray-900 mt-0.5 font-medium">{value || '—'}</p>
      </div>
    </div>
  );
}

export default function DetalheColaborador({ colaborador, onBack }: DetalheColaboradorProps) {
  const [tab, setTab] = useState<Tab>('dados');
  const { items: alteracoes, loading } = useCollection<AlteracaoSalarial>('alteracoes_salariais');

  const emailColab = colabEmail(colaborador);
  const matriculaColab = colabMatricula(colaborador);
  const nomeColab = colabNome(colaborador).toLowerCase().trim();

  const historico = useMemo(() => {
    return (alteracoes ?? [])
      .filter((a: any) => {
        // 1) por e-mail canônico ou campo original do Excel
        const emailA = String(a.email_colaborador || a['E-MAIL COLABORADOR'] || '').toLowerCase().trim();
        if (emailA && emailColab && emailA === emailColab) return true;
        // 2) fallback por matrícula
        const matA = String(a.matricula ?? a['MATRÍCULA'] ?? '').replace(/\.0+$/, '').trim();
        if (matA && matriculaColab && matA === matriculaColab) return true;
        // 3) fallback por nome completo
        const nomeA = String(a.colaborador ?? a['COLABORADOR'] ?? '').toLowerCase().trim();
        if (nomeA && nomeColab && nomeA === nomeColab) return true;
        return false;
      })
      .sort((a: any, b: any) => new Date(hData(b)).getTime() - new Date(hData(a)).getTime());
  }, [alteracoes, emailColab, matriculaColab, nomeColab]);

  const histColumns = [
    { key: 'a_partir_de', label: tHR('hist.data'), render: (_: unknown, row: AlteracaoSalarial) => (
      <span className="font-mono text-xs">{formatData(hData(row))}</span>
    )},
    { key: 'motivo', label: tHR('hist.motivo'), render: (_: unknown, row: AlteracaoSalarial) => (
      <Badge variant={motivoColor(hMotivo(row))}>{hMotivo(row) || '—'}</Badge>
    )},
    { key: 'cargo_anterior', label: tHR('hist.cargo_ant'), className: 'hidden md:table-cell text-gray-500 text-sm',
      render: (_: unknown, row: AlteracaoSalarial) => <span>{hCargoAnt(row)}</span> },
    { key: 'novo_cargo', label: tHR('hist.cargo_novo'), className: 'hidden md:table-cell text-sm',
      render: (_: unknown, row: AlteracaoSalarial) => <span>{hCargoNovo(row)}</span> },
    { key: 'salario_anterior', label: tHR('hist.sal_ant'), className: 'hidden lg:table-cell', render: (_: unknown, row: AlteracaoSalarial) => (
      <span className="text-gray-500">{formatSalario(hSalAnt(row))}</span>
    )},
    { key: 'salario_novo', label: tHR('hist.sal_novo'), render: (_: unknown, row: AlteracaoSalarial) => (
      <span className="font-semibold text-[var(--color-primary-700)]">{formatSalario(hSalNovo(row))}</span>
    )},
  ];

  const tabClass = (t: Tab) =>
    `px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
      tab === t
        ? 'border-[var(--color-primary-600)] text-[var(--color-primary-700)]'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`;

  return (
    <div className="w-full p-4 md:p-6 lg:p-8 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" icon={<ArrowLeftIcon className="w-4 h-4" />} onClick={onBack} aria-label="Voltar">
          <span className="hidden sm:inline">Voltar</span>
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-gray-900 tracking-tight truncate">{colabNome(colaborador)}</h1>
          <p className="text-sm text-gray-500 truncate">{colaborador.cargo} · {colaborador.departamento}</p>
        </div>
      </div>

      {/* Card de resumo */}
      <Card>
        <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[var(--color-primary-50)] shrink-0">
            <UserCircleIcon className="w-10 h-10 text-[var(--color-primary-600)]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-gray-900">{colabNome(colaborador)}</p>
            <p className="text-sm text-gray-500">{colabEmail(colaborador)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Matrícula: {colaborador.matricula || '—'}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-2xl font-bold text-[var(--color-primary-700)]">{formatSalario(colabSalario(colaborador))}</p>
            <p className="text-xs text-gray-400">Salário Bruto</p>
          </div>
        </div>
      </Card>

      {/* Abas */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0 -mb-px">
          <button className={tabClass('dados')} onClick={() => setTab('dados')}>{tHR('detail.tab.dados')}</button>
          <button className={tabClass('historico')} onClick={() => setTab('historico')}>
            {tHR('detail.tab.historico')}
            {historico.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-[var(--color-primary-100)] text-[var(--color-primary-700)] text-xs font-semibold px-1.5 py-0.5">
                {historico.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Aba Dados Cadastrais */}
      {tab === 'dados' && (
        <Card>
          <div className="p-4 md:p-5">
            <InfoRow icon={<CalendarIcon className="w-4 h-4" />} label={tHR('detail.admissao')} value={formatData(colabAdmissao(colaborador))} />
            <InfoRow icon={<BuildingOfficeIcon className="w-4 h-4" />} label={tHR('detail.dept')} value={colaborador.departamento ?? ''} />
            <InfoRow icon={<AcademicCapIcon className="w-4 h-4" />} label={tHR('detail.senioridade')} value={colabSenioridade(colaborador)} />
            <InfoRow icon={<UserIcon className="w-4 h-4" />} label={tHR('detail.gerente')} value={`${colaborador.gerente || '—'}${colaborador.email_gerente ? ` (${colaborador.email_gerente})` : ''}`} />
            {(colaborador.coordenador || colaborador.coordenador_supervisor) && (
              <InfoRow icon={<UserIcon className="w-4 h-4" />} label={tHR('detail.coordenador')} value={`${colaborador.coordenador || colaborador.coordenador_supervisor || ''}${colabEmailCoord(colaborador) ? ` (${colabEmailCoord(colaborador)})` : ''}`} />
            )}
          </div>
        </Card>
      )}

      {/* Aba Histórico Salarial */}
      {tab === 'historico' && (
        <div>
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
            </div>
          ) : historico.length === 0 ? (
            <EmptyState
              icon={<CalendarIcon className="w-6 h-6" />}
              title={tHR('hist.empty')}
              description=""
            />
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {historico.map((h) => (
                  <Card key={h.id}>
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-gray-500">{formatData(hData(h))}</span>
                        <Badge variant={motivoColor(hMotivo(h))}>{hMotivo(h) || '—'}</Badge>
                      </div>
                      <div className="text-xs text-gray-500">{hCargoAnt(h)} → <span className="text-gray-900 font-medium">{hCargoNovo(h)}</span></div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">{formatSalario(hSalAnt(h))}</span>
                        <span className="font-semibold text-[var(--color-primary-700)]">{formatSalario(hSalNovo(h))}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              {/* Desktop tabela */}
              <div className="hidden md:block">
                <Table columns={histColumns} data={historico} emptyMessage={tHR('hist.empty')} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
