import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import RevisaoIA from './RevisaoIA';

let ditadoAtual = null;

const mensagensDitado = {
  'not-allowed': 'Permita o uso do microfone no navegador e tente novamente.',
  'service-not-allowed': 'O serviço de ditado está bloqueado neste navegador.',
  'audio-capture': 'O navegador não encontrou um microfone disponível.',
  'no-speech': 'Nenhuma fala foi reconhecida. Tente novamente.',
  network: 'O serviço de ditado não respondeu. Confira a conexão.',
};

export default function CampoTextoPaco({
  rotulo, valor, onChange, limite, placeholder, obrigatorio = false, linhaUnica = false,
  ativo, onGravacao,
}) {
  const Reconhecimento = globalThis.SpeechRecognition ?? globalThis.webkitSpeechRecognition;
  const sessao = useRef(null);
  const [estado, setEstado] = useState('');
  const [transcricao, setTranscricao] = useState('');
  const [erro, setErro] = useState('');
  const gravando = Boolean(estado);

  useEffect(() => {
    if (!ativo) {
      setEstado('');
      setTranscricao('');
      setErro('');
    }
    return () => {
      const atual = sessao.current;
      if (!atual) return;
      sessao.current = null;
      if (ditadoAtual === atual) ditadoAtual = null;
      clearTimeout(atual.timer);
      try { atual.voz.abort(); } catch { /* O navegador já pode ter encerrado a sessão. */ }
      onGravacao(false);
    };
  }, [ativo, onGravacao]);

  function parar() {
    const atual = sessao.current;
    if (!atual || atual.parando) return;
    atual.parando = true;
    setEstado('Finalizando…');
    try {
      atual.voz.stop();
    } catch {
      atual.voz.onend();
    }
  }

  function iniciar() {
    if (!ativo || !Reconhecimento || sessao.current) return;
    if (ditadoAtual) {
      setErro('Finalize o ditado no outro campo primeiro.');
      return;
    }
    setTranscricao('');
    setErro('');
    let voz;
    try {
      voz = new Reconhecimento();
    } catch {
      setErro('Não foi possível abrir o reconhecimento de voz neste navegador.');
      return;
    }
    const atual = { voz, texto: '', timer: null, parando: false, falhou: false };
    sessao.current = atual;
    ditadoAtual = atual;
    voz.lang = 'pt-BR';
    voz.continuous = true;
    voz.interimResults = true;
    voz.onstart = () => {
      if (sessao.current === atual && !atual.parando) setEstado('Ouvindo…');
    };
    voz.onresult = evento => {
      if (sessao.current !== atual) return;
      const resultados = Array.from(evento.results);
      atual.texto = resultados.filter(item => item.isFinal).map(item => item[0].transcript.trim()).join(' ');
      setTranscricao(resultados.map(item => item[0].transcript.trim()).join(' '));
    };
    voz.onerror = evento => {
      if (sessao.current !== atual) return;
      atual.falhou = true;
      setErro(mensagensDitado[evento.error] ?? 'Não foi possível concluir o ditado. Tente novamente.');
    };
    function finalizar() {
      if (sessao.current !== atual) return;
      clearTimeout(atual.timer);
      sessao.current = null;
      ditadoAtual = null;
      onGravacao(false);
      setEstado('');
      setTranscricao(atual.texto.trim());
      if (!atual.texto.trim() && !atual.falhou) setErro(mensagensDitado['no-speech']);
    }
    voz.onend = finalizar;
    try {
      setEstado('Iniciando microfone…');
      onGravacao(true);
      voz.start();
      atual.timer = setTimeout(parar, 60000);
    } catch {
      atual.falhou = true;
      setErro('Não foi possível iniciar o microfone. Confira a permissão do navegador.');
      finalizar();
    }
  }

  const normalizar = texto => linhaUnica ? texto.replace(/\s*\r?\n\s*/g, ' ') : texto;
  const inserido = [valor.trimEnd(), transcricao.trim()].filter(Boolean).join(linhaUnica ? ' ' : '\n');
  const excedeLimite = inserido.length > limite;
  const propsCampo = {
    className: 'app-input', value: valor, maxLength: limite,
    required: obrigatorio, placeholder, onChange: evento => onChange(evento.target.value),
  };

  return <div className="space-y-2">
    <label className="grid gap-1 text-sm font-semibold">
      {rotulo}
      {linhaUnica ? <input {...propsCampo} /> : <textarea {...propsCampo} rows={2} />}
    </label>
    <div className="paco-ditado">
      {Reconhecimento ? <button type="button" className="app-secondary" onClick={gravando ? parar : iniciar}
        disabled={!ativo || estado === 'Finalizando…' || (!gravando && Boolean(transcricao))}>
        {gravando ? <Square size={16} aria-hidden="true" /> : <Mic size={16} aria-hidden="true" />}
        {gravando ? 'Encerrar ditado' : 'Ditar por voz'}
      </button> : <p className="paco-muted">O ditado não está disponível neste navegador.</p>}
      {Reconhecimento && !estado && <p className="paco-muted">O navegador transcreve a voz. A vistoria guarda apenas o texto inserido.</p>}
      {estado && <p role="status" className="paco-muted">{estado}</p>}
      {erro && <p role="alert" className="text-sm text-red-800">{erro}</p>}
    </div>
    {transcricao && <div className="paco-item">
      <label className="grid gap-1 text-sm font-semibold">
        Transcrição
        <textarea className="app-input" rows={2} value={transcricao} disabled={gravando}
          onChange={evento => setTranscricao(evento.target.value)} />
      </label>
      {!gravando && <>
        {excedeLimite && <p role="status" className="paco-muted">Encurte a transcrição para caber no campo.</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="app-primary" disabled={excedeLimite || !transcricao.trim()}
            onClick={() => { onChange(normalizar(inserido)); setTranscricao(''); }}>
            Inserir transcrição
          </button>
          <button type="button" className="app-secondary" onClick={() => setTranscricao('')}>Descartar</button>
        </div>
      </>}
    </div>}
    <RevisaoIA texto={valor} onAplicar={texto => onChange(normalizar(texto))}
      limite={limite} rotulo="Melhorar texto com IA" desabilitado={gravando || !ativo} />
  </div>;
}
