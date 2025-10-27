// user-dashboard.js
let cart = [];
let currentUser = null;
let pendingCheckout = null;
let uploadedProofUrl = null; // simpan bukti transfer sebelum input email
let allProducts = []; // Variabel baru untuk menyimpan semua produk
let currentCategory = 'panel_pterodactyl'; // Default category changed to 'panel_pterodactyl'
let selectedPaymentMethod = null; // Variabel untuk metode pembayaran yang dipilih
let previousStatuses = {}; // Simpan status sebelumnya

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
    // Tambahkan di checkUserAuth, setelah currentUser = userData;
if (currentUser) {
  // Subscribe ke perubahan orders untuk user ini
  window.supabase
    .channel('orders-updates')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `user_id=eq.${currentUser.id}` }, (payload) => {
      const newStatus = payload.new.status;
      const oldStatus = payload.old.status;
      if (newStatus !== oldStatus) {
        showToast(`📢 Status Pesanan ${payload.new.id} Diupdate: ${newStatus.replace(/_/g, ' ').toUpperCase()}`, 'success');
        loadHistory(); // Refresh history otomatis
      }
    })
    .subscribe();
}
    
    console.log("User logged in:", currentUser.username);

    // Tampilkan elemen navbar yang hanya untuk user login
    navLinks.querySelector('li:nth-child(2)').style.display = 'list-item'; // Keranjang
    navLinks.querySelector('li:nth-child(3)').style.display = 'list-item'; // History
    // navLinks.querySelector('li:nth-child(4)') adalah "Semua Rating Produk", ini tetap terlihat
    navLinks.querySelector('li:nth-child(5)').style.display = 'list-item'; // Logout
  }

  const theme = localStorage.getItem('theme');
if (theme === 'light') document.body.classList.add('light-mode');
AOS.init();

  // Selalu tampilkan bagian produk dan muat produk
  showSection("products");
  loadAnnouncement(); // Panggil fungsi untuk memuat pengumuman
    loadPromoSlider(); // Tambahkan ini
   checkNewPromo(); // Tambahkan inidd
  
}

async function loadProducts() {
  const container = document.getElementById("productsContainer");
  container.innerHTML = '<div class="skeleton"></div>'.repeat(6); // Skeleton loading
  const { data, error } = await window.supabase.from("products").select("*").eq("active", true);
  if (error) return console.error(error);
  allProducts = data || [];
  setTimeout(() => filterProductsByCategory(currentCategory), 500); // Delay untuk efek
  loadPopularProducts();
}

