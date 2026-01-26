(function () {
  const AUDIO_KEY = "audioPlaying";

  const music = document.getElementById("bg-music");
  const popup = document.getElementById("audio-popup");
  const yesBtn = document.getElementById("music-yes");
  const noBtn = document.getElementById("music-no");

  const MUSIC_NORMAL = 0.4;
  const MUSIC_VIDEO = 0.002;

  let fadeTimer = null;

  function fadeVolume(target, duration = 500) {
    if (!music) return;

    // 🔥 FORCE PLAY BEFORE FADING
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

  /* ===============================
     INITIAL LOAD
     =============================== */
  const approved = sessionStorage.getItem(AUDIO_KEY);

  if (approved === "true" && music) {
    popup.style.display = "none";
    music.volume = MUSIC_NORMAL;
    music.loop = true;
    music.play().catch(() => {});
  }

  if (approved === "false") {
    popup.style.display = "none";
  }

  /* ===============================
     AUDIO POPUP
     =============================== */
  if (yesBtn && noBtn) {
    yesBtn.addEventListener("click", () => {
      sessionStorage.setItem(AUDIO_KEY, "true");
      popup.style.display = "none";

      music.volume = MUSIC_NORMAL;
      music.loop = true;
      music.play().catch(() => {});
    });

    noBtn.addEventListener("click", () => {
      sessionStorage.setItem(AUDIO_KEY, "false");
      popup.style.display = "none";
    });
  }

  /* ===============================
     PAGE LEVEL CONTROLS (LOGGED)
     =============================== */
  window.lowerMusicForVideoPage = function () {
    console.log("🔉 Lowering music for video page");
    fadeVolume(MUSIC_VIDEO);
  };

  window.restoreMusicForHomePage = function () {
    console.log("🔊 Restoring music for home page");
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

  /* ================================
   🌌 FAST STAR WARP INTRO
   (clean + short + smooth)
================================ */

(() => {
  const canvas = document.getElementById("space-intro");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  // Fullscreen overlay
  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.zIndex = "99999";
  canvas.style.pointerEvents = "none";
  canvas.style.background = "black";

  let w, h;
  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  // ⭐ Stars
  const STAR_COUNT = 2000;
  const stars = [];

  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: Math.random() * w - w / 2,
      y: Math.random() * h - h / 2,
      z: Math.random() * w
    });
  }

  let speed = 4;        // start fast
  let frame = 0;
  const MAX_FRAMES = 45;
  let fading = false;
  let fade = 0;

  function animate() {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, w, h);

    ctx.translate(w / 2, h / 2);

    stars.forEach(s => {
      s.z -= speed;
      if (s.z <= 0) s.z = w;

      const x = (s.x / s.z) * w;
      const y = (s.y / s.z) * w;
      const size = (1 - s.z / w) * 2;

      ctx.fillStyle = "white";
      ctx.fillRect(x, y, size, size);
    });

    ctx.resetTransform();

    frame++;

    // Trigger fade
    if (frame > MAX_FRAMES) fading = true;

    if (fading) {
      fade += 0.08;
      ctx.fillStyle = `rgba(0,0,0,${fade})`;
      ctx.fillRect(0, 0, w, h);

      if (fade >= 1) {
        endIntro();
        return;
      }
    }

    requestAnimationFrame(animate);
  }

  function endIntro() {
    canvas.style.transition = "opacity 0.6s ease";
    canvas.style.opacity = "0";
    setTimeout(() => canvas.remove(), 600);
  }

  animate();
})();

 