# Vistoria UBS no Supabase

A migração em `migrations/` define visitas, respostas, apontamentos e fotos privadas. O aplicativo publicado ainda usa a integração atual até que o novo fluxo e a importação sejam validados.

## Projeto e acesso

1. Crie um projeto Supabase para o Vistoria UBS e guarde o **Project URL**. A chave **publishable** será configurada na Vercel quando o aplicativo passar a usar o Supabase. Mantenha a senha do banco e as chaves secretas fora do repositório e do frontend.
2. Vincule o repositório ao projeto com a Supabase CLI e aplique a migração com `supabase db push --remote`, depois de testá-la em um ambiente separado. Se a CLI ainda não estiver inicializada neste repositório, execute `supabase init` antes de vincular.
3. Crie ou convide os usuários pelo Supabase Auth. Provisione a linha correspondente em `public.perfis` usando o UUID do usuário e o papel `admin` ou `campo`. Crie o primeiro perfil administrativo por uma sessão de administração do banco.

O perfil de campo consulta e edita seus próprios rascunhos e lê suas próprias visitas finalizadas. O perfil administrativo lê o histórico e gerencia responsáveis, prazos e orientações. A finalização abre apontamentos para as não conformidades que não foram corrigidas na visita.

Para testar o app conectado ao Supabase, configure no ambiente **Preview** da Vercel:

