// ============================================================================
// Organograma — Tela 3: árvore hierárquica baseada em email_gerente
// ============================================================================
import React, { useState, useMemo } from 'react';
import { ChevronDownIcon, ChevronRightIcon, UserCircleIcon, UsersIcon } from '@heroicons/react/24/outline';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import Badge from '../components/ui/Badge';
import { pages } from '../lib/seiva';
import { tHR } from '../lib/i18nHR';
import { useRBAC } from '../hooks/useRBAC';
import { Colaborador, formatSalario, colabEmail, colabNome, colabSalario, colabSenioridade } from '../services/rbac';
import type { RouteKey } from '../components/layout/Sidebar';

pages.define({ path: '/organograma', name: 'Organograma', description: 'Hierarquia visual dos colaboradores visíveis' });

interface OrgNode {
  colaborador: Colaborador;
  subordinados: OrgNode[];
}

function buildTree(visiveis: Colaborador[]): OrgNode[] {
  const byEmail = new Map<string, Colaborador>();
  visiveis.forEach((c) => {
    const em = colabEmail(c);
    if (em) byEmail.set(em, c);
  });

  const temGerente = (c: Colaborador) => {
    const g = c.email_gerente?.toLowerCase().trim();
    return g && g !== colabEmail(c) && byEmail.has(g);
  };

  const raizes = visiveis.filter((c) => !temGerente(c));

  function buildNode(c: Colaborador, visited = new Set<string>()): OrgNode {
    const email = colabEmail(c);
    visited.add(email);
    const subs = visiveis
      .filter((s) => {
        const g = s.email_gerente?.toLowerCase().trim();
        const se = colabEmail(s);
        return g === email && se !== email && !visited.has(se);
      })
      .map((s) => buildNode(s, new Set(visited)));
    return { colaborador: c, subordinados: subs };
  }

  return raizes.map((r) => buildNode(r));
}

interface NodeCardProps {
  node: OrgNode;
  depth: number;
  onSelect: (c: Colaborador) => void;
}

function NodeCard({ node, depth, onSelect }: NodeCardProps) {
  const [expanded, setExpanded] = useState(depth < 2);
  const { colaborador: c, subordinados } = node;
  const hasChildren = subordinados.length > 0;

  return (
    <div className={`${depth > 0 ? 'ml-4 md:ml-8 border-l-2 border-gray-100 pl-3 md:pl-4' : ''}`}>
      <div className="flex items-start gap-2 py-1.5 group">
        {hasChildren ? (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="mt-1 shrink-0 text-gray-400 hover:text-gray-700 transition-colors"
            aria-label={expanded ? 'Recolher' : 'Expandir'}
          >
            {expanded
              ? <ChevronDownIcon className="w-4 h-4" />
              : <ChevronRightIcon className="w-4 h-4" />}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        <button
          onClick={() => onSelect(c)}
          className="flex-1 min-w-0 text-left bg-white border border-gray-200 rounded-xl p-3 hover:border-[var(--color-primary-200)] hover:bg-[var(--color-primary-50)] transition-colors shadow-sm"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--color-primary-100)] flex items-center justify-center">
              <UserCircleIcon className="w-5 h-5 text-[var(--color-primary-600)]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-gray-900 text-sm truncate">{colabNome(c)}</p>
                {colabSenioridade(c) && (
                  <Badge variant="blue">{colabSenioridade(c)}</Badge>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate mt-0.5">{c.cargo}</p>
              <p className="text-xs text-gray-400 truncate">{c.departamento}</p>
            </div>
            <div className="shrink-0 text-right hidden sm:block">
              <p className="text-sm font-semibold text-[var(--color-primary-700)]">{formatSalario(colabSalario(c))}</p>
              {hasChildren && (
                <p className="text-xs text-gray-400">{subordinados.length} subordinado{subordinados.length !== 1 ? 's' : ''}</p>
              )}
            </div>
          </div>
        </button>
      </div>

      {expanded && hasChildren && (
        <div>
          {subordinados.map((sub) => (
            <NodeCard key={sub.colaborador.id} node={sub} depth={depth + 1} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

interface OrganoramaProps {
  onNavigate: (route: RouteKey) => void;
  onSelectColaborador: (c: Colaborador) => void;
}

export default function Organograma({ onSelectColaborador }: OrganoramaProps) {
  const { visiveis, loading } = useRBAC();

  const tree = useMemo(() => buildTree(visiveis), [visiveis]);

  return (
    <div className="w-full p-4 md:p-6 lg:p-8 space-y-6">
      <PageHeader title={tHR('org.title')} subtitle={tHR('org.subtitle')} />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className={`h-16 rounded-xl ${i > 0 ? 'ml-8' : ''}`} />
          ))}
        </div>
      ) : visiveis.length === 0 ? (
        <EmptyState
          icon={<UsersIcon className="w-6 h-6" />}
          title={tHR('org.empty')}
          description={tHR('org.empty.desc')}
        />
      ) : (
        <div className="space-y-1">
          {tree.map((node) => (
            <NodeCard key={node.colaborador.id} node={node} depth={0} onSelect={onSelectColaborador} />
          ))}
        </div>
      )}
    </div>
  );
}
