<?php
// Teste simples de envio de email via Hostinger SMTP

// Configuração de CORS e headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Responder a requisições OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Carregar PHPMailer
if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    require_once __DIR__ . '/vendor/autoload.php';
} else {
    echo json_encode(['error' => 'PHPMailer não encontrado']);
    exit();
}

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

try {
    // Dados de teste
    $testEmail = 'vitor@rotago.site'; // Substitua pelo seu email
    $subject = 'Teste RotaGo - ' . date('d/m/Y H:i:s');
    $message = 'Este é um email de teste do sistema RotaGo enviado via SMTP da Hostinger.';
    
    // Criar instância do PHPMailer
    $mail = new PHPMailer(true);
    
    // Configurações SMTP
    $mail->isSMTP();
    $mail->Host = 'smtp.hostinger.com';
    $mail->SMTPAuth = true;
    $mail->Username = 'contato@rotago.site';
    $mail->Password = '933755ViTor**';
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    $mail->Port = 465;
    
    // Configurações de charset
    $mail->CharSet = 'UTF-8';
    $mail->Encoding = 'base64';
    
    // Debug (opcional)
    // $mail->SMTPDebug = SMTP::DEBUG_SERVER;
    
    // Remetente
    $mail->setFrom('contato@rotago.site', 'RotaGo - Teste');
    $mail->addReplyTo('contato@rotago.site', 'RotaGo');
    
    // Destinatário
    $mail->addAddress($testEmail);
    
    // Conteúdo
    $mail->isHTML(true);
    $mail->Subject = $subject;
    $mail->Body = "
    <html>
    <head>
        <meta charset='UTF-8'>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #007cba; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .footer { padding: 10px; text-align: center; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h1>🚀 RotaGo - Teste de Email</h1>
            </div>
            <div class='content'>
                <h2>Teste realizado com sucesso!</h2>
                <p><strong>Data/Hora:</strong> " . date('d/m/Y H:i:s') . "</p>
                <p><strong>Servidor:</strong> Hostinger SMTP</p>
                <p><strong>Status:</strong> ✅ Configuração funcionando</p>
                <p>" . $message . "</p>
            </div>
            <div class='footer'>
                <p>Este email foi enviado automaticamente pelo sistema RotaGo</p>
            </div>
        </div>
    </body>
    </html>
    ";
    
    $mail->AltBody = $message;
    
    // Enviar
    $result = $mail->send();
    
    if ($result) {
        echo json_encode([
            'success' => true,
            'message' => 'Email de teste enviado com sucesso!',
            'details' => [
                'to' => $testEmail,
                'subject' => $subject,
                'timestamp' => date('Y-m-d H:i:s'),
                'server' => 'smtp.hostinger.com:465'
            ]
        ]);
    } else {
        throw new Exception('Falha ao enviar email');
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'details' => [
            'timestamp' => date('Y-m-d H:i:s'),
            'server' => 'smtp.hostinger.com:465'
        ]
    ]);
}
?>