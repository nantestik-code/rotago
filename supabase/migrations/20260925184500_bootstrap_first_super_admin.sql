-- Permitir a promocao inicial e cadastrar o primeiro super_admin.
--
-- O gatilho prevent_role_escalation exige is_admin(), que le auth.uid(). Numa
-- conexao direta (service_role, psql, migration) auth.uid() e NULL, entao nem
-- o dono do banco conseguiria criar o primeiro admin: um impasse.
--
-- Liberar o caso auth.uid() IS NULL e seguro porque esse caminho ja e
-- privilegiado: pela API REST o papel `anon` nao tem grant de UPDATE em
-- profiles nem policy que permita, entao o RLS barra antes do gatilho.

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Sem JWT: conexao de servico ou migration. Ja e um contexto privilegiado.
  if auth.uid() is null then
    return new;
  end if;

  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Alteracao de role nao permitida' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_role_escalation() from public, anon, authenticated;

-- Primeiro super_admin.
update public.profiles p
set role = 'super_admin', updated_at = now()
from auth.users u
where u.id = p.id
  and lower(u.email) = 'vitornantes2@gmail.com';
