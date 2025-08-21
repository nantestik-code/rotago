<?php
/**
 * Autoloader simples para PHPMailer
 */

spl_autoload_register(function ($class) {
    // Namespace do PHPMailer
    $prefix = "PHPMailer\\PHPMailer\\";
    
    // Verificar se a classe usa o namespace do PHPMailer
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }
    
    // Obter o nome da classe relativa
    $relative_class = substr($class, $len);
    
    // Substituir namespace separators por directory separators
    $file = __DIR__ . "/phpmailer/phpmailer/src/" . str_replace("\\", "/", $relative_class) . ".php";
    
    // Se o arquivo existir, incluí-lo
    if (file_exists($file)) {
        require $file;
    }
});
