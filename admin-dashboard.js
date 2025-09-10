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
  document.getElementById(section).style.display = "block";

  if (section === "products") loadProducts();
  if (section === "orders") loadOrders();
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
        <p>Status: ${o.status}</p>
        <p>Bukti TF: ${
          o.payment_proof ? `<a href="${o.payment_proof}" target="_blank">Lihat</a>` : "-"
        }</p>
        <select onchange="updateOrderStatus(${o.id}, this.value)">
          <option value="">--Update Status--</option>
          <option value="payment_received">Pembayaran Diterima</option>
          <option value="payment_failed">Pembayaran Gagal</option>
          <option value="done">Pesanan Selesai</option>
        </select>
      `;
      container.appendChild(div);
    });
  } else {
    container.innerHTML = "<p>Belum ada pesanan.</p>";
  }
}

async function updateOrderStatus(orderId, newStatus) {
  const { error, data } = await window.supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId)
    .select("id, username, product_id, status, payment_proof")
    .single();

  if (error) {
    alert("Gagal update: " + error.message);
    return;
  }

  const { data: product } = await window.supabase
    .from("products")
    .select("name")
    .eq("id", data.product_id)
    .single();

  await fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orders: [{
        id: data.id,
        username: data.username,
        product_name: product?.name || "Unknown",
        payment_proof: data.payment_proof,
        status: data.status,
        payment_method: "qris",
      }],
    }),
  });

  alert("✅ Status pesanan diupdate.");
  loadOrders();
}

async function logout() {
  await window.supabase.auth.signOut();
  window.location.href = "signin.html";
}

window.onload = checkAdminAuth;
