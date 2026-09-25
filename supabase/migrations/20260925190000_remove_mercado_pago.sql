-- Remocao do Mercado Pago. O unico gateway do RotaGo e a Asaas.
--
-- Verificado antes de aplicar: todas as colunas e chaves abaixo estavam
-- vazias (0 linhas preenchidas), entao nao ha perda de dados.

-- Configuracoes do gateway antigo.
delete from public.system_settings where key like 'mp\_%';

-- Colunas especificas do Mercado Pago.
alter table public.user_subscriptions drop column if exists mercado_pago_customer_id;
alter table public.payment_history    drop column if exists mercado_pago_payment_id;

-- O identificador do plano no gateway continua util, mas deixa de ser
-- amarrado a um fornecedor.
alter table public.subscription_plans
  rename column mercadopago_plan_id to gateway_plan_id;

comment on column public.subscription_plans.gateway_plan_id is
  'Identificador do plano no gateway de pagamento (Asaas).';

-- Identificador generico do pagamento, no lugar do campo do Mercado Pago.
alter table public.payment_history
  add column if not exists gateway_payment_id text;

comment on column public.payment_history.gateway_payment_id is
  'Identificador da cobranca no gateway de pagamento (Asaas).';
