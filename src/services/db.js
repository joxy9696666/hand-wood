const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs").promises;

// Путь к базе данных
const dbPath = path.join(__dirname, "../database.db");
console.log("📁 Путь к БД:", dbPath);

// Создание соединения с БД
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Ошибка подключения к БД:", err.message);
  } else {
    console.log("✅ Подключено к SQLite базе данных");
    console.log("✅ БД файл создан/открыт в:", dbPath);
    initDatabase();
  }
});

// Инициализация таблиц (синхронная)
function initDatabase() {
  const tables = [
    // Таблица администраторов
    `CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    // Таблица категорий
    `CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    // Таблица товаров
    `CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      category_id INTEGER,
      image_path TEXT,
      size_open TEXT,
      size_closed TEXT,
      weight_net TEXT,
      weight_gross TEXT,
      diameter TEXT,
      contents TEXT,
      delivery_return TEXT,
      care_instructions TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories (id)
    )`,
    // Таблица для множественных изображений товара
    `CREATE TABLE IF NOT EXISTS product_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      image_path TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
    )`,
  ];

  // Создаем все таблицы синхронно
  tables.forEach((sql) => {
    db.run(sql, (err) => {
      if (err) console.error("Ошибка создания таблицы:", err.message);
    });
  });

  // Запускаем миграцию после небольшой задержки (чтобы таблицы успели создаться)
  setTimeout(() => migrateProducts(), 500);
}

// Миграция: Добавляем новые колонки если их еще нет
const migrateProducts = () => {
  const newColumns = [
    "size_open",
    "size_closed",
    "weight_net",
    "weight_gross",
    "diameter",
    "contents",
    "delivery_return",
    "care_instructions",
  ];

  console.log("🔄 Проверка структуры таблицы products...");

  db.all("PRAGMA table_info(products)", (err, columns) => {
    if (err) {
      console.error("Ошибка проверки структуры таблицы:", err);
      return;
    }

    const existingColumns = columns.map((col) => col.name);
    console.log(
      "📋 Существующие колонки:",
      existingColumns.length > 0 ? existingColumns : "Таблица пуста"
    );

    let addedCount = 0;
    let checkedCount = 0;
    const columnsToAdd = newColumns.filter(
      (c) => !existingColumns.includes(c)
    );

    if (columnsToAdd.length === 0) {
      console.log(
        "✅ Все необходимые колонки уже существуют. Миграция не требуется."
      );
      return;
    }

    columnsToAdd.forEach((columnName) => {
      const query = `ALTER TABLE products ADD COLUMN ${columnName} TEXT`;
      db.run(query, (err) => {
        checkedCount++;
        if (err) {
          // Игнорируем ошибки дублирования - колонка уже существует
          if (err.message && err.message.includes("duplicate column")) {
            console.log(
              `⚠️  Колонка ${columnName} уже существует, пропускаем`
            );
          } else {
            console.error(
              `❌ Ошибка добавления колонки ${columnName}:`,
              err.message
            );
          }
        } else {
          addedCount++;
          console.log(`✅ Колонка ${columnName} успешно добавлена`);
        }

        // Когда все проверено, выводим итог
        if (checkedCount === columnsToAdd.length) {
          console.log(
            `\n✨ Миграция завершена! Добавлено колонок: ${addedCount}`
          );
        }
      });
    });
  });
};

// Функции для работы с администраторами
const addAdmin = (username, password) => {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO admins (username, password) VALUES (?, ?)",
      [username, password],
      function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      }
    );
  });
};

const getAdminByUsername = (username) => {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM admins WHERE username = ?",
      [username],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
};

const getAdminById = (id) => {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM admins WHERE id = ?", [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const updateAdminPassword = (id, password) => {
  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE admins SET password = ? WHERE id = ?",
      [password, id],
      function (err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      }
    );
  });
};

// Функции для работы с категориями
const getCategories = () => {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM categories ORDER BY created_at DESC",
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
};

const addCategory = (name, description) => {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO categories (name, description) VALUES (?, ?)",
      [name, description],
      function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      }
    );
  });
};

const updateCategory = (id, name, description) => {
  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE categories SET name = ?, description = ? WHERE id = ?",
      [name, description, id],
      function (err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      }
    );
  });
};

const deleteCategory = (id) => {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM categories WHERE id = ?", [id], function (err) {
      if (err) reject(err);
      else resolve({ changes: this.changes });
    });
  });
};

