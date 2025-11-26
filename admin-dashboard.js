// ================================================
// ADMIN DASHBOARD SCRIPT FULL VERSION
// ================================================

const supabase = window.supabase;
let currentAdmin = null;

// =====================================================
// CEK LOGIN ADMIN
// =====================================================
async function checkAdmin() {
  const { data, error } = await supabase.auth.getUser();
  if (!data.user) {
    return window.location.href = "signin.html";
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, username")
    .eq("id", data.user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return window.location.href = "user-dashboard.html";
  }

  currentAdmin = profile;
  document.getElementById("adminName").textContent = profile.username;
}

document.addEventListener("DOMContentLoaded", () => {
  checkAdmin();
  showSection("productsSection");
  loadProducts();
  loadOrders();
  loadScripts();
  loadSettings();
});

// =====================================================
// SWITCH MENU
// =====================================================
function showSection(id) {
  document.querySelectorAll("section").forEach(sec => sec.style.display = "none");
  document.getElementById(id).style.display = "block";
}

// =====================================================
// PRODUK
// =====================================================
async function loadProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const container = document.getElementById("productsList");
  container.innerHTML = "";

  data.forEach(p => {
    const div = document.createElement("div");
    div.className = "item-box";
    div.innerHTML = `
      <p><b>${p.name}</b></p>
      <p>Harga: Rp ${Number(p.price).toLocaleString()}</p>
      <p>Kategori: ${p.category}</p>
      <p>Stock: ${p.stock}</p>
      <img src="${p.image}" class="thumb">

      <button onclick="editProduct('${p.id}', '${p.name}', '${p.price}', '${p.category}', '${p.stock}', '${p.image}')">Edit</button>
      <button onclick="deleteProduct('${p.id}')">Hapus</button>
    `;
    container.appendChild(div);
  });
}

// TAMBAH PRODUK
async function addProduct() {
  const name = document.getElementById("prodName").value.trim();
  const price = Number(document.getElementById("prodPrice").value);
  const category = document.getElementById("prodCategory").value;
  const stock = Number(document.getElementById("prodStock").value);
  const image = document.getElementById("prodImage").value.trim();

  if (!name || !price || !category) {
    alert("Isi semua data produk!");
    return;
  }

  const { error } = await supabase.from("products").insert([{
    name,
    price,
    category,
    stock,
    image,
    active: true
  }]);

  if (error) return alert("Gagal tambah produk: " + error.message);

  alert("Produk berhasil ditambahkan!");
  loadProducts();
}

// EDIT PRODUK
function editProduct(id, name, price, category, stock, image) {
  document.getElementById("editProdId").value = id;
  document.getElementById("editProdName").value = name;
  document.getElementById("editProdPrice").value = price;
  document.getElementById("editProdCategory").value = category;
  document.getElementById("editProdStock").value = stock;
  document.getElementById("editProdImage").value = image;

  document.getElementById("editModal").style.display = "flex";
}

// SIMPAN EDIT
async function saveEditProduct() {
  const id = document.getElementById("editProdId").value;
  const name = document.getElementById("editProdName").value.trim();
  const price = Number(document.getElementById("editProdPrice").value);
  const category = document.getElementById("editProdCategory").value;
  const stock = Number(document.getElementById("editProdStock").value);
  const image = document.getElementById("editProdImage").value.trim();

  const { error } = await supabase
    .from("products")
    .update({ name, price, category, stock, image })
    .eq("id", id);

  if (error) return alert("Gagal update produk: " + error.message);

  alert("Produk berhasil diupdate!");
  document.getElementById("editModal").style.display = "none";
  loadProducts();
}

// HAPUS PRODUK
async function deleteProduct(id) {
  if (!confirm("Hapus produk ini?")) return;

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return alert("Gagal hapus: " + error.message);

  loadProducts();
}

