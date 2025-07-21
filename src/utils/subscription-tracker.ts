// 🔍 RASTREADOR GLOBAL DE CRIAÇÃO DE ASSINATURAS
// Este arquivo monitora TODAS as inserções em user_subscriptions

export const trackSubscriptionCreation = (source: string, data: any) => {
  const timestamp = new Date().toISOString();
  const stackTrace = new Error().stack;
  
  console.log('🚨 ==========================================');
  console.log('🚨 ASSINATURA SENDO CRIADA - RASTREAMENTO GLOBAL');
  console.log('🚨 ==========================================');
  console.log('📍 Fonte:', source);
  console.log('⏰ Timestamp:', timestamp);
  console.log('📊 Dados:', data);
  console.log('📋 Stack Trace:', stackTrace);
  console.log('🚨 ==========================================');
};
