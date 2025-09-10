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
  const { data, error } = await window.supabase.from("products").select("*").eq("active", true);
  if (error) return console.error(error);

  const container = document.getElementById("productsContainer");
  container.innerHTML = "";
  if (data && data.length > 0) {
    data.forEach((p) => {
      const div = document.createElement("div");
      div.className = "product";
      div.innerHTML = `
        <h3>${p.name}</h3>
        <p>Rp ${p.price.toLocaleString()}</p>
        <img src="${p.image}" alt="${p.name}" style="width:150px; height:150px;">
        <button onclick="buyNow(${p.id}, '${p.name}', ${p.price})">Beli Sekarang</button>
        <button onclick="addToCart(${p.id}, '${p.name}', ${p.price})">Tambah ke Cart</button>
      `;
      container.appendChild(div);
    });
  } else {
    container.innerHTML = "<p>Tidak ada produk.</p>";
  }
}

function addToCart(id, name, price) {
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
    cart.forEach((p) => {
      const item = document.createElement("p");
      item.textContent = `${p.name} - Rp ${p.price.toLocaleString()}`;
      cartDiv.appendChild(item);
    });
    cartDiv.innerHTML += `<p><strong>Total: Rp ${total.toLocaleString()}</strong></p>`;
  }
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
  const { data, error } = await window.supabase.from("settings").select("*").single();
  if (error || !data || !data.qris_image_url) {
    alert("QRIS belum diatur admin.");
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

  const fileName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
  const path = `${currentUser.id}/${fileName}`;
  const { error: upErr } = await window.supabase.storage.from("proofs").upload(path, file);
  if (upErr) {
    alert("Gagal upload bukti: " + upErr.message);
    return;
  }
  const { data: urlData } = window.supabase.storage.from("proofs").getPublicUrl(path);
  const proofUrl = urlData.publicUrl;

  if (!pendingCheckout) return alert("Tidak ada transaksi.");

  if (pendingCheckout.mode === "single") {
    await createOrder(pendingCheckout.item, proofUrl);
  } else {
    for (const p of cart) {
      await createOrder(p, proofUrl);
    }
    cart = [];
    updateCartDisplay();
  }

  closeQris();
  alert("✅ Pesanan dibuat! Admin akan konfirmasi.");
  loadHistory();
}

async function createOrder(p, proofUrl) {
  const { error, data } = await window.supabase.from("orders").insert([{
    product_id: p.id,
    user_id: currentUser.id,
    username: currentUser.username,
    payment_method: "qris",
    payment_proof: proofUrl,
    status: "waiting_confirmation",
  }]).select().single();

  if (error) {
    alert("Gagal membuat order: " + error.message);
    return;
  }

  await fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orders: [{
        id: data.id,
        username: currentUser.username,
        product_name: p.name,
        payment_method: "qris",
        payment_proof: proofUrl,
        status: "waiting_confirmation",
      }],
    }),
  });
}

async function loadHistory() {
  const { data, error } = await window.supabase
    .from("orders")
    .select("*")
    .eq("user_id", currentUser.id);
  if (error) return console.error(error);

  const historyDiv = document.getElementById("historyItems");
  historyDiv.innerHTML = "";
  if (data && data.length > 0) {
    data.forEach((o) => {
      const div = document.createElement("div");
      div.className = "order";
      div.innerHTML = `
        <p>Produk ID: ${o.product_id}</p>
        <p>Status: ${o.status}</p>
        <p>Bukti Transfer: ${
          o.payment_proof
            ? `<a href="${o.payment_proof}" target="_blank">Lihat</a>`
            : "-"
        }</p>
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
