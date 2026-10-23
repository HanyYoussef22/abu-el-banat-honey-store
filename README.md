# براند أبو البنات — متجر العسل

موقع مستقل لبراند أبو البنات. يعرض منتجات العسل ومنتجات النحل والخلطات، ويقرأ الكتالوج من Google Sheets عند إعداد `VITE_HONEY_SHEET_ID`.

## تشغيل محلي

```powershell
npm ci
npm run dev
```

بدون معرّف الشيت يعرض الموقع بيانات تجريبية مبنية على المنتجات والأسعار المتاحة. المنتجات ذات السعر صفر تظهر كاستفسار ولا تدخل السلة.

## اختبار وبناء

```powershell
npm test
npm run build
```

للنشر على GitHub Pages، يحدد workflow المسار `/abu-el-banat-honey-store/`. أضف متغير المستودع `VITE_HONEY_SHEET_ID` عند إعداد Google Sheet. لإعداد الشيت ولوحة المالك راجع [دليل المتجر](HONEY_STORE_SETUP_AR.md).
