-- Endurecimento de RLS e do modelo de admin.
--
-- Contexto:
--   1. Todas as policies existentes foram criadas para o papel `public`, que
--      inclui `anon`. Somado aos grants amplos que o `anon` tem, isso deixava
--      as tabelas acessiveis a qualquer portador da chave anonima (que e
--      publica, vai no bundle JS).
--   2. `user_subscriptions` e `payment_history` tinham policies
--      "Service can manage ..." com USING (true) para `public`, ou seja,
--      liberadas para qualquer um, inclusive nao autenticado.
--   3. A tabela `admins` referenciada pelo frontend nunca existiu. O modelo de
--      admin passa a ser unico: `profiles.role`.
--   4. Nada impedia um usuario de promover o proprio `profiles.role` para
--      'admin', o que daria acesso de admin tambem nas edge functions
--      (assertAdmin confia em profiles.role).
--
-- O `service_role` ignora RLS, entao as edge functions continuam funcionando.

-- ---------------------------------------------------------------------------
-- 1. Funcao canonica de verificacao de admin
-- ---------------------------------------------------------------------------

create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = check_user_id
      and p.role in ('admin', 'super_admin', 'moderator')
  );
$$;

revoke execute on function public.is_admin(uuid) from public, anon;
grant execute on function public.is_admin(uuid) to authenticated, service_role;

comment on function public.is_admin(uuid) is
  'Fonte unica de verdade para permissao administrativa. Le profiles.role.';

-- ---------------------------------------------------------------------------
-- 2. Impedir auto-promocao de privilegio em profiles.role
-- ---------------------------------------------------------------------------

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Alteracao de role nao permitida'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- ---------------------------------------------------------------------------
-- 3. Impedir que o navegador conceda assinatura a si mesmo
-- ---------------------------------------------------------------------------
-- O usuario pode cancelar e deixar expirar a propria assinatura, mas nao pode
-- ativa-la nem estender o periodo. Ativacao so via edge function (service_role)
-- depois de confirmacao no gateway de pagamento.

create or replace function public.prevent_subscription_self_grant()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.is_active and not old.is_active then
    raise exception 'Ativacao de assinatura nao permitida pelo cliente'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status
     and new.status in ('active', 'trial', 'trialing') then
    raise exception 'Alteracao para status % nao permitida pelo cliente', new.status
      using errcode = '42501';
  end if;

  if new.current_period_end is distinct from old.current_period_end
     and new.current_period_end > coalesce(old.current_period_end, 'epoch'::timestamptz) then
    raise exception 'Extensao de periodo nao permitida pelo cliente'
      using errcode = '42501';
  end if;

  if new.trial_ends_at is distinct from old.trial_ends_at
     and new.trial_ends_at > coalesce(old.trial_ends_at, 'epoch'::timestamptz) then
    raise exception 'Extensao de trial nao permitida pelo cliente'
      using errcode = '42501';
  end if;

  if new.plan_id is distinct from old.plan_id then
    raise exception 'Troca de plano nao permitida pelo cliente'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists user_subscriptions_prevent_self_grant on public.user_subscriptions;
create trigger user_subscriptions_prevent_self_grant
  before update on public.user_subscriptions
  for each row execute function public.prevent_subscription_self_grant();

-- ---------------------------------------------------------------------------
-- 4. Limpar todas as policies antigas das tabelas do app
-- ---------------------------------------------------------------------------
-- Elas eram para `public` e havia muitas duplicatas (107 avisos de
-- multiple_permissive_policies). Recriadas abaixo, so para `authenticated`.

