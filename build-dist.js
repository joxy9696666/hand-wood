#!/usr/bin/env node

/**
 * Build script - собирает проект в папку dist для развертывания
 */

const fs = require('fs-extra');
const path = require('path');

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');

const filesToCopy = [
  'public',
  'src/views',
  'src/styles',
  'src/scripts',
  'src/services',
  'src/database.db',
  'api',
  '.env.production',
];

console.log('🔨 Начинаю сборку dist...\n');

// Очищаем старую папку dist
if (fs.existsSync(distDir)) {
  console.log('❌ Удаляю старую папку dist...');
  fs.removeSync(distDir);
}

// Создаем папку dist
fs.ensureDirSync(distDir);
console.log('✅ Папка dist создана\n');

// Копируем файлы и папки
console.log('📋 Копирую файлы...');
filesToCopy.forEach(item => {
  const srcPath = path.join(rootDir, item);
  const destPath = path.join(distDir, item);
  
  if (fs.existsSync(srcPath)) {
    fs.copySync(srcPath, destPath);
    console.log(`  ✓ ${item}`);
  } else {
    console.log(`  ⚠ ${item} (не найден)`);
  }
});

// Копируем корневые файлы
['package.json', '.env.production', '.env.example'].forEach(file => {
  const srcPath = path.join(rootDir, file);
  const destPath = path.join(distDir, file);
  
  if (fs.existsSync(srcPath)) {
    fs.copySync(srcPath, destPath);
    console.log(`  ✓ ${file}`);
  }
});

console.log('\n📝 Создаю конфигурационные файлы...');

// index.php - точка входа для PHP хостинга
const indexPhp = `<?php
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
`;

fs.writeFileSync(path.join(distDir, 'index.php'), indexPhp);
console.log('  ✓ index.php');

// ecosystem.config.js - конфигурация PM2
const ecosystemConfig = `module.exports = {
  apps: [{
    name: 'handwood-app',
    script: './src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: { NODE_ENV: 'production', PORT: 3000 },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    max_memory_restart: '1G'
  }]
};
`;

fs.writeFileSync(path.join(distDir, 'ecosystem.config.js'), ecosystemConfig);
console.log('  ✓ ecosystem.config.js');

// DEPLOY.md
const deployMd = `# Развертывание проекта HandWood

## Быстрый старт

\`\`\`bash
npm install --production
cp .env.production .env
npm run init-admin
npm start
\`\`\`

## Варианты развертывания

### Railway.app (самый простой)
1. Свяжите GitHub репозиторий
2. Railway автоматически развернет

### PHP хостинг + отдельный Node.js
1. Загрузите dist на PHP хостинг через FTP
2. Запустите Node.js на Railway/Render/DigitalOcean
3. Установите NODE_APP_URL в .env

### Docker
\`\`\`bash
docker build -t handwood .
docker run -d -p 3000:3000 handwood
\`\`\`

### VPS + Nginx
Используйте nginx.conf.example и handwood.service.example из корня проекта

## Переменные окружения

\`\`\`.env
PORT=3000
NODE_ENV=production
SESSION_SECRET=очень-длинная-случайная-строка
SMTP_HOST=smtp.hostinger.com
EMAIL_USER=your@domain.com
EMAIL_PASS=password
\`\`\`

## Проблемы?

- Проверьте логи: npm start или pm2 logs
- Убедитесь что .env правильно заполнен
- Проверьте npm install --production выполнен
`;

fs.writeFileSync(path.join(distDir, 'DEPLOY.md'), deployMd);
console.log('  ✓ DEPLOY.md');

// .gitignore
const gitignore = `node_modules/
.env
.DS_Store
src/database.db
logs/
*.log
.pm2/
`;
fs.writeFileSync(path.join(distDir, '.gitignore'), gitignore);
console.log('  ✓ .gitignore');

console.log('\n🎉 Сборка завершена!\n');
console.log('📂 dist/ готова к развертыванию\n');
console.log('🚀 Следующие шаги:');
console.log('  1. npm install --production');
console.log('  2. cp .env.production .env');
console.log('  3. npm run init-admin');
console.log('  4. npm start\n');