function displayProducts(productsToDisplay) {
  const container = document.getElementById("productsContainer");
  container.innerHTML = "";
  if (productsToDisplay && productsToDisplay.length > 0) {
    const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    let sortedProducts = productsToDisplay;
    if (currentCategory === 'panel_pterodactyl') {
      const wishlistProducts = productsToDisplay.filter(p => wishlist.includes(p.id));
      const otherProducts = productsToDisplay.filter(p => !wishlist.includes(p.id));
      sortedProducts = [...wishlistProducts, ...otherProducts];
    }
    sortedProducts.forEach((p) => {
      const safeName = p.name.replace(/'/g, "\\'");
      let wishlistIcon = '<i class="fas fa-heart"></i>';
      if (wishlist.includes(p.id)) {
        wishlistIcon = '<i class="fas fa-heart" style="color: red;"></i>';
      }
      const div = document.createElement("div");
      div.className = "product";
      div.setAttribute('data-aos', 'fade-up');
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
        <button onclick="toggleWishlist('${p.id}')">${wishlistIcon}</button>
      `;
      div.addEventListener('mouseenter', () => {
        particlesJS(div.id || 'particles-js', {
          particles: { number: { value: 20 }, color: { value: '#58a6ff' }, shape: { type: 'star' } }
        });
      });
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
     cart.push({ id, name, price, category: product.category });
     saveCartToStorage(); // Simpan ke localStorage
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
      const product = allProducts.find(prod => prod.id === p.id);
      const productImage = product ? product.image : "img/placeholder.png";
      const item = document.createElement("p");
      item.innerHTML = `
        <img src="${productImage}" alt="${p.name}" class="cart-product-image">
        ${p.name} - Rp ${p.price.toLocaleString()} <button onclick="removeFromCart(${index})">Hapus</button>
      `;
      cartDiv.appendChild(item);
    });
    cartDiv.innerHTML += `<p><strong>Total: Rp ${total.toLocaleString()}</strong></p>`;
  }
  cartDiv.style.animation = 'pulse 0.5s ease';
  setTimeout(() => cartDiv.style.animation = '', 500);
}

function removeFromCart(index) {
     // Konfirmasi sebelum hapus
     if (!confirm("Apakah yakin ingin menghapus produk ini dari keranjang?")) {
       return; // Jika tidak yakin, jangan hapus
     }
     cart.splice(index, 1);
     saveCartToStorage(); // Simpan ke localStorage setelah hapus
     updateCartDisplay();
     alert("Produk dihapus dari keranjang.");
   }
   // Update window.onload untuk load cart
   window.onload = () => {
     loadCartFromStorage(); // Load cart dari localStorage
     checkUserAuth();
   };

// ========== PEMBAYARAN BARU: Modal Pilihan Metode ==========
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
  openPaymentMethodModal();
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
  openPaymentMethodModal();
}

function saveCartToStorage() {
     localStorage.setItem('userCart', JSON.stringify(cart));
   }
   function loadCartFromStorage() {
     const storedCart = localStorage.getItem('userCart');
     if (storedCart) {
       cart = JSON.parse(storedCart);
     }
   }

function openPaymentMethodModal() {
  document.getElementById("paymentMethodModal").style.display = "flex";
}

function closePaymentMethodModal() {
  document.getElementById("paymentMethodModal").style.display = "none";
}

function selectPaymentMethod(method) {
  selectedPaymentMethod = method;
  closePaymentMethodModal();
  if (method === 'qris') {
    openQris();
  } else {
    openAccountModal(method);
  }
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

async function openAccountModal(method) {
  const { data, error } = await window.supabase.from("settings").select(`${method}_number`).single();
  if (error || !data || !data[`${method}_number`]) {
    alert(`Nomor ${method.toUpperCase()} belum diatur oleh admin. Silakan hubungi admin.`);
    return;
  }
  document.getElementById("accountModalTitle").textContent = `Transfer ke ${method.toUpperCase()}`;
  document.getElementById("accountNumberValue").textContent = data[`${method}_number`];
  document.getElementById("accountModal").style.display = "flex";
}

function closeAccountModal() {
  document.getElementById("accountModal").style.display = "none";
  document.getElementById("accountProofFile").value = "";
}

async function confirmAccountPayment() {
  const file = document.getElementById("accountProofFile").files[0];
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

  // Tutup modal account, buka modal email
  closeAccountModal();
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
    const order = await createOrder(pendingCheckout.item, uploadedProofUrl, email, selectedPaymentMethod);
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
      const order = await createOrder(p, uploadedProofUrl, email, selectedPaymentMethod);
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

async function createOrder(p, proofUrl, email, paymentMethod) {
  const { data, error } = await window.supabase.from("orders").insert([{
    product_id: p.id,
    user_id: currentUser.id,
    username: currentUser.username,
    payment_method: paymentMethod,
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
    payment_method: paymentMethod,
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

  // Lanjutan dari kode sebelumnya (setelah bagian yang terpotong di openRatingModal)

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
  const { data: existingRating, error: ratingError } = await window.supabase
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
    data.forEach(o => {
    const prevStatus = previousStatuses[o.id];
    if (prevStatus && prevStatus !== o.status) {
      showToast(`📢 Status Pesanan ${o.id} Diupdate: ${o.status.replace(/_/g, ' ').toUpperCase()}`, 'success');
    }
    previousStatuses[o.id] = o.status; // Update status
  });   
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
// Tambahkan di akhir file, sebelum window.onload
async function loadPromoSlider() {
  const { data, error } = await window.supabase.from("settings").select("promo_messages").single();
  let messages = [];
  if (data && data.promo_messages) {
    messages = data.promo_messages;
  } else {
    messages = ["Diskon 50% untuk Panel Pterodactyl!", "Event Spesial Akun Game!", "Update Panel Terbaru!"];
  }
  const slidesContainer = document.querySelector(".promo-slides");
  slidesContainer.innerHTML = "";
  messages.forEach(msg => {
    const slide = document.createElement("div");
    slide.className = "promo-slide";
    slide.textContent = msg;
    slidesContainer.appendChild(slide);
  });
  // Tambahkan countdown
  const countdownEl = document.createElement('div');
  countdownEl.id = 'promoCountdown';
  document.getElementById('promo-slider').appendChild(countdownEl);
  startCountdown(new Date('2025-12-31').getTime());
}

function startCountdown(endTime) {
  setInterval(() => {
    const now = new Date().getTime();
    const distance = endTime - now;
    if (distance > 0) {
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      document.getElementById('promoCountdown').innerHTML = `Promo Berakhir: ${days}d ${hours}h`;
    }
  }, 1000);
}

// Tambahkan di akhir file
async function loadPopularProducts() {
  // Query produk berdasarkan jumlah order terbanyak
  const { data, error } = await window.supabase
    .from("orders")
    .select("product_id, products(name, price, image, category)")
    .eq("status", "done") // Hanya order selesai
    .order("created_at", { ascending: false });

  if (error) return console.error(error);

  // Hitung frekuensi produk
  const productCount = {};
  data.forEach(order => {
    const pid = order.product_id;
    productCount[pid] = (productCount[pid] || 0) + 1;
  });

  // Sort berdasarkan frekuensi tertinggi, ambil top 4
  const sortedProducts = Object.keys(productCount)
    .sort((a, b) => productCount[b] - productCount[a])
    .slice(0, 4)
    .map(pid => data.find(o => o.product_id === pid)?.products)
    .filter(p => p); // Filter null

  const container = document.getElementById("popularProductsContainer");
  container.innerHTML = "";
  if (sortedProducts.length > 0) {
    sortedProducts.forEach(p => {
      const div = document.createElement("div");
      div.className = "product";
      div.innerHTML = `
        <h3>${p.name}</h3>
        <p>Rp ${p.price.toLocaleString()}</p>
        <img src="${p.image}" alt="${p.name}">
        <button onclick="buyNow('${p.id}', '${p.name.replace(/'/g, "\\'")}', ${p.price})">Beli Sekarang</button>
      `;
      container.appendChild(div);
    });
  } else {
    container.innerHTML = "<p>Belum ada produk terlaris.</p>";
  }
}
// Tambahkan di akhir file
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast-notification ${type}`;
  toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i> ${message}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 100);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => document.body.removeChild(toast), 500);
  }, 4000);
}
// Notifikasi promo baru (cek saat load)
async function checkNewPromo() {
  const lastPromo = localStorage.getItem('lastPromo');
  const { data, error } = await window.supabase.from("settings").select("promo_messages").single();
  if (data && data.promo_messages && JSON.stringify(data.promo_messages) !== lastPromo) {
    showToast("🎉 Promo Baru Tersedia! Cek Banner Atas.", 'success');
    localStorage.setItem('lastPromo', JSON.stringify(data.promo_messages));
  }
}

  function toggleTheme() {
  document.body.classList.toggle('light-mode');
  localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
}

