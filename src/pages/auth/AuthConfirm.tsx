import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EmailOtpType } from '@supabase/supabase-js';
import { CheckCircle2, Loader2, Truck, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

// Destino dos links dos e-mails de autenticação (edge function auth-email).
// O link traz token_hash e type; aqui validamos com verifyOtp, que funciona
// com o cliente em flowType 'pkce' (o action_link implícito não funciona).

const OTP_TYPES: EmailOtpType[] = ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'];

/** Aceita só caminhos internos, para o parâmetro next não virar redirecionamento aberto. */
function safeNext(next: string | null, fallback: string) {
  if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  return fallback;
}

const AuthConfirm = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Validando seu link...');
  const ran = useRef(false);

  useEffect(() => {
    // O token só pode ser usado uma vez; o StrictMode roda efeitos duas vezes.
    if (ran.current) return;
    ran.current = true;

    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get('token_hash');
    const type = params.get('type') as EmailOtpType | null;
    const isRecovery = type === 'recovery';
    const next = safeNext(params.get('next'), isRecovery ? '/auth/reset-password?type=recovery' : '/app');

    if (!tokenHash || !type || !OTP_TYPES.includes(type)) {
      setStatus('error');
      setMessage('Link inválido ou incompleto. Peça um novo link.');
      return;
    }

    (async () => {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      if (error) {
        setStatus('error');
        setMessage(
          /expired|invalid/i.test(error.message)
            ? 'Este link expirou ou já foi usado. Peça um novo link.'
            : 'Não foi possível validar o link. Peça um novo link.',
        );
        return;
      }
      setStatus('success');
      setMessage(isRecovery ? 'Link validado! Agora crie sua nova senha.' : 'E-mail confirmado! Entrando no RotaGo...');
      setTimeout(() => navigate(next, { replace: true }), 1200);
    })();
  }, [navigate]);

  const isRecoveryLink = new URLSearchParams(window.location.search).get('type') === 'recovery';

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white flex flex-col items-center justify-center p-4">
      <div className="flex items-center mb-8">
        <Truck className="h-10 w-10 text-primary mr-2" />
        <span className="text-3xl font-bold">RotaGo</span>
      </div>

      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-2">
            {status === 'loading' && <Loader2 className="h-12 w-12 animate-spin text-primary" />}
            {status === 'success' && <CheckCircle2 className="h-12 w-12 text-green-600" />}
            {status === 'error' && <XCircle className="h-12 w-12 text-destructive" />}
          </div>
          <CardTitle>
            {status === 'loading' && 'Um instante'}
            {status === 'success' && 'Tudo certo!'}
            {status === 'error' && 'Link não funcionou'}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        {status === 'error' && (
          <CardContent className="flex flex-col gap-2">
            <Button onClick={() => navigate(isRecoveryLink ? '/auth/forgot-password' : '/auth/login')}>
              {isRecoveryLink ? 'Pedir novo link de senha' : 'Ir para o login'}
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default AuthConfirm;
