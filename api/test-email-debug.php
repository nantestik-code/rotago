<?php
// Script de debug para testar a API de email
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "=== DEBUG API EMAIL ===\n";

// Verificar se PHPMailer existe
echo "1. Verificando PHPMailer...\n";
$autoloadPath = __DIR__ . '/../vendor/autoload.php';
echo "Caminho autoload: $autoloadPath\n";

if (file_exists($autoloadPath)) {
    echo "✅ Autoload encontrado\n";
    require_once $autoloadPath;
    
    if (class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
        echo "✅ PHPMailer carregado\n";
    } else {
        echo "❌ PHPMailer não encontrado\n";
    }
} else {
    echo "❌ Autoload não encontrado\n";
}

// Testar dados JSON
echo "\n2. Testando dados JSON...\n";
$testData = json_encode([
    'to' => 'test@example.com',
    'name' => 'Test User',
    'template' => 'welcome'
]);
echo "JSON test: $testData\n";

$decoded = json_decode($testData, true);
if ($decoded) {
    echo "✅ JSON decode funcionando\n";
} else {
    echo "❌ Erro no JSON decode\n";
}

// Testar conexão SMTP (sem enviar)
echo "\n3. Testando configuração SMTP...\n";
try {
    if (class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = 'smtp.hostinger.com';
        $mail->Port = 587;
        $mail->SMTPAuth = true;
        $mail->Username = 'contato@rotago.site';
        $mail->Password = '933755ViTor**';
        $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
        
        echo "✅ Configuração SMTP criada\n";
    }
} catch (Exception $e) {
    echo "❌ Erro na configuração SMTP: " . $e->getMessage() . "\n";
}

echo "\n=== FIM DEBUG ===\n";
?>
