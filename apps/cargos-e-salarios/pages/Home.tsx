// ============================================================================
// Home — página de exemplo. Substitua o conteúdo pelo primeiro fluxo real,
// mas MANTENHA o esqueleto: ele é o padrão de toda página deste app.
// ============================================================================
//
// Anatomia de uma página:
//   1. `pages.define()` no topo do MÓDULO (não dentro do componente) — registra
//      a tela no manifesto da plataforma (aba Permissions do app);
//   2. cabeçalho via PageHeader: título, subtítulo opcional e ações;
//   3. dados via useCollection (realtime — NUNCA db.list + estado manual);
//   4. estados obrigatórios: erro com nova tentativa, carregando (Skeleton), vazio
//      (EmptyState com ação quando houver um fluxo que resolva o vazio) e conteúdo;
//   5. exclusões passam por ConfirmModal; sucesso/erro viram pushToast.
//
// Container externo: largura total + padding padrão (w-full p-4 md:p-6 lg:p-8).
// Limite de largura, quando necessário, pertence ao conteúdo interno — nunca à página.
// ============================================================================

import React from 'react';
import Button from '../components/ui/Button';
import { RocketLaunchIcon } from '@heroicons/react/24/outline';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import Skeleton from '../components/ui/Skeleton';
import { useCollection } from '../hooks/useCollection';
import { t } from '../lib/i18n';
import { pages } from '../lib/seiva';
import type { RouteKey } from '../components/layout/Sidebar';

pages.define({ path: '/', name: 'Início', description: 'Página inicial do app' });

// Descreva os CAMPOS DO PAYLOAD direto na interface (shape "flat" do db.*).
// Nunca `{ data: {...} }` — ver o aviso no topo de lib/seiva.ts.
interface Item {
  id: string;
  name: string;
  _created_at?: string;
}

interface HomeProps {
  onNavigate: (route: RouteKey) => void;
}

export default function Home(_props: HomeProps) {
  // Troque 'items' pela collection real. O hook já assina realtime,
  // faz refresh em foco e expõe create/update/remove com feedback imediato.
  const { items, loading, error, refresh } = useCollection<Item>('items');

  return (
    <div className="w-full p-4 md:p-6 lg:p-8">
      <PageHeader title={t('home.title')} subtitle={t('home.subtitle')} />

      {loading ? (
        <div role="status" aria-label={t('common.loading')} className="space-y-3 py-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="flex items-center gap-3 border-b border-gray-200 py-4 last:border-b-0">
              <Skeleton rounded="lg" className="size-10 shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-2/5 max-w-64" />
                <Skeleton className="h-3 w-3/5 max-w-96" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="mb-3">{t('common.error')}</p>
          <Button variant="secondary" onClick={() => void refresh()}>{t('action.retry')}</Button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<RocketLaunchIcon className="w-6 h-6" />}
          title={t('home.empty.title')}
          description={t('home.empty.description')}
        />
      ) : (
        <div className="animate-fade-in">
          {/* Conteúdo real da tela. Para grades de cards use <CardGrid>;
              para listas tabulares use <Table> + <Pagination>. */}
        </div>
      )}
    </div>
  );
}
