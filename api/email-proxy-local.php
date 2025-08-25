<?php
// Proxy local para envio real de email via SMTP Hostinger
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, Accept, Origin, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

// Log de debug
error_log('[EMAIL PROXY] Método: ' . $_SERVER['REQUEST_METHOD']);

// Responder OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    error_log('[EMAIL PROXY] Respondendo preflight OPTIONS');
    http_response_code(200);
    exit();
}

// Só aceitar POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método não permitido']);
    exit();
}

try {
    // Obter dados da requisição local
    $input = json_decode(file_get_contents('php://input'), true);
    error_log('[EMAIL PROXY] Dados recebidos: ' . json_encode($input));
    
    if (!$input) {
        throw new Exception('Dados JSON inválidos');
    }
    
    // Fazer requisição para API da Hostinger
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://rotago.site/api/send-email-hostinger.php');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($input));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'User-Agent: RotaGo-LocalProxy/1.0'
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    error_log('[EMAIL PROXY] HTTP Code: ' . $httpCode);
    error_log('[EMAIL PROXY] Response: ' . $response);
    
    if ($error) {
        throw new Exception("Erro cURL: $error");
    }
    
    if ($httpCode !== 200) {
        throw new Exception("HTTP $httpCode: Erro na API remota - $response");
    }
    
    // Verificar se resposta é JSON válido
    $jsonResponse = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("Resposta não é JSON válido: $response");
    }
    
    // Retornar resposta da API
    echo $response;
    
} catch (Exception $e) {
    error_log('[EMAIL PROXY] Erro: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'proxy' => true,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>
