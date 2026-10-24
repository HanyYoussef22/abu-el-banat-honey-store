import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowLeft, BadgeCheck, ChevronLeft, ChevronRight, Heart, Leaf, Menu as MenuIcon, MessageCircle, Minus, Plus, Search, ShieldCheck, ShoppingBag, Truck, X } from "lucide-react";
import { buildWhatsAppUrl, money, safeImage, type Menu, type Product } from "./domain";
import { honeySheetConfigured, loadHoneyCatalog, savedHoneyCatalog } from "./honey-sheet";
import { honeyDemo } from "./honey-demo";
import managerPhoto from "./assets/marketing-manager.webp";
import heroBeeProducts from "./assets/honey-hero-wide.png";
import heroOwnerPromo from "./assets/owner-hero-wide.png";
import heroHoneyDefault from "./assets/honey-hero.webp";
import couplesHero from "./assets/couples-hero-wide.png";
import couplesDetails from "./assets/couples-details-wide.png";
import familyHoneyHero from "./assets/family-honey-hero.png";
import ownerPortrait from "./assets/wael-selim-owner.webp";
import bannerBrandLogo from "./assets/banner-brand-logo.png";
import brandLogoFallback from "./assets/brand-logo-enhanced.png";
import "./honey.css";

type Cart = Record<string, number>;
const cartKey = "honey-store-cart-v1";
const favoritesKey = "honey-store-favorites-v1";
const managerWhatsApp = "201223354517";
const storefrontCategories = [
  { id: "offers", name: "العروض", description: "أسعار مميزة", symbol: "✦" },
  { id: "honey", name: "أنواع العسل", description: "من خير المناحل", symbol: "⬡" },
  { id: "mixes", name: "خلطات علاجية", description: "تركيبات من منتجات الخلية", symbol: "◈" },
  { id: "bee", name: "منتجات النحل", description: "غذاء ملكي وحبوب لقاح", symbol: "❀" },
  { id: "family", name: "الأسرة والأطفال", description: "اختيارات للعائلة", symbol: "♡" },
  { id: "thursday", name: "ليلة الخميس", description: "خلطات المتزوجين", symbol: "✧" },
] as const;
function storefrontCategory(product: Product): string | null {
  if (product.category_id === "thursday" || product.category_id === "sweets" || product.category_id === "mixes" && /المتزوجين|ليلة الخميس/.test(product.name)) return "thursday";
  if (["honey", "mixes", "bee", "family"].includes(product.category_id)) return product.category_id;
  return null;
}
const heroSlides = [
  { src: heroBeeProducts, alt: "منتجات العسل والنحل من براند أبو البنات", kicker: "من الطبيعة إلى بيتك", title: "حلاوة الطبيعة", accent: "في كل معلقة", description: "اكتشف أنواع العسل ومنتجات الخلية والخلطات الطبيعية من براند أبو البنات.", action: "تسوق المنتجات", category: "all" },
  { src: couplesHero, alt: "عبوة خلطة المتزوجين من براند أبو البنات", kicker: "اختيارات للمتزوجين", title: "خلطة المتزوجين", accent: "من براند أبو البنات", description: "تعرّف على مكونات الخلطة وتفاصيلها، وتواصل بسرية للاستفسار قبل الطلب.", action: "استفسر عن الخلطة", category: "thursday" },
  { src: heroOwnerPromo, alt: "وائل سليم يقدم العسل من قلب المنحل", kicker: "خبرة من قلب المنحل", title: "وائل سليم", accent: "خبير خلطات العسل", description: "نحّال وتاجر، درس دبلومة مصل النحل والطب الصيني والشمولي، ويحضّر خلطات العسل الطبيعية.", action: "اعرف قصتنا", category: "about" },
  { src: couplesDetails, alt: "عبوة خلطة المتزوجين ومميزات اختيار خلطات العسل", kicker: "اختيارات ليلة الخميس", title: "خلطات العسل", accent: "للمتزوجين", description: "من خبرة وائل سليم في منتجات الخلية وتحضير خلطات العسل.", action: "تصفح الاختيارات", category: "thursday" },
  { src: familyHoneyHero, alt: "أسرة مع طفلة في سن المدرسة حول مائدة إفطار فيها عسل", kicker: "من خير الطبيعة للأسرة", title: "خلطات العسل", accent: "للأطفال والأسرة", description: "خلطات عسل طبيعية ضمن الاهتمام بتغذية الأسرة وتعزيز المناعة. تعرّف على مكوناتها وما يلائم طفلك. العسل لا يُقدّم للأطفال دون عام.", action: "استكشف اختيارات الأسرة", category: "family" },
];
function managerLink(message: string) { return buildWhatsAppUrl(managerWhatsApp, message); }
function phoneText(value: string) { const digits = value.replace(/\D/g, ""); return digits.startsWith("20") && digits.length === 12 ? `0${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}` : `+${digits}`; }

