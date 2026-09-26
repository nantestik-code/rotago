import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { smartToast } from '@/hooks/use-smart-toast';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processando autenticação...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Obter parâmetros da URL
        const url = new URL(window.location.href);
        const errorCode = url.searchParams.get('error_code');
        const errorDescription = url.searchParams.get('error_description');
        
        // Verificar se há erros na URL
        if (errorCode) {
          console.error('Erro na autenticação:', errorCode, errorDescription);
          setStatus('error');
          setMessage(errorDescription || 'Ocorreu um erro durante a autenticação.');
          
          // Mostrar toast de erro
          smartToast({
            title: 'Erro na autenticação',
            description: errorDescription || 'Ocorreu um erro durante a autenticação.',
            variant: 'destructive'
          });
          
          // Redirecionar para login após 3 segundos
          setTimeout(() => {
            navigate('/auth/login');
          }, 3000);
          
          return;
        }
        
        // Processar o callback do Supabase
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erro ao processar callback:', error);
          setStatus('error');
          setMessage(error.message);
          
          smartToast({
            title: 'Erro na autenticação',
            description: error.message,
            variant: 'destructive'
          });
          
          // Redirecionar para login após 3 segundos
          setTimeout(() => {
            navigate('/auth/login');
          }, 3000);
          
          return;
        }
        
        if (data?.session) {
          console.log('Autenticação bem-sucedida:', data.session.user.email);
          setStatus('success');
          setMessage('Autenticação realizada com sucesso!');
          
          smartToast({
            title: 'Autenticação bem-sucedida',
            description: 'Você será redirecionado para o aplicativo.'
          });
          
          // Redirecionar para o app após 2 segundos
          setTimeout(() => {
            navigate('/app');
          }, 2000);
        } else {
          // Caso não tenha sessão, mas também não tenha erro
          console.log('Callback processado, mas sem sessão ativa');
          setStatus('success');
          setMessage('Verificação concluída! Faça login para continuar.');
          
          smartToast({
            title: 'Verificação concluída',
            description: 'Por favor, faça login para continuar.'
          });
          
          // Redirecionar para login após 2 segundos
          setTimeout(() => {
            navigate('/auth/login');
          }, 2000);
        }
      } catch (error) {
        console.error('Erro inesperado no callback:', error);
        setStatus('error');
        setMessage('Ocorreu um erro inesperado durante o processamento.');
        
        smartToast({
          title: 'Erro inesperado',
          description: 'Ocorreu um erro durante o processamento da autenticação.',
          variant: 'destructive'
        });
        
        // Redirecionar para login após 3 segundos
        setTimeout(() => {
          navigate('/auth/login');
        }, 3000);
      }
    };
    
    handleAuthCallback();
  }, [navigate]);
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-brand-50 to-white p-4">
      <div className="text-center">
        {status === 'loading' && (
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        )}
        
        {status === 'success' && (
          <div className="text-green-500 text-5xl mb-4">✓</div>
        )}
        
        {status === 'error' && (
          <div className="text-red-500 text-5xl mb-4">✗</div>
        )}
        
        <h1 className="text-2xl font-bold mb-2">
          {status === 'loading' ? 'Processando...' : 
           status === 'success' ? 'Sucesso!' : 
           'Erro na autenticação'}
        </h1>
        
        <p className="text-gray-600 max-w-md">{message}</p>
        
        {status !== 'loading' && (
          <p className="text-sm text-gray-500 mt-4">
            Você será redirecionado automaticamente em alguns segundos...
          </p>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
