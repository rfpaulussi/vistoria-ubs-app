import React from 'react';
import { Camera, Check, CircleAlert, Minus } from 'lucide-react';

export default function BentoCard({
  pergunta, status, reason, hasPhoto, onAnswer, onReasonChange, onEvidencias, corrigido, onCorrigir,
}) {
  const { id, label, desc, trigger, critical, requiresVolante } = pergunta;
  const falhou = status === trigger;
  const opcoes = [
    { valor: trigger === 'sim' ? 'nao' : 'sim', rotulo: 'Conforme', classe: 'ok', Icone: Check },
    { valor: trigger, rotulo: 'Não conforme', classe: 'falha', Icone: CircleAlert },
    { valor: 'na', rotulo: 'Não se aplica', classe: 'na', Icone: Minus },
  ];

  return (
    <article id={`item-${id}`} className="field-card scroll-mt-4">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <h3 className="text-base font-bold text-slate-900">{label}</h3>
        {falhou && critical && <span className="status-pill status-danger">Crítico</span>}
      </div>
      <p className="text-sm text-slate-600 mt-1">{desc}</p>
      <div className="answer-grid" role="group" aria-label={label}>
        {opcoes.map(({ valor, rotulo, classe, Icone }) => (
          <button key={valor} type="button" className="answer-button" data-answer={classe}
            aria-pressed={status === valor} onClick={() => onAnswer(valor)}>
            <Icone size={17} aria-hidden="true" />
            {rotulo}
          </button>
        ))}
      </div>
      {falhou ? (
        <div className="finding-panel">
          {requiresVolante && <p className="text-sm font-semibold text-amber-900">Agendar equipe volante</p>}
          {onCorrigir && (
            <label className="grid gap-1 text-sm font-semibold">
              Situação do apontamento
              <select className="app-input" value={corrigido ? 'corrigido' : 'aberto'}
                onChange={e => onCorrigir(id, e.target.value === 'corrigido')}>
                <option value="aberto">Precisa de acompanhamento</option>
                <option value="corrigido">Corrigido na visita</option>
              </select>
            </label>
          )}
          <label className="grid gap-1 text-sm font-semibold">
            Observação
            <textarea className="app-input" rows={2} value={reason} onChange={e => onReasonChange(id, e.target.value)} />
          </label>
          <button type="button" onClick={() => onEvidencias(id)} className="app-secondary">
            <Camera size={17} aria-hidden="true" /> {hasPhoto ? 'Ver evidências' : 'Adicionar evidência'}
          </button>
        </div>
      ) : (
        <button type="button" className="evidence-link" onClick={() => onEvidencias(id)}>
          <Camera size={15} aria-hidden="true" /> {hasPhoto ? 'Ver evidências' : 'Observação e fotos'}
        </button>
      )}
    </article>
  );
}
