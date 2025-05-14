
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Truck, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        console.error('Login error:', error);
        
        // Verificar se o erro é de email não confirmado
        if (error.message.includes('Email not confirmed')) {
          toast({
            title: "Email não confirmado",
            description: "Por favor, confirme seu email para continuar ou solicite um novo link de confirmação.",
            variant: "destructive"
          });
          
          setResendEmail(formData.email);
          setIsResendDialogOpen(true);
          return;
        } 
        
        toast({
          title: "Erro ao entrar",
          description: "Email ou senha incorretos",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo de volta ao RotaFacil",
      });
      
      // Redirect to main app after successful login is now handled by the useEffect
    } catch (error) {
      console.error('Error during login:', error);
      toast({
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
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: resendEmail,
      });
      
      if (error) {
        toast({
          title: "Erro ao reenviar confirmação",
          description: error.message,
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "Link de confirmação enviado",
        description: "Verifique seu email para confirmar sua conta.",
      });
      
      setIsResendDialogOpen(false);
    } catch (error) {
      console.error('Error resending confirmation:', error);
      toast({
        title: "Erro ao reenviar confirmação",
        description: "Ocorreu um erro ao reenviar o link de confirmação.",
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
          <CardTitle className="text-2xl text-center">Entrar</CardTitle>
          <CardDescription className="text-center">
            Acesse sua conta do RotaFacil
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
