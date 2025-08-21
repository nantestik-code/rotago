import React from 'react';

// Template de Boas-vindas
export const WelcomeEmailTemplate = ({
  userName,
  userEmail,
  loginUrl = 'https://rotago.com.br/login'
}: {
  userName: string;
  userEmail: string;
  loginUrl?: string;
}) => {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bem-vindo ao RotaGo!</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8fafc;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        
        .logo {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 10px;
            letter-spacing: -1px;
        }
        
        .header-subtitle {
            font-size: 16px;
            opacity: 0.9;
            margin-bottom: 0;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .welcome-title {
            font-size: 28px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .welcome-text {
            font-size: 16px;
            color: #64748b;
            margin-bottom: 30px;
            text-align: center;
            line-height: 1.7;
        }
        
        .features {
            background-color: #f8fafc;
            border-radius: 12px;
            padding: 30px;
            margin: 30px 0;
        }
        
        .features-title {
            font-size: 20px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .feature-list {
            list-style: none;
            padding: 0;
        }
        
        .feature-item {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
            font-size: 15px;
            color: #475569;
        }
        
        .feature-icon {
            width: 20px;
            height: 20px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            border-radius: 50%;
            margin-right: 15px;
            flex-shrink: 0;
            position: relative;
        }
        
        .feature-icon::after {
            content: '✓';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 12px;
            font-weight: bold;
        }
        
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: bold;
            font-size: 16px;
            text-align: center;
            margin: 30px auto;
            display: block;
            max-width: 250px;
            transition: transform 0.2s ease;
        }
        
        .cta-button:hover {
            transform: translateY(-2px);
        }
        
        .footer {
            background-color: #f1f5f9;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        
        .footer-text {
            font-size: 14px;
            color: #64748b;
            margin-bottom: 15px;
        }
        
        .social-links {
            margin: 20px 0;
        }
        
        .social-link {
            display: inline-block;
            margin: 0 10px;
            color: #64748b;
            text-decoration: none;
            font-size: 14px;
        }
        
        .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent 0%, #e2e8f0 50%, transparent 100%);
            margin: 30px 0;
        }
        
        @media (max-width: 600px) {
            .container {
                margin: 10px;
                border-radius: 8px;
            }
            
            .header {
                padding: 30px 20px;
            }
            
            .content {
                padding: 30px 20px;
            }
            
            .features {
                padding: 20px;
            }
            
            .welcome-title {
                font-size: 24px;
            }
            
            .cta-button {
                padding: 14px 28px;
                font-size: 15px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">RotaGo</div>
            <p class="header-subtitle">Otimização Inteligente de Rotas</p>
        </div>
        
        <div class="content">
            <h1 class="welcome-title">Bem-vindo, ${userName}! 🎉</h1>
            
            <p class="welcome-text">
                Estamos muito felizes em tê-lo conosco! Sua conta foi criada com sucesso e você já pode começar a otimizar suas rotas de entrega de forma inteligente.
            </p>
            
            <div class="features">
                <h2 class="features-title">O que você pode fazer agora:</h2>
                <ul class="feature-list">
                    <li class="feature-item">
                        <div class="feature-icon"></div>
                        <span>Importar suas entregas via planilha Excel/CSV</span>
                    </li>
                    <li class="feature-item">
                        <div class="feature-icon"></div>
                        <span>Otimizar rotas automaticamente com IA</span>
                    </li>
                    <li class="feature-item">
                        <div class="feature-icon"></div>
                        <span>Acompanhar entregas em tempo real</span>
                    </li>
                    <li class="feature-item">
                        <div class="feature-icon"></div>
                        <span>Gerar relatórios detalhados de performance</span>
                    </li>
                    <li class="feature-item">
                        <div class="feature-icon"></div>
                        <span>Sincronizar dados offline</span>
                    </li>
                </ul>
            </div>
            
            <a href="${loginUrl}" class="cta-button">
                Começar Agora
            </a>
            
            <div class="divider"></div>
            
            <p style="text-align: center; color: #64748b; font-size: 14px; margin-bottom: 0;">
                <strong>Dica:</strong> Baixe nosso app PWA para usar offline e receber notificações em tempo real!
            </p>
        </div>
        
        <div class="footer">
            <p class="footer-text">
                Este email foi enviado para <strong>${userEmail}</strong><br>
                Se você não se cadastrou no RotaGo, pode ignorar este email.
            </p>
            
            <div class="social-links">
                <a href="#" class="social-link">Suporte</a>
                <a href="#" class="social-link">Política de Privacidade</a>
                <a href="#" class="social-link">Termos de Uso</a>
            </div>
            
            <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                © 2024 RotaGo. Todos os direitos reservados.
            </p>
        </div>
    </div>
</body>
</html>
  `;
};

// Template de Notificação para Administradores
export const AdminNotificationTemplate = ({
  userName,
  userEmail,
  userCpf,
  registrationDate,
  subscriptionPlan = 'trial',
  adminPanelUrl = 'https://rotago.com.br/admin'
}: {
  userName: string;
  userEmail: string;
  userCpf?: string;
  registrationDate: string;
  subscriptionPlan?: string;
  adminPanelUrl?: string;
}) => {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Novo Usuário Cadastrado - RotaGo</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8fafc;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            padding: 30px;
            text-align: center;
            color: white;
        }
        
        .logo {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 8px;
        }
        
        .header-subtitle {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .content {
            padding: 30px;
        }
        
        .notification-title {
            font-size: 24px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .user-info {
            background-color: #f8fafc;
            border-radius: 8px;
            padding: 25px;
            margin: 25px 0;
            border-left: 4px solid #3b82f6;
        }
        
        .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            font-size: 15px;
        }
        
        .info-row:last-child {
            margin-bottom: 0;
        }
        
        .info-label {
            font-weight: 600;
            color: #475569;
            min-width: 120px;
        }
        
        .info-value {
            color: #1e293b;
            font-weight: 500;
        }
        
        .plan-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .plan-trial {
            background-color: #fef3c7;
            color: #92400e;
        }
        
        .plan-premium {
            background-color: #ddd6fe;
            color: #5b21b6;
        }
        
        .plan-basic {
            background-color: #dbeafe;
            color: #1d4ed8;
        }
        
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 8px;
            font-weight: bold;
            font-size: 15px;
            text-align: center;
            margin: 25px auto;
            display: block;
            max-width: 200px;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 25px 0;
        }
        
        .stat-card {
            background-color: #f1f5f9;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        
        .stat-number {
            font-size: 24px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 5px;
        }
        
        .stat-label {
            font-size: 12px;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 600;
        }
        
        .footer {
            background-color: #f1f5f9;
            padding: 25px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            font-size: 13px;
            color: #64748b;
        }
        
        @media (max-width: 600px) {
            .container {
                margin: 10px;
                border-radius: 8px;
            }
            
            .content {
                padding: 20px;
            }
            
            .info-row {
                flex-direction: column;
                align-items: flex-start;
                gap: 5px;
            }
            
            .stats {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">RotaGo Admin</div>
            <p class="header-subtitle">Notificação de Novo Cadastro</p>
        </div>
        
        <div class="content">
            <h1 class="notification-title">🎉 Novo Usuário Cadastrado!</h1>
            
            <p style="text-align: center; color: #64748b; margin-bottom: 25px;">
                Um novo usuário se cadastrou na plataforma RotaGo.
            </p>
            
            <div class="user-info">
                <div class="info-row">
                    <span class="info-label">Nome:</span>
                    <span class="info-value">${userName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Email:</span>
                    <span class="info-value">${userEmail}</span>
                </div>
                ${userCpf ? `
                <div class="info-row">
                    <span class="info-label">CPF:</span>
                    <span class="info-value">${userCpf}</span>
                </div>
                ` : ''}
                <div class="info-row">
                    <span class="info-label">Data:</span>
                    <span class="info-value">${new Date(registrationDate).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Plano:</span>
                    <span class="info-value">
                        <span class="plan-badge plan-${subscriptionPlan}">
                            ${subscriptionPlan === 'trial' ? 'Teste Grátis' :
                              subscriptionPlan === 'premium' ? 'Premium' : 'Básico'}
                        </span>
                    </span>
                </div>
            </div>
            
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-number">7</div>
                    <div class="stat-label">Dias de Teste</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">∞</div>
                    <div class="stat-label">Entregas</div>
                </div>
            </div>
            
            <a href="${adminPanelUrl}" class="cta-button">
                Ver no Painel
            </a>
            
            <p style="text-align: center; color: #64748b; font-size: 14px; margin-top: 25px;">
                <strong>Ação recomendada:</strong> Acompanhe o onboarding do usuário e ofereça suporte se necessário.
            </p>
        </div>
        
        <div class="footer">
            <p>
                Esta é uma notificação automática do sistema RotaGo.<br>
                Para alterar suas preferências de notificação, acesse o painel administrativo.
            </p>
        </div>
    </div>
</body>
</html>
  `;
};

// Função para gerar preview dos templates
export const generateEmailPreview = (templateType: string, data: any) => {
  switch (templateType) {
    case 'welcome':
      return WelcomeEmailTemplate({
        userName: data.userName || 'João Silva',
        userEmail: data.userEmail || 'joao@exemplo.com',
        loginUrl: data.loginUrl
      });
    case 'admin_notification':
      return AdminNotificationTemplate({
        userName: data.userName || 'Maria Santos',
        userEmail: data.userEmail || 'maria@exemplo.com',
        userCpf: data.userCpf || '123.456.789-00',
        registrationDate: data.registrationDate || new Date().toISOString(),
        subscriptionPlan: data.subscriptionPlan || 'trial',
        adminPanelUrl: data.adminPanelUrl
      });
    default:
      return '<p>Template não encontrado</p>';
  }
};

// Configurações dos templates
export const EMAIL_TEMPLATES = {
  welcome: {
    name: 'Boas-vindas',
    description: 'Email enviado para novos usuários',
    subject: 'Bem-vindo ao RotaGo! 🚀',
    variables: ['userName', 'userEmail', 'loginUrl']
  },
  admin_notification: {
    name: 'Notificação Admin',
    description: 'Notifica equipe sobre novos cadastros',
    subject: 'Novo usuário cadastrado - {{userName}}',
    variables: ['userName', 'userEmail', 'userCpf', 'registrationDate', 'subscriptionPlan', 'adminPanelUrl']
  }
};

// Componente para visualização de templates
export const EmailTemplates: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Templates de Email</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Template de Boas-vindas</h3>
            <div className="border rounded p-4 bg-gray-50">
              <iframe
                srcDoc={generateEmailPreview('welcome', {
                  userName: 'João Silva',
                  userEmail: 'joao@exemplo.com'
                })}
                className="w-full h-96 border-0"
                title="Preview do template de boas-vindas"
              />
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">Template de Notificação Admin</h3>
            <div className="border rounded p-4 bg-gray-50">
              <iframe
                srcDoc={generateEmailPreview('admin_notification', {
                  userName: 'Maria Santos',
                  userEmail: 'maria@exemplo.com',
                  userCpf: '123.456.789-00',
                  registrationDate: new Date().toISOString()
                })}
                className="w-full h-96 border-0"
                title="Preview do template de notificação admin"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};