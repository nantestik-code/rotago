<?php
// Teste simples para verificar o envio de email via Hostinger SMTP
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método não permitido']);
    exit;
}

// Verificar se PHPMailer está disponível
if (!file_exists('vendor/autoload.php')) {
    echo json_encode([
        'success' => false, 
        'error' => 'PHPMailer não encontrado. Execute: composer require phpmailer/phpmailer'
    ]);
    exit;
}

require_once 'vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Dados JSON inválidos');
    }
    
    $to = $input['to'] ?? '';
    $name = $input['name'] ?? '';
    $subject = $input['subject'] ?? 'Teste de Email - RotaGo';
    
    if (empty($to) || empty($name)) {
        throw new Exception('Email e nome são obrigatórios');
    }
    
    $mail = new PHPMailer(true);
    
    // Configurações do servidor SMTP da Hostinger
    $mail->isSMTP();
    $mail->Host = 'smtp.hostinger.com';
    $mail->SMTPAuth = true;
    $mail->Username = 'contato@rotago.site';
    $mail->Password = '933755ViTor**';
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    $mail->Port = 465;
    $mail->CharSet = 'UTF-8';
    
    // Configurações do email
    $mail->setFrom('contato@rotago.site', 'RotaGo - Sistema de Rotas');
    $mail->addAddress($to, $name);
    $mail->addReplyTo('contato@rotago.site', 'RotaGo Suporte');
    
    $mail->isHTML(true);
    $mail->Subject = $subject;
    
    // Template HTML simples para teste
    $htmlBody = "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>Teste de Email - RotaGo</title>
    </head>
    <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
        <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;'>
            <h1 style='color: white; margin: 0; font-size: 28px;'>🚚 RotaGo</h1>
            <p style='color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;'>Sistema de Gestão de Rotas e Entregas</p>
        </div>
        
        <div style='background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;'>
            <h2 style='color: #333; margin-top: 0;'>Olá, {$name}! 👋</h2>
            
            <p>Este é um <strong>email de teste</strong> enviado via <strong>Hostinger SMTP</strong> para verificar a configuração do sistema de emails do RotaGo.</p>
            
            <div style='background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;'>
                <h3 style='color: #495057; margin-top: 0;'>📋 Informações do Teste:</h3>
                <ul style='color: #6c757d; margin: 0;'>
                    <li><strong>Servidor:</strong> smtp.hostinger.com</li>
                    <li><strong>Porta:</strong> 465 (SSL)</li>
                    <li><strong>Data/Hora:</strong> " . date('d/m/Y H:i:s') . "</li>
                    <li><strong>Destinatário:</strong> {$to}</li>
                </ul>
            </div>
            
            <p>Se você recebeu este email, significa que a configuração SMTP está funcionando corretamente! ✅</p>
            
            <div style='text-align: center; margin: 30px 0;'>
                <a href='https://rotago.site' style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;'>Acessar RotaGo</a>
            </div>
            
            <hr style='border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;'>
            
            <p style='color: #6c757d; font-size: 14px; text-align: center; margin: 0;'>
                Este é um email automático de teste. Não é necessário responder.<br>
                <strong>RotaGo</strong> - Otimizando suas rotas e entregas
            </p>
        </div>
    </body>
    </html>
    ";
    
    $mail->Body = $htmlBody;
    $mail->AltBody = "Olá, {$name}! Este é um email de teste do RotaGo enviado via Hostinger SMTP em " . date('d/m/Y H:i:s') . ". Se você recebeu este email, a configuração está funcionando corretamente!";
    
    $mail->send();
    
    echo json_encode([
        'success' => true,
        'message' => 'Email de teste enviado com sucesso via Hostinger SMTP!',
        'messageId' => 'hostinger_' . time(),
        'provider' => 'hostinger',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro ao enviar email: ' . $e->getMessage(),
        'provider' => 'hostinger'
    ]);
}
?>