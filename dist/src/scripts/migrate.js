const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "../database.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Ошибка подключения к БД:", err.message);
    process.exit(1);
  } else {
    console.log("✅ Подключено к БД для миграции");
    migrateDatabase();
  }
});

function migrateDatabase() {
  // Проверяем, есть ли колонка created_at в таблице categories
  db.all("PRAGMA table_info(categories)", [], (err, columns) => {
    if (err) {
      console.error("Ошибка при проверке categories:", err.message);
      return;
    }

    const hasCreatedAt = columns.some((col) => col.name === "created_at");

    if (!hasCreatedAt) {
      console.log("Добавляю колонку created_at в categories...");
      db.run("ALTER TABLE categories ADD COLUMN created_at DATETIME", (err) => {
        if (err) {
          console.error(
            "Ошибка при добавлении колонки в categories:",
            err.message
          );
        } else {
          // Установить текущую дату для всех существующих записей
          db.run(
            "UPDATE categories SET created_at = datetime('now') WHERE created_at IS NULL",
            (err) => {
              if (err) {
                console.error("Ошибка при обновлении categories:", err.message);
              } else {
                console.log("✅ Колонка created_at добавлена в categories");
              }
            }
          );
        }
      });
    } else {
      console.log("✅ Колонка created_at уже существует в categories");
    }
  });

  // Проверяем, есть ли колонка created_at в таблице products
  db.all("PRAGMA table_info(products)", [], (err, columns) => {
    if (err) {
      console.error("Ошибка при проверке products:", err.message);
      return;
    }

    const hasCreatedAt = columns.some((col) => col.name === "created_at");

    if (!hasCreatedAt) {
      console.log("Добавляю колонку created_at в products...");
      db.run("ALTER TABLE products ADD COLUMN created_at DATETIME", (err) => {
        if (err) {
          console.error(
            "Ошибка при добавлении колонки в products:",
            err.message
          );
        } else {
          // Установить текущую дату для всех существующих записей
          db.run(
            "UPDATE products SET created_at = datetime('now') WHERE created_at IS NULL",
            (err) => {
              if (err) {
                console.error("Ошибка при обновлении products:", err.message);
              } else {
                console.log("✅ Колонка created_at добавлена в products");
              }
              finishMigration();
            }
          );
        }
      });
    } else {
      console.log("✅ Колонка created_at уже существует в products");
      finishMigration();
    }
  });
}

function finishMigration() {
  setTimeout(() => {
    console.log("✅ Миграция завершена");
    db.close();
    process.exit(0);
  }, 500);
}
