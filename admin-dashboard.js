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
  document.getElementById(section).style.display = "block";

  if (section === "products") loadProducts();
  if (section === "orders") loadOrders();
  if (section === "settings") loadQrisSettings();
}

async function loadProducts() {
  const { data, error } = await window.supabase.from("products").select("*");
  if (error) return console.error(error);

  const container = document.getElementById("productsList");
  container.innerHTML = "";

  if (data && data.length > 0) {
    data.forEach((p) => {
      const safeName = p.name.replace(/'/g, "\\'");
      const div = document.createElement("div");
      div.innerHTML = `
        <p><strong>${p.name}</strong> - Rp ${p.price.toLocaleString()}</p>
        <button onclick="deleteProduct('${p.id}')">🗑️ Hapus</button>
        <button onclick="toggleProduct('${p.id}', ${p.active ? "false" : "true"})">
          ${p.active ? "Nonaktifkan" : "Aktifkan"}
        </button>
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
  const file = document.getElementById("productImage").files[0];

  if (!name || !price || !file) {
    alert("Lengkapi semua field!");
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
    { name, price, image: urlData.publicUrl, active: true },
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
        <button onclick="saveOrderStatus('${o.id}')">Update</button>
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
    .select("id, user_id, product_id, status, payment_proof")
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
        payment_method: "qris",
      }],
    }),
  });

  alert("✅ Status pesanan berhasil diupdate.");
  loadOrders();
}

async function loadQrisSettings() {
  const { data, error } = await window.supabase.from("settings").select("qris_image_url, announcement").single();
  const currentQrisImage = document.getElementById("currentQrisImage");
  const noQrisMessage = document.getElementById("noQrisMessage");
  const announcementTextarea = document.getElementById("announcementText");

  if (error && error.code !== 'PGRST116') {
    console.error("Error loading settings:", error);
    currentQrisImage.style.display = 'none';
    noQrisMessage.style.display = 'block';
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
    // Set teks pengumuman
    announcementTextarea.value = data.announcement || "";
  } else {
    currentQrisImage.style.display = 'none';
    noQrisMessage.style.display = 'block';
    announcementTextarea.value = "";
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

async function logout() {
  await window.supabase.auth.signOut();
  window.location.href = "signin.html";
}

window.onload = checkAdminAuth;
