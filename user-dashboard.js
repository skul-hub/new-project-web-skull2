// user-dashboard.js
let cart = [];
let currentUser = null;
let pendingCheckout = null;

async function checkUserAuth() {
  const { data: { user }, error } = await window.supabase.auth.getUser();
  if (error || !user) {
    window.location.href = "signin.html";
    return;
  }

  const { data: userData, error: userError } = await window.supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (userError || !userData) {
    alert("Gagal memuat profil.");
    await window.supabase.auth.signOut();
    window.location.href = "signin.html";
    return;
  }

  currentUser = userData;
  showSection("products");
}

async function loadProducts() {
  const { data, error } = await window.supabase
    .from("products")
    .select("*")
    .eq("active", true);

  if (error) return console.error(error);

  const container = document.getElementById("productsContainer");
  container.innerHTML = "";

  if (data && data.length > 0) {
    data.forEach((p) => {
      // Escape nama produk untuk mencegah error jika ada tanda kutip
      const safeName = p.name.replace(/'/g, "\\'");

      const div = document.createElement("div");
      div.className = "product";
      div.innerHTML = `
        <h3>${p.name}</h3>
        <p>Rp ${p.price.toLocaleString()}</p>
        <img src="${p.image}" alt="${p.name}">
        <button onclick="buyNow('${p.id}', '${safeName}', ${p.price})">Beli Sekarang</button>
        <button onclick="addToCart('${p.id}', '${safeName}', ${p.price})">Tambah ke Cart</button>
      `;
      container.appendChild(div);
    });
  } else {
    container.innerHTML = "<p>Tidak ada produk.</p>";
  }
}

function addToCart(id, name, price) {
  const existingItem = cart.find(item => item.id === id);
  if (existingItem) {
    alert("Produk ini sudah ada di keranjang!");
    return;
  }
  cart.push({ id, name, price });
  updateCartDisplay();
  alert("Ditambahkan ke cart!");
}

function updateCartDisplay() {
  const total = cart.reduce((sum, p) => sum + p.price, 0);
  const cartDiv = document.getElementById("cartItems");
  cartDiv.innerHTML = "";

  if (cart.length === 0) {
    cartDiv.innerHTML = "<p>Keranjang kosong.</p>";
  } else {
    cart.forEach((p, index) => {
      const item = document.createElement("p");
      item.innerHTML = `${p.name} - Rp ${p.price.toLocaleString()} <button onclick="removeFromCart(${index})">Hapus</button>`;
      cartDiv.appendChild(item);
    });
    cartDiv.innerHTML += `<p><strong>Total: Rp ${total.toLocaleString()}</strong></p>`;
  }
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCartDisplay();
  alert("Produk dihapus dari keranjang.");
}

// ========== QRIS FLOW ==========
async function buyNow(pid, name, price) {
  if (!currentUser) return alert("Silakan login.");
  pendingCheckout = { mode: "single", item: { id: pid, name, price } };
  await openQris();
}

async function checkout() {
  if (cart.length === 0) return alert("Keranjang kosong!");
  if (!currentUser) return alert("Silakan login.");
  pendingCheckout = { mode: "cart" };
  await openQris();
}

async function openQris() {
  const { data, error } = await window.supabase
    .from("settings")
    .select("qris_image_url")
    .single();

  if (error || !data || !data.qris_image_url) {
    alert("QRIS belum diatur oleh admin. Silakan hubungi admin.");
    return;
  }
  document.getElementById("qrisImage").src = data.qris_image_url;
  document.getElementById("qrisModal").style.display = "flex";
}

function closeQris() {
  document.getElementById("qrisModal").style.display = "none";
  document.getElementById("proofFile").value = "";
  pendingCheckout = null;
}

async function confirmPayment() {
  const file = document.getElementById("proofFile").files[0];
  if (!file) return alert("Upload bukti transfer dulu.");

  if (file.size > 2 * 1024 * 1024) {
    alert("Ukuran bukti transfer terlalu besar. Maksimal 2MB.");
    return;
  }

  const fileName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
  const path = `${currentUser.id}/${fileName}`;
  const { error: upErr } = await window.supabase.storage.from("proofs").upload(path, file);
  if (upErr) {
    alert("Gagal upload bukti: " + upErr.message);
    return;
  }

  const { data: urlData } = window.supabase.storage.from("proofs").getPublicUrl(path);
  const proofUrl = urlData.publicUrl;

  if (!pendingCheckout) return alert("Tidak ada transaksi yang tertunda.");

  let ordersToNotify = [];

  if (pendingCheckout.mode === "single") {
    const order = await createOrder(pendingCheckout.item, proofUrl);
    if (order) ordersToNotify.push(order);
  } else {
    for (const p of cart) {
      const order = await createOrder(p, proofUrl);
      if (order) ordersToNotify.push(order);
    }
    cart = [];
    updateCartDisplay();
  }

  if (ordersToNotify.length > 0) {
    await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orders: ordersToNotify }),
    });
  }

  closeQris();
  alert("✅ Pesanan dibuat! Admin akan konfirmasi.");
  loadHistory();
}

async function createOrder(p, proofUrl) {
  const { data, error } = await window.supabase
    .from("orders")
    .insert([{
      product_id: p.id,
      user_id: currentUser.id,
      username: currentUser.username,
      payment_method: "qris",
      payment_proof: proofUrl,
      status: "waiting_confirmation",
    }])
    .select()
    .single();

  if (error) {
    alert("Gagal membuat order untuk " + p.name + ": " + error.message);
    return null;
  }

  return {
    id: data.id,
    username: currentUser.username,
    product_name: p.name,
    payment_method: "qris",
    payment_proof: proofUrl,
    status: "waiting_confirmation",
  };
}

async function loadHistory() {
  const { data, error } = await window.supabase
    .from("orders_view")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading order history:", error);
    return;
  }

  const historyDiv = document.getElementById("historyItems");
  historyDiv.innerHTML = "";
  if (data && data.length > 0) {
    data.forEach((o) => {
      const div = document.createElement("div");
      div.className = "order";
      div.innerHTML = `
        <p><strong>Order ID:</strong> ${o.id}</p>
        <p><strong>Produk:</strong> ${o.product_name} - Rp ${o.product_price.toLocaleString()}</p>
        <p><strong>Status:</strong> ${o.status.replace(/_/g, ' ').toUpperCase()}</p>
        <p><strong>Metode Pembayaran:</strong> ${o.payment_method.toUpperCase()}</p>
        <p><strong>Bukti Transfer:</strong> ${
          o.payment_proof
            ? `<a href="${o.payment_proof}" target="_blank">Lihat Bukti</a>`
            : "-"
        }</p>
        <p><strong>Tanggal Pesan:</strong> ${new Date(o.created_at).toLocaleString()}</p>
      `;
      historyDiv.appendChild(div);
    });
  } else {
    historyDiv.innerHTML = "<p>Belum ada riwayat pesanan.</p>";
  }
}

function showSection(section) {
  document.getElementById("products").style.display = "none";
  document.getElementById("cart").style.display = "none";
  document.getElementById("history").style.display = "none";
  document.getElementById(section).style.display = "block";

  if (section === "products") loadProducts();
  if (section === "cart") updateCartDisplay();
  if (section === "history") loadHistory();
}

window.onload = () => {
  checkUserAuth();
};

async function logout() {
  await window.supabase.auth.signOut();
  window.location.href = "signin.html";
}
