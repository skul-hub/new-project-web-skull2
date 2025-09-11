// user-dashboard.js
let cart = [];
let currentUser = null;
let pendingCheckout = null;
let uploadedProofUrl = null; // simpan bukti transfer sebelum input email
let allProducts = []; // Variabel baru untuk menyimpan semua produk
let currentCategory = 'panel_pterodactyl'; // Default category changed to 'panel_pterodactyl'

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
  loadAnnouncement(); // Panggil fungsi untuk memuat pengumuman
}

async function loadProducts() {
  const { data, error } = await window.supabase.from("products").select("*").eq("active", true);
  if (error) return console.error(error);

  allProducts = data || []; // Simpan semua produk yang dimuat
  filterProductsByCategory(currentCategory); // Tampilkan produk berdasarkan kategori saat ini
}

function displayProducts(productsToDisplay) {
  const container = document.getElementById("productsContainer");
  container.innerHTML = "";
  if (productsToDisplay && productsToDisplay.length > 0) {
    productsToDisplay.forEach((p) => {
      const safeName = p.name.replace(/'/g, "\\'");
      const div = document.createElement("div");
      div.className = "product";
      let stockInfo = '';
      let buyButton = `<button onclick="buyNow('${p.id}', '${safeName}', ${p.price})">Beli Sekarang</button>`;
      let cartButton = `<button onclick="addToCart('${p.id}', '${safeName}', ${p.price})">Tambah ke Cart</button>`;

      if (p.category === 'game_account') {
        stockInfo = `<p>Stok: <strong>${p.stock}</strong></p>`;
        if (p.stock <= 0) {
          buyButton = `<button disabled>Stok Habis</button>`;
          cartButton = `<button disabled>Stok Habis</button>`;
        }
      }

      div.innerHTML = `
        <h3>${p.name}</h3>
        <p>Rp ${p.price.toLocaleString()}</p>
        ${stockInfo}
        <img src="${p.image}" alt="${p.name}">
        ${buyButton}
        ${cartButton}
      `;
      container.appendChild(div);
    });
  } else {
    container.innerHTML = "<p>Tidak ada produk yang ditemukan dalam kategori ini.</p>";
  }
}

function filterProducts() {
  const searchTerm = document.getElementById("productSearch").value.toLowerCase();
  const filtered = allProducts.filter(product =>
    product.category === currentCategory && // Filter based on currentCategory only
    product.name.toLowerCase().includes(searchTerm)
  );
  displayProducts(filtered);
}

function filterProductsByCategory(category) {
  currentCategory = category;
  const buttons = document.querySelectorAll('.category-button');
  buttons.forEach(button => {
    if (button.onclick.toString().includes(`'${category}'`)) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
  filterProducts(); // Re-filter based on new category and existing search term
}

async function addToCart(id, name, price) {
  const product = allProducts.find(p => p.id === id);
  if (product.category === 'game_account' && product.stock <= 0) {
    alert("Stok produk ini sudah habis!");
    return;
  }

  const existingItem = cart.find(item => item.id === id);
  if (existingItem) {
    alert("Produk ini sudah ada di keranjang!");
    return;
  }
  cart.push({ id, name, price, category: product.category }); // Add category to cart item
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

  const product = allProducts.find(p => p.id === pid);
  if (product.category === 'game_account' && product.stock <= 0) {
    alert("Stok produk ini sudah habis!");
    return;
  }

  pendingCheckout = { mode: "single", item: { id: pid, name, price, category: product.category } };
  await openQris();
}

async function checkout() {
  if (cart.length === 0) return alert("Keranjang kosong!");
  if (!currentUser) return alert("Silakan login.");

  // Check stock for all items in cart before proceeding
  for (const item of cart) {
    const product = allProducts.find(p => p.id === item.id);
    if (product.category === 'game_account' && product.stock <= 0) {
      alert(`Stok untuk produk "${product.name}" sudah habis. Silakan hapus dari keranjang.`);
      return;
    }
  }

  pendingCheckout = { mode: "cart" };
  await openQris();
}

async function openQris() {
  const { data, error } = await window.supabase.from("settings").select("qris_image_url").single();
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
  uploadedProofUrl = urlData.publicUrl;

  // Tutup modal QRIS, buka modal email
  closeQris();
  document.getElementById("emailModal").style.display = "flex";
}

function closeEmail() {
  document.getElementById("emailModal").style.display = "none";
  uploadedProofUrl = null;
}

async function submitEmail() {
  // ✅ CEK kalau belum ada transaksi
  if (!pendingCheckout) {
    alert("Transaksi tidak ditemukan. Silakan ulangi proses checkout.");
    return;
  }

  const email = document.getElementById("emailInput").value.trim();
  if (!email || !email.includes("@")) return alert("Masukkan email yang valid.");

  let ordersToNotify = [];
  let productsToUpdateStock = [];

  if (pendingCheckout.mode === "single") {
    const product = allProducts.find(p => p.id === pendingCheckout.item.id);
    if (product.category === 'game_account' && product.stock <= 0) {
      alert("Stok produk ini sudah habis. Transaksi dibatalkan.");
      closeEmail();
      return;
    }
    const order = await createOrder(pendingCheckout.item, uploadedProofUrl, email);
    if (order) {
      ordersToNotify.push(order);
      if (product.category === 'game_account') {
        productsToUpdateStock.push({ id: product.id, newStock: product.stock - 1 });
      }
    }
  } else if (pendingCheckout.mode === "cart") {
    for (const p of cart) {
      const product = allProducts.find(prod => prod.id === p.id);
      if (product.category === 'game_account' && product.stock <= 0) {
        alert(`Stok untuk produk "${product.name}" sudah habis. Transaksi dibatalkan.`);
        closeEmail();
        return;
      }
      const order = await createOrder(p, uploadedProofUrl, email);
      if (order) {
        ordersToNotify.push(order);
        if (product.category === 'game_account') {
          productsToUpdateStock.push({ id: product.id, newStock: product.stock - 1 });
        }
      }
    }
    cart = [];
    updateCartDisplay();
  }

  // Update stock in database
  for (const item of productsToUpdateStock) {
    await window.supabase.from("products").update({ stock: item.newStock }).eq("id", item.id);
  }

  if (ordersToNotify.length > 0) {
    await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orders: ordersToNotify }),
    });
  }

  document.getElementById("emailModal").style.display = "none";
  alert("✅ Pesanan dibuat! Admin akan konfirmasi.\n\n📧 Produk akan dikirim ke email yang Anda masukkan.");
  loadHistory();
  loadProducts(); // Reload products to reflect stock changes

  // reset setelah berhasil
  pendingCheckout = null;
  uploadedProofUrl = null;
}

