import { menuFromRows, requestSheet } from "./public-sheet";
import { honeyDemo } from "./honey-demo";
import { validateMenu, type Menu } from "./domain";

const sheetId = import.meta.env.VITE_HONEY_SHEET_ID?.trim() || "";
const cacheKey = `honey-catalog-v1:${sheetId}`;

export const honeySheetConfigured = Boolean(sheetId);

export function savedHoneyCatalog(): Menu {
  if (!sheetId) return honeyDemo;
  try {
    const saved = JSON.parse(localStorage.getItem(cacheKey) || "null") as { menu: Menu; at: number } | null;
    const age = saved ? Date.now() - saved.at : Infinity;
    if (saved && Number.isFinite(saved.at) && age >= 0 && age < 24 * 60 * 60 * 1000)
      return validateMenu(saved.menu);
  } catch { /* Storage may be disabled. */ }
  return honeyDemo;
}

async function requestSheetWithRetry(sheet: string): Promise<Awaited<ReturnType<typeof requestSheet>>> {
  try { return await requestSheet(sheetId, sheet); }
  catch (error) {
    if (!(error instanceof Error) || !/مهلة|تعذر الوصول إلى Google Sheets/.test(error.message)) throw error;
    await new Promise(resolve => window.setTimeout(resolve, 600));
    return requestSheet(sheetId, sheet);
  }
}

export async function loadHoneyCatalog(): Promise<Menu> {
  if (!sheetId) return honeyDemo;
  const [Products, Categories, Settings, ThemeSettings, ProductOptions, Offers] = await Promise.all([
    requestSheetWithRetry("Products"), requestSheetWithRetry("Categories"),
    requestSheetWithRetry("Settings"), requestSheetWithRetry("ThemeSettings"),
    requestSheetWithRetry("ProductOptions"), requestSheetWithRetry("Offers"),
  ]);
  const menu = menuFromRows({ Products, Categories, Settings, ThemeSettings, ProductOptions, Offers });
  try { localStorage.setItem(cacheKey, JSON.stringify({ menu, at: Date.now() })); } catch { /* Storage may be disabled. */ }
  return menu;
}
