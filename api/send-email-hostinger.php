<?php
// Configuração de CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Responder a requisições OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Verificar se é uma requisição POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido']);
    exit();
}

// Verificar se o PHPMailer está disponível
if (!class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
    // Tentar carregar via Composer
    if (file_exists(__DIR__ . '/../vendor/autoload.php')) {
        require_once __DIR__ . '/../vendor/autoload.php';
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'PHPMailer não encontrado. Execute: composer require phpmailer/phpmailer']);
        exit();
    }
}

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

try {
    // Obter dados da requisição
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Dados inválidos');
    }
    
    // Validar campos obrigatórios
    $requiredFields = ['to', 'subject', 'html'];
    foreach ($requiredFields as $field) {
        if (empty($input[$field])) {
            throw new Exception("Campo obrigatório ausente: {$field}");
        }
    }
    
    // Configurações SMTP da Hostinger
    $smtpConfig = [
        'host' => 'smtp.hostinger.com',
        'port' => 465, // SSL
        'username' => 'contato@rotago.site',
        'password' => '933755ViTor**',
        'encryption' => PHPMailer::ENCRYPTION_SMTPS // SSL
    ];
    
    // Criar instância do PHPMailer
    $mail = new PHPMailer(true);
    
    // Configurações do servidor SMTP
    $mail->isSMTP();
    $mail->Host = $smtpConfig['host'];
    $mail->SMTPAuth = true;
    $mail->Username = $smtpConfig['username'];
    $mail->Password = $smtpConfig['password'];
    $mail->SMTPSecure = $smtpConfig['encryption'];
    $mail->Port = $smtpConfig['port'];
    
    // Configurações de charset
    $mail->CharSet = 'UTF-8';
    $mail->Encoding = 'base64';
    
    // Configurações do remetente
    $mail->setFrom($smtpConfig['username'], 'RotaGo - Sistema de Rotas');
    $mail->addReplyTo($smtpConfig['username'], 'RotaGo - Sistema de Rotas');
    
    // Destinatário
    $mail->addAddress($input['to']);
    
    // Conteúdo do e-mail
    $mail->isHTML(true);
    $mail->Subject = $input['subject'];
    $mail->Body = $input['html'];
    
    // Texto alternativo (opcional)
    if (!empty($input['text'])) {
        $mail->AltBody = $input['text'];
    }
    
    // Enviar e-mail
    $result = $mail->send();
    
    if ($result) {
        // Log de sucesso (opcional)
        error_log("[RotaGo] E-mail enviado com sucesso para: {$input['to']}");
        
        echo json_encode([
            'success' => true,
            'message' => 'E-mail enviado com sucesso',
            'timestamp' => date('Y-m-d H:i:s'),
            'to' => $input['to']
        ]);
    } else {
        throw new Exception('Falha ao enviar e-mail');
    }
    
} catch (Exception $e) {
    // Log de erro
    error_log("[RotaGo] Erro ao enviar e-mail: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>