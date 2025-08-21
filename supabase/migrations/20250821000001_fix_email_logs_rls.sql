-- CORREÇÃO: Política RLS para tabela email_logs
-- Problema: Política atual verifica auth.users.raw_user_meta_data->>'role' = 'admin' 
-- mas o sistema usa tabela admins separada e service key

-- 1. Remover política problemática
DROP POLICY IF EXISTS "Admins can view all email logs" ON public.email_logs;

-- 2. Criar política para service_role (cliente administrativo)
CREATE POLICY "Admin service key access" ON public.email_logs
    FOR ALL 
    TO service_role
    USING (true);

-- 3. Manter política para usuários (seus próprios logs)
-- Política já existe, mas garantir que está correta
DROP POLICY IF EXISTS "Users can view their own email logs" ON public.email_logs;
CREATE POLICY "Users can view their own email logs" ON public.email_logs
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = user_id);

-- 4. Política para inserção de logs (Edge Functions)
CREATE POLICY "System can insert email logs" ON public.email_logs
    FOR INSERT 
    TO authenticated, anon, service_role
    WITH CHECK (true);

-- 5. Política para atualização de logs (webhook callbacks)
CREATE POLICY "System can update email logs" ON public.email_logs
    FOR UPDATE 
    TO authenticated, service_role
    USING (true);

-- Comentários explicativos
COMMENT ON POLICY "Admin service key access" ON public.email_logs IS 
'Permite acesso total aos logs quando usando service key (adminAuthService)';

COMMENT ON POLICY "System can insert email logs" ON public.email_logs IS 
'Permite inserção de logs via Edge Functions e sistema';

COMMENT ON POLICY "System can update email logs" ON public.email_logs IS 
'Permite atualização de status via webhooks de provedores de email';
