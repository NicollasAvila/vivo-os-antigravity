// ============================================================================
// CargaHeadcount — Tela de publicação do headcount em rh.headcount_publicado
// ============================================================================
// STATUS DE PROVISIONAMENTO:
//   Esta tela escreve em rh.headcount_publicado (DuckLake workspace-level).
//   Enquanto o pack rh não estiver ativado no workspace, a tela exibe um
//   painel de instruções. Após ativação e grant, funciona automaticamente.
// ============================================================================
import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowPathIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { pages } from '../lib/seiva';
import { useRBAC } from '../hooks/useRBAC';
import {
  colabNome, colabEmail, colabCargo, colabArea, colabCentroCusto,
  colabGerente, colabSenioridade, colabSituacao, colabEmpresa, colabAdmissao,
  isAtivo,
} from '../services/rbac';
import type { Colaborador } from '../services/rbac';
import { pushToast } from '../hooks/useToast';

declare const seiva: any;

pages.define({
  path: '/carga-headcount',
  name: 'Carga Headcount',
  description: 'Publica snapshot do headcount ativo na tabela compartilhada rh.headcount_publicado',
});

const PACK = 'rh';
const TABLE = 'headcount_publicado';
const LAST_CARGA_KEY = 'headcount.ultima_carga';

interface UltimaCarga {
  timestamp: string;
  total_linhas: number;
  status: 'ok' | 'erro';
  mensagem?: string;
}

/** Mapeia um Colaborador para uma linha sem PII sensível */
function toHeadcountRow(c: Colaborador, agora: string) {
  return {
    nome_completo:     colabNome(c) || '',
    email_ipnet:       colabEmail(c) || '',
    cargo:             colabCargo(c) || '',
    area:              colabArea(c) || '',
    centro_de_custo:   colabCentroCusto(c) || '',
    gerente:           colabGerente(c) || '',
    nivel_senioridade: colabSenioridade(c) || '',
    situacao:          colabSituacao(c) || '',
    empresa:           colabEmpresa(c) || '',
    admissao_contratual: colabAdmissao(c) || null,
    data_carga:        agora,
  };
}


