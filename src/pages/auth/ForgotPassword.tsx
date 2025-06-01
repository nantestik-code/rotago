
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { smartToast } from '@/hooks/use-smart-toast';
import { Truck, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [email, setEmail] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/app', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!email.trim()) {
      smartToast({
        title: "Email é obrigatório",
        description: "Por favor, informe seu email",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Request password reset
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        smartToast({
          title: "Erro ao recuperar senha",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      setIsEmailSent(true);
      smartToast({
        title: "Email enviado",
        description: "Se existir uma conta com este email, você receberá um link para redefinir sua senha.",
      });
      
    } catch (error: any) {
      console.error('Error requesting password reset:', error);
      smartToast({
        title: "Erro ao recuperar senha",
        description: "Ocorreu um erro ao solicitar a recuperação de senha. Tente novamente mais tarde.",
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
        onClick={() => navigate('/auth/login')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para o login
      </Button>
      
      <div className="flex items-center mb-8">
        <Truck className="h-10 w-10 text-primary mr-2" />
        <span className="text-3xl font-bold">RotaFacil</span>
      </div>
      
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Recuperar Senha</CardTitle>
          <CardDescription className="text-center">
            Informe seu email para recuperar sua senha
          </CardDescription>
        </CardHeader>
        
        {!isEmailSent ? (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Digite seu email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                    Processando...
                  </>
                ) : 'Recuperar Senha'}
              </Button>
              <p className="text-sm text-center text-gray-600">
                Lembrou sua senha?{' '}
                <Link to="/auth/login" className="text-primary hover:underline">
                  Voltar ao login
                </Link>
              </p>
            </CardFooter>
          </form>
        ) : (
          <CardContent className="py-6">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
              <h3 className="text-xl font-medium">Email enviado!</h3>
              <p className="text-gray-600">
                Se existir uma conta com este email, você receberá um link para redefinir sua senha.
                Verifique sua caixa de entrada e spam.
              </p>
              <Button onClick={() => navigate('/auth/login')} className="mt-4">
                Voltar ao login
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
      
      <p className="mt-8 text-sm text-center text-gray-500 max-w-md">
        Caso não tenha recebido o email, verifique sua caixa de spam ou tente novamente em alguns minutos.
      </p>
    </div>
  );
};

export default ForgotPassword;
