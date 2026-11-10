import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Camera, Check, CircleAlert, ClipboardCheck, Clock3, History, Images, MapPin, Plus, RefreshCw, Search, Trash2, Users, X } from 'lucide-react';
import { consultarEquipe } from '../lib/equipe';
import CampoTextoPaco from '../components/CampoTextoPaco';
import {
  UNIDADE_PACO, acessos, carregarFotosPaco, carregarRoteiroPaco, carregarVistoriasPaco,
  chaveFotoItem, frequencias, prepararFotoPaco, qualidades, salvarVistoriaPaco,
} from '../lib/paco';
import { perguntasDoSetor, qualidadeDosItens, resultadosItens } from '../lib/pacoChecklist';
import PacoPainel, { diaPaco, periodosPaco } from './PacoPainel';
import './PacoScreen.css';

const grupoDe = rotina => rotina.pavimento_ou_area + ' · ' + rotina.grupo;
const diaLocal = data => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(data);
const rotuloData = data => new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short',
}).format(new Date(data));
const equipeVazia = { previsto: '', cobertura: '', presentes: [] };
const tiposFoto = ['antes', 'depois'];
const normalizarBusca = texto => texto.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR').trim();

function textoRevisao(revisao) {
  if (revisao.tipo === 'intervalo') return 'Passar no local a cada ' + revisao.minutos + ' min e verificar as condições.';
  if (revisao.tipo === 'horarios_fixos') return 'Revisar às ' + revisao.horarios.join(' e ') + '.';
  if (revisao.tipo === 'sob_demanda') return 'Revisar quando solicitado.';
  return 'Verificação pelo gestor.';
}

function Roteiro({ rotina }) {
  const tarefa = rotina.primeira_tarefa;
  return <section className="paco-roteiro">
    <h3>Roteiro do setor</h3>
    <div className="paco-roteiro-horario">
      <Clock3 size={17} aria-hidden="true" />
      <div>
        {tarefa.tipo === 'janela' && <p>Primeira limpeza das <strong>{tarefa.inicio} às {tarefa.fim}</strong></p>}
        <p>{textoRevisao(rotina.revisao)}</p>
      </div>
    </div>
    {tarefa.tipo === 'agendamento' && <p className="text-sm font-semibold">{tarefa.requisito}</p>}
    {rotina.acesso === 'autorizacao' && <p className="text-sm font-semibold">Solicite autorização antes de acessar o local.</p>}
    <ul className="paco-atividades" aria-label="Atividades do setor">
      {rotina.atividades.split('/').map(item => item.trim()).filter(Boolean).map((item, index) =>
        <li key={index}>{item}</li>)}
    </ul>
    {rotina.tarefas_adicionais?.map(extra => <p key={extra.atividade} className="text-sm">
      {extra.atividade} na {extra.dia_da_semana} às {extra.horario}.
    </p>)}
  </section>;
}

function Etapa({ numero, titulo, Icone, children }) {
  return <section className="paco-card paco-etapa">
    <div className="paco-etapa-titulo">
      <span className="paco-etapa-icone"><Icone size={19} aria-hidden="true" /></span>
      <h3>{titulo}</h3>
      <span className="paco-etapa-numero" aria-label={'Etapa ' + numero}>0{numero}</span>
    </div>
    {children}
  </section>;
}

function Avaliacao({ nome, titulo, valor, onChange, opcoes }) {
  return <fieldset className="paco-avaliacao">
    <legend>{titulo}</legend>
    <div className="paco-respostas" data-opcoes={Object.keys(opcoes).length}>
      {Object.entries(opcoes).map(([chave, rotulo], index) => <label key={chave} data-tom={['ok', 'alerta'][index] ?? 'neutro'}>
        <input type="radio" name={nome} value={chave} checked={valor === chave} required
          onChange={() => onChange(chave)} />
        <span>{rotulo}</span>
      </label>)}
    </div>
  </fieldset>;
}

