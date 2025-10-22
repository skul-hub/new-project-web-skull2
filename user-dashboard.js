document.addEventListener("DOMContentLoaded", () => {
  checkLogin();
  loadProducts();
});

async function checkLogin() {
  const session = localStorage.getItem("admin_session");
  if (!session) {
    window.location.href = "login.html";
  }
}

// ========== LOGOUT ==========
function logout() {
  localStorage.removeItem("admin_session");
  window.location.href = "login.html";
}

// ========== SHOW SECTION ==========
function showSection(section) {
  document.querySelectorAll("main section").forEach((sec) => (sec.style.display = "none"));
  document.getElementById(section).style.display = "block";
  if (section === "settings") {
    loadQrisSettings();
    loadPaymentSettings();
    loadAnnouncement();
  }
}

// ========== TAMBAH PRODUK ==========
async function addProduct(e) {
  e.preventDefault();
  const name = document.getElementById("productName").value.trim();
  const price = parseInt(document.getElementById("productPrice").value);
  const category = document.getElementById("productCategory").value;
  const stock = parseInt(document.getElementById("productStock").value) || 0;
  const file = document.getElementById("productImage").files[0];

  if (!name || !price || !category || !file) return alert("Isi semua kolom!");

  const filePath = `products/${Date.now()}_${file.name}`;
  const { error: uploadError } = await window.supabase.storage.from("product_images").upload(filePath, file);
  if (uploadError) return alert("Gagal upload gambar: " + uploadError.message);

  const { data: urlData } = window.supabase.storage.from("product_images").getPublicUrl(filePath);
  const imageUrl = urlData.publicUrl;

  const { error } = await window.supabase.from("products").insert([
    {
      name,
      price,
      category,
      stock,
      image_url: imageUrl,
    },
  ]);

  if (error) return alert("Gagal menambahkan produk: " + error.message);
  alert("Produk berhasil ditambahkan!");
  e.target.reset();
  loadProducts();
}

// ========== LOAD PRODUK ==========
async function loadProducts() {
  const { data, error } = await window.supabase.from("products").select("*").order("id", { ascending: false });
  if (error) return console.error(error);

  const container = document.getElementById("productsList");
  container.innerHTML = "";
  data.forEach((p) => {
    const div = document.createElement("div");
    div.className = "product-item";
    div.innerHTML = `
      <img src="${p.image_url}" alt="${p.name}" class="product-thumb">
      <div>
        <h3>${p.name}</h3>
        <p>Rp ${p.price.toLocaleString()}</p>
        <p>Kategori: ${p.category}</p>
        ${p.category === "game_account" ? `<p>Stok: ${p.stock}</p>` : ""}
        <button onclick="deleteProduct(${p.id})">Hapus</button>
      </div>
    `;
    container.appendChild(div);
  });
}

// ========== HAPUS PRODUK ==========
async function deleteProduct(id) {
  if (!confirm("Yakin ingin menghapus produk ini?")) return;
  const { error } = await window.supabase.from("products").delete().eq("id", id);
  if (error) return alert("Gagal hapus: " + error.message);
  alert("Produk berhasil dihapus.");
  loadProducts();
}

// ========== QRIS UPLOAD ==========
async function uploadQrisImage(e) {
  e.preventDefault();
  const file = document.getElementById("qrisImageFile").files[0];
  if (!file) return alert("Pilih gambar QRIS dulu!");

  const filePath = `qris/${Date.now()}_${file.name}`;
  const { error: uploadError } = await window.supabase.storage.from("qris_images").upload(filePath, file);
  if (uploadError) return alert("Gagal upload gambar: " + uploadError.message);

  const { data: urlData } = window.supabase.storage.from("qris_images").getPublicUrl(filePath);
  const imageUrl = urlData.publicUrl;

  const { data: existing } = await window.supabase.from("settings").select("id").limit(1).single();
  if (existing) {
    await window.supabase.from("settings").update({ qris_image_url: imageUrl }).eq("id", existing.id);
  } else {
    await window.supabase.from("settings").insert([{ qris_image_url: imageUrl }]);
  }

  alert("QRIS berhasil disimpan!");
  loadQrisSettings();
}

// ========== QRIS LOAD ==========
async function loadQrisSettings() {
  const { data, error } = await window.supabase.from("settings").select("qris_image_url").single();
  if (error && error.code !== "PGRST116") {
    console.error(error);
    return;
  }

  const img = document.getElementById("currentQrisImage");
  const msg = document.getElementById("noQrisMessage");

  if (data && data.qris_image_url) {
    img.src = data.qris_image_url;
    img.style.display = "block";
    msg.style.display = "none";
  } else {
    img.style.display = "none";
    msg.style.display = "block";
  }
}

// ========== SIMPAN NOMOR DANA & GOPAY ==========
async function savePaymentSettings(e) {
  e.preventDefault();
  const dana = document.getElementById("danaNumber").value.trim();
  const gopay = document.getElementById("gopayNumber").value.trim();

  const { data: existing, error: e1 } = await window.supabase.from("settings").select("id").limit(1).single();
  let error;
  if (existing) {
    ({ error } = await window.supabase
      .from("settings")
      .update({ dana_number: dana, gopay_number: gopay })
      .eq("id", existing.id));
  } else {
    ({ error } = await window.supabase.from("settings").insert([{ dana_number: dana, gopay_number: gopay }]));
  }

  if (error) return alert("Gagal menyimpan: " + error.message);
  alert("Nomor pembayaran berhasil disimpan!");
  loadPaymentSettings();
}

// ========== LOAD NOMOR DANA & GOPAY ==========
async function loadPaymentSettings() {
  const { data, error } = await window.supabase.from("settings").select("dana_number, gopay_number").single();
  if (error && error.code !== "PGRST116") return console.error(error);
  document.getElementById("danaNumber").value = data?.dana_number || "";
  document.getElementById("gopayNumber").value = data?.gopay_number || "";
}

// ========== PENGUMUMAN ==========
async function saveAnnouncement(e) {
  e.preventDefault();
  const text = document.getElementById("announcementText").value.trim();
  const { data: existing } = await window.supabase.from("settings").select("id").limit(1).single();

  let error;
  if (existing) {
    ({ error } = await window.supabase.from("settings").update({ announcement: text }).eq("id", existing.id));
  } else {
    ({ error } = await window.supabase.from("settings").insert([{ announcement: text }]));
  }

  if (error) return alert("Gagal menyimpan pengumuman: " + error.message);
  alert("Pengumuman berhasil disimpan!");
}

async function loadAnnouncement() {
  const { data, error } = await window.supabase.from("settings").select("announcement").single();
  if (error && error.code !== "PGRST116") return console.error(error);
  document.getElementById("announcementText").value = data?.announcement || "";
}
