-- Recria tabelas que o frontend usa mas que nao vieram no backup do projeto
-- antigo, e adiciona a RPC de promocao de admin.

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  action text not null,
  description text,
  resource_type text,
  resource_id text,
  details jsonb default '{}'::jsonb,
  metadata jsonb default '{}'::jsonb,
  ip_address text,
  user_agent text,
  severity text not null default 'info'
    check (severity in ('info', 'warning', 'error', 'critical')),
  status text not null default 'success'
    check (status in ('success', 'failure')),
  "timestamp" timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_timestamp on public.audit_logs ("timestamp" desc);
create index if not exists idx_audit_logs_user_id on public.audit_logs (user_id);

alter table public.audit_logs enable row level security;
alter table public.audit_logs force row level security;
revoke all on public.audit_logs from anon;
grant select, insert on public.audit_logs to authenticated;

-- Qualquer usuario autenticado pode registrar a propria acao, mas so admin le.
create policy audit_logs_insert_self on public.audit_logs
  for insert to authenticated
  with check (user_id is null or user_id = (select auth.uid()));
create policy audit_logs_admin_read on public.audit_logs
  for select to authenticated using (public.is_admin());
create policy audit_logs_admin_all on public.audit_logs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- system_events
-- ---------------------------------------------------------------------------
create table if not exists public.system_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  service text,
  message text not null,
  level text not null default 'info'
    check (level in ('debug', 'info', 'warning', 'error', 'critical')),
  metadata jsonb default '{}'::jsonb,
  "timestamp" timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_system_events_timestamp on public.system_events ("timestamp" desc);

alter table public.system_events enable row level security;
alter table public.system_events force row level security;
revoke all on public.system_events from anon;
grant select on public.system_events to authenticated;

create policy system_events_admin on public.system_events
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- site_content
-- ---------------------------------------------------------------------------
create table if not exists public.site_content (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text,
  type text not null default 'page',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;
alter table public.site_content force row level security;
revoke all on public.site_content from anon;
grant select on public.site_content to anon, authenticated;

-- Conteudo publicado e publico (paginas do site); o resto so admin.
create policy site_content_read_published on public.site_content
  for select to anon, authenticated using (is_published = true);
create policy site_content_admin on public.site_content
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop trigger if exists update_site_content_updated_at on public.site_content;
create trigger update_site_content_updated_at
  before update on public.site_content
  for each row execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Coluna usada pela edge function whatsapp-notify
-- ---------------------------------------------------------------------------
alter table public.user_subscriptions
  add column if not exists whatsapp_notified_at timestamptz;

-- ---------------------------------------------------------------------------
-- RPC de promocao a admin
-- ---------------------------------------------------------------------------
-- profiles nao guarda email, entao a busca passa por auth.users. A funcao e
-- SECURITY DEFINER e valida internamente que quem chama e super_admin.
create or replace function public.promote_user_to_role(
  target_email text,
  new_role text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin'
  ) then
    raise exception 'Apenas super_admin pode alterar papeis' using errcode = '42501';
  end if;

  if new_role not in ('user', 'moderator', 'admin', 'super_admin') then
    raise exception 'Papel invalido: %', new_role using errcode = '22023';
  end if;

  select id into target_id
  from auth.users
  where lower(email) = lower(trim(target_email));

  if target_id is null then
    raise exception 'Usuario nao encontrado: %', target_email using errcode = 'P0002';
  end if;

  update public.profiles set role = new_role, updated_at = now()
  where id = target_id;

  if not found then
    raise exception 'Perfil nao encontrado para %', target_email using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.promote_user_to_role(text, text) from public, anon;
grant execute on function public.promote_user_to_role(text, text) to authenticated;
