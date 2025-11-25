// index.js

document.addEventListener("DOMContentLoaded", () => {
  const splashScreen = document.getElementById("splash-screen");
  const startMenu = document.getElementById("start-menu");
  const btnInfoScript = document.getElementById("btn-infoscript");
  const btnStorePanel = document.getElementById("btn-storepanel");

  const splashDuration = 2000; 
  const fadeDuration = 800;

  // Tampilkan splash dulu
  setTimeout(() => {
    splashScreen.classList.add("fade-out");

    setTimeout(() => {
      splashScreen.style.display = "none";
      startMenu.style.display = "flex";  // Tampilkan menu pilihan
      startMenu.classList.add("fade-in");

    }, fadeDuration);

  }, splashDuration);

  // === TOMBOL INFOSCRIPT ===
  btnInfoScript.addEventListener("click", () => {
    window.location.href = "infoscript.html";
  });

  // === TOMBOL STORE PANEL ===
  btnStorePanel.addEventListener("click", () => {
    window.location.href = "user-dashboard.html";
  });
});
