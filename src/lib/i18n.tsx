import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Lang = "en" | "ar";
type Dict = Record<string, { en: string; ar: string }>;

const DICT: Dict = {
  app_name: { en: "Inventory Manager", ar: "إدارة المخزون" },
  dashboard: { en: "Dashboard", ar: "لوحة التحكم" },
  products: { en: "Products", ar: "المنتجات" },
  transactions: { en: "Transactions", ar: "الحركات" },
  users: { en: "Users", ar: "المستخدمون" },
  sign_out: { en: "Sign out", ar: "تسجيل خروج" },
  sign_in: { en: "Sign in", ar: "تسجيل الدخول" },
  sign_up: { en: "Sign up", ar: "إنشاء حساب" },
  email: { en: "Email", ar: "البريد الإلكتروني" },
  password: { en: "Password", ar: "كلمة المرور" },
  full_name: { en: "Full name", ar: "الاسم الكامل" },
  continue_with_google: { en: "Continue with Google", ar: "المتابعة بحساب Google" },
  total_products: { en: "Total products", ar: "إجمالي المنتجات" },
  total_stock: { en: "Total stock", ar: "إجمالي المخزون" },
  low_stock: { en: "Low stock alerts", ar: "تنبيهات نفاد المخزون" },
  inventory_value: { en: "Inventory value", ar: "قيمة المخزون" },
  recent_activity: { en: "Recent activity", ar: "أحدث النشاطات" },
  stock_by_category: { en: "Stock by category", ar: "المخزون حسب الفئة" },
  add_product: { en: "Add product", ar: "إضافة منتج" },
  edit: { en: "Edit", ar: "تعديل" },
  delete: { en: "Delete", ar: "حذف" },
  stock_in: { en: "Stock in", ar: "إدخال مخزون" },
  stock_out: { en: "Stock out", ar: "إخراج مخزون" },
  search: { en: "Search products...", ar: "ابحث عن منتجات..." },
  all_categories: { en: "All categories", ar: "كل الفئات" },
  all_suppliers: { en: "All الموردين", ar: "كل الموردين" },
  product_id: { en: "Product ID", ar: "رمز المنتج" },
  name: { en: "Name", ar: "الاسم" },
  category: { en: "Category", ar: "الفئة" },
  supplier: { en: "Supplier", ar: "المورد" },
  unit_price: { en: "Unit price", ar: "سعر الوحدة" },
  quantity: { en: "Quantity", ar: "الكمية" },
  min_stock: { en: "Min stock", ar: "الحد الأدنى" },
  notes: { en: "Notes", ar: "ملاحظات" },
  actions: { en: "Actions", ar: "إجراءات" },
  cancel: { en: "Cancel", ar: "إلغاء" },
  save: { en: "Save", ar: "حفظ" },
  date: { en: "Date", ar: "التاريخ" },
  action: { en: "Action", ar: "الإجراء" },
  product: { en: "Product", ar: "المنتج" },
  user: { en: "User", ar: "المستخدم" },
  import_excel: { en: "Import Excel", ar: "استيراد Excel" },
  export_excel: { en: "Export Excel", ar: "تصدير Excel" },
  export_transactions: { en: "Export transactions", ar: "تصدير الحركات" },
  no_products: { en: "No products yet. Add your first product or import from Excel.", ar: "لا توجد منتجات بعد. أضف أو استورد من Excel." },
  confirm_delete: { en: "Delete this product?", ar: "حذف هذا المنتج؟" },
  role: { en: "Role", ar: "الدور" },
  language: { en: "Language", ar: "اللغة" },
  toggle_theme: { en: "Toggle theme", ar: "تبديل المظهر" },
  loading: { en: "Loading...", ar: "جارٍ التحميل..." },
  in: { en: "In", ar: "وارد" },
  out: { en: "Out", ar: "صادر" },
  adjust: { en: "Adjust", ar: "تعديل" },
  welcome_back: { en: "Welcome back", ar: "مرحبًا بعودتك" },
  create_account: { en: "Create your account", ar: "أنشئ حسابك" },
  first_user_admin: { en: "The first registered user becomes the administrator.", ar: "أول مستخدم مسجل يصبح المسؤول." },
};

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof DICT | string) => string;
  dir: "ltr" | "rtl";
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const saved = (typeof window !== "undefined" && (localStorage.getItem("lang") as Lang)) || "en";
    setLangState(saved);
  }, []);
  useEffect(() => {
    const dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
    if (typeof window !== "undefined") localStorage.setItem("lang", lang);
  }, [lang]);
  const t = (key: string) => DICT[key]?.[lang] ?? key;
  return (
    <I18nContext.Provider value={{ lang, setLang: setLangState, t, dir: lang === "ar" ? "rtl" : "ltr" }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const c = useContext(I18nContext);
  if (!c) throw new Error("useI18n must be used within I18nProvider");
  return c;
}
