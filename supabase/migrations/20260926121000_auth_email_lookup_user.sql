-- Consulta usada pela edge function auth-email antes de gerar um link:
-- generateLink do tipo magiclink criaria uma conta para e-mail inexistente.
-- Restrita a service_role para nao virar enumeracao de e-mails.
create or replace function public.auth_email_lookup_user(p_email text)
returns table (id uuid, email_confirmed boolean, full_name text)
language sql
security definer
set search_path = ''
as $$
  select u.id, u.email_confirmed_at is not null, p.full_name
  from auth.users u
  left join public.profiles p on p.id = u.id
  where lower(u.email) = lower(p_email)
  limit 1;
$$;

revoke all on function public.auth_email_lookup_user(text) from public, anon, authenticated;
grant execute on function public.auth_email_lookup_user(text) to service_role;
