<?php
/**
 * Script para baixar e instalar PHPMailer manualmente
 * Execute este arquivo via navegador ou linha de comando PHP
 */

echo "<h2>Instalador PHPMailer para RotaGo</h2>\n";
echo "<p>Iniciando download do PHPMailer...</p>\n";

// Criar diretório vendor se não existir
if (!is_dir('vendor')) {
    mkdir('vendor', 0755, true);
    echo "<p>✅ Diretório vendor criado</p>\n";
}

if (!is_dir('vendor/phpmailer')) {
    mkdir('vendor/phpmailer', 0755, true);
    echo "<p>✅ Diretório phpmailer criado</p>\n";
}

if (!is_dir('vendor/phpmailer/phpmailer')) {
    mkdir('vendor/phpmailer/phpmailer', 0755, true);
    echo "<p>✅ Diretório phpmailer/phpmailer criado</p>\n";
}

if (!is_dir('vendor/phpmailer/phpmailer/src')) {
    mkdir('vendor/phpmailer/phpmailer/src', 0755, true);
    echo "<p>✅ Diretório src criado</p>\n";
}

// URLs dos arquivos principais do PHPMailer
$files = [
    'src/PHPMailer.php' => 'https://raw.githubusercontent.com/PHPMailer/PHPMailer/master/src/PHPMailer.php',
    'src/SMTP.php' => 'https://raw.githubusercontent.com/PHPMailer/PHPMailer/master/src/SMTP.php',
    'src/Exception.php' => 'https://raw.githubusercontent.com/PHPMailer/PHPMailer/master/src/Exception.php',
    'src/POP3.php' => 'https://raw.githubusercontent.com/PHPMailer/PHPMailer/master/src/POP3.php',
    'src/OAuth.php' => 'https://raw.githubusercontent.com/PHPMailer/PHPMailer/master/src/OAuth.php'
];

$success = 0;
$total = count($files);

foreach ($files as $localPath => $url) {
    $fullPath = 'vendor/phpmailer/phpmailer/' . $localPath;
    
    echo "<p>Baixando {$localPath}...</p>\n";
    
    $content = @file_get_contents($url);
    
    if ($content !== false) {
        if (file_put_contents($fullPath, $content)) {
            echo "<p>✅ {$localPath} baixado com sucesso</p>\n";
            $success++;
        } else {
            echo "<p>❌ Erro ao salvar {$localPath}</p>\n";
        }
    } else {
        echo "<p>❌ Erro ao baixar {$localPath}</p>\n";
    }
    
    // Flush output para mostrar progresso
    if (ob_get_level()) {
        ob_flush();
    }
    flush();
}

// Criar autoloader simples
$autoloaderContent = '<?php
/**
 * Autoloader simples para PHPMailer
 */

spl_autoload_register(function ($class) {
    // Namespace do PHPMailer
    $prefix = "PHPMailer\\\\PHPMailer\\\\";
    
    // Verificar se a classe usa o namespace do PHPMailer
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }
    
    // Obter o nome da classe relativa
    $relative_class = substr($class, $len);
    
    // Substituir namespace separators por directory separators
    $file = __DIR__ . "/phpmailer/phpmailer/src/" . str_replace("\\\\", "/", $relative_class) . ".php";
    
    // Se o arquivo existir, incluí-lo
    if (file_exists($file)) {
        require $file;
    }
});
';

file_put_contents('vendor/autoload.php', $autoloaderContent);
echo "<p>✅ Autoloader criado</p>\n";

echo "<hr>\n";
echo "<h3>Resultado da Instalação:</h3>\n";
echo "<p><strong>{$success}/{$total}</strong> arquivos baixados com sucesso</p>\n";

if ($success === $total) {
    echo "<p style='color: green;'><strong>🎉 PHPMailer instalado com sucesso!</strong></p>\n";
    echo "<p>Agora você pode usar o sistema de emails com Hostinger SMTP.</p>\n";
    
    // Teste rápido
    echo "<h4>Teste de Carregamento:</h4>\n";
    try {
        require_once 'vendor/autoload.php';
        
        if (class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
            echo "<p style='color: green;'>✅ PHPMailer carregado corretamente</p>\n";
        } else {
            echo "<p style='color: red;'>❌ Erro ao carregar PHPMailer</p>\n";
        }
        
        if (class_exists('PHPMailer\\PHPMailer\\SMTP')) {
            echo "<p style='color: green;'>✅ SMTP carregado corretamente</p>\n";
        } else {
            echo "<p style='color: red;'>❌ Erro ao carregar SMTP</p>\n";
        }
        
    } catch (Exception $e) {
        echo "<p style='color: red;'>❌ Erro no teste: " . $e->getMessage() . "</p>\n";
    }
    
} else {
    echo "<p style='color: red;'><strong>❌ Instalação incompleta</strong></p>\n";
    echo "<p>Alguns arquivos não puderam ser baixados. Verifique sua conexão com a internet.</p>\n";
}

echo "<hr>\n";
echo "<p><em>Instalação concluída em " . date('d/m/Y H:i:s') . "</em></p>\n";
?>