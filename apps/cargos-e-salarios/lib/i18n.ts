// ============================================================================
// i18n — runtime de idiomas do app (pt-BR / en / es)
// ============================================================================
//
// COMO USAR (leia antes de criar qualquer texto de interface):
//
//   1. NUNCA escreva texto literal em um componente. Todo texto visível passa
//      por um tradutor, mesmo que o app "só precise de português" hoje.
//
//   2. Strings de uso geral (ações, navegação, toasts, estados vazios) vivem
//      no dicionário CORE deste arquivo. Use `t('action.save')`.
//
//   3. Strings de um domínio/feature novo NÃO entram aqui. Crie um arquivo
//      próprio (ex.: `lib/i18nRelatorios.ts`) com `makeTranslator`:
//
//        import { makeTranslator } from './i18n';
//        export const tRel = makeTranslator({
//          'pt-BR': { 'rel.title': 'Relatórios' },
//          en:      { 'rel.title': 'Reports' },
//          es:      { 'rel.title': 'Informes' },
//        });
//
//      Isso mantém este arquivo pequeno e evita conflitos de merge quando
//      várias features crescem ao mesmo tempo. Nomeie o arquivo pelo domínio
//      (i18nRelatorios, i18nVendas...), nunca por abreviações crípticas.
//
//   4. Interpolação: `t('tasks.count', { count: 3 })` com `{{count}}` na string.
//      O token `{{app}}` é substituído pelo nome do app configurado na
//      plataforma (ver lib/appName.ts) — use-o em vez de escrever o nome.
//
//   5. Componentes re-renderizam na troca de idioma via `useI18n()` (o <main>
//      do App.tsx usa `key={locale}`, então páginas inteiras remontam).
//
// O idioma escolhido persiste em localStorage e vale para o dispositivo.
// ============================================================================

import { useEffect, useState } from 'react';
import { brand } from './appName';
import { readPref, writePref } from './storage';

export type Locale = 'pt-BR' | 'en' | 'es';