// =====================================================
// ORDER
// =====================================================
async function loadOrders() {
  const { data, error } = await supabase
    .from("orders_view")
    .select("*")
    .order("created_at", { ascending: false });

  const list = document.getElementById("ordersList");
  list.innerHTML = "";

  data.forEach(o => {
    const div = document.createElement("div");
    div.className = "item-box";

    div.innerHTML = `
      <p><b>${o.product_name}</b></p>
      <p>Harga: Rp ${Number(o.product_price).toLocaleString()}</p>
      <p>User: ${o.username}</p>
      <p>Status: ${o.status}</p>

      <button onclick="updateOrder('${o.id}', 'processing')">Processing</button>
      <button onclick="updateOrder('${o.id}', 'done')">Done</button>
      <button onclick="updateOrder('${o.id}', 'canceled')">Cancel</button>
    `;

    list.appendChild(div);
  });
}

async function updateOrder(id, status) {
  await supabase.from("orders").update({ status }).eq("id", id);
  loadOrders();
}

// =====================================================
// SCRIPTS
// =====================================================
async function loadScripts() {
  const { data } = await supabase
    .from("scripts")
    .select("*")
    .order("created_at", { ascending: false });

  const list = document.getElementById("scriptsList");
  list.innerHTML = "";

  data.forEach(s => {
    const div = document.createElement("div");
    div.className = "item-box";
    div.innerHTML = `
      <p><b>${s.name}</b></p>
      <img src="${s.image_url}" class="thumb">
      <p>Download: <a href="${s.download_link}" target="_blank">Klik</a></p>
      <button onclick="deleteScript('${s.id}')">Hapus Script</button>
    `;
    list.appendChild(div);
  });
}

async function addScript() {
  const name = document.getElementById("scriptName").value.trim();
  const image_url = document.getElementById("scriptImg").value.trim();
  const download_link = document.getElementById("scriptLink").value.trim();

  if (!name || !download_link) {
    alert("Nama & Link wajib diisi!");
    return;
  }

  const { error } = await supabase.from("scripts").insert([{ name, image_url, download_link }]);

  if (error) return alert("Gagal tambah script: " + error.message);

  alert("Script berhasil ditambahkan!");
  loadScripts();
}

async function deleteScript(id) {
  if (!confirm("Hapus script ini?")) return;

  await supabase.from("scripts").delete().eq("id", id);
  loadScripts();
}

// =====================================================
// SETTING
// =====================================================
async function loadSettings() {
  const { data } = await supabase.from("settings").select("*").single();

  if (!data) return;

  document.getElementById("setAnnouncement").value = data.announcement || "";
  document.getElementById("setDana").value = data.dana_number || "";
  document.getElementById("setGopay").value = data.gopay_number || "";
  document.getElementById("setQris").value = data.qris_image_url || "";
}

async function saveSettings() {
  const announcement = document.getElementById("setAnnouncement").value;
  const dana_number = document.getElementById("setDana").value;
  const gopay_number = document.getElementById("setGopay").value;
  const qris_image_url = document.getElementById("setQris").value;

  const { error } = await supabase
    .from("settings")
    .update({
      announcement,
      dana_number,
      gopay_number,
      qris_image_url,
      updated_at: new Date()
    })
    .eq("id", 1);

  if (error) return alert("Gagal simpan pengaturan!");

  alert("Pengaturan berhasil disimpan!");
}

// =====================================================
// LOGOUT
// =====================================================
async function logout() {
  await supabase.auth.signOut();
  window.location.href = "signin.html";
}rror;
  if (existingSettings) {
    ({ error } = await window.supabase
      .from("settings")
      .update({ qris_image_url: qrisImageUrl, updated_at: new Date() })
      .eq("id", existingSettings.id));
  } else {
    ({ error } = await window.supabase
      .from("settings")
      .insert([{ qris_image_url: qrisImageUrl }]));
  }

  if (error) {
    alert("Gagal menyimpan URL QRIS: " + error.message);
    return;
  }

  alert("Gambar QRIS berhasil diupload dan disimpan!");
  document.getElementById("uploadQrisForm").reset();
  loadQrisSettings();
}

