export type Product = {
  id: string; category_id: string; name: string; description: string; price: number;
  compare_at_price?: number; image_url: string; available: boolean; sort_order: number; featured: boolean;
  product_type?: "regular" | "combo"; recommendation_category_ids?: string[];
};
export type ProductOption = {
  id: string; product_id: string; group_name: string; name: string; price_delta: number;
  min_select: number; max_select: number; available: boolean; sort_order: number;
};
export type Offer = {
  id: string; title: string; description: string; image_url: string; discount_type: "percent" | "fixed";
  discount_value: number; min_order: number; coupon_code: string; starts_at: string; ends_at: string;
  active: boolean; sort_order: number;
};
export type Category = { id: string; name: string; description: string; image_url: string; visible: boolean; sort_order: number };
export type Settings = {
  restaurant_name: string; restaurant_tagline: string; logo_url: string; cover_image_url: string;
  whatsapp_number: string; currency: string; primary_color: string; secondary_color?: string;
  delivery_enabled: boolean; dine_in_enabled: boolean; pickup_enabled: boolean; delivery_fee: number;
  minimum_order: number; tax_rate: number; opening_hours_text: string; address_text: string;
  order_disclaimer: string; schema_version: string;
};
export type Menu = {
  products: Product[]; categories: Category[]; settings: Settings; options?: ProductOption[];
  offers?: Offer[]; updatedAt: string; schemaVersion: string;
};
export type Cart = Record<string, number>;

export const safeImage = (url: string) => {
  try { const parsed = new URL(url); return parsed.protocol === "https:" ? parsed.href : ""; }
  catch { return ""; }
};
export const money = (amount: number, currency = "EGP") => {
  try { return new Intl.NumberFormat("ar-EG", { style: "currency", currency: currency || "EGP", maximumFractionDigits: 2 }).format(amount); }
  catch { return new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 2 }).format(amount); }
};
export function buildWhatsAppUrl(phone: string, message: string) {
  const digits = phone.replace(/[^0-9]/g, "");
  if (!/^[1-9][0-9]{7,14}$/.test(digits)) throw new Error("رقم WhatsApp للمتجر غير صحيح");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
export function validateMenu(raw: unknown): Menu {
  if (!raw || typeof raw !== "object") throw new Error("بيانات المتجر غير صالحة");
  const menu = raw as Menu;
  if (!Array.isArray(menu.products) || !Array.isArray(menu.categories) || !menu.settings || typeof menu.settings !== "object")
    throw new Error("بيانات المتجر غير مكتملة");
  if (String(menu.schemaVersion) !== "1") throw new Error("إصدار بيانات المتجر غير مدعوم");
  const visibleCategories = new Set(menu.categories.filter(category => category.visible).map(category => category.id));
  const ids = new Set<string>();
  const products = menu.products.filter(product => {
    if (!product || !product.id || ids.has(product.id) || !visibleCategories.has(product.category_id) || !product.name ||
        typeof product.price !== "number" || !Number.isFinite(product.price) || product.price < 0) return false;
    ids.add(product.id); return true;
  }).map(product => ({ ...product, image_url: safeImage(product.image_url || "") }));
  return {
    ...menu,
    products,
    categories: menu.categories.filter(category => category.visible).map(category => ({ ...category, image_url: safeImage(category.image_url || "") })),
    settings: { ...menu.settings, logo_url: safeImage(menu.settings.logo_url || ""), cover_image_url: safeImage(menu.settings.cover_image_url || "") },
    options: Array.isArray(menu.options) ? menu.options : [], offers: Array.isArray(menu.offers) ? menu.offers : [],
  };
}
