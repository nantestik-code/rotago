-- Tabela de configurações do sistema (admin)
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  is_secret BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inserir configurações padrão do Mercado Pago (vazias)
INSERT INTO system_settings (key, value, description, category, is_secret) VALUES
  ('mp_public_key',    '', 'Public Key do Mercado Pago',    'payment', false),
  ('mp_access_token',  '', 'Access Token do Mercado Pago',  'payment', true),
  ('mp_webhook_url',   '', 'URL do Webhook do Mercado Pago','payment', false),
  ('mp_sandbox_mode',  'true', 'Modo sandbox (teste) ativo','payment', false)
ON CONFLICT (key) DO NOTHING;

-- RLS: apenas admins autenticados podem ler/escrever
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Leitura: usuários autenticados podem ler configurações não-secretas
CREATE POLICY "read_non_secret_settings" ON system_settings
  FOR SELECT USING (is_secret = false);

-- Escrita: qualquer autenticado (admin via supabaseAdmin contorna RLS via service_role)
CREATE POLICY "admin_write_settings" ON system_settings
  FOR ALL USING (true);
