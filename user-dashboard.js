// user-dashboard.js
let cart = [];
let currentUser = null;

async function checkUserAuth() {
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

  if (userError || !userData) {
    alert('Gagal memuat profil, silakan login ulang.');
    await window.supabase.auth.signOut();
    window.location.href = 'signin.html';
    return;
  }

  currentUser = userData;
  showSection('products');
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
        <img src="${p.image}" alt="${p.name}" style="width:150px; height:150px;">
        <button onclick="addToCart(${p.id}, '${escapeHtml(p.name)}', ${p.price})">Tambah ke Cart</button>
        <button onclick="buyNow(${p.id}, '${escapeHtml(p.name)}', ${p.price})">Buy Sekarang</button>
      `;
      container.appendChild(div);
    });
  } else {
    container.innerHTML = '<p>Tidak ada produk.</p>';
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function addToCart(id, name, price) {
  cart.push({ id, name, price });
  updateCartDisplay();
  alert('Ditambahkan ke cart!');
}

function updateCartDisplay() {
  const total = cart.reduce((sum, p) => sum + p.price, 0);
  const cartDiv = document.getElementById('cartItems');
  cartDiv.innerHTML = '';

  if (cart.length === 0) {
    cartDiv.innerHTML = '<p>Keranjang kosong.</p>';
  } else {
    cart.forEach((p, idx) => {
      const item = document.createElement('p');
      item.textContent = `${p.name} - Rp ${p.price.toLocaleString()}`;
      cartDiv.appendChild(item);
    });
    cartDiv.innerHTML += `<p><strong>Total: Rp ${total.toLocaleString()}</strong></p>`;
  }
}

async function buyNow(pid, name, price) {
  if (!currentUser) return alert('Silakan login.');
  const defaultWa = currentUser.whatsapp || '';
  const whatsapp = prompt('Masukkan nomor WhatsApp:', defaultWa);
  if (!whatsapp) return;
  const telegram_username = prompt('Masukkan username Telegram (tanpa @):', '');

  const orderObj = {
    product_id: pid,
    user_id: currentUser.id,
    username: currentUser.username,
    whatsapp,
    telegram_username: telegram_username || null,
    status: 'pending',
    created_at: new Date().toISOString()
  };

  const { error } = await window.supabase.from('orders').insert([orderObj]);
  if (error) return alert('Error: ' + error.message);

  alert('Pesanan dibuat!');
  try {
    await sendTelegramNotification([{ ...orderObj, product_name: name }]);
  } catch (e) {
    console.warn('Telegram notify failed:', e);
  }
  loadHistory();
}

async function checkout() {
  if (cart.length === 0) return alert('Keranjang kosong!');
  if (!currentUser) return alert('Silakan login.');

  const defaultWa = currentUser.whatsapp || '';
  const whatsapp = prompt('Masukkan nomor WhatsApp untuk checkout:', defaultWa);
  if (!whatsapp) return;
  const telegram_username = prompt('Masukkan username Telegram (tanpa @):', '');

  const ordersToInsert = cart.map(p => ({
    product_id: p.id,
    user_id: currentUser.id,
    username: currentUser.username,
    whatsapp,
    telegram_username: telegram_username || null,
    status: 'pending',
    created_at: new Date().toISOString()
  }));

  const { error } = await window.supabase.from('orders').insert(ordersToInsert);
  if (error) return alert('Checkout gagal: ' + error.message);

  alert('Checkout berhasil!');
  try {
    await sendTelegramNotification(
      ordersToInsert.map(o => ({
        ...o,
        product_name: cart.find(p => p.id === o.product_id)?.name || 'Produk'
      }))
    );
  } catch (e) {
    console.warn('Telegram notify failed:', e);
  }

  cart = [];
  updateCartDisplay();
  loadHistory();
}

async function loadHistory() {
  const { data, error } = await window.supabase.from('orders').select('*').eq('user_id', currentUser.id);
  if (error) return console.error(error);

  const productIds = [...new Set((data || []).map(o => o.product_id))];
  let productsMap = {};
  if (productIds.length > 0) {
    const { data: products } = await window.supabase.from('products').select('*').in('id', productIds);
    if (products) {
      productsMap = products.reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
    }
  }

  const historyDiv = document.getElementById('historyItems');
  historyDiv.innerHTML = '';
  if (data && data.length > 0) {
    data.forEach(o => {
      const prod = productsMap[o.product_id];
      const div = document.createElement('div');
      div.className = 'order';
      div.innerHTML = `
        <p><strong>Produk:</strong> ${prod ? prod.name : 'ID: ' + o.product_id}</p>
        <p><strong>Status:</strong> ${o.status}</p>
        <p><strong>WhatsApp:</strong> ${o.whatsapp || '-'}</p>
        <p><strong>Telegram:</strong> ${o.telegram_username ? '@' + o.telegram_username : '-'}</p>
      `;
      historyDiv.appendChild(div);
    });
  } else {
    historyDiv.innerHTML = '<p>Belum ada riwayat pesanan.</p>';
  }
}

function showSection(section) {
  document.getElementById('products').style.display = 'none';
  document.getElementById('cart').style.display = 'none';
  document.getElementById('history').style.display = 'none';
  document.getElementById(section).style.display = 'block';

  if (section === 'products') loadProducts();
  if (section === 'cart') updateCartDisplay();
  if (section === 'history') loadHistory();
}

window.onload = () => {
  checkUserAuth();
};

async function logout() {
  await window.supabase.auth.signOut();
  window.location.href = 'signin.html';
}

// 🔒 Kirim notifikasi aman via API backend
async function sendTelegramNotification(orders) {
  const res = await fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orders })
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt);
  }
              }
