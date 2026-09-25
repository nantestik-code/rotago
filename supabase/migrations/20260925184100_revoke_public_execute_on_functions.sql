-- Revogar EXECUTE de PUBLIC nas funcoes do schema public.
--
-- No Postgres toda funcao nasce com EXECUTE concedido a PUBLIC. Revogar de
-- `anon` e `authenticated` nao adianta: eles continuam herdando por PUBLIC.
-- A migration anterior caiu nessa armadilha. Aqui o EXECUTE e retirado de
-- PUBLIC e devolvido explicitamente so a quem precisa.

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
  end loop;
end $$;

-- Usadas no cadastro, antes de existir sessao.
grant execute on function public.check_cpf_exists(text) to anon, authenticated;
grant execute on function public.check_phone_exists(text) to anon, authenticated;

-- Chamadas pelo app autenticado.
grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.activate_trial(uuid) to authenticated;
grant execute on function public.promote_user_to_role(text, text) to authenticated;
grant execute on function public.check_subscription_status(uuid) to authenticated;
grant execute on function public.get_driver_stats(uuid) to authenticated;
grant execute on function public.get_driver_delivery_stats(uuid) to authenticated;
grant execute on function public.get_user_batch_stats(uuid) to authenticated;
grant execute on function public.update_delivery_sequence(uuid, jsonb) to authenticated;

-- Usada dentro das policies de route_deliveries; precisa ser executavel pelo
-- papel que dispara a consulta.
grant execute on function public.user_owns_route(uuid) to authenticated;

-- As funcoes de gatilho nao precisam de EXECUTE para ninguem: rodam no
-- contexto do trigger. Ficam sem grant de proposito.

-- Relatorio de email so pelo backend.
grant execute on function
  public.get_email_statistics(timestamptz, timestamptz, text) to service_role;
