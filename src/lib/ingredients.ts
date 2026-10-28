import type { IngredientItem } from '../types';

export const DEFAULT_INGREDIENTS: IngredientItem[] = [
  {
    id: 'ing-soybeans',
    name_th: 'ถั่วเหลืองอินทรีย์ไม่ดัดแปลงพันธุกรรม (Non-GMO)',
    name_en: 'Non-GMO Organic Soybeans',
    category: 'raw_materials',
    current_stock: 45,
    min_threshold: 20,
    unit: 'kg (กก.)',
    notes: 'ถั่วเหลืองคัดพิเศษจากฟาร์มอินทรีย์แม่วาง จ.เชียงใหม่',
    last_updated: new Date().toISOString(),
  },
  {
    id: 'ing-cow-milk',
    name_th: 'นมวัวสดแท้ 100% ส่งตรงจากฟาร์ม',
    name_en: '100% Fresh Farm Cow Milk',
    category: 'dairy_liquids',
    current_stock: 8, // Triggers low-stock!
    min_threshold: 15,
    unit: 'liters (ลิตร)',
    notes: 'นมวัวสดส่งเช้าตรู่จากสหกรณ์โคนมดอยสะเก็ด',
    last_updated: new Date().toISOString(),
  },
  {
    id: 'ing-ginger',
    name_th: 'ขิงแก่เมืองเหนืออายุ 12 เดือน',
    name_en: '12-Month Northern Aged Ginger',
    category: 'raw_materials',
    current_stock: 18,
    min_threshold: 8,
    unit: 'kg (กก.)',
    notes: 'ขิงแก่จัดเผ็ดร้อนจากยอดดอยสะเมิง',
    last_updated: new Date().toISOString(),
  },
  {
    id: 'ing-pandan',
    name_th: 'ใบเตยหอมสดคั้นธรรมชาติ',
    name_en: 'Fresh Aromatic Pandan Leaves',
    category: 'raw_materials',
    current_stock: 3.5, // Triggers low-stock!
    min_threshold: 6,
    unit: 'kg (กก.)',
    notes: 'สำหรับต้มให้กลิ่นหอมและทำสังขยาใบเตยสด',
    last_updated: new Date().toISOString(),
  },
  {
    id: 'ing-black-sesame',
    name_th: 'งาดำอินทรีย์คั่วเตาถ่าน',
    name_en: 'Organic Charcoal-Roasted Black Sesame',
    category: 'raw_materials',
    current_stock: 12,
    min_threshold: 5,
    unit: 'kg (กก.)',
    notes: 'คั่วบดใหม่สดทุก 2 วัน หอมเข้มข้น',
    last_updated: new Date().toISOString(),
  },
  {
    id: 'ing-patongko-flour',
    name_th: 'แป้งสาลีสูตรปาท่องโก๋กรอบไม่อมน้ำมัน',
    name_en: 'Crispy Patongko Artisan Flour',
    category: 'dry_goods',
    current_stock: 35,
    min_threshold: 15,
    unit: 'kg (กก.)',
    notes: 'แป้งสูตรลับโบราณผสมยีสต์ธรรมชาติ',
    last_updated: new Date().toISOString(),
  },
  {
    id: 'ing-brown-sugar',
    name_th: 'น้ำตาลทรายแดงออร์แกนิก & น้ำเชื่อมใบเตย',
    name_en: 'Organic Brown Sugar & Pandan Syrup',
    category: 'dry_goods',
    current_stock: 22,
    min_threshold: 10,
    unit: 'kg (กก.)',
    notes: 'เคี่ยวไฟอ่อนรสหวานละมุน ไม่แสบคอ',
    last_updated: new Date().toISOString(),
  },
  {
    id: 'ing-eco-bags',
    name_th: 'ถุงร้อนรักษ์โลกใส่น้ำเต้าหู้ (หูหิ้ว)',
    name_en: 'Eco Heat-Resistant Soy Milk Bags',
    category: 'packaging',
    current_stock: 280,
    min_threshold: 100,
    unit: 'units (ถุง)',
    notes: 'ทนความร้อน 100°C ย่อยสลายได้ทางชีวภาพ',
    last_updated: new Date().toISOString(),
  },
  {
    id: 'ing-paper-cups',
    name_th: 'แก้วกระดาษคราฟท์เคลือบชีวภาพ 16oz',
    name_en: '16oz Bio-Coated Paper Cups',
    category: 'packaging',
    current_stock: 65, // Triggers low-stock!
    min_threshold: 120,
    unit: 'cups (แก้ว)',
    notes: 'สำหรับลูกค้ารับเครื่องดื่มแบบพร้อมดื่ม',
    last_updated: new Date().toISOString(),
  },
  {
    id: 'ing-gypsum',
    name_th: 'เจียกอ (หินยิปซัมธรรมชาติทำเต้าฮวย)',
    name_en: 'Natural Mineral Gypsum Coagulant',
    category: 'dry_goods',
    current_stock: 4.8,
    min_threshold: 2,
    unit: 'kg (กก.)',
    notes: 'ทำให้เนื้อเต้าฮวยเนียนนุ่มละมุนลิ้น',
    last_updated: new Date().toISOString(),
  },
];

const STORAGE_KEY = 'wanjai_ingredient_inventory';

export function loadIngredients(): IngredientItem[] {
  if (typeof window === 'undefined') return DEFAULT_INGREDIENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_INGREDIENTS;
}

export function saveIngredients(list: IngredientItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(
      new CustomEvent('ingredient_inventory_updated', {
        detail: { ingredients: list },
      })
    );
  } catch {}
}

export function updateIngredientStock(id: string, newStock: number): IngredientItem[] {
  const current = loadIngredients();
  const updated = current.map((item) =>
    item.id === id
      ? {
          ...item,
          current_stock: Math.max(0, Number(newStock)),
          last_updated: new Date().toISOString(),
        }
      : item
  );
  saveIngredients(updated);
  return updated;
}

export function getLowStockIngredients(ingredients: IngredientItem[]): IngredientItem[] {
  return ingredients.filter((item) => item.current_stock <= item.min_threshold);
}
