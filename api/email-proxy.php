<?php
// Proxy local para contornar CORS - Email Hostinger
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, Accept, Origin, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

// Responder a requisições OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(['status' => 'preflight_ok']);
    exit();
}

// Verificar se é uma requisição POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido']);
    exit();
}

// Obter dados da requisição
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Dados inválidos']);
    exit();
}

// Log de debug
error_log('[EMAIL PROXY] Recebido: ' . json_encode($data));

// Fazer requisição para API da Hostinger
$hostingerUrl = 'https://rotago.site/api/send-email-hostinger.php';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $hostingerUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json',
    'User-Agent: RotaGo-EmailProxy/1.0'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    error_log('[EMAIL PROXY] Erro cURL: ' . $error);
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro de conexão: ' . $error
    ]);
    exit();
}

if ($httpCode !== 200) {
    error_log('[EMAIL PROXY] HTTP ' . $httpCode . ': ' . $response);
    http_response_code($httpCode);
    echo json_encode([
        'success' => false,
        'error' => 'Erro HTTP: ' . $httpCode,
        'response' => $response
    ]);
    exit();
}

// Retornar resposta da API
error_log('[EMAIL PROXY] Sucesso: ' . $response);
echo $response;
?>
