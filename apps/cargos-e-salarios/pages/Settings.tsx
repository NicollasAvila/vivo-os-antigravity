// ============================================================================
// Settings — preferências pessoais do app (idioma + guias de uso + sobre)
// ============================================================================
//
// Preferências de INTERFACE (idioma, tours) são locais à pessoa/dispositivo.
// Configurações de NEGÓCIO (quem administra, integrações, parâmetros) devem
// virar uma seção própria com dados em collection — não misture aqui.
// ============================================================================

import React, { useEffect, useReducer } from 'react';
import LocaleSwitcher from '../components/common/LocaleSwitcher';
import TourList from '../components/tour/TourList';
import Toggle from '../components/ui/Toggle';
import PageHeader from '../components/ui/PageHeader';
import { useTour } from '../components/tour/TourProvider';
import { autoToursEnabled, setAutoTours, subscribeTourPrefs } from '../lib/tourPrefs';
import { useI18n, t } from '../lib/i18n';
import { tTour } from '../lib/i18nTour';
import { useAppName } from '../hooks/useAppName';
import { pages } from '../lib/seiva';

pages.define({ path: '/settings', name: 'Configurações', description: 'Idioma e preferências pessoais' });

export default function Settings() {
  const { locale, setLocale } = useI18n();
  const { start } = useTour();
  const appName = useAppName();
  const [, refresh] = useReducer((x: number) => x + 1, 0);
  useEffect(() => subscribeTourPrefs(refresh), []);

  return (
    <div className="w-full p-4 md:p-6 lg:p-8">
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <div className="grid grid-cols-1 gap-x-8 gap-y-8 lg:grid-cols-2">
        <div className="space-y-8">
          {/* Idioma */}
          <section data-tour="settings-language" className="border-t border-gray-200 pt-5">
            <h2 className="text-base font-semibold text-gray-900">{t('settings.language')}</h2>
            <p className="mt-1 text-sm text-gray-500">{t('settings.language_hint')}</p>
            <div className="mt-4 max-w-xs">
              <LocaleSwitcher
                locale={locale}
                onChange={setLocale}
                expanded
                menuPosition="down"
                languageLabel={t('settings.language')}
              />
            </div>
          </section>

          {/* Sobre */}
          <section className="border-t border-gray-200 pt-5">
            <h2 className="text-base font-semibold text-gray-900">{t('settings.about')}</h2>
            <p className="mt-2 max-w-prose text-sm text-gray-500">{t('settings.about_body', { app: appName })}</p>
          </section>
        </div>

        {/* Guias de uso */}
        <section data-tour="settings-guides" className="border-t border-gray-200 pt-5">
          <h2 className="text-base font-semibold text-gray-900">{t('settings.guides')}</h2>
          <p className="mb-2 mt-1 text-sm text-gray-500">{t('settings.guides_hint')}</p>
          <TourList variant="settings" onStart={start} />
          <div className="mt-3 border-t border-gray-200 pt-3">
            <Toggle
              label={tTour('tour.menu.auto')}
              description={tTour('tour.menu.auto_hint')}
              checked={autoToursEnabled()}
              onChange={setAutoTours}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