function readStorage<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || "null") || fallback; }
  catch { return fallback; }
}

function readCart(): Cart {
  const raw = readStorage<Record<string, unknown>>(cartKey, {});
  const result: Cart = {};
  for (const [id, qty] of Object.entries(raw)) {
    if (id.length <= 150 && typeof qty === "number" && Number.isInteger(qty) && qty > 0 && qty <= 99) result[id] = qty;
  }
  return result;
}

function normalized(value: string) {
  return value.toLocaleLowerCase("ar").normalize("NFKD").replace(/[\u064b-\u065f\u0670]/g, "")
    .replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").trim();
}

function imageUrl(product: Product) { return safeImage(product.image_url || ""); }

function ProductVisual({ product }: { product: Product }) {
  const url = imageUrl(product);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  const kind: Record<string, string> = { honey: "عسل", mixes: "خلطة", bee: "منتج نحل", sweets: "حلويات", more: "منتج طبيعي" };
  return url && !failed ? <img src={url} alt={product.name} loading="lazy" onError={() => setFailed(true)}/> : <div className="jar-art" aria-hidden="true"><div className="jar-lid"/><div className="jar-neck"/><div className="jar-glass"><div className="jar-shine"/><div className="jar-label"><span>{product.name}</span><small>{kind[product.category_id] || "منتج طبيعي"}</small></div></div><span className="jar-shadow"/></div>;
}

function CatalogPrice({ product, currency }: { product: Product; currency: string }) {
  return <span className="catalog-price"><strong>{product.price > 0 ? money(product.price, currency) : "اسأل عن السعر"}</strong>{Boolean(product.price > 0 && product.compare_at_price && product.compare_at_price > product.price) && <del>{money(product.compare_at_price!, currency)}</del>}</span>;
}

