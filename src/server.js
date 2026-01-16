const express = require("express");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const multer = require("multer");
const bcrypt = require("bcrypt");
const session = require("express-session");
// Для отладки - используем MemoryStore вместо SQLiteStore
const MemoryStore = require("express-session").MemoryStore;
const cookieParser = require("cookie-parser");
require("dotenv").config();

const { createFirstAdmin } = require("./scripts/init-admin");

const {
  getProducts,
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct,
  addProductImage,
  getProductImages,
  deleteProductImage,
  getProductImageData,
  deleteProductImages,
  getProductImagesForDeletion,
  deleteProductImageFiles,
  getFirstProductImage,
  updateProductPreview,
  addAdmin,
  getAdminByUsername,
  getAdminById,
  updateAdminPassword,
} = require("./services/db");

const app = express();
const PORT = process.env.PORT || 3000;

// Настройка multer для загрузки изображений (оптимизировано)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../public/images/products"));
  },
  filename: (req, file, cb) => {
    cb(
      null,
      Date.now() +
        "-" +
        Math.round(Math.random() * 1e9) +
        path.extname(file.originalname)
    );
  },
});
const uploadMultiple = multer({ storage }).array("images", 10);

// Настройка EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Логирование SESSION_SECRET (для отладки)
const sessionSecret = process.env.SESSION_SECRET || "handwood-secret-key";
console.log("🔑 SESSION_SECRET установлен:", sessionSecret ? "✅ ДА" : "❌ НЕТ");
console.log("🔑 SESSION_SECRET длина:", sessionSecret.length, "символов");

// Используем MemoryStore для отладки сессий (заменяем на SQLiteStore в production позже)
const sessionStore = new MemoryStore();
console.log("💾 Используется MemoryStore для отладки");

// Определяем secure флаг
const isProduction = process.env.NODE_ENV === "production";
const isSecure = isProduction || process.env.RAILWAY_ENVIRONMENT === "production";

console.log("🔒 Cookies secure flag:", isSecure ? "true (HTTPS)" : "false (HTTP)");
console.log("🔒 Node environment:", process.env.NODE_ENV);

app.use(
  session({
    secret: sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: true, // Важно: true чтобы отправить куку сразу
    cookie: {
      secure: isSecure, // true для HTTPS в production
      httpOnly: true,
      sameSite: "lax", // Позволяет кукам отправляться при редиректе
      maxAge: 24 * 60 * 60 * 1000, // 24 часа
    },
  })
);

// Логирование сессий (для отладки) - ДОЛЖНО БЫТЬ ПОСЛЕ session middleware!
app.use((req, res, next) => {
  if (req.path === "/") {
    console.log(`\n📍 ${req.method} ${req.path}`);
    console.log(`   Session ID: ${req.sessionID}`);
    console.log(`   Cookie header: ${req.get('cookie') || "none"}`);
    console.log(`   adminId: ${req.session.adminId || "undefined"}`);
  } else if (req.path.startsWith("/admin")) {
    console.log(`\n📍 ${req.method} ${req.path}`);
    console.log(`   Session ID: ${req.sessionID}`);
    console.log(`   Cookie header: ${req.get('cookie') || "none"}`);
    console.log(`   adminId: ${req.session.adminId || "undefined"}`);
  }
  next();
});

// Статические файлы (объединено в одну декларацию)
app.use(express.static(path.join(__dirname, "../public")));
app.use("/styles", express.static(path.join(__dirname, "styles")));
app.use("/scripts", express.static(path.join(__dirname, "scripts")));

// Middleware для проверки авторизации
const requireAdmin = (req, res, next) => {
  console.log("🔐 Проверка доступа к /admin");
  console.log("   Session ID:", req.sessionID);
  console.log("   adminId в сессии:", req.session.adminId);
  console.log("   Вся сессия:", req.session);
  
  if (!req.session.adminId) {
    console.log("❌ adminId НЕ найден в сессии, редирект на /admin/login");
    return res.redirect("/admin/login");
  }
  console.log("✅ adminId найден в сессии:", req.session.adminId);
  next();
};

