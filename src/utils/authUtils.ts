/**
 * Utilitários para autenticação e gerenciamento de sessão
 */

/**
 * Limpa todos os cookies relacionados à autenticação
 * @param patterns Array de padrões para identificar cookies de autenticação
 * @param exclusions Array de padrões para preservar (dados administrativos)
 */
export const clearAuthCookies = (
  patterns: string[] = ['supabase', 'sb-', 'auth', 'token'],
  exclusions: string[] = []
) => {

  
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
      
      // Verificar se é um cookie administrativo que deve ser preservado
      const isAdminCookie = exclusions.some(exclusion => 
        name.toLowerCase().includes(exclusion.toLowerCase())
      );
      
      // Verificar se o cookie corresponde a algum dos padrões
      const matchesPattern = patterns.some(pattern => name.toLowerCase().includes(pattern.toLowerCase()));
      
      // Só limpar se corresponder aos padrões E não for cookie administrativo
      if (!isAdminCookie && matchesPattern) {
        // Limpar o cookie em todas as combinações de domínio e caminho
        domains.forEach(domain => {
          paths.forEach(path => {
            // Expirar o cookie
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}${domain ? `; domain=${domain}` : ''};`;
          });
        });
        console.log(`🗑️ Removido cookie: ${name}`);
      } else if (isAdminCookie) {
        console.log(`🔒 Preservado cookie administrativo: ${name}`);
      }
    });
    
  
  } catch (error) {
    console.error('❌ Erro ao limpar cookies:', error);
  }
};

/**
 * Limpa todos os dados de autenticação (localStorage, sessionStorage e cookies)
 * IMPORTANTE: Preserva dados administrativos para evitar conflitos entre autenticações
 */
export const clearAllAuthData = () => {

  
  try {
    // Limpar localStorage
    const localStorageKeys = Object.keys(localStorage);
    const authLocalStoragePatterns = ['supabase', 'auth', 'token', 'session', 'user', 'sb-'];
    
    // Lista de exclusão para preservar dados administrativos
    const adminDataExclusions = ['rotago_admin_session', 'admin_auth', 'admin_session'];
    
    localStorageKeys.forEach(key => {
      // Verificar se é um dado administrativo que deve ser preservado
      const isAdminData = adminDataExclusions.some(exclusion => 
        key.toLowerCase().includes(exclusion.toLowerCase())
      );
      
      // Só remover se corresponder aos padrões de auth E não for dado administrativo
      if (!isAdminData && authLocalStoragePatterns.some(pattern => key.toLowerCase().includes(pattern.toLowerCase()))) {
        localStorage.removeItem(key);
        console.log(`🗑️ Removido localStorage: ${key}`);
      } else if (isAdminData) {
        console.log(`🔒 Preservado dado administrativo: ${key}`);
      }
    });
    
    // Limpar sessionStorage (com mesma lógica de preservação)
    const sessionStorageKeys = Object.keys(sessionStorage);
    sessionStorageKeys.forEach(key => {
      const isAdminData = adminDataExclusions.some(exclusion => 
        key.toLowerCase().includes(exclusion.toLowerCase())
      );
      
      if (!isAdminData && authLocalStoragePatterns.some(pattern => key.toLowerCase().includes(pattern.toLowerCase()))) {
        sessionStorage.removeItem(key);
        console.log(`🗑️ Removido sessionStorage: ${key}`);
      }
    });
    
    // Limpar cookies (preservando cookies administrativos)
    clearAuthCookies(['supabase', 'sb-', 'token'], adminDataExclusions);
    
    console.log('✅ Limpeza de dados de autenticação concluída (dados administrativos preservados)');
  } catch (error) {
    console.error('❌ Erro na limpeza de dados de autenticação:', error);
  }
};

/**
 * Verifica se há tokens de autenticação residuais (excluindo dados administrativos)
 * @returns {boolean} True se encontrar tokens residuais de usuário comum
 */
export const hasResidualAuthTokens = (): boolean => {
  try {
    // Lista de exclusão para dados administrativos
    const adminDataExclusions = ['rotago_admin_session', 'admin_auth', 'admin_session'];
    
    // Verificar localStorage
    const localStorageKeys = Object.keys(localStorage);
    const hasLocalStorageTokens = localStorageKeys.some(key => {
      const isAdminData = adminDataExclusions.some(exclusion => 
        key.toLowerCase().includes(exclusion.toLowerCase())
      );
      
      // Só considerar como token residual se não for dado administrativo
      return !isAdminData && (
        key.includes('supabase') || key.includes('sb-') || key.includes('token') || key.includes('auth')
      );
    });
    
    // Verificar cookies
    const hasCookieTokens = document.cookie.split(';').some(cookie => {
      const name = cookie.trim().split('=')[0];
      if (!name) return false;
      
      const isAdminCookie = adminDataExclusions.some(exclusion => 
        name.toLowerCase().includes(exclusion.toLowerCase())
      );
      
      // Só considerar como token residual se não for cookie administrativo
      return !isAdminCookie && (
        name.includes('supabase') || name.includes('sb-') || name.includes('token') || name.includes('auth')
      );
    });
    
    return hasLocalStorageTokens || hasCookieTokens;
  } catch (error) {
    console.error('❌ Erro ao verificar tokens residuais:', error);
    return false;
  }
};
