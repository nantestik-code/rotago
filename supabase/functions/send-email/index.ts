import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface EmailRequest {
  to: string;
  name: string;
  template: 'welcome' | 'admin_notification' | 'password_reset';
  data?: Record<string, any>;
  from?: string;
  subject?: string;
}

interface SendGridResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Token de autorização necessário');
    }

    // Inicializar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verificar usuário autenticado
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Usuário não autenticado');
    }

    // Verificar se é admin
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin', 'moderator'].includes(profile.role)) {
      throw new Error('Acesso negado: permissões insuficientes');
    }

    const emailRequest: EmailRequest = await req.json();
    
    // Validar dados obrigatórios
    if (!emailRequest.to || !emailRequest.name || !emailRequest.template) {
      throw new Error('Campos obrigatórios: to, name, template');
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailRequest.to)) {
      throw new Error('Email inválido');
    }

    // Configurar SendGrid
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    if (!SENDGRID_API_KEY) {
      throw new Error('SendGrid API Key não configurada');
    }

    // Gerar conteúdo do email baseado no template
    const emailContent = generateEmailContent(emailRequest);
    
    // Preparar dados para SendGrid
    const sendGridData = {
      personalizations: [{
        to: [{ email: emailRequest.to, name: emailRequest.name }],
        subject: emailContent.subject
      }],
      from: {
        email: emailRequest.from || 'noreply@rotago.com.br',
        name: 'RotaGo'
      },
      content: [{
        type: 'text/html',
        value: emailContent.html
      }],
      tracking_settings: {
        click_tracking: { enable: true },
        open_tracking: { enable: true }
      },
      custom_args: {
        template: emailRequest.template,
        user_id: user.id,
        timestamp: new Date().toISOString()
      }
    };

    // Enviar email via SendGrid
    const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sendGridData),
    });

    let result: SendGridResponse;
    
    if (sendGridResponse.ok) {
      // SendGrid retorna 202 para sucesso
      const messageId = sendGridResponse.headers.get('X-Message-Id') || 
                       `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      result = {
        success: true,
        messageId: messageId
      };

      // Log do envio bem-sucedido
      await logEmailSent(supabaseClient, {
        recipient_email: emailRequest.to,
        recipient_name: emailRequest.name,
        email_type: emailRequest.template,
        status: 'sent',
        message_id: messageId,
        template_used: `${emailRequest.template}_v1`,
        sent_by: user.id
      });

    } else {
      const errorData = await sendGridResponse.text();
      result = {
        success: false,
        error: `SendGrid Error: ${sendGridResponse.status} - ${errorData}`
      };

      // Log do erro
      await logEmailSent(supabaseClient, {
        recipient_email: emailRequest.to,
        recipient_name: emailRequest.name,
        email_type: emailRequest.template,
        status: 'failed',
        error_message: result.error,
        template_used: `${emailRequest.template}_v1`,
        sent_by: user.id
      });
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 400,
      },
    );

  } catch (error) {
    console.error('Erro na função send-email:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro interno do servidor'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});

// Função para gerar conteúdo do email
function generateEmailContent(request: EmailRequest): { subject: string; html: string } {
  const { template, name, to, data = {} } = request;
  
  switch (template) {
    case 'welcome':
      return {
        subject: 'Bem-vindo ao RotaGo! 🚀',
        html: generateWelcomeEmail({
          userName: name,
          userEmail: to,
          loginUrl: data.loginUrl || 'https://rotago.com.br/login'
        })
      };
      
    case 'admin_notification':
      return {
        subject: `Novo usuário cadastrado - ${name}`,
        html: generateAdminNotificationEmail({
          userName: name,
          userEmail: to,
          userCpf: data.userCpf,
          registrationDate: data.registrationDate || new Date().toISOString(),
          subscriptionPlan: data.subscriptionPlan || 'trial',
          adminPanelUrl: data.adminPanelUrl || 'https://rotago.com.br/admin'
        })
      };
      
    case 'password_reset':
      return {
        subject: 'Redefinir sua senha - RotaGo',
        html: `
          <h1>Redefinir Senha</h1>
          <p>Olá ${name},</p>
          <p>Você solicitou a redefinição de sua senha.</p>
          <a href="${data.resetUrl}">Clique aqui para redefinir</a>
        `
      };
      
    default:
      throw new Error(`Template '${template}' não encontrado`);
  }
}

// Template de boas-vindas (versão simplificada para a Edge Function)
function generateWelcomeEmail({ userName, userEmail, loginUrl }: {
  userName: string;
  userEmail: string;
  loginUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bem-vindo ao RotaGo!</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center; color: white; }
        .content { padding: 40px 30px; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>RotaGo</h1>
            <p>Otimização Inteligente de Rotas</p>
        </div>
        <div class="content">
            <h2>Bem-vindo, ${userName}! 🎉</h2>
            <p>Estamos muito felizes em tê-lo conosco! Sua conta foi criada com sucesso.</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="${loginUrl}" class="cta-button">Começar Agora</a>
            </p>
            <p><small>Este email foi enviado para ${userEmail}</small></p>
        </div>
    </div>
</body>
</html>
  `;
}

// Template de notificação admin (versão simplificada)
function generateAdminNotificationEmail({ userName, userEmail, userCpf, registrationDate, subscriptionPlan, adminPanelUrl }: {
  userName: string;
  userEmail: string;
  userCpf?: string;
  registrationDate: string;
  subscriptionPlan: string;
  adminPanelUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Novo Usuário - RotaGo</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; color: white; }
        .content { padding: 30px; }
        .user-info { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .cta-button { display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>RotaGo Admin</h1>
            <p>Novo Usuário Cadastrado</p>
        </div>
        <div class="content">
            <h2>🎉 Novo usuário se cadastrou!</h2>
            <div class="user-info">
                <p><strong>Nome:</strong> ${userName}</p>
                <p><strong>Email:</strong> ${userEmail}</p>
                ${userCpf ? `<p><strong>CPF:</strong> ${userCpf}</p>` : ''}
                <p><strong>Data:</strong> ${new Date(registrationDate).toLocaleString('pt-BR')}</p>
                <p><strong>Plano:</strong> ${subscriptionPlan}</p>
            </div>
            <p style="text-align: center; margin: 30px 0;">
                <a href="${adminPanelUrl}" class="cta-button">Ver no Painel</a>
            </p>
        </div>
    </div>
</body>
</html>
  `;
}

// Função para registrar log de email
async function logEmailSent(supabaseClient: any, logData: {
  recipient_email: string;
  recipient_name: string;
  email_type: string;
  status: string;
  message_id?: string;
  error_message?: string;
  template_used: string;
  sent_by: string;
}) {
  try {
    // Criar tabela de logs se não existir
    await supabaseClient.rpc('create_email_logs_table_if_not_exists');
    
    // Inserir log
    const { error } = await supabaseClient
      .from('email_logs')
      .insert({
        ...logData,
        sent_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Erro ao salvar log de email:', error);
    }
  } catch (error) {
    console.error('Erro ao processar log de email:', error);
  }
}

/* Deno.test("send-email function", async () => {
  const testRequest = new Request("http://localhost:8000/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer test-token"
    },
    body: JSON.stringify({
      to: "test@example.com",
      name: "Test User",
      template: "welcome"
    })
  });
  
  // Note: This would need proper mocking for actual testing
  // const response = await serve(testRequest);
  // assertEquals(response.status, 200);
}); */