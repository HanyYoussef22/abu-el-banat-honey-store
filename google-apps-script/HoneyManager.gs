/**
 * إدارة كتالوج براند أبو البنات. هذا ملف مستقل عن PhotoManager.gs.
 * شغّل setupHoneyManager من حساب البراند ثم انشر تطبيق الويب.
 * انشر تطبيق الويب للمالك فقط (Execute as: user accessing the web app).
 */
const HONEY_CONFIG = Object.freeze({ maxBytes: 8 * 1024 * 1024 });
const HONEY_SPREADSHEET_ID = '1RLijsyZcyxmeiRsrYTTXGbE3Y22bEqdsUDhDr5gGtUM';

function setupHoneyManager() {
  const email = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
  if (!email) throw new Error('شغّل الإعداد من حساب Google الخاص بمالك الشيت.');
  const spreadsheetId = HONEY_SPREADSHEET_ID;
  if (!spreadsheetId || !/^[a-zA-Z0-9_-]{20,150}$/.test(spreadsheetId)) throw new Error('أضف معرف ملف شيت العسل إلى Script Properties باسم HONEY_SPREADSHEET_ID أولًا.');
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('HONEY_BOUND_SPREADSHEET_ID') && props.getProperty('HONEY_BOUND_SPREADSHEET_ID') !== spreadsheetId)
    throw new Error('هذا المدير مرتبط بملف آخر. لا تغيّر معرّف الشيت بعد الإعداد.');
  const fileOwner = DriveApp.getFileById(spreadsheetId).getOwner();
  const ownerEmail = fileOwner && String(fileOwner.getEmail() || '').toLowerCase();
  if (!ownerEmail || email !== ownerEmail) throw new Error('يجب تشغيل الإعداد من حساب مالك Google Sheets نفسه.');
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  productSheet_();
  ensureRelatedColumn_();
  ensureComparePriceColumn_();
  settingsSheet_();
  if (props.getProperty('HONEY_OWNER_EMAIL') && props.getProperty('HONEY_OWNER_EMAIL') !== email) {
    throw new Error('تم إعداد الأداة مسبقًا بحساب مالك مختلف.');
  }
  props.setProperty('HONEY_BOUND_SPREADSHEET_ID', spreadsheetId);
  props.setProperty('HONEY_SPREADSHEET_ID', spreadsheetId);
  if (!props.getProperty('HONEY_FOLDER_ID')) {
    const folder = DriveApp.createFolder('صور براند أبو البنات - ' + spreadsheet.getName());
    props.setProperty('HONEY_FOLDER_ID', folder.getId());
  }
  props.setProperty('HONEY_OWNER_EMAIL', email);
  return 'تم إعداد مدير كتالوج العسل. مجلد الصور: ' + props.getProperty('HONEY_FOLDER_ID');
}

function honeySpreadsheet_() {
  const id = HONEY_SPREADSHEET_ID;
  if (!id || !/^[a-zA-Z0-9_-]{20,150}$/.test(id)) throw new Error('معرف شيت العسل غير مضبوط. راجع إعداد Script Properties.');
  const boundId = PropertiesService.getScriptProperties().getProperty('HONEY_BOUND_SPREADSHEET_ID');
  if (boundId && id !== boundId) throw new Error('معرف الشيت لا يطابق الملف المرتبط بهذا المدير. أعد الإعداد من نسخة مستقلة عند تغيير الملف.');
  return SpreadsheetApp.openById(id);
}

