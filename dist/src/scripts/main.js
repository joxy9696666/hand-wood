// Оптимизированный код для улучшенного взаимодействия
document.addEventListener("DOMContentLoaded", () => {
  // ===== МОБИЛЬНОЕ МЕНЮ =====
  const hamburger = document.querySelector(".hamburger");
  const navLinks = document.querySelector(".nav-links");
  const mainNav = document.querySelector(".main-nav");

  if (hamburger && navLinks) {
    hamburger.addEventListener("click", () => {
      hamburger.classList.toggle("active");
      navLinks.classList.toggle("active");
      hamburger.setAttribute(
        "aria-expanded",
        hamburger.classList.contains("active")
      );
    });

    // Закрытие меню при клике на ссылку
    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        hamburger.classList.remove("active");
        navLinks.classList.remove("active");
        hamburger.setAttribute("aria-expanded", "false");
      });
    });

    // Закрытие меню при клике вне его
    document.addEventListener("click", (e) => {
      if (!mainNav?.contains(e.target)) {
        hamburger.classList.remove("active");
        navLinks.classList.remove("active");
        hamburger.setAttribute("aria-expanded", "false");
      }
    });
  }

  // ===== ПЛАВНЫЙ СКРОЛЛ =====
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const href = this.getAttribute("href");
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  });

  // ===== НАБЛЮДЕНИЕ ЗА ЭЛЕМЕНТАМИ ПРИ СКРОЛЛЕ (ОПТИМИЗИРОВАНО) =====
  const observerOptions = {
    threshold: 0.12,
    rootMargin: "0px 0px -40px 0px",
  };

  const elementObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("animate-in");
        elementObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Наблюдение за элементами для анимации (используем CSS классы вместо inline styles)
  const elementsToObserve = document.querySelectorAll(
    ".gallery-item, .feature-card, .contact-card, .partnership-card, .service-card, .process-step"
  );

  elementsToObserve.forEach((el) => {
    el.classList.add("will-animate");
    elementObserver.observe(el);
  });

  // ===== ЛЕНИВАЯ ЗАГРУЗКА ИЗОБРАЖЕНИЙ =====
  // Инициализируется отдельным скриптом lazy-load.js

  // ===== ДИНАМИЧЕСКИЙ ХЕДЕР (ОПТИМИЗИРОВАНО) =====
  const header = document.querySelector(".header");
  let lastScrollTop = 0;
  let ticking = false;

  function updateHeaderOnScroll() {
    const scrollTop = window.scrollY;

    if (header) {
      if (scrollTop > 20) {
        header.style.padding = "0.8rem 0";
      } else {
        header.style.padding = "1rem 0";
      }
    }

    ticking = false;
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(updateHeaderOnScroll);
        ticking = true;
      }
    },
    { passive: true }
  );

  // ===== ФИЛЬТРАЦИЯ КАТЕГОРИЙ ГАЛЕРЕИ (ОПТИМИЗИРОВАНО) =====
  const categoryButtons = document.querySelectorAll(".category-btn");
  if (categoryButtons.length > 0) {
    categoryButtons.forEach((btn) => {
      btn.addEventListener("click", function () {
        // Обновление активной кнопки
        categoryButtons.forEach((b) => b.classList.remove("active"));
        this.classList.add("active");

        // Анимация элементов через CSS классы
        const galleryItems = document.querySelectorAll(".gallery-item");
        galleryItems.forEach((item) => {
          item.classList.remove("animate-in");
          // Trigger reflow и перезагрузить анимацию
          requestAnimationFrame(() => {
            item.classList.add("animate-in");
          });
        });
      });
    });
  }

  // ===== ВАЛИДАЦИЯ И УЛУЧШЕНИЕ ФОРМ =====
  const forms = document.querySelectorAll("form");
  forms.forEach((form) => {
    const inputs = form.querySelectorAll("input, textarea, select");

    inputs.forEach((input) => {
      // Визуальная обратная связь при фокусе
      input.addEventListener("focus", function () {
        this.parentElement.classList.add("focused");
      });

      input.addEventListener("blur", function () {
        this.parentElement.classList.remove("focused");
      });

      // Валидация в реальном времени
      input.addEventListener("change", function () {
        validateField(this);
      });
    });
  });

  // Функция валидации поля
  function validateField(field) {
    let isValid = true;

    if (field.hasAttribute("required") && !field.value.trim()) {
      isValid = false;
    } else if (field.type === "email" && field.value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      isValid = emailRegex.test(field.value);
    }

    if (isValid) {
      field.style.borderColor = "";
    }
  }

  // ===== ОПТИМИЗАЦИЯ ПРОИЗВОДИТЕЛЬНОСТИ =====
  // Дебаунсер для scroll событий
  let scrollTimer;
  window.addEventListener(
    "scroll",
    () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        // Выполнить действия после скролла
      }, 250);
    },
    { passive: true }
  );

  // Предварительная загрузка ссылок
  document.querySelectorAll("a[href^='/']").forEach((link) => {
    link.addEventListener(
      "mouseover",
      () => {
        const prefetch = document.createElement("link");
        prefetch.rel = "prefetch";
        prefetch.href = link.href;
        document.head.appendChild(prefetch);
      },
      { passive: true }
    );
  });
});

// ===== CSS АНИМАЦИИ И СТИЛИ ДЛЯ ОПТИМИЗИРОВАННОГО ВЗАИМОДЕЙСТВИЯ =====
const style = document.createElement("style");
style.textContent = `
  /* Оптимизированные анимации для производительности */
  .will-animate {
    opacity: 0;
    transform: translateY(20px);
  }

  .animate-in {
    animation: optimizedFadeInUp 0.5s ease-out forwards;
  }

  @keyframes optimizedFadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeInScale {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .form-field.focused {
    transition: all 0.2s ease;
  }

  /* Включаем GPU ускорение только для анимируемых элементов */
  .animate-in,
  .gallery-item:hover,
  .feature-card:hover {
    will-change: transform, opacity;
  }

  /* Отключаем will-change после анимации */
  .animate-in ~ * {
    will-change: auto;
  }
`;
document.head.appendChild(style);
