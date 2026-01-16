<?php
declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// JSON-ответ
header('Content-Type: application/json; charset=UTF-8');

// --- CORS (разрешаем с указанных доменов) ---
if (isset($_SERVER['HTTP_ORIGIN'])) {
    $origin = $_SERVER['HTTP_ORIGIN'];
    $allowedOrigins = array_filter(explode(',', $_ENV['CORS_ALLOWED'] ?? ''));
    
    // Добавляем текущий домен если нет настроенных
    if (empty($allowedOrigins)) {
        $allowedOrigins[] = $_SERVER['HTTP_HOST'] ?? '';
    }
    
    // Проверяем origin
    $parsed = parse_url($origin);
    $originHost = $parsed['host'] ?? '';
    
    if (in_array($originHost, $allowedOrigins)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Credentials: true');
    }
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'OK']);
    exit;
}

// --- Проверяем метод ---
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// --- Composer autoload и загрузка .env ---
$autoload = __DIR__ . '/vendor/autoload.php';
if (!file_exists($autoload)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Dependencies not installed.']);
    exit;
}
require_once $autoload;

use Dotenv\Dotenv;

// Загружаем переменные из .env
if (class_exists(Dotenv::class)) {
    $dotenv = Dotenv::createImmutable(__DIR__);
    $dotenv->load();
}

require_once $autoload;

// --- Загружаем .env (если есть) ---
if (class_exists(\Dotenv\Dotenv::class)) {
    try {
        $dotenv = \Dotenv\Dotenv::createImmutable(__DIR__);
        $dotenv->safeLoad();
    } catch (\Throwable $e) {
        error_log('Dotenv load failed: ' . $e->getMessage());
    }
}

// --- Конфигурация SMTP ---
$smtpHost = $_ENV['SMTP_HOST'] ?? 'smtp.hostinger.com';
$smtpUser = $_ENV['SMTP_USER'] ?? 'support@handwood-md.com';
$smtpPass = $_ENV['SMTP_PASS'] ?? '';
$smtpPort = (int)($_ENV['SMTP_PORT'] ?? 465);
$smtpSecure = $_ENV['SMTP_SECURE'] ?? 'ssl';
$mailFrom = $_ENV['MAIL_FROM'] ?? $smtpUser;
$mailFromName = $_ENV['MAIL_FROM_NAME'] ?? 'HandWood';


// Без пароля не отправляем
if ($smtpPass === '') {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'SMTP credentials not configured.']);
    exit;
}

// --- Читаем данные из запроса ---
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
if (strpos($contentType, 'application/json') !== false) {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true) ?? [];
} else {
    // Обработка FormData или обычной формы
    $data = $_POST;
}

// Добавляем данные из $_FILES если есть
if (!empty($_FILES)) {
    $data['files'] = $_FILES;
}

// Логируем тип запроса и данные для отладки
error_log('Request Content-Type: ' . $contentType);
error_log('Request data: ' . print_r($data, true));

// --- Очистка и валидация ---
function clean_text(string $s): string {
    $s = trim($s);
    $s = str_replace(["\r", "\n"], ' ', $s);
    return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
function validate_email(string $email): string {
    return filter_var(trim($email), FILTER_VALIDATE_EMAIL) ?: '';
}

$name = clean_text($data['name'] ?? '');
$phone = clean_text($data['phone'] ?? '');
$email = validate_email($data['email'] ?? '');
$message = clean_text($data['message'] ?? '');
$productTitle = clean_text($data['productTitle'] ?? $data['product'] ?? '');
$honeypot = clean_text($data['website'] ?? '');
// timestamp may come from JS in milliseconds; convert to seconds
$timestamp = isset($data['timestamp']) ? ((float)$data['timestamp'] / 1000) : 0;

// --- Антиспам ---
if ($honeypot !== '' || ($timestamp && (time() - (int)$timestamp < 3))) {
    error_log('Spam check failed: honeypot=' . $honeypot . ', timestamp_diff=' . (time() - (int)$timestamp));
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Ошибка. Попробуйте позже.']);
    exit;
}

// --- Проверка полей ---
if (strlen($name) < 2 || strlen($name) > 100) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Имя должно быть от 2 до 100 символов.']);
    exit;
}
if ($phone === '' && $email === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Укажите телефон или email для связи.']);
    exit;
}

// --- Ограничение по IP 
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$cache_file = sys_get_temp_dir() . '/order_limit_' . md5($ip) . '.txt';
$hour_requests = 0;
if (file_exists($cache_file)) {
    [$ts, $cnt] = explode('|', file_get_contents($cache_file)) + [0, 0];
    if (time() - (int)$ts < 3600) $hour_requests = (int)$cnt;
}
if ($hour_requests >= 5) {
    http_response_code(429);
    echo json_encode(['success' => false, 'message' => 'Слишком много запросов. Попробуйте позже.']);
    exit;
}

// --- Формируем письмо ---
$bodyHtml = '<html><body style="font-family:Arial,sans-serif;color:#111">';
$bodyHtml .= '<h2>Новая заявка с сайта HandWood</h2><table cellpadding="6">';
$bodyHtml .= "<tr><td><b>Товар:</b></td><td>{$productTitle}</td></tr>";
$bodyHtml .= "<tr><td><b>Имя:</b></td><td>{$name}</td></tr>";
if ($phone) $bodyHtml .= "<tr><td><b>Телефон:</b></td><td>{$phone}</td></tr>";
if ($email) $bodyHtml .= "<tr><td><b>Email:</b></td><td>{$email}</td></tr>";
if ($message) $bodyHtml .= "<tr><td valign='top'><b>Сообщение:</b></td><td>" . nl2br($message) . "</td></tr>";
$bodyHtml .= '</table><hr><small>IP: ' . $ip . '</small></body></html>';

// --- Отправляем через SMTP ---
// --- Отправка через PHPMailer ---
try {
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = $smtpHost;
    $mail->SMTPAuth = true;
    $mail->Username = $smtpUser;
    $mail->Password = $smtpPass;
    $mail->SMTPSecure = $smtpSecure;
    $mail->Port = $smtpPort;
    $mail->CharSet = 'UTF-8'; // 

    $mail->setFrom($mailFrom, $mailFromName);
    $mail->addAddress($smtpUser);
    if ($email) $mail->addReplyTo($email, $name);

    $mail->isHTML(true);
    $mail->Subject = "Новый запрос — " . ($productTitle ?: "без названия");
    $mail->Body = $bodyHtml;
    $mail->AltBody = strip_tags($message);

    $mail->send();
    echo json_encode(['success' => true, 'message' => 'Сообщение успешно отправлено!']);
} catch (Exception $e) {
    error_log("PHPMailer error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Ошибка при отправке письма.']);
}