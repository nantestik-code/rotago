-- CORREÇÃO: Política RLS para tabela email_logs
-- Problema: Política atual não funciona com sistema de admins local

-- 1. Remover política problemática
DROP POLICY IF EXISTS "Admins can view all email logs" ON public.email_logs;

-- 2. Criar nova política que funciona com service key (bypass RLS)
-- Esta política permite acesso total quando usando service key (cliente admin)
CREATE POLICY "Admin service key access" ON public.email_logs
    FOR ALL 
    TO service_role
    USING (true);

-- 3. Política para usuários autenticados via Supabase Auth (seus próprios logs)
CREATE POLICY "Users can view their own email logs" ON public.email_logs
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = user_id);

-- 4. Política para inserção de logs (sistema pode inserir)
CREATE POLICY "System can insert email logs" ON public.email_logs
    FOR INSERT 
    TO authenticated, anon, service_role
    WITH CHECK (true);

-- 5. Comentário explicativo
COMMENT ON POLICY "Admin service key access" ON public.email_logs IS 
'Permite acesso total aos logs de email quando usando service key (cliente administrativo)';

COMMENT ON POLICY "System can insert email logs" ON public.email_logs IS 
'Permite que o sistema insira logs de email de qualquer fonte (Edge Functions, etc.)';
