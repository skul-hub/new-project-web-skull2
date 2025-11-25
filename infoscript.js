// infoscript.js
document.addEventListener("DOMContentLoaded", loadScripts);

async function loadScripts() {
  const { data, error } = await window.supabase
    .from("scripts")
    .select("*")
    .order("created_at", { ascending: false });

  const container = document.getElementById("scriptList");
  container.innerHTML = "";

  if (error) {
    container.innerHTML = "<p>Gagal memuat data script.</p>";
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = "<p>Belum ada script tersedia.</p>";
    return;
  }

  data.forEach(s => {
    const card = document.createElement("div");
    card.className = "script-card";
    card.setAttribute("data-aos", "fade-up");

    card.innerHTML = `
      <img src="${s.image_url || 'img/placeholder.png'}" alt="${s.name}" class="script-image" />
      <h3 class="script-name">${s.name}</h3>
      <div class="script-actions">
        <a href="${s.download_link}" target="_blank" class="primary-btn">Download</a>
      </div>
    `;

    container.appendChild(card);
  });
}
