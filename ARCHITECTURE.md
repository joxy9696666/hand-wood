# HandWood - Архитектура и структура проекта

## 📊 Обзор проекта

**Полнофункциональный сайт мастерской HandWood** с админ-панелью на современном стеке:
- **Backend**: Node.js + Express (SSR с EJS)
- **БД**: SQLite3
- **Frontend**: Vanilla JS + AJAX
- **Admin**: Встроенная панель с аутентификацией

## 🏗️ Структура приложения

### Чтение архитектуры

```
┌─────────────────────────────────────────┐
│         Браузер пользователя            │
└──────────────────┬──────────────────────┘
                   │ HTTP запросы
                   ↓
┌─────────────────────────────────────────┐
│      Express.js сервер (Node.js)        │
│  Обработка маршрутов и рендеринг EJS    │
└─────┬─────────────────────────┬─────────┘
      │                         │
      ↓ Рендеринг              ↓ API
┌─────────────────┐  ┌──────────────────┐
│   EJS views     │  │  JSON responses  │
│  (HTML + JS)    │  │ (for AJAX)       │
└─────────────────┘  └────────┬─────────┘
                              │
                              ↓
                      ┌──────────────────┐
                      │   SQLite3 БД     │
                      │  database.db     │
                      └──────────────────┘
```

### Папки и их назначение

| Папка | Назначение |
|-------|-----------|
| `src/` | Исходный код Node.js приложения |
| `src/server.js` | Главный файл Express приложения |
| `src/views/` | EJS шаблоны HTML |
| `src/views/admin/` | Админ-панель шаблоны |
| `src/services/db.js` | Весь код работы с SQLite БД |
| `src/scripts/` | Утилиты (init-admin, migrate, lazy-load) |
| `src/styles/` | CSS файлы |
| `public/` | Статические файлы (клиентский JS, CSS, изображения) |
| `api/` | PHP скрипты (send_order.php, Composer) |

## 🗄️ Структура БД (SQLite)

```sql
admins
├── id (PK)
├── username (UNIQUE)
└── password (hashed)

categories
├── id (PK)
├── name
└── description

products
├── id (PK)
├── name
├── description
├── price
├── category_id (FK)
├── image_path
├── size_open
└── size_closed

product_images
├── id (PK)
├── product_id (FK)
└── image_path

orders
├── id (PK)
├── product_id (FK)
├── client_name
├── client_email
├── client_phone
├── quantity
├── price
└── created_at
```

## 🔌 Основные маршруты Express

### Публичные маршруты

| Маршрут | Метод | Описание |
|---------|-------|----------|
| `/` | GET | Главная страница |
| `/category/:id` | GET | Категория товаров |
| `/product/:id` | GET | Товар с деталями |
| `/about` | GET | О компании |
| `/gallery` | GET | Галерея |
| `/contacts` | GET | Контакты |
| `/collaboration` | GET | Сотрудничество |
| `/order` | GET | Форма заказа |

### API маршруты (JSON)

| Маршрут | Метод | Описание |
|---------|-------|----------|
| `/api/categories` | GET | Список всех категорий |
| `/api/products` | GET | Все товары с фильтрацией |
| `/api/products/:id` | GET | Товар по ID |
| `/api/products/:id/images` | GET | Изображения товара |
| `/api/send-order` | POST | Отправить заказ |

### Админ маршруты (защищены аутентификацией)

| Маршрут | Метод | Описание |
|---------|-------|----------|
| `/admin/login` | GET/POST | Вход в админ-панель |
| `/admin` | GET | Главная админ-панель |
| `/admin/categories` | GET | Управление категориями |
| `/admin/products` | GET | Управление товарами |
| `/admin/logout` | GET | Выход |
| `/api/admin/categories` | POST/PUT/DELETE | CRUD категорий |
| `/api/admin/products` | POST/PUT/DELETE | CRUD товаров |
| `/api/admin/password` | POST | Смена пароля |

## 🔐 Аутентификация и сессии

- **Сессии**: Express.js Session Middleware
- **Хеширование**: bcrypt
- **Защита**: Middleware `requireAdmin` и `requireAdminAPI`
- **Куки**: HttpOnly, 24 часа жизни
- **SECRET**: Настраивается через `SESSION_SECRET` в .env

## 📤 Загрузка изображений

