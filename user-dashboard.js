// user-dashboard.js
let cart = [];
let currentUser = null;
let pendingCheckout = null;
let uploadedProofUrl = null; // simpan bukti transfer sebelum input email
let selectedPaymentMethod = null; // Tambah variabel untuk metode pembayaran
let allProducts = []; // Variabel baru untuk menyimpan semua produk
let currentCategory = 'panel_pterodactyl'; // Default category changed to 'panel_pterodactyl'

async function checkUserAuth() {
  const { data: { user }, error } = await window.supabase.auth.getUser();

  // Dapatkan elemen nav-links
  const navLinks = document.querySelector('.nav-links');
  // Hapus link Login/Register yang mungkin sudah ada dari header
  let loginLinkInHeader = navLinks.querySelector('a[href="signin.html"]');
  let registerLinkInHeader = navLinks.querySelector('a[href="signup.html"]');
  if (loginLinkInHeader) loginLinkInHeader.remove();
  if (registerLinkInHeader) registerLinkInHeader.remove();


  if (error || !user) {
    // Jika tidak ada user yang login, set currentUser ke null
    currentUser = null;
    console.log("User not logged in. Displaying products for guest.");
    // Sembunyikan elemen navbar yang hanya untuk user login
    // Menggunakan querySelectorAll dan forEach untuk lebih robust
    navLinks.querySelector('li:nth-child(2)').style.display = 'none'; // Keranjang
    navLinks.querySelector('li:nth-child(3)').style.display = 'none'; // History
    // navLinks.querySelector('li:nth-child(4)') adalah "Semua Rating Produk", ini tetap terlihat
    navLinks.querySelector('li:nth-child(5)').style.display = 'none'; // Logout

    // Tambahkan tombol Login/Register ke nav-links
    const loginLi = document.createElement('li');
    const loginA = document.createElement('a');
    loginA.href = 'signin.html';
    loginA.textContent = 'Login';
    loginLi.appendChild(loginA);
    navLinks.appendChild(loginLi);

    const registerLi = document.createElement('li');
    const registerA = document.createElement('a');
    registerA.href = 'signup.html';
    registerA.textContent = 'Register';
    registerLi.appendChild(registerA);
    navLinks.appendChild(registerLi);

  } else {
    // Jika ada user yang login, ambil data user
    const { data: userData, error: userError } = await window.supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      alert("Gagal memuat profil user. Silakan login ulang.");
      await window.supabase.auth.signOut();
      window.location.href = "signin.html";
      return;
    }
    currentUser = userData;
    console.log("User logged in:", currentUser.username);

    // Tampilkan elemen navbar yang hanya untuk user login
    navLinks.querySelector('li:nth-child(2)').style.display = 'list-item'; // Keranjang
    navLinks.querySelector('li:nth-child(3)').style.display = 'list-item'; // History
    // navLinks.querySelector('li:nth-child(4)') adalah "Semua Rating Produk", ini tetap terlihat
    navLinks.querySelector('li:nth-child(5)').style.display = 'list-item'; // Logout
  }

  // Selalu tampilkan bagian produk dan muat produk
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
      let cartButton = `<button onclick="addToCart('${p.id}', '${safeName}', ${p.price})">Tambah ke Keranjang</button>`;

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
  if (!currentUser) {
    alert("Silakan login untuk menambahkan produk ke keranjang.");
    window.location.href = "signin.html";
    return;
  }

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
  alert("Ditambahkan ke Keranjang By Bangskull!");
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

// ========== PEMBAYARAN BARU ==========
async function buyNow(pid, name, price) {
  if (!currentUser) {
    alert("Silakan login untuk melakukan pembelian.");
    window.location.href = "signin.html";
    return;
  }

  const product = allProducts.find(p => p.id === pid);
  if (product.category === 'game_account' && product.stock <= 0) {
    alert("Stok produk ini sudah habis!");
    return;
  }

  pendingCheckout = { mode: "single", item: { id: pid, name, price, category: product.category } };
  document.getElementById("paymentMethodModal").style.display = "flex";  // Buka modal pilih metode
}

