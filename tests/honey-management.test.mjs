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
  assert.match(ui, /استفسارات الخاصة بالإنجاب والعلاقة الزوجية والأنوثة، بسرية وراحة ودون حرج/);
  assert.match(ui, /واتساب أ\/ سجود/);
  assert.match(ui, /واتساب أ\/ وائل سليم/);
  assert.match(admin, /مثال: براند أبو البنات/);
  assert.match(setup, /كتالوج براند أبو البنات/);
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

