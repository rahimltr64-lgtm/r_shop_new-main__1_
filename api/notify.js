// ============================================================
// api/notify.js — دالة Vercel (Serverless) لإشعار Telegram عند وصول طلب جديد
// ------------------------------------------------------------
// المتغيرات المطلوبة (Vercel → Settings → Environment Variables):
//   TELEGRAM_TOKEN / TELEGRAM_CHAT_ID إلزاميان
//   FIREBASE_BASE_URL (اختياري)
// ============================================================

const DEFAULT_DB = 'https://phones-market-default-rtdb.europe-west1.firebasedatabase.app';
const MAX_AGE_MS = 15 * 60 * 1000;

let cachedChatId = null;

async function resolveChatId(token, chatId) {
  const botId = token.split(':')[0];
  if (String(chatId) !== botId) return String(chatId);
  if (cachedChatId) return cachedChatId;
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
    const j = r.ok ? await r.json() : null;
    const list = (j && j.result) || [];
    for (let i = list.length - 1; i >= 0; i--) {
      const chat = list[i].message && list[i].message.chat;
      if (chat && chat.type === 'private') { cachedChatId = String(chat.id); return cachedChatId; }
    }
  } catch (_) {}
  return null;
}

const esc = (v) => String(v ?? '-').replace(/[&<>]/g, (c) => ({ '&': '&', '<': '<', '>': '>' }[c]));

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const token = process.env.TELEGRAM_TOKEN;
  const rawChatId = process.env.TELEGRAM_CHAT_ID;
  const db = (process.env.FIREBASE_BASE_URL || DEFAULT_DB).replace(/\/$/, '');

  if (!token || !rawChatId) {
    console.error('Missing TELEGRAM_TOKEN or TELEGRAM_CHAT_ID');
    return res.status(500).json({ ok: false, error: 'telegram_env_missing' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (_) { body = {}; } }
    const orderId = String((body && body.orderId) || '').trim();
    if (!/^\d{6}$/.test(orderId)) {
      return res.status(400).json({ ok: false, error: 'bad_order_id' });
    }

    const r = await fetch(`${db}/orders/${orderId}.json`);
    const order = r.ok ? await r.json() : null;
    if (!order) return res.status(404).json({ ok: false, error: 'order_not_found' });

    if (order.telegramNotified) return res.status(200).json({ ok: true, skipped: 'already_notified' });

    const age = Date.now() - new Date(order.createdAt || 0).getTime();
    if (!(age >= -60000 && age <= MAX_AGE_MS)) {
      return res.status(200).json({ ok: true, skipped: 'order_too_old' });
    }

    const chatId = await resolveChatId(token, rawChatId);
    if (!chatId) {
      return res.status(500).json({ ok: false, error: 'chat_id_unresolved' });
    }

    try {
      await fetch(`${db}/orders/${orderId}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramNotified: true })
      });
    } catch (_) {}

    const total = Number(order.totalPrice || 0).toLocaleString('en-US');
    const created = order.createdAt
      ? new Date(order.createdAt).toLocaleString('ar-DZ', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Algiers' })
      : '-';
    const phone = String(order.phone || '').replace(/\s+/g, '');

    const text =
      `🛍️ <b>طلب جديد #${esc(order.orderId || orderId)}</b>\n` +
      `━━━━━━━━━━━━━━\n` +
      `⏰ ${esc(created)}\n\n` +
      `📦 <b>المنتج:</b>\n${esc(order.product || '-')}\n` +
      (order.productBrand ? `🏷 <b>الماركة:</b> ${esc(order.productBrand)}\n` : '') +
      (order.storage ? `💾 <b>الخيار:</b> ${esc(order.storage)}\n` : '') +
      (order.color ? `🎨 <b>اللون:</b> ${esc(order.color)}\n` : '') +
      (order.category ? `📂 <b>القسم:</b> ${esc(order.category)}\n` : '') +
      `\n💰 <b>الإجمالي:</b> <code>${esc(total)} DA</code>\n` +
      `━━━━━━━━━━━━━━\n` +
      `👤 <b>الزبون:</b> ${esc(order.name || '-')}\n` +
      `📞 <b>الهاتف:</b> <code>${esc(phone)}</code>\n` +
      `📍 <b>العنوان:</b> ${esc(order.wilaya || '-')} - ${esc(order.baladia || '-')}\n` +
      `🚚 <b>التوصيل:</b> ${esc(order.deliveryType || '-')}\n` +
      `📌 <b>الحالة:</b> ${esc(order.status || 'قيد الانتظار')}`;

    const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📋 فتح لوحة التحكم', url: 'https://rshopnew.vercel.app/dashboard.html' }
            ]
          ]
        }
      })
    });

    if (!tg.ok) {
      try {
        await fetch(`${db}/orders/${orderId}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegramNotified: false })
        });
      } catch (_) {}
      return res.status(502).json({ ok: false, error: 'telegram_failed', status: tg.status });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
};