async function saveDanaNumber(event) {
  event.preventDefault();
  const danaNumber = document.getElementById("danaNumber").value.trim();

  if (!danaNumber) {
    alert("Masukkan nomor Dana!");
    return;
  }

  const { data: existingSettings, error: fetchError } = await window.supabase
    .from("settings")
    .select("id")
    .limit(1)
    .single();

  let error;
  if (existingSettings) {
    ({ error } = await window.supabase
      .from("settings")
      .update({ dana_number: danaNumber, updated_at: new Date() })
      .eq("id", existingSettings.id));
  } else {
    ({ error } = await window.supabase
      .from("settings")
      .insert([{ dana_number: danaNumber }]));
  }

  if (error) {
    alert("Gagal menyimpan nomor Dana: " + error.message);
    return;
  }

  alert("Nomor Dana berhasil disimpan!");
  loadQrisSettings();
}

async function saveGopayNumber(event) {
  event.preventDefault();
  const gopayNumber = document.getElementById("gopayNumber").value.trim();

  if (!gopayNumber) {
    alert("Masukkan nomor GoPay!");
    return;
  }

  const { data: existingSettings, error: fetchError } = await window.supabase
    .from("settings")
    .select("id")
    .limit(1)
    .single();

  let error;
  if (existingSettings) {
    ({ error } = await window.supabase
      .from("settings")
      .update({ gopay_number: gopayNumber, updated_at: new Date() })
      .eq("id", existingSettings.id));
  } else {
    ({ error } = await window.supabase
      .from("settings")
      .insert([{ gopay_number: gopayNumber }]));
  }

  if (error) {
    alert("Gagal menyimpan nomor GoPay: " + error.message);
    return;
  }

  alert("Nomor GoPay berhasil disimpan!");
  loadQrisSettings();
}

async function saveAnnouncement(event) {
  event.preventDefault();
  const announcementText = document.getElementById("announcementText").value;

  const { data: existingSettings, error: fetchError } = await window.supabase
    .from("settings")
    .select("id")
    .limit(1)
    .single();

  let error;
  if (existingSettings) {
    ({ error } = await window.supabase
      .from("settings")
      .update({ announcement: announcementText, updated_at: new Date() })
      .eq("id", existingSettings.id));
  } else {
    ({ error } = await window.supabase
      .from("settings")
      .insert([{ announcement: announcementText }]));
  }

  if (error) {
    alert("Gagal menyimpan pengumuman: " + error.message);
    return;
  }

  alert("Pengumuman berhasil disimpan!");
  loadQrisSettings();
}

// Fungsi baru untuk memuat dan menampilkan rating
async function loadRatings() {
  const { data: ratings, error } = await window.supabase
    .from("ratings")
    .select(`
      id,
      rating,
      comment,
      created_at,
      users(username),
      products(name)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading ratings:", error);
    return;
  }

  const container = document.getElementById("ratingsList");
  container.innerHTML = "";

  if (ratings && ratings.length > 0) {
    // Tampilkan statistik rating
    displayRatingStatistics(ratings);

    const table = document.createElement("table");
    table.className = "ratings-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th>User</th>
          <th>Produk</th>
          <th>Rating</th>
          <th>Komentar</th>
          <th>Tanggal</th>
          <th>Aksi</th>
        </tr>
      </thead>
      <tbody>
      </tbody>
    `;
    const tbody = table.querySelector("tbody");

    ratings.forEach((r) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.users ? r.users.username : 'N/A'}</td>
        <td>${r.products ? r.products.name : 'N/A'}</td>
        <td>${'⭐'.repeat(r.rating)} (${r.rating}/5)</td>
        <td>${r.comment || '-'}</td>
        <td>${new Date(r.created_at).toLocaleString()}</td>
        <td>
          <button onclick="deleteRating('${r.id}')" class="admin-button delete">🗑️ Hapus</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    container.appendChild(table);
  } else {
    // Reset statistik jika tidak ada rating
    document.getElementById("totalRatingsCount").textContent = "0";
    document.getElementById("averageRating").textContent = "0.0";
    for (let i = 1; i <= 5; i++) {
      document.getElementById(`star${i}Count`).textContent = "0";
      document.getElementById(`star${i}Percent`).textContent = "0%";
      document.getElementById(`star${i}Bar`).style.width = "0%";
    }
    container.innerHTML = "<p>Belum ada rating atau komentar.</p>";
  }
}