function doGet() {
  assertOwner_();
  return HtmlService.createHtmlOutputFromFile('HoneyManager')
    .setTitle('إدارة براند أبو البنات')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function listMenuAdmin() {
  assertOwner_();
  ensureDefaultCategories_();
  ensureRelatedColumn_();
  ensureComparePriceColumn_();
  const info = productSheet_();
  const branding = brandSettings_();
  const profile = restaurantSettings_();
  const rows = info.sheet.getRange(2, 1, Math.max(info.sheet.getLastRow() - 1, 1), info.headers.length).getValues();
  const categoriesSheet = honeySpreadsheet_().getSheetByName('Categories');
  if (!categoriesSheet) throw new Error('صفحة Categories غير موجودة.');
  const categoryRows = categoriesSheet.getRange(1, 1, Math.max(categoriesSheet.getLastRow(), 1), Math.max(categoriesSheet.getLastColumn(), 1)).getValues();
  const categoryHeaders = categoryRows[0].map(String);
  const categoryId = categoryHeaders.indexOf('id');
  const categoryName = categoryHeaders.indexOf('name');
  const visible = categoryHeaders.indexOf('visible');
  const categoryOrder = categoryHeaders.indexOf('sort_order');
  if ([categoryId, categoryName, visible, categoryOrder].some(index => index < 0)) throw new Error('أعمدة Categories غير مكتملة.');
  const categories = categoryRows.slice(1).filter(row => String(row[categoryId]).trim())
    .map(row => ({ id: String(row[categoryId]).trim(), name: String(row[categoryName]).trim(), visible: trueValue_(row[visible]), sort_order: Number(row[categoryOrder] || 0) }));
  return {
    categories: categories,
    products: rows.filter(row => String(row[info.idColumn]).trim()).map(row => productObject_(row, info.headers)),
    options: listProductOptions_(),
    branding: branding,
    profile: profile,
  };
}

function ensureRelatedColumn_() {
  const info = productSheet_();
  if (!info.headers.includes('related_category_ids')) {
    info.sheet.getRange(1, info.headers.length + 1).setValue('related_category_ids');
    SpreadsheetApp.flush();
  }
}

function ensureComparePriceColumn_() {
  const info = productSheet_();
  if (!info.headers.includes('compare_at_price')) {
    info.sheet.getRange(1, info.headers.length + 1).setValue('compare_at_price');
    SpreadsheetApp.flush();
  }
}

function productOptionsSheet_() {
  const sheet = honeySpreadsheet_().getSheetByName('ProductOptions');
  if (!sheet) throw new Error('صفحة ProductOptions غير موجودة. أنشئها من قالب المتجر قبل إضافة الأحجام.');
  const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(String);
  const required = ['id','product_id','group_name','name','price_delta','min_select','max_select','available','sort_order'];
  if (required.some(key => !headers.includes(key))) throw new Error('أعمدة ProductOptions غير مكتملة.');
  return { sheet: sheet, headers: headers };
}

function listProductOptions_() {
  const sheet = honeySpreadsheet_().getSheetByName('ProductOptions');
  if (!sheet) return [];
  const info = productOptionsSheet_();
  const rows = info.sheet.getRange(2,1,Math.max(info.sheet.getLastRow()-1,1),info.headers.length).getValues();
  return rows.filter(row => String(row[info.headers.indexOf('id')]).trim()).map(row => {
    const value = key => row[info.headers.indexOf(key)];
    return { id:String(value('id')), product_id:String(value('product_id')), group_name:String(value('group_name')),
      name:String(value('name')), price_delta:Number(value('price_delta') || 0), available:trueValue_(value('available')),
      sort_order:Number(value('sort_order') || 0) };
  });
}

function ensureDefaultCategories_() {
  const defaults = [
    ['offers','العروض'],['honey','أنواع العسل'],['mixes','خلطات علاجية'],
    ['bee','منتجات النحل'],['family','الأسرة والأطفال'],['thursday','ليلة الخميس'],
  ];
  const lock = LockService.getScriptLock(); lock.waitLock(15000);
  try {
    const info = categorySheet_();
    const rows = info.sheet.getRange(2,1,Math.max(info.sheet.getLastRow()-1,1),info.headers.length).getValues();
    const ids = new Set(rows.map(row => String(row[info.idColumn]).trim()));
    const names = new Set(rows.map(row => String(row[info.nameColumn]).trim()));
    let order = Math.max(0,...rows.map(row => Number(row[info.sortColumn]) || 0));
    defaults.forEach(([id,name]) => {
      if (ids.has(id) || names.has(name)) return;
      const row = Array(info.headers.length).fill('');
      row[info.idColumn] = id; row[info.nameColumn] = name;
      row[info.visibleColumn] = 'FALSE'; row[info.sortColumn] = ++order;
      info.sheet.appendRow(row); ids.add(id); names.add(name);
    });
    SpreadsheetApp.flush();
  } finally { lock.releaseLock(); }
}

function addCategory(nameInput) {
  assertOwner_();
  const name = String(nameInput || '').trim();
  if (!name || name.length > 60) throw new Error('اسم القسم مطلوب، بحد أقصى 60 حرفًا.');
  const lock = LockService.getScriptLock(); lock.waitLock(15000);
  try {
    const info = categorySheet_();
    const rows = info.sheet.getRange(2,1,Math.max(info.sheet.getLastRow()-1,1),info.headers.length).getValues();
    if (rows.some(row => String(row[info.nameColumn]).trim() === name)) throw new Error('هذا القسم موجود بالفعل.');
    const id = 'section-' + Utilities.getUuid().replace(/-/g,'').slice(0,12);
    const row = Array(info.headers.length).fill('');
    row[info.idColumn] = id; row[info.nameColumn] = safeSheetText_(name);
    row[info.visibleColumn] = 'FALSE'; row[info.sortColumn] = Math.max(0,...rows.map(value => Number(value[info.sortColumn]) || 0)) + 1;
    info.sheet.appendRow(row); SpreadsheetApp.flush();
    return { id: id, name: name, message: 'تم إضافة القسم. سيظهر للزبائن عند إضافة أول صنف له.' };
  } finally { lock.releaseLock(); }
}

function saveCategorySettings(input) {
  assertOwner_();
  const id = String(input.id || '').trim();
  const name = String(input.name || '').trim();
  const order = Number(input.sort_order);
  if (!id || !name || name.length > 60) throw new Error('اسم القسم مطلوب، بحد أقصى 60 حرفًا.');
  if (!Number.isInteger(order) || order < 0 || order > 9999) throw new Error('ترتيب القسم يجب أن يكون عددًا من 0 إلى 9999.');
  const lock = LockService.getScriptLock(); lock.waitLock(15000);
  try {
    const info = categorySheet_();
    const rows = info.sheet.getRange(2,1,Math.max(info.sheet.getLastRow()-1,1),info.headers.length).getValues();
    const matches = rows.map((row,index) => String(row[info.idColumn]).trim() === id ? index+2 : -1).filter(row => row > 0);
    if (matches.length !== 1) throw new Error('القسم غير موجود أو معرفه مكرر.');
    if (rows.some(row => String(row[info.idColumn]).trim() !== id && String(row[info.nameColumn]).trim() === name)) throw new Error('اسم القسم مستخدم بالفعل.');
    info.sheet.getRange(matches[0], info.nameColumn+1).setValue(safeSheetText_(name));
    info.sheet.getRange(matches[0], info.sortColumn+1).setValue(order);
    info.sheet.getRange(matches[0], info.visibleColumn+1).setValue(input.visible === true ? 'TRUE' : 'FALSE');
    SpreadsheetApp.flush();
    return { message: 'تم تحديث القسم وترتيبه.' };
  } finally { lock.releaseLock(); }
}

function categorySheet_() {
  const sheet = honeySpreadsheet_().getSheetByName('Categories');
  if (!sheet) throw new Error('صفحة Categories غير موجودة.');
  const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(String);
  const idColumn = headers.indexOf('id'), nameColumn = headers.indexOf('name');
  const visibleColumn = headers.indexOf('visible'), sortColumn = headers.indexOf('sort_order');
  if ([idColumn,nameColumn,visibleColumn,sortColumn].some(index => index < 0)) throw new Error('أعمدة Categories غير مكتملة.');
  return { sheet:sheet, headers:headers, idColumn:idColumn, nameColumn:nameColumn, visibleColumn:visibleColumn, sortColumn:sortColumn };
}

function showCategory_(id) {
  const info = categorySheet_();
  const rows = info.sheet.getRange(2,1,Math.max(info.sheet.getLastRow()-1,1),info.headers.length).getValues();
  const matches = rows.map((row,index) => String(row[info.idColumn]).trim() === id ? index+2 : -1).filter(row => row > 0);
  if (matches.length !== 1) throw new Error('القسم غير موجود أو معرفه مكرر.');
  info.sheet.getRange(matches[0],info.visibleColumn+1).setValue('TRUE');
}

function restaurantSettings_() {
  const info = settingsSheet_();
  const rows = info.sheet.getRange(2, 1, Math.max(info.sheet.getLastRow() - 1, 1), info.headers.length).getValues();
  const result = { restaurant_name: '', restaurant_tagline: '', whatsapp_number: '' };
  Object.keys(result).forEach(key => {
    const matches = rows.filter(row => String(row[info.keyColumn]).trim() === key);
    if (matches.length !== 1) throw new Error('حقل ' + key + ' غير موجود أو مكرر في Settings.');
    result[key] = String(matches[0][info.valueColumn] || '').trim();
  });
  return result;
}

function saveRestaurantSettings(form) {
  assertOwner_();
  const name = String(form.restaurantName || '').trim();
  const tagline = String(form.restaurantTagline || '').trim();
  const phone = String(form.whatsappNumber || '').replace(/[^0-9]/g, '');
  if (!name || name.length > 80) throw new Error('اسم المتجر مطلوب، بحد أقصى 80 حرفًا.');
  if (tagline.length > 120) throw new Error('العبارة التعريفية أطول من 120 حرفًا.');
  if (!/^[1-9][0-9]{7,14}$/.test(phone)) throw new Error('اكتب رقم واتساب دوليًا من 8 إلى 15 رقمًا، مثل 201000000000.');
  const values = { restaurant_name: safeSheetText_(name), restaurant_tagline: safeSheetText_(tagline), whatsapp_number: phone };
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const info = settingsSheet_();
    const rows = info.sheet.getRange(2, 1, Math.max(info.sheet.getLastRow() - 1, 1), info.headers.length).getValues();
    const positions = {};
    Object.keys(values).forEach(key => {
      const matches = rows.map((row,index) => String(row[info.keyColumn]).trim() === key ? index + 2 : -1).filter(row => row > 0);
      if (matches.length !== 1) throw new Error('حقل ' + key + ' غير موجود أو مكرر في Settings.');
      positions[key] = matches[0];
    });
    Object.keys(values).forEach(key => info.sheet.getRange(positions[key], info.valueColumn + 1).setValue(values[key]));
    SpreadsheetApp.flush();
    return { profile: values, message: 'تم تحديث اسم المتجر ورقم واتساب.' };
  } finally { lock.releaseLock(); }
}