export const LOCALES: { value: Locale; label: string }[] = [
  { value: 'pt-BR', label: 'Português (BR)' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
];

const LOCALE_PREF = 'locale';
const FALLBACK: Locale = 'pt-BR';

// ---------------------------------------------------------------------------
// Estado do idioma (module-level, compartilhado por todos os tradutores)
// ---------------------------------------------------------------------------

function detectDefaultLocale(): Locale {
  const saved = readPref(LOCALE_PREF) as Locale | null;
  if (saved && LOCALES.some((l) => l.value === saved)) return saved;
  return FALLBACK;
}

let currentLocale: Locale = detectDefaultLocale();
const listeners = new Set<() => void>();

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(locale: Locale): void {
  currentLocale = locale;
  writePref(LOCALE_PREF, locale);
  listeners.forEach((fn) => fn());
}

/** Re-renderiza o componente quando o idioma muda. */
export function useI18n() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((x) => x + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return { locale: currentLocale, setLocale, t };
}

// ---------------------------------------------------------------------------
// Fábrica de tradutores — a ÚNICA forma de criar dicionários de domínio
// ---------------------------------------------------------------------------

type Dict = Record<string, string>;
export type Dictionaries = Partial<Record<Locale, Dict>> & { 'pt-BR': Dict };

function interpolate(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str;
  let out = str;
  Object.entries(vars).forEach(([k, v]) => {
    out = out.split(`{{${k}}}`).join(String(v));
  });
  return out;
}

/**
 * Cria um tradutor com o MESMO contrato de `t()` para as chaves do dicionário
 * passado. Fallback: idioma atual → pt-BR → a própria chave (nunca quebra).
 * Aplica `brand()` (token {{app}}) automaticamente.
 */
export function makeTranslator(dicts: Dictionaries) {
  return function translate(key: string, vars?: Record<string, string | number>): string {
    const str = dicts[currentLocale]?.[key] ?? dicts['pt-BR'][key] ?? key;
    return brand(interpolate(str, vars));
  };
}

// ---------------------------------------------------------------------------
// Dicionário CORE — vocabulário compartilhado por qualquer app
// (ações, navegação, estados comuns, toasts, controles de formulário)
// ---------------------------------------------------------------------------

const core: Dictionaries = {
  'pt-BR': {
    // Ações genéricas (botões, menus)
    'action.create': 'Criar',
    'action.new': 'Novo',
    'action.save': 'Salvar',
    'action.cancel': 'Cancelar',
    'action.delete': 'Excluir',
    'action.edit': 'Editar',
    'action.close': 'Fechar',
    'action.retry': 'Tentar novamente',
    'common.dialog': 'Diálogo',
    'action.confirm': 'Confirmar',
    'action.back': 'Voltar',
    'action.add': 'Adicionar',
    'action.search': 'Buscar',
    'action.filter': 'Filtrar',
    'action.clear_filters': 'Limpar filtros',
    'action.view_all': 'Ver todos',
    'action.open_details': 'Abrir detalhes',
    'action.open_menu': 'Abrir menu',
    'action.upload': 'Enviar arquivo',
    'action.download': 'Baixar',
    'action.remove': 'Remover',
    'action.duplicate': 'Duplicar',
    'action.archive': 'Arquivar',
    'action.unarchive': 'Desarquivar',
    'action.previous': 'Anterior',
    'action.next': 'Próxima',
    'action.dismiss': 'Dispensar aviso',

    // Estados comuns
    'common.loading': 'Carregando…',
    'common.saved': 'Salvo com sucesso',
    'common.error': 'Algo deu errado. Tente novamente.',
    'common.optional': 'opcional',
    'common.of': 'de',
    'common.untitled': 'Sem título',
    'common.none': 'Nenhum',
    'common.you': 'Você',
    'common.empty': 'Nada por aqui ainda.',
    'common.no_data': 'Sem dados para exibir.',

    // Navegação básica (adicione as entradas do seu app aqui ou num i18n de domínio)
    'nav.home': 'Início',
    'nav.settings': 'Configurações',
    'nav.dashboard': 'Colaboradores',
    'nav.organograma': 'Organograma',
    'nav.importar': 'Importar Dados',
    'sidebar.expand': 'Expandir menu',
    'sidebar.collapse': 'Recolher menu',
    'sidebar.menu': 'Abrir menu',

    // Select / Dropdown com busca
    'select.placeholder': 'Selecione…',
    'select.search': 'Buscar…',
    'select.no_results': 'Nenhum resultado',

    // Paginação
    'pagination.range': '{{from}}–{{to}} de {{total}}',
    'pagination.per_page': 'por página',
    'pagination.page_of': 'Página {{page}} de {{pages}}',
    'pagination.previous': 'Anterior',
    'pagination.next': 'Próxima',

    // Toasts padrão
    'toast.saved': 'Salvo',
    'toast.deleted': 'Excluído',
    'toast.error': 'Não foi possível concluir a ação',
    'toast.uploaded': 'Arquivo enviado',

    // Configurações
    'settings.title': 'Configurações',
    'settings.subtitle': 'Preferências do app para esta pessoa e este dispositivo.',
    'settings.language': 'Idioma',
    'settings.language_hint': 'Vale para você, neste navegador.',
    'settings.guides': 'Guias de uso',
    'settings.guides_hint': 'Reveja os passo a passo de cada tela quando quiser.',
    'settings.about': 'Sobre',
    'settings.about_body': '{{app}} foi construído na plataforma Mogno.',

    // Página inicial de exemplo (troque pelo conteúdo real do app)
    'home.title': 'Início',
    'home.subtitle': 'Visão geral do que importa neste app.',
    'home.empty.title': 'Comece por aqui',
    'home.empty.description': 'Esta é a página inicial do app. Substitua este bloco pelo primeiro fluxo real.',
  },
  en: {
    'action.create': 'Create',
    'action.new': 'New',
    'action.save': 'Save',
    'action.cancel': 'Cancel',
    'action.delete': 'Delete',
    'action.edit': 'Edit',
    'action.close': 'Close',
    'action.retry': 'Try again',
    'common.dialog': 'Dialog',
    'action.confirm': 'Confirm',
    'action.back': 'Back',
    'action.add': 'Add',
    'action.search': 'Search',
    'action.filter': 'Filter',
    'action.clear_filters': 'Clear filters',
    'action.view_all': 'View all',
    'action.open_details': 'Open details',
    'action.open_menu': 'Open menu',
    'action.upload': 'Upload file',
    'action.download': 'Download',
    'action.remove': 'Remove',
    'action.duplicate': 'Duplicate',
    'action.archive': 'Archive',
    'action.unarchive': 'Unarchive',
    'action.previous': 'Previous',
    'action.next': 'Next',
    'action.dismiss': 'Dismiss notice',

    'common.loading': 'Loading…',
    'common.saved': 'Saved successfully',
    'common.error': 'Something went wrong. Please try again.',
    'common.optional': 'optional',
    'common.of': 'of',
    'common.untitled': 'Untitled',
    'common.none': 'None',
    'common.you': 'You',
    'common.empty': 'Nothing here yet.',
    'common.no_data': 'No data to show.',

    'nav.home': 'Home',
    'nav.settings': 'Settings',
    'nav.dashboard': 'Employees',
    'nav.organograma': 'Org Chart',
    'nav.importar': 'Import Data',
    'sidebar.expand': 'Expand menu',
    'sidebar.collapse': 'Collapse menu',
    'sidebar.menu': 'Open menu',

    'select.placeholder': 'Select…',
    'select.search': 'Search…',
    'select.no_results': 'No results',

    'pagination.range': '{{from}}–{{to}} of {{total}}',
    'pagination.per_page': 'per page',
    'pagination.page_of': 'Page {{page}} of {{pages}}',
    'pagination.previous': 'Previous',
    'pagination.next': 'Next',

    'toast.saved': 'Saved',
    'toast.deleted': 'Deleted',
    'toast.error': 'Could not complete the action',
    'toast.uploaded': 'File uploaded',

    'settings.title': 'Settings',
    'settings.subtitle': 'App preferences for this person on this device.',
    'settings.language': 'Language',
    'settings.language_hint': 'Applies to you, in this browser.',
    'settings.guides': 'Usage guides',
    'settings.guides_hint': 'Replay the walkthrough of any screen whenever you want.',
    'settings.about': 'About',
    'settings.about_body': '{{app}} was built on the Mogno platform.',

    'home.title': 'Home',
    'home.subtitle': 'Overview of what matters in this app.',
    'home.empty.title': 'Start here',
    'home.empty.description': 'This is the app home page. Replace this block with the first real flow.',
  },
  es: {
    'action.create': 'Crear',
    'action.new': 'Nuevo',
    'action.save': 'Guardar',
    'action.cancel': 'Cancelar',
    'action.delete': 'Eliminar',
    'action.edit': 'Editar',
    'action.close': 'Cerrar',
    'action.retry': 'Intentar de nuevo',
    'common.dialog': 'Diálogo',
    'action.confirm': 'Confirmar',
    'action.back': 'Volver',
    'action.add': 'Añadir',
    'action.search': 'Buscar',
    'action.filter': 'Filtrar',
    'action.clear_filters': 'Limpiar filtros',
    'action.view_all': 'Ver todos',
    'action.open_details': 'Abrir detalles',
    'action.open_menu': 'Abrir menú',
    'action.upload': 'Subir archivo',
    'action.download': 'Descargar',
    'action.remove': 'Quitar',
    'action.duplicate': 'Duplicar',
    'action.archive': 'Archivar',
    'action.unarchive': 'Desarchivar',
    'action.previous': 'Anterior',
    'action.next': 'Siguiente',
    'action.dismiss': 'Descartar aviso',

    'common.loading': 'Cargando…',
    'common.saved': 'Guardado con éxito',
    'common.error': 'Algo salió mal. Inténtalo de nuevo.',
    'common.optional': 'opcional',
    'common.of': 'de',
    'common.untitled': 'Sin título',
    'common.none': 'Ninguno',
    'common.you': 'Tú',
    'common.empty': 'Aún no hay nada aquí.',
    'common.no_data': 'No hay datos para mostrar.',

    'nav.home': 'Inicio',
    'nav.settings': 'Ajustes',
    'nav.dashboard': 'Colaboradores',
    'nav.organograma': 'Organigrama',
    'nav.importar': 'Importar Datos',
    'sidebar.expand': 'Expandir menú',
    'sidebar.collapse': 'Contraer menú',
    'sidebar.menu': 'Abrir menú',

    'select.placeholder': 'Selecciona…',
    'select.search': 'Buscar…',
    'select.no_results': 'Sin resultados',

    'pagination.range': '{{from}}–{{to}} de {{total}}',
    'pagination.per_page': 'por página',
    'pagination.page_of': 'Página {{page}} de {{pages}}',
    'pagination.previous': 'Anterior',
    'pagination.next': 'Siguiente',

    'toast.saved': 'Guardado',
    'toast.deleted': 'Eliminado',
    'toast.error': 'No se pudo completar la acción',
    'toast.uploaded': 'Archivo subido',

    'settings.title': 'Ajustes',
    'settings.subtitle': 'Preferencias de la app para esta persona en este dispositivo.',
    'settings.language': 'Idioma',
    'settings.language_hint': 'Aplica para ti, en este navegador.',
    'settings.guides': 'Guías de uso',
    'settings.guides_hint': 'Repite el recorrido de cualquier pantalla cuando quieras.',
    'settings.about': 'Acerca de',
    'settings.about_body': '{{app}} fue construido en la plataforma Mogno.',

    'home.title': 'Inicio',
    'home.subtitle': 'Resumen de lo que importa en esta app.',
    'home.empty.title': 'Empieza aquí',
    'home.empty.description': 'Esta es la página inicial de la app. Reemplaza este bloque por el primer flujo real.',
  },
};

/** Tradutor principal — cobre o vocabulário core acima. */
export const t = makeTranslator(core);
