// ============================================================================
// ColaboradorDrawer — gaveta lateral com sub-abas: Dados Cadastrais e Histórico Salarial
// ============================================================================
import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  UserIcon,
  CalendarDaysIcon,
  AcademicCapIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import Skeleton from '../ui/Skeleton';
import { db } from '../../lib/seiva';
import {
  Colaborador,
  AlteracaoSalarial,
  colabNome,
  colabEmail,
  colabSalario,
  colabSenioridade,
  colabAdmissao,
  colabArea,
  colabCargo,
  colabEmpresa,
  colabGerente,
  colabCoordenador,
  colabMatricula,
  colabEmailTelefonica,
  colabMatriculaSap,
  colabTipoContratacao,
  colabGrauInstrucao,
  colabSexo,
  colabCentroCusto,
  formatSalario,
  formatData,
} from '../../services/rbac';
import { tHR } from '../../lib/i18nHR';

type Tab = 'dados' | 'historico';

interface ColaboradorDrawerProps {
  colaborador: Colaborador | null;
  onClose: () => void;
}

function motivoColor(motivo: string): 'green' | 'blue' | 'yellow' | 'gray' | 'red' {
  const m = (motivo ?? '').toUpperCase();
  if (m.includes('PROMO')) return 'green';
  if (m.includes('DISSÍDIO') || m.includes('DISSIDIO')) return 'blue';
  if (m.includes('MÉRITO') || m.includes('MERITO')) return 'yellow';
  if (m.includes('AJUSTE')) return 'blue';
  if (m.includes('DESLIGA') || m.includes('DEMISSÃO')) return 'red';
  return 'gray';
}

interface InfoCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function InfoCard({ icon, label, value }: InfoCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
      <div className="mt-0.5 text-[var(--color-primary-600)] shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-gray-900 break-words">{value || '—'}</p>
      </div>
    </div>
  );
}

