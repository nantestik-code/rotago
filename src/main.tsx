
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.tsx'
import './index.css'
import 'mapbox-gl/dist/mapbox-gl.css'
import './utils/testLogs'

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
