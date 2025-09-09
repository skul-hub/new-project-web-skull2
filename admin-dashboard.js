// admin-dashboard.js
let currentAdminUser = null;

async function checkAdminRole() {
  const { data: { user }, error } = await window.supabase.auth.getUser();
  if (error || !user) {
    window.location.href = 'signin.html';
    return;
  }

  const { data: userData, error: userError } = await window.supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userError || !userData || userData.role !== 'admin') {
    alert('Akses ditolak. Anda bukan admin.');
    window.location.href = 'user-dashboard.html';
    return;
  }

  currentAdminUser = user;
  showSection('products');
}

document.getElementById('addProductForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('prodName').value;
  const price = parseInt(document.getElementById('prodPrice').value);
  const image = document.getElementById('prodImage').value;

  const { error } = await window.supabase.from('products').insert([{ name, price, image }]);
  if (error) alert('Error adding product: ' + error.message);
  else {
    alert('Produk ditambahkan!');
    loadProducts();
    e.target.reset();
  }
});

async function loadProducts() {
  const { data, error } = await window.supabase.from('products').select('*');
  if (error) return console.error('Error loading products:', error);

  const list = document.getElementById('productsList');
  list.innerHTML = '';
  if (data && data.length > 0) {
    data.forEach(p => {
      const div = document.createElement('div');
      div.className = 'product';
      div.innerHTML = `
        <h3>${p.name}</h3>
        <p>Rp ${p.price.toLocaleString()}</p>
        <img src="${p.image}" alt="${p.name}" style="width:150px; height:150px;">
        <button onclick="deleteProduct(${p.id})">Hapus</button>
      `;
      list.appendChild(div);
    });
  } else {
    list.innerHTML = '<p>Tidak ada produk.</p>';
  }
}

async function deleteProduct(id) {
  if (confirm('Yakin hapus produk ini?')) {
    const { error } = await window.supabase.from('products').delete().eq('id', id);
    if (error) alert('Error deleting: ' + error.message);
    else loadProducts();
  }
}

async function loadOrders() {
  const { data, error } = await window.supabase.from('orders').select('*').order('created_at', { ascending: false });
  if (error) return console.error('Error loading orders:', error);

  const productIds = [...new Set((data || []).map(o => o.product_id))];
  let productsMap = {};
  if (productIds.length > 0) {
    const { data: products } = await window.supabase.from('products').select('*').in('id', productIds);
    if (products) {
      productsMap = products.reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
    }
  }

  const ordersList = document.getElementById('ordersList');
  ordersList.innerHTML = '';
  if (data && data.length > 0) {
    data.forEach(o => {
      const product = productsMap[o.product_id];
      const div = document.createElement('div');
      div.className = 'order';
      div.innerHTML = `
        <p><strong>Username:</strong> ${o.username || '-'}</p>
        <p><strong>Nama Produk:</strong> ${product ? product.name : 'ID: ' + o.product_id}</p>
        <p><strong>WhatsApp:</strong> ${o.whatsapp || '-'}</p>
        <p><strong>Telegram:</strong> ${o.telegram_username ? '@' + o.telegram_username : '-'}</p>
        <p><strong>Status:</strong> ${o.status}</p>
        <button onclick="updateStatus(${o.id}, 'done')">Selesai</button>
        <button onclick="updateStatus(${o.id}, 'cancelled')">Batalkan</button>
      `;
      ordersList.appendChild(div);
    });
  } else {
    ordersList.innerHTML = '<p>Tidak ada pesanan.</p>';
  }
}

async function updateStatus(id, status) {
  const { error } = await window.supabase.from('orders').update({ status }).eq('id', id);
  if (error) alert('Error update: ' + error.message);
  else loadOrders();
}

function showSection(section) {
  document.getElementById('products').style.display = 'none';
  document.getElementById('orders').style.display = 'none';
  document.getElementById(section).style.display = 'block';

  if (section === 'products') loadProducts();
  if (section === 'orders') loadOrders();
}

window.onload = () => {
  checkAdminRole();
};

async function logout() {
  await window.supabase.auth.signOut();
  window.location.href = 'signin.html';
    }
