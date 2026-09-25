-- Cupons de periodo gratuito e preco promocional dos primeiros ciclos.

-- ---------------------------------------------------------------------------
-- 1. Preco promocional no plano
-- ---------------------------------------------------------------------------
-- price = valor cheio; promo_price cobrado nos primeiros promo_cycles ciclos.
alter table public.subscription_plans
  add column if not exists promo_price text,
  add column if not exists promo_cycles integer not null default 0;

comment on column public.subscription_plans.promo_price is
  'Valor cobrado nos primeiros promo_cycles ciclos. Nulo = sem promocao.';
comment on column public.subscription_plans.promo_cycles is
  'Quantos ciclos iniciais usam promo_price antes de voltar ao price cheio.';

update public.subscription_plans
set price = '29.90',
    total = '29.90',
    promo_price = '19.90',
    promo_cycles = 2,
    description = 'R$ 19,90/mes nos 2 primeiros meses, depois R$ 29,90/mes'
where name = 'Mensal';

-- Contador de ciclos pagos, para saber quando sair da promocao.
alter table public.user_subscriptions
  add column if not exists paid_cycles integer not null default 0;

comment on column public.user_subscriptions.paid_cycles is
  'Ciclos efetivamente pagos. Usado para encerrar o preco promocional.';

-- ---------------------------------------------------------------------------
-- 2. Cupons
-- ---------------------------------------------------------------------------
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  free_days integer not null default 15 check (free_days > 0 and free_days <= 365),
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Codigo sempre em caixa alta, sem espacos, para "grupo15" e "GRUPO15" serem
-- o mesmo cupom.
create or replace function public.normalize_coupon_code()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.code := upper(regexp_replace(coalesce(new.code, ''), '\s', '', 'g'));
  if new.code = '' then
    raise exception 'Codigo do cupom nao pode ser vazio' using errcode = '23514';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists coupons_normalize_code on public.coupons;
create trigger coupons_normalize_code
  before insert or update on public.coupons
  for each row execute function public.normalize_coupon_code();

alter table public.coupons enable row level security;
alter table public.coupons force row level security;
revoke all on public.coupons from anon;
grant select on public.coupons to authenticated;

-- O cliente nao lista cupons; o resgate passa pela RPC. So admin gerencia.
create policy coupons_admin on public.coupons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. Resgates
-- ---------------------------------------------------------------------------
create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  cpf text not null,
  subscription_id uuid references public.user_subscriptions(id) on delete set null,
  redeemed_at timestamptz not null default now()
);

-- Uma vez por pessoa, amarrado ao CPF e nao a conta: trocar de email nao
-- permite resgatar o mesmo cupom de novo.
create unique index if not exists coupon_redemptions_once_per_cpf
  on public.coupon_redemptions (coupon_id, cpf);

create index if not exists idx_coupon_redemptions_user on public.coupon_redemptions (user_id);

alter table public.coupon_redemptions enable row level security;
alter table public.coupon_redemptions force row level security;
revoke all on public.coupon_redemptions from anon;
grant select on public.coupon_redemptions to authenticated;

create policy coupon_redemptions_select_own on public.coupon_redemptions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy coupon_redemptions_admin on public.coupon_redemptions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. Resgate
-- ---------------------------------------------------------------------------
create or replace function public.redeem_coupon(coupon_code text)
returns public.user_subscriptions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller uuid := auth.uid();
  caller_cpf text;
  caller_email text;
  cup public.coupons;
  now_ts timestamptz := now();
  free_end timestamptz;
  sub public.user_subscriptions;
begin
  if caller is null then
    raise exception 'Usuario nao autenticado' using errcode = '28000';
  end if;

  select cpf into caller_cpf from public.profiles where id = caller;

  if caller_cpf is null or not public.is_valid_cpf(caller_cpf) then
    raise exception 'Cadastre um CPF valido para resgatar um cupom'
      using errcode = '23514';
  end if;

  select * into cup from public.coupons
  where code = upper(regexp_replace(coalesce(coupon_code, ''), '\s', '', 'g'));

  if cup.id is null then
    raise exception 'Cupom nao encontrado' using errcode = 'P0002';
  end if;

  if not cup.is_active then
    raise exception 'Este cupom nao esta mais ativo' using errcode = '22023';
  end if;

  -- Um resgate por CPF. O indice unico garante isso mesmo em concorrencia;
  -- esta checagem existe so para dar uma mensagem melhor.
  if exists (
    select 1 from public.coupon_redemptions
    where coupon_id = cup.id and cpf = caller_cpf
  ) then
    raise exception 'Este CPF ja resgatou este cupom' using errcode = '23505';
  end if;

  if exists (
    select 1 from public.user_subscriptions
    where user_id = caller and is_active = true and status = 'active'
  ) then
    raise exception 'Voce ja tem uma assinatura paga ativa' using errcode = '23505';
  end if;

  free_end := now_ts + make_interval(days => cup.free_days);
  select email into caller_email from auth.users where id = caller;

  -- Se ja existe assinatura ativa (o trial da criacao da conta), o cupom
  -- estende o periodo em vez de criar outra linha: o indice
  -- user_subscriptions_one_active_per_user so permite uma ativa por usuario.
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

  insert into public.coupon_redemptions (coupon_id, user_id, cpf, subscription_id)
  values (cup.id, caller, caller_cpf, sub.id);

  return sub;
end;
$$;

revoke all on function public.redeem_coupon(text) from public, anon, authenticated;
grant execute on function public.redeem_coupon(text) to authenticated;

comment on function public.redeem_coupon(text) is
  'Resgata um cupom de periodo gratuito. Um resgate por CPF.';
