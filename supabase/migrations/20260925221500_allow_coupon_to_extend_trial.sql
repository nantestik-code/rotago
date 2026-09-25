-- O cupom nao conseguia estender o trial.
--
-- prevent_subscription_self_grant existe para impedir que o cliente estique o
-- proprio periodo por PostgREST, e recusa qualquer update que empurre
-- current_period_end ou trial_ends_at para frente. redeem_coupon e SECURITY
-- DEFINER, mas roda no contexto do usuario (is_admin() = false), entao o
-- trigger barrava tambem o resgate legitimo:
--
--   ERROR: Extensao de periodo nao permitida pelo cliente
--
-- Nao aparecia antes porque o trial padrao (15 dias) era igual ao do cupom e o
-- greatest() nao mudava nada. Com o trial em 10 dias e o cupom em 15, todo
-- resgate passaria a falhar -- exatamente o cenario da inauguracao.
--
-- A saida e um passe estreito: redeem_coupon marca a transacao como uma
-- concessao interna e o trigger respeita essa marca. O cliente nao alcanca
-- esse GUC: o PostgREST so deixa definir GUCs do prefixo `request.`, e a marca
-- e local a transacao e apagada assim que o update termina.

-- ---------------------------------------------------------------------------
-- 1. Trigger reconhece a concessao interna
-- ---------------------------------------------------------------------------
create or replace function public.prevent_subscription_self_grant()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  if public.is_admin() then
    return new;
  end if;

  -- Concessao feita por uma funcao do servidor (hoje: redeem_coupon), que
  -- marca a transacao logo antes do update e desmarca logo depois.
  if coalesce(current_setting('app.subscription_grant', true), '') = 'on' then
    return new;
  end if;

  if new.is_active and not old.is_active then
    raise exception 'Ativacao de assinatura nao permitida pelo cliente' using errcode = '42501';
  end if;

  if new.status is distinct from old.status
     and new.status in ('active', 'trial', 'trialing') then
    raise exception 'Alteracao para status % nao permitida pelo cliente', new.status using errcode = '42501';
  end if;

  if new.current_period_end is distinct from old.current_period_end
     and new.current_period_end > coalesce(old.current_period_end, 'epoch'::timestamptz) then
    raise exception 'Extensao de periodo nao permitida pelo cliente' using errcode = '42501';
  end if;

  if new.trial_ends_at is distinct from old.trial_ends_at
     and new.trial_ends_at > coalesce(old.trial_ends_at, 'epoch'::timestamptz) then
    raise exception 'Extensao de trial nao permitida pelo cliente' using errcode = '42501';
  end if;

  if new.plan_id is distinct from old.plan_id then
    raise exception 'Troca de plano nao permitida pelo cliente' using errcode = '42501';
  end if;

  return new;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 2. redeem_coupon marca a concessao ao redor do update
-- ---------------------------------------------------------------------------
create or replace function public.redeem_coupon(coupon_code text)
returns public.user_subscriptions
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  caller uuid := auth.uid();
  caller_cpf text;
  caller_phone text;
  caller_email text;
  cup public.coupons;
  now_ts timestamptz := now();
  free_end timestamptz;
  sub public.user_subscriptions;
begin
  if caller is null then
    raise exception 'Usuario nao autenticado' using errcode = '28000';
  end if;

  perform public.assert_identity_complete(caller);

  select cpf, phone into caller_cpf, caller_phone
  from public.profiles where id = caller;

  select * into cup from public.coupons
  where code = upper(regexp_replace(coalesce(coupon_code, ''), '\s', '', 'g'));

  if cup.id is null then
    raise exception 'Cupom nao encontrado' using errcode = 'P0002';
  end if;

  if not cup.is_active then
    raise exception 'Este cupom nao esta mais ativo' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.coupon_redemptions
    where coupon_id = cup.id and (cpf = caller_cpf or phone = caller_phone)
  ) then
    raise exception 'Este CPF ou telefone ja resgatou este cupom' using errcode = '23505';
  end if;

  if exists (
    select 1 from public.user_subscriptions
    where user_id = caller and is_active = true and status = 'active'
  ) then
    raise exception 'Voce ja tem uma assinatura paga ativa' using errcode = '23505';
  end if;

  free_end := now_ts + make_interval(days => cup.free_days);
  select email into caller_email from auth.users where id = caller;

  select * into sub from public.user_subscriptions
  where user_id = caller and is_active = true
  order by created_at desc limit 1;

  if sub.id is not null then
    -- Marca so este update. O terceiro argumento (true) deixa a marca local a
    -- transacao, e ela e apagada logo abaixo para nao cobrir mais nada.
    perform set_config('app.subscription_grant', 'on', true);

    update public.user_subscriptions
    set trial_ends_at = greatest(coalesce(trial_ends_at, now_ts), free_end),
        trial_end_date = greatest(coalesce(trial_end_date, now_ts), free_end),
        current_period_end = greatest(coalesce(current_period_end, now_ts), free_end),
        is_trial = true,
        status = 'trial',
        subscription_status = 'trial',
        metadata = coalesce(metadata, '{}'::jsonb)
                   || jsonb_build_object('coupon', jsonb_build_object(
                        'code', cup.code, 'free_days', cup.free_days,
                        'redeemed_at', now_ts)),
        updated_at = now_ts
    where id = sub.id
    returning * into sub;

    perform set_config('app.subscription_grant', 'off', true);
  else
    insert into public.user_subscriptions (
      user_id, email, subscription_status, status,
      is_active, is_trial,
      trial_start_date, trial_end_date, trial_ends_at,
      current_period_start, current_period_end, metadata
    ) values (
      caller, caller_email, 'trial', 'trial',
      true, true,
      now_ts, free_end, free_end,
      now_ts, free_end,
      jsonb_build_object('coupon', jsonb_build_object(
        'code', cup.code, 'free_days', cup.free_days, 'redeemed_at', now_ts))
    )
    returning * into sub;
  end if;

  insert into public.coupon_redemptions (coupon_id, user_id, cpf, phone, subscription_id)
  values (cup.id, caller, caller_cpf, caller_phone, sub.id);

  return sub;
end;
$function$;

revoke all on function public.redeem_coupon(text) from public, anon, authenticated;
grant execute on function public.redeem_coupon(text) to authenticated;
