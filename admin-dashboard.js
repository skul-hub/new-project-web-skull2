// admin-dashboard.js
let currentUser = null;

async function checkAdminAuth() {
  const { data: { user }, error } = await window.supabase.auth.getUser();
  if (error || !user) {
    window.location.href = 'signin.html';
    return;
  }

  const { data: userData, error: userError } = await window.supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (userError || !userData || userData.role !== 'admin') {
    alert('Akses ditolak. Anda bukan admin.');
    await window.supabase.auth.signOut();
    window.location.href = 'signin.html';
    return;
  }

  currentUser = userData;
  showSection('orders'); // default buka Orders
}

function showSection(section) {
  document.getElementById('orders').style.display = 'none';
  document.getElementById('products').style.display = 'none';
  document.getElementById(section).style.display = 'block';

  if (section === 'orders') loadOrders();
  if (section === 'products') loadProducts();
}

async function loadOrders() {
  const { data, error } = await window.supabase
    .from('orders')
    .select('*, products(name)')
    .order('created_at', { ascending: false });

  if (error) return console.error(error);

  const container = document.getElementById('ordersContainer');
  container.innerHTML = '';

  if (data && data.length > 0) {
    data.forEach(o => {
      const div = document.createElement('div');
      div.className = 'order';
      div.innerHTML = `
        <p><strong>Produk:</strong> ${o.products?.name || '-'}</p>
        <p><strong>User:</strong> ${o.username}</p>
        <p><strong>WhatsApp:</strong> ${o.whatsapp}</p>
        <p><strong>Telegram:</strong> @${o.telegram_username || '-'}</p>
        <p><strong>Status:</strong> ${o.status}</p>
        <p><strong>Bukti TF:</strong> ${o.payment_proof ? `<a href="${o.payment_proof}" target="_blank">Lihat</a>` : '-'}</p>
        <button onclick="updateOrderStatus(${o.id}, 'payment_received')">Pembayaran Masuk</button>
        <button onclick="updateOrderStatus(${o.id}, 'payment_failed')">Pembayaran Tidak Masuk</button>
        <button onclick="updateOrderStatus(${o.id}, 'done')">Pesanan Selesai</button>
      `;
      container.appendChild(div);
    });
  } else {
    container.innerHTML = '<p>Tidak ada order.</p>';
  }
}

async function updateOrderStatus(orderId, status) {
  const { data, error } = await window.supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select('*, products(name)')
    .single();

  if (error) return alert('Error: ' + error.message);

  // Notify Telegram
  await fetch('/api/notify', {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orders: [{
        username: data.username,
        product_name: data.products?.name || '-',
        whatsapp: data.whatsapp,
        telegram_username: data.telegram_username,
        payment_proof: data.payment_proof,
        status: status
      }]
    })
  });

  alert('Status order diperbarui!');
  loadOrders();
}

async function loadProducts() {
  const { data, error } = await window.supabase.from('products').select('*');
  if (error) return console.error(error);

  const container = document.getElementById('productsContainer');
  container.innerHTML = '';
  if (data && data.length > 0) {
    data.forEach(p => {
      const div = document.createElement('div');
      div.className = 'product';
      div.innerHTML = `
        <h3>${p.name}</h3>
        <p>Rp ${p.price.toLocaleString()}</p>
        <img src="${p.image}" alt="${p.name}" style="width:100px;height:100px;">
      `;
      container.appendChild(div);
    });
  } else {
    container.innerHTML = '<p>Belum ada produk.</p>';
  }
}

async function addProduct(e) {
  e.preventDefault();
  const name = document.getElementById('productName').value;
  const price = parseInt(document.getElementById('productPrice').value);
  const image = document.getElementById('productImage').value;

  const { error } = await window.supabase.from('products').insert([{ name, price, image }]);
  if (error) return alert('Error: ' + error.message);

  alert('Produk berhasil ditambahkan!');
  document.getElementById('addProductForm').reset();
  loadProducts();
}

window.onload = () => {
  checkAdminAuth();
};

async function logout() {
  await window.supabase.auth.signOut();
  window.location.href = 'signin.html';
          }
