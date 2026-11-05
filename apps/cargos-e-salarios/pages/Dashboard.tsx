// ============================================================================
// Dashboard — Tela 1: lista de colaboradores com KPIs, filtros e paginação
// ============================================================================
import React, { useState, useMemo, useEffect } from 'react';
import { UsersIcon } from '@heroicons/react/24/outline';
import ColaboradorDrawer from '../components/dashboard/ColaboradorDrawer';
import PageHeader from '../components/ui/PageHeader';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import StatCard from '../components/ui/StatCard';
import Table from '../components/ui/Table';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import Badge from '../components/ui/Badge';
import DashboardCharts from '../components/dashboard/DashboardCharts';
import { ColumnPicker, loadVisibleColumns, saveVisibleColumns } from '../components/dashboard/ColumnPicker';
import type { ColumnDef } from '../components/dashboard/ColumnPicker';
import { pages } from '../lib/seiva';
import { tHR } from '../lib/i18nHR';
import { useRBAC } from '../hooks/useRBAC';
import { formatSalario, Colaborador, colabEmail, colabNome, colabSalario, colabSenioridade, colabArea, colabCargo, colabMatricula, isAtivo } from '../services/rbac';
import type { RouteKey } from '../components/layout/Sidebar';

pages.define({ path: '/dashboard', name: 'Colaboradores', description: 'Lista de colaboradores com filtros e KPIs salariais' });

const PAGE_SIZE = 15;

interface DashboardProps {
  onNavigate: (route: RouteKey) => void;
  onSelectColaborador?: (c: Colaborador) => void;
}

