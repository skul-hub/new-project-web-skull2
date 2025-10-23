// admin-dashboard.js
let currentAdmin = null;

async function checkAdminAuth() {
  const { data: { user }, error } = await window.supabase.auth.getUser();
  if (error || !user) {
    window.location.href = "signin.html";
    return;
  }

  const { data: userData } = await window.supabase.from("users").select("*").eq("id", user.id).single();
  if (!userData || userData.role !== "admin") {
    alert("Akses ditolak.");
    window.location.href = "signin.html";
    return;
  }

  currentAdmin = userData;
  showSection("products");
}

function showSection(section) {
  document.getElementById("products").style.display = "none";
  document.getElementById("orders").style.display = "none";
  document.getElementById("settings").style.display = "none";
  document.getElementById("ratings").style.display = "none"; // Tambahkan ini
  document.getElementById(section).style.display = "block";

  if (section === "products") loadProducts();
  if (section === "orders") loadOrders();
  if (section === "settings") loadQrisSettings();
  if (section === "ratings") loadRatings(); // Panggil fungsi baru
}

async function loadProducts() {
  const { data, error } = await window.supabase.from("products").select("*");
  if (error) return console.error(error);

  const container = document.getElementById("productsList");
  container.innerHTML = "";

  if (data && data.length > 0) {
    data.forEach((p) => {
      const safeName = p.name.replace(/'/g, "\\'");
      let stockInfo = '';
      let stockButtons = '';
      if (p.category === 'game_account') {
        stockInfo = ` | Stok: <strong>${p.stock}</strong>`;
        stockButtons = `
          <button onclick="updateProductStock('${p.id}', ${p.stock - 1})" class="admin-button">-</button>
          <button onclick="updateProductStock('${p.id}', ${p.stock + 1})" class="admin-button">+</button>
        `;
      }

      const div = document.createElement("div");
      div.innerHTML = `
        <p><strong>${p.name}</strong> - Rp ${p.price.toLocaleString()} (${p.category === 'panel_pterodactyl' ? 'Panel Pterodactyl' : 'Akun Game'})${stockInfo}</p>
        <div class="product-actions">
          ${stockButtons}
          <button onclick="deleteProduct('${p.id}')" class="admin-button delete">🗑️ Hapus</button>
          <button onclick="toggleProduct('${p.id}', ${p.active ? "false" : "true"})" class="admin-button">
            ${p.active ? "Nonaktifkan" : "Aktifkan"}
          </button>
        </div>
      `;
      container.appendChild(div);
    });
  } else {
    container.innerHTML = "<p>Tidak ada produk.</p>";
  }
}

async function addProduct(event) {
  event.preventDefault();
  const name = document.getElementById("productName").value;
  const price = parseInt(document.getElementById("productPrice").value, 10);
  const category = document.getElementById("productCategory").value;
  const stock = parseInt(document.getElementById("productStock").value, 10);
  const file = document.getElementById("productImage").files[0];

  if (!name || !price || !category || !file) {
    alert("Lengkapi semua field!");
    return;
  }
    if (category === 'game_account' && (isNaN(stock) || stock < 0)) {
    alert("Stok harus angka non-negatif untuk Akun Game.");
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    alert("Ukuran gambar terlalu besar. Maksimal 2MB.");
    return;
  }

  const fileName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
  const { error: upErr } = await window.supabase.storage.from("product-images").upload(fileName, file);
  if (upErr) {
    alert("Upload gagal: " + upErr.message);
    return;
  }

  const { data: urlData } = window.supabase.storage.from("product-images").getPublicUrl(fileName);

  const { error } = await window.supabase.from("products").insert([
    { name, price, image: urlData.publicUrl, active: true, category, stock: category === 'game_account' ? stock : null },
  ]);
  if (error) {
    alert("Gagal tambah produk: " + error.message);
    return;
  }

  alert("Produk berhasil ditambahkan!");
  document.getElementById("addProductForm").reset();
  document.getElementById("productImage").value = "";
  loadProducts();
}

async function deleteProduct(id) {
  if (!confirm("Yakin ingin menghapus produk ini?")) return;
  const { error } = await window.supabase.from("products").delete().eq("id", id);
  if (error) {
    alert("Gagal menghapus produk: " + error.message);
    return;
  }
  alert("Produk berhasil dihapus.");
  loadProducts();
}

async function toggleProduct(id, newStatus) {
  const { error } = await window.supabase
    .from("products")
    .update({ active: newStatus })
    .eq("id", id);

  if (error) {
    alert("Gagal mengubah status produk: " + error.message);
    return;
  }

  alert(`Produk berhasil di${newStatus ? "aktifkan" : "nonaktifkan"}.`);
  loadProducts();
}

async function updateProductStock(id, newStock) {
  if (newStock < 0) {
    alert("Stok tidak bisa kurang dari 0.");
    return;
  }
  const { error } = await window.supabase
    .from("products")
    .update({ stock: newStock })
    .eq("id", id);

  if (error) {
    alert("Gagal mengubah stok produk: " + error.message);
    return;
  }

  alert("Stok produk berhasil diupdate.");
  loadProducts();
}

async function loadOrders() {
  const { data, error } = await window.supabase
    .from("orders_view")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return console.error(error);

  const container = document.getElementById("ordersList");
  container.innerHTML = "";

  if (data && data.length > 0) {
    data.forEach((o) => {
      const div = document.createElement("div");
      div.className = "order";
      div.innerHTML = `
        <p>Order ID: ${o.id}</p>
        <p>User: ${o.username}</p>
        <p>Produk: ${o.product_name} - Rp ${o.product_price.toLocaleString()}</p>
        <p>Status Saat Ini: ${o.status.replace(/_/g, ' ').toUpperCase()}</p>
        <p>Bukti TF: ${
          o.payment_proof ? `<a href="${o.payment_proof}" target="_blank">Lihat</a>` : "-"
        }</p>
        <select id="status-${o.id}">
          <option value="">--Pilih Status Baru--</option>
          <option value="waiting_confirmation" ${o.status === 'waiting_confirmation' ? 'selected' : ''}>Menunggu Konfirmasi</option>
          <option value="payment_received" ${o.status === 'payment_received' ? 'selected' : ''}>Pembayaran Diterima</option>
          <option value="payment_failed" ${o.status === 'payment_failed' ? 'selected' : ''}>Pembayaran Gagal</option>
          <option value="done" ${o.status === 'done' ? 'selected' : ''}>Pesanan Selesai</option>
        </select>
        <!-- UPDATED: Added class="admin-button" -->
        <button onclick="saveOrderStatus('${o.id}')" class="admin-button">Update</button>
      `;
      container.appendChild(div);
    });
  } else {
    container.innerHTML = "<p>Belum ada pesanan.</p>";
  }
}

async function saveOrderStatus(orderId) {
  const newStatus = document.getElementById(`status-${orderId}`).value;
  if (!newStatus) return alert("Pilih status baru dulu.");

  const { error, data: orderData } = await window.supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId)
    .select("id, user_id, product_id, status, payment_proof, contact_email") // Tambahkan contact_email
    .single();

  if (error) {
    alert("Gagal update: " + error.message);
    return;
  }

  const { data: userData } = await window.supabase
    .from("users")
    .select("username")
    .eq("id", orderData.user_id)
    .single();

  const { data: productData } = await window.supabase
    .from("products")
    .select("name")
    .eq("id", orderData.product_id)
    .single();

  await fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orders: [{
        id: orderData.id,
        username: userData?.username || "Unknown User",
        product_name: productData?.name || "Unknown Product",
        payment_proof: orderData.payment_proof,
        status: orderData.status,
        payment_method: orderData.payment_method, // Gunakan payment_method dari order
        contact_email: orderData.contact_email, // Kirim contact_email
      }],
    }),
  });

  alert("✅ Status pesanan berhasil diupdate.");
  loadOrders();
}