async function checkout() {
  if (!currentUser) {
    alert("Silakan login untuk melakukan checkout.");
    window.location.href = "signin.html";
    return;
  }
  if (cart.length === 0) return alert("Keranjang kosong!");

  // Check stock for all items in cart before proceeding
  for (const item of cart) {
    const product = allProducts.find(p => p.id === item.id);
    if (product.category === 'game_account' && product.stock <= 0) {
      alert(`Stok untuk produk "${product.name}" sudah habis. Silakan hapus dari keranjang.`);
      return;
    }
  }

  pendingCheckout = { mode: "cart" };
  document.getElementById("paymentMethodModal").style.display = "flex";  // Buka modal pilih metode
}

function selectPaymentMethod(method) {
  selectedPaymentMethod = method;
  closePaymentMethod();
  openPaymentModal();  // Buka modal pembayaran sesuai metode
}

function closePaymentMethod() {
  document.getElementById("paymentMethodModal").style.display = "none";
}

async function openPaymentModal() {
  const { data, error } = await window.supabase.from("settings").select("qris_image_url, dana_account, gopay_account").single();
  if (error || !data) {
    alert("Pengaturan pembayaran belum lengkap. Silakan hubungi admin.");
    return;
  }

  const title = document.getElementById("paymentTitle");
  const details = document.getElementById("paymentDetails");

  if (selectedPaymentMethod === 'qris') {
    if (!data.qris_image_url) {
      alert("QRIS belum diatur.");
      return;
    }
    title.textContent = "Scan QRIS untuk Pembayaran";
    details.innerHTML = `<img id="qrisImage" alt="QRIS" style="width:250px;height:250px;object-fit:contain;" src="${data.qris_image_url}">`;
  } else if (selectedPaymentMethod === 'dana') {
    if (!data.dana_account) {
      alert("Nomor Dana belum diatur.");
      return;
    }
    title.textContent = "Transfer via Dana";
    details.innerHTML = `<p>Nomor Rekening Dana: <strong>${data.dana_account}</strong></p><p>Silakan transfer ke nomor tersebut.</p>`;
  } else if (selectedPaymentMethod === 'gopay') {
    if (!data.gopay_account) {
      alert("Nomor GoPay belum diatur.");
      return;
    }
    title.textContent = "Transfer via GoPay";
    details.innerHTML = `<p>Nomor Rekening GoPay: <strong>${data.gopay_account}</strong></p><p>Silakan transfer ke nomor tersebut.</p>`;
  }

  document.getElementById("paymentModal").style.display = "flex";
}

function closePayment() {
  document.getElementById("paymentModal").style.display = "none";
  document.getElementById("proofFile").value = "";
  selectedPaymentMethod = null;
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

  // Tutup modal pembayaran, buka modal email
  closePayment();
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
  selectedPaymentMethod = null;
}

