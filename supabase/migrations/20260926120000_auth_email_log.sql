-- Registro dos e-mails de autenticacao enviados pela edge function auth-email.
-- Serve para auditoria e para limitar tentativas por endereco (anti-abuso).
create table if not exists public.auth_email_log (
  id bigint generated always as identity primary key,
  email text not null,
  action text not null,
  status text not null check (status in ('sent', 'failed', 'skipped', 'rate_limited')),
  resend_id text,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists auth_email_log_email_created_idx
  on public.auth_email_log (lower(email), created_at desc);

-- So a service_role (edge function) acessa; nenhuma policy para anon/authenticated.
alter table public.auth_email_log enable row level security;
