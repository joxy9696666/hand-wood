const bcrypt = require("bcrypt");
const { addAdmin, getAdminByUsername } = require("../services/db");

const createFirstAdmin = async () => {
  // Учетные данные по умолчанию для первого входа
  const defaultUsername = "admin";
  const defaultPassword = "admin123"; // ИЗМЕНИТЕ ПАРОЛЬ ПОСЛЕ ПЕРВОГО ВХОДА!

  try {
    const existingAdmin = await getAdminByUsername(defaultUsername);

    if (existingAdmin) {
      console.log("✅ Администратор уже существует");
      return;
    }

    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Добавление первого администратора
    await addAdmin(defaultUsername, hashedPassword);

    console.log("✅ Первый администратор успешно создан!");
    console.log(`📝 Учетные данные для входа:`);
    console.log(`   Имя пользователя: ${defaultUsername}`);
    console.log(`   Пароль: ${defaultPassword}`);
    console.log("⚠️  ВНИМАНИЕ: Измените пароль сразу после первого входа!");
  } catch (error) {
    console.error("❌ Ошибка при создании администратора:", error.message);
  }
};

// Выполнение функции при запуске
if (require.main === module) {
  createFirstAdmin().then(() => process.exit(0));
}

module.exports = { createFirstAdmin };
