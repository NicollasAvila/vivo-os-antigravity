// ============================================================================
// Sidebar — menu de navegação do app (desktop + mobile)
// ============================================================================
//
// PARA ADICIONAR UMA TELA AO MENU, mexa em UM lugar só: o array `NAV_ITEMS`
// abaixo (ícone outline + ícone solid + chave de i18n). O resto — colapso,
// tooltips, mobile, badge, tour — já funciona.
//
// Anatomia (de cima para baixo):
//   marca do app + nome (vindo da plataforma, nunca hardcoded)
//   itens de navegação (badge numérico opcional, ex.: notificações não lidas)
//   rodapé: pessoas online · configurações · guia rápido · idioma · recolher
//
// Comportamento responsivo:
//   - desktop (md+): rail recolhível de 64px ↔ 224px; a preferência persiste;
//   - mobile: top bar fixa de 56px + drawer. O <main> do App.tsx compensa a
//     top bar com `pt-14 md:pt-0` — mantenha isso ao mexer no layout.
// ============================================================================

import React, { useEffect, useState } from 'react';
import {
  Bars3Icon, XMarkIcon, ChevronLeftIcon, ChevronRightIcon, Cog6ToothIcon,
  UsersIcon, CloudArrowDownIcon, CloudArrowUpIcon,
} from '@heroicons/react/24/outline';
import {
  Cog6ToothIcon as Cog6ToothSolid,
  UsersIcon as UsersSolid,
  CloudArrowDownIcon as CloudArrowDownSolid,
  CloudArrowUpIcon as CloudArrowUpSolid,
} from '@heroicons/react/24/solid';
import Tooltip from '../ui/Tooltip';
import AppMark from '../common/AppMark';
import LocaleSwitcher from '../common/LocaleSwitcher';
import TourHelpButton from '../tour/TourHelpButton';
import { useI18n, t } from '../../lib/i18n';
import { useAppName } from '../../hooks/useAppName';
import { readPref, writePref } from '../../lib/storage';

/** Todas as telas navegáveis do app. Mantenha em sincronia com App.tsx. */
export type RouteKey = 'home' | 'dashboard' | 'settings' | 'diag' | 'diag-drive' | 'sync-drive' | 'carga-headcount';

interface NavItem {
  key: RouteKey;
  /** Chave de i18n do rótulo (core ou de um dicionário de domínio). */
  labelKey: string;
  icon: React.ReactNode;
  solidIcon: React.ReactNode;
  /** Contador opcional (ex.: não lidas). 0/undefined esconde o badge. */
  badge?: number;
}

/** O menu inteiro do app. Mantenha em sincronia com App.tsx. */
function navItems(): NavItem[] {
  return [
    {
      key: 'dashboard',
      labelKey: 'nav.dashboard',
      icon: <UsersIcon className="w-5 h-5 shrink-0" />,
      solidIcon: <UsersSolid className="w-5 h-5 shrink-0" />,
    },
    {
      key: 'sync-drive',
      labelKey: 'nav.syncDrive',
      icon: <CloudArrowDownIcon className="w-5 h-5 shrink-0" />,
      solidIcon: <CloudArrowDownSolid className="w-5 h-5 shrink-0" />,
    },
    {
      key: 'carga-headcount',
      labelKey: 'nav.cargaHeadcount',
      icon: <CloudArrowUpIcon className="w-5 h-5 shrink-0" />,
      solidIcon: <CloudArrowUpSolid className="w-5 h-5 shrink-0" />,
    },
  ];
}

interface SidebarProps {
  route: RouteKey;
  onNavigate: (route: RouteKey) => void;
}

const COLLAPSE_PREF = 'sidebar.collapsed';

/** Forma compartilhada dos itens: 36px de altura, radius 8px, gap 12px.
 *  O item ativo é uma PÍLULA tingida (fundo primary-50, texto primary-700) —
 *  é o padrão do Fazello. Não volte para a barrinha lateral. */
function itemClass(active: boolean, expanded: boolean) {
  return [
    'relative w-full flex items-center rounded-lg py-2 text-sm font-medium cursor-pointer transition-all duration-150',
    // Recolhido: sem gap e sem padding-x, senao o rotulo de largura zero ainda
    // ocupa o gap e empurra o icone para a esquerda do centro do rail.
    expanded ? 'gap-3 px-2.5' : 'justify-center gap-0 px-0',
    active
      ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)]'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
  ].filter(Boolean).join(' ');
}

function expandingLabelClass(expanded: boolean) {
  return [
    'min-w-0 truncate whitespace-nowrap transition-all duration-150',
    expanded ? 'max-w-40 translate-x-0 opacity-100' : 'pointer-events-none max-w-0 -translate-x-1 opacity-0',
  ].join(' ');
}

