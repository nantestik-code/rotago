-- Script SQL para criar a tabela route_history no Supabase
-- Execute este script no SQL Editor do Supabase Dashboard

-- Criar tabela para histórico de ações das rotas
CREATE TABLE IF NOT EXISTS route_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'create', 'optimize', 'complete', 'delete', etc.
  message TEXT,
  details JSONB DEFAULT '{}', -- Mudei de 'metadata' para 'details' para coincidir com o hook
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_route_history_route_id ON route_history(route_id);
CREATE INDEX IF NOT EXISTS idx_route_history_user_id ON route_history(user_id);
CREATE INDEX IF NOT EXISTS idx_route_history_created_at ON route_history(created_at);
CREATE INDEX IF NOT EXISTS idx_route_history_action ON route_history(action);

-- Habilitar RLS (Row Level Security)
ALTER TABLE route_history ENABLE ROW LEVEL SECURITY;

-- Política RLS: usuários só podem ver/editar seu próprio histórico
CREATE POLICY "Users can view their own route history" ON route_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own route history" ON route_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own route history" ON route_history
  FOR UPDATE USING (auth.uid() = user_id);

-- Comentários para documentação
COMMENT ON TABLE route_history IS 'Histórico de ações realizadas nas rotas pelos usuários';
COMMENT ON COLUMN route_history.action IS 'Tipo de ação: create, optimize, update, complete, delete, status_change, login, logout, signup';
COMMENT ON COLUMN route_history.details IS 'Detalhes adicionais da ação em formato JSON';
