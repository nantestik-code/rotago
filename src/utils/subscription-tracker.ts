// Rastreador de criação de assinaturas
export const trackSubscriptionCreation = (source: string, data: any) => {
  // Log apenas em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    console.log('Assinatura sendo criada:', { source, data });
  }
};