async function createOrder(p, proofUrl, email) {
  const { data, error } = await window.supabase.from("orders").insert([{
    product_id: p.id,
    user_id: currentUser.id,
    username: currentUser.username,
    payment_method: "qris",
    payment_proof: proofUrl,
    contact_email: email,
    status: "waiting_confirmation",
  }]).select().single();

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
    contact_email: email,
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
        <p><strong>Email:</strong> ${o.contact_email || "-"}</p>
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

async function loadAnnouncement() {
  const { data, error } = await window.supabase.from("settings").select("announcement").single();
  const announcementContainer = document.getElementById("announcementContainer");
  const announcementMessage = document.getElementById("announcementMessage");

  if (error && error.code !== 'PGRST116') {
    console.error("Error loading announcement:", error);
    announcementContainer.style.display = "none";
    return;
  }

  if (data && data.announcement) {
    announcementMessage.textContent = data.announcement;
    announcementContainer.style.display = "block";
  } else {
    announcementContainer.style.display = "none";
  }
}

function showSection(section) {
  document.getElementById("products").style.display = "none";
  document.getElementById("cart").style.display = "none";
  document.getElementById("history").style.display = "none";
  document.getElementById(section).style.display = "block";

  if (section === "products") {
    loadProducts(); // Memuat semua produk saat masuk ke bagian produk
    document.getElementById("productSearch").value = ""; // Kosongkan kolom pencarian
    filterProductsByCategory('panel_pterodactyl'); // Set default filter to 'panel_pterodactyl'
  }
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
