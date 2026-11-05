// ============================================================================
// ImportarDados — Importação via XLSX (upload direto)
// ============================================================================
import React from 'react';
import XlsxUploader from '../components/import/XlsxUploader';
import PageHeader from '../components/ui/PageHeader';
import { pages } from '../lib/seiva';

pages.define({ path: '/importar', name: 'Importar Dados', description: 'Importação de planilha XLSX da Base de Dados Almeida' });

// ── (removido: Drive e CSV legado) ──────────────────────────────────────────
function _unused({ file, onSelect, selected }: { file: any; onSelect: (f: any) => void; selected: boolean }) {
  return null;
}

// ── (removido: ImportCard legado) ───────────────────────────────────────────
function ImportCard(_props: any) {
  return null;
}

export default function ImportarDados() {
  return (
    <div className="w-full p-4 md:p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Importar Dados"
        subtitle="Faça upload do arquivo Excel (.xlsx) da Base de Dados Almeida para atualizar os registros"
      />
      <XlsxUploader />
    </div>
  );
}
