(function () {
  const music = document.getElementById("bg-music");
  const popup = document.getElementById("audio-popup");
  const yesBtn = document.getElementById("music-yes");
  const noBtn = document.getElementById("music-no");

  const MUSIC_NORMAL = 0.4;
  const MUSIC_VIDEO = 0.002;

  let fadeTimer = null;
  let audioEnabled = false;

  function showPopup() {
    if (!popup) return;
    popup.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => {
      popup.classList.add("show");
    });
  }

  function hidePopup() {
    if (!popup) return;
    popup.classList.remove("show");
    popup.setAttribute("aria-hidden", "true");
  }

  function startMusic() {
    if (!music) return;

    audioEnabled = true;
    music.loop = true;
    music.volume = MUSIC_NORMAL;
    music.play().catch(() => {});
  }

  function fadeVolume(target, duration = 500) {
    if (!music || !audioEnabled) return;

    if (music.paused) {
      music.play().catch(() => {});
    }

    clearInterval(fadeTimer);

    const start = music.volume;
    const diff = target - start;
    const steps = 25;
    let step = 0;

    fadeTimer = setInterval(() => {
      step++;
      music.volume = Math.max(
        0,
        Math.min(1, start + (diff * step) / steps)
      );

      if (step >= steps) clearInterval(fadeTimer);
    }, duration / steps);
  }

  if (yesBtn) {
    yesBtn.addEventListener("click", () => {
      startMusic();
      hidePopup();
    });
  }

  if (noBtn) {
    noBtn.addEventListener("click", () => {
      audioEnabled = false;
      hidePopup();
    });
  }

  showPopup();

  /* ===============================
     PAGE LEVEL CONTROLS (LOGGED)
     =============================== */
  window.lowerMusicForVideoPage = function () {
    fadeVolume(MUSIC_VIDEO);
  };

  window.restoreMusicForHomePage = function () {
    fadeVolume(MUSIC_NORMAL);
  };
})();

  const pupils = document.querySelectorAll(".pupil");

  function moveEyes(x, y) {
    pupils.forEach(pupil => {
      const eye = pupil.parentElement;
      const rect = eye.getBoundingClientRect();

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = x - centerX;
      const dy = y - centerY;

      const angle = Math.atan2(dy, dx);
      const distance = Math.min(4, Math.hypot(dx, dy) / 12);

      pupil.style.transform =
        `translate(-50%, -50%) translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`;
    });
  }

  // Mouse
  window.addEventListener("mousemove", e => {
    moveEyes(e.clientX, e.clientY);
  });

  // Touch (mobile)
  window.addEventListener("touchmove", e => {
    if (e.touches.length > 0) {
      moveEyes(e.touches[0].clientX, e.touches[0].clientY);
    }
  });

document.addEventListener("mousemove", moveEyes);
document.addEventListener("touchmove", e => {
  if (e.touches[0]) moveEyes(e.touches[0]);
});