- **Формат**: Multer (в памяти и на диск)
- **Местоположение**: `public/images/products/`
- **Лимит**: 10 файлов за раз
- **Обработка**: Sharp (оптимизация JPEG/PNG)

## 🚀 Жизненный цикл запроса

```
1. Клиент отправляет запрос на Express
2. Middleware парсят body, сессии, проверяют авторизацию
3. Маршрут обрабатывает запрос
   - GET/POST/PUT/DELETE маршруты
   - Вызовы функций из db.js
4. Рендеринг EJS шаблона с данными ИЛИ JSON ответ
5. Отправка клиенту
6. Клиентский JS обрабатывает ответ
```

## 📧 Email интеграция

- **Провайдер**: Nodemailer
- **Сервер**: SMTP (Hostinger по умолчанию)
- **Использование**: Отправка заказов и уведомлений
- **Конфигурация**: .env (SMTP_HOST, EMAIL_USER, EMAIL_PASS)

## 🛠️ Ключевые зависимости

```json
{
  "express": "Фреймворк",
  "ejs": "Шаблонизатор",
  "sqlite3": "База данных",
  "multer": "Загрузка файлов",
  "bcrypt": "Хеширование пароля",
  "express-session": "Управление сессиями",
  "sharp": "Обработка изображений",
  "nodemailer": "Email",
  "axios": "HTTP клиент",
  "dotenv": "Переменные окружения"
}
```

## 🔧 Стартовые скрипты

### Инициализация администратора
```bash
npm run init-admin
# Интерактивно создает первого админа (если не существует)
```

### Миграция данных
```bash
npm run migrate
# Выполняет миграции БД
```

### Разработка
```bash
npm run dev
# Запуск с nodemon (перезагрузка при изменениях)
```

### Production
```bash
npm run prod
# Запуск с NODE_ENV=production
```

### PM2
```bash
npm run pm2:start   # Запуск через PM2
npm run pm2:restart # Перезагрузка
npm run pm2:stop    # Остановка
```

## ✅ Поток разработки

1. **Локальная разработка**: `npm run dev`
2. **Тестирование**: В браузере `http://localhost:3000`
3. **Админ-панель**: `http://localhost:3000/admin`
4. **Production**: `npm run prod` или PM2
5. **Сборка**: `npm run build` (создает папку dist)

## 📱 Клиентский JavaScript

Основные файлы:
- `src/scripts/main.js` - Инициализация
- `src/scripts/lazy-load.js` - Ленивая загрузка изображений
- Встроенные AJAX запросы в EJS шаблонах

## 🔍 Отладка

- **Логи Express**: В терминале при `npm run dev`
- **Логи БД**: Сообщения SQLite
- **Разработчик**: F12 в браузере (Console, Network)
- **PM2**: `pm2 logs handwood-app`

## 🌐 Развертывание на хостинг

See `DEPLOY.md` для подробных инструкций.

Вкратце:
1. `npm run build` - Создает папку dist с готовым проектом
2. Загрузите dist на хостинг
3. `npm install --production`
4. Установите .env
5. `npm run init-admin`
6. Запустите через PM2 или systemd

## 📝 .env переменные

```env
# Сервер
PORT=3000                                # Порт приложения
NODE_ENV=production|development         # Окружение

# Сайт
SITE_URL=https://your-domain.com        # URL сайта
SITE_TITLE=HandWood                     # Название

# Email (SMTP)
SMTP_HOST=smtp.hostinger.com            # SMTP сервер
SMTP_PORT=587                           # SMTP порт
EMAIL_USER=your@domain.com              # Email адрес
EMAIL_PASS=your-password                # Пароль приложения
ADMIN_EMAIL=admin@domain.com            # Email админа

# Безопасность
SESSION_SECRET=random-secure-string     # Секрет сессий
```

## 🐛 Типичные проблемы

| Проблема | Решение |
|----------|---------|
| БД не создается | Проверьте права на папку `src/` |
| Изображения не загружаются | Проверьте права на `public/images/products/` |
| Сессии не сохраняются | Проверьте `SESSION_SECRET` в .env |
| Админ не может войти | Выполните `npm run init-admin` |
| Email не отправляется | Проверьте SMTP параметры в .env |

## 📊 Производительность

Оптимизации:
- Caching файлов в Express
- Ленивая загрузка изображений
- Оптимизация шарифом
- Clustering в PM2
- Статические файлы с кешем
