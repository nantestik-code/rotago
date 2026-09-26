
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { smartToast } from '@/hooks/use-smart-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { authEmail } from '@/lib/auth-email';
import { useAuth } from '@/hooks/use-auth';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Logo from '@/components/Logo';

// Função auxiliar para verificar se estamos em ambiente de desenvolvimento
const isDevelopmentEnv = () => {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
};

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isResendDialogOpen, setIsResendDialogOpen] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // Verificar parâmetros de URL relacionados ao logout
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const logoutParam = params.get('logout');
    const sessionExpired = params.get('session_expired');
    const errorParam = params.get('error');
    const source = params.get('source');
    
    // Limpar localStorage e cookies ao carregar a página de login após logout
    if (logoutParam === 'true') {
      localStorage.clear();
      
      // Limpar cookies relacionados ao Supabase
      document.cookie.split(';').forEach(cookie => {
        const [name] = cookie.trim().split('=');
        if (name && (name.includes('supabase') || name.includes('sb-'))) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
      
      // Mostrar mensagem de logout bem-sucedido
      smartToast({
        title: "Logout realizado",
        description: "Você saiu do sistema com sucesso.",
        variant: "default"
      });
    }
    
    // Mensagem para sessão expirada
    if (sessionExpired === 'true') {
      smartToast({
        title: "Sessão expirada",
        description: "Sua sessão expirou. Por favor, faça login novamente.",
        variant: "destructive"
      });
    }
    
    // Mensagem para erro durante logout
    if (errorParam === 'true') {
      smartToast({
        title: "Erro durante logout",
        description: "Houve um problema ao sair do sistema, mas você foi redirecionado com sucesso.",
        variant: "destructive"
      });
    }
    

  }, [location.search]);
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // Get the intended destination or default to /app
      const from = location.state?.from?.pathname || '/app';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.email.trim() || !formData.password) {
      smartToast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Verificar se estamos em ambiente de desenvolvimento
      const isDevEnv = isDevelopmentEnv();
      
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        // Se houver erro no login
        if (error) {
          
          // Tratar erro de credenciais inválidas
          if (error.code === 'invalid_credentials') {
            // Nunca criar usuário automaticamente no login
            smartToast({
              title: "Credenciais inválidas",
              description: "Email ou senha incorretos. Verifique suas credenciais e tente novamente.",
              variant: "destructive"
            });
          } else if (error.message && error.message.includes('Email not confirmed')) {
            // Tratar erro de email não confirmado
            if (isDevEnv) {
              // Em desenvolvimento, tentar fazer login sem confirmação
              const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
              });
              
              if (signInError) {
                smartToast({
                  title: "Erro ao entrar",
                  description: signInError.message || "Ocorreu um erro durante o login. Tente novamente mais tarde.",
                  variant: "destructive"
                });
              } else if (signInData.user) {
                navigate('/app');
                return;
              }
            } else {
              // Em produção, mostrar diálogo para reenviar email
              smartToast({
                title: "Email não confirmado",
                description: "Por favor, confirme seu email para continuar.",
                variant: "destructive"
              });
              setResendEmail(formData.email);
              setIsResendDialogOpen(true);
            }
          } else {
            // Outros erros
            smartToast({
              title: "Erro ao entrar",
              description: error.message || "Ocorreu um erro durante o login. Tente novamente mais tarde.",
              variant: "destructive"
            });
          }
        } else if (data.user && data.session) {
          // Login bem-sucedido

          // Garantir que existe um perfil para o usuário
          try {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .maybeSingle();

            if (profileError) {
              console.warn('Erro ao buscar perfil do usuário:', profileError);
            }

            if (!profile) {
              // Cria o perfil se não existir
              await supabase.from('profiles').insert({
                id: data.user.id,
                full_name: data.user.user_metadata?.full_name || '',
                created_at: new Date().toISOString()
              });
            }
          } catch (profileError) {
            console.error('Erro ao garantir/criar perfil:', profileError);
          }

          navigate('/app');
        } else {
          // Caso inesperado: sem erro, mas sem usuário ou sessão
          smartToast({
            title: "Erro ao entrar",
            description: "Não foi possível iniciar a sessão. Tente novamente.",
            variant: "destructive"
          });
        }
      } catch (error) {
        // Erro inesperado durante o processo de login
        smartToast({
          title: "Erro ao entrar",
          description: "Ocorreu um erro ao fazer login. Tente novamente mais tarde.",
          variant: "destructive"
        });
      }
      
    } catch (error) {
      console.error('Error during login:', error);
      smartToast({
        title: "Erro ao entrar",
        description: "Ocorreu um erro ao fazer login. Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    setIsLoading(true);
    
    try {
      const { error } = await authEmail({
        action: 'resend_signup',
        email: resendEmail,
        redirect_to: `${window.location.origin}/app`,
      });
      
      if (error) {
        smartToast({
          title: "Erro ao reenviar confirmação",
          description: error.message,
          variant: "destructive"
        });
        return;
      }
      
      smartToast({
        title: "Link de confirmação enviado",
        description: "Verifique seu email para confirmar sua conta.",
      });
      
      setIsResendDialogOpen(false);
    } catch (error) {
      console.error('Error resending confirmation:', error);
      smartToast({
        title: "Erro ao reenviar confirmação",
        description: "Ocorreu um erro ao reenviar o link de confirmação.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white flex flex-col items-center justify-center p-4">
      <Button 
        variant="ghost" 
        className="absolute top-4 left-4 flex items-center" 
        onClick={() => navigate('/')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para a página inicial
      </Button>
      
      <div className="mb-8">
        <Logo size="lg" variant="default" interactive={false} showIcon={true} showText={true} />
      </div>
      
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Entrar</CardTitle>
          <CardDescription className="text-center">
            Acesse sua conta do RotaGo
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Digite seu email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Digite sua senha"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <div className="text-right">
                <Link to="/auth/forgot-password" className="text-sm text-primary hover:underline">
                  Esqueceu a senha?
                </Link>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : 'Entrar'}
            </Button>
            <p className="text-sm text-center text-gray-600">
              Não tem uma conta?{' '}
              <Link to="/auth/signup" className="text-primary hover:underline">
                Criar conta
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
      
      <p className="mt-8 text-sm text-center text-gray-500 max-w-md">
        Ao se cadastrar, você concorda com nossos Termos de Serviço e Política de Privacidade.
        Seus dados estão seguros conosco.
      </p>
      
      {/* Dialog para reenvio de confirmação de email */}
      <Dialog open={isResendDialogOpen} onOpenChange={setIsResendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email não confirmado</DialogTitle>
            <DialogDescription>
              Para acessar sua conta, é necessário confirmar seu email. Deseja que enviemos um novo link de confirmação?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsResendDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleResendConfirmation} 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : 'Reenviar confirmação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