function moveEyes(e) {
  document.querySelectorAll(".eye").forEach(eye => {
    const pupil = eye.querySelector(".pupil");
    const glow = eye.querySelector(".pupil-glow");

    const rect = eye.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    const angle = Math.atan2(y, x);
    const radius = rect.width * 0.15;

    const dx = Math.cos(angle) * radius;
    const dy = Math.sin(angle) * radius;

    pupil.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px)`;
    glow.style.transform  = `translate(-50%, -50%) translate(${dx}px, ${dy}px)`;
  });
}

let lastScrollY = window.scrollY;
let scrollOffset = 0;

// 🔹 SCROLL REACTION
window.addEventListener("scroll", () => {
  const currentScroll = window.scrollY;
  const delta = currentScroll - lastScrollY;

  // clamp movement
  scrollOffset = Math.max(-4, Math.min(4, delta * 0.15));

  document.querySelectorAll(".pupil, .iris").forEach(el => {
    el.style.transform = `translate(-50%, calc(-50% + ${scrollOffset}px))`;
  });

  lastScrollY = currentScroll;
});

// 🔹 RESET after scroll stops
let scrollTimeout;
window.addEventListener("scroll", () => {
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    document.querySelectorAll(".pupil, .iris").forEach(el => {
      el.style.transform = "translate(-50%, -50%)";
    });
  }, 120);
});

// 🔹 CUTE RANDOM WIGGLE
setInterval(() => {
  if (Math.random() > 0.6) {   // not too often
    document.querySelectorAll(".eye").forEach(eye => {
      eye.classList.add("wiggle");
      setTimeout(() => eye.classList.remove("wiggle"), 450);
    });
  }
}, 7000);

const footerText = document.querySelector(".handwrite");

const observer = new IntersectionObserver(
  ([entry]) => {
    if (entry.isIntersecting) {
      footerText.style.animationPlayState = "running";
      observer.disconnect(); // run only once
    }
  },
  {
    threshold: 0.6 // triggers when 60% visible
  }
);

observer.observe(footerText);


fetch('https://sa6h1n.goatcounter.com/counter/TOTAL.json')
  .then(res => res.json())
  .then(data => {
    const el = document.getElementById('visitor-count');

    // ✅ Remove commas and convert safely
    const target = Number(data.count.replace(/,/g, ''));
    let current = 0;

    const duration = 600; // ms
    const steps = 20;
    const increment = Math.ceil(target / steps);
    const intervalTime = duration / steps;

    const interval = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(interval);
      }
      el.textContent = current.toLocaleString();
    }, intervalTime);

    el.classList.add('loaded');
  });

  const parallaxItems = document.querySelectorAll("[data-parallax]");

  window.addEventListener("scroll", () => {
    const scrollY = window.scrollY;

    parallaxItems.forEach(el => {
      const speed = el.getAttribute("data-parallax");
      el.style.transform = `translateY(${scrollY * speed}px)`;
    });
  });

(() => {
  const far = document.querySelector(".star-field");
  const near = document.querySelector(".star-near");

  if (!far || !near) return;

  let targetX = 0, targetY = 0;
  let currentX = 0, currentY = 0;

  function animate() {
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;

    // FAR stars — subtle
    far.style.transform =
      `translate(${currentX * 8}px, ${currentY * 8}px)`;

    // NEAR stars — stronger depth
    near.style.transform =
      `translate(${currentX * 18}px, ${currentY * 18}px)`;

    requestAnimationFrame(animate);
  }

  animate();

  // 🖱️ Mouse (Desktop)
  window.addEventListener("mousemove", e => {
    const x = (e.clientX / window.innerWidth - 0.5);
    const y = (e.clientY / window.innerHeight - 0.5);
    targetX = x;
    targetY = y;
  });

  // 📱 Touch (Mobile)
  window.addEventListener("touchmove", e => {
    if (!e.touches[0]) return;
    const t = e.touches[0];
    const x = (t.clientX / window.innerWidth - 0.5);
    const y = (t.clientY / window.innerHeight - 0.5);
    targetX = x;
    targetY = y;
  }, { passive: true });
})();

window.addEventListener("scroll", () => {
  const scrolled = window.scrollY;
  const hero = document.querySelector(".home-hero");

  if (!hero) return;

  hero.style.opacity = Math.max(1 - scrolled / 300, 0.6);
  hero.style.transform = `scale(${1 - scrolled / 1000})`;
});

/* ===============================
   DEPTH LIFT — GALLERY ONLY
   =============================== */

window.addEventListener("scroll", () => {
  const viewH = window.innerHeight;

  document.querySelectorAll(".scroll-gallery-card").forEach(card => {
    const rect = card.getBoundingClientRect();

    // Only animate when visible
    if (rect.bottom < 0 || rect.top > viewH) return;

    // Progress: bottom → center
    const progress = 1 - Math.abs(
      rect.top + rect.height / 2 - viewH / 2
    ) / (viewH / 2);

    const clamped = Math.max(0, Math.min(progress, 1));

    card.style.transform = `
      translateY(${20 * (1 - clamped)}px)
      scale(${0.96 + clamped * 0.04})
    `;

    card.style.opacity = 0.65 + clamped * 0.35;
  });
});



// 🎥 Continuous scroll animation for Video CTA


(() => {
  const container = document.getElementById("content-container");
  if (!container) return;

  const resetStyles = () => {
    // Reset home hero
    document.querySelectorAll(".home-hero").forEach(el => {
      el.style.opacity = "";
      el.style.transform = "";
    });

    // Reset video CTA / GIF box
    document.querySelectorAll(".edits-cta").forEach(el => {
      el.style.opacity = "";
      el.style.transform = "";
    });

    // Reset gallery cards
    document.querySelectorAll(".scroll-gallery-card").forEach(el => {
      el.style.opacity = "";
      el.style.transform = "";
    });
  };

  // Run once on load
  resetStyles();

  // Run every time SPA content changes
  const observer = new MutationObserver(() => {
    resetStyles();
  });

  observer.observe(container, {
    childList: true,
    subtree: true
  });
})();

window.addEventListener("scroll", () => {
  if (!document.body.classList.contains("home-page")) return;

  const videoCTA = document.querySelector(".edits-cta");
  if (!videoCTA) return;

  const rect = videoCTA.getBoundingClientRect();
  const windowH = window.innerHeight;

  const progress = Math.min(
    Math.max((windowH - rect.top) / windowH, 0),
    1
  );

  videoCTA.style.opacity = 0.6 + progress * 0.4;
  videoCTA.style.transform =
    `translateY(${20 * (1 - progress)}px) scale(${0.96 + progress * 0.04})`;
});