function Store() {
  const [catalog, setCatalog] = useState<Menu>(savedHoneyCatalog);
  const [source, setSource] = useState<"demo" | "saved" | "live">(honeySheetConfigured ? "saved" : "demo");
  const [error, setError] = useState("");
  const [cart, setCart] = useState<Cart>(readCart);
  const [favorites, setFavorites] = useState<string[]>(() => readStorage(favoritesKey, []));
  const [category, setCategory] = useState("all");
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [orderType, setOrderType] = useState<"delivery" | "pickup">("delivery");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  const [heroSlide, setHeroSlide] = useState(0);
  const [heroDirection, setHeroDirection] = useState<"next" | "previous">("next");
  const [heroPaused, setHeroPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);

  useEffect(() => { localStorage.setItem(cartKey, JSON.stringify(cart)); }, [cart]);
  useEffect(() => {
    const known = new Set(catalog.products.filter(item => item.available && item.price > 0).map(item => item.id));
    setCart(old => Object.fromEntries(Object.entries(old).filter(([id]) => known.has(id))));
  }, [catalog]);
  useEffect(() => { localStorage.setItem(favoritesKey, JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { document.title = `${catalog.settings.restaurant_name || "براند أبو البنات"} | عسل طبيعي`; }, [catalog]);
  useEffect(() => {
    let mounted = true;
    if (!honeySheetConfigured) return;
    loadHoneyCatalog().then(menu => {
      if (!mounted) return;
      setCatalog(menu); setSource("live"); setError("");
      if (!menu.settings.delivery_enabled && menu.settings.pickup_enabled) setOrderType("pickup");
    }).catch(() => { if (mounted) { setSource("saved"); setError("تعذر تحديث المنتجات الآن. المعروض نسخة محفوظة للمشاهدة فقط."); } });
    return () => { mounted = false; };
  }, []);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(""), 3300); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    preference.addEventListener?.("change", update);
    return () => preference.removeEventListener?.("change", update);
  }, []);
  useEffect(() => {
    if (heroPaused || reducedMotion) return;
    const timer = window.setInterval(() => { setHeroDirection("next"); setHeroSlide(index => (index + 1) % heroSlides.length); }, 6500);
    return () => window.clearInterval(timer);
  }, [heroPaused, reducedMotion]);
  useEffect(() => { document.body.style.overflow = cartOpen || selected || menuOpen ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [cartOpen, selected, menuOpen]);

  const availableProducts = catalog.products.filter(item => item.available && storefrontCategory(item));
  const categories = storefrontCategories;
  const result = useMemo(() => availableProducts.filter(item =>
    (category === "all" || category === "favorites" && favorites.includes(item.id) || category === "offers" && Boolean(item.price > 0 && item.compare_at_price && item.compare_at_price > item.price) || storefrontCategory(item) === category) &&
    normalized(`${item.name} ${item.description}`).includes(normalized(query))
  ).sort((a,b) => {
    if (category === "all" && !query.trim()) {
      const order: Record<string, number> = { honey: 0, mixes: 1, bee: 2, family: 3, thursday: 4 };
      const categoryDifference = (order[storefrontCategory(a) || ""] ?? 5) - (order[storefrontCategory(b) || ""] ?? 5);
      if (categoryDifference) return categoryDifference;
    }
    return a.sort_order - b.sort_order;
  }), [catalog, category, favorites, query]);
  const visibleResult = category === "all" && !query.trim() && !showAllProducts && result.length > 10 ? result.slice(0, 8) : result;
  const cartItems = Object.entries(cart).map(([id, quantity]) => ({ product: catalog.products.find(item => item.id === id), quantity }))
    .filter((line): line is { product: Product; quantity: number } => Boolean(line.product) && line.quantity > 0);
  const count = cartItems.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = cartItems.reduce((sum, line) => sum + line.quantity * line.product.price, 0);
  const total = subtotal;
  const brand = catalog.settings.restaurant_name || "براند أبو البنات";
  const tagline = catalog.settings.restaurant_tagline || "اسأل مجرّب ولا تنسى الطبيب";
  const logoUrl = safeImage(catalog.settings.logo_url || "");
  const coverUrl = safeImage(catalog.settings.cover_image_url || "");
  const currentHeroImage = heroSlide === 0 && coverUrl ? coverUrl : heroSlides[heroSlide].src;
  function setHero(index: number, direction: "next" | "previous") { setHeroDirection(direction); setHeroSlide((index + heroSlides.length) % heroSlides.length); }
  const brandLogo = logoUrl || brandLogoFallback;
  function handleBrandLogoError(event: React.SyntheticEvent<HTMLImageElement>) {
    const image = event.currentTarget;
    if (logoUrl && image.dataset.fallback !== "true") {
      image.dataset.fallback = "true";
      image.src = brandLogoFallback;
    } else image.style.display = "none";
  }
  const storePhone = catalog.settings.whatsapp_number;
  function inquiryLink(product: Product, message: string) {
    return storefrontCategory(product) === "thursday" ? managerLink(message) : buildWhatsAppUrl(storePhone, message);
  }

  function chooseCategory(id: string) {
    setCategory(id); setShowAllProducts(false); setMenuOpen(false);
    requestAnimationFrame(() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }));
  }
  function add(product: Product) {
    if (product.price <= 0) { setToast("هذا المنتج للاستفسار عن السعر، ولا يُضاف إلى السلة."); return; }
    setCart(old => ({ ...old, [product.id]: Math.min(99, (old[product.id] || 0) + 1) }));
    setToast(`تمت إضافة ${product.name} للسلة`);
  }
  function decrease(product: Product) {
    setCart(old => { const next = { ...old }; next[product.id] = (next[product.id] || 0) - 1; if (next[product.id] <= 0) delete next[product.id]; return next; });
  }
  function toggleFavorite(product: Product) {
    setFavorites(old => old.includes(product.id) ? old.filter(id => id !== product.id) : [...old, product.id]);
  }
  async function checkout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cartItems.length || submitting) return;
    // React releases currentTarget after the first await; capture the form values now.
    const fields = Object.fromEntries(new FormData(event.currentTarget).entries());
    setSubmitting(true);
    try {
      const fresh = honeySheetConfigured ? await loadHoneyCatalog() : honeyDemo;
      const phone = fresh.settings.whatsapp_number.replace(/\D/g, "");
      if (!/^[1-9][0-9]{7,14}$/.test(phone)) throw new Error("رقم واتساب المتجر غير مضبوط");
      const changes = cartItems.some(({ product, quantity }) => {
        const current = fresh.products.find(item => item.id === product.id);
        return !current?.available || current.price !== product.price || quantity > 99;
      });
      if (changes) { setCatalog(fresh); throw new Error("تغير سعر أو توافر منتج. راجع السلة ثم أعد المحاولة"); }
      if (subtotal < fresh.settings.minimum_order) throw new Error(`الحد الأدنى للطلب ${money(fresh.settings.minimum_order, fresh.settings.currency)}`);
      if (orderType === "delivery" && !fresh.settings.delivery_enabled || orderType === "pickup" && !fresh.settings.pickup_enabled) throw new Error("طريقة الاستلام المختارة غير متاحة الآن");
      const lines = cartItems.map(({ product, quantity }) => `• ${product.name} × ${quantity} — ${money(product.price * quantity, fresh.settings.currency)}`);
      const message = [
        `طلب جديد من ${fresh.settings.restaurant_name}`,
        "", ...lines, "", `المجموع: ${money(subtotal, fresh.settings.currency)}`,
        orderType === "delivery" ? "رسوم التوصيل: تُحدد عبر واتساب" : "استلام من المتجر",
        `${orderType === "delivery" ? "الإجمالي قبل التوصيل" : "الإجمالي"}: ${money(subtotal, fresh.settings.currency)}`,
        "", `الاسم: ${String(fields.name || "")}`, `الهاتف: ${String(fields.phone || "")}`,
        orderType === "delivery" ? `العنوان: ${String(fields.address || "")}` : "",
        fields.notes ? `ملاحظات: ${String(fields.notes)}` : "",
        !honeySheetConfigured ? "يرجى تأكيد السعر والتوافر ورسوم التوصيل قبل اعتماد الطلب." : "",
      ].filter(Boolean).join("\n");
      window.location.assign(buildWhatsAppUrl(phone, message));
    } catch (reason) { setToast(reason instanceof Error ? reason.message : "تعذر تجهيز الطلب الآن"); }
    finally { setSubmitting(false); }
  }

  return <>
    <div className="announcement" id="top"><span className="announcement-motto">اسأل مجرّب ولا تنسى الطبيب</span><span className="announcement-dot" aria-hidden="true">✦</span><span className="announcement-subtitle">عسل طبيعي بطعم أصيل</span></div>
    <header className="site-header">
      <div className="header-main wrap">
        <button className="icon-button mobile-only" type="button" aria-label="فتح القائمة" onClick={() => setMenuOpen(true)}><MenuIcon size={24}/></button>
        <a className="brand" href="#top" aria-label={`الرئيسية - ${brand}`}><img className="brand-logo" src={brandLogo} alt="شعار براند أبو البنات" onError={handleBrandLogoError}/><span><strong>{brand}</strong><small>عسل ومنتجات طبيعية صحية وتجميلية</small></span></a>
        <div className="header-search"><Search size={19}/><input type="search" placeholder="بتدور على إيه؟" value={query} onChange={event => setQuery(event.target.value)} aria-label="البحث عن منتج"/></div>
        <div className="header-actions"><button className="icon-button search-mobile" type="button" onClick={() => setSearchOpen(value => !value)} aria-label="بحث"><Search size={23}/></button><button className="icon-button" type="button" aria-label="المفضلة" onClick={() => chooseCategory("favorites")}><Heart size={23}/></button><button className="icon-button bag-button" type="button" aria-label={`السلة: ${count} منتجات`} onClick={() => setCartOpen(true)}><ShoppingBag size={23}/>{count > 0 && <b>{count}</b>}</button></div>
      </div>
      {searchOpen && <div className="mobile-search wrap"><Search size={18}/><input autoFocus type="search" placeholder="ابحث عن العسل والمنتجات" value={query} onChange={event => setQuery(event.target.value)}/></div>}
      <nav className="desktop-nav wrap" aria-label="أقسام المتجر"><button onClick={() => chooseCategory("all")}>الرئيسية</button>{categories.map(item => <button key={item.id} onClick={() => chooseCategory(item.id)}>{item.name}</button>)}<a href="#manager">أ/ سجود المعتصم</a></nav>
    </header>

    <main>
      <section className={`hero hero-carousel hero-theme-${heroSlide}`} aria-label="مقدمة المتجر" onFocusCapture={() => setHeroPaused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHeroPaused(false); }}>
        <div className="hero-inner wrap">
          <div className="hero-copy"><span className="hero-kicker">{heroSlides[heroSlide].kicker}</span><h1>{heroSlides[heroSlide].title}<br/><em>{heroSlides[heroSlide].accent}</em></h1><p>{heroSlides[heroSlide].description}</p>{heroSlide === 3 && <ul className="hero-feature-list"><li>مكونات من منتجات الخلية</li><li>تحضير بعناية</li><li>تفاصيل واضحة قبل الطلب</li><li>تواصل خاص للسيدات مع أ/ سجود</li></ul>}<button className="gold-button" type="button" onClick={() => heroSlides[heroSlide].category === "about" ? document.getElementById("about")?.scrollIntoView({ behavior: "smooth" }) : chooseCategory(heroSlides[heroSlide].category)}>{heroSlides[heroSlide].action} <ArrowLeft size={19}/></button>{heroSlide !== 3 && <div className="hero-qualities"><span><BadgeCheck size={18}/>جودة مختارة</span><span><Leaf size={18}/>مكونات طبيعية</span></div>}</div>
          <div className="hero-carousel-visual">
            <div className="hero-slide-frame"><div className="hero-photo-canvas"><img key={heroSlide} className={`hero-slide-image hero-enter-${heroDirection}`} src={currentHeroImage} alt={heroSlides[heroSlide].alt} onError={event => { event.currentTarget.src = heroHoneyDefault; }}/>{heroSlide === 3 && <div className="hero-jar-brand" aria-hidden="true"><span>براند أبو البنات</span><strong>خلطة المتزوجين</strong></div>}</div></div><img className="hero-brand-watermark" src={bannerBrandLogo} alt="" aria-hidden="true"/>
            <div className="hero-side-controls" aria-label="التنقل بين صور المقدمة"><button type="button" aria-label="الصورة السابقة" onClick={() => setHero(heroSlide - 1, "previous")}><ChevronRight size={22}/></button><button type="button" aria-label="الصورة التالية" onClick={() => setHero(heroSlide + 1, "next")}><ChevronLeft size={22}/></button><span className="sr-only" aria-live="polite">الصورة {heroSlide + 1} من {heroSlides.length}</span></div>
          </div>
        </div>
      </section>

      <section className="section wrap category-section"><div className="section-heading"><div><span className="eyebrow">اكتشف مجموعتنا</span><h2>تسوق حسب القسم</h2></div></div><div className="category-grid">{categories.map((item, index) => <button className={`category-tile tile-${index % 5}`} key={item.id} type="button" onClick={() => chooseCategory(item.id)}><span className="category-symbol">{item.symbol}</span><strong>{item.name}</strong><small>{item.description}</small><ChevronLeft size={19}/></button>)}</div></section>
      <section className="specialty wrap" aria-label="التواصل مع مديرة التسويق">
        <div className="manager-card" id="manager"><img src={managerPhoto} alt="مديرة التسويق أ/ سجود المعتصم"/><div className="manager-card-copy"><span className="eyebrow">تواصل مباشر للسيدات</span><h2>أ/ سجود المعتصم</h2><strong className="manager-role">مديرة التسويق</strong><p>للسيدات الراغبات في الاستفسار عن خلطات العلاقة الزوجية والإنجاب والأنوثة، أ/ سجود متاحة للحديث بخصوصية وراحة ودون حرج. وللطلبات العامة يمكنك التواصل مع أ/ وائل سليم.</p><div className="manager-contact-links"><a className="manager-contact manager-contact-primary" href={managerLink("مرحبًا أ/ سجود، أود الاستفسار بسرية عن منتجات براند أبو البنات.")} target="_blank" rel="noopener noreferrer" aria-label={`تواصل مع أ/ سجود المعتصم عبر واتساب على ${phoneText(managerWhatsApp)}`}><span className="manager-contact-icon"><MessageCircle size={21}/></span><span className="manager-contact-copy"><span>واتساب أ/ سجود</span><bdi dir="ltr">{phoneText(managerWhatsApp)}</bdi></span><ArrowLeft size={18}/></a><a className="manager-contact manager-contact-secondary" href={buildWhatsAppUrl(storePhone, "مرحبًا أ/ وائل سليم، أود التواصل بخصوص براند أبو البنات.")} target="_blank" rel="noopener noreferrer" aria-label={`تواصل مع أ/ وائل سليم عبر واتساب على ${phoneText(storePhone)}`}><span className="manager-contact-icon"><MessageCircle size={21}/></span><span className="manager-contact-copy"><span>واتساب أ/ وائل سليم</span><bdi dir="ltr">{phoneText(storePhone)}</bdi></span><ArrowLeft size={18}/></a></div></div></div>
      </section>

      <div className="benefits wrap"><div><Truck size={24}/><span><strong>توصيل مريح</strong><small>يصلك الطلب لباب البيت</small></span></div><div><ShieldCheck size={24}/><span><strong>جودة نثق بها</strong><small>اختيارات بعناية</small></span></div><div><Leaf size={24}/><span><strong>من خير الطبيعة</strong><small>عسل ومنتجات النحل</small></span></div></div>

      <section className="section wrap products-section" id="products">
        <div className="section-heading"><div><span className="eyebrow">تشكيلة مختارة</span><h2>{category === "all" ? "منتجاتنا" : category === "favorites" ? "مفضلتك" : categories.find(item => item.id === category)?.name || "منتجاتنا"}</h2></div><p>{category === "all" ? "تصفح العسل والخلطات ومنتجات النحل" : `${result.length} منتج`}</p></div>
        <div className="filter-row"><button className={category === "all" ? "active" : ""} onClick={() => setCategory("all")}>الكل</button>{categories.map(item => <button className={category === item.id ? "active" : ""} key={item.id} onClick={() => setCategory(item.id)}>{item.name}</button>)}</div>
        {error && <div className="store-alert" role="status">{error}</div>}{!honeySheetConfigured && <div className="demo-alert" role="status">الأسعار والتوافر النهائي يُؤكدان مع فريق البراند قبل اعتماد الطلب.</div>}
        <div className="product-grid">{visibleResult.map(product => <article className="product-card" key={product.id}>
          <div className={`product-image tone-${product.category_id}`}><button className="image-open" type="button" onClick={() => setSelected(product)} aria-label={`تفاصيل ${product.name}`}><ProductVisual product={product}/></button><button className={`favorite ${favorites.includes(product.id) ? "selected" : ""}`} type="button" onClick={() => toggleFavorite(product)} aria-label={`إضافة ${product.name} للمفضلة`}><Heart size={19} fill={favorites.includes(product.id) ? "currentColor" : "none"}/></button>{Boolean(product.price > 0 && product.compare_at_price && product.compare_at_price > product.price) && <span className="card-badge">سعر خاص</span>}</div>
          <div className="product-info"><small>{categories.find(item => item.id === storefrontCategory(product))?.name}</small><button type="button" className="product-name" onClick={() => setSelected(product)}>{product.name}</button>{product.description&&<p>{product.description}</p>}<div className="product-buy"><CatalogPrice product={product} currency={catalog.settings.currency}/>{product.price > 0 ? <button type="button" onClick={() => add(product)} aria-label={`إضافة ${product.name} للسلة`}><Plus size={21}/></button> : <a className="inquiry-button" href={inquiryLink(product, `مرحبًا، أود الاستفسار عن ${product.name} والسعر والتوافر.`)} target="_blank" rel="noopener noreferrer" aria-label={`الاستفسار عن ${product.name} عبر واتساب`}><MessageCircle size={18}/></a>}</div></div>
        </article>)}</div>{result.length === 0 && <div className="empty-results">{!query.trim() && (category === "family" || category === "thursday" || category === "mixes") ? <>اسأل عن الاختيارات المتاحة ومكوناتها قبل الطلب. <a href={buildWhatsAppUrl(storePhone, `مرحبًا، أود الاستفسار عن ${categories.find(item => item.id === category)?.name} المتاحة.`)} target="_blank" rel="noopener noreferrer">تواصل مع البراند عبر واتساب</a></> : "لا توجد منتجات مطابقة لبحثك."}</div>}{category === "all" && !query.trim() && result.length > visibleResult.length && <button className="show-all-products" type="button" onClick={() => setShowAllProducts(true)}>عرض باقي المنتجات ({result.length - visibleResult.length}) <ArrowLeft size={18}/></button>}
      </section>

      <section className="story" id="about"><div className="wrap story-inner"><div className="story-art"><div className="owner-profile"><div className="owner-portrait-card"><img src={ownerPortrait} alt="وائل سليم جالس في مكتبه ويحمل ملعقة عسل"/><span className="owner-experience"><strong>١٣</strong><small>سنة خبرة</small></span></div><div className="owner-portrait-caption"><strong>وائل سليم</strong><span>نحّال وتاجر</span></div><p className="owner-qualification">دارس دبلومة مصل النحل والتغذية العلاجية في الطب الصيني والشمولي</p></div></div><div className="story-copy"><span className="eyebrow">حكايتنا مع العسل</span><h2>براند أبو البنات</h2><p>وائل سليم، خبير خلطات العسل ومنتجات الخلية، نحّال وتاجر بخبرة ١٣ عامًا في إعداد تركيبات العسل الطبيعية، ودارس ومتخصص في الطب الشمولي والصيني.</p><p>درس دبلومة مصل النحل في الطب الصيني والشمولي، ويشارك خبرته في مكونات الخلية وطريقة تحضير خلطاته، مع تفاصيل واضحة تساعد العملاء على الاختيار.</p><p className="brand-motto">«اسأل مجرّب ولا تنسى الطبيب»</p><button type="button" onClick={() => chooseCategory("honey")}>اكتشف أنواع العسل <ArrowLeft size={19}/></button></div></div></section>
      <section className="section wrap info-section" id="questions"><div className="section-heading"><div><span className="eyebrow">قبل ما تطلب</span><h2>أسئلة شائعة</h2></div></div><div className="faq-grid"><details><summary>إزاي أطلب؟</summary><p>اختار المنتجات المسعّرة وأضفها للسلة، ثم املأ بياناتك واضغط «إرسال الطلب عبر واتساب». المنتجات بدون سعر متاح لها استفسار مباشر.</p></details><details><summary>هل الأسعار والتوافر نهائيين؟</summary><p>يتم تأكيد السعر والتوافر ورسوم التوصيل مع المتجر على واتساب قبل اعتماد الطلب.</p></details><details><summary>أستفسر عن خلطات المتزوجين إزاي؟</summary><p>تواصل مباشرة مع أ/ سجود المعتصم عبر الزر الموجود في قسمها لمعرفة المكونات والسعر والتفاصيل.</p></details><details><summary>هل المنتجات بديل عن استشارة طبية؟</summary><p>لا. المنتجات الغذائية لا تُعد تشخيصًا أو علاجًا. اسأل مختصًا صحيًا عند وجود حالة صحية أو حساسية أو حمل.</p></details></div></section>
      <section className="contact-section" id="contact"><div className="wrap contact-inner"><div><span className="eyebrow">نحن هنا لمساعدتك</span><h2>تواصل معنا</h2><p>للطلبات العامة راسل المتجر، وللاستفسار عن خلطات المتزوجين تواصل مباشرة مع مديرة التسويق أ/ سجود المعتصم.</p></div><div className="contact-actions"><a href={buildWhatsAppUrl(storePhone, "مرحبًا، أود الاستفسار عن منتجات براند أبو البنات.")} target="_blank" rel="noopener noreferrer"><MessageCircle size={18}/> واتساب الطلبات: <bdi dir="ltr">{phoneText(storePhone)}</bdi></a><a href={managerLink("مرحبًا أ/ سجود، أود الاستفسار عن خلطات المتزوجين.")} target="_blank" rel="noopener noreferrer"><MessageCircle size={18}/> واتساب أ/ سجود: <bdi dir="ltr">{phoneText(managerWhatsApp)}</bdi></a></div></div></section>
    </main>
    <footer className="footer"><div className="wrap footer-grid"><div><a className="brand brand-light" href="#top"><img className="brand-logo" src={brandLogo} alt="شعار براند أبو البنات" onError={handleBrandLogoError}/><span><strong>{brand}</strong><small>{tagline}</small></span></a><p>براند أبو البنات بإدارة وائل سليم. عسل ومنتجات نحل وخلطات طبيعية.</p></div><div><h3>تصفح المتجر</h3>{categories.map(item => <button key={item.id} onClick={() => chooseCategory(item.id)}>{item.name}</button>)}</div><div><h3>معلومات وتواصل</h3><a href="#manager">مديرة التسويق</a><a href="#questions">أسئلة شائعة</a><a href="#contact">تواصل معنا</a><p>الدفع والتوصيل يتم تأكيدهما عند التواصل.</p></div><div><h3>تابع البراند</h3><a href="https://www.facebook.com/aboelbnaat2" target="_blank" rel="noopener noreferrer">فيسبوك</a><a href="https://www.tiktok.com/@waelsilem1" target="_blank" rel="noopener noreferrer">تيك توك</a><a href="https://t.me/+s7Yab9hPtRdlNTNk" target="_blank" rel="noopener noreferrer">تليجرام</a><a href="https://chat.whatsapp.com/CwmSWLzcDi3DttqziXP2h8?mode=gi_t" target="_blank" rel="noopener noreferrer">جروب واتساب</a></div></div><div className="wrap footer-bottom">© {new Date().getFullYear()} {brand}. جميع الحقوق محفوظة.</div></footer>

    {menuOpen && <div className="overlay" onMouseDown={() => setMenuOpen(false)}><aside className="side-panel mobile-menu" onMouseDown={event => event.stopPropagation()}><div className="panel-head"><strong>القائمة</strong><button onClick={() => setMenuOpen(false)} aria-label="إغلاق"><X/></button></div><button onClick={() => chooseCategory("all")}>الرئيسية</button>{categories.map(item => <button key={item.id} onClick={() => chooseCategory(item.id)}>{item.name}</button>)}<a href="#manager" onClick={() => setMenuOpen(false)}>أ/ سجود المعتصم</a><a href="#contact" onClick={() => setMenuOpen(false)}>تواصل معنا</a></aside></div>}
    {selected && <div className="overlay modal-overlay" onMouseDown={() => setSelected(null)}><section className="product-modal" role="dialog" aria-modal="true" aria-label={`تفاصيل ${selected.name}`} onMouseDown={event => event.stopPropagation()}><button className="modal-close" type="button" onClick={() => setSelected(null)} aria-label="إغلاق"><X/></button><div className={`modal-image tone-${selected.category_id}`}><ProductVisual product={selected}/></div><div className="modal-copy"><span className="eyebrow">{categories.find(item => item.id === storefrontCategory(selected))?.name}</span><h2>{selected.name}</h2><p>{selected.description}</p><strong className="modal-price">{selected.price > 0 ? money(selected.price, catalog.settings.currency) : "اسأل عن السعر"}</strong>{selected.price > 0 ? <button className="gold-button" type="button" onClick={() => { add(selected); setSelected(null); }}>أضف للسلة <ShoppingBag size={19}/></button> : <a className="gold-button" href={inquiryLink(selected, `مرحبًا، أود الاستفسار عن ${selected.name} والسعر والتوافر.`)} target="_blank" rel="noopener noreferrer">استفسر عبر واتساب <MessageCircle size={19}/></a>}</div></section></div>}
    {cartOpen && <div className="overlay" onMouseDown={() => setCartOpen(false)}><aside className="side-panel cart-panel" onMouseDown={event => event.stopPropagation()}><div className="panel-head"><div><small>سلة التسوق</small><strong>طلبك <span>({count})</span></strong></div><button type="button" onClick={() => setCartOpen(false)} aria-label="إغلاق السلة"><X/></button></div>{cartItems.length ? <><div className="cart-list">{cartItems.map(({ product, quantity }) => <div className="cart-line" key={product.id}><div className={`cart-thumb tone-${product.category_id}`}><ProductVisual product={product}/></div><div className="cart-line-copy"><strong>{product.name}</strong><small>{money(product.price, catalog.settings.currency)}</small><div className="quantity"><button type="button" onClick={() => decrease(product)} aria-label={`تقليل ${product.name}`}><Minus size={15}/></button><span>{quantity}</span><button type="button" onClick={() => add(product)} aria-label={`زيادة ${product.name}`}><Plus size={15}/></button></div></div><strong>{money(product.price * quantity, catalog.settings.currency)}</strong></div>)}</div><form className="cart-checkout" onSubmit={checkout}><div className="order-type">{catalog.settings.delivery_enabled && <label><input type="radio" name="orderType" checked={orderType === "delivery"} onChange={() => setOrderType("delivery")}/> توصيل</label>}{catalog.settings.pickup_enabled && <label><input type="radio" name="orderType" checked={orderType === "pickup"} onChange={() => setOrderType("pickup")}/> استلام</label>}</div><div className="totals-line"><span>المجموع</span><strong>{money(subtotal, catalog.settings.currency)}</strong></div>{orderType === "delivery" && <div className="totals-line"><span>التوصيل</span><strong>يُحدد عبر واتساب</strong></div>}<div className="totals-line total"><span>{orderType === "delivery" ? "الإجمالي قبل التوصيل" : "الإجمالي"}</span><strong>{money(total, catalog.settings.currency)}</strong></div><label>الاسم<input name="name" required maxLength={80} placeholder="اسمك"/></label><label>رقم الهاتف<input name="phone" type="tel" required inputMode="tel" pattern="[+0-9 ]{7,20}" placeholder="رقم للتواصل"/></label>{orderType === "delivery" && <label>العنوان<input name="address" required maxLength={200} placeholder="المحافظة، المدينة، الشارع"/></label>}<label>ملاحظات الطلب<textarea name="notes" maxLength={300} placeholder="اختياري"/></label><button className="gold-button checkout-button" type="submit" disabled={submitting || (honeySheetConfigured && source !== "live")}>{submitting ? "جارٍ تأكيد الأسعار..." : "إرسال الطلب عبر واتساب"} <ArrowLeft size={19}/></button>{honeySheetConfigured && source !== "live" && <p className="checkout-note">تعذر تحديث الشيت؛ الطلبات متوقفة حتى عودة الاتصال.</p>}{!honeySheetConfigured && <p className="checkout-note">السعر والتوافر ورسوم التوصيل تُؤكد مع المتجر في واتساب قبل اعتماد الطلب.</p>}</form></> : <div className="empty-cart"><ShoppingBag size={60}/><h3>سلتك فارغة</h3><p>أضف ما يعجبك من منتجاتنا</p><button className="gold-button" onClick={() => setCartOpen(false)}>تصفح المنتجات</button></div>}</aside></div>}
    {count > 0 && !cartOpen && <button className="floating-cart" type="button" onClick={() => setCartOpen(true)}><ShoppingBag size={21}/><span>السلة ({count})</span><strong>{money(total, catalog.settings.currency)}</strong></button>}
    {toast && <div className="toast" role="status">{toast}</div>}
  </>;
}

createRoot(document.getElementById("app")!).render(<Store/>);






