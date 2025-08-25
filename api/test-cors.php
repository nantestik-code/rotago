<?php
// Teste simples de CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS, GET');
header('Access-Control-Allow-Headers: Content-Type, Authorization, Accept, Origin, X-Requested-With');
header('Content-Type: application/json');

// Log de debug
error_log('[CORS TEST] Método: ' . $_SERVER['REQUEST_METHOD'] . ' | Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? 'N/A'));

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    error_log('[CORS TEST] Preflight OPTIONS recebido');
    http_response_code(200);
    echo json_encode(['status' => 'cors_ok', 'method' => 'OPTIONS']);
    exit();
}

echo json_encode([
    'status' => 'success',
    'message' => 'CORS configurado corretamente',
    'method' => $_SERVER['REQUEST_METHOD'],
    'headers_sent' => headers_list()
]);
?>
