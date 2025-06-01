// Armazena o último timestamp de cada tipo de notificação
type NotificationType = 'login' | 'location' | 'navigation' | 'route' | 'optimization' | 'status' | 'error' | 'default';

// Cache para controlar notificações repetidas
class NotificationCache {
  private static instance: NotificationCache;
  private cache: Record<string, { timestamp: number, content: string }> = {};
  
  // Intervalos mínimos (em ms) entre notificações do mesmo tipo
  private readonly intervals: Record<NotificationType, number> = {
    login: 5000,
    location: 30000,
    navigation: 30000,
    route: 30000,
    optimization: 10000,
    status: 3000,
    error: 5000,
    default: 3000
  };

  private constructor() {}

  public static getInstance(): NotificationCache {
    if (!NotificationCache.instance) {
      NotificationCache.instance = new NotificationCache();
    }
    return NotificationCache.instance;
  }

  /**
   * Verifica se uma notificação pode ser exibida com base no tipo e no intervalo mínimo
   */
  public shouldShow(type: string, content: string): boolean {
    const now = Date.now();
    const cacheKey = `${type}:${content}`;
    const cached = this.cache[cacheKey];
    
    // Determinar o intervalo com base no tipo
    const interval = this.intervals[type as NotificationType] || this.intervals.default;
    
    // Se não estiver em cache ou o intervalo tiver passado, pode mostrar
    if (!cached || (now - cached.timestamp > interval)) {
      this.cache[cacheKey] = { timestamp: now, content };
      return true;
    }
    
    return false;
  }
}

export default NotificationCache.getInstance();
