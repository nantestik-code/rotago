import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Os e-mails de autenticação (boas-vindas, confirmação, redefinição de senha)
// saem pela edge function auth-email, via Resend, e não pelo Supabase Auth.

type AuthEmailBody =
  | { action: 'signup'; email: string; password: string; full_name: string; cpf: string; phone: string; redirect_to?: string }
  | { action: 'resend_signup'; email: string; redirect_to?: string }
  | { action: 'recovery'; email: string; redirect_to?: string }
  // Aviso de seguranca; a funcao identifica o usuario pelo JWT da sessao.
  | { action: 'password_changed' };

/** Chama a função e devolve { error } com a mensagem do servidor, se houver. */
export async function authEmail(
  body: AuthEmailBody,
): Promise<{ data: { ok?: boolean; email_sent?: boolean } | null; error: { message: string } | null }> {
  const { data, error } = await supabase.functions.invoke('auth-email', { body });
  if (!error) return { data, error: null };

  if (error instanceof FunctionsHttpError) {
    try {
      const payload = await error.context.json();
      if (payload?.error) return { data: null, error: { message: String(payload.error) } };
    } catch {
      // resposta sem JSON: cai na mensagem genérica abaixo
    }
  }
  return { data: null, error: { message: error.message } };
}
