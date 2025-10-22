let currentUser = null;
let currentProduct = null;
let uploadedProofUrl = null;
let pendingCheckout = null;

document.addEventListener("DOMContentLoaded", () => {
  checkSession();
  loadAnnouncement();
  loadProducts();
});

// ================= LOGIN CEK =================
function checkSession() {
  const session = localStorage.getItem("user_session");
  if (session) {
    const user = JSON.parse(session);
    currentUser = user;
    document.querySelectorAll(".nav-links li").forEach(li => li.style.display = "block");
  }
}

// ================= LOGOUT =================
function logout() {
  localStorage.removeItem("user_session");
  window.location.href = "login.html";
}

// ================= PENGUMUMAN =================
async function loadAnnouncement() {
  const { data, error } = await window.supabase.from("settings").select("announcement").single();
  if (error && error.code !== "PGRST116") return;
  if (data && data.announcement) {
    document.getElementById("announcementMessage").innerText = data.announcement;
    document.getElementById("announcementContainer").style.display = "block";
  }
}

// ================= PRODUK =================
async function loadProducts() {
  const { data, error } = await window.supabase.from("products").select("*").order("id", { ascending: false });
  if (error) return console.error(error);

  const container = document.getElementById("productsContainer");
  container.innerHTML = "";

  data.forEach((p) => {
    const div = document.createElement("div");
    div.className = "product-card";
    div.innerHTML = `
      <img src="${p.image_url}" alt="${p.name}">
      <h3>${p.name}</h3>
      <p>Rp ${p.price.toLocaleString()}</p>
      <button onclick='buyProduct(${JSON.stringify(p)})'>Beli Sekarang</button>
    `;
    container.appendChild(div);
  });
}

// ================= BELI SEKARANG =================
function buyProduct(p) {
  if (!currentUser) {
    alert("Silakan login terlebih dahulu!");
    return;
  }
  currentProduct = p;
  pendingCheckout = { product: p };
  document.getElementById("paymentChoiceModal").style.display = "flex";
}

// ================= PEMILIHAN METODE PEMBAYARAN =================
function closePaymentChoice() {
  document.getElementById("paymentChoiceModal").style.display = "none";
}

async function openPayment(method) {
  closePaymentChoice();
  const { data, error } = await window.supabase.from("settings").select("dana_number, gopay_number, qris_image_url").single();
  if (error) return alert("Gagal memuat metode pembayaran.");

  if (method === "qris") {
    document.getElementById("qrisImage").src = data.qris_image_url;
    document.getElementById("qrisModal").style.display = "flex";
  } else {
    const number = method === "dana" ? data.dana_number : data.gopay_number;
    if (!number) return alert("Nomor belum diatur admin.");
    document.getElementById("numberDisplay").innerHTML = `${method.toUpperCase()}: <strong>${number}</strong>`;
    document.getElementById("numberPaymentModal").dataset.method = method;
    document.getElementById("numberPaymentModal").style.display = "flex";
  }
}

// ================= CLOSE MODAL NOMOR =================
function closeNumberPayment() {
  document.getElementById("numberPaymentModal").style.display = "none";
  document.getElementById("proofFileAlt").value = "";
}

// ================= KONFIRMASI PEMBAYARAN NOMOR =================
async function confirmNumberPayment() {
  const file = document.getElementById("proofFileAlt").files[0];
  if (!file) return alert("Upload bukti transfer dulu.");

  const method = document.getElementById("numberPaymentModal").dataset.method;
  const fileName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
  const path = `${currentUser.id}/${fileName}`;
  const { error: upErr } = await window.supabase.storage.from("proofs").upload(path, file);
  if (upErr) return alert("Gagal upload bukti.");

  const { data: urlData } = window.supabase.storage.from("proofs").getPublicUrl(path);
  uploadedProofUrl = urlData.publicUrl;
  pendingCheckout.payment_method = method;

  closeNumberPayment();
  document.getElementById("emailModal").style.display = "flex";
}

// ================= QRIS =================
function closeQris() {
  document.getElementById("qrisModal").style.display = "none";
  document.getElementById("proofFile").value = "";
}

async function confirmPayment() {
  const file = document.getElementById("proofFile").files[0];
  if (!file) return alert("Upload bukti transfer dulu.");

  const fileName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
  const path = `${currentUser.id}/${fileName}`;
  const { error: upErr } = await window.supabase.storage.from("proofs").upload(path, file);
  if (upErr) return alert("Gagal upload bukti.");

  const { data: urlData } = window.supabase.storage.from("proofs").getPublicUrl(path);
  uploadedProofUrl = urlData.publicUrl;
  pendingCheckout.payment_method = "qris";

  closeQris();
  document.getElementById("emailModal").style.display = "flex";
}

// ================= EMAIL =================
function closeEmail() {
  document.getElementById("emailModal").style.display = "none";
  document.getElementById("emailInput").value = "";
}

async function submitEmail() {
  const email = document.getElementById("emailInput").value.trim();
  if (!email) return alert("Masukkan email aktif terlebih dahulu.");

  const product = pendingCheckout.product;
  await createOrder(product, uploadedProofUrl, email);
  document.getElementById("emailModal").style.display = "none";
  alert("Pesanan berhasil dikirim! Tunggu konfirmasi admin.");
}

// ================= CREATE ORDER =================
async function createOrder(p, proofUrl, email) {
  const method = pendingCheckout?.payment_method || "qris";
  const { data, error } = await window.supabase.from("orders").insert([
    {
      product_id: p.id,
      user_id: currentUser.id,
      username: currentUser.username,
      payment_method: method,
      payment_proof: proofUrl,
      contact_email: email,
      status: "waiting_confirmation",
    },
  ]);

  if (error) {
    alert("Gagal membuat order: " + error.message);
  } else {
    loadHistory();
  }
}

// ================= HISTORY =================
async function loadHistory() {
  const { data, error } = await window.supabase
    .from("orders")
    .select("*, products(name)")
    .eq("user_id", currentUser.id)
    .order("id", { ascending: false });

  if (error) return console.error(error);
  const container = document.getElementById("historyItems");
  container.innerHTML = "";

  data.forEach((order) => {
    const div = document.createElement("div");
    div.className = "order-item";
    div.innerHTML = `
      <h4>${order.products?.name || "Produk Dihapus"}</h4>
      <p>Metode: ${order.payment_method.toUpperCase()}</p>
      <p>Status: ${order.status}</p>
      <a href="${order.payment_proof}" target="_blank">Lihat Bukti Transfer</a>
    `;
    container.appendChild(div);
  });
}

// ================= FILTER PRODUK =================
function filterProducts() {
  const query = document.getElementById("productSearch").value.toLowerCase();
  const cards = document.querySelectorAll(".product-card");
  cards.forEach(card => {
    const name = card.querySelector("h3").textContent.toLowerCase();
    card.style.display = name.includes(query) ? "block" : "none";
  });
}

function filterProductsByCategory(category) {
  const buttons = document.querySelectorAll(".category-button");
  buttons.forEach(btn => btn.classList.remove("active"));
  event.target.classList.add("active");

  const { data, error } = window.supabase.from("products").select("*").eq("category", category);
}

