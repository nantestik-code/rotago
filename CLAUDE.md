# RotaGo: instruções para o Claude

## Nomes do projeto: são todos a mesma coisa

Este projeto aparece com nomes diferentes. **Não são projetos distintos:**

| Onde | Nome |
|---|---|
| Pasta local | `D:\PROJETOS\rota-facil-turbo` (nome antigo) |
| Produto e domínio | **RotaGo** — `rotago.site` |
| Repositório e deploy (Coolify) | `github.com/nantestik-code/rotago` |
| Projeto Supabase | `dsmbytaxyknrmrxcjsww`, apelidado **"entregas"** |

O nome antigo era "RotaFácil Turbo". Ao encontrar `rota-facil-turbo`,
`rotafacil`, `rotago` ou `entregas`, trate como este mesmo sistema.

**Cuidado com dois vizinhos parecidos, que NÃO são este projeto:**

- Projeto Supabase `nqhllklwjengfnqtkgce` — banco **antigo**, perdido. Ainda
  aparece em `supabase/.temp/linked-project.json`, em builds antigos e no
  histórico do Git. Nunca use.
- Projeto Supabase `lbpcbgpbqmuhxhbbmlmq` ("Clini CRM OFICIAL") — outra conta,
  sem relação nenhuma.
- Remote `origin` (`github.com/brnantes/rota-facil-turbo`) — inacessível pela
  conta `nantestik-code`. O remote em uso é o `coolify`.

## Banco de dados (Supabase): regra obrigatória

O banco deste app é **somente** o projeto Supabase **"entregas"**:

- **Project ref:** `dsmbytaxyknrmrxcjsww`
- **URL:** https://dsmbytaxyknrmrxcjsww.supabase.co

1. Use **apenas** conectores MCP fixos neste projeto:
   - `mcp__supabase__*`: servidor definido em `.mcp.json` com `project_ref=dsmbytaxyknrmrxcjsww`. **Use este por padrão.**
   - `mcp__dfdc2ea4-5437-46f4-b9a5-ec04a29230f5__*`: conector do claude.ai, também fixo neste projeto. Use só como alternativa.
2. **Nunca** use o conector `mcp__7839d4ce-5f08-44e4-991e-f54e65166b77__*`. Ele pertence a outra conta e ao projeto "Clini CRM OFICIAL" (ref `lbpcbgpbqmuhxhbbmlmq`), que **não tem relação** com este app. Ele também está bloqueado em `.claude/settings.local.json`.
3. Se uma ferramenta pedir `project_id` (ex.: o plugin `mcp__plugin_supabase_supabase__*`), o único valor permitido é `dsmbytaxyknrmrxcjsww`.
4. Na primeira operação de banco de cada sessão, confirme com `get_project_url` que a URL é `https://dsmbytaxyknrmrxcjsww.supabase.co`. Se a URL for outra, ou aparecer um conector desconhecido, **pare e pergunte** antes de continuar.

## Boas práticas no banco

- Mudanças de schema (DDL): use `apply_migration` e salve o mesmo SQL em `supabase/migrations/`, para o repositório e o banco não ficarem dessincronizados.
- Nunca exiba valores de `system_settings` com `is_secret = true` (chaves do Asaas, Mercado Pago e Evolution).
