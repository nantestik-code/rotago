-- Fechar a enumeracao de CPF e telefone.
--
-- check_cpf_exists e check_phone_exists sao SECURITY DEFINER e estavam
-- liberadas para anon: qualquer pessoa, sem conta, podia perguntar ao
-- /rest/v1/rpc se um CPF ou um celular ja estava cadastrado, e varrer a base
-- inteira com isso.
--
-- O cadastro nao precisa delas: o gatilho handle_new_user e os indices unicos
-- de profiles ja recusam CPF e telefone repetidos, e a tela de cadastro ja
-- traduz esses erros em mensagens claras.

revoke all on function public.check_cpf_exists(text) from public, anon, authenticated;
revoke all on function public.check_phone_exists(text) from public, anon, authenticated;

grant execute on function public.check_cpf_exists(text) to service_role;
grant execute on function public.check_phone_exists(text) to service_role;
