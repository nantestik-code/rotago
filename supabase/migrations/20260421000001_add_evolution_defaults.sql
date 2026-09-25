-- Adicionar configurações padrão da Evolution API em system_settings
INSERT INTO system_settings (key, value, description, category, is_secret)
VALUES 
  ('evolution_api_url', '', 'URL base da Evolution API', 'notifications', false),
  ('evolution_instance', '', 'Nome da instância Evolution', 'notifications', false),
  ('evolution_api_key', '', 'Chave de API da Evolution', 'notifications', true)
ON CONFLICT (key) DO NOTHING;
