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