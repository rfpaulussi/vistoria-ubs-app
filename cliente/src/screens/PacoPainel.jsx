import React from 'react';

const DIA = 86400000;
const fuso = 'America/Sao_Paulo';
const dataIso = new Intl.DateTimeFormat('sv-SE', { timeZone: fuso });
const horaLocal = new Intl.DateTimeFormat('pt-BR', { timeZone: fuso, hour: '2-digit', minute: '2-digit' });

export const diaPaco = data => dataIso.format(new Date(data));
const utcDia = (dia, deslocamento = 0) => new Date(Date.parse(dia + 'T00:00:00Z') + deslocamento * DIA);
const isoUtc = data => data.toISOString().slice(0, 10);
const rotuloDia = dia => dia.slice(8, 10) + '/' + dia.slice(5, 7);

export function periodosPaco(hoje) {
  const diaSemana = utcDia(hoje).getUTCDay();
  const semana = isoUtc(utcDia(hoje, -((diaSemana + 6) % 7)));
  const mes = hoje.slice(0, 7) + '-01';
  return {
    dia: { inicio: hoje, rotulo: 'Hoje' },
    semana: { inicio: semana, rotulo: 'Esta semana' },
    mes: { inicio: mes, rotulo: 'Este mês' },
    primeiro: semana < mes ? semana : mes,
    proximo: isoUtc(utcDia(hoje, 1)),
  };
}

function Termometro({ titulo, conformes, avaliadas }) {
  return <div className="paco-termometro">
    <strong>{titulo}</strong>
    {avaliadas ? <>
      <meter min="0" max={avaliadas} value={conformes} aria-label={titulo} />
      <span>{Math.round(100 * conformes / avaliadas)}% · {conformes} de {avaliadas} conformes</span>
    </> : <span>Sem avaliações neste indicador</span>}
  </div>;
}

export default function PacoPainel({ registros, hoje, periodos, periodo, diaSelecionado, selecionarDia }) {
  const avaliacoes = registros.filter(v => !v.acesso.startsWith('aguardando_'));
  const inicio = periodos[periodo].inicio;
  const amostras = avaliacoes.filter(v => diaPaco(v.registrada_em) >= inicio);
  const faixa = amostras.filter(v => !diaSelecionado || diaPaco(v.registrada_em) === diaSelecionado);
  const dias = new Map();
  for (let dia = inicio; dia <= hoje; dia = isoUtc(utcDia(dia, 1))) dias.set(dia, 0);
  for (const vistoria of amostras) {
    const dia = diaPaco(vistoria.registrada_em);
    dias.set(dia, (dias.get(dia) ?? 0) + 1);
  }
  const maximo = Math.max(1, ...dias.values());
  const locais = new Map();
  for (const v of faixa) {
    const atual = locais.get(v.rotina_id);
    if (atual) atual.total++;
    else locais.set(v.rotina_id, { rotina: v.rotina_registrada, total: 1, ultima: v.registrada_em });
  }
  const frequencias = faixa.filter(v => v.frequencia === 'conforme' || v.frequencia === 'fora_do_previsto');
  const qualidades = faixa.filter(v => v.qualidade === 'conforme' || v.qualidade === 'precisa_corrigir');

  return <section className="paco-painel" aria-label="Termômetro de vistorias">
    <div className="paco-metricas">
      {['dia', 'semana', 'mes'].map(chave => <div key={chave}>
        <span>{periodos[chave].rotulo}</span>
        <strong>{avaliacoes.filter(v => diaPaco(v.registrada_em) >= periodos[chave].inicio).length}</strong>
        <small>Vistorias realizadas</small>
      </div>)}
    </div>
    <div className="paco-card space-y-3">
      <h3 className="font-semibold">Ritmo de vistorias por dia</h3>
      <p className="paco-muted">Toque em um dia para ver os ambientes e horários das vistorias.</p>
      <div className="paco-grafico" role="group" aria-label="Filtrar vistorias por dia">
        {[...dias].map(([dia, total]) => <button key={dia} type="button" aria-pressed={diaSelecionado === dia}
          aria-label={rotuloDia(dia) + ', ' + total + (total === 1 ? ' vistoria' : ' vistorias')}
          onClick={() => selecionarDia(diaSelecionado === dia ? '' : dia)}>
          <strong>{total}</strong>
          <span className="paco-barra" aria-hidden="true">
            <span style={{ height: (total ? Math.max(8, total / maximo * 100) : 0) + '%' }} />
          </span>
          <small>{rotuloDia(dia)}</small>
        </button>)}
      </div>
      {diaSelecionado && <button className="app-secondary" type="button" onClick={() => selecionarDia('')}>
        Limpar filtro de {rotuloDia(diaSelecionado)}
      </button>}
    </div>
    <div className="paco-duas-colunas">
      <Termometro titulo="Frequência de limpeza" conformes={frequencias.filter(v => v.frequencia === 'conforme').length} avaliadas={frequencias.length} />
      <Termometro titulo="Qualidade observada" conformes={qualidades.filter(v => v.qualidade === 'conforme').length} avaliadas={qualidades.length} />
    </div>
    <div className="paco-card space-y-2">
      <h3 className="font-semibold">Ambientes visitados <span className="status-pill">{locais.size}</span></h3>
      {locais.size ? <div className="paco-locais">
        <table>
          <thead><tr><th scope="col">Ambiente</th><th scope="col">Vistorias</th><th scope="col">Mais recente</th></tr></thead>
          <tbody>{[...locais].map(([id, { rotina, total, ultima }]) => <tr key={id}>
            <th scope="row">{rotina.local}<small>{rotina.pavimento_ou_area} · {rotina.grupo}</small></th>
            <td>{total}</td><td>{rotuloDia(diaPaco(ultima))} · {horaLocal.format(new Date(ultima))}</td>
          </tr>)}</tbody>
        </table>
      </div> : <p className="paco-muted">Nenhum ambiente avaliado neste recorte.</p>}
    </div>
  </section>;
}
