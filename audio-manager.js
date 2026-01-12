// Audio manager for single page app
(function() {
  const AUDIO_KEY = "audioPlaying";
  
  const music = document.getElementById("bg-music");
  const popup = document.getElementById("audio-popup");
  const yesBtn = document.getElementById("music-yes");
  const noBtn = document.getElementById("music-no");
  
  // Check if user already approved audio
  const wasApproved = sessionStorage.getItem(AUDIO_KEY) === "true";
  
  if (wasApproved) {
    // Auto-play if already approved
    popup.style.display = "none";
    music.play().catch(err => console.log("Autoplay error:", err));
  }
  
  // Handle Yes button
  if (yesBtn) {
    yesBtn.addEventListener("click", () => {
      sessionStorage.setItem(AUDIO_KEY, "true");
      music.play().catch(err => console.log("Play error:", err));
      popup.style.display = "none";
    });
  }
  
  // Handle No button
  if (noBtn) {
    noBtn.addEventListener("click", () => {
      sessionStorage.setItem(AUDIO_KEY, "false");
      popup.style.display = "none";
    });
  }
})();
