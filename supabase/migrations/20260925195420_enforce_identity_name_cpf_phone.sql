-- Vincular a conta a uma identidade: nome completo + CPF + telefone.
--
-- Estado anterior: telefone sem unicidade (so um indice comum) e nulo nos 4
-- perfis; nome completo aceitando nulo. Na pratica so o email identificava a
-- pessoa, e email e gratuito e infinito.
--
-- Com CPF e telefone unicos, abrir outra conta exige outro CPF e outro chip.

-- ---------------------------------------------------------------------------
-- 1. Normalizacao e validacao do telefone
-- ---------------------------------------------------------------------------
create or replace function public.normalize_phone(phone_input text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    -- Remove tudo que nao e digito e o codigo do pais quando vier junto.
    when length(regexp_replace(coalesce(phone_input, ''), '[^0-9]', '', 'g')) = 13
         and left(regexp_replace(coalesce(phone_input, ''), '[^0-9]', '', 'g'), 2) = '55'
      then substr(regexp_replace(phone_input, '[^0-9]', '', 'g'), 3)
    else nullif(regexp_replace(coalesce(phone_input, ''), '[^0-9]', '', 'g'), '')
  end;
$$;

create or replace function public.is_valid_phone(phone_input text)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  -- Celular brasileiro: DDD de 11 a 99, seguido de 9 e mais 8 digitos.
  -- Exige celular porque o numero e usado nas notificacoes por WhatsApp.
  select public.normalize_phone(phone_input) ~ '^[1-9][1-9]9[0-9]{8}$';
$$;

revoke all on function public.normalize_phone(text) from public, anon, authenticated;
revoke all on function public.is_valid_phone(text) from public, anon, authenticated;
grant execute on function public.normalize_phone(text) to authenticated, service_role;
grant execute on function public.is_valid_phone(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Validacao do nome completo
-- ---------------------------------------------------------------------------
create or replace function public.is_valid_full_name(name_input text)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  -- Pelo menos duas palavras de 2 letras ou mais. Barra "a", "teste", "x y".
  select btrim(coalesce(name_input, '')) ~ '^[[:alpha:]''.-]{2,}([[:space:]]+[[:alpha:]''.-]{2,})+$';
$$;

revoke all on function public.is_valid_full_name(text) from public, anon, authenticated;
grant execute on function public.is_valid_full_name(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Restricoes na tabela
-- ---------------------------------------------------------------------------
-- Normalizar o que ja existe antes de aplicar a restricao.
update public.profiles
set phone = public.normalize_phone(phone)
where phone is not null and phone <> public.normalize_phone(phone);

alter table public.profiles drop constraint if exists profiles_phone_valido;
alter table public.profiles
  add constraint profiles_phone_valido
  check (phone is null or public.is_valid_phone(phone));

alter table public.profiles drop constraint if exists profiles_full_name_valido;
alter table public.profiles
  add constraint profiles_full_name_valido
  check (full_name is null or public.is_valid_full_name(full_name));

-- Um telefone, uma conta.
drop index if exists public.idx_profiles_phone;
create unique index if not exists profiles_phone_key on public.profiles (phone);

-- ---------------------------------------------------------------------------
-- 4. Cadastro passa a exigir os tres dados
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text;
  v_cpf text;
  v_phone text;
begin
  v_name  := btrim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  v_cpf   := nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'cpf', ''), '[^0-9]', '', 'g'), '');
  v_phone := public.normalize_phone(new.raw_user_meta_data ->> 'phone');

  if not public.is_valid_full_name(v_name) then
    raise exception 'Informe o nome completo' using errcode = '23514';
  end if;

  if v_cpf is null or not public.is_valid_cpf(v_cpf) then
    raise exception 'CPF invalido' using errcode = '23514';
  end if;

  if v_phone is null or not public.is_valid_phone(v_phone) then
    raise exception 'Telefone celular invalido' using errcode = '23514';
  end if;

  -- As restricoes UNIQUE de cpf e phone recusam a duplicata; a mensagem e
  -- traduzida aqui para o cadastro poder exibi-la.
  if exists (select 1 from public.profiles where cpf = v_cpf) then
    raise exception 'Este CPF ja esta cadastrado' using errcode = '23505';
  end if;

  if exists (select 1 from public.profiles where phone = v_phone) then
    raise exception 'Este telefone ja esta cadastrado' using errcode = '23505';
  end if;

  insert into public.profiles (id, full_name, cpf, phone)
  values (new.id, v_name, v_cpf, v_phone);

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Periodo gratuito exige identidade completa
-- ---------------------------------------------------------------------------
create or replace function public.assert_identity_complete(target_user uuid)
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  p public.profiles;
begin
  select * into p from public.profiles where id = target_user;

  if p.id is null then
    raise exception 'Perfil nao encontrado' using errcode = 'P0002';
  end if;

  if not public.is_valid_full_name(p.full_name) then
    raise exception 'Complete seu nome completo no perfil' using errcode = '23514';
  end if;

  if p.cpf is null or not public.is_valid_cpf(p.cpf) then
    raise exception 'Cadastre um CPF valido no perfil' using errcode = '23514';
  end if;

  if p.phone is null or not public.is_valid_phone(p.phone) then
    raise exception 'Cadastre um telefone celular valido no perfil' using errcode = '23514';
  end if;
