import React, { useEffect, useState } from 'react';
import { CircleCheck, CircleMinus, Clock3, Users } from 'lucide-react';
import { consultarEquipe, requerConferencia, resultadosEquipe, resumoEquipe } from '../lib/equipe';

const estilosResultado = {
  encontrado: 'border-emerald-200 border-l-emerald-600 bg-emerald-50/70',
  nao_encontrado: 'border-amber-200 border-l-amber-600 bg-amber-50/80',
  pendente: 'border-slate-200 border-l-slate-400 bg-slate-50/70',
};

function SituacaoGestao({ pessoa, resumo = false }) {
  const itens = [
    ['Atestado vigente', pessoa.atestado, 'bg-sky-100 text-sky-900'],
    ['Falta registrada', pessoa.falta, 'bg-amber-100 text-amber-900'],
    ['Em férias', pessoa.ferias, 'bg-teal-100 text-teal-900'],
    ['Advertência entregue', pessoa.advertencia, 'bg-violet-100 text-violet-900'],
  ];
  if (pessoa.afastado) itens.push(['Afastado no Gestão', true, 'bg-slate-200 text-slate-800']);
  if (resumo) {
    const ocorrencias = itens.filter(([, valor]) => valor);
    return ocorrencias.length ? (
      <div className="flex flex-wrap gap-1.5">
        {ocorrencias.map(([rotulo, , estilo]) => (
          <span key={rotulo} className={`rounded-full px-2 py-1 text-xs font-semibold ${estilo}`}>{rotulo}</span>
        ))}
      </div>
    ) : <p className="text-xs text-slate-600">Sem ocorrências registradas</p>;
  }
  return <dl className="grid grid-cols-2 gap-x-3 text-xs text-slate-700">
    {itens.map(([rotulo, valor]) => <div key={rotulo} className="flex flex-wrap gap-1">
      <dt>{rotulo}:</dt><dd className="font-semibold">{valor ? 'Sim' : 'Não'}</dd>
    </div>)}
  </dl>;
}

function dataBr(iso) {
  return iso.split('-').reverse().join('/');
}

export function ResultadoEquipe({ conferencia }) {
  if (!conferencia) return null;
  const { encontrados, naoEncontrados } = resumoEquipe(conferencia);
  return (
    <section className="space-y-2">
      <h2 className="field-section">Conferência da equipe</h2>
      <p className="text-sm text-slate-700">
        Gestão consultado em {dataBr(conferencia.dataReferencia)} · {encontrados} {encontrados === 1 ? 'encontrado' : 'encontrados'} · {naoEncontrados} {naoEncontrados === 1 ? 'não encontrado' : 'não encontrados'}
      </p>
      {conferencia.colaboradores.length === 0 && <p className="text-sm">Nenhum colaborador alocado no Gestão na consulta.</p>}
      <ul className="space-y-2">
        {conferencia.colaboradores.map(pessoa => <li key={pessoa.id} className="report-finding rounded-xl border border-slate-200 p-3 space-y-1">
          <p className="font-semibold">{pessoa.nome}{pessoa.funcao && ` · ${pessoa.funcao}`}</p>
          <p className="text-sm font-semibold">{resultadosEquipe[pessoa.resultado]}</p>
          <SituacaoGestao pessoa={pessoa} />
          {requerConferencia(pessoa) && <p className="text-sm font-semibold text-amber-900">Conferir lotação com o supervisor</p>}
          {pessoa.observacao && <p className="text-sm whitespace-pre-wrap">{pessoa.observacao}</p>}
        </li>)}
      </ul>
    </section>
  );
}

export default function ConferenciaEquipe({ unidade, conferencia, onConsultar, onMarcar }) {
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const carregada = Boolean(conferencia);

  useEffect(() => {
    if (carregada) return;
    let ativa = true;
    consultarEquipe(unidade).then(dados => {
      if (ativa) onConsultar(dados);
    }).catch(falha => {
      if (ativa) setErro(falha.message);
    });
    return () => { ativa = false; };
  }, [unidade, tentativa, carregada, onConsultar]);

  const contagem = conferencia && resumoEquipe(conferencia);
  return (
    <section id="conferencia-equipe" className="field-card space-y-3">
      <div className="flex items-center gap-3 rounded-xl bg-indigo-50 px-3 py-2.5 text-indigo-950">
        <span className="rounded-lg bg-indigo-100 p-2 text-indigo-800">
          <Users size={19} aria-hidden="true" />
        </span>
        <h2 className="field-section">Conferência da equipe</h2>
      </div>
      {!conferencia && !erro && <p role="status" className="text-sm text-slate-700">Consultando equipe no Gestão…</p>}
      {erro && <>
        <p role="alert" className="text-sm text-red-800">{erro}</p>
        <button type="button" className="app-secondary" onClick={() => {
          setErro('');
          setTentativa(valor => valor + 1);
        }}>Consultar novamente</button>
      </>}
      {conferencia && <>
        <p className="text-sm text-slate-700" role="status">
          {conferencia.colaboradores.length
            ? `${contagem.pendentes} de ${conferencia.colaboradores.length} por conferir.`
            : 'Nenhum colaborador alocado no Gestão na consulta.'}
        </p>
        {conferencia.colaboradores.length > 0 && (
          <dl className="grid grid-cols-3 gap-2">
            {[
              ['Encontrados', contagem.encontrados, CircleCheck, 'bg-emerald-100 text-emerald-950'],
              ['Não encontrados', contagem.naoEncontrados, CircleMinus, 'bg-amber-100 text-amber-950'],
              ['Pendentes', contagem.pendentes, Clock3, 'bg-slate-100 text-slate-800'],
            ].map(([rotulo, total, Icone, estilo]) => (
              <div key={rotulo} className={`flex flex-col-reverse justify-end gap-1 rounded-xl p-2.5 sm:p-3 ${estilo}`}>
                <dt className="text-xs font-semibold">{rotulo}</dt>
                <dd className="flex items-center gap-1.5 text-lg font-bold tabular-nums">
                  <Icone size={15} aria-hidden="true" />{total}
                </dd>
              </div>
            ))}
          </dl>
        )}
        <ul className="space-y-2">
          {conferencia.colaboradores.map(pessoa => <li key={pessoa.id}
            className={`space-y-2 rounded-xl border border-l-4 p-3 ${estilosResultado[pessoa.resultado] ?? estilosResultado.pendente}`}>
            <label className="grid gap-1 text-sm font-semibold">
              <span>{pessoa.nome}{pessoa.funcao && ` · ${pessoa.funcao}`}</span>
              <select className="app-input" value={pessoa.resultado ?? ''}
                onChange={e => {
                  const resultado = e.target.value;
                  onMarcar(pessoa.id, { resultado, observacao: resultado === 'encontrado' ? '' : pessoa.observacao });
                }}>
                <option value="">Selecione o resultado</option>
                {Object.entries(resultadosEquipe).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
              </select>
            </label>
            <SituacaoGestao pessoa={pessoa} resumo />
            {pessoa.resultado === 'nao_encontrado' && (
              <label className="grid gap-1 text-sm font-semibold">
                Observação sobre {pessoa.nome} (opcional)
                <textarea className="app-input" maxLength={500} rows={2} value={pessoa.observacao ?? ''}
                  onChange={e => onMarcar(pessoa.id, { observacao: e.target.value })} />
              </label>
            )}
          </li>)}
        </ul>
      </>}
    </section>
  );
}
