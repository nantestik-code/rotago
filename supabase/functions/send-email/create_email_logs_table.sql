-- Função para criar tabela de logs de email se não existir
CREATE OR REPLACE FUNCTION create_email_logs_table_if_not_exists()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Verificar se a tabela já existe
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'email_logs'
    ) THEN
        -- Criar tabela de logs de email
        CREATE TABLE public.email_logs (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            recipient_email text NOT NULL,
            recipient_name text NOT NULL,
            email_type text NOT NULL CHECK (email_type IN ('welcome', 'admin_notification', 'password_reset', 'custom')),
            status text NOT NULL CHECK (status IN ('sent', 'failed', 'pending', 'bounced', 'delivered', 'opened', 'clicked')),
            message_id text,
            error_message text,
            template_used text NOT NULL,
            sent_by uuid REFERENCES auth.users(id),
            sent_at timestamp with time zone DEFAULT now(),
            delivered_at timestamp with time zone,
            opened_at timestamp with time zone,
            clicked_at timestamp with time zone,
            bounce_reason text,
            metadata jsonb DEFAULT '{}',
            created_at timestamp with time zone DEFAULT now(),
            updated_at timestamp with time zone DEFAULT now()
        );

        -- Criar índices para performance
        CREATE INDEX idx_email_logs_recipient_email ON public.email_logs(recipient_email);
        CREATE INDEX idx_email_logs_email_type ON public.email_logs(email_type);
        CREATE INDEX idx_email_logs_status ON public.email_logs(status);
        CREATE INDEX idx_email_logs_sent_at ON public.email_logs(sent_at DESC);
        CREATE INDEX idx_email_logs_sent_by ON public.email_logs(sent_by);
        CREATE INDEX idx_email_logs_message_id ON public.email_logs(message_id) WHERE message_id IS NOT NULL;

        -- Trigger para atualizar updated_at
        CREATE OR REPLACE FUNCTION update_email_logs_updated_at()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $trigger$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $trigger$;

        CREATE TRIGGER trigger_update_email_logs_updated_at
            BEFORE UPDATE ON public.email_logs
            FOR EACH ROW
            EXECUTE FUNCTION update_email_logs_updated_at();

        -- RLS (Row Level Security)
        ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

        -- Policy para admins verem todos os logs
        CREATE POLICY "Admins can view all email logs" ON public.email_logs
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.role IN ('admin', 'super_admin', 'moderator')
                )
            );

        -- Policy para admins inserirem logs
        CREATE POLICY "Admins can insert email logs" ON public.email_logs
            FOR INSERT
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.role IN ('admin', 'super_admin', 'moderator')
                )
            );

        -- Policy para sistema (service_role) inserir logs
        CREATE POLICY "Service role can manage email logs" ON public.email_logs
            FOR ALL
            USING (true)
            WITH CHECK (true);

        -- Comentários para documentação
        COMMENT ON TABLE public.email_logs IS 'Logs de todos os emails enviados pelo sistema';
        COMMENT ON COLUMN public.email_logs.email_type IS 'Tipo do email: welcome, admin_notification, password_reset, custom';
        COMMENT ON COLUMN public.email_logs.status IS 'Status do email: sent, failed, pending, bounced, delivered, opened, clicked';
        COMMENT ON COLUMN public.email_logs.message_id IS 'ID da mensagem retornado pelo provedor de email (SendGrid)';
        COMMENT ON COLUMN public.email_logs.template_used IS 'Versão do template utilizado';
        COMMENT ON COLUMN public.email_logs.metadata IS 'Dados adicionais em formato JSON';

        RAISE NOTICE 'Tabela email_logs criada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela email_logs já existe';
    END IF;
END;
$$;

-- Executar a função para criar a tabela
SELECT create_email_logs_table_if_not_exists();

-- Função para obter estatísticas de email
CREATE OR REPLACE FUNCTION get_email_statistics(
    start_date timestamp with time zone DEFAULT (now() - interval '30 days'),
    end_date timestamp with time zone DEFAULT now()
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    -- Verificar se o usuário é admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin', 'moderator')
    ) THEN
        RAISE EXCEPTION 'Acesso negado: permissões insuficientes';
    END IF;

    SELECT json_build_object(
        'total_sent', (
            SELECT COUNT(*) FROM public.email_logs 
            WHERE sent_at BETWEEN start_date AND end_date
            AND status = 'sent'
        ),
        'total_failed', (
            SELECT COUNT(*) FROM public.email_logs 
            WHERE sent_at BETWEEN start_date AND end_date
            AND status = 'failed'
        ),
        'total_delivered', (
            SELECT COUNT(*) FROM public.email_logs 
            WHERE delivered_at BETWEEN start_date AND end_date
            AND status = 'delivered'
        ),
        'total_opened', (
            SELECT COUNT(*) FROM public.email_logs 
            WHERE opened_at BETWEEN start_date AND end_date
            AND status = 'opened'
        ),
        'by_type', (
            SELECT json_object_agg(email_type, count)
            FROM (
                SELECT email_type, COUNT(*) as count
                FROM public.email_logs
                WHERE sent_at BETWEEN start_date AND end_date
                GROUP BY email_type
            ) t
        ),
        'recent_activity', (
            SELECT json_agg(
                json_build_object(
                    'id', id,
                    'recipient_email', recipient_email,
                    'recipient_name', recipient_name,
                    'email_type', email_type,
                    'status', status,
                    'sent_at', sent_at,
                    'error_message', error_message
                )
            )
            FROM (
                SELECT *
                FROM public.email_logs
                WHERE sent_at BETWEEN start_date AND end_date
                ORDER BY sent_at DESC
                LIMIT 10
            ) recent
        )
    ) INTO result;

    RETURN result;
END;
$$;

-- Comentário na função
COMMENT ON FUNCTION get_email_statistics IS 'Retorna estatísticas de emails enviados para admins';