function brandSettings_() {
  const info = settingsSheet_();
  const rows = info.sheet.getRange(2, 1, Math.max(info.sheet.getLastRow() - 1, 1), info.headers.length).getValues();
  const result = { logo_url: '', cover_image_url: '' };
  Object.keys(result).forEach(key => {
    const matches = rows.filter(row => String(row[info.keyColumn]).trim() === key);
    if (matches.length !== 1) throw new Error('حقل ' + key + ' غير موجود أو مكرر في Settings.');
    result[key] = String(matches[0][info.valueColumn] || '').trim();
  });
  return result;
}

function saveBrandImage(form) {
  assertOwner_();
  const kind = String(form.kind || '');
  const spec = kind === 'logo' ? { key: 'logo_url', width: 512, height: 512, size: 'w800' }
    : kind === 'banner' ? { key: 'cover_image_url', width: 1600, height: 900, size: 'w2000' } : null;
  if (!spec) throw new Error('نوع الصورة غير صالح.');
  const blob = form.photo;
  if (!blob || typeof blob.getBytes !== 'function') throw new Error('اختر صورة أولًا.');
  if (blob.getContentType() !== 'image/png') throw new Error('تعذر تجهيز الصورة. اخترها مرة أخرى من صفحة الإدارة.');
  const bytes = blob.getBytes();
  if (bytes.length > HONEY_CONFIG.maxBytes) throw new Error('الصورة بعد التجهيز أكبر من 8 ميجابايت. اختر صورة أصغر.');
  if (bytes.length < 24 || [137,80,78,71,13,10,26,10].some((n,i) => (bytes[i] & 255) !== n)) throw new Error('ملف الصورة غير صالح.');
  const dimension = offset => ((bytes[offset] & 255) * 16777216) + ((bytes[offset+1] & 255) << 16) + ((bytes[offset+2] & 255) << 8) + (bytes[offset+3] & 255);
  if (dimension(16) !== spec.width || dimension(20) !== spec.height)
    throw new Error('مقاس الصورة المطلوب ' + spec.width + ' × ' + spec.height + ' بكسل. أعد اختيار الصورة من صفحة الإدارة.');
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  let file;
  try {
    const info = settingsSheet_();
    const rows = info.sheet.getRange(2, 1, Math.max(info.sheet.getLastRow() - 1, 1), info.headers.length).getValues();
    const matches = rows.map((row,index) => String(row[info.keyColumn]).trim() === spec.key ? index + 2 : -1).filter(row => row > 0);
    if (matches.length !== 1) throw new Error('حقل الصورة غير موجود أو مكرر في Settings.');
    const folder = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('HONEY_FOLDER_ID'));
    blob.setName(kind + '-' + Date.now() + '.png');
    file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const url = 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(file.getId()) + '&sz=' + spec.size;
    if (!isPublicImage_(url)) throw new Error('تعذر عرض الصورة للعامة من Drive. لم يتم تعديل الشيت.');
    info.sheet.getRange(matches[0], info.valueColumn + 1).setValue(url);
    SpreadsheetApp.flush();
    return { kind: kind, url: url, message: kind === 'logo' ? 'تم تحديث شعار المتجر.' : 'تم تحديث صورة الغلاف.' };
  } catch (error) {
    if (file) try { file.setTrashed(true); } catch (_) {}
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function saveProduct(form) {
  assertOwner_();
  const name = String(form.name || '').trim();
  const description = String(form.description || '').trim();
  const categoryId = String(form.categoryId || '').trim();
  const rawPrice = String(form.price == null ? '' : form.price).trim();
  const price = Number(rawPrice);
  const rawSort = String(form.sortOrder == null ? '0' : form.sortOrder).trim();
  const sortOrder = Number(rawSort || 0);
  if (!name || name.length > 120) throw new Error('اسم الصنف مطلوب، بحد أقصى 120 حرفًا.');
  if (description.length > 500) throw new Error('الوصف أطول من 500 حرف.');
  if (!rawPrice || !Number.isFinite(price) || price < 0 || price > 1000000) throw new Error('أدخل سعرًا صحيحًا. استخدم 0 للمنتج الذي يحتاج إلى استفسار عن السعر؛ لن يظهر كمنتج مجاني.');
  const rawComparePrice = String(form.compareAtPrice == null ? '' : form.compareAtPrice).trim();
  const comparePrice = rawComparePrice ? Number(rawComparePrice) : 0;
  if (rawComparePrice && (!Number.isFinite(comparePrice) || comparePrice < 0 || comparePrice > 1000000)) throw new Error('سعر المقارنة غير صالح.');
  if (comparePrice > 0 && (price === 0 || comparePrice <= price)) throw new Error('سعر المقارنة يجب أن يكون أعلى من السعر الحالي، أو اتركه فارغًا.');
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 9999) throw new Error('الترتيب يجب أن يكون رقمًا من 0 إلى 9999.');
  if (!['TRUE', 'FALSE'].includes(String(form.available))) throw new Error('حالة التوافر غير صالحة.');
  if (!['TRUE', 'FALSE'].includes(String(form.featured))) throw new Error('حالة التمييز غير صالحة.');
  if (!['regular', 'combo'].includes(String(form.productType))) throw new Error('نوع الصنف غير صالح.');

  const categories = listMenuAdmin().categories;
  if (!categories.some(category => category.id === categoryId)) throw new Error('اختر قسمًا موجودًا في الشيت.');
  const hasOptionsConfig = typeof form.optionsJson === 'string';
  let optionsConfig = { sizes: [], extras: [] };
  if (hasOptionsConfig) {
    try { optionsConfig = JSON.parse(form.optionsJson); } catch (_) { throw new Error('بيانات الأحجام والإضافات غير صالحة.'); }
    if (!optionsConfig || !Array.isArray(optionsConfig.sizes) || !Array.isArray(optionsConfig.extras) ||
        optionsConfig.sizes.length > 10 || optionsConfig.extras.length > 20) throw new Error('عدد الأحجام أو الإضافات غير صالح.');
    if (price === 0 && optionsConfig.sizes.length) throw new Error('المنتج بسعر 0 مخصص للاستفسار ولا يمكن إضافة أحجام قابلة للطلب.');
    if (optionsConfig.sizes.length === 1) throw new Error('أضف حجمين على الأقل، أو اختر أن الصنف ليس له أحجام.');
    ['sizes','extras'].forEach(key => optionsConfig[key].forEach(item => {
      const label = String(item.name || '').trim();
      const delta = Number(item.price_delta);
      if (!label || label.length > 80 || !Number.isFinite(delta) || delta < 0 || delta > 1000000)
        throw new Error('راجع اسم وسعر كل ' + (key === 'sizes' ? 'حجم' : 'إضافة') + '.');
      item.name = label; item.price_delta = delta;
    }));
    if (optionsConfig.sizes.length && !optionsConfig.sizes.some(item => item.price_delta === 0))
      throw new Error('يجب أن يساوي سعر الصنف الأساسي أقل سعر حجم؛ راجع أسعار الأحجام.');
    const labels = optionsConfig.sizes.concat(optionsConfig.extras).map(item => item.name);
    if (new Set(labels).size !== labels.length) throw new Error('لا تكرر اسم حجم أو إضافة للصنف نفسه.');
    productOptionsSheet_();
  }
  let relatedValue;
  if (typeof form.relatedMode === 'string') {
    if (!['auto','custom','none'].includes(form.relatedMode)) throw new Error('طريقة عرض الإضافات المقترحة غير صالحة.');
    let chosen = [];
    if (form.relatedMode === 'custom') {
      try { chosen = JSON.parse(String(form.relatedCategoriesJson || '[]')); } catch (_) { throw new Error('الأقسام المقترحة غير صالحة.'); }
      if (!Array.isArray(chosen) || !chosen.length || chosen.length > 12 || new Set(chosen).size !== chosen.length ||
          chosen.some(id => !categories.some(category => category.id === id))) throw new Error('اختر قسمًا واحدًا على الأقل للإضافات المقترحة.');
    }
    relatedValue = form.relatedMode === 'auto' ? '' : form.relatedMode === 'none' ? 'none' : chosen.join(',');
  }
  const blob = form.photo;
  const imageBytes = blob && typeof blob.getBytes === 'function' ? blob.getBytes() : [];
  const hasImage = imageBytes.length > 0;
  const types = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  const mime = hasImage ? blob.getContentType() : '';
  if (hasImage && !types[mime]) throw new Error('استخدم صورة JPG أو PNG أو WebP.');
  if (imageBytes.length > HONEY_CONFIG.maxBytes) throw new Error('الصورة أكبر من 8 ميجابايت.');

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  let uploadedFile;
  try {
    const info = productSheet_();
    const allRows = info.sheet.getRange(2, 1, Math.max(info.sheet.getLastRow() - 1, 1), info.headers.length).getValues();
    const requestedId = String(form.productId || '').trim();
    if (requestedId && !/^[A-Za-z0-9_-]{1,80}$/.test(requestedId)) throw new Error('معرف الصنف غير صالح.');
    const matches = allRows.map((row, index) => String(row[info.idColumn]).trim() === requestedId ? index + 2 : -1).filter(row => row > 0);
    if (requestedId && matches.length !== 1) throw new Error('الصنف غير موجود أو معرفه مكرر. حدّث الصفحة.');
    let id = requestedId;
    if (!id) {
      do { id = 'item-' + Utilities.getUuid().replace(/-/g, '').slice(0, 12); }
      while (allRows.some(row => String(row[info.idColumn]).trim() === id));
    }
    const row = requestedId ? allRows[matches[0] - 2].slice() : Array(info.headers.length).fill('');
    const values = {
      id: id, category_id: categoryId, name: safeSheetText_(name), description: safeSheetText_(description),
      price: price, compare_at_price: comparePrice, available: String(form.available), featured: String(form.featured),
      sort_order: sortOrder, product_type: String(form.productType),
    };
    Object.keys(values).forEach(key => { row[info.headers.indexOf(key)] = values[key]; });
    if (relatedValue !== undefined) row[info.headers.indexOf('related_category_ids')] = relatedValue;
    if (hasImage) {
      const folder = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('HONEY_FOLDER_ID'));
      blob.setName(id + '-' + Date.now() + '.' + types[mime]);
      uploadedFile = folder.createFile(blob);
      uploadedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      const url = 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(uploadedFile.getId()) + '&sz=w1200';
      if (!isPublicImage_(url)) throw new Error('تعذر عرض الصورة للعامة من Drive. لم يتم حفظ الصنف.');
      row[info.imageColumn] = url;
    }
    if (requestedId) info.sheet.getRange(matches[0], 1, 1, info.headers.length).setValues([row]);
    else info.sheet.appendRow(row);
    if (hasOptionsConfig) replaceProductOptions_(id, optionsConfig);
    showCategory_(categoryId);
    SpreadsheetApp.flush();
    return { product: productObject_(row, info.headers), message: requestedId ? 'تم تحديث الصنف.' : 'تمت إضافة الصنف.' };
  } catch (error) {
    if (uploadedFile) try { uploadedFile.setTrashed(true); } catch (_) {}
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function replaceProductOptions_(productId, config) {
  const info = productOptionsSheet_();
  const rows = info.sheet.getRange(2,1,Math.max(info.sheet.getLastRow()-1,1),info.headers.length).getValues();
  const productColumn = info.headers.indexOf('product_id');
  rows.forEach((row,index) => {
    if (String(row[productColumn]).trim() === productId)
      info.sheet.getRange(index+2,1,1,info.headers.length).setValues([Array(info.headers.length).fill('')]);
  });
  const append = (item, group, index, min, max) => {
    const row = Array(info.headers.length).fill('');
    const values = { id:productId + '-' + (group === 'الحجم' ? 'size' : 'extra') + '-' + (index+1),
      product_id:productId, group_name:group, name:safeSheetText_(item.name), price_delta:item.price_delta,
      min_select:min, max_select:max, available:'TRUE', sort_order:index+1 };
    Object.keys(values).forEach(key => row[info.headers.indexOf(key)] = values[key]);
    info.sheet.appendRow(row);
  };
  config.sizes.forEach((item,index) => append(item,'الحجم',index,1,1));
  config.extras.forEach((item,index) => append(item,'إضافات',index,0,config.extras.length));
}

function setProductAvailability(id, available) {
  assertOwner_();
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(String(id)) || typeof available !== 'boolean') throw new Error('طلب غير صالح.');
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const info = productSheet_();
    const ids = info.sheet.getRange(2, info.idColumn + 1, Math.max(info.sheet.getLastRow() - 1, 1), 1).getValues();
    const matches = ids.map((row, index) => String(row[0]).trim() === id ? index + 2 : -1).filter(row => row > 0);
    if (matches.length !== 1) throw new Error('الصنف غير موجود أو معرفه مكرر.');
    info.sheet.getRange(matches[0], info.headers.indexOf('available') + 1).setValue(available ? 'TRUE' : 'FALSE');
    SpreadsheetApp.flush();
    return { id: id, available: available };
  } finally {
    lock.releaseLock();
  }
}

