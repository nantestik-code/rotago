import { logger } from './logger';

// Função para gerar logs de teste para demonstração
export const generateTestLogs = () => {
  console.log('🧪 Gerando logs de teste para demonstração...');

  // Logs de autenticação
  logger.info('AUTH', 'Usuário iniciou sessão com sucesso', {
    component: 'AuthService',
    function: 'login',
    userId: 'user_123',
    email: 'usuario@exemplo.com'
  });

  logger.warn('AUTH', 'Tentativa de login com credenciais inválidas', {
    component: 'AuthService',
    function: 'login',
    email: 'hacker@exemplo.com',
    userAgent: navigator.userAgent
  });

  // Logs de banco de dados
  logger.debug('DATABASE', 'Executando consulta na tabela profiles', {
    component: 'UsersManagement',
    function: 'fetchUsers',
    query: 'SELECT * FROM profiles WHERE is_active = true'
  });

  logger.error('DATABASE', 'Erro de conexão com o banco de dados', {
    component: 'SupabaseClient',
    function: 'query',
    error: 'Connection timeout after 30s',
    retryAttempt: 3
  });

  // Logs de API
  logger.info('API', 'Requisição para API externa bem-sucedida', {
    component: 'PaymentService',
    function: 'processPayment',
    endpoint: '/api/payments/process',
    responseTime: '245ms'
  });

  logger.warn('API', 'Rate limit atingido para API externa', {
    component: 'MapboxService',
    function: 'geocode',
    endpoint: '/geocoding/v5',
    remainingRequests: 0
  });

  // Logs de UI
  logger.debug('UI', 'Componente renderizado com sucesso', {
    component: 'AdminPanel',
    function: 'render',
    props: { activeTab: 'users' }
  });

  logger.error('UI', 'Erro ao renderizar componente', {
    component: 'RouteMap',
    function: 'render',
    error: 'Cannot read property "coordinates" of undefined'
  });

  // Logs administrativos
  logger.info('ADMIN', 'Administrador acessou painel de configurações', {
    component: 'SystemSettings',
    function: 'fetchSystemData',
    adminId: 'admin_456',
    adminRole: 'super_admin'
  });

  logger.critical('ADMIN', 'Tentativa de acesso não autorizado ao painel administrativo', {
    component: 'AdminRoute',
    function: 'validateAccess',
    userId: 'user_789',
    userRole: 'regular',
    attemptedPath: '/admin/system-settings'
  });

  // Logs de pagamento
  logger.info('PAYMENT', 'Pagamento processado com sucesso', {
    component: 'AsaasService',
    function: 'processSubscription',
    paymentId: 'mp_12345',
    amount: 29.90,
    currency: 'BRL'
  });

  logger.error('PAYMENT', 'Falha no processamento do pagamento', {
    component: 'AsaasService',
    function: 'processSubscription',
    error: 'Card declined',
    paymentId: 'mp_67890',
    userId: 'user_999'
  });

  // Logs de rota
  logger.debug('ROUTE', 'Rota calculada com sucesso', {
    component: 'RouteOptimizer',
    function: 'calculateRoute',
    origin: 'São Paulo, SP',
    destination: 'Rio de Janeiro, RJ',
    distance: '429 km',
    duration: '5h 30m'
  });

  logger.warn('ROUTE', 'Rota com tráfego intenso detectado', {
    component: 'TrafficAnalyzer',
    function: 'analyzeTraffic',
    routeId: 'route_abc123',
    trafficLevel: 'heavy',
    estimatedDelay: '45 minutes'
  });

  // Logs de entrega
  logger.info('DELIVERY', 'Entrega iniciada', {
    component: 'DeliveryService',
    function: 'startDelivery',
    deliveryId: 'del_456',
    driverId: 'driver_789',
    estimatedTime: '30 minutes'
  });

  logger.error('DELIVERY', 'Falha na entrega', {
    component: 'DeliveryService',
    function: 'completeDelivery',
    deliveryId: 'del_789',
    error: 'Customer not found at address',
    attempts: 3
  });

  // Logs de assinatura
  logger.info('SUBSCRIPTION', 'Nova assinatura criada', {
    component: 'SubscriptionService',
    function: 'createSubscription',
    userId: 'user_111',
    plan: 'premium',
    billingCycle: 'monthly'
  });

  logger.warn('SUBSCRIPTION', 'Assinatura próxima do vencimento', {
    component: 'SubscriptionService',
    function: 'checkExpirations',
    userId: 'user_222',
    expiresIn: '3 days',
    plan: 'basic'
  });

  // Logs de segurança
  logger.critical('SECURITY', 'Múltiplas tentativas de login falharam', {
    component: 'SecurityService',
    function: 'detectBruteForce',
    ip: '192.168.1.100',
    attempts: 10,
    timeWindow: '5 minutes'
  });

  logger.warn('SECURITY', 'Token de acesso expirado', {
    component: 'AuthMiddleware',
    function: 'validateToken',
    userId: 'user_333',
    tokenAge: '2 hours'
  });

  // Logs de performance
  logger.info('PERFORMANCE', 'Consulta otimizada executada', {
    component: 'DatabaseOptimizer',
    function: 'optimizeQuery',
    originalTime: '2.5s',
    optimizedTime: '0.3s',
    improvement: '88%'
  });

  logger.warn('PERFORMANCE', 'Consulta lenta detectada', {
    component: 'PerformanceMonitor',
    function: 'monitorQueries',
    query: 'SELECT * FROM deliveries JOIN routes',
    executionTime: '5.2s',
    threshold: '1s'
  });

  console.log('✅ Logs de teste gerados com sucesso!');
  console.log('📊 Acesse a aba "Logs" no painel administrativo para visualizar');
};

// Função para limpar logs de teste
export const clearTestLogs = () => {
  logger.clearSavedLogs();
  console.log('🧹 Logs de teste limpos');
};

// Exportar para uso no console do navegador
if (typeof window !== 'undefined') {
  (window as any).generateTestLogs = generateTestLogs;
  (window as any).clearTestLogs = clearTestLogs;
  console.log('🔧 Funções de teste disponíveis:');
  console.log('- generateTestLogs() - Gera logs de demonstração');
  console.log('- clearTestLogs() - Limpa todos os logs');
}