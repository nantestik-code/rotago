-- Criar função get_email_statistics para calcular estatísticas de email
CREATE OR REPLACE FUNCTION public.get_email_statistics(
  start_date TIMESTAMPTZ DEFAULT NULL,
  end_date TIMESTAMPTZ DEFAULT NULL,
  email_type_filter TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  total_sent INTEGER;
  total_failed INTEGER;
  total_pending INTEGER;
  total_delivered INTEGER;
  total_bounced INTEGER;
  success_rate NUMERIC;
  failure_rate NUMERIC;
  stats_by_type JSON;
  stats_by_day JSON;
  recent_activity JSON;
BEGIN
  -- Definir datas padrão se não fornecidas
  IF start_date IS NULL THEN
    start_date := NOW() - INTERVAL '30 days';
  END IF;
  
  IF end_date IS NULL THEN
    end_date := NOW();
  END IF;

  -- Calcular totais gerais
  SELECT 
    COUNT(*) FILTER (WHERE status = 'sent') INTO total_sent
  FROM public.email_logs 
  WHERE created_at BETWEEN start_date AND end_date
    AND (email_type_filter IS NULL OR email_type = email_type_filter);

  SELECT 
    COUNT(*) FILTER (WHERE status = 'failed') INTO total_failed
  FROM public.email_logs 
  WHERE created_at BETWEEN start_date AND end_date
    AND (email_type_filter IS NULL OR email_type = email_type_filter);

  SELECT 
    COUNT(*) FILTER (WHERE status = 'pending') INTO total_pending
  FROM public.email_logs 
  WHERE created_at BETWEEN start_date AND end_date
    AND (email_type_filter IS NULL OR email_type = email_type_filter);

  SELECT 
    COUNT(*) FILTER (WHERE status = 'delivered') INTO total_delivered
  FROM public.email_logs 
  WHERE created_at BETWEEN start_date AND end_date
    AND (email_type_filter IS NULL OR email_type = email_type_filter);

  SELECT 
    COUNT(*) FILTER (WHERE status = 'bounced') INTO total_bounced
  FROM public.email_logs 
  WHERE created_at BETWEEN start_date AND end_date
    AND (email_type_filter IS NULL OR email_type = email_type_filter);

  -- Calcular taxas de sucesso e falha
  IF (total_sent + total_failed + total_delivered + total_bounced) > 0 THEN
    success_rate := ROUND(
      (total_sent + total_delivered)::NUMERIC / 
      (total_sent + total_failed + total_delivered + total_bounced)::NUMERIC * 100, 2
    );
    failure_rate := ROUND(
      (total_failed + total_bounced)::NUMERIC / 
      (total_sent + total_failed + total_delivered + total_bounced)::NUMERIC * 100, 2
    );
  ELSE
    success_rate := 0;
    failure_rate := 0;
  END IF;

  -- Estatísticas por tipo de email
  SELECT JSON_AGG(
    JSON_BUILD_OBJECT(
      'email_type', email_type,
      'total', total,
      'sent', sent,
      'failed', failed,
      'pending', pending,
      'delivered', delivered,
      'bounced', bounced
    )
  ) INTO stats_by_type
  FROM (
    SELECT 
      email_type,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'sent') as sent,
      COUNT(*) FILTER (WHERE status = 'failed') as failed,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
      COUNT(*) FILTER (WHERE status = 'bounced') as bounced
    FROM public.email_logs 
    WHERE created_at BETWEEN start_date AND end_date
      AND (email_type_filter IS NULL OR email_type = email_type_filter)
    GROUP BY email_type
    ORDER BY total DESC
  ) t;

  -- Estatísticas por dia (últimos 7 dias)
  SELECT JSON_AGG(
    JSON_BUILD_OBJECT(
      'date', date_trunc('day', created_at),
      'total', total,
      'sent', sent,
      'failed', failed
    ) ORDER BY date_trunc('day', created_at)
  ) INTO stats_by_day
  FROM (
    SELECT 
      created_at,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'sent') as sent,
      COUNT(*) FILTER (WHERE status = 'failed') as failed
    FROM public.email_logs 
    WHERE created_at >= NOW() - INTERVAL '7 days'
      AND (email_type_filter IS NULL OR email_type = email_type_filter)
    GROUP BY date_trunc('day', created_at)
  ) t;

  -- Atividade recente (últimos 10 emails)
  SELECT JSON_AGG(
    JSON_BUILD_OBJECT(
      'id', id,
      'recipient_email', recipient_email,
      'subject', subject,
      'email_type', email_type,
      'status', status,
      'created_at', created_at,
      'sent_at', sent_at,
      'error_message', error_message
    ) ORDER BY created_at DESC
  ) INTO recent_activity
  FROM (
    SELECT *
    FROM public.email_logs 
    WHERE created_at BETWEEN start_date AND end_date
      AND (email_type_filter IS NULL OR email_type = email_type_filter)
    ORDER BY created_at DESC
    LIMIT 10
  ) t;

  -- Construir resultado final
  result := JSON_BUILD_OBJECT(
    'period', JSON_BUILD_OBJECT(
      'start_date', start_date,
      'end_date', end_date,
      'filter', email_type_filter
    ),
    'totals', JSON_BUILD_OBJECT(
      'sent', COALESCE(total_sent, 0),
      'failed', COALESCE(total_failed, 0),
      'pending', COALESCE(total_pending, 0),
      'delivered', COALESCE(total_delivered, 0),
      'bounced', COALESCE(total_bounced, 0),
      'total', COALESCE(total_sent, 0) + COALESCE(total_failed, 0) + COALESCE(total_pending, 0) + COALESCE(total_delivered, 0) + COALESCE(total_bounced, 0)
    ),
    'rates', JSON_BUILD_OBJECT(
      'success_rate', success_rate,
      'failure_rate', failure_rate
    ),
    'by_type', COALESCE(stats_by_type, '[]'::JSON),
    'by_day', COALESCE(stats_by_day, '[]'::JSON),
    'recent_activity', COALESCE(recent_activity, '[]'::JSON)
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissões para usuários autenticados
GRANT EXECUTE ON FUNCTION public.get_email_statistics TO authenticated;

-- Política RLS para a função (apenas admins podem executar)
CREATE POLICY "Only admins can execute get_email_statistics" ON public.email_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Comentário para documentação
COMMENT ON FUNCTION public.get_email_statistics IS 'Função para calcular estatísticas detalhadas de emails enviados pelo sistema. Retorna dados em formato JSON com totais, taxas de sucesso/falha, estatísticas por tipo e atividade recente.';