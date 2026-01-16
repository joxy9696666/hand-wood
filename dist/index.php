<?php
// PHP адаптер для проксирования на Node.js приложение
$nodeAppUrl = getenv('NODE_APP_URL') ?: getenv('APP_URL') ?: 'http://localhost:3000';
$publicDir = __DIR__ . '/public';
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Статические файлы
$ext = strtolower(pathinfo($requestUri, PATHINFO_EXTENSION));
$staticExtensions = ['js', 'css', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'woff', 'woff2', 'ttf', 'eot', 'webp', 'ico'];

if (in_array($ext, $staticExtensions)) {
    $filePath = $publicDir . $requestUri;
    if (file_exists($filePath) && is_file($filePath)) {
        $mimeTypes = [
            'js' => 'application/javascript', 'css' => 'text/css',
            'jpg' => 'image/jpeg', 'png' => 'image/png', 'gif' => 'image/gif',
            'svg' => 'image/svg+xml', 'woff' => 'font/woff', 'woff2' => 'font/woff2',
            'webp' => 'image/webp', 'ico' => 'image/x-icon'
        ];
        header('Content-Type: ' . ($mimeTypes[$ext] ?? 'application/octet-stream'));
        header('Cache-Control: public, max-age=31536000');
        readfile($filePath);
        exit;
    }
}

// Проксировать на Node.js
$url = $nodeAppUrl . $requestUri;
if (!empty($_SERVER['QUERY_STRING'])) {
    $url .= '?' . $_SERVER['QUERY_STRING'];
}

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$input = file_get_contents('php://input');
if (!empty($input)) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $input);
}

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);

if (curl_errno($ch)) {
    http_response_code(502);
    die('Bad Gateway');
}
curl_close($ch);

http_response_code($httpCode);
if ($contentType) {
    header('Content-Type: ' . $contentType);
}
echo $response;
