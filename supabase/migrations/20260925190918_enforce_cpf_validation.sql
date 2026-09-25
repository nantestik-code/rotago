-- Validacao de CPF no banco e vinculo do cadastro ao CPF.
--
-- Ate aqui o CPF era validado so no navegador (utils/cpfUtils.ts) e o gatilho
-- handle_new_user criava o perfil apenas com id e nome, entao o CPF nunca era
-- gravado: as 4 contas existentes estao com cpf nulo. Como UNIQUE permite
-- varios nulos, a restricao nao impedia a mesma pessoa de abrir quantas
-- contas quisesse trocando o email.

-- ---------------------------------------------------------------------------
-- 1. Validacao dos digitos verificadores
-- ---------------------------------------------------------------------------
create or replace function public.is_valid_cpf(cpf_input text)
returns boolean
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  digits text;
  soma integer;
  resto integer;
  dv1 integer;
  dv2 integer;
  i integer;
begin
  if cpf_input is null then
    return false;
  end if;

  digits := regexp_replace(cpf_input, '[^0-9]', '', 'g');

  if length(digits) <> 11 then
    return false;
  end if;

  -- Sequencias repetidas (00000000000, 11111111111, ...) passam no calculo
  -- dos digitos, entao precisam ser barradas na mao.
  if digits ~ '^(\d)\1{10}$' then
    return false;
  end if;

  soma := 0;
  for i in 1..9 loop
    soma := soma + substr(digits, i, 1)::integer * (11 - i);
  end loop;
  resto := soma % 11;
  dv1 := case when resto < 2 then 0 else 11 - resto end;

  if dv1 <> substr(digits, 10, 1)::integer then
    return false;
  end if;

  soma := 0;
  for i in 1..10 loop
    soma := soma + substr(digits, i, 1)::integer * (12 - i);
  end loop;
  resto := soma % 11;
  dv2 := case when resto < 2 then 0 else 11 - resto end;

  return dv2 = substr(digits, 11, 1)::integer;
end;
$$;

revoke all on function public.is_valid_cpf(text) from public, anon, authenticated;
grant execute on function public.is_valid_cpf(text) to authenticated, service_role;

comment on function public.is_valid_cpf(text) is
  'Valida os digitos verificadores do CPF. Confirma que o numero e bem formado, nao que pertence a pessoa.';

-- ---------------------------------------------------------------------------
-- 2. So aceitar CPF valido e normalizado (apenas digitos)
-- ---------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_cpf_valido;
alter table public.profiles
  add constraint profiles_cpf_valido
  check (cpf is null or (cpf ~ '^[0-9]{11}$' and public.is_valid_cpf(cpf)));

-- ---------------------------------------------------------------------------
-- 3. Gravar CPF e telefone vindos do cadastro
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  raw_cpf text;
  clean_cpf text;
begin
  raw_cpf := new.raw_user_meta_data ->> 'cpf';
  clean_cpf := nullif(regexp_replace(coalesce(raw_cpf, ''), '[^0-9]', '', 'g'), '');

  if clean_cpf is not null and not public.is_valid_cpf(clean_cpf) then
    raise exception 'CPF invalido' using errcode = '23514';
  end if;

  insert into public.profiles (id, full_name, cpf, phone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    clean_cpf,
    nullif(new.raw_user_meta_data ->> 'phone', '')
  );

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Periodo de teste exige CPF valido
-- ---------------------------------------------------------------------------
-- Sem isso o CPF continuaria opcional na pratica e bastaria abrir contas com
-- emails diferentes para renovar o teste indefinidamente.
create or replace function public.activate_trial(target_plan_id uuid default null)
returns public.user_subscriptions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller uuid := auth.uid();
  caller_cpf text;
  trial_days integer;
  now_ts timestamptz := now();
  trial_end timestamptz;
  created public.user_subscriptions;
  caller_email text;
begin
  if caller is null then
    raise exception 'Usuario nao autenticado' using errcode = '28000';
  end if;

  select cpf into caller_cpf from public.profiles where id = caller;

  if caller_cpf is null or not public.is_valid_cpf(caller_cpf) then
    raise exception 'Cadastre um CPF valido para iniciar o periodo de teste'
      using errcode = '23514';
  end if;

  -- Um periodo de teste por CPF, nao por conta: trocar de email nao renova.
  if exists (
    select 1
    from public.user_subscriptions s
    join public.profiles p on p.id = s.user_id
    where p.cpf = caller_cpf and s.is_trial = true
  ) then
    raise exception 'Este CPF ja utilizou o periodo de teste gratuito'
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
-- 5. Teste gratuito passa de 20 para 15 dias
-- ---------------------------------------------------------------------------
update public.system_settings set value = '15', updated_at = now()
where key = 'trial_duration_days';

create or replace function public.create_user_subscription_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  trial_days integer;
begin
  select coalesce(nullif(value, '')::integer, 15) into trial_days
  from public.system_settings where key = 'trial_duration_days';

  trial_days := coalesce(trial_days, 15);

  insert into public.user_subscriptions (
    user_id, email, subscription_status, trial_start_date, trial_end_date,
    is_active, is_trial, status, trial_ends_at,
    current_period_start, current_period_end
  ) values (
    new.id, new.email, 'trial', now(), now() + make_interval(days => trial_days),
    true, true, 'trial', now() + make_interval(days => trial_days),
    now(), now() + make_interval(days => trial_days)
  );
  return new;
end;
$$;

revoke all on function public.create_user_subscription_on_signup() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. check_cpf_exists normaliza a entrada
-- ---------------------------------------------------------------------------
create or replace function public.check_cpf_exists(cpf_input text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where cpf = regexp_replace(coalesce(cpf_input, ''), '[^0-9]', '', 'g')
  );
$$;

revoke all on function public.check_cpf_exists(text) from public, anon, authenticated;
grant execute on function public.check_cpf_exists(text) to anon, authenticated;
