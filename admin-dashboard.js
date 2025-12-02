// =====================================================
// ADMIN DASHBOARD — STORESKULL
// Semua fungsi sudah digabung + dirapikan + fix error
// =====================================================

// CEK AUTENTIKASI ADMIN
document.addEventListener("DOMContentLoaded", async () => {
    const { data } = await window.supabase.auth.getUser();
    if (!data.user) return (window.location.href = "signin.html");

    if (data.user.user_metadata.role !== "admin") {
        alert("Akses ditolak! Anda bukan admin.");
        return (window.location.href = "index.html");
    }

    loadProducts();
    loadOrders();
    loadScripts();
    loadSettings();
});

// =====================================================
// LOAD PRODUCTS
// =====================================================
async function loadProducts() {
    const { data, error } = await window.supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

    const list = document.getElementById("productList");
    list.innerHTML = "";

    if (error) return console.error(error);

    data.forEach((p) => {
        list.innerHTML += `
      <div class="admin-product-card">
        <img src="${p.image}" class="admin-prod-img">
        <h3>${p.name}</h3>
        <p>Rp ${p.price.toLocaleString()}</p>
        <p>Stock: ${p.stock}</p>
        <button onclick="deleteProduct(${p.id})" class="danger-btn">Hapus</button>
      </div>`;
    });
}

// =====================================================
// ADD PRODUCT
// =====================================================
async function addProduct(event) {
    event.preventDefault();

    const name = document.getElementById("prodName").value;
    const price = document.getElementById("prodPrice").value;
    const stock = document.getElementById("prodStock").value;
    const category = document.getElementById("prodCategory").value;
    const imgFile = document.getElementById("prodImage").files[0];

    if (!imgFile) return alert("Pilih gambar produk!");

    const ext = imgFile.name.split(".").pop();
    const fileName = `product_${Date.now()}.${ext}`;

    const { error: uploadErr } = await window.supabase.storage
        .from("product_images")
        .upload(fileName, imgFile);

    if (uploadErr) return alert("Gagal upload gambar!");

    const { data: urlData } = window.supabase.storage
        .from("product_images")
        .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;

    const { error } = await window.supabase.from("products").insert([
        { name, price, stock, category, image: imageUrl },
    ]);

    if (error) return alert("Gagal menambahkan produk!");

    alert("Produk berhasil ditambahkan!");
    loadProducts();
}

// =====================================================
// DELETE PRODUCT
// =====================================================
async function deleteProduct(id) {
    if (!confirm("Hapus produk ini?")) return;

    const { error } = await window.supabase
        .from("products")
        .delete()
        .eq("id", id);

    if (error) return alert("Gagal menghapus produk!");

    loadProducts();
}

// =====================================================
// LOAD ORDERS (INFO PEMBELI)
// =====================================================
async function loadOrders() {
    const { data, error } = await window.supabase
        .from("orders_view")
        .select("*")
        .order("created_at", { ascending: false });

    const list = document.getElementById("orderList");
    list.innerHTML = "";

    if (error) return console.error(error);

    data.forEach((o) => {
        list.innerHTML += `
      <div class="order-card">
        <h3>${o.product_name}</h3>
        <p>Pembeli: ${o.username}</p>
        <p>Status: <b>${o.status}</b></p>
        <button onclick="updateOrderStatus(${o.id}, 'done')" class="primary-btn">Selesaikan</button>
        <button onclick="updateOrderStatus(${o.id}, 'cancel')" class="danger-btn">Batalkan</button>
      </div>`;
    });
}

// =====================================================
// UPDATE ORDER STATUS
// =====================================================
async function updateOrderStatus(id, status) {
    const { error } = await window.supabase
        .from("orders")
        .update({ status })
        .eq("id", id);

    if (error) return alert("Gagal update status!");

    loadOrders();
}