function toggleWishlist(productId) {
  let wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
  if (wishlist.includes(productId)) {
    wishlist = wishlist.filter(id => id !== productId);
  } else {
    wishlist.push(productId);
  }
  localStorage.setItem('wishlist', JSON.stringify(wishlist));
  loadProducts(); // Refresh untuk update icon
}

function sortProducts() {
  const sortBy = document.getElementById('sortSelect').value;
  let productsToSort = allProducts.filter(p => p.category === currentCategory);
  if (sortBy === 'none') {
    filterProductsByCategory(currentCategory);
    return;
  }
  if (sortBy === 'price-low') productsToSort.sort((a, b) => a.price - b.price);
  else if (sortBy === 'price-high') productsToSort.sort((a, b) => b.price - a.price);
  else productsToSort.sort((a, b) => a.name.localeCompare(b.name));
  displayProducts(productsToSort);
}





 // Tambahkan di akhir file user-dashboard.js, ganti window.onload yang lama
    window.onload = () => {
      loadCartFromStorage(); // Kode existing
      checkUserAuth(); // Kode existing
      // Tambahkan ini untuk load previousStatuses
      const storedStatuses = localStorage.getItem('previousStatuses');
      if (storedStatuses) previousStatuses = JSON.parse(storedStatuses);
    };
    // Tambahkan ini setelah window.onload untuk simpan previousStatuses saat unload
    window.onbeforeunload = () => {
      localStorage.setItem('previousStatuses', JSON.stringify(previousStatuses));
    };

async function logout() {
  await window.supabase.auth.signOut();
  window.location.href = "signin.html";
}
