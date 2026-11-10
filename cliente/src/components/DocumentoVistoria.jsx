import React from 'react';
import { ResultadoEquipe } from './ConferenciaEquipe';
import { RegistroTreinamento } from './TreinamentoVistoria';
import { agruparApontamentos, compararItens, formatarData, formatarNota, resultados } from '../lib/relatorio';

const situacoes = {
  aberto: 'Em aberto',
  em_andamento: 'Em andamento',
  resolvido: 'Resolvido pela gestão',
};

function Metricas({ visita, itens }) {
  const { total, corrigidos, pendentes, resolvidos } = agruparApontamentos(itens);
  return <dl className="report-metrics">
    {[
      ['Nota da visita', visita.notaVistoria == null ? '—' : `${formatarNota(visita.notaVistoria)}/10`, 'nota'],
      ['Não conformidades', itens.length ? total : '—', 'neutro'],
      ['Corrigidas na visita', itens.length ? corrigidos.length : '—', 'ok'],
      ['Pendentes de ação', itens.length ? pendentes.length : '—', 'atencao'],
      ...(resolvidos.length ? [['Resolvidas pela gestão', resolvidos.length, 'ok']] : []),
    ].map(([rotulo, valor, tom]) => (
      <div key={rotulo} data-tom={tom}><dt>{rotulo}</dt><dd>{valor}</dd></div>
    ))}
  </dl>;
}

function Apontamentos({ falhas, legado, dadosIndisponiveis }) {
  return <section className="report-section">
    <h2>Apontamentos e ações</h2>
    {!falhas.length && legado.length > 0 && <>
      <p className="report-muted">Registros do histórico anterior ao checklist detalhado.</p>
      <ul className="report-list">{legado.map((item, i) => <li key={i}>{item}</li>)}</ul>
    </>}
    {!falhas.length && !legado.length && <p className="report-muted">
      {dadosIndisponiveis ? 'Os apontamentos detalhados desta visita estão indisponíveis.' : 'Nenhuma não conformidade registrada.'}
    </p>}
    {falhas.map(item => {
      const acao = item.acao;
      const encerrado = item.corrigido_na_visita || acao?.situacao === 'resolvido';
      return <article key={item.item_id} className="report-finding">
        <div className="report-finding-heading">
          <h3>{item.item_titulo}</h3>
          <span className="report-tag" data-tom={encerrado ? 'ok' : 'atencao'}>
            {item.corrigido_na_visita ? 'Corrigido na visita' : situacoes[acao?.situacao] ?? 'Acompanhar'}
          </span>
        </div>
        {(item.critico || item.requiresVolante) && <p className="report-flags">
          {[item.critico && 'Crítico', item.requiresVolante && 'Equipe volante'].filter(Boolean).join(' · ')}
        </p>}
        <p className="report-text">{item.observacao?.trim() || 'Sem observação registrada.'}</p>
        {acao && <>
          <dl className="report-action-meta">
            <div><dt>Responsável</dt><dd>{acao.responsavel?.nome || (acao.responsavel_id ? 'Nome indisponível' : 'A definir')}</dd></div>
            <div><dt>Prazo</dt><dd>{acao.prazo ? formatarData(acao.prazo) : 'A definir'}</dd></div>
          </dl>
          {acao.orientacao && <p className="report-text"><strong>Orientação</strong> {acao.orientacao}</p>}
        </>}
      </article>;
    })}
  </section>;
}

function Evolucao({ visita, anteriores, itens, itensAnteriores, historicoIndisponivel }) {
  const anterior = anteriores[0];
  const comparacao = anterior && itens.length && itensAnteriores.length ? compararItens(itens, itensAnteriores) : null;
  const acoesAnteriores = itensAnteriores.filter(item => item.acao && item.acao.situacao !== 'resolvido');
  const temNota = valor => valor != null && valor !== '' && Number.isFinite(Number(valor));
  const diferenca = anterior && temNota(visita.notaVistoria) && temNota(anterior.notaVistoria)
    ? Number(visita.notaVistoria) - Number(anterior.notaVistoria)
    : null;
  return <section className="report-section">
    <h2>Histórico e evolução</h2>
    {historicoIndisponivel ? <p className="report-muted">Não foi possível carregar o histórico desta unidade.</p>
      : !anterior ? <p className="report-muted">Nenhuma visita anterior disponível para este perfil.</p>
      : <>
        <p className="report-muted">
          Comparação com a visita de {formatarData(anterior.data)}.
          {diferenca !== null && <> Nota de <strong>{formatarNota(anterior.notaVistoria)}</strong> para <strong>{formatarNota(visita.notaVistoria)}</strong> ({diferenca > 0 ? '+' : ''}{formatarNota(diferenca)} ponto{Math.abs(diferenca) === 1 ? '' : 's'}).</>}
        </p>
        {comparacao ? <div className="report-comparison">
          {[
            ['Melhorias verificadas', comparacao.melhorias, 'ok'],
            ['Falhas recorrentes', comparacao.recorrencias, 'atencao'],
            ['Novas não conformidades', comparacao.novasFalhas, 'neutro'],
          ].map(([rotulo, itens, tom]) => (
            <div key={rotulo} data-tom={tom}>
              <h3>{rotulo} <span>{itens.length}</span></h3>
              {itens.length > 0 && <ul className="report-list">{itens.map(item => <li key={item.item_id}>{item.item_titulo}</li>)}</ul>}
            </div>
          ))}
        </div> : <p className="report-muted">As duas visitas precisam ter respostas detalhadas para comparar os itens.</p>}
        {acoesAnteriores.length > 0 && <div className="report-follow-up">
          <h3>Ações da visita anterior ainda abertas na gestão</h3>
          <ul className="report-list">{acoesAnteriores.map(item => <li key={item.item_id}>
            {item.item_titulo} · {situacoes[item.acao.situacao]}{item.acao.prazo && ` · Prazo ${formatarData(item.acao.prazo)}`}
          </li>)}</ul>
        </div>}
        <table className="report-table">
          <caption>{anteriores.length === 1 ? 'Última visita anterior disponível' : `Últimas ${anteriores.length} visitas anteriores disponíveis`}</caption>
          <thead><tr><th scope="col">Data</th><th scope="col">Encarregada</th><th scope="col">Nota</th><th scope="col">Retorno previsto</th></tr></thead>
          <tbody>{anteriores.map((item, i) => <tr key={item.id ?? i}>
            <td>{formatarData(item.data)}</td><td>{item.encarregada || '—'}</td>
            <td>{formatarNota(item.notaVistoria)}</td><td>{item.dataRetorno ? formatarData(item.dataRetorno) : '—'}</td>
          </tr>)}</tbody>
        </table>
      </>}
  </section>;
}