function productObject_(row, headers) {
  const value = key => row[headers.indexOf(key)];
  return {
    id: String(value('id') || '').trim(), category_id: String(value('category_id') || '').trim(),
    name: String(value('name') || '').trim(), description: String(value('description') || '').trim(),
    price: Number(value('price') || 0), compare_at_price: Number(value('compare_at_price') || 0), image_url: String(value('image_url') || '').trim(),
    available: trueValue_(value('available')), featured: trueValue_(value('featured')),
    sort_order: Number(value('sort_order') || 0), product_type: String(value('product_type') || 'regular'),
    related_category_ids: String(value('related_category_ids') || ''),
  };
}

function trueValue_(value) { return value === true || String(value).trim().toUpperCase() === 'TRUE'; }
function safeSheetText_(value) {
  const text = String(value == null ? '' : value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function listProducts() {
  assertOwner_();
  const info = productSheet_();
  const rows = info.sheet.getRange(2, 1, Math.max(info.sheet.getLastRow() - 1, 1), info.sheet.getLastColumn()).getValues();
  return rows.filter(row => String(row[info.idColumn]).trim()).map(row => ({
    id: String(row[info.idColumn]).trim(),
    name: String(row[info.nameColumn]).trim(),
    image_url: String(row[info.imageColumn]).trim(),
  }));
}

function savePhoto(form) {
  assertOwner_();
  const id = String(form.productId || '').trim();
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(id)) throw new Error('معرف الصنف غير صالح.');
  const info = productSheet_();
  const ids = info.sheet.getRange(2, info.idColumn + 1, Math.max(info.sheet.getLastRow() - 1, 1), 1).getValues();
  const matches = ids.map((row, index) => String(row[0]).trim() === id ? index + 2 : -1).filter(row => row > 0);
  if (matches.length !== 1) throw new Error('الصنف غير موجود أو معرفه مكرر.');

  const blob = form.photo;
  if (!blob || typeof blob.getBytes !== 'function') throw new Error('اختر صورة أولًا.');
  const types = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  const mime = blob.getContentType();
  if (!types[mime]) throw new Error('استخدم صورة JPG أو PNG أو WebP.');
  if (blob.getBytes().length > HONEY_CONFIG.maxBytes) throw new Error('الصورة أكبر من 8 ميجابايت.');

  const props = PropertiesService.getScriptProperties();
  const folder = DriveApp.getFolderById(props.getProperty('HONEY_FOLDER_ID'));
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  let file;
  try {
    // نتحقق ثانية داخل القفل، في حالة حذف الصنف أثناء الرفع.
    if (String(info.sheet.getRange(matches[0], info.idColumn + 1).getValue()).trim() !== id)
      throw new Error('تغيّر صف الصنف. أعد فتح الصفحة وحاول مرة أخرى.');
    blob.setName(id + '-' + Date.now() + '.' + types[mime]);
    file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const url = 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(file.getId()) + '&sz=w1200';
    if (!isPublicImage_(url)) throw new Error('تعذر عرض الصورة للعامة من Drive. لم يتم تعديل الشيت.');
    info.sheet.getRange(matches[0], info.imageColumn + 1).setValue(url);
    SpreadsheetApp.flush();
    return { id: id, url: url, message: 'تم حفظ الصورة وتحديث المتجر.' };
  } catch (error) {
    if (file) try { file.setTrashed(true); } catch (_) {}
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function isPublicImage_(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) Utilities.sleep(1500);
    try {
      const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
      const headers = response.getHeaders();
      const contentType = Object.keys(headers).find(key => key.toLowerCase() === 'content-type');
      if (response.getResponseCode() === 200 && /^image\//i.test(String(contentType ? headers[contentType] : '')))
        return true;
    } catch (_) {}
  }
  return false;
}

function assertOwner_() {
  const props = PropertiesService.getScriptProperties();
  const expected = props.getProperty('HONEY_OWNER_EMAIL');
  const actual = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
  if (!expected || !props.getProperty('HONEY_FOLDER_ID')) throw new Error('يجب تشغيل setupHoneyManager أولًا.');
  if (!actual || actual !== expected) throw new Error('لوحة الإدارة متاحة لمالك شيت العسل فقط.');
}

function productSheet_() {
  const sheet = honeySpreadsheet_().getSheetByName('Products');
  if (!sheet) throw new Error('صفحة Products غير موجودة.');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const idColumn = headers.indexOf('id');
  const nameColumn = headers.indexOf('name');
  const imageColumn = headers.indexOf('image_url');
  const required = ['id', 'category_id', 'name', 'description', 'price', 'image_url', 'available', 'featured', 'sort_order', 'product_type'];
  if (required.some(key => !headers.includes(key))) throw new Error('أعمدة Products غير مكتملة.');
  return { sheet: sheet, headers: headers, idColumn: idColumn, nameColumn: nameColumn, imageColumn: imageColumn };
}

function settingsSheet_() {
  const sheet = honeySpreadsheet_().getSheetByName('Settings');
  if (!sheet) throw new Error('صفحة Settings غير موجودة.');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const keyColumn = headers.indexOf('key');
  const valueColumn = headers.indexOf('value');
  if (keyColumn < 0 || valueColumn < 0) throw new Error('أعمدة Settings غير مكتملة.');
  return { sheet: sheet, headers: headers, keyColumn: keyColumn, valueColumn: valueColumn };
}
