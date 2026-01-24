(function () {
  const music = document.getElementById("bg-music");
  if (!music) return;

  /* ===============================
     MUSIC LEVELS
     =============================== */
  const MUSIC_NORMAL = 0.4;   // Home page volume
  const MUSIC_VIDEO  = 0.002; // Video page volume (very low)

  let fadeTimer = null;

  /* ===============================
     SMOOTH FADE
     =============================== */
  function fadeVolume(target, duration = 500) {
    // Ensure music is playing
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

      if (step >= steps) {
        clearInterval(fadeTimer);
      }
    }, duration / steps);
  }

  /* ===============================
     START MUSIC ON LOAD
     =============================== */
  music.volume = MUSIC_NORMAL;
  music.loop = true;
  music.play().catch(() => {});

  /* ===============================
     PAGE-LEVEL CONTROLS
     =============================== */
  window.lowerMusicForVideoPage = function () {
    fadeVolume(MUSIC_VIDEO);
  };

  window.restoreMusicForHomePage = function () {
    fadeVolume(MUSIC_NORMAL);
  };
})();
