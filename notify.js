// /api/notify.js (Serverless Function di Vercel)
// Kirim notifikasi langsung ke akun admin (private chat), bukan grup
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { orders } = req.body;
    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID; // ini isi dengan ID kamu

    if (!token || !chatId) {
      return res.status(500).json({ error: "Telegram config missing" });
    }

    let text = `📥 *Orderan Baru Masuk*\n\n`;
    orders.forEach(o => {
      text += `👤 Username: ${o.username}\n`;
      text += `📦 Produk: ${o.product_name}\n`;
      text += `📱 WhatsApp: ${o.whatsapp}\n`;
      text += `💬 Telegram: ${o.telegram_username ? '@' + o.telegram_username : '-'}\n`;
      text += `⚡ Status: ${o.status}\n\n`;
    });
    text += `🔥 Silakan segera diproses.`;

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown"
      })
    });

    if (!response.ok) {
      const txt = await response.text();
      throw new Error(txt);
    }

    res.status(200).json({ success: true });
  } catch (e) {
    console.error("Notify error:", e);
    res.status(500).json({ error: e.message });
  }
  }