- `VITE_SUPABASE_URL` com o Project URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY` com a chave **Publishable**.

No app, entre com o e-mail e senha de um usuário do Supabase Auth com perfil provisionado. O admin abre o Histórico e pode conferir os registros importados. Com um usuário de campo, finalize uma vistoria de teste com foto e confira o registro no Histórico. Com as duas variáveis configuradas, essa versão lê e grava no Supabase.

As imagens ficam no bucket privado `vistoria-evidencias`, com caminhos no formato `<id-da-vistoria>/<nome-único-do-arquivo>`. O acesso ao arquivo depende do acesso à vistoria. Registre o caminho em `public.evidencias` vinculado à resposta correspondente.

## Preservar o histórico

Use um CSV da aba **Vistorias** como fotografia da base existente. A aba **Página9** deve ser conferida separadamente para identificar registros exclusivos antes de qualquer importação.

| Coluna atual | Destino em `vistorias` |
| --- | --- |
| UBS | `unidade` |
| Encarregada | `encarregada` |
| Data | `data_vistoria` |
| Nota | `nota` |
| Retorno | `data_retorno` |
| Observações | `observacoes` |
| Falhas | `falhas_legado` |
| Timestamp | `finalizada_em`, interpretado no fuso da planilha |

Importe com `estado = 'finalizada'` e `responsavel_id = null` até que o vínculo com um usuário seja confirmado. Use uma `referencia_legado` única por linha, formada pelo identificador do arquivo congelado, a aba e o número da linha. Reutilize o mesmo arquivo em novas tentativas. Preserve campos opcionais vazios e sinalize datas inválidas para revisão.

O texto de falhas antigas fica no histórico. O CSV não permite reconstruir com segurança as respostas individuais, as evidências ou quais falhas ainda estão em aberto.

Antes da troca, compare a quantidade de registros e confira amostras por unidade. Em uma prévia da Vercel, teste o login de campo, uma vistoria com foto, o histórico e o tratamento de um apontamento pelo admin. Na troca final, inclua as visitas registradas desde a primeira exportação e valide novamente antes de desativar a integração antiga.

## Conferência da equipe do Gestão Demax

1. Aplique também a migração `20261109000200_conferencia_equipe.sql` no Supabase **da vistoria**.
2. Nos segredos das Edge Functions do projeto da vistoria, configure `DEMAX_SUPABASE_KEY` com uma chave secreta do **Gestão** autorizada a consultar os dados. A função já tem a URL e o ID do contrato Mogi como valores padrão. Se necessário, substitua-os com `DEMAX_SUPABASE_URL` e `DEMAX_CONTRATO_ID` no mesmo painel.
3. No projeto da vistoria, publique com `supabase functions deploy equipe-posto --no-verify-jwt --project-ref <ref-da-vistoria>`. A função valida o token no Auth da vistoria e confirma que o usuário tem perfil antes de consultar o Gestão. A chave do Gestão é usada somente no servidor. [Autenticação de Edge Functions](https://supabase.com/docs/guides/functions/auth)
4. Na prévia autenticada da Vercel, habilite `VITE_CONFERENCIA_EQUIPE=true` e teste uma unidade com alocações e uma sem. Confira o resultado no relatório e no Histórico antes de habilitar em produção.

Por padrão, a função busca o nome oficial entre os postos ativos de SMS do contrato Mogi. Se o nome divergir ou houver mais de um posto com o mesmo nome, preencha `postos_demax.posto_id` com o UUID correto do Gestão para a unidade. A função usa esse UUID na consulta e o inclui no registro da vistoria.

A conferência usa a lotação e os registros do dia em que a equipe foi consultada, no fuso de São Paulo. Atestados e faltas devem cobrir esse dia. Férias devem cobrir o dia e estar aprovadas, em curso ou concluídas. O indicador de advertência considera advertências verbais ou escritas marcadas como entregues com data de aplicação até a consulta. O relatório guarda os indicadores e o resultado informado na visita, permitindo consultá-los mesmo após uma movimentação no Gestão.

## Piloto de assistência por IA e treinamento

1. Aplique na ordem as migrações `20261109000300_assistencia_ia.sql` e `20261109000400_treinamento_vistoria.sql` no projeto Supabase da vistoria.
2. Em **Edge Functions → Secrets**, adicione uma chave dedicada da Anthropic em `ANTHROPIC_API_KEY`. Opcionalmente, configure `ANTHROPIC_MODEL_VISTORIA` para selecionar um modelo compatível com a API de mensagens.
3. Publique `assistencia-vistoria` no mesmo projeto. A função valida o token por meio da API de dados e reserva uma das 30 solicitações diárias disponíveis por perfil antes de chamar o provedor. Para publicar pela CLI, use `supabase functions deploy assistencia-vistoria --no-verify-jwt --project-ref <ref-da-vistoria>`. Pelo painel, use o arquivo `functions/assistencia-vistoria/index.ts` e desative **Verify JWT with legacy secret** na função publicada.
4. Em **Preview**, habilite `VITE_REVISAO_IA=true` para revisão das anotações. Habilite também `VITE_TREINAMENTO_IA=true` e `VITE_CONFERENCIA_EQUIPE=true` para treinar e colher assinaturas da equipe do posto. Mantenha as variáveis Supabase já usadas na prévia.

O catálogo apresenta somente procedimentos ativos. O piloto inclui uma orientação geral de diluição com base na página 14 do POP Saúde. O cartaz sobre lixeira infectante permanece inativo até conferência do procedimento aplicável e do plano de resíduos do posto. Cadastre mudanças no conteúdo como uma nova versão, com um novo identificador, para que o comprovante identifique a referência apresentada.

As assinaturas ficam em memória durante a edição e são gravadas junto da finalização da vistoria. O Histórico usa a mesma política de acesso da vistoria para reabrir o conteúdo apresentado e os comprovantes. O PDF inclui o roteiro e os nomes de quem assinou. Os traços das assinaturas ficam disponíveis no relatório autenticado.

Aplique `20261109000500_ampliar_catalogo_treinamento.sql` para incluir mais sete roteiros de referência do POP Saúde. Na avaliação final, a aplicação sugere somente os procedimentos liberados associados a uma não conformidade técnica do checklist. A associação explícita entre itens e procedimentos está em `cliente/src/lib/treinamento.js`. Os demais procedimentos liberados continuam disponíveis para escolha manual.

Aplique `20261110000100_multiplos_treinamentos.sql` para finalizar uma vistoria com mais de um treinamento. Cada procedimento tem seu próprio roteiro e precisa de pelo menos uma assinatura. Os comprovantes de vistorias anteriores continuam disponíveis no Histórico.
