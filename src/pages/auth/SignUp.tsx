import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { smartToast } from '@/hooks/use-smart-toast';
import { Truck, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';

const SignUp = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/app', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Função para verificar se estamos em ambiente de desenvolvimento
  const isDevelopmentEnv = (): boolean => {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.fullName.trim()) {
      smartToast({
        title: "Nome completo é obrigatório",
        description: "Por favor, informe seu nome completo",
        variant: "destructive"
      });
      return;
    }

    if (!formData.email.trim()) {
      smartToast({
        title: "Email é obrigatório",
        description: "Por favor, informe seu email",
        variant: "destructive"
      });
      return;
    }
    
    // Removendo a validação de CPF já que não temos a coluna no banco de dados
    // Isso evita erros de validação desnecessários

    // Validar senha
    if (formData.password.length < 6) {
      smartToast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Verificar se estamos em ambiente de desenvolvimento
      const isDevEnv = isDevelopmentEnv();
      
      console.log('Criando conta em ambiente:', isDevEnv ? 'desenvolvimento' : 'produção');
      
      // Criar o usuário no Supabase
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          // Configurar redirecionamento para confirmação de email (apenas em produção)
          emailRedirectTo: isDevEnv ? undefined : `${window.location.origin}/auth/callback`,
          // Incluir dados do perfil do usuário
          data: {
            full_name: formData.fullName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        }
      });

      if (error) {
        console.error('Erro ao criar conta:', error);
        smartToast({
          title: "Erro ao criar conta",
          description: error.message,
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      if (!data.user) {
        console.error('Erro ao criar conta: usuário não retornado');
        smartToast({
          title: "Erro ao criar conta",
          description: "Não foi possível criar sua conta. Tente novamente mais tarde.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      console.log('Conta criada com sucesso:', { userId: data.user.id, email: data.user.email });
      
      // Em ambiente de desenvolvimento, fazer login automático
      if (isDevEnv) {
        try {
          console.log('Tentando login automático em ambiente de desenvolvimento');
          
          // Tentar fazer login com as credenciais fornecidas
          const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password
          });
          
          if (loginError) {
            console.error('Erro no login automático:', loginError);
            smartToast({
              title: "Cadastro realizado com sucesso!",
              description: "Sua conta foi criada, mas não foi possível fazer login automático. Por favor, faça login manualmente.",
            });
            navigate('/login');
          } else if (loginData.user && loginData.session) {
            console.log('Login automático bem-sucedido');
            
            // Criar perfil do usuário na tabela profiles (apenas em desenvolvimento)
            try {
              const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                  id: loginData.user.id,
                  full_name: formData.fullName,
                  updated_at: new Date().toISOString()
                });
                
              if (profileError) {
                console.warn('Erro ao criar perfil do usuário:', profileError);
              } else {
                console.log('Perfil do usuário criado com sucesso');
              }
            } catch (profileError) {
              console.warn('Erro ao criar perfil do usuário:', profileError);
            }
            
            smartToast({
              title: "Cadastro realizado com sucesso!",
              description: "Sua conta foi criada e você foi autenticado automaticamente.",
            });
            navigate('/app');
          } else {
            console.error('Login automático falhou: dados de usuário ou sessão ausentes');
            smartToast({
              title: "Cadastro realizado com sucesso!",
              description: "Sua conta foi criada. Por favor, faça login para continuar.",
            });
            navigate('/login');
          }
        } catch (loginError) {
          console.error('Erro ao tentar login automático:', loginError);
          smartToast({
            title: "Cadastro realizado com sucesso!",
            description: "Sua conta foi criada. Por favor, faça login para continuar.",
          });
          navigate('/login');
        }
      } else {
        // Em produção, mostrar mensagem sobre confirmação de email
        smartToast({
          title: "Cadastro realizado com sucesso!",
          description: "Sua conta foi criada. Por favor, verifique seu email para confirmar o cadastro.",
        });
        navigate('/login');
      }
    } catch (error) {
      console.error('Error during signup:', error);
      smartToast({
        title: "Erro ao criar conta",
        description: "Ocorreu um erro ao criar sua conta. Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-4">
      <Button 
        variant="ghost" 
        className="absolute top-4 left-4 flex items-center" 
        onClick={() => navigate('/')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para a página inicial
      </Button>
      
      <div className="flex items-center mb-8">
        <Truck className="h-10 w-10 text-primary mr-2" />
        <span className="text-3xl font-bold">RotaFacil</span>
      </div>
      
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Crie sua conta</CardTitle>
          <CardDescription className="text-center">
            Entre com seus dados para começar a usar o RotaFacil gratuitamente.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome completo</Label>
              <Input
                id="fullName"
                name="fullName"
                placeholder="Digite seu nome completo"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </div>
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirme sua senha"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
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
                  Criando conta...
                </>
              ) : 'Criar conta'}
            </Button>
            <p className="text-sm text-center text-gray-600">
              Já tem uma conta?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Entrar
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
      
      <p className="mt-8 text-sm text-center text-gray-500 max-w-md">
        Ao se cadastrar, você concorda com nossos Termos de Serviço e Política de Privacidade.
        Seus dados estão seguros conosco.
      </p>
    </div>
  );
};

export default SignUp;
