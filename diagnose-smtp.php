<?php
// Diagnóstico completo do SMTP da Hostinger

header('Content-Type: text/html; charset=UTF-8');

echo "<h1>🔍 Diagnóstico SMTP - Hostinger</h1>";
echo "<style>body{font-family:Arial;margin:20px;} .success{color:green;} .error{color:red;} .info{color:blue;} pre{background:#f5f5f5;padding:10px;border-radius:5px;}</style>";

// 1. Verificar PHPMailer
echo "<h2>1. Verificação do PHPMailer</h2>";
if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    require_once __DIR__ . '/vendor/autoload.php';
    echo "<p class='success'>✅ PHPMailer encontrado</p>";
    
    if (class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
        echo "<p class='success'>✅ Classe PHPMailer carregada</p>";
    } else {
        echo "<p class='error'>❌ Classe PHPMailer não encontrada</p>";
    }
} else {
    echo "<p class='error'>❌ PHPMailer não encontrado</p>";
    exit();
}

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

// 2. Verificar extensões PHP
echo "<h2>2. Extensões PHP Necessárias</h2>";
$extensions = ['openssl', 'sockets', 'curl'];
foreach ($extensions as $ext) {
    if (extension_loaded($ext)) {
        echo "<p class='success'>✅ {$ext}</p>";
    } else {
        echo "<p class='error'>❌ {$ext} - NECESSÁRIA</p>";
    }
}

// 3. Teste de conectividade
echo "<h2>3. Teste de Conectividade SMTP</h2>";
$host = 'smtp.hostinger.com';
$port = 465;

echo "<p class='info'>Testando conexão com {$host}:{$port}...</p>";

$context = stream_context_create([
    'ssl' => [
        'verify_peer' => false,
        'verify_peer_name' => false,
        'allow_self_signed' => true
    ]
]);

$socket = @stream_socket_client("ssl://{$host}:{$port}", $errno, $errstr, 10, STREAM_CLIENT_CONNECT, $context);

if ($socket) {
    echo "<p class='success'>✅ Conexão SSL estabelecida com sucesso</p>";
    fclose($socket);
} else {
    echo "<p class='error'>❌ Falha na conexão: {$errstr} ({$errno})</p>";
}

// 4. Teste de autenticação SMTP
echo "<h2>4. Teste de Autenticação SMTP</h2>";

try {
    $mail = new PHPMailer(true);
    
    // Configurações SMTP
    $mail->isSMTP();
    $mail->Host = 'smtp.hostinger.com';
    $mail->SMTPAuth = true;
    $mail->Username = 'contato@rotago.site';
    $mail->Password = '933755ViTor**';
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    $mail->Port = 465;
    
    // Ativar debug
    $mail->SMTPDebug = SMTP::DEBUG_CONNECTION;
    $mail->Debugoutput = function($str, $level) {
        echo "<pre class='info'>DEBUG: {$str}</pre>";
    };
    
    // Configurações básicas
    $mail->setFrom('contato@rotago.site', 'RotaGo Teste');
    $mail->addAddress('contato@rotago.site'); // Enviar para si mesmo
    $mail->Subject = 'Teste de Diagnóstico - ' . date('H:i:s');
    $mail->Body = 'Este é um teste de diagnóstico do SMTP.';
    
    echo "<p class='info'>Tentando enviar email de teste...</p>";
    
    if ($mail->send()) {
        echo "<p class='success'>✅ Email enviado com sucesso!</p>";
        echo "<p class='info'>Verifique a caixa de entrada de contato@rotago.site</p>";
    } else {
        echo "<p class='error'>❌ Falha ao enviar email</p>";
    }
    
} catch (Exception $e) {
    echo "<p class='error'>❌ Erro: {$e->getMessage()}</p>";
}

// 5. Informações do sistema
echo "<h2>5. Informações do Sistema</h2>";
echo "<p><strong>PHP Version:</strong> " . phpversion() . "</p>";
echo "<p><strong>Sistema:</strong> " . php_uname() . "</p>";
echo "<p><strong>Data/Hora:</strong> " . date('d/m/Y H:i:s') . "</p>";

// 6. Configurações relevantes
echo "<h2>6. Configurações PHP Relevantes</h2>";
$configs = [
    'allow_url_fopen' => ini_get('allow_url_fopen') ? 'Habilitado' : 'Desabilitado',
    'openssl.cafile' => ini_get('openssl.cafile') ?: 'Não definido',
    'user_agent' => ini_get('user_agent') ?: 'Padrão',
    'auto_detect_line_endings' => ini_get('auto_detect_line_endings') ? 'Habilitado' : 'Desabilitado'
];

foreach ($configs as $key => $value) {
    echo "<p><strong>{$key}:</strong> {$value}</p>";
}

echo "<hr>";
echo "<p><em>Diagnóstico concluído em " . date('d/m/Y H:i:s') . "</em></p>";
?>