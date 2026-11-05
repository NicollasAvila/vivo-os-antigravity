import './lib/readQueue';
import './lib/writeQueue';

import React, { useState } from 'react';
import Sidebar, { type RouteKey } from './components/layout/Sidebar';
import ToastHost from './components/ui/ToastHost';
import TourProvider from './components/tour/TourProvider';
import Dashboard from './pages/Dashboard';
import DetalheColaborador from './pages/DetalheColaborador';
import Settings from './pages/Settings';
import DiagDrive from './pages/DiagDrive';
import CargaHeadcount from './pages/CargaHeadcount';
import type { TourPage } from './services/tours';
import { useI18n } from './lib/i18n';
import type { Colaborador } from './services/rbac';

type Route =
  | { page: 'dashboard' }
  | { page: 'detalhe'; colaborador: Colaborador }
  | { page: 'settings' }
  | { page: 'sync-drive' }
  | { page: 'carga-headcount' };

export default function App() {
  const [route, setRoute] = useState<Route>({ page: 'dashboard' });
  const { locale } = useI18n();

  const navigate = (key: RouteKey) => {
    if (key === 'dashboard') setRoute({ page: 'dashboard' });
    else if (key === 'settings') setRoute({ page: 'settings' });
    else if (key === 'sync-drive') setRoute({ page: 'sync-drive' });
    else if (key === 'carga-headcount') setRoute({ page: 'carga-headcount' });
  };

  const openDetalhe = (colaborador: Colaborador) =>
    setRoute({ page: 'detalhe', colaborador });

  const voltarDashboard = () => setRoute({ page: 'dashboard' });

  // sidebar active key
  const sidebarRouteKey: RouteKey =
    route.page === 'detalhe' ? 'dashboard' : (route.page as RouteKey);

  return (
    <TourProvider page={route.page as TourPage} onNavigate={(page) => navigate(page as RouteKey)}>
      <div className="flex h-screen w-full bg-[var(--color-canvas)]">
        <Sidebar route={sidebarRouteKey} onNavigate={navigate} />
        <div className="relative flex flex-1 w-0 min-w-0">
          <main key={locale} className="flex-1 w-0 min-w-0 overflow-y-auto pt-14 md:pt-0">
            {route.page === 'dashboard' && (
              <Dashboard onNavigate={navigate} onSelectColaborador={openDetalhe} />
            )}
            {route.page === 'detalhe' && (
              <DetalheColaborador
                colaborador={route.colaborador}
                onBack={voltarDashboard}
              />
            )}
            {route.page === 'settings' && <Settings />}
            {route.page === 'sync-drive' && <DiagDrive />}
            {route.page === 'carga-headcount' && <CargaHeadcount />}
          </main>
        </div>
        <ToastHost />
      </div>
    </TourProvider>
  );
}
