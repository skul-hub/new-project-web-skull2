// =========================
// ADMIN DASHBOARD FULL JS
// =========================

let currentAdmin = null;

// CEK LOGIN ADMIN
async function checkAdminAuth() {
  const { data: { user } } = await window.supabase.auth.getUser();

  if (!user) {
    window.location.href = "signin.html";
    return;
  }

  const { data, error } = await window.supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!data || data.role !== "admin") {
    window.location.href = "user-dashboard.html";
    return;
  }

  currentAdmin = user;
  loadAllAdminData();
}

// =============================
// LOAD SEMUA DATA ADMIN
// =============================
function loadAllAdminData() {
  loadProductsAdmin();
  loadOrdersAdmin();
  loadSettings();
  loadScripts();
}

// =============================
// NAVIGASI ADMIN
// =============================
function showSection(id) {
  document.querySelectorAll(".admin-section").forEach(sec => sec.style.display = "none");
  document.getElementById(id).style.display = "block";
}


// ==================================================================
// ======================  KELOLA SCRIPT  ============================
// ==================================================================

async function addScript() {
  const name = document.getElementById("scriptName").value.trim();
  const link = document.getElementById("scriptLink").value.trim();
  const file = document.getElementById("scriptImage").files[0];

  if (!name || !link || !file) {
    alert("Isi nama, link dan gambar script!");
    return;
  }

  // Upload gambar
  const fileName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
  const path = `script/${fileName}`;

  const { error: uploadErr } = await window.supabase
    .storage
    .from("script_images")
    .upload(path, file);

  if (uploadErr) {
    alert("Gagal upload gambar!");
    console.error(uploadErr);
    return;
  }

  const { data: urlData } = window.supabase
    .storage
    .from("script_images")
    .getPublicUrl(path);

  // Insert database
  const { error: insertErr } = await window.supabase
    .from("scripts")
    .insert([
      { name, link, image_url: urlData.publicUrl, image_path: path }
    ]);

  if (insertErr) {
    alert("Gagal menambah script!");
    console.error(insertErr);
  } else {
    alert("Script berhasil ditambahkan!");
    loadScripts();
  }
}

async function loadScripts() {
  const { data } = await window.supabase.from("scripts").select("*");

  const container = document.getElementById("scriptList");
  container.innerHTML = "";

  if (!data || data.length === 0) {
    container.innerHTML = "<p>Belum ada script.</p>";
    return;
  }

  data.forEach(s => {
    const div = document.createElement("div");
    div.className = "admin-card";

    div.innerHTML = `
      <img src="${s.image_url}" class="admin-img">
      <h4>${s.name}</h4>
      <p><a href="${s.link}" target="_blank">Lihat Link</a></p>
      <button class="admin-button danger" onclick="deleteScript(${s.id}, '${s.image_path}')">Hapus</button>
    `;

    container.appendChild(div);
  });
}

async function deleteScript(id, imagePath) {
  if (!confirm("Yakin hapus script ini?")) return;

  // Hapus file storage
  await window.supabase.storage
    .from("script_images")
    .remove([imagePath]);

  // Hapus database
  await window.supabase
    .from("scripts")
    .delete()
    .eq("id", id);

  alert("Script dihapus.");
  loadScripts();
}



// ==================================================================
// ======================  PRODUK ADMIN  =============================
// ==================================================================

async function loadProductsAdmin() {
  const container = document.getElementById("adminProductsList");
  container.innerHTML = "<p>Loading...</p>";

  const { data, error } = await window.supabase.from("products").select("*");

  if (error) return container.innerHTML = "<p>Gagal memuat produk.</p>";

  container.innerHTML = "";
  data.forEach(p => {
    const div = document.createElement("div");
    div.className = "admin-card";

    div.innerHTML = `
      <img src="${p.image}" class="admin-img">

      <h4>${p.name}</h4>
      <p>Rp ${p.price.toLocaleString()}</p>

      <button class="admin-button danger" onclick="deleteProduct('${p.id}')">Hapus</button>
    `;

    container.appendChild(div);
  });
}

async function deleteProduct(id) {
  if (!confirm("Hapus produk?")) return;

  await window.supabase.from("products").delete().eq("id", id);

  alert("Produk dihapus.");
  loadProductsAdmin();
}



// ==================================================================
// ======================  PESANAN ADMIN  ============================
// ==================================================================