async function loadQrisSettings() {
  const { data, error } = await window.supabase.from("settings").select("qris_image_url, dana_number, gopay_number, announcement").single();
  const currentQrisImage = document.getElementById("currentQrisImage");
  const noQrisMessage = document.getElementById("noQrisMessage");
  const danaNumberInput = document.getElementById("danaNumber");
  const gopayNumberInput = document.getElementById("gopayNumber");
  const announcementTextarea = document.getElementById("announcementText");

  if (error && error.code !== 'PGRST116') {
    console.error("Error loading settings:", error);
    currentQrisImage.style.display = 'none';
    noQrisMessage.style.display = 'block';
    danaNumberInput.value = "";
    gopayNumberInput.value = "";
    announcementTextarea.value = "";
    return;
  }

  if (data) {
    if (data.qris_image_url) {
      currentQrisImage.src = data.qris_image_url;
      currentQrisImage.style.display = 'block';
      noQrisMessage.style.display = 'none';
    } else {
      currentQrisImage.style.display = 'none';
      noQrisMessage.style.display = 'block';
    }
    danaNumberInput.value = data.dana_number || "";
    gopayNumberInput.value = data.gopay_number || "";
    announcementTextarea.value = data.announcement || "";
  } else {
    currentQrisImage.style.display = 'none';
    noQrisMessage.style.display = 'block';
    danaNumberInput.value = "";
    gopayNumberInput.value = "";
    announcementTextarea.value = "";
  }

  const promoTextarea = document.getElementById("promoMessages");
  if (data && data.promo_messages) {
    promoTextarea.value = data.promo_messages.join('\n'); // Array ke string dengan newline
  } else {
    promoTextarea.value = "";
  }
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

window.onload = checkAdminAuth;