// Функции для работы с товарами
const getProducts = (categoryId = null) => {
  return new Promise((resolve, reject) => {
    let query = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
    `;
    let params = [];
    if (categoryId) {
      query += " WHERE p.category_id = ?";
      params.push(categoryId);
    }
    query += " ORDER BY p.created_at DESC";
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const getProductById = (id) => {
  return new Promise((resolve, reject) => {
    db.get(
      `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `,
      [id],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
};

const addProduct = (
  name,
  description,
  price,
  categoryId,
  imagePath,
  sizeOpen = null,
  sizeClosed = null,
  weightNet = null,
  weightGross = null,
  diameter = null,
  contents = null,
  deliveryReturn = null,
  careInstructions = null
) => {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO products (name, description, price, category_id, image_path, size_open, size_closed, weight_net, weight_gross, diameter, contents, delivery_return, care_instructions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        name,
        description,
        price,
        categoryId,
        imagePath,
        sizeOpen,
        sizeClosed,
        weightNet,
        weightGross,
        diameter,
        contents,
        deliveryReturn,
        careInstructions,
      ],
      function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      }
    );
  });
};

const updateProduct = (
  id,
  name,
  description,
  price,
  categoryId,
  imagePath,
  sizeOpen = null,
  sizeClosed = null,
  weightNet = null,
  weightGross = null,
  diameter = null,
  contents = null,
  deliveryReturn = null,
  careInstructions = null
) => {
  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE products SET name = ?, description = ?, price = ?, category_id = ?, image_path = ?, size_open = ?, size_closed = ?, weight_net = ?, weight_gross = ?, diameter = ?, contents = ?, delivery_return = ?, care_instructions = ? WHERE id = ?",
      [
        name,
        description,
        price,
        categoryId,
        imagePath,
        sizeOpen,
        sizeClosed,
        weightNet,
        weightGross,
        diameter,
        contents,
        deliveryReturn,
        careInstructions,
        id,
      ],
      function (err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      }
    );
  });
};

const deleteProduct = (id) => {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM products WHERE id = ?", [id], function (err) {
      if (err) reject(err);
      else resolve({ changes: this.changes });
    });
  });
};

// Функции для работы с множественными изображениями
const addProductImage = (productId, imagePath) => {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO product_images (product_id, image_path) VALUES (?, ?)",
      [productId, imagePath],
      function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      }
    );
  });
};

const getProductImages = (productId) => {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM product_images WHERE product_id = ? ORDER BY created_at ASC",
      [productId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
};

const deleteProductImage = (imageId) => {
  return new Promise((resolve, reject) => {
    db.run(
      "DELETE FROM product_images WHERE id = ?",
      [imageId],
      function (err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      }
    );
  });
};

// Получить данные одного изображения перед удалением (для удаления файла)
const getProductImageData = (imageId) => {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT image_path FROM product_images WHERE id = ?",
      [imageId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      }
    );
  });
};

const deleteProductImages = (productId) => {
  return new Promise((resolve, reject) => {
    db.run(
      "DELETE FROM product_images WHERE product_id = ?",
      [productId],
      function (err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      }
    );
  });
};

// Получить все пути изображений товара перед удалением
const getProductImagesForDeletion = (productId) => {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT image_path FROM product_images WHERE product_id = ?",
      [productId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
};

// Удалить физические файлы изображений с диска
const deleteProductImageFiles = async (imagePaths) => {
  for (const imageObj of imagePaths) {
    try {
      const filePath = path.join(__dirname, "../public", imageObj.image_path);
      await fs.unlink(filePath);
      console.log("✅ Удален файл:", filePath);
    } catch (err) {
      console.warn(
        "⚠️ Не удалось удалить файл:",
        imageObj.image_path,
        err.message
      );
    }
  }
};

// Получить первое изображение товара
const getFirstProductImage = (productId) => {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT image_path FROM product_images WHERE product_id = ? ORDER BY created_at ASC LIMIT 1",
      [productId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.image_path : null);
      }
    );
  });
};

// Обновить превью товара на первое оставшееся изображение
const updateProductPreview = (productId, imagePath) => {
  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE products SET image_path = ? WHERE id = ?",
      [imagePath, productId],
      function (err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      }
    );
  });
};

module.exports = {
  addAdmin,
  getAdminByUsername,
  getAdminById,
  updateAdminPassword,
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  getProducts,
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
};
