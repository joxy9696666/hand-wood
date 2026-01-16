const bcrypt = require("bcrypt");
const { addAdmin, getAdminByUsername } = require("../services/db");

const createFirstAdmin = async (username = null, password = null) => {
  // Приоритет: переменные окружения > параметры > значения по умолчанию
  const adminUsername = username || process.env.ADMIN_USERNAME || "admin";
  const adminPassword = password || process.env.ADMIN_PASSWORD || "admin123";

  try {
    const existingAdmin = await getAdminByUsername(adminUsername);

    if (existingAdmin) {
      console.log(`✅ Администратор "${adminUsername}" уже существует`);
      return true;
    }

    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Добавление первого администратора
    await addAdmin(adminUsername, hashedPassword);

    console.log("✅ Администратор успешно создан!");
    console.log(`📝 Учетные данные для входа:`);
    console.log(`   Имя пользователя: ${adminUsername}`);
    console.log(`   Пароль: ${adminPassword}`);
    console.log("⚠️  ВНИМАНИЕ: Измените пароль сразу после первого входа!");
    return true;
  } catch (error) {
    console.error("❌ Ошибка при создании администратора:", error.message);
    return false;
  }
};

// Выполнение функции при запуске скрипта
if (require.main === module) {
  createFirstAdmin().then(() => process.exit(0));
}

module.exports = { createFirstAdmin };
