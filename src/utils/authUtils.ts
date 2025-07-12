/**
 * Utilitários para autenticação e gerenciamento de sessão
 */

/**
 * Limpa todos os cookies relacionados à autenticação
 * @param patterns Array de padrões para identificar cookies de autenticação
 */
export const clearAuthCookies = (patterns: string[] = ['supabase', 'sb-', 'auth', 'token']) => {
  console.log('🍪 Limpando cookies de autenticação...');
  
  try {
    // Obter o domínio atual e suas variações
    const hostname = window.location.hostname;
    const domains = [
      '', // Domínio padrão
      hostname, // Domínio completo
      hostname.split('.').slice(1).join('.'), // Domínio sem subdomínio
      `.${hostname}`, // Domínio com ponto inicial
    ];
    
    // Caminhos possíveis
    const paths = ['/', '/app', '/auth', ''];
    
    // Para cada cookie existente
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.trim().split('=');
      
      if (!name) return;
      
      // Verificar se o cookie corresponde a algum dos padrões
      const matchesPattern = patterns.some(pattern => name.toLowerCase().includes(pattern.toLowerCase()));
      
      if (matchesPattern) {
        // Limpar o cookie em todas as combinações de domínio e caminho
        domains.forEach(domain => {
          paths.forEach(path => {
            // Expirar o cookie
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}${domain ? `; domain=${domain}` : ''};`;
          });
        });
        console.log(`🗑️ Cookie removido: ${name}`);
      }
    });
    
    console.log('✅ Limpeza de cookies concluída');
  } catch (error) {
    console.error('❌ Erro ao limpar cookies:', error);
  }
};

/**
 * Limpa todos os dados de autenticação (localStorage, sessionStorage e cookies)
 */
export const clearAllAuthData = () => {
  console.log('🧹 Iniciando limpeza completa de dados de autenticação...');
  
  try {
    // Limpar localStorage
    const localStorageKeys = Object.keys(localStorage);
    const authLocalStoragePatterns = ['supabase', 'auth', 'token', 'session', 'user', 'sb-'];
    
    localStorageKeys.forEach(key => {
      if (authLocalStoragePatterns.some(pattern => key.toLowerCase().includes(pattern.toLowerCase()))) {
        localStorage.removeItem(key);
        console.log(`🗑️ LocalStorage removido: ${key}`);
      }
    });
    
    // Limpar sessionStorage
    const sessionStorageKeys = Object.keys(sessionStorage);
    sessionStorageKeys.forEach(key => {
      if (authLocalStoragePatterns.some(pattern => key.toLowerCase().includes(pattern.toLowerCase()))) {
        sessionStorage.removeItem(key);
        console.log(`🗑️ SessionStorage removido: ${key}`);
      }
    });
    
    // Limpar cookies
    clearAuthCookies();
    
    console.log('✅ Limpeza completa de dados de autenticação concluída');
  } catch (error) {
    console.error('❌ Erro na limpeza de dados de autenticação:', error);
  }
};

/**
 * Verifica se há tokens de autenticação residuais
 * @returns {boolean} True se encontrar tokens residuais
 */
export const hasResidualAuthTokens = (): boolean => {
  try {
    // Verificar localStorage
    const localStorageKeys = Object.keys(localStorage);
    const hasLocalStorageTokens = localStorageKeys.some(key => 
      key.includes('supabase') || key.includes('sb-') || key.includes('token') || key.includes('auth')
    );
    
    // Verificar cookies
    const hasCookieTokens = document.cookie.split(';').some(cookie => {
      const name = cookie.trim().split('=')[0];
      return name && (name.includes('supabase') || name.includes('sb-') || name.includes('token') || name.includes('auth'));
    });
    
    return hasLocalStorageTokens || hasCookieTokens;
  } catch (error) {
    console.error('❌ Erro ao verificar tokens residuais:', error);
    return false;
  }
};
