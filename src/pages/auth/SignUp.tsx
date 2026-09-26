import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { smartToast } from '@/hooks/use-smart-toast';
import { Truck, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { authEmail } from '@/lib/auth-email';
import { useAuth } from '@/hooks/use-auth';
import { validateCPF, maskCPF } from '@/utils/cpfUtils';

const maskPhone = (value: string) => {
  const nums = value.replace(/\D/g, '').slice(0, 11);
  if (nums.length <= 2) return `(${nums}`;
  if (nums.length <= 7) return `(${nums.slice(0,2)}) ${nums.slice(2)}`;
  if (nums.length <= 11) return `(${nums.slice(0,2)}) ${nums.slice(2,7)}-${nums.slice(7)}`;
  return value;
};

const SignUp = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    cpf: '',
    phone: '',
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
    } else if (name === 'phone') {
      setFormData(prev => ({
        ...prev,
        [name]: maskPhone(value)
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

    // Nome e sobrenome. Mesma regra do banco (is_valid_full_name), para o
    // erro aparecer antes de ir ao servidor.
    if (!/^[\p{L}'.-]{2,}(\s+[\p{L}'.-]{2,})+$/u.test(formData.fullName.trim())) {
      smartToast({
        title: "Nome completo é obrigatório",
        description: "Informe nome e sobrenome",
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

    // Validação de telefone. Precisa ser celular: o número é usado nas
    // notificações por WhatsApp e serve de vínculo da conta, junto com o CPF.
    // A mesma regra vale no banco (is_valid_phone), então aceitar fixo aqui
    // só empurraria o erro para o servidor.
    const phoneClean = formData.phone.replace(/\D/g, '');
    if (!/^[1-9][1-9]9[0-9]{8}$/.test(phoneClean)) {
      smartToast({
        title: "Telefone inválido",
        description: "Informe um celular com DDD, no formato (00) 90000-0000",
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
      // CPF e telefone duplicados sao recusados pelo gatilho handle_new_user e
      // pelos indices unicos de profiles; o tratamento de erro abaixo traduz
      // isso em mensagem. Nao ha pre-checagem por RPC: ela era aberta a
      // visitantes e permitia varrer a base perguntando "este CPF existe?".
      const cpfClean = formData.cpf.replace(/[^0-9]/g, '');
      const phoneClean = formData.phone.replace(/\D/g, '');

      // O e-mail de boas-vindas com o link de confirmacao sai pela nossa
      // edge function (Resend). O gatilho handle_new_user cria o perfil a
      // partir destes campos e recusa CPF/telefone invalido ou duplicado.
      const { data, error } = await authEmail({
        action: 'signup',
        email: formData.email,
        password: formData.password,
        full_name: formData.fullName,
        cpf: cpfClean,
        phone: phoneClean,
        redirect_to: `${window.location.origin}/app`,
      });

      if (error) {
        
        // Tratamento específico para usuário já registrado
        if (error.message?.includes('User already registered') || error.message?.includes('already registered')) {
          smartToast({
            title: "Email já cadastrado",
            description: "Este email já possui uma conta. Faça login ou use um email diferente.",
            variant: "destructive",
          });
        } else if (error.message?.includes('CPF ja esta cadastrado') || error.message?.includes('profiles_cpf')) {
          smartToast({
            title: "CPF já cadastrado",
            description: "Este CPF já possui uma conta. Faça login ou recupere sua senha.",
            variant: "destructive",
          });
        } else if (error.message?.includes('telefone ja esta cadastrado') || error.message?.includes('profiles_phone')) {
          smartToast({
            title: "Telefone já cadastrado",
            description: "Este número já possui uma conta. Faça login ou recupere sua senha.",
            variant: "destructive",
          });
        } else if (error.message?.includes('Telefone celular invalido')) {
          smartToast({
            title: "Telefone inválido",
            description: "Informe um celular com DDD, no formato (00) 90000-0000.",
            variant: "destructive",
          });
        } else if (error.message?.includes('CPF invalido')) {
          smartToast({
            title: "CPF inválido",
            description: "Confira os números do CPF.",
            variant: "destructive",
          });
        } else if (error.message?.includes('nome completo')) {
          smartToast({
            title: "Nome incompleto",
            description: "Informe nome e sobrenome.",
            variant: "destructive",
          });
        } else if (error.message?.includes('Database error saving new user') || error.status === 500) {
          smartToast({
            title: "Erro no cadastro",
            description: "Não foi possível completar o cadastro. Verifique se os dados estão corretos e tente novamente.",
            variant: "destructive",
          });
        } else {
          smartToast({
            title: "Erro no cadastro",
            description: error.message || "Não foi possível criar sua conta. Tente novamente.",
            variant: "destructive",
          });
        }
      } else if (data?.email_sent === false) {
        smartToast({
          title: "Conta criada!",
          description: "Não conseguimos enviar o email de confirmação agora. Na tela de login, use \"Reenviar confirmação\".",
        });
        navigate('/auth/login');
      } else {
        smartToast({
          title: "Cadastro quase completo!",
          description: "Enviamos um email de boas-vindas com o link de confirmação. Verifique sua caixa de entrada.",
        });
        navigate('/auth/login'); // Precisa confirmar email primeiro
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
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white flex flex-col items-center justify-center p-4">
      <Button
        variant="ghost"
        className="absolute top-4 left-4 flex items-center"
        onClick={() => navigate('/')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para a página inicial
      </Button>

      <div className="flex items-center mb-8">
        <Truck className="h-10 w-10 text-primary mr-2" />
        <span className="text-3xl font-bold">RotaGo</span>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Crie sua conta</CardTitle>
          <CardDescription className="text-center">
            Entre com seus dados para começar a usar o RotaGo gratuitamente.
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
              <Label htmlFor="phone">WhatsApp (com DDD)</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="(11) 99999-9999"
                value={formData.phone}
                onChange={handleChange}
                required
                maxLength={15}
                autoComplete="tel"
              />
              <p className="text-xs text-muted-foreground mt-1">Usado para notificações importantes</p>
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
              <Link to="/auth/login" className="text-primary hover:underline">
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
