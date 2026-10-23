import { menuFromRows, requestSheet } from "./public-sheet";
import { honeyDemo } from "./honey-demo";
import type { Menu } from "./domain";

const sheetId = import.meta.env.VITE_HONEY_SHEET_ID?.trim() || "";
const cacheKey = `honey-catalog-v1:${sheetId}`;

export const honeySheetConfigured = Boolean(sheetId);

export function savedHoneyCatalog(): Menu {
  if (!sheetId) return honeyDemo;
  try {
    const saved = JSON.parse(localStorage.getItem(cacheKey) || "null") as { menu: Menu; at: number } | null;
    if (saved && Date.now() - saved.at < 24 * 60 * 60 * 1000) return saved.menu;
  } catch { /* Storage may be disabled. */ }
  return honeyDemo;
}

export async function loadHoneyCatalog(): Promise<Menu> {
  if (!sheetId) return honeyDemo;
  const [Products, Categories, Settings, ThemeSettings, ProductOptions, Offers] = await Promise.all([
    requestSheet(sheetId, "Products"), requestSheet(sheetId, "Categories"),
    requestSheet(sheetId, "Settings"), requestSheet(sheetId, "ThemeSettings"),
    requestSheet(sheetId, "ProductOptions"), requestSheet(sheetId, "Offers"),
  ]);
  const menu = menuFromRows({ Products, Categories, Settings, ThemeSettings, ProductOptions, Offers });
  try { localStorage.setItem(cacheKey, JSON.stringify({ menu, at: Date.now() })); } catch { /* Storage may be disabled. */ }
  return menu;
}
