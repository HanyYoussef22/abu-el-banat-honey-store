import { validateMenu, type Menu, type Product, type Category, type Settings, type ProductOption, type Offer } from "./domain";

type Cell = { v?: string | number | boolean | null; f?: string };
type QueryResponse = { status?: string; table?: { cols?: { label?: string; id?: string }[]; rows?: { c?: (Cell | null)[] }[] }; errors?: { message?: string }[] };
type Row = Record<string, string | number | boolean>;

function requestCell(sheetId: string, sheet: string, column: string, row: number, timeoutMs: number): Promise<string | number | boolean> {
  const callback = "__honeyCell_" + crypto.randomUUID().replaceAll("-", "");
  const url = new URL(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq`);
  url.searchParams.set("sheet", sheet); url.searchParams.set("range", `${column}${row}:${column}${row}`);
  url.searchParams.set("headers", "0"); url.searchParams.set("tqx", `out:json;responseHandler:${callback}`);
  url.searchParams.set("_", Date.now().toString());
  return new Promise((resolve, reject) => {
    const script = document.createElement("script"); let done = false;
    const finish = (value?: string | number | boolean, error?: Error) => {
      if (done) return; done = true; clearTimeout(timer); script.remove();
      delete (window as unknown as Record<string, unknown>)[callback];
      if (error) reject(error); else resolve(value ?? "");
    };
    const timer = window.setTimeout(() => finish(undefined, new Error("انتهت مهلة قراءة الخلية")), timeoutMs);
    (window as unknown as Record<string, unknown>)[callback] = (response: QueryResponse) => {
      if (response.status !== "ok") return finish(undefined, new Error("تعذر قراءة الخلية"));
      finish(response.table?.rows?.[0]?.c?.[0]?.v ?? "");
    };
    script.onerror = () => finish(undefined, new Error("تعذر الوصول إلى Google Sheets"));
    script.src = url.href; script.async = true; document.head.append(script);
  });
}
export function tableRows(response: QueryResponse): Row[] {
  if (response.status !== "ok" || !response.table?.cols || !response.table.rows)
    throw new Error(response.errors?.[0]?.message || "تعذر قراءة الجدول المنشور");
  const keys = response.table.cols.map(column => String(column.label || column.id || "").trim());
  if (keys.some(key => !key)) throw new Error("أسماء أعمدة الشيت غير مكتملة");
  return response.table.rows.map(row => Object.fromEntries(keys.map((key, index) => [key, row.c?.[index]?.v ?? row.c?.[index]?.f ?? ""])) as Row)
    .filter(row => Object.values(row).some(value => String(value).trim() !== ""));
}
export function requestSheet(sheetId: string, sheet: string, timeoutMs = 20000): Promise<Row[]> {
  if (!/^[a-zA-Z0-9_-]{20,150}$/.test(sheetId)) return Promise.reject(new Error("معرف Google Sheets غير صالح"));
  if (!/^[A-Za-z][A-Za-z0-9_]{0,40}$/.test(sheet)) return Promise.reject(new Error("اسم صفحة الشيت غير صالح"));
  const callback = "__honeySheet_" + crypto.randomUUID().replaceAll("-", "");
  const url = new URL(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq`);
  url.searchParams.set("sheet", sheet); url.searchParams.set("headers", "1");
  url.searchParams.set("tqx", `out:json;responseHandler:${callback}`); url.searchParams.set("_", Date.now().toString());
  return new Promise((resolve, reject) => {
    const script = document.createElement("script"); let done = false;
    const finish = (error?: Error, rows?: Row[]) => {
      if (done) return; done = true; clearTimeout(timer); script.remove();
      delete (window as unknown as Record<string, unknown>)[callback];
      if (error) reject(error); else resolve(rows || []);
    };
    const timer = window.setTimeout(() => finish(new Error("انتهت مهلة قراءة Google Sheets")), timeoutMs);
    (window as unknown as Record<string, unknown>)[callback] = async (response: QueryResponse) => {
      try {
        clearTimeout(timer); const rows = tableRows(response);
        const key = sheet === "Products" ? "available" : sheet === "Categories" ? "visible" : "";
        const column = sheet === "Products" ? "G" : "E";
        if (key) {
          const index = response.table?.cols?.findIndex(value => (value.label || value.id) === key) ?? -1;
          const byId = new Map(rows.map(row => [String(row.id), row]));
          await Promise.all((response.table?.rows || []).map(async (row, rowIndex) => {
            const id = String(row.c?.[0]?.v ?? ""); if (index < 0 || !id || row.c?.[index]?.v != null) return;
            const target = byId.get(id);
            if (target) { try { target[key] = await requestCell(sheetId, sheet, column, rowIndex + 2, timeoutMs); } catch { target[key] = false; } }
          }));
        }
        finish(undefined, rows);
      } catch (error) { finish(error as Error); }
    };
    script.onerror = () => finish(new Error("تعذر الوصول إلى Google Sheets. تأكد أن الشيت متاح للقراءة العامة."));
    script.src = url.href; script.async = true; document.head.append(script);
  });
}
const str = (value: unknown) => String(value ?? "").trim();
const bool = (value: unknown) => value === true || value === 1 || ["TRUE", "1", "YES"].includes(str(value).toUpperCase());
const num = (value: unknown, fallback = 0) => { const result = Number(value); return Number.isFinite(result) ? result : fallback; };
export function menuFromRows(parts: { Products: Row[]; Categories: Row[]; Settings: Row[]; ThemeSettings?: Row[]; ProductOptions?: Row[]; Offers?: Row[] }): Menu {
  const settings = Object.fromEntries(parts.Settings.map(row => [str(row.key), row.value])) as Record<string, unknown>;
  const populatedCategories = new Set(parts.Products.map(row => str(row.category_id)));
  const data: Menu = {
    products: parts.Products.map((row): Product => ({
      id: str(row.id), category_id: str(row.category_id), name: str(row.name), description: str(row.description),
      price: num(row.price, NaN), compare_at_price: num(row.compare_at_price), image_url: str(row.image_url),
      available: bool(row.available), featured: bool(row.featured), sort_order: num(row.sort_order),
      product_type: str(row.product_type) === "combo" ? "combo" : "regular",
      recommendation_category_ids: str(row.related_category_ids) === "none" ? [] : str(row.related_category_ids) ? str(row.related_category_ids).split(",").map(id => id.trim()).filter(Boolean) : undefined,
    })),
    categories: parts.Categories.map((row): Category => ({
      id: str(row.id), name: str(row.name), description: str(row.description), image_url: str(row.image_url),
      visible: bool(row.visible) || (str(row.visible) === "" && populatedCategories.has(str(row.id))), sort_order: num(row.sort_order),
    })),
    settings: {
      restaurant_name: str(settings.restaurant_name) || "براند أبو البنات", restaurant_tagline: str(settings.restaurant_tagline),
      logo_url: str(settings.logo_url), cover_image_url: str(settings.cover_image_url), whatsapp_number: str(settings.whatsapp_number),
      currency: str(settings.currency) || "EGP", primary_color: str(settings.primary_color) || "#6D321E",
      secondary_color: str(settings.secondary_color) || "#E9A934", delivery_enabled: bool(settings.delivery_enabled),
      dine_in_enabled: bool(settings.dine_in_enabled), pickup_enabled: bool(settings.pickup_enabled),
      delivery_fee: num(settings.delivery_fee), minimum_order: num(settings.minimum_order), tax_rate: num(settings.tax_rate),
      opening_hours_text: str(settings.opening_hours_text), address_text: str(settings.address_text),
      order_disclaimer: str(settings.order_disclaimer), schema_version: "1",
    } satisfies Settings,
    options: (parts.ProductOptions || []).map((row): ProductOption => ({
      id: str(row.id), product_id: str(row.product_id), group_name: str(row.group_name), name: str(row.name),
      price_delta: num(row.price_delta), min_select: num(row.min_select), max_select: num(row.max_select, 1),
      available: bool(row.available), sort_order: num(row.sort_order),
    })),
    offers: (parts.Offers || []).map((row): Offer => ({
      id: str(row.id), title: str(row.title), description: str(row.description), image_url: str(row.image_url),
      discount_type: str(row.discount_type) === "percent" ? "percent" : "fixed", discount_value: num(row.discount_value),
      min_order: num(row.min_order), coupon_code: str(row.coupon_code), starts_at: str(row.starts_at), ends_at: str(row.ends_at),
      active: bool(row.active), sort_order: num(row.sort_order),
    })),
    updatedAt: new Date().toISOString(), schemaVersion: "1",
  };
  return validateMenu(data);
}
