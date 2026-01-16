# Развертывание проекта HandWood

## Быстрый старт

```bash
npm install --production
cp .env.production .env
npm run init-admin
npm start
```

## Варианты развертывания

### Railway.app (самый простой)
1. Свяжите GitHub репозиторий
2. Railway автоматически развернет

### PHP хостинг + отдельный Node.js
1. Загрузите dist на PHP хостинг через FTP
2. Запустите Node.js на Railway/Render/DigitalOcean
3. Установите NODE_APP_URL в .env

### Docker
```bash
docker build -t handwood .
docker run -d -p 3000:3000 handwood
```

### VPS + Nginx
Используйте nginx.conf.example и handwood.service.example из корня проекта

## Переменные окружения

```.env
PORT=3000
NODE_ENV=production
SESSION_SECRET=очень-длинная-случайная-строка
SMTP_HOST=smtp.hostinger.com
EMAIL_USER=your@domain.com
EMAIL_PASS=password
```

## Проблемы?

- Проверьте логи: npm start или pm2 logs
- Убедитесь что .env правильно заполнен
- Проверьте npm install --production выполнен
