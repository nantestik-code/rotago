<?php
// API simplificada para debug do erro 500
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Headers CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS, GET');
header('Access-Control-Allow-Headers: Content-Type, Authorization, Accept, Origin, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

// Log inicial
error_log('[EMAIL SIMPLE] Iniciando API - Método: ' . $_SERVER['REQUEST_METHOD']);

// Responder OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    error_log('[EMAIL SIMPLE] Respondendo OPTIONS');
    http_response_code(200);
    echo json_encode(['status' => 'preflight_ok']);
    exit();
}

// Aceitar GET para teste básico
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    error_log('[EMAIL SIMPLE] Teste GET');
    http_response_code(200);
    echo json_encode([
        'success' => true, 
        'message' => 'API funcionando - use POST para enviar email',
        'method' => 'GET',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit();
}

// Só aceitar POST para envio
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    error_log('[EMAIL SIMPLE] Método não permitido: ' . $_SERVER['REQUEST_METHOD']);
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método não permitido']);
    exit();
}

try {
    error_log('[EMAIL SIMPLE] Processando POST');
    
    // Testar leitura do input
    $rawInput = file_get_contents('php://input');
    error_log('[EMAIL SIMPLE] Raw input: ' . $rawInput);
    
    if (empty($rawInput)) {
        throw new Exception('Nenhum dado recebido');
    }
    
    // Testar JSON decode
    $input = json_decode($rawInput, true);
    error_log('[EMAIL SIMPLE] Decoded input: ' . print_r($input, true));
    
    if (!$input) {
        throw new Exception('JSON inválido: ' . json_last_error_msg());
    }
    
    // Validar campos
    if (empty($input['to'])) {
        throw new Exception('Campo "to" obrigatório');
    }
    
    if (empty($input['name'])) {
        throw new Exception('Campo "name" obrigatório');
    }
    
    if (empty($input['template'])) {
        throw new Exception('Campo "template" obrigatório');
    }
    
    error_log('[EMAIL SIMPLE] Validação OK');
    
    // Testar autoload
    $autoloadPath = __DIR__ . '/../vendor/autoload.php';
    if (!file_exists($autoloadPath)) {
        throw new Exception('Autoload não encontrado: ' . $autoloadPath);
    }
    
    require_once $autoloadPath;
    error_log('[EMAIL SIMPLE] Autoload carregado');
    
    // Testar PHPMailer
    if (!class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
        throw new Exception('PHPMailer não encontrado');
    }
    
    error_log('[EMAIL SIMPLE] PHPMailer disponível');
    
    // Retornar sucesso de teste (sem enviar email real)
    $response = [
        'success' => true,
        'message' => 'API funcionando - teste sem envio real',
        'data' => [
            'to' => $input['to'],
            'name' => $input['name'],
            'template' => $input['template']
        ],
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    error_log('[EMAIL SIMPLE] Retornando sucesso: ' . json_encode($response));
    
    http_response_code(200);
    echo json_encode($response);
    
} catch (Exception $e) {
    error_log('[EMAIL SIMPLE] ERRO: ' . $e->getMessage());
    error_log('[EMAIL SIMPLE] Stack trace: ' . $e->getTraceAsString());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>
