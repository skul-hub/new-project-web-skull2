// index.js

document.addEventListener("DOMContentLoaded", () => {
  const splashScreen = document.getElementById("splash-screen");
  const splashDuration = 2000; // Durasi splash screen dalam milidetik (2 detik)
  const fadeOutDuration = 1000; // Durasi efek fade-out dalam milidetik (1 detik)

  setTimeout(() => {
    // Tambahkan kelas fade-out untuk memulai transisi
    splashScreen.classList.add("fade-out");

    // Setelah transisi fade-out selesai, redirect ke halaman user-dashboard.html
    setTimeout(() => {
      window.location.href = "user-dashboard.html";
    }, fadeOutDuration); // Tunggu sampai fade-out selesai
  }, splashDuration); // Tampilkan splash screen selama splashDuration sebelum fade-out
});
