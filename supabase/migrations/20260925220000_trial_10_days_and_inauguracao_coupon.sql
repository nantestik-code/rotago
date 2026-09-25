-- Periodo de teste padrao passa de 15 para 10 dias.
update public.system_settings
set value = '10',
    description = 'Duracao do periodo de teste em dias',
    updated_at = now()
where key = 'trial_duration_days';

-- Cupom de inauguracao: 15 dias gratis, um resgate por CPF.
-- O plano segue igual: R$ 19,90 nos 2 primeiros ciclos, depois R$ 29,90.
insert into public.coupons (code, description, free_days, is_active)
values (
  'ULTIMOS15',
  'Cupom de inauguracao do RotaGo: 15 dias gratis no cadastro.',
  15,
  true
)
on conflict (code) do update
set description = excluded.description,
    free_days = excluded.free_days,
    is_active = true,
    updated_at = now();
