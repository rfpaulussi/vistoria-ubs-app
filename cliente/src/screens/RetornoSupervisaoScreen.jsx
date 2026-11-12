import React, { useEffect, useState } from 'react';
import { CalendarDays, ClipboardCheck, Clock3, Link2, Send } from 'lucide-react';
import ResumoRetornoSupervisao from '../components/ResumoRetornoSupervisao';
import { dataBr, dataHoraBr, hoje, operacaoSupervisao, prazoDeResposta, situacoesRetorno, statusRetorno } from '../lib/retornoSupervisao';
import { normalizarUnidade } from '../lib/unidades';

const opcoesRetorno = {
  planejada: { emoji: '📅', resumo: 'A ação tem um prazo', campo: 'O que será feito?', exemplo: 'Descreva a ação planejada.' },
  corrigida: { emoji: '✅', resumo: 'A ação já foi concluída', campo: 'O que foi corrigido?', exemplo: 'Descreva a correção realizada.' },
  impedida: { emoji: '⚠️', resumo: 'Algo impede a correção', campo: 'O que impede a correção?', exemplo: 'Informe o impedimento, de quem depende e o próximo passo.' },
};

function FormularioRetorno({ item, nome, onEnviar }) {
  const anterior = item.resposta;
  const [situacao, setSituacao] = useState(anterior?.situacao ?? '');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const corrigida = situacao === 'corrigida';
  const planejada = situacao === 'planejada';
  const complemento = anterior?.decisao === 'devolvido';
  const opcao = opcoesRetorno[situacao];

  async function enviar(evento) {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);
    setOcupado(true);
    setErro('');
    try {
      await onEnviar({
        p_item_id: item.id,
        p_resposta_anterior: anterior?.id ?? null,
        p_respondido_por: form.get('nome'),
        p_situacao: situacao,
        p_descricao: form.get('descricao'),
        p_responsavel: form.get('responsavel'),
        p_data_acao: form.get('data') || null,
        p_comprovacao: form.get('comprovacao'),
      });
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <form onSubmit={enviar} className="mt-4 border-t pt-4">
      <fieldset disabled={ocupado} className="grid min-w-0 gap-3 sm:grid-cols-2">
        <fieldset className="min-w-0 sm:col-span-2">
          <legend className="mb-2 text-sm font-bold">Qual é a situação?</legend>
          <div className="retorno-opcoes">
            {Object.entries(opcoesRetorno).map(([valor, escolha]) => (
              <label className="retorno-opcao" data-tipo={valor} key={valor}>
                <input type="radio" name="situacao" value={valor} required
                  checked={situacao === valor} onChange={() => setSituacao(valor)} />
                <span aria-hidden="true" className="retorno-opcao-emoji">{escolha.emoji}</span>
                <span><strong>{situacoesRetorno[valor]}</strong><small>{escolha.resumo}</small></span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="grid content-start gap-1 text-sm font-semibold">Seu nome
          <input name="nome" className="app-input" autoComplete="name" maxLength={120} required defaultValue={nome} />
        </label>
        <label className="grid content-start gap-1 text-sm font-semibold">
          {situacao === 'impedida' ? 'Quem pode encaminhar?' : 'Responsável pela ação'}
          <input name="responsavel" className="app-input" maxLength={120} required defaultValue={anterior?.responsavel} />
        </label>
        <label className="grid gap-1 text-sm font-semibold sm:col-span-2">{opcao?.campo ?? 'Resposta ao apontamento'}
          <textarea name="descricao" className="app-input" rows={3} maxLength={2000} required
            placeholder={opcao?.exemplo} defaultValue={complemento ? anterior.descricao : ''} />
        </label>
        <label className="grid content-start gap-1 text-sm font-semibold">
          {corrigida ? 'Data da correção' : planejada ? 'Prazo para execução' : 'Prazo previsto (opcional)'}
          <input key={situacao} name="data" type="date" className="app-input" required={corrigida || planejada}
            min={planejada ? hoje() : undefined} max={corrigida ? hoje() : undefined}
            defaultValue={situacao === anterior?.situacao ? anterior?.data_acao ?? '' : ''} />
        </label>
        <label className="grid gap-1 text-sm font-semibold sm:col-span-2">Evidência ou referência (opcional)
          <textarea name="comprovacao" className="app-input" rows={2} maxLength={1000}
            placeholder="Ex.: número do pedido, data da entrega ou link da evidência." defaultValue={complemento ? anterior.comprovacao : ''} />
        </label>
        <button className="app-primary justify-center sm:col-span-2 sm:justify-self-start" type="submit">
          <Send size={16} aria-hidden="true" />
          {ocupado ? 'Enviando…' : complemento ? 'Enviar complemento' : 'Enviar resposta'}
        </button>
      </fieldset>
      {erro && <p role="alert" className="mt-2 text-sm text-red-800">{erro}</p>}
    </form>
  );
}

function ItemRetorno({ item, nome, expandido, prazoLink, onEnviar }) {
  const [mostrar, setMostrar] = useState(expandido);
  const [atualizar, setAtualizar] = useState(false);
  const { resposta } = item;
  const prazoResposta = prazoDeResposta(item.situacao, resposta, prazoLink);
  const atrasada = prazoResposta && prazoResposta < hoje();
  const aberto = item.situacao !== 'resolvido';
  const podeAtualizar = aberto && resposta?.decisao === 'aceito';
  const formulario = aberto && (!resposta || resposta.decisao === 'devolvido' || podeAtualizar && atualizar);
  const tom = !aberto ? 'resolvido' : atrasada || resposta?.decisao === 'devolvido' ? 'atrasado'
    : resposta ? 'respondido' : 'pendente';

  return (
    <details className="field-card action-card supervisao-vistoria retorno-item" data-tom={tom} open={mostrar}
      onToggle={evento => setMostrar(evento.currentTarget.open)}>
      <summary>
        <div><h2 className="font-bold">{item.titulo}</h2></div>
        <span className="status-pill retorno-status">
          {atrasada ? (resposta ? 'Complemento em atraso' : 'Resposta em atraso') : statusRetorno(item.situacao, resposta)}
        </span>
      </summary>
      <div className="action-detail space-y-3">
        {item.observacao && <div className="retorno-observacao whitespace-pre-wrap break-words text-sm">
          <p className="font-bold">O que foi apontado</p>
          <p>{item.observacao}</p>
        </div>}
        {item.orientacao && <div className="whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-3 text-sm">
          <p className="font-semibold">Orientação da gestão</p><p>{item.orientacao}</p>
        </div>}
        {prazoResposta && <p className="text-sm"><strong>{resposta ? 'Prazo do complemento' : 'Prazo para responder'}</strong> · {dataBr(prazoResposta)}</p>}
        {item.prazo && <p className="text-sm"><strong>Prazo da correção definido pela gestão</strong> · {dataBr(item.prazo)}</p>}
        {resposta && <div className="rounded-xl border p-3"><ResumoRetornoSupervisao resposta={resposta} /></div>}
        {podeAtualizar && !atualizar && <button type="button" className="app-secondary" onClick={() => setAtualizar(true)}>
          Registrar atualização
        </button>}
        {formulario && <FormularioRetorno key={resposta?.id ?? 'novo'} item={item} nome={nome} onEnviar={onEnviar} />}
      </div>
    </details>
  );
}

export default function RetornoSupervisaoScreen({ token }) {
  const [visita, setVisita] = useState(null);
  const [estado, setEstado] = useState('carregando');
  const [versao, setVersao] = useState(0);
  const [nome, setNome] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    document.title = 'Retorno da supervisão · Vistoria';
    let ativo = true;
    operacaoSupervisao('consultar_retorno_supervisao', { p_token: token }).then(data => {
      if (!ativo) return;
      setVisita(data);
      setEstado(data ? 'pronto' : 'invalido');
    }).catch(() => { if (ativo) setEstado('erro'); });
    return () => { ativo = false; };
  }, [token, versao]);

  async function enviar(campos) {
    const resposta = await operacaoSupervisao('enviar_retorno_supervisao', { p_token: token, ...campos });
    setVisita(atual => ({
      ...atual,
      itens: atual.itens.map(item => item.id === campos.p_item_id
        ? { ...item, resposta, situacao: 'em_andamento' } : item),
    }));
    setNome(resposta.respondido_por);
    setAviso('Resposta registrada. A gestão pode acompanhar este retorno.');
  }

  const itens = visita?.itens ?? [];
  const total = itens.length;
  const primeiroPendente = itens.find(item => item.situacao !== 'resolvido'
    && (!item.resposta || item.resposta.decisao === 'devolvido')) ?? itens[0];
  const retornados = itens.filter(item => item.situacao === 'resolvido'
    || item.resposta && item.resposta.decisao !== 'devolvido').length;

  return (
    <div className="app-frame" style={{ '--campaign-color': '#176b63' }}>
      <div className="app-shell">
        <header className="app-hero">
          <span className="app-hero-icon"><ClipboardCheck size={25} aria-hidden="true" /></span>
          <div>
            <p className="app-hero-kicker">Retorno da supervisão</p>
            <h1>{visita ? normalizarUnidade(visita.unidade) : 'Vistoria de limpeza'}</h1>
            {visita && <p className="text-sm">
              Vistoria de {dataBr(visita.data_vistoria)} · Supervisão de {visita.supervisor}
            </p>}
          </div>
          {total > 0 && <div className="app-hero-progress text-sm">
            <label htmlFor="progresso-retorno">{retornados} de {total} apontamentos com retorno ou encerrados</label>
            <progress id="progresso-retorno" value={retornados} max={total} />
          </div>}
        </header>
        <main className="app-content field-content space-y-3 pb-8">
          {estado === 'carregando' && <p role="status" className="field-card">Carregando apontamentos…</p>}
          {estado === 'invalido' && <p role="alert" className="field-card">Este link está inválido, expirado ou foi substituído. Peça um novo link à gestão.</p>}
          {estado === 'erro' && <div className="field-card space-y-2">
            <p role="alert">Não foi possível carregar a vistoria.</p>
            <button type="button" className="app-secondary" onClick={() => {
              setEstado('carregando');
              setVersao(v => v + 1);
            }}>Tentar novamente</button>
          </div>}
          {visita && <section className="retorno-datas" aria-label="Datas da vistoria">
            {[
              visita.prazo_resposta && ['Prazo para responder', dataBr(visita.prazo_resposta), Clock3],
              visita.data_retorno && ['Nova visita prevista', dataBr(visita.data_retorno), CalendarDays],
              ['Link válido até', dataHoraBr(visita.expira_em), Link2],
            ].filter(Boolean).map(([rotulo, data, Icone]) => (
              <div className="retorno-data" key={rotulo}>
                <Icone size={18} aria-hidden="true" />
                <span>{rotulo}<strong>{data}</strong></span>
              </div>
            ))}
          </section>}
          <p role="status" className={aviso ? 'field-card text-sm' : 'sr-only'}>{aviso}</p>
          {visita && !total && <p className="field-card text-sm">Esta vistoria não tem apontamentos disponíveis.</p>}
          {total > 0 && <h2 className="retorno-lista-titulo">Apontamentos da vistoria</h2>}
          {itens.map(item => <ItemRetorno key={item.id} item={item} nome={nome || visita.supervisor}
            expandido={item.id === primeiroPendente?.id} prazoLink={visita.prazo_resposta} onEnviar={enviar} />)}
        </main>
      </div>
    </div>
  );
}
