-- Exclusao em cascata dos dados do usuario.
--
-- Seis chaves estrangeiras estavam como NO ACTION, entao apagar um usuario
-- falhava com erro de integridade: a exclusao pelo painel admin nunca
-- funcionou. route_history ainda tinha duas restricoes duplicadas apontando
-- para auth.users.
--
-- Tambem faltava cascata entre rotas/entregas e seus filhos, o que deixava
-- linhas orfas ao apagar uma rota.

-- Duplicata: route_history_user_id_fkey e fk_route_history_user fazem a mesma
-- coisa. Fica so uma.
alter table public.route_history drop constraint if exists fk_route_history_user;

-- Dados do usuario somem junto com a conta.
alter table public.profiles drop constraint if exists fk_profiles_user;
alter table public.profiles
  add constraint fk_profiles_user foreign key (id)
  references auth.users(id) on delete cascade;

alter table public.deliveries drop constraint if exists deliveries_user_id_fkey;
alter table public.deliveries
  add constraint deliveries_user_id_fkey foreign key (user_id)
  references auth.users(id) on delete cascade;

alter table public.routes drop constraint if exists routes_user_id_fkey;
alter table public.routes
  add constraint routes_user_id_fkey foreign key (user_id)
  references auth.users(id) on delete cascade;

alter table public.route_history drop constraint if exists route_history_user_id_fkey;
alter table public.route_history
  add constraint route_history_user_id_fkey foreign key (user_id)
  references auth.users(id) on delete cascade;

alter table public.delivery_history drop constraint if exists delivery_history_user_id_fkey;
alter table public.delivery_history
  add constraint delivery_history_user_id_fkey foreign key (user_id)
  references auth.users(id) on delete cascade;

-- Filhos de rota e entrega acompanham o pai, para nao sobrar linha orfa.
alter table public.route_deliveries drop constraint if exists route_deliveries_route_id_fkey;
alter table public.route_deliveries
  add constraint route_deliveries_route_id_fkey foreign key (route_id)
  references public.routes(id) on delete cascade;

alter table public.route_deliveries drop constraint if exists route_deliveries_delivery_id_fkey;
alter table public.route_deliveries
  add constraint route_deliveries_delivery_id_fkey foreign key (delivery_id)
  references public.deliveries(id) on delete cascade;

alter table public.delivery_history drop constraint if exists delivery_history_delivery_id_fkey;
alter table public.delivery_history
  add constraint delivery_history_delivery_id_fkey foreign key (delivery_id)
  references public.deliveries(id) on delete cascade;

alter table public.delivery_occurrences drop constraint if exists delivery_occurrences_delivery_id_fkey;
alter table public.delivery_occurrences
  add constraint delivery_occurrences_delivery_id_fkey foreign key (delivery_id)
  references public.deliveries(id) on delete cascade;

alter table public.route_history drop constraint if exists route_history_route_id_fkey;
alter table public.route_history
  add constraint route_history_route_id_fkey foreign key (route_id)
  references public.routes(id) on delete set null;
