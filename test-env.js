// Teste simples das variáveis de ambiente
console.log('=== TESTE VARIÁVEIS DE AMBIENTE ===');
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...');
console.log('VITE_SUPABASE_SERVICE_ROLE_KEY:', import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...');
console.log('=== FIM TESTE ===');