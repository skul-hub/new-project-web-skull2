document.addEventListener("DOMContentLoaded", loadScripts);

async function loadScripts() {
  const { data, error } = await window.supabase
    .from("scripts")
    .select("*")
    .order("created_at", { ascending: false });

  const container = document.getElementById("scriptList");
  container.innerHTML = "";

  if (error) {
    container.innerHTML = "<p>Gagal memuat data.</p>";
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = "<p>Belum ada script tersedia.</p>";
    return;
  }

  data.forEach(s => {
    const div = document.createElement("div");
    div.className = "script-card";

    div.innerHTML = `
      <img src="${s.image_url}" alt="${s.name}" class="script-image">
      <h3>${s.name}</h3>
      <button onclick="window.location.href='${s.download_link}'">Download Script</button>
    `;

    container.appendChild(div);
  });
}