// =====================================================
// LOAD INFO SCRIPT
// =====================================================
async function loadScripts() {
    const { data, error } = await window.supabase
        .from("scripts")
        .select("*")
        .order("created_at", { ascending: false });

    const container = document.getElementById("scriptListAdmin");
    container.innerHTML = "";

    if (error) return console.error(error);

    data.forEach((s) => {
        container.innerHTML += `
      <div class="script-card-admin">
        <img src="${s.image_url}" class="script-image-admin">
        <h3>${s.name}</h3>
        <button onclick="deleteScript(${s.id})" class="danger-btn">Hapus</button>
      </div>`;
    });
}

// =====================================================
// ADD SCRIPT
// =====================================================
async function addScript(event) {
    event.preventDefault();

    const name = document.getElementById("scriptName").value;
    const link = document.getElementById("scriptDownload").value;
    const imgFile = document.getElementById("scriptImage").files[0];

    if (!imgFile) return alert("Pilih gambar script!");

    const fileName = `script_${Date.now()}.${imgFile.name.split(".").pop()}`;

    const { error: uploadErr } = await window.supabase.storage
        .from("script_images")
        .upload(fileName, imgFile);

    if (uploadErr) return alert("Gagal upload gambar!");

    const { data: urlData } = window.supabase.storage
        .from("script_images")
        .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;

    const { error } = await window.supabase.from("scripts").insert([
        { name, download_link: link, image_url: imageUrl },
    ]);

    if (error) return alert("Gagal menambahkan script!");

    alert("Script berhasil ditambahkan!");
    loadScripts();
}

// =====================================================
// DELETE SCRIPT
// =====================================================
async function deleteScript(id) {
    if (!confirm("Hapus script?")) return;

    const { error } = await window.supabase
        .from("scripts")
        .delete()
        .eq("id", id);

    if (error) return alert("Gagal menghapus script!");

    loadScripts();
}

// =====================================================
// LOAD SETTINGS (QRIS / DANA / GOPAY / ANNOUNCEMENT / BANNER)
// =====================================================
async function loadSettings() {
    const { data, error } = await window.supabase
        .from("settings")
        .select("*")
        .eq("id", 1)
        .single();

    if (error) return console.error(error);

    document.getElementById("setAnnouncement").value =
        data.announcement || "";

    document.getElementById("setDana").value = data.dana_number || "";
    document.getElementById("setGopay").value = data.gopay_number || "";
    document.getElementById("setQris").value = data.qris_image_url || "";

    document.getElementById("promoMessages").value =
        (data.promo_messages || []).join("\n");
}

// =====================================================
// SAVE SETTINGS
// =====================================================
async function saveSettings() {
    const announcement = document.getElementById("setAnnouncement").value;
    const dana = document.getElementById("setDana").value;
    const gopay = document.getElementById("setGopay").value;
    const qris = document.getElementById("setQris").value;

    const promoText = document.getElementById("promoMessages").value.trim();
    const promoMessages = promoText
        ? promoText.split("\n").map((v) => v.trim())
        : [];

    const { error } = await window.supabase
        .from("settings")
        .update({
            announcement,
            dana_number: dana,
            gopay_number: gopay,
            qris_image_url: qris,
            promo_messages: promoMessages,
            updated_at: new Date(),
        })
        .eq("id", 1);

    if (error) return alert("Gagal menyimpan setting!");

    alert("✔️ Pengaturan berhasil disimpan!");
}

// =====================================================
// UPLOAD QRIS IMAGE
// =====================================================
async function uploadQrisImage(event) {
    event.preventDefault();
    const file = document.getElementById("qrisFile").files[0];
    if (!file) return alert("Pilih file QRIS dulu!");

    const fileName = `qris_${Date.now()}.${file.name.split(".").pop()}`;

    const { error: uploadErr } = await window.supabase.storage
        .from("qris_images")
        .upload(fileName, file);

    if (uploadErr) return alert("Gagal upload QRIS!");

    const { data: urlData } = window.supabase.storage
        .from("qris_images")
        .getPublicUrl(fileName);

    const url = urlData.publicUrl;

    document.getElementById("setQris").value = url;

    alert("QRIS berhasil diupload!");
}