export default function Sidebar({ route, onNavigate }: SidebarProps) {
  const { locale, setLocale } = useI18n();
  const appName = useAppName();
  const [collapsed, setCollapsed] = useState<boolean>(() => readPref(COLLAPSE_PREF) !== 'false');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    writePref(COLLAPSE_PREF, String(collapsed));
  }, [collapsed]);

  const items = navItems();
  const isActive = (key: RouteKey) => route === key;

  const content = (expanded: boolean) => (
    <div className="flex flex-col h-full">
      {/* Marca + nome do app (o nome vem da plataforma — ver lib/appName.ts) */}
      <div className={`flex items-center h-16 shrink-0 ${expanded ? 'gap-2 px-4' : 'justify-center gap-0 px-0'}`}>
        <AppMark size={32} animated />
        <span aria-hidden={!expanded} className={`font-semibold text-gray-900 tracking-tight ${expandingLabelClass(expanded)}`}>
          {appName}
        </span>
      </div>

      <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <Tooltip key={item.key} content={expanded ? '' : t(item.labelKey)} placement="right">
            <button
              onClick={() => { onNavigate(item.key); setMobileOpen(false); }}
              aria-label={t(item.labelKey)}
              aria-current={isActive(item.key) ? 'page' : undefined}
              data-tour={`nav-${item.key}`}
              className={itemClass(isActive(item.key), expanded)}
            >
              {isActive(item.key) ? item.solidIcon : item.icon}
              <span aria-hidden={!expanded} className={expandingLabelClass(expanded)}>{t(item.labelKey)}</span>
              {!!item.badge && item.badge > 0 && (
                expanded ? (
                  <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--color-primary-600)] px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                ) : (
                  <span className="absolute right-2.5 top-1.5 size-2 rounded-full bg-[var(--color-primary-600)] ring-2 ring-white" aria-hidden="true" />
                )
              )}
            </button>
          </Tooltip>
        ))}
      </nav>

      {/* Rodapé: configurações · guia rápido · idioma · recolher.
          Quem está junto aparece na topbar da plataforma, nativamente — o App
          não repete a contagem nem mantém batida de presença própria. */}
      <div className="flex flex-col gap-1 p-2 border-t border-gray-100">
        <Tooltip content={expanded ? '' : t('settings.title')} placement="right">
          <button
            onClick={() => { onNavigate('settings'); setMobileOpen(false); }}
            aria-label={t('settings.title')}
            aria-current={route === 'settings' ? 'page' : undefined}
            data-tour="nav-settings"
            className={itemClass(route === 'settings', expanded)}
          >
            {route === 'settings'
              ? <Cog6ToothSolid className="w-5 h-5 shrink-0" />
              : <Cog6ToothIcon className="w-5 h-5 shrink-0" />}
            <span aria-hidden={!expanded} className={expandingLabelClass(expanded)}>{t('settings.title')}</span>
          </button>
        </Tooltip>

        <TourHelpButton expanded={expanded} onNavigated={() => setMobileOpen(false)} />

        {expanded ? (
          <LocaleSwitcher
            locale={locale}
            onChange={setLocale}
            expanded
            menuPosition="up"
            languageLabel={t('settings.language')}
          />
        ) : (
          <div className="flex justify-center">
            <LocaleSwitcher
              locale={locale}
              onChange={setLocale}
              menuPosition="right"
              languageLabel={t('settings.language')}
            />
          </div>
        )}

        <div className={`hidden md:flex pt-1 ${expanded ? 'justify-end' : 'justify-center'}`}>
          <Tooltip content={collapsed ? t('sidebar.expand') : t('sidebar.collapse')} placement="right">
            <button
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
              className="flex items-center justify-center w-7 h-7 rounded-md text-gray-300 cursor-pointer hover:bg-gray-100 hover:text-gray-600 transition-colors duration-150"
            >
              {collapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronLeftIcon className="w-4 h-4" />}
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Top bar mobile */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center px-4 z-40">
        <Tooltip content={t('sidebar.menu')} placement="bottom">
          <button aria-label={t('sidebar.menu')} onClick={() => setMobileOpen(true)} className="p-2 -ml-2 rounded-md text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors">
            <Bars3Icon className="w-6 h-6" />
          </button>
        </Tooltip>
        <AppMark size={26} animated className="ml-2" />
        <span className="ml-2 font-semibold text-gray-900">{appName}</span>
      </div>

      {/* Drawer mobile */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="fixed inset-0 bg-gray-900/50" onClick={() => setMobileOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl animate-slide-in-left flex flex-col">
            <div className="flex items-center justify-end px-3 pt-3">
              <Tooltip content={t('action.close')} placement="bottom">
                <button aria-label={t('action.close')} onClick={() => setMobileOpen(false)} className="p-1.5 rounded-md text-gray-400 cursor-pointer hover:bg-gray-100 transition-colors">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </Tooltip>
            </div>
            {content(true)}
          </div>
        </div>
      )}

      {/* Sidebar desktop (recolhível) */}
      <aside className={`hidden md:flex flex-col shrink-0 bg-white border-r border-gray-200 transition-all duration-200 ${collapsed ? 'w-16' : 'w-56'}`}>
        {content(!collapsed)}
      </aside>
    </>
  );
}
