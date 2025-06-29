-- Habilitar a extensão uuid-ossp para gerar UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criação da tabela de perfis (profiles)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  role text default 'user',
  is_early_adopter boolean default false,
  subscription_status text default 'free',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Configurar políticas de segurança (RLS) para a tabela profiles
alter table public.profiles enable row level security;

-- Criar políticas para permitir acesso adequado
create policy "Usuários podem ver seus próprios perfis"
  on profiles for select
  using (auth.uid() = id);

create policy "Usuários podem atualizar seus próprios perfis"
  on profiles for update
  using (auth.uid() = id);
  
create policy "Usuários podem inserir seus próprios perfis"
  on profiles for insert
  with check (auth.uid() = id);
  
create policy "Usuários autenticados podem inserir perfis"
  on profiles for insert
  with check (auth.role() = 'authenticated');

-- Trigger para criar perfil automaticamente quando um usuário é criado
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, created_at, updated_at)
  values (new.id, new.raw_user_meta_data->>'full_name', now(), now());
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Criação da tabela de contatos
create table if not exists public.contatos (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  email text,
  telefone text,
  endereco text,
  cidade text,
  estado text,
  cep text,
  observacoes text,
  usuario_id uuid references auth.users(id) on delete cascade,
  criado_em timestamp with time zone default now(),
  atualizado_em timestamp with time zone default now()
);

-- Configurar políticas de segurança (RLS) para a tabela contatos
alter table public.contatos enable row level security;

-- Criar políticas para permitir acesso adequado
create policy "Usuários podem ver seus próprios contatos"
  on contatos for select
  using (auth.uid() = usuario_id);

create policy "Usuários podem inserir seus próprios contatos"
  on contatos for insert
  with check (auth.uid() = usuario_id);

create policy "Usuários podem atualizar seus próprios contatos"
  on contatos for update
  using (auth.uid() = usuario_id);

create policy "Usuários podem deletar seus próprios contatos"
  on contatos for delete
  using (auth.uid() = usuario_id);

-- Criação da tabela de agendamentos
create table if not exists public.agendamentos (
  id uuid primary key default uuid_generate_v4(),
  titulo text not null,
  descricao text,
  inicio timestamp with time zone not null,
  fim timestamp with time zone,
  usuario_id uuid references auth.users(id) on delete cascade,
  contato_id uuid references public.contatos(id) on delete set null,
  criado_em timestamp with time zone default now()
);

-- Configurar políticas de segurança (RLS) para a tabela agendamentos
alter table public.agendamentos enable row level security;

-- Criar políticas para permitir acesso adequado
create policy "Usuários podem ver seus próprios agendamentos"
  on agendamentos for select
  using (auth.uid() = usuario_id);

create policy "Usuários podem inserir seus próprios agendamentos"
  on agendamentos for insert
  with check (auth.uid() = usuario_id);

create policy "Usuários podem atualizar seus próprios agendamentos"
  on agendamentos for update
  using (auth.uid() = usuario_id);

create policy "Usuários podem deletar seus próprios agendamentos"
  on agendamentos for delete
  using (auth.uid() = usuario_id);
