import React, { useEffect, useState } from 'react';
import { ClipboardCheck, LogOut } from 'lucide-react';
import { supabase, usaSupabase } from '../lib/supabase';

function Login({ mensagem }) {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');

  async function entrar(evento) {
    evento.preventDefault();
    const campos = new FormData(evento.currentTarget);
    setOcupado(true);
    setErro('');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: String(campos.get('email')).trim(),
        password: String(campos.get('senha')),
      });
      if (error) setErro('Não foi possível entrar. Confira o e-mail e a senha.');
    } catch {
      setErro('Sem conexão com o serviço de acesso. Tente novamente.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 grid place-items-center px-5">
      <div className="w-full max-w-sm rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <ClipboardCheck className="text-teal-700 mb-3" size={30} aria-hidden="true" />
        <h1 className="text-2xl font-bold mb-2">Vistoria UBS</h1>
        {mensagem ? <p role="status" className="text-sm text-slate-700">{mensagem}</p> : (
          <form onSubmit={entrar} className="grid gap-3">
            <label className="grid gap-1">E-mail
              <input className="rounded-xl border p-3 text-base" name="email" type="email" autoComplete="username" required />
            </label>
            <label className="grid gap-1">Senha
              <input className="rounded-xl border p-3 text-base" name="senha" type="password" autoComplete="current-password" required />
            </label>
            {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}
            <button type="submit" disabled={ocupado} className="min-h-12 rounded-xl bg-teal-700 text-white font-semibold disabled:opacity-60">
              {ocupado ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

function SessaoSupabase({ children }) {
  const [sessao, setSessao] = useState(undefined);
  const [acesso, setAcesso] = useState(null);
  const [erroSaida, setErroSaida] = useState(false);
  const id = sessao?.user.id;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, sessaoAtual) => setSessao(sessaoAtual));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!id) {
      setAcesso(null);
      return;
    }
    let ativo = true;
    async function carregar() {
      try {
        const { data, error } = await supabase.from('perfis').select('id, nome, papel').eq('id', id).maybeSingle();
        if (ativo) setAcesso({ id, perfil: data, erro: Boolean(error) });
      } catch {
        if (ativo) setAcesso({ id, perfil: null, erro: true });
      }
    }
    carregar();
    return () => { ativo = false; };
  }, [id]);

  async function sair() {
    setErroSaida(false);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) setErroSaida(true);
    } catch {
      setErroSaida(true);
    }
  }

  if (sessao === undefined || (id && acesso?.id !== id)) return <Login mensagem="Verificando acesso…" />;
  if (!id) return <Login />;

  return (
    <>
      <div className="app-account print:hidden">
        <span>{acesso.perfil ? `${acesso.perfil.nome} · ${acesso.perfil.papel === 'admin' ? 'Administração' : 'Campo'}` : 'Conta conectada'}</span>
        <button className="min-h-11 flex items-center gap-2 font-semibold" onClick={sair}><LogOut size={16} /> Sair</button>
      </div>
      {erroSaida && <p role="alert" className="px-4 py-2 text-red-700">Não foi possível sair. Tente novamente.</p>}
      {acesso.perfil ? children(acesso.perfil) : <Login mensagem={acesso.erro
        ? 'Não foi possível verificar seu perfil. Saia e tente novamente.'
        : 'Seu acesso ainda precisa ser liberado pela administração.'} />}
    </>
  );
}

export default function AcessoSupabase({ children }) {
  if (!usaSupabase) return children(null);
  if (!supabase) return <Login mensagem="O acesso ao app ainda está sendo configurado." />;
  return <SessaoSupabase>{children}</SessaoSupabase>;
}
