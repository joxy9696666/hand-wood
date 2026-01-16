# Развертывание на хостинг без Node.js

## ⚠️ Проблема и решение

Ваш хостинг поддерживает только **PHP** без **Node.js**.
Решение: Запустите Node.js на отдельном сервере или используйте контейнеризацию.

---

## 🔧 Решение 1: Отдельный Node.js сервер + PHP хостинг (РЕКОМЕНДУЕТСЯ)

### Архитектура:
```
Браузер → Apache/Nginx (PHP хостинг) → Node.js приложение
                ↓
            index.php проксирует запросы
```

### Шаг 1: Собрать проект

```bash
npm run build
```

Это создаст папку `dist/` с полностью готовым проектом.

### Шаг 2: Загрузить dist на Node.js хостинг

Варианты хостингов Node.js:
- **Railway.app** - $5/месяц (рекомендуется, просто как Heroku)
- **Render.com** - бесплатно или $7/месяц
- **Hetzner Cloud** - от €3.99/месяц
- **DigitalOcean** - от $4/месяц
- **Linode** - от $5/месяц
- **AWS Lightsail** - от $3.50/месяц

#### Пример с Railway.app:

1. **Создайте аккаунт на railway.app**

2. **Свяжите GitHub репозиторий** или загрузите файлы

3. **Создайте переменные окружения:**
   ```
   PORT=3000
   NODE_ENV=production
   SITE_URL=https://handwood-app.railway.app
   SESSION_SECRET=your-random-string
   SMTP_HOST=smtp.hostinger.com
   SMTP_PORT=587
   EMAIL_USER=your@domain.com
   EMAIL_PASS=your-password
   ADMIN_EMAIL=admin@your-domain.com
   ```

4. **Разверните (deploy)**

Railway автоматически установит зависимости и запустит приложение.

**Результат:** https://handwood-app.railway.app (ваш Node.js сервер)

### Шаг 3: На PHP хостинге (Hostinger, Beget и т.д.)

Загрузите содержимое `dist/` в корень:

```
public_html/
├── index.php          ← Главная точка входа
├── public/
├── src/
├── api/
├── package.json       ← Для информации
└── DEPLOY.md
```

### Шаг 4: На PHP хостинге создайте файл `public/.htaccess`:

```apache
# Enable mod_rewrite
<IfModule mod_rewrite.c>
    RewriteEngine On
    
    # Если файл или директория существует, используйте ее как есть
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    
    # Для статических файлов - обслуживайте их напрямую
    RewriteRule ^(images|css|js|fonts)/(.*)$ - [L]
    
    # Для остального - проксируем на Node.js
</IfModule>
```

### Шаг 5: Отредактируйте `index.php`

Измените `$appUrl` в файле `dist/index.php`:

```php
<?php
$appUrl = 'https://handwood-app.railway.app';  // ← Ваш Node.js сервер
// ... остальной код
```

ИЛИ через переменную окружения (если хостинг это поддерживает):

```php
<?php
$appUrl = getenv('NODE_APP_URL') ?: 'https://handwood-app.railway.app';
```

### Шаг 6: Первичная инициализация

На Node.js сервере выполните:

```bash
npm run init-admin
# Создайте администратора
```

Затем администратор может входить на `https://handwood-app.railway.app/admin`

---

## 🐳 Решение 2: Docker контейнер на VPS

### Требования:
- VPS с Docker (DigitalOcean, Hetzner, AWS и т.д.)
- Домен + SSL сертификат

### Шаг 1: Создайте `Dockerfile`

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Копируем package.json
COPY package*.json ./

# Установляем зависимости
RUN npm install --production

# Копируем приложение
COPY . .

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["npm", "start"]
```

### Шаг 2: Создайте `docker-compose.yml`

```yaml
version: '3.8'

services:
  handwood:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
      SITE_URL: https://your-domain.com
      SESSION_SECRET: ${SESSION_SECRET}
      SMTP_HOST: ${SMTP_HOST}
      EMAIL_USER: ${EMAIL_USER}
      EMAIL_PASS: ${EMAIL_PASS}
    volumes:
      - ./src/database.db:/app/src/database.db
      - ./public/images:/app/public/images
    restart: unless-stopped
