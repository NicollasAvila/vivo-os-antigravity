import React, { useId, useRef, useState } from 'react';
import { DocumentArrowUpIcon, SparklesIcon } from '@heroicons/react/24/outline';
import Button from './Button';
import { readPdfProposal, installmentIssues, type DocumentProfile, type DocumentProposal } from '../../lib/documentIntake';

interface Props {
  profile: DocumentProfile;
  current: Record<string, unknown>;
  onApply: (values: Record<string, unknown>, proposal: DocumentProposal) => void;
  disabled?: boolean;
}
const display = (value: unknown) => typeof value === 'boolean' ? (value ? 'Sim' : 'Não') : String(value ?? '—');

/** Optional PDF intake. It proposes changes; the form still owns validation and saving. */
export default function DocumentIntake({profile,current,onApply,disabled=false}:Props) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [file,setFile] = useState<File|null>(null);
  const [proposal,setProposal] = useState<DocumentProposal|null>(null);
  const [selected,setSelected] = useState<Set<string>>(new Set());
  const [includeSchedule,setIncludeSchedule] = useState(false);
  const [busy,setBusy] = useState(false);
  const [progress,setProgress] = useState('');
  const [error,setError] = useState('');
  const [applied,setApplied] = useState(false);
  const fields = new Map(profile.fields.map(f=>[f.key,f]));
  const scheduleIssues = proposal ? installmentIssues(proposal.installments) : [];
  async function analyze() {
    if (!file || busy) return;
    setBusy(true);setError('');setProposal(null);setApplied(false);setIncludeSchedule(false);
    try {
      const result=await readPdfProposal(file,profile,setProgress);
      setProposal(result);
      setSelected(new Set(result.fields.filter(f=>f.confidence==='high' && f.evidence).map(f=>f.key)));
    } catch(err) {setError(err instanceof Error ? err.message : 'Não foi possível ler o documento. Tente novamente.');}
    finally {setBusy(false);setProgress('');}
  }
  function apply() {
    if (!proposal) return;
    const values=Object.fromEntries(proposal.fields.filter(f=>selected.has(f.key)).map(f=>[f.key,f.value]));
    onApply(values,{...proposal,installments:includeSchedule?proposal.installments:[]});
    setApplied(true);setProposal(null);
  }
  return <section aria-labelledby={id} className="rounded-lg border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] p-4 space-y-3">
    <div className="flex items-start gap-3">
      <DocumentArrowUpIcon aria-hidden="true" className="size-5 shrink-0 text-[var(--color-primary-600)]"/>
      <div className="min-w-0"><h3 id={id} className="text-sm font-semibold text-gray-900">Preencher com um PDF</h3>
        <p className="mt-1 text-xs leading-5 text-gray-600">{profile.title}. Revise os valores e escolha o que aplicar ao formulário antes de salvar.</p></div>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <input ref={input} type="file" accept="application/pdf,.pdf" className="sr-only" aria-label="Selecionar contrato PDF" disabled={busy||disabled}
        onChange={e=>{setFile(e.target.files?.[0]||null);setProposal(null);setError('');setApplied(false)}}/>
      <Button variant="secondary" disabled={busy||disabled} onClick={()=>input.current?.click()}>Selecionar PDF</Button>
      {file && <span className="min-w-0 max-w-full break-words text-xs text-gray-600">{file.name}</span>}
      <Button icon={<SparklesIcon className="size-4" aria-hidden="true"/>} disabled={!file||disabled} loading={busy} onClick={analyze}>Ler documento</Button>
    </div>
    {busy && <p role="status" className="text-sm text-gray-600">{progress}</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {applied && <p role="status" className="text-sm text-emerald-800">Sugestões aplicadas. Confira o formulário e salve quando estiver pronto.</p>}
    {proposal && <div className="space-y-3">
      {proposal.warnings.length>0 && <ul className="list-disc pl-5 text-xs text-amber-900">{proposal.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul>}
      {proposal.fields.length===0 && <p className="text-sm text-gray-600">Nenhum campo foi identificado com o formato esperado. Você pode preencher o formulário manualmente.</p>}
      <div className="divide-y divide-gray-200">
        {proposal.fields.map(field=><label key={field.key} className="flex items-start gap-3 py-3">
          <input type="checkbox" className="mt-1 size-4 shrink-0" checked={selected.has(field.key)} onChange={()=>setSelected(prev=>{const next=new Set(prev);next.has(field.key)?next.delete(field.key):next.add(field.key);return next})}/>
          <span className="min-w-0 flex-1 text-sm"><span className="block font-medium">{fields.get(field.key)?.label}</span>
            <span className="block break-words text-gray-900">{display(field.value)}</span>
            {current[field.key]!==undefined && current[field.key]!=='' && String(current[field.key])!==String(field.value) && <span className="block text-xs text-gray-500">Atual: {display(current[field.key])}</span>}
            <span className="mt-1 block text-xs text-gray-600">{field.page?`Página ${field.page} · `:''}{field.evidence || 'Sem trecho de referência; confira no PDF.'}</span>
            {field.confidence!=='high' && <span className="block text-xs font-medium text-amber-800">Revisão necessária</span>}
          </span>
        </label>)}
      </div>
      {proposal.installments.length>0 && <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
        <h4 className="text-sm font-semibold">{proposal.installments.length} parcelas identificadas no documento</h4>
        <div className="max-h-64 overflow-auto"><table className="w-full text-left text-xs"><thead><tr><th className="p-2">Vencimento</th><th className="p-2">Amortização</th><th className="p-2">Juros</th><th className="p-2">Total</th></tr></thead>
          <tbody>{proposal.installments.map((row,i)=><tr key={i} className="border-t border-gray-100"><td className="p-2 whitespace-nowrap">{row.date}</td>{[row.principal,row.interest,row.total].map((v,j)=><td key={j} className="p-2 tabular-nums">{v===null?'Não identificado':v.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>)}</tr>)}</tbody></table></div>
        {scheduleIssues.length>0 ? <p className="text-xs text-amber-800">{scheduleIssues.slice(0,3).join(' ')} As parcelas incompletas ficam apenas para consulta; preencha-as manualmente.</p>
          : <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={includeSchedule} onChange={e=>setIncludeSchedule(e.target.checked)}/>Conferi os valores e quero usar estas parcelas</label>}
      </div>}
      <div className="flex flex-wrap gap-2">
        <Button disabled={disabled||(!selected.size&&!includeSchedule)} onClick={apply}>Aplicar ao formulário</Button>
        <Button variant="ghost" onClick={()=>setProposal(null)}>Descartar sugestões</Button>
      </div>
    </div>}
  </section>;
}