export default function CargaHeadcount() {
  const { visiveis, loading: loadingRBAC } = useRBAC();

  const [grantStatus, setGrantStatus] = useState<'verificando' | 'ok' | 'sem_grant' | 'pack_nao_existe' | 'erro'>('pack_nao_existe');
  const [grantErro, setGrantErro] = useState('');

  const [publicando, setPublicando] = useState(false);
  const [ultimaCarga, setUltimaCarga] = useState<UltimaCarga | null>(null);

  const [previewRows, setPreviewRows] = useState<ReturnType<typeof toHeadcountRow>[]>([]);
  const [totalAtivos, setTotalAtivos] = useState(0);

  // ---- Lê última carga do storage local ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAST_CARGA_KEY);
      if (raw) {
        const parsed: UltimaCarga = JSON.parse(raw);
        setUltimaCarga(parsed);
        // Se a última carga foi bem-sucedida, assume grant ok para mostrar UI de carga
        if (parsed.status === 'ok') setGrantStatus('ok');
      }
    } catch {}
  }, []);

  // ---- Monta preview quando os colaboradores estão prontos ----
  useEffect(() => {
    if (loadingRBAC || !visiveis.length) return;
    const agora = new Date().toISOString();
    const ativos = visiveis.filter((c) => {
      if (!colabEmail(c).trim()) return false; // chave natural obrigatória
      return isAtivo(c);
    });
    setTotalAtivos(ativos.length);
    setPreviewRows(ativos.slice(0, 10).map((c) => toHeadcountRow(c, agora)));
  }, [visiveis, loadingRBAC]);

  // ---- Publicar snapshot ----
  const publicar = useCallback(async () => {
    setPublicando(true);
    try {
      const agora = new Date().toISOString();
      const ativos = visiveis.filter((c) => {
        if (!colabEmail(c).trim()) return false;
        return isAtivo(c);
      });

      if (ativos.length === 0) {
        pushToast('info', 'Nenhum colaborador ativo com e-mail para publicar.');
        return;
      }

      const rows = ativos.map((c) => toHeadcountRow(c, agora));

      await seiva.ducklake(PACK).table(TABLE).bulkIngest(rows, {
        mode: 'replace',
        partitionKey: { fonte: 'px_cargos_salarios' },
        idempotencyKey: `px-headcount-${agora.slice(0, 10)}`,
      });

      const novaUltima: UltimaCarga = { timestamp: agora, total_linhas: rows.length, status: 'ok' };
      setUltimaCarga(novaUltima);
      setGrantStatus('ok');
      localStorage.setItem(LAST_CARGA_KEY, JSON.stringify(novaUltima));
      pushToast('success', `${rows.length} colaboradores publicados em rh.headcount_publicado.`);
    } catch (e: any) {
      const msg = e?.message || String(e);
      const msgLower = msg.toLowerCase();
      if (msgLower.includes('403') || msgLower.includes('grant') || msgLower.includes('forbidden')) {
        setGrantStatus('sem_grant');
        pushToast('error', 'Sem permissão de escrita em rh.headcount_publicado. Solicite o grant ao admin.');
      } else if (msgLower.includes('404') || msgLower.includes('not found') || msgLower.includes('pack')) {
        setGrantStatus('pack_nao_existe');
        pushToast('error', 'Pack rh não encontrado. Solicite ao admin que crie a tabela.');
      } else {
        const novaUltima: UltimaCarga = { timestamp: new Date().toISOString(), total_linhas: 0, status: 'erro', mensagem: msg };
        setUltimaCarga(novaUltima);
        localStorage.setItem(LAST_CARGA_KEY, JSON.stringify(novaUltima));
        pushToast('error', 'Erro ao publicar: ' + msg);
      }
    } finally {
      setPublicando(false);
    }
  }, [visiveis]);

  // ============================================================
  // RENDER: pack não existe
  // ============================================================
  if (grantStatus === 'verificando') {
    return (
      <div className="w-full p-4 md:p-6 lg:p-8 space-y-6">
        <PageHeader title="Carga Headcount" subtitle="Publicação na tabela compartilhada rh.headcount_publicado" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (grantStatus === 'pack_nao_existe' || grantStatus === 'sem_grant') {
    return (
      <div className="w-full p-4 md:p-6 lg:p-8 space-y-6">
        <PageHeader title="Carga Headcount" subtitle="Publicação na tabela compartilhada rh.headcount_publicado" />

        <Card padding="lg">
          <div className="flex gap-4">
            <ExclamationTriangleIcon className="w-8 h-8 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-gray-900">
                {grantStatus === 'pack_nao_existe'
                  ? 'Pack rh não foi provisionado no workspace'
                  : 'Este app não tem permissão de escrita em rh.headcount_publicado'}
              </h2>
              <p className="text-sm text-gray-600">
                A tabela <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">rh.headcount_publicado</code> é
                uma fonte DuckLake de nível workspace — compartilhada entre múltiplos apps.
                Ela precisa ser criada e concedida por um admin antes de qualquer carga.
              </p>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                <p className="text-sm font-semibold text-amber-800">O que o admin precisa fazer:</p>
                <ol className="text-sm text-amber-700 list-decimal list-inside space-y-1.5">
                  <li>
                    Acessar <strong>Mogno → Data → Manage sources</strong>
                  </li>
                  <li>
                    Criar um novo <strong>Analytics Source (DuckLake)</strong> com pack key <code className="bg-amber-100 px-1 rounded font-mono text-xs">rh</code>
                  </li>
                  <li>
                    Criar a tabela <code className="bg-amber-100 px-1 rounded font-mono text-xs">headcount_publicado</code> com as colunas listadas abaixo
                  </li>
                  <li>
                    Conceder <strong>read + write</strong> para o app <em>PX Cargos e Salários</em>
                  </li>
                  <li>
                    Conceder <strong>read</strong> para qualquer app consumidor
                  </li>
                </ol>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-700 mb-2">Schema da tabela headcount_publicado:</p>
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="text-gray-500">
                      <th className="text-left pb-1 pr-4">Coluna</th>
                      <th className="text-left pb-1 pr-4">Tipo</th>
                      <th className="text-left pb-1">Observação</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700 space-y-1">
                    {[
                      ['nome_completo',     'TEXT',      ''],
                      ['email_ipnet',       'TEXT',      'chave natural (único)'],
                      ['cargo',             'TEXT',      ''],
                      ['area',              'TEXT',      ''],
                      ['centro_de_custo',   'TEXT',      ''],
                      ['gerente',           'TEXT',      ''],
                      ['nivel_senioridade', 'TEXT',      ''],
                      ['situacao',         'TEXT',      ''],
                      ['empresa',           'TEXT',      ''],
                      ['admissao_contratual','DATE',     ''],
                      ['data_carga',        'TIMESTAMP', 'preenchido automaticamente'],
                    ].map(([col, tipo, obs]) => (
                      <tr key={col} className="border-t border-gray-100">
                        <td className="py-1 pr-4 text-[var(--color-primary-700)]">{col}</td>
                        <td className="py-1 pr-4 text-gray-500">{tipo}</td>
                        <td className="py-1 text-gray-400 font-sans">{obs}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <InformationCircleIcon className="w-4 h-4" />
                Nenhuma coluna de PII sensível (CPF, salário, dados bancários) é incluída nesta tabela.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // ============================================================
  // RENDER: grant ok — tela de carga funcional
  // ============================================================
  return (
    <div className="w-full p-4 md:p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Carga Headcount"
        subtitle="Publica snapshot dos colaboradores ativos em rh.headcount_publicado"
        actions={
          <Button
            icon={<CloudArrowUpIcon className="w-4 h-4" />}
            loading={publicando}
            disabled={loadingRBAC || grantStatus !== 'ok'}
            onClick={publicar}
          >
            {publicando ? 'Publicando…' : 'Publicar agora'}
          </Button>
        }
      />

      {/* Painel de última carga */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card: status da última carga */}
        <Card padding="md" className="md:col-span-2">
          <div className="flex items-start gap-3">
            {ultimaCarga ? (
              ultimaCarga.status === 'ok' ? (
                <CheckCircleIcon className="w-6 h-6 text-green-500 shrink-0 mt-0.5" />
              ) : (
                <ExclamationTriangleIcon className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
              )
            ) : (
              <InformationCircleIcon className="w-6 h-6 text-gray-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-sm font-semibold text-gray-900">Última carga</p>
              {ultimaCarga ? (
                <>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {new Date(ultimaCarga.timestamp).toLocaleString('pt-BR', {
                      timeZone: seiva?.timezone || 'America/Sao_Paulo',
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                    {' · '}
                    <span className="font-medium">{ultimaCarga.total_linhas.toLocaleString('pt-BR')} linhas</span>
                  </p>
                  {ultimaCarga.status === 'erro' && (
                    <p className="text-xs text-red-600 mt-1">{ultimaCarga.mensagem}</p>
                  )}
                  <Badge variant={ultimaCarga.status === 'ok' ? 'green' : 'red'} className="mt-2">
                    {ultimaCarga.status === 'ok' ? 'Sucesso' : 'Erro'}
                  </Badge>
                </>
              ) : (
                <p className="text-sm text-gray-400 mt-0.5">Nenhuma carga realizada ainda.</p>
              )}
            </div>
          </div>
        </Card>

        {/* Card: próxima carga */}
        <Card padding="md">
          <p className="text-sm font-semibold text-gray-900 mb-1">Próxima carga</p>
          {loadingRBAC ? (
            <Skeleton className="h-6 w-20 rounded" />
          ) : (
            <>
              <p className="text-2xl font-bold text-[var(--color-primary-600)]">
                {totalAtivos.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">colaboradores ativos com e-mail</p>
            </>
          )}
        </Card>
      </div>

      {/* Preview das primeiras linhas */}
      <Card padding="none">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TableCellsIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-900">Preview — primeiras 10 linhas</span>
          </div>
          <span className="text-xs text-gray-400">Sem PII · somente campos públicos</span>
        </div>

        {loadingRBAC ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-10 rounded" />)}
          </div>
        ) : previewRows.length === 0 ? (
          <EmptyState
            icon={<TableCellsIcon className="w-6 h-6" />}
            title="Sem dados para preview"
            description="Aguarde o carregamento dos colaboradores ou verifique a conexão com o Google Sheets."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  {['Nome', 'E-mail', 'Cargo', 'Área', 'Senioridade', 'Situação', 'Empresa'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {previewRows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap max-w-[180px] truncate">{row.nome_completo || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap max-w-[180px] truncate">{row.email_ipnet || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap max-w-[160px] truncate">{row.cargo || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap max-w-[140px] truncate">{row.area || '—'}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {row.nivel_senioridade ? (
                        <Badge variant="blue">{row.nivel_senioridade}</Badge>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {row.situacao ? (
                        <Badge variant={row.situacao.toUpperCase().includes('ATIV') ? 'green' : 'gray'}>
                          {row.situacao}
                        </Badge>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{row.empresa || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalAtivos > 10 && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  Mostrando 10 de {totalAtivos.toLocaleString('pt-BR')} colaboradores ativos.
                  A carga completa publica todos.
                </p>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
