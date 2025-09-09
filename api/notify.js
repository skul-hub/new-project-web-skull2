// /api/notify.js
// Serverless Function untuk notifikasi Telegram
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
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

    if (!token || !chatId) {
      return res.status(500).json({ error: "Telegram config missing" });
    }

    // Ambil order terbaru (biasanya cuma 1 per call)
    const o = orders[0];
    let text = "";

    // Buat pesan sesuai status
    switch (o.status) {
      case "waiting_confirmation":
        text = `📥 *MENUNGGU KONFIRMASI PEMBAYARAN*\n\n`;
        text += `👤 Username: ${o.username}\n`;
        text += `📦 Produk: ${o.product_name}\n`;
        text += `📱 WhatsApp: ${o.whatsapp}\n`;
        text += `💬 Telegram: ${o.telegram_username ? "@" + o.telegram_username : "-"}\n`;
        text += `📸 Bukti: ${o.payment_proof ? o.payment_proof : "-"}\n`;
        text += `⚡ Status: waiting_confirmation\n`;
        break;

      case "payment_received":
        text = `✅ *PEMBAYARAN MASUK*\n\n`;
        text += `👤 Username: ${o.username}\n`;
        text += `📦 Produk: ${o.product_name}\n`;
        text += `📱 WhatsApp: ${o.whatsapp}\n`;
        text += `💬 Telegram: ${o.telegram_username ? "@" + o.telegram_username : "-"}\n`;
        text += `⚡ Status: payment_received\n`;
        break;

      case "payment_failed":
        text = `❌ *PEMBAYARAN TIDAK MASUK*\n\n`;
        text += `👤 Username: ${o.username}\n`;
        text += `📦 Produk: ${o.product_name}\n`;
        text += `📱 WhatsApp: ${o.whatsapp}\n`;
        text += `💬 Telegram: ${o.telegram_username ? "@" + o.telegram_username : "-"}\n`;
        text += `⚡ Status: payment_failed\n`;
        break;

      case "done":
        text = `🎉 *PESANAN SELESAI*\n\n`;
        text += `👤 Username: ${o.username}\n`;
        text += `📦 Produk: ${o.product_name}\n`;
        text += `📱 WhatsApp: ${o.whatsapp}\n`;
        text += `💬 Telegram: ${o.telegram_username ? "@" + o.telegram_username : "-"}\n`;
        text += `⚡ Status: done\n`;
        break;

      default:
        text = `ℹ️ Update Pesanan\n\n`;
        text += `👤 Username: ${o.username}\n`;
        text += `📦 Produk: ${o.product_name}\n`;
        text += `📱 WhatsApp: ${o.whatsapp}\n`;
        text += `💬 Telegram: ${o.telegram_username ? "@" + o.telegram_username : "-"}\n`;
        text += `⚡ Status: ${o.status}\n`;
        break;
    }

    // Kirim ke Telegram
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