// Fungsi untuk menghapus rating
async function deleteRating(ratingId) {
  if (!confirm("Yakin ingin menghapus rating ini?")) return;

  const { error } = await window.supabase.from("ratings").delete().eq("id", ratingId);

  if (error) {
    alert("Gagal menghapus rating: " + error.message);
    console.error("Error deleting rating:", error);
    return;
  }

  alert("Rating berhasil dihapus.");
  loadRatings(); // Refresh daftar rating
}

// Fungsi untuk menampilkan statistik rating
function displayRatingStatistics(ratings) {
  const totalRatings = ratings.length;
  let sumRatings = 0;
  const starCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  ratings.forEach(r => {
    sumRatings += r.rating;
    starCounts[r.rating]++;
  });

  const averageRating = totalRatings > 0 ? (sumRatings / totalRatings).toFixed(1) : "0.0";

  document.getElementById("totalRatingsCount").textContent = totalRatings;
  document.getElementById("averageRating").textContent = averageRating;

  for (let i = 1; i <= 5; i++) {
    const count = starCounts[i];
    const percentage = totalRatings > 0 ? ((count / totalRatings) * 100).toFixed(1) : "0.0";
    document.getElementById(`star${i}Count`).textContent = count;
    document.getElementById(`star${i}Percent`).textContent = `${percentage}%`;
    document.getElementById(`star${i}Bar`).style.width = `${percentage}%`;
  }
}

async function savePromoMessages(event) {
  event.preventDefault();
  const promoText = document.getElementById("promoMessages").value.trim();
  const promoMessages = promoText ? promoText.split('\n').map(msg => msg.trim()).filter(msg => msg) : [];
  const { data: existingSettings, error: fetchError } = await window.supabase
    .from("settings")
    .select("id")
    .limit(1)
    .single();
  let error;
  if (existingSettings) {
    ({ error } = await window.supabase
      .from("settings")
      .update({ promo_messages: promoMessages, updated_at: new Date() })
      .eq("id", existingSettings.id));
  } else {
    ({ error } = await window.supabase
      .from("settings")
      .insert([{ promo_messages: promoMessages }]));
  }
  if (error) {
    alert("Gagal menyimpan promo: " + error.message);
    return;
  }
  alert("Promo berhasil disimpan!");
  loadQrisSettings();
}

async function logout() {
  await window.supabase.auth.signOut();
  window.location.href = "signin.html";
}

// di admin-dashboard.js (tambahkan fungsi ini)
async function loadScripts() {
  const { data, error } = await window.supabase.from("scripts").select("*");
  const list = document.getElementById("scriptList");
  list.innerHTML = "";

  if (data.length === 0) {
     list.innerHTML = "<p>Belum ada script.</p>";
     return;
  }

  data.forEach(s => {
    list.innerHTML += `
      <div class="script-item">
        <img src="${s.image}" />
        <h3>${s.name}</h3>
        <a href="${s.link}" target="_blank">Lihat Script</a>
      </div>
    `;
  });
}

async function addScript(e) {
  e.preventDefault();

  const name = document.getElementById("scriptName").value;
  const link = document.getElementById("scriptLink").value;
  const file = document.getElementById("scriptImage").files[0];

  const fileName = Date.now() + "_" + file.name;
  const path = "scripts/" + fileName;

  const { error: uploadErr } = await window.supabase.storage.from("script_images").upload(path, file);
  if (uploadErr) {
    alert("Gagal upload gambar.");
    return;
  }

  const { data: imgURL } = window.supabase.storage.from("script_images").getPublicUrl(path);

  const { error } = await window.supabase.from("scripts").insert([
    { name, link, image: imgURL.publicUrl }
  ]);

  if (error) {
    alert("Gagal menambah script.");
    return;
  }

  alert("Berhasil menambah script!");
  loadScripts();
}
window.onload = checkAdminAuth;
