import { createRoot } from 'react-dom/client'
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeNativeApp } from "./utils/capacitorUtils";
import 'mapbox-gl/dist/mapbox-gl.css'
import './utils/testLogs'
import { HelmetProvider } from 'react-helmet-async';

// Inicializar configurações nativas
initializeNativeApp();

// Testes/Logs de variáveis de ambiente somente em desenvolvimento
if (import.meta.env.DEV) {
  console.log('=== TESTE VARIÁVEIS DE AMBIENTE (DEV) ===');
  console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
  console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...');
  console.log('=== FIM TESTE ===');
}

// 🔧 Inicializar Service Worker para cache e atualizações
import './utils/sw-manager';

// 🔍 INTERCEPTADOR GLOBAL - logs apenas em desenvolvimento
if (import.meta.env.DEV) {
  console.log('🚨 ===========================================');
  console.log('🚨 INTERCEPTADOR GLOBAL ATIVO');
  console.log('🚨 Monitorando TODAS as inserções em user_subscriptions');
  console.log('🚨 ===========================================');
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