```

### Шаг 3: На VPS выполните

```bash
git clone https://github.com/your/repo.git
cd repo
docker-compose up -d
```

---

## ☁️ Решение 3: Облачные платформы (самое простое)

### Vercel + Serverless Functions

Vercel поддерживает Node.js и может запустить Express приложение как serverless функции.

1. **Создайте `vercel.json`:**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/server.js"
    }
  ]
}
```

2. **Разверните:**
```bash
npm i -g vercel
vercel
```

⚠️ **Минус:** Serverless требует масштабирования логики приложения.

---

## 🚀 Решение 4: Full-stack на одном VPS с Nginx

### Архитектура:
```
Браузер → Nginx (reverse proxy)
    ├→ Port 3000 (Node.js приложение)
    └→ /api/* → PHP скрипты
```

### Конфиг Nginx (`/etc/nginx/sites-available/handwood`):

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Редирект на HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # Статические файлы
    location ~* \.(js|css|png|jpg|gif|svg|woff|woff2|ttf)$ {
        alias /var/www/handwood/public$uri;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
    
    # Node.js приложение (проксирование)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Логи
    access_log /var/log/nginx/handwood_access.log;
    error_log /var/log/nginx/handwood_error.log;
}
```

### Запуск через systemd:

Создайте `/etc/systemd/system/handwood.service`:

```ini
[Unit]
Description=HandWood Node.js Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/handwood
ExecStart=/usr/bin/node /var/www/handwood/src/server.js
Restart=on-failure
RestartSec=10

Environment="NODE_ENV=production"
Environment="PORT=3000"
Environment="SITE_URL=https://your-domain.com"

[Install]
WantedBy=multi-user.target
```

### Запуск:
```bash
sudo systemctl enable handwood
sudo systemctl start handwood
sudo systemctl status handwood
```

---

## 📋 Чек-лист развертывания

- [ ] Создана папка dist: `npm run build`
- [ ] Выбрано место для Node.js хостинга
- [ ] Загружены файлы на сервер
- [ ] Установлены зависимости: `npm install --production`
- [ ] Скопирован .env.production в .env
- [ ] Отредактированы переменные окружения
- [ ] Инициализирован админ: `npm run init-admin`
- [ ] Тестирован доступ к приложению
- [ ] Настроена HTTPS/SSL
- [ ] Настроены email параметры
- [ ] Настроен PM2/systemd для автозагрузки
- [ ] Включены логи и мониторинг

---

## 🆘 Решение проблем

### Приложение не запускается

```bash
# Проверьте логи
npm start        # локально
pm2 logs         # если используете PM2
journalctl -u handwood -n 50  # если используете systemd
```

### БД не создается

```bash
# Убедитесь что папка writable
chmod 755 src/
chmod 644 src/database.db
```

### Email не отправляется

1. Проверьте SMTP параметры в .env
2. Убедитесь что пароль приложения правильный (не основной пароль)
3. Включите "менее безопасные приложения" в Gmail (если используете Gmail)

### Изображения не загружаются

```bash
# Проверьте права
chmod -R 755 public/images/
chmod -R 755 public/images/products/
```

### Сессии не сохраняются

- Проверьте SESSION_SECRET в .env
- Убедитесь что куки включены
- Проверьте что localhost может писать куки (https для production)

---

## 💡 Рекомендуемая конфигурация

### Для быстрого старта (Railway.app):

```bash
npm run build
# Загрузите dist на railway.app
# Автоматически установит зависимости и запустит
```

### Для production (DigitalOcean + Nginx):

```bash
npm run build
# Загрузите на DigitalOcean
# Настройте Nginx как reverse proxy
# Используйте systemd для автоизагрузки
# Используйте Let's Encrypt для SSL
```

### Для масштабирования:

```bash
npm run build
# Docker контейнер
# Kubernetes или Docker Swarm
# Балансировщик нагрузки (Nginx, HAProxy)
```

---

## 📚 Полезные ссылки

- [Railway.app документация](https://docs.railway.app/)
- [Docker документация](https://docs.docker.com/)
- [Nginx документация](https://nginx.org/ru/docs/)
- [PM2 документация](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Express в production](https://expressjs.com/en/advanced/best-practice-performance.html)
