import type { Menu, Product } from "./domain";

// Snapshot of the ten products visible in the supplied WhatsApp catalog
// on 23 October 2026. Images and longer descriptions are deferred.
const items: Array<[string, string, string, number, number, string]> = [
  ["catalog-sweets", "sweets", "الحلويات", 900, 1000, ""],
  ["catalog-mixes", "mixes", "خلطات", 400, 450, ""],
  ["catalog-brand", "more", "براند أبو البنات", 250, 300, ""],
  ["catalog-products", "more", "منتجات", 350, 400, ""],
  ["catalog-abu-albanat", "more", "أبو البنات", 250, 300, ""],
  ["catalog-nature", "honey", "روح الطبيعة", 250, 300, ""],
  ["catalog-beautiful", "more", "جميل", 300, 400, ""],
  ["catalog-natural", "more", "منتجات طبيعية", 300, 350, ""],
  ["catalog-400", "more", "٤٠٠", 300, 0, ""],
  ["catalog-apiary", "honey", "براند أبو البنات", 400, 500, ""],
  ["couples-blend", "thursday", "خلطة أبو البنات للمتزوجين", 0, 0, "التفاصيل والسعر عند التواصل"],
  ["royal-jelly", "bee", "غذاء ملكات النحل", 0, 0, "السعر والتفاصيل عند التواصل"],
  ["propolis", "bee", "بروبوليس", 0, 0, "السعر والتفاصيل عند التواصل"],
  ["bee-pollen", "bee", "حبوب اللقاح", 0, 0, "السعر والتفاصيل عند التواصل"],
  ["palm-pollen", "bee", "طلع النخيل", 0, 0, "السعر والتفاصيل عند التواصل"],
  ["local-royal-jelly", "bee", "غذاء ملكي بلدي", 0, 0, "السعر والتفاصيل عند التواصل"],
  ["korean-ginseng", "mixes", "جنسنج كوري", 0, 0, "السعر والتفاصيل عند التواصل"],
  ["black-seed-honey", "honey", "عسل جبلي حبة البركة", 0, 0, "السعر والتفاصيل عند التواصل"],
];

const namesToReview = new Set([
  "catalog-sweets", "catalog-mixes", "catalog-brand", "catalog-products",
  "catalog-abu-albanat", "catalog-beautiful", "catalog-natural", "catalog-400", "catalog-apiary",
]);
const products: Product[] = items.map(([id, category_id, name, price, compare_at_price, description], index) => ({
  id, category_id, name, price, compare_at_price, description, image_url: "", available: !namesToReview.has(id),
  sort_order: index + 1, featured: index < 3,
}));

export const honeyDemo: Menu = {
  products,
  categories: [
    { id: "offers", name: "العروض", description: "منتجات بسعر خاص", image_url: "", visible: true, sort_order: 1 },
    { id: "honey", name: "أنواع العسل", description: "من خير المناحل", image_url: "", visible: true, sort_order: 2 },
    { id: "mixes", name: "خلطات علاجية", description: "تركيبات من منتجات الخلية", image_url: "", visible: true, sort_order: 3 },
    { id: "bee", name: "منتجات النحل", description: "غذاء ملكي وحبوب لقاح", image_url: "", visible: true, sort_order: 4 },
    { id: "family", name: "الأسرة والأطفال", description: "اختيارات للعائلة", image_url: "", visible: true, sort_order: 5 },
    { id: "thursday", name: "ليلة الخميس", description: "خلطات المتزوجين", image_url: "", visible: true, sort_order: 6 },
  ],
  settings: {
    restaurant_name: "براند أبو البنات", restaurant_tagline: "اسأل مجرّب ولا تنسى الطبيب",
    logo_url: "", cover_image_url: "", whatsapp_number: "201016262423", currency: "EGP",
    primary_color: "#6d321e", secondary_color: "#e9a934",
    delivery_enabled: true, dine_in_enabled: false, pickup_enabled: true,
    delivery_fee: 0, minimum_order: 0, tax_rate: 0,
    opening_hours_text: "", address_text: "", order_disclaimer: "",
    schema_version: "1",
  },
  options: [], offers: [], updatedAt: new Date().toISOString(), schemaVersion: "1",
};
