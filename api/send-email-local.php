<?php
// Configuração CORS robusta
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS, GET');
header('Access-Control-Allow-Headers: Content-Type, Authorization, Accept, Origin, X-Requested-With');
header('Access-Control-Max-Age: 86400');
header('Content-Type: application/json; charset=utf-8');

// Log de debug
error_log('[EMAIL LOCAL] Método: ' . $_SERVER['REQUEST_METHOD']);

// Responder OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    error_log('[EMAIL LOCAL] Respondendo preflight OPTIONS');
    http_response_code(200);
    echo json_encode(['status' => 'preflight_ok']);
    exit();
}

// Só aceitar POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método não permitido']);
    exit();
}

// Verificar se PHPMailer está disponível
require_once __DIR__ . '/../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

try {
    // Obter dados da requisição
    $input = json_decode(file_get_contents('php://input'), true);
    error_log('[EMAIL LOCAL] Dados recebidos: ' . json_encode($input));
    
    if (!$input) {
        throw new Exception('Dados JSON inválidos');
    }

    // Validar campos obrigatórios
    if (empty($input['to']) || empty($input['name']) || empty($input['template'])) {
        throw new Exception('Campos obrigatórios: to, name, template');
    }

    // Gerar conteúdo baseado no template
    $subject = '';
    $htmlContent = '';
    $textContent = '';

    switch ($input['template']) {
        case 'welcome':
            $subject = $input['subject'] ?? 'Bem-vindo ao RotaGo!';
            $htmlContent = '
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bem-vindo ao RotaGo</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🚗 RotaGo</h1>
        </div>
        <div style="padding: 40px 30px;">
            <h2>Olá, ' . htmlspecialchars($input['name']) . '!</h2>
            <p>Seja muito bem-vindo(a) ao <strong>RotaGo</strong>! Estamos muito felizes em tê-lo(a) conosco.</p>
            
            <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 30px 0;">
                <h3 style="color: #333; margin-top: 0;">🎯 O que você pode fazer:</h3>
                <ul style="list-style: none; padding: 0;">
                    <li style="margin-bottom: 10px;">✅ Planejar rotas otimizadas</li>
                    <li style="margin-bottom: 10px;">✅ Acompanhar entregas em tempo real</li>
                    <li style="margin-bottom: 10px;">✅ Gerenciar sua frota de veículos</li>
                    <li style="margin-bottom: 10px;">✅ Integrar com sistemas de pagamento</li>
                </ul>
            </div>
            
            <p style="text-align: center;">
                <a href="https://rotago.site" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 25px; font-weight: 600;">Começar Agora</a>
            </p>
        </div>
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666666; font-size: 14px;">
            <p>© 2024 RotaGo. Todos os direitos reservados.</p>
            <p>Este é um email automático, não responda.</p>
        </div>
    </div>
</body>
</html>';
            $textContent = 'Olá ' . $input['name'] . '! Seja bem-vindo(a) ao RotaGo! Acesse: https://rotago.site';
            break;

        case 'admin_notification':
            $subject = $input['subject'] ?? 'Notificação Administrativa - RotaGo';
            $htmlContent = '
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Notificação Administrativa</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #dc3545; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🔔 Notificação Administrativa</h1>
        </div>
        <div style="padding: 30px;">
            <p>Olá <strong>' . htmlspecialchars($input['name']) . '</strong>,</p>
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p><strong>Atenção:</strong> Esta é uma notificação administrativa importante.</p>
            </div>
            <p>Para mais informações, acesse o painel administrativo.</p>
        </div>
        <div style="background-color: #f8f9fa; padding: 15px; text-align: center; color: #666666;">
            <p>© 2024 RotaGo Admin</p>
        </div>
    </div>
</body>
</html>';
            $textContent = 'Notificação administrativa para ' . $input['name'];
            break;

        case 'password_reset':
            $subject = $input['subject'] ?? 'Redefinição de Senha - RotaGo';
            $htmlContent = '
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Redefinição de Senha</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #007bff; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🔐 Redefinição de Senha</h1>
        </div>
        <div style="padding: 30px;">
            <p>Olá <strong>' . htmlspecialchars($input['name']) . '</strong>,</p>
            <p>Recebemos uma solicitação para redefinir sua senha.</p>
            <p style="text-align: center;">
                <a href="#" style="display: inline-block; background-color: #007bff; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 4px; margin: 20px 0;">Redefinir Senha</a>
            </p>
            <p><small>Se você não solicitou esta redefinição, ignore este email.</small></p>
        </div>
        <div style="background-color: #f8f9fa; padding: 15px; text-align: center; color: #666666;">
            <p>© 2024 RotaGo</p>
        </div>
    </div>
</body>
</html>';
            $textContent = 'Redefinição de senha para ' . $input['name'] . '. Link: [URL]';
            break;

        default:
            throw new Exception('Template não suportado: ' . $input['template']);
    }

    // Configurar PHPMailer baseado na documentação da Hostinger
    $mail = new PHPMailer(true);
    
    // Configuração SMTP da Hostinger (baseada na documentação)
    $mail->isSMTP();
    $mail->SMTPDebug = 0; // Desabilitar debug em produção
    $mail->Host = 'smtp.hostinger.com';
    $mail->Port = 587; // Porta STARTTLS conforme documentação
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->SMTPAuth = true;
    $mail->Username = 'contato@rotago.site';
    $mail->Password = '933755ViTor**'; // Senha da conta de email
    
    // Configurar remetente e destinatário
    $mail->setFrom('contato@rotago.site', 'RotaGo');
    $mail->addAddress($input['to'], $input['name']);
    $mail->addReplyTo('contato@rotago.site', 'RotaGo');
    
    // Configurar conteúdo do email
    $mail->isHTML(true);
    $mail->Subject = $subject;
    $mail->Body = $htmlContent;
    $mail->AltBody = $textContent;
    $mail->CharSet = 'UTF-8';
    
    // Enviar email
    error_log('[EMAIL LOCAL] Tentando enviar email via SMTP Hostinger...');
    $result = $mail->send();
    
    if ($result) {
        error_log('[EMAIL LOCAL] Email enviado com sucesso');
        
        $response = [
            'success' => true,
            'messageId' => 'local_' . time() . '_' . rand(1000, 9999),
            'message' => 'Email enviado com sucesso',
            'provider' => 'hostinger_local',
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
        echo json_encode($response);
    } else {
        throw new Exception('Falha ao enviar email');
    }
    
} catch (Exception $e) {
    error_log('[EMAIL LOCAL] Erro: ' . $e->getMessage());
    http_response_code(500);
    
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'provider' => 'hostinger_local',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>
