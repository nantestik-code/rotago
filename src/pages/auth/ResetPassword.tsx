
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { smartToast } from '@/hooks/use-smart-toast';
import { Truck, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { authEmail } from '@/lib/auth-email';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // O link de recuperacao do Supabase ja abre uma sessao. Sem esta checagem,
  // `isAuthenticated` vira true e a pessoa era mandada para /app antes de
  // conseguir digitar a nova senha, tornando a recuperacao inutilizavel.
  // A deteccao roda uma vez no mount porque o SDK limpa o hash da URL logo
  // depois de consumir o token.
  const [isRecoveryFlow] = useState(() => {
    if (typeof window === 'undefined') return false;
    const hash = window.location.hash ?? '';
    const search = window.location.search ?? '';
    return (
      hash.includes('type=recovery') ||
      search.includes('type=recovery') ||
      hash.includes('access_token') ||
      search.includes('code=')
    );
  });

  useEffect(() => {
    if (isAuthenticated && !isRecoveryFlow) {
      navigate('/app', { replace: true });
    }
  }, [isAuthenticated, isRecoveryFlow, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (password.length < 6) {
      smartToast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive"
      });
      return;
    }

    if (password !== confirmPassword) {
      smartToast({
        title: "Senhas não conferem",
        description: "A confirmação de senha não corresponde à senha informada",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Update the password
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        smartToast({
          title: "Erro ao redefinir senha",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      // Aviso de seguranca por e-mail. Falha aqui nao desfaz a troca de senha.
      // Precisa terminar antes do signOut, que invalida o token da sessao.
      await authEmail({ action: 'password_changed' }).catch(() => {});

      // Encerra a sessao aberta pelo link: a pessoa entra com a senha nova.
      await supabase.auth.signOut();

      smartToast({
        title: "Senha redefinida com sucesso",
        description: "Você já pode entrar com sua nova senha",
      });
      
      // Redirect to login page
      navigate('/auth/login');
      
    } catch (error: any) {
      console.error('Error resetting password:', error);
      smartToast({
        title: "Erro ao redefinir senha",
        description: "Ocorreu um erro ao redefinir sua senha. Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white flex flex-col items-center justify-center p-4">
      <div className="flex items-center mb-8">
        <Truck className="h-10 w-10 text-primary mr-2" />
        <span className="text-3xl font-bold">RotaGo</span>
      </div>
      
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Redefinir Senha</CardTitle>
          <CardDescription className="text-center">
            Digite sua nova senha
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Digite sua nova senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirme sua nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              ) : 'Redefinir Senha'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ResetPassword;