function senioridadeColor(s: string): 'blue' | 'green' | 'yellow' | 'gray' {
  const u = (s ?? '').toUpperCase();
  if (u.includes('SÊNIOR') || u.includes('SENIOR') || u.includes('SR')) return 'green';
  if (u.includes('PLENO') || u.includes('PL')) return 'blue';
  if (u.includes('JÚNIOR') || u.includes('JUNIOR') || u.includes('JR')) return 'yellow';
  return 'gray';
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { visiveis, loading, error } = useRBAC();
  const [busca, setBusca] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroCargo, setFiltroCargo] = useState('');
  const [page, setPage] = useState(1);
  const [selecionado, setSelecionado] = useState<Colaborador | null>(null);
  const [mostrarInativos, setMostrarInativos] = useState(false);

  // --- Gerenciamento de colunas visíveis ---
  const allColumnKeys = ['matricula', 'nome', 'cargo', 'salario', 'email'];
  const columnDefs: ColumnDef[] = [
    { key: 'matricula', label: tHR('col.matricula') },
    { key: 'nome',      label: tHR('col.nome'),    required: true },
    { key: 'cargo',     label: tHR('col.cargo') },
    { key: 'salario',   label: tHR('col.salario') },
    { key: 'email',     label: tHR('col.email') },
  ];
  const [visibleCols, setVisibleCols] = useState<Set<string>>(() =>
    loadVisibleColumns(allColumnKeys)
  );

  // Persiste sempre que mudar
  useEffect(() => { saveVisibleColumns(visibleCols); }, [visibleCols]);

  // Remove registros completamente vazios e, por padrão, filtra inativos
  const comDados = useMemo(() => visiveis.filter((c) => {
    const nome = colabNome(c).trim();
    const email = colabEmail(c).trim();
    const cargo = colabCargo(c).trim();
    if (!nome && !email && !cargo) return false;
    if (!mostrarInativos && !isAtivo(c)) return false;
    return true;
  }), [visiveis, mostrarInativos]);

  const areas = useMemo(() => {
    const set = new Set(comDados.map((c) => colabArea(c)).filter(Boolean));
    return [{ value: '', label: tHR('dashboard.filter.all') }, ...Array.from(set).sort().map((d) => ({ value: d, label: d }))];
  }, [comDados]);

  const cargos = useMemo(() => {
    const set = new Set(comDados.map((c) => colabCargo(c)).filter(Boolean));
    return [{ value: '', label: tHR('dashboard.filter.all') }, ...Array.from(set).sort().map((d) => ({ value: d, label: d }))];
  }, [comDados]);

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase();
    return comDados.filter((c) => {
      if (q) {
        const nome = colabNome(c).toLowerCase();
        const email = colabEmail(c).toLowerCase();
        const cargo = colabCargo(c).toLowerCase();
        const mat = colabMatricula(c).toLowerCase();
        if (!nome.includes(q) && !email.includes(q) && !cargo.includes(q) && !mat.includes(q)) return false;
      }
      const area = colabArea(c);
      if (filtroArea && area !== filtroArea) return false;
      if (filtroCargo && colabCargo(c) !== filtroCargo) return false;
      return true;
    });
  }, [comDados, busca, filtroArea, filtroCargo]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const pagina = filtrados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Para os gráficos: usa filtrados (responde aos filtros aplicados)
  const colaboradoresParaGraficos = filtrados;

  const allColumns = [
    {
      key: 'matricula',
      label: tHR('col.matricula'),
      className: 'w-24',
      render: (_: unknown, row: Colaborador) => (
        <span className="font-mono text-xs text-gray-500">{colabMatricula(row) || '—'}</span>
      ),
    },
    {
      key: 'nome',
      label: tHR('col.nome'),
      render: (_: unknown, row: Colaborador) => (
        <span className="font-medium text-gray-900">{colabNome(row)}</span>
      ),
    },
    {
      key: 'cargo',
      label: tHR('col.cargo'),
      render: (_: unknown, row: Colaborador) => (
        <span className="text-gray-700">{colabCargo(row) || '—'}</span>
      ),
    },
    {
      key: 'salario',
      label: tHR('col.salario'),
      numeric: true,
      render: (_: unknown, row: Colaborador) => (
        <span className="font-semibold text-gray-900">{formatSalario(colabSalario(row))}</span>
      ),
    },
    {
      key: 'email',
      label: tHR('col.email'),
      render: (_: unknown, row: Colaborador) => (
        <span className="text-xs text-gray-500">{colabEmail(row)}</span>
      ),
    },
  ];

  // Filtra apenas as colunas marcadas como visíveis (mantendo a ordem original)
  const columns = allColumns.filter((c) => visibleCols.has(c.key));

  if (error) {
    return (
      <div className="w-full p-4 md:p-6 lg:p-8 space-y-4">
        <PageHeader title="Colaboradores" subtitle="Lista de colaboradores" />
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-semibold text-red-800 mb-1">Erro ao carregar dados do Google Sheets</p>
          <p className="text-sm text-red-700 mb-3">{error}</p>
          <p className="text-xs text-red-600 font-medium mb-1">O que verificar:</p>
          <ul className="text-xs text-red-600 list-disc list-inside space-y-1">
            <li>A tool <strong>get_dados_drive</strong> está configurada com o <strong>spreadsheet_id</strong> correto?</li>
            <li>A conta Google conectada tem acesso à planilha?</li>
            <li>Abra o console do navegador (F12) e veja os logs <code>[useRBAC]</code> para detalhes</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="w-full p-4 md:p-6 lg:p-8 space-y-6">
      <PageHeader title={tHR('dashboard.title')} subtitle={tHR('dashboard.subtitle')} />

      {/* KPI — Total */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <StatCard
            icon={<UsersIcon className="w-5 h-5" />}
            label={tHR('dashboard.kpi.total')}
            value={filtrados.length}
            tone="default"
          />
        </div>
      )}

      {/* Gráficos */}
      {!loading && comDados.length > 0 && (
        <DashboardCharts colaboradores={colaboradoresParaGraficos} />
      )}

      {/* Filtros + seletor de colunas */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px]">
          <Input
            label=""
            placeholder={tHR('dashboard.search')}
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPage(1); }}
          />
        </div>
        <div className="min-w-[180px]">
          <Select
            options={areas}
            value={filtroArea}
            onChange={(v) => { setFiltroArea(v); setPage(1); }}
            placeholder={tHR('dashboard.filter.dept')}
          />
        </div>
        <div className="min-w-[180px]">
          <Select
            options={cargos}
            value={filtroCargo}
            onChange={(v) => { setFiltroCargo(v); setPage(1); }}
            placeholder={tHR('dashboard.filter.cargo')}
          />
        </div>
        <button
          onClick={() => setMostrarInativos((v) => !v)}
          title={mostrarInativos ? 'Ocultar colaboradores inativos' : 'Mostrar colaboradores inativos'}
          className={[
            'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap',
            mostrarInativos
              ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
              : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700'
          ].join(' ')}
        >
          <span className={['w-2 h-2 rounded-full flex-shrink-0', mostrarInativos ? 'bg-amber-400' : 'bg-gray-300'].join(' ')} />
          <span className="hidden sm:inline">{mostrarInativos ? 'Inativos visíveis' : 'Ocultar inativos'}</span>
          <span className="sm:hidden">{mostrarInativos ? 'Inativos' : 'Ativos'}</span>
        </button>
        <div className="ml-auto">
          <ColumnPicker
            columns={columnDefs}
            visible={visibleCols}
            onChange={setVisibleCols}
          />
        </div>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon={<UsersIcon className="w-6 h-6" />}
          title={tHR('dashboard.empty')}
          description={tHR('dashboard.empty.desc')}
        />
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {pagina.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelecionado(c)}
                className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-[var(--color-primary-200)] hover:bg-[var(--color-primary-50)] transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{colabNome(c)}</p>
                    <p className="text-sm text-gray-500 truncate">{colabCargo(c)}</p>
                    <p className="text-xs text-gray-400 truncate">{colabArea(c)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-gray-900 text-sm">{formatSalario(colabSalario(c))}</p>
                    <Badge variant={senioridadeColor(colabSenioridade(c))}>{colabSenioridade(c) || '—'}</Badge>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Desktop: tabela */}
          <div className="hidden md:block">
              <Table
                columns={columns}
                data={pagina}
                onRowClick={(row) => setSelecionado(row as Colaborador)}
                emptyMessage={tHR('dashboard.empty')}
              />
          </div>

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={filtrados.length}
            onPageChange={setPage}
          />
        </>
      )}
    </div>

    {/* Drawer lateral de detalhes */}
    {selecionado && (
      <ColaboradorDrawer
        colaborador={selecionado}
        onClose={() => setSelecionado(null)}
      />
    )}
    </>
  );
}