end;
$$;

revoke all on function public.assert_identity_complete(uuid) from public, anon, authenticated;

create or replace function public.activate_trial(target_plan_id uuid default null)
returns public.user_subscriptions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller uuid := auth.uid();
  caller_cpf text;
  caller_phone text;
  trial_days integer;
  now_ts timestamptz := now();
  trial_end timestamptz;
  created public.user_subscriptions;
  caller_email text;
begin
  if caller is null then
    raise exception 'Usuario nao autenticado' using errcode = '28000';
  end if;

  perform public.assert_identity_complete(caller);

  select cpf, phone into caller_cpf, caller_phone
  from public.profiles where id = caller;

  -- Um teste por pessoa, identificada por CPF ou telefone. Trocar de email
  -- nao renova; seria preciso outro CPF e outro chip.
  if exists (
    select 1
    from public.user_subscriptions s
    join public.profiles p on p.id = s.user_id
    where s.is_trial = true
      and (p.cpf = caller_cpf or p.phone = caller_phone)
  ) then
    raise exception 'Este CPF ou telefone ja utilizou o periodo de teste gratuito'
      using errcode = '23505';
  end if;

  if exists (
    select 1 from public.user_subscriptions
    where user_id = caller and is_active = true
  ) then
    raise exception 'Ja existe uma assinatura ativa para este usuario'
      using errcode = '23505';
  end if;

  select coalesce(nullif(value, '')::integer, 15) into trial_days
  from public.system_settings where key = 'trial_duration_days';

  trial_days := coalesce(trial_days, 15);
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

revoke all on function public.activate_trial(uuid) from public, anon, authenticated;
grant execute on function public.activate_trial(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Cupom tambem exige identidade completa e conta por telefone
-- ---------------------------------------------------------------------------
alter table public.coupon_redemptions
  add column if not exists phone text;

create unique index if not exists coupon_redemptions_once_per_phone
  on public.coupon_redemptions (coupon_id, phone)
  where phone is not null;

create or replace function public.redeem_coupon(coupon_code text)
returns public.user_subscriptions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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
$$;

revoke all on function public.redeem_coupon(text) from public, anon, authenticated;
grant execute on function public.redeem_coupon(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. check_phone_exists normaliza a entrada
-- ---------------------------------------------------------------------------
create or replace function public.check_phone_exists(phone_input text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where phone = public.normalize_phone(phone_input)
  );
$$;

revoke all on function public.check_phone_exists(text) from public, anon, authenticated;
grant execute on function public.check_phone_exists(text) to anon, authenticated;
