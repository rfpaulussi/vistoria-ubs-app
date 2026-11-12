import React, { useEffect, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import ResumoRetornoSupervisao from '../components/ResumoRetornoSupervisao';
import { dataBr, dataHoraBr, hoje, operacaoSupervisao, situacoesRetorno, statusRetorno } from '../lib/retornoSupervisao';
import { normalizarUnidade } from '../lib/unidades';

const instrucoes = {
  planejada: 'Descreva o que será feito para atender este apontamento.',
  corrigida: 'Descreva a correção realizada.',
  impedida: 'Descreva o impedimento, de quem depende e qual será o próximo encaminhamento.',
};

function FormularioRetorno({ item, nome, onEnviar }) {
  const anterior = item.resposta;
  const [situacao, setSituacao] = useState(anterior?.situacao ?? '');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const corrigida = situacao === 'corrigida';
  const planejada = situacao === 'planejada';
  const complemento = anterior?.decisao === 'devolvido';

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
        <label className="grid content-start gap-1 text-sm font-semibold">Seu nome
          <input name="nome" className="app-input" autoComplete="name" maxLength={120} required defaultValue={nome} />
        </label>
        <label className="grid content-start gap-1 text-sm font-semibold">Situação informada
          <select name="situacao" className="app-input" value={situacao} required onChange={e => setSituacao(e.target.value)}>
            <option value="">Selecione</option>
            {Object.entries(situacoesRetorno).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold sm:col-span-2">Resposta ao apontamento
          <textarea name="descricao" className="app-input" rows={3} maxLength={2000} required
            placeholder={instrucoes[situacao]} defaultValue={complemento ? anterior.descricao : ''} />
        </label>
        <label className="grid content-start gap-1 text-sm font-semibold">Responsável pela ação ou encaminhamento
          <input name="responsavel" className="app-input" maxLength={120} required defaultValue={anterior?.responsavel} />
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
        <button className="app-primary sm:justify-self-start" type="submit">
          {ocupado ? 'Enviando…' : complemento ? 'Enviar complemento' : 'Enviar resposta'}
        </button>
      </fieldset>
      {erro && <p role="alert" className="mt-2 text-sm text-red-800">{erro}</p>}
    </form>
  );
}

function ItemRetorno({ item, nome, expandido, onEnviar }) {
  const [mostrar, setMostrar] = useState(expandido);
  const [atualizar, setAtualizar] = useState(false);
  const { resposta } = item;
  const aberto = item.situacao !== 'resolvido';
  const podeAtualizar = aberto && resposta?.decisao === 'aceito';
  const formulario = aberto && (!resposta || resposta.decisao === 'devolvido' || podeAtualizar && atualizar);

  return (
    <details className="field-card action-card supervisao-vistoria" open={mostrar}
      onToggle={evento => setMostrar(evento.currentTarget.open)}>
      <summary>
        <div><h2 className="font-bold">{item.titulo}</h2></div>
        <span className="status-pill">{statusRetorno(item.situacao, resposta)}</span>
      </summary>
      <div className="action-detail space-y-3">
        {item.observacao && <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{item.observacao}</p>}
        {item.orientacao && <div className="whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-3 text-sm">
          <p className="font-semibold">Orientação da gestão</p><p>{item.orientacao}</p>
        </div>}
        {item.prazo && <p className="text-sm"><strong>Prazo da gestão</strong> · {dataBr(item.prazo)}</p>}
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
          {visita && <div className="field-card space-y-2 text-sm">
            <p>Responda cada apontamento e registre o responsável e a data da ação. O app salva cada resposta no envio.</p>
            {visita.data_retorno && <p><strong>Nova visita prevista</strong> · {dataBr(visita.data_retorno)}</p>}
            <p><strong>Link válido até</strong> · {dataHoraBr(visita.expira_em)}</p>
          </div>}
          <p role="status" className={aviso ? 'field-card text-sm' : 'sr-only'}>{aviso}</p>
          {visita && !total && <p className="field-card text-sm">Esta vistoria não tem apontamentos disponíveis.</p>}
          {itens.map(item => <ItemRetorno key={item.id} item={item} nome={nome}
            expandido={item.id === primeiroPendente?.id} onEnviar={enviar} />)}
        </main>
      </div>
    </div>
  );
}
