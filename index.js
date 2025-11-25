// index.js - FIXED VERSION FOR YOUR INDEX.HTML

document.addEventListener("DOMContentLoaded", () => {
  const wrapper = document.getElementById("startWrapper");
  const btnInfo = document.getElementById("btnInfoscript");
  const btnPanel = document.getElementById("btnStorepanel");

  // Efek fade-in halus
  wrapper.style.opacity = "0";
  wrapper.style.transition = "opacity 1s ease";

  setTimeout(() => {
    wrapper.style.opacity = "1";
  }, 200);

  // === INFOSCRIPT ===
  btnInfo.addEventListener("click", () => {
    window.location.href = "infoscript.html";
  });

  // === STORE PANEL ===
  btnPanel.addEventListener("click", () => {
    window.location.href = "user-dashboard.html";
  });
});
