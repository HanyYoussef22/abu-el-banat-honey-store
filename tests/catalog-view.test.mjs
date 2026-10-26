import test from "node:test";
import assert from "node:assert/strict";
import { displayCategories, productMatchesCategory, storefrontCategory } from "../src/catalog-view.ts";

test("dashboard categories drive storefront navigation, including new sections", () => {
  const categories = displayCategories([
    { id: "new-section", name: "قسم جديد", description: "", visible: true, sort_order: 3 },
    { id: "hidden", name: "مخفي", description: "", visible: false, sort_order: 1 },
    { id: "offers", name: "العروض", description: "تخفيضات", visible: true, sort_order: 2 },
  ]);
  assert.deepEqual(categories.map(category => category.id), ["offers", "new-section"]);
  assert.equal(categories[1].name, "قسم جديد");
  assert.equal(categories[1].description, "اكتشف المنتجات");
  const product = { category_id: "new-section", price: 100, name: "منتج جديد" };
  assert.equal(storefrontCategory(product), "new-section");
  assert.equal(productMatchesCategory(product, "new-section"), true);
});

test("products placed directly in offers and discounted products both appear in offers", () => {
  const direct = { category_id: "offers", name: "اختبر ٢", price: 20, compare_at_price: 30 };
  const discounted = { category_id: "honey", name: "عسل", price: 250, compare_at_price: 300 };
  assert.equal(productMatchesCategory(direct, "offers"), true);
  assert.equal(productMatchesCategory(discounted, "offers"), true);
  assert.equal(productMatchesCategory(direct, "honey"), false);
  assert.equal(storefrontCategory({ category_id: "mixes", name: "خلطة المتزوجين" }), "thursday");
});
