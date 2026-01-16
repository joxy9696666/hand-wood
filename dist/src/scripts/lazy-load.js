/**
 * Lazy Loading для изображений товаров
 * Использует Intersection Observer API для эффективной загрузки
 */

// Инициализация Intersection Observer
function initLazyLoading() {
  const imageObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          const src = img.dataset.src;
          const srcset = img.dataset.srcset;

          if (src) {
            img.src = src;
          }
          if (srcset) {
            img.srcset = srcset;
          }

          // Добавляем класс для фading effect
          img.classList.add("lazy-loaded");
          observer.unobserve(img);
        }
      });
    },
    {
      rootMargin: "50px", // Начинаем загрузку за 50px до появления в viewport
      threshold: 0.01,
    }
  );

  // Находим все изображения с классом lazy-img
  document.querySelectorAll("img.lazy-img").forEach((img) => {
    imageObserver.observe(img);
  });
}

// Инициализация при загрузке DOM
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLazyLoading);
} else {
  initLazyLoading();
}

/**
 * Debouncе функция для оптимизации обработчиков событий
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Обновление lazy loading при добавлении новых элементов (например, после фильтрации)
 */
function updateLazyLoading() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          const src = img.dataset.src;
          const srcset = img.dataset.srcset;

          if (src) {
            img.src = src;
          }
          if (srcset) {
            img.srcset = srcset;
          }

          img.classList.add("lazy-loaded");
          observer.unobserve(img);
        }
      });
    },
    {
      rootMargin: "50px",
      threshold: 0.01,
    }
  );

  document.querySelectorAll("img.lazy-img:not(.lazy-loaded)").forEach((img) => {
    observer.observe(img);
  });
}

// Экспортируем для использования в других скриптах
window.lazyLoadUtils = {
  updateLazyLoading,
  debounce,
};
