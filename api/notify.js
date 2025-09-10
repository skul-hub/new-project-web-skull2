// api/notify.js
// Ini adalah file untuk backend (misalnya, Vercel Function, Netlify Function, atau Express route)
// BUKAN untuk dijalankan langsung di browser.

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { orders } = req.body;
    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

    if (!BOT_TOKEN || !CHAT_ID) {
      console.error("TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID is not set.");
      return res.status(500).json({ error: "Telegram bot credentials not configured." });
    }

    for (const o of orders) {
      let caption = "";

      // Escape HTML entities for safety, though for simple text it might not be strictly necessary
      // but good practice if user-generated content is involved.
      const escapeHtml = (text) => {
        return text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      };

      const orderId = escapeHtml(String(o.id));
      const username = escapeHtml(o.username);
      const productName = escapeHtml(o.product_name);
      const paymentMethod = escapeHtml(o.payment_method);
      const status = escapeHtml(o.status.replace(/_/g, ' ').toUpperCase()); // Format status for display

      if (o.status === "waiting_confirmation") {
        caption = `
🛒 <b>Pesanan Baru</b>

🆔 Order ID: <code>${orderId}</code>
👤 User: <b>${username}</b>
📦 Produk: <b>${productName}</b>
💳 Metode: <b>${paymentMethod}</b>
📄 Status: <b>Pending Konfirmasi</b>
        `;
      } else {
        caption = `
📢 <b>Update Pesanan</b>

🆔 Order ID: <code>${orderId}</code>
👤 User: <b>${username}</b>
📦 Produk: <b>${productName}</b>
📄 Status: <b>${status}</b>
        `;
      }

      if (o.payment_proof) {
        // Send photo with caption
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: CHAT_ID,
            photo: o.payment_proof,
            caption: caption,
            parse_mode: "HTML",
          }),
        });
      } else {
        // Send text message
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: CHAT_ID,
            text: caption,
            parse_mode: "HTML",
          }),
        });
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error in notify API:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