async function createOrder(p, proofUrl, email) {
  const { data, error } = await window.supabase.from("orders").insert([{
    product_id: p.id,
    user_id: currentUser.id,
    username: currentUser.username,
    payment_method: selectedPaymentMethod,  // Gunakan selectedPaymentMethod
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
    payment_method: selectedPaymentMethod,
    payment_proof: proofUrl,
    contact_email: email,
    status: "waiting_confirmation",
  };
}

let currentOrderIdForRating = null;
let currentProductIdForRating = null;

// Fungsi untuk menampilkan modal rating
async function openRatingModal(orderId, productId) {
  if (!currentUser) {
    alert("Silakan login untuk memberi rating.");
    window.location.href = "signin.html";
    return;
  }
  currentOrderIdForRating = orderId;
  currentProductIdForRating = productId;

  // Ambil nama produk
  const { data: productData, error: productError } = await window.supabase
    .from("products")
    .select("name")
    .eq("id", productId)
    .single();

  if (productError || !productData) {
    console.error("Error fetching product name for rating:", productError);
    alert("Gagal memuat informasi produk untuk rating.");
    return;
  }

  document.getElementById("ratingProductName").textContent = productData.name;

  // Reset bintang dan komentar
  // Pastikan semua bintang tidak terpilih secara default
  const stars = document.querySelectorAll(".rating-stars .star");
  stars.forEach(star => {
    star.classList.remove("selected");
  });
  document.getElementById("selectedRating").value = "0";
  document.getElementById("ratingComment").value = "";

  // Cek apakah user sudah pernah memberi rating untuk order ini
  const { data: existingRating, error: ratingCheckError } = await window.supabase
    .from("ratings")
    .select("*")
    .eq("order_id", orderId)
    .single();

  if (existingRating) {
    // Jika sudah ada, tampilkan rating dan komentar yang sudah ada
    document.getElementById("selectedRating").value = existingRating.rating;
    document.getElementById("ratingComment").value = existingRating.comment || "";
        // Set bintang yang terpilih berdasarkan rating yang sudah ada
    stars.forEach(star => {
      if (parseInt(star.dataset.value) <= existingRating.rating) {
        star.classList.add("selected");
      }
    });
  }

  document.getElementById("ratingModal").style.display = "flex";
}

// Fungsi untuk menutup modal rating
function closeRatingModal() {
  document.getElementById("ratingModal").style.display = "none";
  currentOrderIdForRating = null;
  currentProductIdForRating = null;
}

// Event listener untuk bintang rating
document.addEventListener("DOMContentLoaded", () => {
  // Pastikan event listener hanya ditambahkan sekali
  if (!document.body.dataset.ratingListenerAdded) {
    const stars = document.querySelectorAll(".rating-stars .star");
    stars.forEach(star => {
      star.addEventListener("click", function() {
        const ratingValue = parseInt(this.dataset.value);
        document.getElementById("selectedRating").value = ratingValue;
        // Logika untuk menambahkan/menghapus kelas 'selected'
        stars.forEach(s => {
          if (parseInt(s.dataset.value) <= ratingValue) {
            s.classList.add("selected");
          } else {
            s.classList.remove("selected");
          }
        });
      });
    });
    document.body.dataset.ratingListenerAdded = true;
  }
});

// Fungsi untuk mengirim rating
async function submitRating() {
  const rating = parseInt(document.getElementById("selectedRating").value);
  const comment = document.getElementById("ratingComment").value.trim();

  if (rating === 0) {
    alert("Silakan pilih bintang rating!");
    return;
  }

  if (!currentOrderIdForRating || !currentProductIdForRating || !currentUser) {
    alert("Terjadi kesalahan. Silakan coba lagi.");
    return;
  }

  // Cek apakah user sudah pernah memberi rating untuk order ini
  const { data: existingRating, error: checkError } = await window.supabase
    .from("ratings")
    .select("id")
    .eq("order_id", currentOrderIdForRating)
    .single();

  let error;
  if (existingRating) {
    // Update rating jika sudah ada
    ({ error } = await window.supabase
      .from("ratings")
      .update({ rating: rating, comment: comment, created_at: new Date() })
      .eq("id", existingRating.id));
  } else {
    // Insert rating baru
    ({ error } = await window.supabase.from("ratings").insert([{
      order_id: currentOrderIdForRating,
      user_id: currentUser.id,
      product_id: currentProductIdForRating,
      rating: rating,
      comment: comment,
    }]));
  }

  if (error) {
    alert("Gagal menyimpan rating: " + error.message);
    console.error("Error saving rating:", error);
    return;
  }

  alert("Terima kasih atas rating Anda!");
  closeRatingModal();
  loadHistory(); // Refresh riwayat pesanan
  loadAllRatings(); // Refresh rating global
}

async function loadHistory() {
  if (!currentUser) {
    document.getElementById("historyItems").innerHTML = "<p>Silakan login untuk melihat riwayat pesanan Anda.</p>";
    return;
  }

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
    for (const o of data) { // Gunakan for...of untuk async/await di dalam loop
      const div = document.createElement("div");
      div.className = "order";

      let ratingButton = '';
      if (o.status === 'done') { // Hanya tampilkan tombol rating jika status pesanan 'done'
        const { data: existingRating, error: ratingCheckError } = await window.supabase
          .from("ratings")
          .select("id")
          .eq("order_id", o.id)
          .single();

        if (ratingCheckError && ratingCheckError.code !== 'PGRST116') { // PGRST116 = data not found
          console.error("Error checking existing rating:", ratingCheckError);
        }

        const buttonText = existingRating ? "Lihat/Ubah Rating" : "Beri Rating";
        ratingButton = `<button onclick="openRatingModal('${o.id}', '${o.product_id}')" class="admin-button" style="margin-top: 10px;">${buttonText}</button>`;
      }

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
        ${ratingButton}
      `;
      historyDiv.appendChild(div);
    }
  } else {
    historyDiv.innerHTML = "<p>Belum ada riwayat pesanan.</p>";
  }
}

// Fungsi baru untuk memuat dan menampilkan rating GLOBAL
async function loadAllRatings() {
  // Rating global bisa dilihat tanpa login, jadi tidak perlu currentUser check di sini
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
    console.error("Error loading global ratings:", error);
    return;
  }

  const container = document.getElementById("globalRatingsList");
  container.innerHTML = "";

  if (ratings && ratings.length > 0) {
    // Tampilkan statistik rating global
    displayGlobalRatingStatistics(ratings);

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
      `;
      tbody.appendChild(tr);
    });
    container.appendChild(table);
  } else {
    // Reset statistik jika tidak ada rating
    document.getElementById("globalTotalRatingsCount").textContent = "0";
    document.getElementById("globalAverageRating").textContent = "0.0";
    for (let i = 1; i <= 5; i++) {
      document.getElementById(`globalStar${i}Count`).textContent = "0";
      document.getElementById(`globalStar${i}Percent`).textContent = "0%";
      document.getElementById(`globalStar${i}Bar`).style.width = "0%";
    }
    container.innerHTML = "<p>Belum ada rating atau komentar dari pengguna.</p>";
  }
}

