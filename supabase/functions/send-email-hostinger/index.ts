import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface EmailRequest {
  to: string;
  name: string;
  template: 'welcome' | 'admin_notification' | 'password_reset';
  data?: Record<string, any>;
  from?: string;
  subject?: string;
  provider?: 'sendgrid' | 'hostinger';
}

interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar método
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Método não permitido' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse do body
    const emailData: EmailRequest = await req.json();
    
    // Validações básicas
    if (!emailData.to || !emailData.name || !emailData.template) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Campos obrigatórios: to, name, template' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailData.to)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Formato de email inválido' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Configurar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Preparar dados do email baseado no template
    let subject = emailData.subject || '';
    let htmlContent = '';
    let textContent = '';

    switch (emailData.template) {
      case 'welcome':
        subject = subject || 'Bem-vindo ao RotaGo!';
        htmlContent = `
          <html>
            <head><meta charset="UTF-8"></head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #007cba; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1>🚀 Bem-vindo ao RotaGo!</h1>
                </div>
                <div style="padding: 20px; background: #f9f9f9; border-radius: 0 0 8px 8px;">
                  <h2>Olá, ${emailData.name}!</h2>
                  <p>Seja bem-vindo à plataforma RotaGo! Estamos muito felizes em tê-lo conosco.</p>
                  <p>Com o RotaGo, você pode:</p>
                  <ul>
                    <li>✅ Otimizar suas rotas de entrega</li>
                    <li>✅ Gerenciar clientes e pedidos</li>
                    <li>✅ Acompanhar estatísticas em tempo real</li>
                    <li>✅ Integrar com sistemas de pagamento</li>
                  </ul>
                  <p>Comece agora mesmo explorando nossa plataforma!</p>
                </div>
              </div>
            </body>
          </html>
        `;
        textContent = `Bem-vindo ao RotaGo, ${emailData.name}! Estamos felizes em tê-lo conosco.`;
        break;

      case 'admin_notification':
        subject = subject || 'Notificação Administrativa - RotaGo';
        htmlContent = `
          <html>
            <head><meta charset="UTF-8"></head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1>🔔 Notificação Administrativa</h1>
                </div>
                <div style="padding: 20px; background: #f9f9f9; border-radius: 0 0 8px 8px;">
                  <h2>Olá, ${emailData.name}!</h2>
                  <p>Uma nova notificação administrativa foi gerada no sistema RotaGo.</p>
                  ${emailData.data?.message ? `<p><strong>Mensagem:</strong> ${emailData.data.message}</p>` : ''}
                  <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </body>
          </html>
        `;
        textContent = `Notificação administrativa para ${emailData.name}`;
        break;

      case 'password_reset':
        subject = subject || 'Redefinição de Senha - RotaGo';
        htmlContent = `
          <html>
            <head><meta charset="UTF-8"></head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #ffc107; color: #333; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1>🔐 Redefinição de Senha</h1>
                </div>
                <div style="padding: 20px; background: #f9f9f9; border-radius: 0 0 8px 8px;">
                  <h2>Olá, ${emailData.name}!</h2>
                  <p>Recebemos uma solicitação para redefinir sua senha no RotaGo.</p>
                  <p>Se você não fez esta solicitação, ignore este email.</p>
                  ${emailData.data?.resetLink ? `
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${emailData.data.resetLink}" style="background: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Redefinir Senha</a>
                    </div>
                  ` : ''}
                  <p><small>Este link expira em 24 horas.</small></p>
                </div>
              </div>
            </body>
          </html>
        `;
        textContent = `Redefinição de senha solicitada para ${emailData.name}`;
        break;

      default:
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Template não suportado' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }

    // Preparar dados para o script PHP
    const phpData = {
      to: emailData.to,
      name: emailData.name,
      subject: subject,
      message: textContent,
      html: htmlContent,
      template: emailData.template,
      from: emailData.from || 'contato@rotago.site'
    };

    // Fazer requisição para o script PHP da Hostinger
    const phpResponse = await fetch('https://rotago.site/api/send-email-hostinger.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'RotaGo-EdgeFunction/1.0'
      },
      body: JSON.stringify(phpData)
    });

    if (!phpResponse.ok) {
      throw new Error(`Erro HTTP: ${phpResponse.status}`);
    }

    const phpResult = await phpResponse.json();

    if (!phpResult.success) {
      throw new Error(phpResult.error || 'Erro no envio via PHP');
    }

    // Registrar log no banco de dados
    try {
      const { error: logError } = await supabase
        .from('email_logs')
        .insert({
          recipient_email: emailData.to,
          recipient_name: emailData.name,
          email_type: emailData.template,
          status: 'sent',
          message_id: phpResult.messageId || `hostinger_${Date.now()}`,
          template_used: emailData.template,
          sent_by: 'system',
          sent_at: new Date().toISOString(),
          metadata: {
            provider: 'hostinger',
            subject: subject,
            php_response: phpResult
          }
        });

      if (logError) {
        console.error('Erro ao registrar log:', logError);
      }
    } catch (logError) {
      console.error('Erro ao registrar log:', logError);
    }

    // Retornar sucesso
    const response: EmailResponse = {
      success: true,
      messageId: phpResult.messageId || `hostinger_${Date.now()}`
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erro na Edge Function:', error);
    
    const errorResponse: EmailResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    };

    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});