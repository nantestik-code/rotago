-- Ativacao de trial no servidor.
--
-- Antes o navegador fazia INSERT direto em user_subscriptions, definindo a
-- propria data de expiracao, e a regra "um trial por usuario" era validada no
-- cliente (bastava um POST para contornar). O RLS novo nao tem policy de
-- INSERT para o cliente, entao a ativacao passa por esta funcao.

insert into public.system_settings (key, value, description, category, is_secret)
values ('trial_duration_days', '20', 'Duracao do periodo de teste em dias', 'general', false)
on conflict (key) do nothing;

create or replace function public.activate_trial(target_plan_id uuid default null)
returns public.user_subscriptions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller uuid := auth.uid();
  trial_days integer;
  now_ts timestamptz := now();
  trial_end timestamptz;
  created public.user_subscriptions;
  caller_email text;
begin
  if caller is null then
    raise exception 'Usuario nao autenticado' using errcode = '28000';
  end if;

  -- Uma unica chance de trial por usuario, verificado no servidor.
  if exists (
    select 1 from public.user_subscriptions
    where user_id = caller and is_trial = true
  ) then
    raise exception 'Voce ja utilizou seu periodo de teste gratuito'
      using errcode = '23505';
  end if;

  if exists (
    select 1 from public.user_subscriptions
    where user_id = caller and is_active = true
  ) then
    raise exception 'Ja existe uma assinatura ativa para este usuario'
      using errcode = '23505';
  end if;

  select coalesce(nullif(value, '')::integer, 20) into trial_days
  from public.system_settings where key = 'trial_duration_days';

  trial_days := coalesce(trial_days, 20);
  trial_end := now_ts + make_interval(days => trial_days);

  select email into caller_email from auth.users where id = caller;

  insert into public.user_subscriptions (
    user_id, email, plan_id, subscription_status, status,
    is_active, is_trial,
    trial_start_date, trial_end_date, trial_ends_at,
    current_period_start, current_period_end
  ) values (
    caller, caller_email, target_plan_id, 'trial', 'trial',
    true, true,
    now_ts, trial_end, trial_end,
    now_ts, trial_end
  )
  returning * into created;

  return created;
end;
$$;

revoke execute on function public.activate_trial(uuid) from public, anon;
grant execute on function public.activate_trial(uuid) to authenticated;

comment on function public.activate_trial(uuid) is
  'Ativa o trial do usuario autenticado. A regra de um trial por usuario e aplicada aqui, no servidor.';