// Middleware для проверки авторизации API
const requireAdminAPI = (req, res, next) => {
  if (!req.session.adminId) {
    return res.status(401).json({ error: "Требуется авторизация" });
  }
  next();
};

// Настройка nodemailer для SMTP хостинга
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.hostinger.com",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: (process.env.SMTP_SECURE || "ssl") === "ssl", // true для 465, false для 587
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_USER,
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
  },
});

// Функции валидации (объединено и оптимизировано)
function cleanText(text) {
  return !text ? "" : text.trim().replace(/[<>]/g, "").substring(0, 500);
}

function validateEmail(email) {
  if (!email) return null;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email) ? email.trim() : null;
}

function validatePhone(phone) {
  return /^\+[0-9]{1,4}[0-9]{7,14}$/.test(phone);
}

// Маршруты
app.get("/", (req, res) => res.render("index", { title: "Главная", req }));
app.get("/about", (req, res) => res.render("about", { title: "О нас", req }));

// Галерея с товарами из БД
app.get("/gallery", async (req, res) => {
  try {
    const products = await getProducts();
    const categories = await getCategories();

    res.render("gallery", {
      title: "Галерея",
      req,
      products,
      categories,
    });
  } catch (error) {
    console.error("Ошибка при получении данных:", error);
    res.render("gallery", {
      title: "Галерея",
      req,
      products: [],
      categories: [],
    });
  }
});

// Страница категории товаров
app.get("/category/:id", async (req, res) => {
  try {
    const products = await getProducts();
    const categories = await getCategories();

    // Найди категорию по ID
    const category = categories.find((c) => c.id == req.params.id);
    if (!category) {
      return res
        .status(404)
        .render("404", { title: "Категория не найдена", req });
    }

    // Фильтруй товары по категории
    const categoryProducts = products.filter(
      (p) => p.category_id == req.params.id
    );

    res.render("category", {
      title: category.name,
      req,
      category,
      products: categoryProducts,
    });
  } catch (error) {
    console.error("Ошибка при получении категории:", error);
    res.status(500).render("404", {
      title: "Ошибка",
      req,
      error: error.message,
    });
  }
});

// Страница товара
app.get("/product/:id", async (req, res) => {
  try {
    const product = await getProductById(req.params.id);
    if (!product) {
      return res.status(404).render("404", { title: "Товар не найден", req });
    }
    const images = await getProductImages(req.params.id);
    res.render("product", {
      title: product.name,
      req,
      product,
      images,
    });
  } catch (error) {
    console.error("Ошибка при получении товара:", error);
    res.status(500).send("Ошибка при получении товара");
  }
});

app.get("/collaboration", (req, res) =>
  res.render("collaboration", { title: "Сотрудничество", req })
);
app.get("/contacts", (req, res) =>
  res.render("contacts", { title: "Контакты", req })
);
app.get("/order", (req, res) =>
  res.render("order", {
    title: "Заказ",
    description:
      "Оформить заказ в HandWood — укажите свою идею и мы её воплотим",
    req,
  })
);

