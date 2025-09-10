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
  document.getElementById("settings").style.display = "none"; // Hide new settings section
  document.getElementById(section).style.display = "block";

  if (section === "products") loadProducts();
  if (section === "orders") loadOrders();
  if (section === "settings") loadQrisSettings(); // Load settings when section is shown
}

async function loadProducts() {
  const { data, error } = await window.supabase.from("products").select("*");
  if (error) return console.error(error);

  const container = document.getElementById("productsList");
  container.innerHTML = "";
  if (data && data.length > 0) {
    data.forEach((p) => {
      const div = document.createElement("div");
      div.innerHTML = `<p>${p.name} - Rp ${p.price.toLocaleString()}</p>`;
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

  // Optional: Validate file size
  if (file.size > 2 * 1024 * 1024) { // Max 2MB
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
  document.getElementById("productImage").value = ""; // Reset input file
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
        <p>Status: ${o.status.replace(/_/g, ' ').toUpperCase()}</p>
        <p>Bukti TF: ${
          o.payment_proof ? `<a href="${o.payment_proof}" target="_blank">Lihat</a>` : "-"
        }</p>
        <select onchange="updateOrderStatus(${o.id}, this.value)">
          <option value="">--Update Status--</option>
          <option value="waiting_confirmation" ${o.status === 'waiting_confirmation' ? 'selected' : ''}>Menunggu Konfirmasi</option>
          <option value="payment_received" ${o.status === 'payment_received' ? 'selected' : ''}>Pembayaran Diterima</option>
          <option value="payment_failed" ${o.status === 'payment_failed' ? 'selected' : ''}>Pembayaran Gagal</option>
          <option value="done" ${o.status === 'done' ? 'selected' : ''}>Pesanan Selesai</option>
        </select>
      `;
      container.appendChild(div);
    });
  } else {
    container.innerHTML = "<p>Belum ada pesanan.</p>";
  }
}

async function updateOrderStatus(orderId, newStatus) {
  if (!newStatus) return; // Do nothing if no status is selected

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

  // Fetch username
  const { data: userData, error: userError } = await window.supabase
    .from("users")
    .select("username")
    .eq("id", orderData.user_id)
    .single();

  if (userError) {
    console.error("Error fetching username for notification:", userError);
  }

  // Fetch product name
  const { data: productData, error: productError } = await window.supabase
    .from("products")
    .select("name")
    .eq("id", orderData.product_id)
    .single();

  if (productError) {
    console.error("Error fetching product name for notification:", productError);
  }

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
        payment_method: "qris", // Assuming QRIS is the payment method for this flow
      }],
    }),
  });

  alert("✅ Status pesanan diupdate.");
  loadOrders();
}

async function loadQrisSettings() {
  const { data, error } = await window.supabase.from("settings").select("qris_image_url").single();
  if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
    console.error("Error loading QRIS settings:", error);
    return;
  }
  document.getElementById("qrisImageUrl").value = data ? data.qris_image_url : "";
}

async function updateQrisSettings(event) {
  event.preventDefault();
  const qrisImageUrl = document.getElementById("qrisImageUrl").value;

  // Check if a settings row already exists (assuming only one settings row with ID 1)
  const { data: existingSettings, error: fetchError } = await window.supabase
    .from("settings")
    .select("id")
    .limit(1)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
    alert("Gagal memeriksa pengaturan: " + fetchError.message);
    return;
  }

  let error;
  if (existingSettings) {
    // Update existing row
    ({ error } = await window.supabase
      .from("settings")
      .update({ qris_image_url: qrisImageUrl })
      .eq("id", existingSettings.id));
  } else {
    // Insert new row
    ({ error } = await window.supabase
      .from("settings")
      .insert([{ qris_image_url: qrisImageUrl }]));
  }

  if (error) {
    alert("Gagal menyimpan pengaturan QRIS: " + error.message);
    return;
  }

  alert("Pengaturan QRIS berhasil disimpan!");
}

async function logout() {
  await window.supabase.auth.signOut();
  window.location.href = "signin.html";
}

window.onload = checkAdminAuth;
