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
import { validateCPF, maskCPF } from '@/utils/cpfUtils';

const SignUp = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    cpf: '',
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
    
    // Aplicar máscara ao CPF enquanto o usuário digita
    if (name === 'cpf') {
      setFormData(prev => ({
        ...prev,
        [name]: maskCPF(value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
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
    
    // Validação de CPF
    const cpfClean = formData.cpf.replace(/[^0-9]/g, '');
    if (!cpfClean || !validateCPF(cpfClean)) {
      smartToast({
        title: "CPF inválido",
        description: "Por favor, informe um CPF válido",
        variant: "destructive"
      });
      return;
    }

    if (formData.password.length < 6) {
      smartToast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive"
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      smartToast({
        title: "As senhas não coincidem",
        description: "Por favor, verifique sua senha",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            cpf: formData.cpf.replace(/[^0-9]/g, ''),
          },
          emailRedirectTo: `${window.location.origin}/app`,
        },
      });

      if (error) {
        console.error('Erro no cadastro:', error);
        smartToast({
          title: "Erro no cadastro",
          description: error.message || "Não foi possível criar sua conta. Tente novamente.",
          variant: "destructive",
        });
      } else if (data.user) {
        // Criar perfil do usuário na tabela profiles
        try {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              { 
                id: data.user.id,
                full_name: formData.fullName,
                cpf: cpfClean,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            ]);

          if (profileError) {
            console.error('Erro ao criar perfil:', profileError);
            // Mensagem amigável para CPF duplicado
            if (profileError.code === '23505' || (profileError.message && profileError.message.includes('unique_cpf'))) {
              smartToast({
                title: "CPF já cadastrado",
                description: "Já existe um usuário com este CPF. Se você já tem conta, faça login ou recupere sua senha.",
                variant: "destructive"
              });
              setIsLoading(false);
              return;
            }
            // Não bloquear o fluxo principal se falhar por outro motivo
          }
          
          // Criar assinatura trial para o usuário
          try {
            const now = new Date();
            const trialEndDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 dias
            
            console.log('🔄 Criando assinatura trial:', {
              user_id: data.user.id,
              trial_ends_at: trialEndDate.toISOString(),
              current_period_start: now.toISOString(),
              current_period_end: trialEndDate.toISOString()
            });
            
            const { error: subscriptionError } = await supabase
              .from('user_subscriptions')
              .insert([
                {
                  user_id: data.user.id,
                  status: 'trialing',
                  is_active: true,
                  is_trial: true,
                  trial_ends_at: trialEndDate.toISOString(),
                  current_period_start: now.toISOString(),
                  current_period_end: trialEndDate.toISOString(),
                }
              ]);

            if (subscriptionError) {
              console.error('Erro ao criar assinatura trial:', subscriptionError);
              // Não bloquear o fluxo principal se falhar
            } else {
              console.log('✅ Assinatura trial criada com sucesso para o usuário:', data.user.id);
            }
          } catch (err) {
            console.error('Erro ao criar assinatura trial:', err);
            // Não bloquear o fluxo principal se falhar
          }
        } catch (err) {
          console.error('Erro ao criar perfil:', err);
          // Não bloquear o fluxo principal se falhar
        }

        const isEmailConfirmationRequired = data.user.identities && data.user.identities.length > 0 && !data.user.email_confirmed_at;

        if (isEmailConfirmationRequired) {
          smartToast({
            title: "Cadastro quase completo!",
            description: "Enviamos um link de confirmação para o seu email. Por favor, verifique sua caixa de entrada.",
          });
        } else {
          smartToast({
            title: "Cadastro realizado com sucesso!",
            description: "Sua conta foi criada. Você será redirecionado.",
          });
        }
        navigate('/login');
      } else {
        smartToast({
          title: "Erro inesperado",
          description: "Não foi possível criar a conta. Tente novamente.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Erro inesperado no cadastro:', error);
      smartToast({
        title: "Erro inesperado",
        description: error.message || "Ocorreu um problema. Tente novamente.",
        variant: "destructive",
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
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                name="cpf"
                placeholder="Digite seu CPF (apenas números)"
                value={formData.cpf}
                onChange={handleChange}
                required
                maxLength={14}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground mt-1">Formato: 123.456.789-00</p>
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