do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'deliveries', 'delivery_batches', 'delivery_history',
        'delivery_occurrences', 'driver_locations', 'payment_history',
        'profiles', 'route_deliveries', 'route_history', 'routes',
        'user_subscriptions', 'subscription_plans', 'system_settings',
        'email_logs'
      )
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Revogar acesso do anon; garantir RLS ligado
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'deliveries', 'delivery_batches', 'delivery_history',
    'delivery_occurrences', 'driver_locations', 'payment_history',
    'profiles', 'route_deliveries', 'route_history', 'routes',
    'user_subscriptions', 'subscription_plans', 'system_settings',
    'email_logs'
  ]
  loop
    execute format('revoke all on public.%I from anon', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;

-- subscription_plans e a unica leitura legitima do anon: a tabela de precos
-- aparece na landing page antes do login.
grant select on public.subscription_plans to anon;

-- ---------------------------------------------------------------------------
-- 6. Policies novas: sempre `to authenticated`
-- ---------------------------------------------------------------------------
-- (select auth.uid()) em vez de auth.uid() resolve o aviso auth_rls_initplan:
-- assim a funcao e avaliada uma vez por query, nao uma vez por linha.

-- profiles
create policy profiles_select_own on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy profiles_select_admin on public.profiles
  for select to authenticated using (public.is_admin());
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles
  for update to authenticated using ((select auth.uid()) = id);
create policy profiles_admin_all on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- deliveries
create policy deliveries_own on public.deliveries
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy deliveries_admin on public.deliveries
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- delivery_batches
create policy delivery_batches_own on public.delivery_batches
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy delivery_batches_admin on public.delivery_batches
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- delivery_history
create policy delivery_history_own on public.delivery_history
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy delivery_history_admin on public.delivery_history
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- delivery_occurrences
create policy delivery_occurrences_own on public.delivery_occurrences
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy delivery_occurrences_admin on public.delivery_occurrences
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- driver_locations
create policy driver_locations_own on public.driver_locations
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy driver_locations_admin on public.driver_locations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- routes
create policy routes_own on public.routes
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy routes_admin on public.routes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- route_deliveries (nao tem user_id; herda a dona pela rota)
create policy route_deliveries_own on public.route_deliveries
  for all to authenticated
  using (public.user_owns_route(route_id))
  with check (public.user_owns_route(route_id));
create policy route_deliveries_admin on public.route_deliveries
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- route_history
create policy route_history_own on public.route_history
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy route_history_admin on public.route_history
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- user_subscriptions: leitura da propria, update limitado pelo trigger acima.
-- INSERT so por service_role / trigger de signup; sem policy de insert aqui.
create policy user_subscriptions_select_own on public.user_subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy user_subscriptions_update_own on public.user_subscriptions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy user_subscriptions_admin on public.user_subscriptions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- payment_history: somente leitura da propria; escrita so por service_role.
create policy payment_history_select_own on public.payment_history
  for select to authenticated using ((select auth.uid()) = user_id);
create policy payment_history_admin on public.payment_history
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- subscription_plans: catalogo publico; escrita so por admin.
create policy subscription_plans_read on public.subscription_plans
  for select to anon, authenticated using (true);
create policy subscription_plans_admin on public.subscription_plans
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- system_settings: nunca expor segredos ao cliente.
create policy system_settings_read_public on public.system_settings
  for select to authenticated using (is_secret = false);
create policy system_settings_admin on public.system_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- email_logs
create policy email_logs_select_own on public.email_logs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy email_logs_admin on public.email_logs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 7. Fixar search_path nas funcoes (aviso function_search_path_mutable)
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and not exists (
        select 1 from unnest(coalesce(p.proconfig, '{}')) c
        where c like 'search_path=%'
      )
  loop
    execute format('alter function %s set search_path = public, pg_temp', r.sig);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 8. Tirar do anon as funcoes SECURITY DEFINER que nao precisam ser publicas
-- ---------------------------------------------------------------------------
-- check_cpf_exists e check_phone_exists continuam com anon: sao usadas no
-- cadastro, antes do login.

revoke execute on function public.get_driver_stats(uuid) from anon;
revoke execute on function public.get_driver_delivery_stats(uuid) from anon;
revoke execute on function public.get_user_batch_stats(uuid) from anon;
revoke execute on function public.check_subscription_status(uuid) from anon;
revoke execute on function public.user_owns_route(uuid) from anon;
revoke execute on function public.get_email_statistics(timestamptz, timestamptz, text) from anon;

-- Gatilhos nao devem ser chamaveis via RPC.
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.create_user_subscription_on_signup() from anon, authenticated;
revoke execute on function public.log_delivery_status_change() from anon, authenticated;
revoke execute on function public.update_driver_location() from anon, authenticated;
revoke execute on function public.prevent_role_escalation() from anon, authenticated;
revoke execute on function public.prevent_subscription_self_grant() from anon, authenticated;

-- get_email_statistics e SECURITY DEFINER e le email_logs inteiro, ignorando
-- RLS. A tela de estatisticas de email do admin hoje usa dados mockados, entao
-- nenhum cliente precisa dela: fica so para service_role.
revoke execute on function
  public.get_email_statistics(timestamptz, timestamptz, text) from authenticated;

-- ---------------------------------------------------------------------------
-- 9. Indices que faltavam nas foreign keys (aviso unindexed_foreign_keys)
-- ---------------------------------------------------------------------------

create index if not exists idx_deliveries_batch_id on public.deliveries (batch_id);
create index if not exists idx_deliveries_user_id on public.deliveries (user_id);
create index if not exists idx_delivery_history_user_id on public.delivery_history (user_id);
create index if not exists idx_delivery_occurrences_delivery_id on public.delivery_occurrences (delivery_id);
create index if not exists idx_payment_history_user_id on public.payment_history (user_id);
create index if not exists idx_payment_history_subscription_id on public.payment_history (subscription_id);
create index if not exists idx_route_deliveries_delivery_id on public.route_deliveries (delivery_id);
create index if not exists idx_route_history_user_id on public.route_history (user_id);
create index if not exists idx_route_history_route_id on public.route_history (route_id);
create index if not exists idx_routes_user_id on public.routes (user_id);
create index if not exists idx_user_subscriptions_plan_id on public.user_subscriptions (plan_id);
create index if not exists idx_user_subscriptions_user_id on public.user_subscriptions (user_id);