async function loadOrdersAdmin() {
  const container = document.getElementById("adminOrdersList");
  container.innerHTML = "<p>Loading...</p>";

  const { data, error } = await window.supabase
    .from("orders_view")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return container.innerHTML = "<p>Gagal memuat pesanan.</p>";

  container.innerHTML = "";
  data.forEach(o => {
    const div = document.createElement("div");
    div.className = "admin-card";

    div.innerHTML = `
      <p><strong>${o.product_name}</strong></p>
      <p>User: ${o.username}</p>
      <p>Status: <strong>${o.status}</strong></p>
      <p>Email: ${o.contact_email}</p>
      <p>Bukti: ${o.payment_proof ? `<a href="${o.payment_proof}" target="_blank">Lihat</a>` : "-"}</p>

      <button class="admin-button" onclick="updateOrderStatus('${o.id}', 'done')">Selesai</button>
      <button class="admin-button danger" onclick="updateOrderStatus('${o.id}', 'rejected')">Tolak</button>
    `;

    container.appendChild(div);
  });
}

async function updateOrderStatus(id, status) {
  await window.supabase
    .from("orders")
    .update({ status })
    .eq("id", id);

  alert("Status diperbarui.");
  loadOrdersAdmin();
}



// ==================================================================
// ======================  PENGATURAN ADMIN  ========================
// ==================================================================

async function loadSettings() {
  const { data } = await window.supabase
    .from("settings")
    .select("*")
    .single();

  if (!data) return;

  // Isi pengumuman
  document.getElementById("announcementInput").value = data.announcement || "";

  // Isi promo
  document.getElementById("promoMessagesInput").value =
    data.promo_messages?.join("\n") || "";

  // Nomor pembayaran
  document.getElementById("inputDana").value = data.dana_number || "";
  document.getElementById("inputOvo").value = data.ovo_number || "";
  document.getElementById("inputGopay").value = data.gopay_number || "";
}

async function saveAnnouncement() {
  const text = document.getElementById("announcementInput").value;

  await window.supabase
    .from("settings")
    .update({ announcement: text })
    .eq("id", 1);

  alert("Pengumuman disimpan.");
}

async function savePromoMessages() {
  const raw = document.getElementById("promoMessagesInput").value.trim();
  const list = raw.split("\n").filter(x => x.length > 0);

  await window.supabase
    .from("settings")
    .update({ promo_messages: list })
    .eq("id", 1);

  alert("Promo disimpan.");
}

async function uploadQris() {
  const file = document.getElementById("qrisUpload").files[0];

  if (!file) return alert("Pilih gambar QRIS.");

  const fileName = `qris_${Date.now()}.jpg`;

  const { error } = await window.supabase.storage
    .from("qris")
    .upload(fileName, file);

  if (error) {
    alert("Gagal upload QRIS.");
    return;
  }

  const { data: urlData } = window.supabase.storage
    .from("qris")
    .getPublicUrl(fileName);

  await window.supabase
    .from("settings")
    .update({ qris_image_url: urlData.publicUrl })
    .eq("id", 1);

  alert("QRIS berhasil diupload.");
}

async function savePaymentNumbers() {
  const dana = document.getElementById("inputDana").value;
  const ovo = document.getElementById("inputOvo").value;
  const gopay = document.getElementById("inputGopay").value;

  await window.supabase
    .from("settings")
    .update({
      dana_number: dana,
      ovo_number: ovo,
      gopay_number: gopay
    })
    .eq("id", 1);

  alert("Nomor pembayaran disimpan.");
}



// ===========================
// LOGOUT
// ===========================
async function logout() {
  await window.supabase.auth.signOut();
  window.location.href = "signin.html";
}



// ===========================
// START
// ===========================
checkAdminAuth();moTextarea.value = "";
    }
  } else {
    currentQrisImage.style.display = 'none';
    noQrisMessage.style.display = 'block';
    danaNumberInput.value = "";
    gopayNumberInput.value = "";
    announcementTextarea.value = "";
    document.getElementById("promoMessages").value = ""; // Reset promo jika tidak ada data
  }
}


async function uploadQrisImage(event) {
  event.preventDefault();
  const file = document.getElementById("qrisImageFile").files[0];

  if (!file) {
    alert("Pilih file gambar QRIS untuk diupload!");
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    alert("Ukuran gambar QRIS terlalu besar. Maksimal 2MB.");
    return;
  }

  const fileName = `qris_${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
  const { error: uploadError } = await window.supabase.storage.from("qris-images").upload(fileName, file, {
    cacheControl: '3600',
    upsert: false
  });

  if (uploadError) {
    alert("Gagal upload gambar QRIS: " + uploadError.message);
    return;
  }

  const { data: urlData } = window.supabase.storage.from("qris-images").getPublicUrl(fileName);
  const qrisImageUrl = urlData.publicUrl;

  const { data: existingSettings, error: fetchError } = await window.supabase
    .from("settings")
    .select("id")
    .limit(1)
    .single();

  let error;
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
