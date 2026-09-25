-- Adicionar colunas CPF e phone se não existirem
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS cpf text,
ADD COLUMN IF NOT EXISTS phone text;

-- Constraint UNIQUE em CPF
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_cpf_unique UNIQUE (cpf);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_cpf ON public.profiles(cpf);

-- Função RPC para verificar se CPF já existe
CREATE OR REPLACE FUNCTION public.check_cpf_exists(cpf_input text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE cpf = cpf_input
  );
$$;

-- Função RPC para verificar se telefone já existe
CREATE OR REPLACE FUNCTION public.check_phone_exists(phone_input text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE phone = phone_input
  );
$$;