// Fungsi untuk menampilkan statistik rating GLOBAL
function displayGlobalRatingStatistics(ratings) {
  const totalRatings = ratings.length;
  let sumRatings = 0;
  const starCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  ratings.forEach(r => {
    sumRatings += r.rating;
    starCounts[r.rating]++;
  });

  const averageRating = totalRatings > 0 ? (sumRatings / totalRatings).toFixed(1) : "0.0";

  document.getElementById("globalTotalRatingsCount").textContent = totalRatings;
  document.getElementById("globalAverageRating").textContent = averageRating;

  for (let i = 1; i <= 5; i++) {
    const count = starCounts[i];
    const percentage = totalRatings > 0 ? ((count / totalRatings) * 100).toFixed(1) : "0.0";
    document.getElementById(`globalStar${i}Count`).textContent = count;
    document.getElementById(`globalStar${i}Percent`).textContent = `${percentage}%`;
    document.getElementById(`globalStar${i}Bar`).style.width = `${percentage}%`;
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
  // Sembunyikan semua section
  document.getElementById("products").style.display = "none";
  document.getElementById("cart").style.display = "none";
  document.getElementById("history").style.display = "none";
  document.getElementById("all-ratings").style.display = "none";

  // Tampilkan section yang diminta
  document.getElementById(section).style.display = "block";

  // Muat data sesuai section
  if (section === "products") {
    loadProducts();
    document.getElementById("productSearch").value = "";
    filterProductsByCategory('panel_pterodactyl');
  }
  if (section === "cart") {
    if (currentUser) { // Hanya muat keranjang jika user login
      updateCartDisplay();
      document.querySelector('#cart button').style.display = 'block'; // Tampilkan tombol checkout
    } else {
      document.getElementById("cartItems").innerHTML = "<p>Silakan login untuk melihat keranjang Anda.</p>";
      document.querySelector('#cart button').style.display = 'none'; // Sembunyikan tombol checkout
    }
  }
  if (section === "history") loadHistory();
  if (section === "all-ratings") loadAllRatings();
}

window.onload = () => {
  checkUserAuth();
};

async function logout() {
  await window.supabase.auth.signOut();
  window.location.href = "signin.html";
}
