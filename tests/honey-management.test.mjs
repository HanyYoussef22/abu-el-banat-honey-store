import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("honey starter catalog keeps known prices and inquiry-only rows distinct", async () => {
  const demo = await read("src/honey-demo.ts");
  assert.match(demo, /restaurant_name:\s*"براند أبو البنات"/);
  const rows = [...demo.matchAll(/^\s*\["([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*(\d+),\s*(\d+),/gm)];
  assert.equal(rows.length, 18);
  assert.equal(new Set(rows.map(row => row[1])).size, 18);
  assert.equal(rows.filter(row => Number(row[4]) > 0).length, 10);
  assert.equal(rows.filter(row => Number(row[4]) === 0).length, 8);
  assert.ok(rows.filter(row => Number(row[4]) > 0).every(row => Number(row[5]) >= 0));
});

test("honey storefront uses the brand logo fallback and offers both manager contacts", async () => {
  const [ui, admin, setup] = await Promise.all([
    read("src/honey.tsx"), read("google-apps-script/HoneyManager.html"), read("HONEY_STORE_SETUP_AR.md"),
  ]);
  assert.match(ui, /brandLogo = logoUrl \|\| brandLogoFallback/);
  assert.match(ui, /خلطات العلاقة الزوجية والإنجاب والأنوثة، أ\/ سجود متاحة للحديث بخصوصية وراحة ودون حرج/);
  assert.match(ui, /<bdi dir="ltr">\{phoneText\(managerWhatsApp\)\}<\/bdi>/);
  assert.match(ui, /واتساب أ\/ سجود/);
  assert.match(ui, /واتساب أ\/ وائل سليم/);
  assert.match(admin, /مثال: براند أبو البنات/);
  assert.match(setup, /كتالوج براند أبو البنات/);
});

test("honey hero carousel uses wide assets accessibly and keeps sheet cover override", async () => {
  const [ui, css] = await Promise.all([read("src/honey.tsx"), read("src/honey.css")]);
  assert.match(ui, /honey-hero-wide\.png/);
  assert.match(ui, /owner-hero-wide\.png/);
  assert.match(ui, /couples-hero-wide\.png/);
  assert.match(ui, /couples-details-wide\.png/);
  assert.match(ui, /family-honey-hero\.png/);
  assert.match(ui, /const currentHeroImage = heroSlide === 0 && coverUrl \? coverUrl/);
  assert.match(ui, /setInterval\(\(\) => \{ setHeroDirection\("next"\); setHeroSlide/);
  assert.doesNotMatch(ui, /onMouseEnter=\{\(\) => setHeroPaused\(true\)\}/);
  assert.match(ui, /onFocusCapture=\{\(\) => setHeroPaused\(true\)\}/);
  assert.match(ui, /prefers-reduced-motion: reduce/);
  assert.match(ui, /className="hero-side-controls"/);
  assert.match(ui, /aria-label="الصورة التالية"/);
  assert.match(ui, /banner-brand-logo\.png/);
  assert.match(ui, /className="hero-brand-watermark"/);
  assert.match(ui, /wael-selim-owner\.webp/);
  assert.match(ui, /className="owner-portrait-card"/);
  assert.match(ui, /className="owner-qualification"/);
  assert.match(css, /object-fit:cover/);
  assert.match(css, /\.hero-carousel \.hero-inner:before/);
  assert.match(ui, /اسأل مجرّب ولا تنسى الطبيب/);
  assert.match(css, /\.announcement-motto/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});

test("prominent Arabic brand copy uses the approved motto and factual owner profile", async () => {
  const [ui, demo, sheet] = await Promise.all([read("src/honey.tsx"), read("src/honey-demo.ts"), read("src/public-sheet.ts")]);
  assert.doesNotMatch(ui, /٢٠٠ منتج/);
  assert.match(ui, /حلاوة الطبيعة/);
  assert.match(ui, /اسأل مجرّب ولا تنسى الطبيب/);
  assert.match(ui, /خبير خلطات العسل ومنتجات الخلية/);
  assert.match(ui, /دارس ومتخصص في الطب الشمولي والصيني/);
  assert.match(demo, /restaurant_tagline: "اسأل مجرّب ولا تنسى الطبيب"/);
  assert.match(sheet, /restaurant_tagline: str\(settings\.restaurant_tagline\) \|\| "اسأل مجرّب ولا تنسى الطبيب"/);
  assert.doesNotMatch(ui, /اسأل مجرب ولا تنسى الطبيب/);
});

test("six storefront sections match the sheet and mobile uses horizontal scrolling", async () => {
  const [ui, demo, css, admin] = await Promise.all([read("src/honey.tsx"), read("src/honey-demo.ts"), read("src/honey.css"), read("google-apps-script/HoneyManager.gs")]);
  for (const label of ["العروض", "أنواع العسل", "خلطات علاجية", "منتجات النحل", "الأسرة والأطفال", "ليلة الخميس"]) {
    assert.ok(demo.includes(label));
    assert.ok(admin.includes(label));
  }
  assert.match(ui, /displayCategories\(catalog\.categories\)/);
  assert.match(ui, /storefrontCategory\(product\)/);
  assert.match(css, /\.category-grid\{display:flex;gap:14px;overflow-x:auto/);
  assert.doesNotMatch(ui, /<strong>ليلة الخميس<\/strong>/);
});

test("public catalog validates saved data and retries transient sheet failures once", async () => {
  const reader = await read("src/honey-sheet.ts");
  assert.match(reader, /return validateMenu\(saved\.menu\)/);
  assert.match(reader, /age >= 0 && age < 24 \* 60 \* 60 \* 1000/);
  assert.match(reader, /async function requestSheetWithRetry/);
  assert.match(reader, /await new Promise\(resolve => window\.setTimeout\(resolve, 600\)\)/);
  assert.match(reader, /requestSheetWithRetry\("Products"\)/);
});

test("public sheet reader and honey admin share compare and zero-price semantics", async () => {
  const [reader, admin, ui, setup] = await Promise.all([
    read("src/public-sheet.ts"), read("google-apps-script/HoneyManager.gs"),
    read("src/honey.tsx"), read("HONEY_STORE_SETUP_AR.md"),
  ]);
  assert.match(reader, /compare_at_price:\s*num\((?:r|row)\.compare_at_price\)/);
  assert.match(admin, /compare_at_price:\s*Number\(value\('compare_at_price'\)\s*\|\|\s*0\)/);
  assert.match(admin, /price === 0 \|\| comparePrice <= price/);
  assert.match(admin, /HONEY_SPREADSHEET_ID/);
  assert.match(admin, /HONEY_BOUND_SPREADSHEET_ID/);
  assert.match(admin, /boundId && id !== boundId/);
  assert.match(admin, /معرف الشيت لا يطابق الملف المرتبط/);
  assert.doesNotMatch(admin + ui, /مطعم|منيو الزبائن|أطباق سورية/);
  assert.doesNotMatch(admin, /1QyDeb_SS5cHEKKSKAiFX3X33j-9W4-1eynRvM1hw-ds/);
  assert.match(ui, /item\.available && item\.price > 0/);
  assert.match(ui, /if \(product\.price <= 0\)/);
  assert.match(setup, /price = 0` كعلامة استفسار/);
  assert.match(setup, /لا تعاملها كمنتجات مجانية/);
});

