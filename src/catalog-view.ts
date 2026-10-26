import type { Category, Product } from "./domain";

const symbols: Record<string, string> = {
  offers: "✦", honey: "⬡", mixes: "◈", bee: "❀", family: "♡", thursday: "✧",
};

export function storefrontCategory(product: Product): string {
  if (product.category_id === "sweets" ||
      product.category_id === "mixes" && /المتزوجين|ليلة الخميس/.test(product.name)) return "thursday";
  return product.category_id;
}

export function displayCategories(categories: Category[]) {
  return categories.filter(category => category.visible)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(category => ({
      id: category.id,
      name: category.name,
      description: category.description || "اكتشف المنتجات",
      symbol: symbols[category.id] || "✦",
    }));
}

export function productMatchesCategory(product: Product, category: string): boolean {
  const id = storefrontCategory(product);
  if (category === "offers")
    return id === "offers" || product.price > 0 && Boolean(product.compare_at_price && product.compare_at_price > product.price);
  return id === category;
}