// API для отправки заказа (с валидацией)
app.post("/api/order", async (req, res) => {
  try {
    const name = cleanText(req.body.name || "");
    const middleName = cleanText(req.body["middle-name"] || "");
    const phone = cleanText(req.body.phone || "");
    const email = validateEmail(req.body.email);
    const message = cleanText(req.body.message || "");

    // Проверка обязательных полей
    if (!name || name.length < 2) {
      return res
        .status(400)
        .json({ success: false, message: "Имя должно быть минимум 2 символа" });
    }
    if (!phone) {
      return res
        .status(400)
        .json({ success: false, message: "Укажите номер телефона" });
    }
    if (!validatePhone(phone)) {
      return res.status(400).json({
        success: false,
        message:
          "Неверный формат номера телефона. Используйте +7XXXXXXXXXX или +375XXXXXXXXX",
      });
    }
    if (!message || message.length < 5) {
      return res.status(400).json({
        success: false,
        message: "Сообщение должно быть минимум 5 символов",
      });
    }

    // HTML письма (оптимизировано)
    const htmlBody = `<html><head><meta charset="UTF-8"><style>body{font-family:Arial;color:#333}h2{color:#8B5E3C}table{width:100%;border-collapse:collapse}td{padding:12px;border-bottom:1px solid #ddd}td:first-child{font-weight:bold;width:150px;color:#8B5E3C}.footer{margin-top:20px;padding-top:20px;border-top:1px solid #ddd;font-size:12px;color:#999}</style></head><body><h2>📋 Новое сообщение HandWood</h2><table><tr><td>Имя:</td><td>${name}</td></tr>${
      middleName ? `<tr><td>Отчество:</td><td>${middleName}</td></tr>` : ""
    }<tr><td>Телефон:</td><td><a href="tel:${phone}">${phone}</a></td></tr>${
      email
        ? `<tr><td>Email:</td><td><a href="mailto:${email}">${email}</a></td></tr>`
        : ""
    }<tr><td>Сообщение:</td><td>${message.replace(
      /\n/g,
      "<br>"
    )}</td></tr></table><div class="footer"><p>Письмо отправлено с сайта HandWood</p><p>IP: ${
      req.ip
    }</p></div></body></html>`;

    const mailOptions = {
      from: `"HandWood" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
      to:
        process.env.ADMIN_EMAIL ||
        process.env.SMTP_USER ||
        process.env.EMAIL_USER,
      subject: `[Новое сообщение] ${name} - Связаться с нами`,
      html: htmlBody,
      replyTo: email || phone,
    };

    await transporter.sendMail(mailOptions);
    res.json({
      success: true,
      message:
        "Спасибо! Ваше сообщение отправлено. Мы свяжемся с вами в ближайшее время.",
    });
  } catch (error) {
    console.error("Ошибка отправки почты:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка при отправке заказа. Пожалуйста, попробуйте позже.",
    });
  }
});

// Админ панель
app.get("/admin", requireAdmin, async (req, res) => {
  try {
    const products = await getProducts();
    const categories = await getCategories();
    res.render("admin/index", { title: "Админ панель", products, categories });
  } catch (error) {
    res.status(500).send("Ошибка загрузки админ панели");
  }
});

// Авторизация администратора
app.get("/admin/login", (req, res) => {
  if (req.session.adminId) {
    return res.redirect("/admin");
  }
  res.render("admin/login", { title: "Вход в админ панель" });
});

app.post("/admin/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    console.log("🔐 Попытка входа с пользователем:", username);
    
    const admin = await getAdminByUsername(username);

    if (!admin) {
      console.log("❌ Пользователь не найден:", username);
      return res.render("admin/login", {
        title: "Вход в админ панель",
        error: "Неверное имя пользователя или пароль",
      });
    }

    console.log("✅ Пользователь найден, проверяю пароль...");
    
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      console.log("❌ Пароль неверный для пользователя:", username);
      return res.render("admin/login", {
        title: "Вход в админ панель",
        error: "Неверное имя пользователя или пароль",
      });
    }

    console.log("✅ Пароль верный! Создаю сессию для пользователя:", username);
    
    // Просто устанавливаем данные в сессию
    req.session.adminId = admin.id;
    req.session.adminUsername = admin.username;
    
    console.log("📝 После установки данных:");
    console.log("   Session ID:", req.sessionID);
    console.log("   adminId:", req.session.adminId);
    console.log("   Данные сессии:", req.session);
    
    // Express сам отправит Set-Cookie header при редиректе
    console.log("✅ Выполняю redirect на /admin");
    res.redirect("/admin");
  } catch (error) {
    console.error("❌ Ошибка при входе:", error);
    res.render("admin/login", {
      title: "Вход в админ панель",
      error: "Ошибка сервера",
    });
  }
});

app.get("/admin/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.send("Ошибка при выходе");
    }
    res.redirect("/");
  });
});

// Смена пароля
app.get("/admin/change-password", requireAdmin, (req, res) => {
  res.render("admin/change-password", {
    title: "Смена пароля",
    username: req.session.adminUsername,
  });
});

app.post("/admin/change-password", requireAdmin, async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  try {
    // Проверка что новый пароль совпадает с подтверждением
    if (newPassword !== confirmPassword) {
      return res.render("admin/change-password", {
        title: "Смена пароля",
        username: req.session.adminUsername,
        error: "Новый пароль и подтверждение не совпадают",
      });
    }

    // Проверка длины пароля
    if (newPassword.length < 6) {
      return res.render("admin/change-password", {
        title: "Смена пароля",
        username: req.session.adminUsername,
        error: "Пароль должен содержать минимум 6 символов",
      });
    }

    // Получаем текущего администратора
    const admin = await getAdminById(req.session.adminId);

    if (!admin) {
      return res.status(404).render("admin/change-password", {
        title: "Смена пароля",
        error: "Администратор не найден",
      });
    }

    // Проверяем текущий пароль
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      admin.password
    );

    if (!isPasswordValid) {
      return res.render("admin/change-password", {
        title: "Смена пароля",
        username: req.session.adminUsername,
        error: "Неверный текущий пароль",
      });
    }

    // Хешируем новый пароль и сохраняем
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await updateAdminPassword(req.session.adminId, hashedPassword);

    res.render("admin/change-password", {
      title: "Смена пароля",
      username: req.session.adminUsername,
      success: "Пароль успешно изменён",
    });
  } catch (error) {
    console.error("Ошибка при смене пароля:", error);
    res.status(500).render("admin/change-password", {
      title: "Смена пароля",
      username: req.session.adminUsername,
      error: "Ошибка сервера при смене пароля",
    });
  }
});

// Управление категориями
app.get("/admin/categories", requireAdmin, async (req, res) => {
  try {
    const categories = await getCategories();
    const products = await getProducts();
    res.render("admin/categories", {
      title: "Управление категориями",
      categories,
      products,
    });
  } catch (error) {
    res.status(500).send("Ошибка загрузки категорий");
  }
});

app.post("/admin/categories", requireAdmin, async (req, res) => {
  const { name, description } = req.body;
  try {
    await addCategory(name, description);
    res.redirect("/admin/categories");
  } catch (error) {
    res.status(500).send("Ошибка добавления категории");
  }
});

app.post("/admin/categories/:id/update", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  try {
    await updateCategory(id, name, description);
    res.redirect("/admin/categories");
  } catch (error) {
    res.status(500).send("Ошибка обновления категории");
  }
});

app.post("/admin/categories/:id/delete", requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await deleteCategory(id);
    res.redirect("/admin/categories");
  } catch (error) {
    res.status(500).send("Ошибка удаления категории");
  }
});

// Управление товарами
app.get("/admin/products", requireAdmin, async (req, res) => {
  try {
    const products = await getProducts();
    const categories = await getCategories();
    res.render("admin/products", {
      title: "Управление товарами",
      products,
      categories,
    });
  } catch (error) {
    res.status(500).send("Ошибка загрузки товаров");
  }
});

// Добавление товара (оптимизировано)
app.post("/admin/products", requireAdmin, uploadMultiple, async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category_id,
      size_open,
      size_closed,
      weight_net,
      weight_gross,
      diameter,
      contents,
      delivery_return,
      care_instructions,
    } = req.body;
    const imagePath =
      req.files && req.files[0]
        ? `/images/products/${req.files[0].filename}`
        : null;

    const result = await addProduct(
      name,
      description,
      parseFloat(price),
      category_id || null,
      imagePath,
      size_open || null,
      size_closed || null,
      weight_net || null,
      weight_gross || null,
      diameter || null,
      contents || null,
      delivery_return || null,
      care_instructions || null
    );

    // Добавляем дополнительные изображения
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await addProductImage(result.id, `/images/products/${file.filename}`);
      }
    }

    res.redirect("/admin/products");
  } catch (error) {
    console.error("Ошибка добавления товара:", error);
    res.status(500).send("Ошибка добавления товара");
  }
});

// Обновление товара (оптимизировано)
app.post(
  "/admin/products/:id/update",
  requireAdmin,
  uploadMultiple,
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        price,
        category_id,
        existing_image,
        size_open,
        size_closed,
        weight_net,
        weight_gross,
        diameter,
        contents,
        delivery_return,
        care_instructions,
      } = req.body;

      let imagePath =
        req.files && req.files[0]
          ? `/images/products/${req.files[0].filename}`
          : existing_image || null;

      // Добавляем новые изображения
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          await addProductImage(id, `/images/products/${file.filename}`);
        }
      }

      // Если превью не установлено, используем первое изображение
      if (!imagePath) {
        const firstImage = await getFirstProductImage(id);
        imagePath = firstImage || null;
      }

      await updateProduct(
        id,
        name,
        description,
        parseFloat(price),
        category_id || null,
        imagePath,
        size_open || null,
        size_closed || null,
        weight_net || null,
        weight_gross || null,
        diameter || null,
        contents || null,
        delivery_return || null,
        care_instructions || null
      );
      res.redirect("/admin/products");
    } catch (error) {
      console.error("Ошибка обновления товара:", error);
      res.status(500).send("Ошибка обновления товара");
    }
  }
);

app.get("/admin/products/:id", requireAdminAPI, async (req, res) => {
  const { id } = req.params;
  try {
    const product = await getProductById(id);
    if (product) {
      const images = await getProductImages(id);
      res.json({ ...product, images });
    } else {
      res.status(404).json({ error: "Товар не найден" });
    }
  } catch (error) {
    res.status(500).json({ error: "Ошибка получения товара" });
  }
});

app.post("/admin/products/:id/delete", requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    // Получаем все изображения товара перед удалением
    const images = await getProductImagesForDeletion(id);

    // Удаляем физические файлы с диска
    await deleteProductImageFiles(images);

    // Удаляем записи из БД
    await deleteProductImages(id);
    await deleteProduct(id);

    res.redirect("/admin/products");
  } catch (error) {
    console.error("Ошибка удаления товара:", error);
    res.status(500).send("Ошибка удаления товара");
  }
});

// API для удаления отдельного изображения товара (оптимизировано)
app.post(
  "/admin/products/:productId/images/:imageId/delete",
  requireAdminAPI,
  async (req, res) => {
    try {
      const { productId, imageId } = req.params;
      const imageData = await getProductImageData(imageId);

      // Удаляем физический файл
      if (imageData && imageData.image_path) {
        const filePath = path.join(
          __dirname,
          "../public",
          imageData.image_path
        );
        try {
          await fs.promises.unlink(filePath);
        } catch (err) {
          console.warn("⚠️ Не удалось удалить файл:", imageData.image_path);
        }
      }

      // Удаляем из БД
      await deleteProductImage(imageId);

      const images = await getProductImages(productId);

      // Обновляем превью если необходимо
      if (images.length > 0) {
        await updateProductPreview(productId, images[0].image_path);
      } else {
        await updateProductPreview(productId, null);
      }

      res.json({ success: true, images });
    } catch (error) {
      console.error("Ошибка удаления изображения:", error);
      res.status(500).json({ error: "Ошибка удаления изображения" });
    }
  }
);

// Запуск сервера
app.listen(PORT, async () => {
  console.log(`✅ Сервер запущен на http://localhost:${PORT}`);
  console.log(`🔧 Админ панель доступна на http://localhost:${PORT}/admin`);

  // Автоматическая инициализация админа при запуске
  // Задержка 1 секунда чтобы БД успела инициализироваться
  setTimeout(async () => {
    try {
      await createFirstAdmin();
    } catch (error) {
      console.error("⚠️  Не удалось инициализировать админа:", error.message);
    }
  }, 1000);
});
