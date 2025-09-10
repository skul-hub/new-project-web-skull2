// api/notify.js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { orders } = req.body;
    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

    for (const o of orders) {
      let caption = "";

      if (o.status === "waiting_confirmation") {
        caption = `
🛒 Pesanan Baru

🆔 Order ID: ${o.id}
👤 User: ${o.username}
📦 Produk: ${o.product_name}
💳 Metode: ${o.payment_method}
📄 Status: Pending
        `;
      } else {
        caption = `
📢 Update Pesanan

🆔 Order ID: ${o.id}
👤 User: ${o.username}
📦 Produk: ${o.product_name}
📄 Status: ${o.status.toUpperCase()}
        `;
      }

      if (o.payment_proof) {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: CHAT_ID,
            photo: o.payment_proof,
            caption,
            parse_mode: "HTML",
          }),
        });
      } else {
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
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
