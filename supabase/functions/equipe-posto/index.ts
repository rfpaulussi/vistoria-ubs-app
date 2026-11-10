const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};

const urlVistoria = Deno.env.get('SUPABASE_URL');
const chavesPublicas = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}') as Record<string, string>;
const chaveVistoria = Deno.env.get('SUPABASE_ANON_KEY') || chavesPublicas.default;
const urlGestao = Deno.env.get('DEMAX_SUPABASE_URL') ?? 'https://fwdhnipekbmeqozkpfyh.supabase.co';
const chaveGestao = Deno.env.get('DEMAX_SUPABASE_KEY');
const contrato = Deno.env.get('DEMAX_CONTRATO_ID') ?? 'c73a81ae-0104-4c05-b7d6-e6266f6be1b2';

type Conexao = { url: string; chave: string; authorization?: string };
type Funcionario = {
  id: string;
  nome: string;
  status: string;
  funcoes: { nome: string } | null;
};
type Ocorrencia = { funcionario_id: string };

async function consultar<T>(conexao: Conexao, tabela: string, filtros: Record<string, string>): Promise<T[]> {
  const url = new URL(`/rest/v1/${tabela}`, conexao.url);
  url.search = new URLSearchParams(filtros).toString();
  const resposta = await fetch(url, {
    headers: {
      apikey: conexao.chave,
      ...(conexao.authorization ? { Authorization: conexao.authorization } : {}),
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!resposta.ok) throw new Error(`${tabela}: HTTP ${resposta.status}`);
  return resposta.json();
}

async function listar<T>(gestao: Conexao, tabela: string, filtros: Record<string, string>) {
  const linhas: T[] = [];
  const limite = 50;
  for (let offset = 0; ; offset += limite) {
    const pagina = await consultar<T>(gestao, tabela, {
      ...filtros, order: 'id.asc', offset: String(offset), limit: String(limite),
    });
    linhas.push(...pagina);
    if (pagina.length < limite) return linhas;
  }
}

async function ocorrenciasDoPosto(gestao: Conexao, funcionarios: Funcionario[], dia: string, usarSituacaoDoCadastro: boolean) {
  const atestados = new Set<string>();
  const faltas = new Set<string>();
  const ferias = new Set<string>();
  const advertencias = new Set<string>();

  for (let inicio = 0; inicio < funcionarios.length; inicio += 50) {
    const ids = funcionarios.slice(inicio, inicio + 50).map(f => f.id);
    const filtro = { select: 'funcionario_id', funcionario_id: `in.(${ids.join(',')})` };
    const consultas = await Promise.all([
      listar<Ocorrencia>(gestao, 'atestados', { ...filtro, data_inicio: `lte.${dia}`, data_fim: `gte.${dia}` }),
      listar<Ocorrencia>(gestao, 'faltas', {
        ...filtro, data_falta: `lte.${dia}`,
        or: `(data_fim.gte.${dia},and(data_fim.is.null,data_falta.eq.${dia}))`,
      }),
      listar<Ocorrencia>(gestao, 'ferias', {
        ...filtro, status: 'in.(aprovado,em_curso,concluido)', data_inicio: `lte.${dia}`, data_fim: `gte.${dia}`,
      }),
      listar<Ocorrencia>(gestao, 'advertencias', {
        ...filtro, status: 'eq.entregue', data_aplicacao: `lte.${dia}`,
        or: '(grau.in.(verbal,escrita),and(grau.is.null,tipo.in.(verbal,escrita)))',
      }),
    ]);
    [atestados, faltas, ferias, advertencias].forEach((destino, i) => {
      consultas[i].forEach(linha => destino.add(linha.funcionario_id));
    });
  }

  return funcionarios.map(({ id, nome, status, funcoes }) => ({
    id, nome, funcao: funcoes?.nome ?? '',
    atestado: atestados.has(id) || (usarSituacaoDoCadastro && status === 'atestado'),
    falta: faltas.has(id) || (usarSituacaoDoCadastro && status === 'faltante'),
    ferias: ferias.has(id) || (usarSituacaoDoCadastro && status === 'ferias'),
    advertencia: advertencias.has(id),
    afastado: status === 'afastado',
  })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return json({ codigo: 'METODO' }, 405);
  const authorization = req.headers.get('Authorization');
  if (!authorization?.match(/^Bearer \S+$/i)) return json({ codigo: 'SEM_ACESSO' }, 401);
  if (!urlVistoria || !chaveVistoria || !chaveGestao) return json({ codigo: 'INTEGRACAO_INDISPONIVEL' }, 503);

  const body = await req.json().catch(() => null);
  const unidade = body?.unidade;
  if (typeof unidade !== 'string' || !unidade || unidade.length > 100) return json({ codigo: 'UNIDADE_INVALIDA' }, 400);

  try {
    const vistoria = { url: urlVistoria, chave: chaveVistoria, authorization };
    const usuario = await fetch(new URL('/auth/v1/user', urlVistoria), {
      headers: { apikey: chaveVistoria, Authorization: authorization },
      signal: AbortSignal.timeout(10000),
    });
    if (usuario.status === 401 || usuario.status === 403) return json({ codigo: 'SEM_ACESSO' }, 401);
    if (!usuario.ok) throw new Error(`auth: HTTP ${usuario.status}`);
    const { id } = await usuario.json();
    const [perfil] = await consultar<{ id: string }>(vistoria, 'perfis', { select: 'id', id: `eq.${id}`, limit: '1' });
    if (!perfil) return json({ codigo: 'SEM_ACESSO' }, 403);

    const [vinculo] = await consultar<{ posto_id: string | null }>(vistoria, 'postos_demax', {
      select: 'posto_id', unidade: `eq.${unidade}`, limit: '1',
    });
    if (!vinculo) return json({ codigo: 'UNIDADE_INVALIDA' }, 400);

    const gestao = {
      url: urlGestao,
      chave: chaveGestao,
      authorization: chaveGestao.startsWith('sb_secret_') ? undefined : `Bearer ${chaveGestao}`,
    };
    const paco = unidade === 'Paço Municipal de Mogi';
    const secretariasPorUnidade: Record<string, string> = {
      'CENTRO POP': 'SEMAS',
      NUBEA: 'SMAPA',
    };
    const secretaria = paco ? 'SMGCP' : (secretariasPorUnidade[unidade] ?? 'SMS');
    const postos = await consultar<{ id: string }>(gestao, 'postos', {
      select: 'id', ativo: 'eq.true', contrato_id: `eq.${contrato}`, limit: '2',
      ...(paco && vinculo.posto_id ? {} : { secretaria: `eq.${secretaria}` }),
      ...(vinculo.posto_id ? { id: `eq.${vinculo.posto_id}` } : { nome: paco ? 'eq.PAÇO MUNICIPAL' : `eq.${unidade}` }),
    });
    if (postos.length !== 1) return json({ codigo: 'POSTO_SEM_VINCULO' }, 409);
    const postoId = postos[0].id;
    const agora = new Date();
    const dia = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(agora);
    const funcionarios = await listar<Funcionario>(gestao, 'funcionarios', {
      select: 'id,nome,status,funcoes!funcao_id(nome)',
      posto_id: `eq.${postoId}`, status: 'in.(ativo,ferias,atestado,afastado,faltante)',
    });
    const colaboradores = await ocorrenciasDoPosto(gestao, funcionarios, dia, paco);
    return json({ unidade, postoId, dataReferencia: dia, consultadaEm: agora.toISOString(), colaboradores });
  } catch (erro) {
    console.error(erro instanceof Error ? erro.message : 'Falha ao consultar a equipe');
    return json({ codigo: 'INTEGRACAO_INDISPONIVEL' }, 502);
  }
});
