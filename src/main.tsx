
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.tsx'
import './index.css'
import 'mapbox-gl/dist/mapbox-gl.css'
import './utils/testLogs'

// Teste das variáveis de ambiente
console.log('=== TESTE VARIÁVEIS DE AMBIENTE ===');
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...');
console.log('VITE_SUPABASE_SERVICE_ROLE_KEY:', import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...');
console.log('=== FIM TESTE ===');

// 🔧 Inicializar Service Worker para cache e atualizações
import './utils/sw-manager';

// 🔍 INTERCEPTADOR GLOBAL PARA DETECTAR DUPLICAÇÃO DE ASSINATURAS
console.log('🚨 ===========================================');
console.log('🚨 INTERCEPTADOR GLOBAL ATIVO');
console.log('🚨 Monitorando TODAS as inserções em user_subscriptions');
console.log('🚨 ===========================================');

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