function Evidencias({ fotos }) {
  if (!fotos.length) return null;
  const grupos = new Map();
  for (const foto of fotos) {
    if (!grupos.has(foto.item_id)) grupos.set(foto.item_id, []);
    grupos.get(foto.item_id).push(foto);
  }
  return <section className="report-section">
    <h2>Evidências fotográficas</h2>
    {[...grupos.entries()].map(([id, grupo]) => <div key={id} className="report-evidence">
      <h3>{grupo[0].titulo}</h3>
      <div className="report-photo-grid">
        {grupo.map((foto, i) => <figure key={foto.caminho ?? i}>
          <figcaption>{foto.tipo === 'antes' ? 'Antes' : 'Depois'}</figcaption>
          {foto.url ? <img src={foto.url} alt={`${grupo[0].titulo} · ${foto.tipo}`} />
            : <p className="report-muted">Foto indisponível.</p>}
        </figure>)}
      </div>
    </div>)}
  </section>;
}

export default function DocumentoVistoria({
  visita, itens, equipe, fotos, treinamento, anteriores, itensAnteriores, indisponiveis = [],
}) {
  const falhas = itens.filter(item => item.resultado === 'nao_conforme')
    .sort((a, b) => Number(a.corrigido_na_visita) - Number(b.corrigido_na_visita) || Number(b.critico) - Number(a.critico));
  const legado = itens.length ? [] : (visita.falhas ?? '').split('|').map(item => item.trim()).filter(Boolean);
  return <article id="relatorio-pdf" className="field-card report-content">
    <header className="report-header">
      <p className="report-kicker">Demax · Relatório de vistoria</p>
      <h1>{visita.ubs || 'Unidade não informada'}</h1>
      <dl className="report-header-meta">
        <div><dt>Data da vistoria</dt><dd>{formatarData(visita.data)}</dd></div>
        <div><dt>Encarregada</dt><dd>{visita.encarregada || 'Não informada'}</dd></div>
        <div><dt>Retorno previsto</dt><dd>{visita.dataRetorno ? formatarData(visita.dataRetorno) : 'A definir'}</dd></div>
      </dl>
    </header>
    <Metricas visita={visita} itens={itens} />
    {indisponiveis.length > 0 && <p className="report-alert">Dados indisponíveis nesta emissão: {indisponiveis.join(', ')}.</p>}
    {visita.consideracoesGerais && <section className="report-section report-overview">
      <h2>Considerações da encarregada</h2>
      <p className="report-text">{visita.consideracoesGerais}</p>
    </section>}
    <Apontamentos falhas={falhas} legado={legado} dadosIndisponiveis={!itens.length} />
    <Evolucao visita={visita} anteriores={anteriores} itens={itens} itensAnteriores={itensAnteriores}
      historicoIndisponivel={indisponiveis.includes('histórico')} />
    <div className="report-section">
      {equipe ? <ResultadoEquipe conferencia={equipe} /> : <>
        <h2>Conferência da equipe</h2>
        <p className="report-muted">{indisponiveis.includes('conferência da equipe')
          ? 'Não foi possível carregar a conferência.'
          : 'Sem conferência de equipe registrada para esta visita.'}</p>
      </>}
    </div>
    {(Array.isArray(treinamento) ? treinamento : treinamento ? [treinamento] : []).map(item => (
      <RegistroTreinamento key={item.procedimentoId} treinamento={item} />
    ))}
    <Evidencias fotos={fotos} />
    <section className="report-section">
      <h2>Checklist da visita</h2>
      {itens.length ? <table className="report-table">
        <thead><tr><th scope="col">Item avaliado</th><th scope="col">Resultado</th></tr></thead>
        <tbody>{itens.map(item => <tr key={item.item_id}>
          <td>{item.item_titulo}</td>
          <td><span className="report-result" data-resultado={item.resultado}>{resultados[item.resultado] ?? 'Não avaliado'}</span></td>
        </tr>)}</tbody>
      </table> : <p className="report-muted">Este registro não tem respostas detalhadas disponíveis.</p>}
    </section>
  </article>;
}
