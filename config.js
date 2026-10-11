/**
 * 🔒 ملف الإعدادات الآمن
 * 
 * ⚠️ ملاحظة مهمة: 
 * في الإنتاج، يجب نقل هذه المتغيرات إلى متغيرات البيئة (Environment Variables)
 * أو استخدام Cloud Functions من Firebase
 * 
 * هذا الملف يُحمَّل في المتصفح: لا تضع فيه أي سر (توكنات، كلمات مرور).
 */

const CONFIG = {
  // 🔥 Firebase Configuration
  FIREBASE_BASE_URL: "https://phones-market-default-rtdb.europe-west1.firebasedatabase.app",

  // 🔔 Webhook لإشعارات الطلبات الجديدة (Pipedream → Firebase Cloud Messaging)
  // آمن أن يكون هنا - لا يحتوي أي سر، فقط نقطة استقبال
  ORDER_WEBHOOK_URL: "https://eoql8us6k80w5c2.m.pipedream.net",

  // 🤖 Telegram Bot
  // ⚠️ لا تضع توكن البوت هنا أبداً. أي قيمة في ملف يُحمَّل في المتصفح (config.js)
  // تكون مرئية لأي زائر يفتح "عرض المصدر". التوكن الحقيقي يجب أن يعيش فقط على
  // الخادم (Cloud Function) ولا يُرفع لهذا المتجر العام.
  // راجع FIREBASE_SETUP.md لطريقة إعداد إشعار Telegram من جهة الخادم.
  
  // 🔐 لا تضع أي كلمة مرور هنا. لوحة التحكم تستخدم Firebase Authentication
  // (البريد + كلمة المرور من Firebase Console) وأي قيمة هنا يراها كل زائر.

  // 🏪 هوية المتجر
  STORE_NAME: "R.Shop",
  STORE_TAGLINE: "متجرك لكل ما تحتاجه",

  // 🗂️ أقسام المتجر (مشتركة بين المتجر ولوحة التحكم)
  // لإضافة قسم جديد: أضف سطراً هنا بمعرّف إنجليزي فريد + اسم + أيقونة
  CATEGORIES: [
    { id: "phones",      label: "هواتف",            icon: "📱" },
    { id: "electronics", label: "إلكترونيات",       icon: "🎧" },
    { id: "fashion",     label: "أزياء",            icon: "👕" },
    { id: "home",        label: "المنزل والمطبخ",   icon: "🏡" },
    { id: "beauty",      label: "جمال وعناية",      icon: "💄" },
    { id: "sports",      label: "رياضة",            icon: "⚽" },
    { id: "kids",        label: "أطفال وألعاب",     icon: "🧸" },
    { id: "accessories", label: "إكسسوارات",        icon: "⌚" },
    { id: "other",       label: "منتجات أخرى",      icon: "🛍️" }
  ],

  // أقسام المتجر القديم (متجر الهواتف) تُحوَّل تلقائياً حتى لا تضيع منتجاتك الحالية
  LEGACY_CATEGORY_MAP: {
    flagship: "phones", gaming: "phones", budget: "phones",
    photography: "phones", foldable: "phones"
  },

  normalizeCategory: function (cat) {
    if (!cat) return "other";
    return (CONFIG.LEGACY_CATEGORY_MAP && CONFIG.LEGACY_CATEGORY_MAP[cat]) || cat;
  },

  // ⏱️ Timeouts
  FETCH_TIMEOUT: 10000, // 10 ثوان
  CACHE_DURATION: 3600000, // 1 ساعة
};

// التحقق من أن جميع الإعدادات موجودة
function validateConfig() {
  const requiredKeys = ['FIREBASE_BASE_URL'];
  const missing = requiredKeys.filter(key => !CONFIG[key]);
  
  if (missing.length > 0) {
    console.error('❌ إعدادات مفقودة:', missing);
    return false;
  }
  
  console.log('✅ جميع الإعدادات صحيحة');
  return true;
}

// التحقق من الإعدادات عند التحميل
if (typeof window !== 'undefined') {
  validateConfig();
}

// تصدير الإعدادات
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