export default function ColaboradorDrawer({ colaborador, onClose }: ColaboradorDrawerProps) {
  const [tab, setTab] = useState<Tab>('dados');
  const [historico, setHistorico] = useState<AlteracaoSalarial[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);

  // Carrega histórico salarial do objeto enriquecido (vindo do Sheets)
  useEffect(() => {
    if (!colaborador) return;
    setTab('dados');
    setLoadingHist(false);

    // O useRBAC já enriquece cada colaborador com _historico_salarial
    // proveniente da aba ALTERAÇÕES SALARIAIS cruzada por e-mail
    const hist: any[] = (colaborador as any)['_historico_salarial'] ?? [];

    // Ordena do mais recente ao mais antigo
    const sorted = [...hist].sort((a, b) => {
      const dateA = String(a['A PARTIR DE'] ?? a['DATA'] ?? a['data'] ?? a['a_partir_de'] ?? '');
      const dateB = String(b['A PARTIR DE'] ?? b['DATA'] ?? b['data'] ?? b['a_partir_de'] ?? '');
      // Tenta parse de data no formato dd/mm/yyyy
      const parseDate = (d: string) => {
        if (!d) return 0;
        const parts = d.split('/');
        if (parts.length === 3) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
        return new Date(d).getTime() || 0;
      };
      return parseDate(dateB) - parseDate(dateA);
    });

    setHistorico(sorted as AlteracaoSalarial[]);
  }, [colaborador?.id]);

  if (!colaborador) return null;

  const nome = colabNome(colaborador);
  const cargo = colabCargo(colaborador) || '—';
  const empresa = colabEmpresa(colaborador) || '—';
  const email = colabEmail(colaborador);
  const salario = colabSalario(colaborador);
  const senioridade = colabSenioridade(colaborador);
  const admissao = formatData(colabAdmissao(colaborador));
  const dept = colabArea(colaborador) || '—';
  const centroCusto = colabCentroCusto(colaborador) || '—';
  const gerente = colabGerente(colaborador) || '—';
  const coordenador = colabCoordenador(colaborador) || '—';
  const sexo = colabSexo(colaborador) || '—';
  const grauInstrucao = colabGrauInstrucao(colaborador) || '—';
  const tipoContratacao = colabTipoContratacao(colaborador) || '—';
  const emailTelefonica = colabEmailTelefonica(colaborador) || '—';
  const matriculaSap = colabMatriculaSap(colaborador) || '—';
  const matricula = colabMatricula(colaborador) || '—';

  return (
    <>
      {/* Overlay escuro */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900 truncate">{nome}</h2>
            <p className="mt-0.5 text-sm text-gray-500 truncate">{cargo}</p>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <Badge variant="blue">{empresa}</Badge>
              {senioridade && (
                <Badge variant="green">{senioridade}</Badge>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Fechar"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-5">
          <button
            onClick={() => setTab('dados')}
            className={`flex items-center gap-2 py-3 px-1 mr-6 text-sm font-medium border-b-2 transition-colors ${
              tab === 'dados'
                ? 'border-[var(--color-primary-600)] text-[var(--color-primary-700)]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ClipboardDocumentListIcon className="w-4 h-4" />
            {tHR('detail.tab.dados')}
          </button>
          <button
            onClick={() => setTab('historico')}
            className={`flex items-center gap-2 py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              tab === 'historico'
                ? 'border-[var(--color-primary-600)] text-[var(--color-primary-700)]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ChartBarIcon className="w-4 h-4" />
            {tHR('detail.tab.historico')}
            {!loadingHist && historico.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-[var(--color-primary-100)] px-2 py-0.5 text-xs font-semibold text-[var(--color-primary-700)]">
                {historico.length}
              </span>
            )}
          </button>
        </div>

        {/* Conteúdo rolável */}
        <div className="flex-1 overflow-y-auto px-5 py-5">

          {/* ── Sub-aba 1: Dados Cadastrais ── */}
          {tab === 'dados' && (
            <div className="space-y-5">
              {/* Salário em destaque */}
              <div className="rounded-xl bg-[var(--color-primary-50)] border border-[var(--color-primary-200)] p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[var(--color-primary-600)] flex items-center justify-center shrink-0">
                  <BanknotesIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--color-primary-700)] uppercase tracking-wide">Salário Bruto Atual</p>
                  <p className="text-2xl font-semibold text-gray-900 tracking-tight">{formatSalario(salario)}</p>
                </div>
              </div>

              {/* Dados Funcionais */}
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Dados Funcionais</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InfoCard icon={<CalendarDaysIcon className="w-4 h-4" />} label={tHR('detail.admissao')} value={admissao} />
                  <InfoCard icon={<BuildingOfficeIcon className="w-4 h-4" />} label="Empresa" value={empresa} />
                  <InfoCard icon={<BuildingOfficeIcon className="w-4 h-4" />} label={tHR('detail.dept')} value={dept} />
                  <InfoCard icon={<BuildingOfficeIcon className="w-4 h-4" />} label="Centro de Custo" value={centroCusto} />
                  <InfoCard icon={<AcademicCapIcon className="w-4 h-4" />} label={tHR('detail.senioridade')} value={senioridade || '—'} />
                  <InfoCard icon={<UserIcon className="w-4 h-4" />} label="Tipo de Contratação" value={tipoContratacao} />
                  <InfoCard icon={<UserIcon className="w-4 h-4" />} label="Matrícula" value={matricula} />
                  <InfoCard icon={<UserIcon className="w-4 h-4" />} label="Matrícula SAP" value={matriculaSap} />
                  <div className="sm:col-span-2">
                    <InfoCard icon={<UserIcon className="w-4 h-4" />} label="E-mail Telefônica" value={emailTelefonica} />
                  </div>
                </div>
              </div>

              {/* Hierarquia */}
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Hierarquia</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InfoCard icon={<UserIcon className="w-4 h-4" />} label={tHR('detail.gerente')} value={gerente} />
                  <InfoCard icon={<UserIcon className="w-4 h-4" />} label={tHR('detail.coordenador')} value={coordenador} />
                </div>
              </div>

              {/* Perfil Pessoal */}
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Perfil</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InfoCard icon={<UserIcon className="w-4 h-4" />} label="Gênero" value={sexo} />
                  <InfoCard icon={<AcademicCapIcon className="w-4 h-4" />} label="Escolaridade" value={grauInstrucao} />
                  <div className="sm:col-span-2">
                    <InfoCard icon={<UserIcon className="w-4 h-4" />} label="E-mail Corporativo" value={email} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Sub-aba 2: Histórico Salarial ── */}
          {tab === 'historico' && (
            <div>
              {loadingHist ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
                </div>
              ) : historico.length === 0 ? (
                <EmptyState
                  icon={<ChartBarIcon className="w-6 h-6" />}
                  title="Sem histórico salarial"
                  description="Nenhum histórico de alteração salarial registrado para este colaborador."
                />
              ) : (
                <div className="space-y-2">
                  {/* Header */}
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-sm text-gray-500">{historico.length} registro{historico.length !== 1 ? 's' : ''} encontrado{historico.length !== 1 ? 's' : ''}</span>
                  </div>

                  {/* Tabela */}
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead>
                        <tr className="bg-gray-900">
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-100 whitespace-nowrap">{tHR('hist.data')}</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-100 whitespace-nowrap">{tHR('hist.motivo')}</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-100 whitespace-nowrap hidden lg:table-cell">{tHR('hist.cargo_ant')}</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-100 whitespace-nowrap hidden lg:table-cell">{tHR('hist.cargo_novo')}</th>
                          <th className="px-3 py-3 text-right text-xs font-semibold text-gray-100 whitespace-nowrap">{tHR('hist.sal_ant')}</th>
                          <th className="px-3 py-3 text-right text-xs font-semibold text-gray-100 whitespace-nowrap">{tHR('hist.sal_novo')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {historico.map((h, i) => (
                          <tr key={h.id || i} className="hover:bg-gray-50 transition-colors">
                            <td className="px-3 py-3 text-gray-700 whitespace-nowrap font-medium">
                              {formatData(h.a_partir_de ?? h['A PARTIR DE'] ?? h['DATA'] ?? '')}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              {(() => { const m = h.motivo ?? h['MOTIVO'] ?? h['MOTIVO DA ALTERAÇÃO'] ?? ''; return m ? <Badge variant={motivoColor(m)}>{m}</Badge> : <span className="text-gray-400">—</span>; })()}
                            </td>
                            <td className="px-3 py-3 text-gray-500 hidden lg:table-cell max-w-[160px]">
                              {(() => { const v = h.cargo_anterior ?? h['CARGO ANTERIOR'] ?? ''; return <span className="block truncate" title={v}>{v || '—'}</span>; })()}
                            </td>
                            <td className="px-3 py-3 text-gray-700 font-medium hidden lg:table-cell max-w-[160px]">
                              {(() => { const v = h.novo_cargo ?? h['NOVO CARGO'] ?? h['CARGO NOVO'] ?? ''; return <span className="block truncate" title={v}>{v || '—'}</span>; })()}
                            </td>
                            <td className="px-3 py-3 text-right text-gray-500 whitespace-nowrap tabular-nums">
                              {(() => { const v = h.salario_anterior ?? h['SALÁRIO ANTERIOR'] ?? h['SALARIO ANTERIOR'] ?? 0; return Number(v) ? formatSalario(Number(v)) : '—'; })()}
                            </td>
                            <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums">
                              <span className="font-semibold text-[var(--color-primary-700)]">
                                {(() => { const v = h.salario_novo ?? h['SALÁRIO NOVO'] ?? h['SALARIO NOVO'] ?? h['NOVO SALÁRIO'] ?? 0; return Number(v) ? formatSalario(Number(v)) : '—'; })()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Em mobile, mostra colunas de cargo que ficam ocultas na tabela */}
                  <p className="mt-2 text-xs text-gray-400 lg:hidden">
                    * Cargos anteriores e novos visíveis em telas maiores.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