function CartaoFoto({ tipo, foto, processando, onSelecionar, onRemover }) {
  const camera = useRef(null);
  const galeria = useRef(null);
  const [preview, setPreview] = useState('');
  const titulo = tipo === 'antes' ? 'Antes' : 'Depois';

  useEffect(() => {
    if (!foto) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(foto);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [foto]);

  return <section className="paco-foto-card" aria-label={'Foto ' + tipo}>
    <div className="paco-foto-titulo">
      <h4>{titulo}</h4>
      {foto && <span><Check size={14} aria-hidden="true" /> Anexada</span>}
    </div>
    {foto && preview ? <img className="paco-foto-preview" src={preview} alt={'Prévia da foto ' + tipo} />
      : <div className="paco-foto-vazia">
        <Camera size={25} aria-hidden="true" />
        <p>{processando ? 'Preparando a foto…' : tipo === 'antes' ? 'Condição encontrada' : 'Resultado após a limpeza'}</p>
      </div>}
    <input ref={camera} type="file" accept="image/*" capture="environment" hidden
      aria-label={'Câmera para foto ' + tipo} onChange={onSelecionar} />
    <input ref={galeria} type="file" accept="image/*" hidden
      aria-label={'Arquivo para foto ' + tipo} onChange={onSelecionar} />
    <div className="paco-foto-acoes">
      <button type="button" className="paco-foto-botao" aria-label={'Tirar foto ' + tipo} onClick={() => camera.current.click()}>
        <Camera size={16} aria-hidden="true" /> Câmera
      </button>
      <button type="button" className="paco-foto-botao" aria-label={'Escolher foto ' + tipo + ' da galeria'} onClick={() => galeria.current.click()}>
        <Images size={16} aria-hidden="true" /> Galeria
      </button>
      {foto && <button type="button" className="paco-foto-botao paco-foto-remover" onClick={onRemover}
        aria-label={'Remover foto ' + tipo}><Trash2 size={16} aria-hidden="true" /></button>}
    </div>
  </section>;
}

function Selecao({ rotulo, valor, onChange, opcoes, obrigatorio = false, vazio = 'Selecione' }) {
  return <label className="grid gap-1 text-sm font-semibold">
    {rotulo}
    <select className="app-input" required={obrigatorio} value={valor} onChange={e => onChange(e.target.value)}>
      <option value="">{vazio}</option>
      {Object.entries(opcoes).map(([id, texto]) => <option value={id} key={id}>{texto}</option>)}
    </select>
  </label>;
}

function ocorrencias(pessoa) {
  const rotulos = { ferias: 'Em férias', afastado: 'Afastado', advertencia: 'Advertência entregue', atestado: 'Atestado vigente', falta: 'Falta registrada' };
  return Object.entries(rotulos).filter(([chave]) => pessoa[chave]).map(([, rotulo]) => rotulo);
}

function EquipePaco({ pessoas, equipe, setEquipe, consultar, consulta }) {
  const [busca, setBusca] = useState('');
  const opcoes = Object.fromEntries(pessoas.map(p => [p.id, p.nome]));
  const termo = normalizarBusca(busca);
  const visiveis = pessoas.filter(p => normalizarBusca(p.nome).includes(termo));
  const selecionados = equipe.presentes;
  const idsSelecionados = new Set(selecionados.map(p => p.id));
  const { carregando, erro, data } = consulta;

  function marcar({ id, nome, funcao }) {
    setEquipe(atual => ({
      ...atual,
      presentes: atual.presentes.some(p => p.id === id)
        ? atual.presentes.filter(p => p.id !== id)
        : [...atual.presentes, { id, nome, funcao }],
    }));
  }

  return <>
    <div className="paco-equipe-topo">
      <div>
        <p className="paco-muted">Marque quem você encontrou no setor.</p>
        {data && <p className="paco-muted">Gestão Demax · consultado em {rotuloData(data)}</p>}
      </div>
      <button className="app-secondary" type="button" onClick={consultar} disabled={carregando}>
        <RefreshCw size={15} aria-hidden="true" /> {carregando ? 'Consultando…' : 'Atualizar'}
      </button>
    </div>
    {carregando && <p role="status" className="paco-muted">Buscando funcionários alocados no Paço…</p>}
    {erro && <p role="status" className="paco-erro"><CircleAlert size={16} aria-hidden="true" /> {erro}</p>}
    {data && !pessoas.length && !carregando && !erro &&
      <p role="status" className="paco-muted">O Gestão Demax não retornou funcionários para o posto.</p>}
    {(pessoas.length > 0 || selecionados.length > 0) &&
      <p className="paco-muted" aria-live="polite">{selecionados.length} {selecionados.length === 1 ? 'presença marcada' : 'presenças marcadas'}</p>
    }
    {selecionados.length > 0 && <ul className="paco-equipe-selecionados" aria-label="Funcionários marcados como presentes">
      {selecionados.map(p => <li key={p.id}><button type="button" onClick={() => marcar(p)} aria-label={'Remover presença de ' + p.nome}>
        {p.nome} <X size={14} aria-hidden="true" />
      </button></li>)}
    </ul>}
    {pessoas.length > 0 && <>
      <label className="paco-equipe-busca">
        <span className="sr-only">Buscar funcionário pelo nome</span>
        <Search size={17} aria-hidden="true" />
        <input type="search" className="app-input" value={busca} placeholder="Buscar pelo nome"
          onChange={evento => setBusca(evento.target.value)} />
      </label>
      {visiveis.length > 0 ? <ul className="paco-equipe-lista" aria-label="Funcionários do Paço">
        {visiveis.map(p => {
          const situacoes = ocorrencias(p);
          return <li key={p.id}>
            <label>
              <input type="checkbox" checked={idsSelecionados.has(p.id)} onChange={() => marcar(p)} />
              <span>
                <strong>{p.nome}</strong>
                {p.funcao && <small>{p.funcao}</small>}
                {situacoes.length > 0 && <small className="paco-equipe-situacao">{situacoes.join(' · ')}</small>}
              </span>
            </label>
          </li>;
        })}
      </ul> : <p role="status" className="paco-muted">Nenhum nome encontrado nessa busca.</p>}
      <details className="paco-equipe-cobertura">
        <summary>Registrar cobertura do setor</summary>
        <div className="paco-duas-colunas">
          <Selecao rotulo="Pessoa prevista" valor={equipe.previsto} opcoes={opcoes} vazio="Sem identificação"
            onChange={previsto => setEquipe(atual => ({ ...atual, previsto, cobertura: previsto === atual.cobertura ? '' : atual.cobertura }))} />
          <Selecao rotulo="Quem cobriu" valor={equipe.cobertura} vazio="Sem substituição"
            opcoes={Object.fromEntries(Object.entries(opcoes).filter(([id]) => id !== equipe.previsto))}
            onChange={cobertura => setEquipe(atual => ({ ...atual, cobertura }))} />
        </div>
      </details>
    </>}
  </>;
}

function Formulario({ roteiro, onSalvo, ativo }) {
  const [id, setId] = useState(() => crypto.randomUUID());
  const [grupo, setGrupo] = useState('');
  const [rotinaId, setRotinaId] = useState('');
  const [acesso, setAcesso] = useState('');
  const [frequencia, setFrequencia] = useState('');
  const [respostas, setRespostas] = useState({});
  const [observacaoGeral, setObservacaoGeral] = useState('');
  const [referenciaAcesso, setReferenciaAcesso] = useState('');
  const [gravando, setGravando] = useState(false);
  const [fotos, setFotos] = useState({});
  const [equipe, setEquipe] = useState(equipeVazia);
  const [pessoas, setPessoas] = useState([]);
  const [consulta, setConsulta] = useState({ carregando: false, erro: '', data: null });
  const [revisaoEquipe, setRevisaoEquipe] = useState(0);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [processando, setProcessando] = useState('');
  const grupos = [...new Set(roteiro.map(grupoDe))];
  const setores = roteiro.filter(rotina => grupoDe(rotina) === grupo);
  const rotina = setores.find(item => item.id === rotinaId);
  const modo = rotina?.acesso;
  const bloqueada = acesso.startsWith('aguardando_');
  const autorizada = acesso === 'autorizado' || acesso === 'agendado';
  const podeAvaliar = modo === 'livre' || autorizada;
  const temDesvio = frequencia === 'fora_do_previsto';
  const totalFotos = Object.values(fotos).filter(Boolean).length;
  const temLocal = Boolean(rotina);
  const perguntas = useMemo(() => perguntasDoSetor(rotina), [rotina]);
  const respondidas = perguntas.filter(item => respostas[item.id]?.resultado).length;

  useEffect(() => {
    if (!temLocal) return;
    let ativa = true;
    setConsulta(atual => ({ ...atual, carregando: true, erro: '' }));
    consultarEquipe(UNIDADE_PACO).then(resposta => {
      if (!ativa) return;
      const disponiveis = new Set(resposta.colaboradores.map(p => p.id));
      setPessoas(resposta.colaboradores);
      setEquipe(atual => ({
        ...atual,
        previsto: disponiveis.has(atual.previsto) ? atual.previsto : '',
        cobertura: disponiveis.has(atual.cobertura) ? atual.cobertura : '',
      }));
      setConsulta({ carregando: false, erro: '', data: resposta.consultadaEm });
    }).catch(falha => {
      if (ativa) setConsulta(atual => ({ ...atual, carregando: false, erro: falha.message }));
    });
    return () => { ativa = false; };
  }, [temLocal, revisaoEquipe]);

  function trocarSetor(valor) {
    setRotinaId(valor);
    setAcesso('');
    setFrequencia('');
    setRespostas({});
    setObservacaoGeral('');
    setReferenciaAcesso('');
    setFotos({});
    setEquipe(equipeVazia);
    setErro('');
  }

  function atualizarResposta(idItem, campos) {
    setRespostas(atuais => ({ ...atuais, [idItem]: { ...atuais[idItem], ...campos } }));
    if (campos.resultado && campos.resultado !== 'precisa_corrigir') {
      setFotos(atuais => ({
        ...atuais,
        [chaveFotoItem(idItem, 'antes')]: null,
        [chaveFotoItem(idItem, 'depois')]: null,
      }));
    }
  }

  async function selecionarFoto(evento, tipo) {
    const arquivo = evento.currentTarget.files[0];
    evento.currentTarget.value = '';
    if (!arquivo) return;
    setProcessando(tipo);
    try {
      const foto = await prepararFotoPaco(arquivo);
      setFotos(atuais => ({ ...atuais, [tipo]: foto }));
      setErro('');
    } catch {
      setErro('Não foi possível abrir a foto. Selecione outra imagem.');
    } finally {
      setProcessando('');
    }
  }

  async function salvar(evento) {
    evento.preventDefault();
    if (gravando) return;
    const dia = new Date(diaLocal(new Date()) + 'T12:00:00Z').getUTCDay();
    if (dia === 0 || dia === 6) {
      setErro('O roteiro do Paço se aplica de segunda a sexta.');
      return;
    }
    const observacao = observacaoGeral.trim();
    const referencia = autorizada ? referenciaAcesso.trim() : '';
    if (autorizada && !referencia) {
      setErro('Informe quem autorizou ou a referência do agendamento.');
      return;
    }
    if (temDesvio && !observacao && !bloqueada) {
      setErro('Descreva o desvio de frequência observado.');
      return;
    }
    const itens = podeAvaliar ? perguntas.map(item => ({
      ...item,
      resultado: respostas[item.id]?.resultado,
      observacao: respostas[item.id]?.resultado === 'precisa_corrigir' ? respostas[item.id]?.observacao?.trim() ?? '' : '',
      foto_antes: Boolean(fotos[chaveFotoItem(item.id, 'antes')]),
      foto_depois: Boolean(fotos[chaveFotoItem(item.id, 'depois')]),
    })) : [];
    if (itens.some(item => !item.resultado || (item.resultado === 'precisa_corrigir' && !item.observacao))) {
      setErro('Responda os itens e descreva cada correção necessária.');
      return;
    }
    const qualidade = qualidadeDosItens(itens);
    const pessoaDoGestao = chave => {
      const pessoa = pessoas.find(p => p.id === equipe[chave]);
      return pessoa ? { id: pessoa.id, nome: pessoa.nome } : null;
    };
    const presentes = equipe.presentes;
    setSalvando(true);
    setErro('');
    try {
      await salvarVistoriaPaco(id, {
        rotina_id: rotinaId, acesso: modo === 'livre' ? 'livre' : acesso, referencia_acesso: referencia,
        frequencia: bloqueada ? 'nao_verificada' : frequencia,
        qualidade,
        observacao: observacao || (qualidade === 'precisa_corrigir' ? 'Correções registradas nos itens da avaliação.' : ''),
        previsto: pessoaDoGestao('previsto'), cobertura: pessoaDoGestao('cobertura'),
        ...(itens.length ? { itens } : {}),
        ...(presentes.length ? { presentes } : {}),
      }, bloqueada ? {} : fotos);
      trocarSetor('');
      setId(crypto.randomUUID());
      onSalvo();
    } catch (falha) {
      if (['42703', 'PGRST204'].includes(falha.code)) {
        setErro('O banco do piloto precisa da atualização do checklist para salvar esta vistoria.');
      } else {
        setErro(falha.code === 'P0001' ? falha.message : 'Não foi possível registrar a vistoria. Tente salvar novamente.');
      }
    } finally {
      setSalvando(false);
    }
  }

  return <form className="paco-form" onSubmit={salvar}>
    <div className="paco-intro">
      <h2>Nova vistoria por amostragem</h2>
      <p>Escolha o local, confira a rotina e registre o que observou.</p>
    </div>
    <fieldset disabled={salvando || Boolean(processando)} className="paco-form-campos">
      <Etapa numero={1} titulo="Local e roteiro" Icone={MapPin}>
        <div className="paco-duas-colunas">
          <Selecao rotulo="Pavimento e grupo" valor={grupo} onChange={valor => { setGrupo(valor); trocarSetor(''); }}
            opcoes={Object.fromEntries(grupos.map(item => [item, item]))} obrigatorio />
          {grupo && <Selecao rotulo="Local" valor={rotinaId} onChange={trocarSetor}
            opcoes={Object.fromEntries(setores.map(item => [item.id, item.local]))} obrigatorio />}
        </div>
        {rotina && <Roteiro rotina={rotina} />}
      </Etapa>
      {rotina && <div key={rotinaId} className="paco-form-campos">
        <Etapa numero={2} titulo="Equipe presente" Icone={Users}>
          <EquipePaco pessoas={pessoas} equipe={equipe} setEquipe={setEquipe} consulta={consulta}
            consultar={() => setRevisaoEquipe(valor => valor + 1)} />
        </Etapa>
        <Etapa numero={3} titulo="Avaliação do setor" Icone={ClipboardCheck}>
        {modo !== 'livre' && <Selecao rotulo="Situação de acesso" valor={acesso} onChange={valor => {
          setAcesso(valor);
          if (valor !== 'autorizado' && valor !== 'agendado') {
            setFrequencia('');
            setRespostas({});
            setFotos({});
            setReferenciaAcesso('');
          }
        }} obrigatorio
          opcoes={modo === 'agendamento'
            ? { agendado: acessos.agendado, aguardando_agendamento: acessos.aguardando_agendamento }
            : { autorizado: acessos.autorizado, aguardando_autorizacao: acessos.aguardando_autorizacao }} />}
        {autorizada && <CampoTextoPaco
          rotulo={modo === 'agendamento' ? 'Data ou referência do agendamento com a manutenção' : 'Quem autorizou o acesso'}
          valor={referenciaAcesso} onChange={setReferenciaAcesso}
          limite={200} linhaUnica obrigatorio ativo={ativo} onGravacao={setGravando} />}
        {podeAvaliar && <>
          <Avaliacao nome="frequencia" titulo="Frequência observada" valor={frequencia} onChange={setFrequencia}
            opcoes={{ conforme: 'Conforme o roteiro', fora_do_previsto: 'Fora do previsto', nao_verificada: 'Não verificada' }} />
          <p className="paco-muted" aria-live="polite">{respondidas} de {perguntas.length} perguntas respondidas</p>
          {perguntas.map(({ id: idItem, pergunta }) => <div key={idItem} className="paco-item">
            <Avaliacao nome={'qualidade-' + idItem} titulo={pergunta} valor={respostas[idItem]?.resultado}
              onChange={resultado => atualizarResposta(idItem, { resultado })} opcoes={resultadosItens} />
            {respostas[idItem]?.resultado === 'precisa_corrigir' && <>
              <CampoTextoPaco rotulo="O que precisa ser corrigido?" limite={1000} obrigatorio
                valor={respostas[idItem]?.observacao ?? ''}
                onChange={observacao => atualizarResposta(idItem, { observacao })}
                ativo={ativo} onGravacao={setGravando} />
              <div className="paco-duas-colunas">{tiposFoto.map(tipo => {
                const chave = chaveFotoItem(idItem, tipo);
                return <CartaoFoto key={tipo} tipo={tipo} foto={fotos[chave]} processando={processando === chave}
                  onSelecionar={evento => selecionarFoto(evento, chave)}
                  onRemover={() => setFotos(atuais => ({ ...atuais, [chave]: null }))} />;
              })}</div>
            </>}
          </div>)}
        </>}
        <CampoTextoPaco rotulo="Observações" limite={2000}
          valor={observacaoGeral} onChange={setObservacaoGeral}
          placeholder={temDesvio ? 'Descreva o que estava fora do previsto.' : 'Acrescente um detalhe, se precisar.'}
          obrigatorio={podeAvaliar && temDesvio} ativo={ativo} onGravacao={setGravando} />
        </Etapa>
        {podeAvaliar && <Etapa numero={4} titulo="Fotos gerais do setor" Icone={Camera}>
          <p className="paco-muted">Use estas fotos para registrar a visão geral do ambiente.</p>
          <div className="paco-duas-colunas">
            {tiposFoto.map(tipo => <CartaoFoto key={tipo} tipo={tipo} foto={fotos[tipo]} processando={processando === tipo}
              onSelecionar={evento => selecionarFoto(evento, tipo)}
              onRemover={() => setFotos(atuais => ({ ...atuais, [tipo]: null }))} />)}
          </div>
        </Etapa>}
        <div className="paco-card paco-envio">
          {erro && <p role="alert" className="paco-erro"><CircleAlert size={17} aria-hidden="true" /> {erro}</p>}
          {podeAvaliar && <span className="paco-muted" aria-live="polite">{totalFotos} {totalFotos === 1 ? 'foto anexada' : 'fotos anexadas'}</span>}
          {gravando && <p className="paco-muted">Encerre o ditado antes de registrar a vistoria.</p>}
          <button type="submit" className="app-primary" disabled={(!acesso && modo !== 'livre') || salvando || gravando}>
            <Check size={17} aria-hidden="true" /> {salvando ? 'Salvando…' : 'Registrar vistoria'}
          </button>
        </div>
      </div>}
    </fieldset>
  </form>;
}

function GaleriaPaco({ fotos }) {
  if (!fotos.length) return null;
  return <div className="paco-duas-colunas">{fotos.map(({ chave, tipo, url }) => <figure className="paco-foto-card" key={chave}>
    <figcaption className="text-sm font-semibold">Foto {tipo}</figcaption>
    {url ? <a href={url} target="_blank" rel="noreferrer"><img src={url} className="paco-foto-preview" alt={'Evidência ' + tipo} /></a>
      : <p className="text-sm">Foto indisponível.</p>}
  </figure>)}</div>;
}

function Detalhe({ vistoria }) {
  const [fotos, setFotos] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const itens = vistoria.itens ?? [];
  const total = [vistoria, ...itens].reduce((soma, item) => soma + tiposFoto.filter(tipo => item['foto_' + tipo]).length, 0);
  async function abrirFotos() {
    if (carregando) return;
    setCarregando(true);
    setErro('');
    try {
      setFotos(await carregarFotosPaco(vistoria));
    } catch {
      setErro('Não foi possível abrir as fotos.');
    } finally {
      setCarregando(false);
    }
  }
  return <details className="paco-registro" onToggle={evento => {
    if (evento.currentTarget.open && total) abrirFotos();
  }}>
    <summary>
      <div>
        <strong>{vistoria.rotina_registrada.local}</strong>
        <p>{grupoDe(vistoria.rotina_registrada)} · {rotuloData(vistoria.registrada_em)}</p>
      </div>
      {total > 0 && <span className="paco-contagem-fotos"><Camera size={15} aria-hidden="true" /> {total} {total === 1 ? 'foto' : 'fotos'}</span>}
    </summary>
    <div className="paco-registro-corpo">
    <p className="text-sm">{vistoria.encarregado_nome}</p>
    <p className="text-sm">{frequencias[vistoria.frequencia]} · {qualidades[vistoria.qualidade]}</p>
    <p className="text-sm">{acessos[vistoria.acesso]}{vistoria.referencia_acesso && ' · ' + vistoria.referencia_acesso}</p>
    {vistoria.observacao && <p className="text-sm whitespace-pre-wrap">{vistoria.observacao}</p>}
    {vistoria.previsto && <p className="text-sm">Pessoa prevista: {vistoria.previsto.nome}</p>}
    {vistoria.cobertura && <p className="text-sm">Cobertura: {vistoria.cobertura.nome}</p>}
    {vistoria.presentes?.length > 0 && <div>
      <h3 className="text-sm font-semibold">Equipe encontrada no setor</h3>
      <ul className="paco-equipe-historico">
        {vistoria.presentes.map(p => <li key={p.id}>{p.nome}{p.funcao ? ' · ' + p.funcao : ''}</li>)}
      </ul>
    </div>}
    <Roteiro rotina={vistoria.rotina_registrada} />
    {itens.length > 0 && <div className="space-y-2">
      <h3 className="text-sm font-semibold">Itens vistoriados</h3>
      {itens.map(item => <section key={item.id} className="paco-item">
        <h4 className="text-sm font-semibold">{item.pergunta}</h4>
        <p className="paco-muted">{resultadosItens[item.resultado]}</p>
        {item.observacao && <p className="text-sm whitespace-pre-wrap">{item.observacao}</p>}
        <GaleriaPaco fotos={(fotos ?? []).filter(foto => foto.itemId === item.id)} />
      </section>)}
    </div>}
    {carregando && <p role="status" className="paco-muted">Carregando evidências…</p>}
    {erro && <p role="alert" className="text-sm text-red-800">{erro}</p>}
    <GaleriaPaco fotos={(fotos ?? []).filter(foto => !foto.itemId)} />
    {total > 0 && !carregando && <button type="button" className="app-secondary" onClick={abrirFotos}>
      {erro ? 'Tentar novamente' : 'Atualizar fotos'}
    </button>}
    </div>
  </details>;
}

export default function PacoScreen({ perfil }) {
  const campo = perfil?.papel === 'campo_paco';
  const [roteiro, setRoteiro] = useState(null);
  const [registros, setRegistros] = useState(null);
  const [erro, setErro] = useState('');
  const [versao, setVersao] = useState(0);
  const [aviso, setAviso] = useState('');
  const [grupo, setGrupo] = useState('');
  const [dias, setDias] = useState('7');
  const [pagina, setPagina] = useState(campo ? 'nova' : 'painel');
  const [periodo, setPeriodo] = useState('semana');
  const [diaSelecionado, setDiaSelecionado] = useState('');
  const hoje = diaLocal(new Date());
  const periodos = periodosPaco(hoje);
  const inicioHistorico = new Date(Date.parse(hoje + 'T00:00:00Z') - (Number(dias) - 1) * 86400000).toISOString().slice(0, 10);
  const inicioConsulta = pagina === 'historico' && inicioHistorico < periodos.primeiro ? inicioHistorico : periodos.primeiro;
  const fimConsulta = periodos.proximo;
  const painel = pagina === 'painel';

  useEffect(() => {
    if (!perfil?.paco) return;
    let ativo = true;
    setRegistros(null);
    setErro('');
    Promise.all([carregarRoteiroPaco(), carregarVistoriasPaco(inicioConsulta + 'T00:00:00-03:00', fimConsulta + 'T00:00:00-03:00')])
      .then(([itens, visitas]) => {
        if (!ativo) return;
        setRoteiro(itens);
        setRegistros(visitas);
      })
      .catch(() => { if (ativo) setErro('Não foi possível carregar os dados do Paço.'); });
    return () => { ativo = false; };
  }, [perfil?.paco, inicioConsulta, fimConsulta, versao]);

  if (!perfil?.paco) return <p className="field-card">O acesso ao Paço precisa ser liberado pela administração.</p>;
  const grupos = [...new Set((roteiro ?? []).map(grupoDe))];
  const filtrados = (registros ?? []).filter(item => !grupo || grupoDe(item.rotina_registrada) === grupo);
  const visiveis = filtrados.filter(item => {
    const dia = diaPaco(item.registrada_em);
    return painel ? dia >= periodos[periodo].inicio && (!diaSelecionado || dia === diaSelecionado) : dia >= inicioHistorico;
  });

  function mostrarPagina(destino) {
    setPagina(destino);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  return <main className="app-content paco-conteudo" data-menu={perfil.papel === 'admin'}>
    <div className="paco-paginas" role="group" aria-label="Vistorias do Paço">
      {campo && <button type="button" aria-pressed={pagina === 'nova'} onClick={() => mostrarPagina('nova')}>
        <Plus size={18} aria-hidden="true" /> Nova vistoria
      </button>}
      <button type="button" aria-pressed={painel} onClick={() => mostrarPagina('painel')}>
        <Activity size={17} aria-hidden="true" /> Painel
      </button>
      <button type="button" aria-pressed={pagina === 'historico'} onClick={() => mostrarPagina('historico')}>
        <History size={17} aria-hidden="true" /> Histórico
      </button>
    </div>
    {aviso && <p role="status" className="paco-sucesso"><Check size={17} aria-hidden="true" /> {aviso}</p>}
    {campo && <div hidden={pagina !== 'nova'}>
      {roteiro?.length > 0 ? <Formulario roteiro={roteiro} ativo={pagina === 'nova'} onSalvo={() => {
        setAviso('Vistoria registrada.');
        setVersao(valor => valor + 1);
        mostrarPagina('historico');
      }} /> : <section className="paco-card">
        {erro ? <p role="alert">{erro} <button className="underline" onClick={() => setVersao(v => v + 1)}>Tentar novamente</button></p>
          : <p role="status">Carregando roteiro…</p>}
      </section>}
    </div>}
    <section className="paco-card space-y-4" hidden={pagina === 'nova'}>
      <div className="paco-intro">
        <h2>{painel ? 'Termômetro de vistorias' : campo ? 'Minhas vistorias no Paço' : 'Histórico do Paço'}</h2>
        <p>{painel ? 'Acompanhe o ritmo das vistorias e o resultado das avaliações.' : 'Consulte os registros e as evidências.'}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {painel ? <Selecao rotulo="Período" valor={periodo}
          onChange={valor => { if (valor) { setPeriodo(valor); setDiaSelecionado(''); } }}
          opcoes={{ dia: 'Hoje', semana: 'Esta semana', mes: 'Este mês' }} />
          : <Selecao rotulo="Período" valor={dias} onChange={valor => { if (valor) setDias(valor); }}
            opcoes={{ 7: 'Últimos 7 dias', 30: 'Últimos 30 dias', 90: 'Últimos 90 dias' }} />}
        <Selecao rotulo="Pavimento e grupo" valor={grupo} onChange={setGrupo} vazio="Todos"
          opcoes={Object.fromEntries(grupos.map(item => [item, item]))} />
      </div>
      {erro ? <p role="alert" className="text-sm text-red-800">{erro} <button className="underline" onClick={() => setVersao(v => v + 1)}>Tentar novamente</button></p>
        : !registros ? <p role="status">Carregando vistorias…</p> : <>
          {painel && <PacoPainel registros={filtrados} hoje={hoje} periodos={periodos}
            periodo={periodo} diaSelecionado={diaSelecionado} selecionarDia={setDiaSelecionado} />}
          {painel && <h3 className="font-semibold">Registros e horários</h3>}
          {!visiveis.length && <p className="text-sm">Nenhuma vistoria registrada no período para este filtro.</p>}
          {visiveis.map(item => <Detalhe key={item.id} vistoria={item} />)}
        </>}
    </section>
  </main>;
}
