import { CompanyInfo, Product, Receipt } from '../types';
import { DEFAULT_COMPANY_INFO, INITIAL_PRODUCTS } from '../data/defaultProducts';
import { thaiBahtText } from '../utils/thaiBaht';

const RECEIPTS_KEY = 'venturetec_receipts_v1';
const PRODUCTS_KEY = 'venturetec_products_v1';
const COMPANY_KEY = 'venturetec_company_v1';
const RUNNING_CONFIG_KEY = 'venturetec_running_config_v1';
const STAFF_LIST_KEY = 'wasabi_staff_list_v1';

export const DEFAULT_STAFF_LIST: string[] = [
  'ฝ่ายขาย Mini Shop',
  'คุณสมชาย (ขายหน้าร้าน)',
  'คุณวิภา (ออนไลน์)',
  'คุณสุพรรณี (แอดมิน)',
];

export function getStaffList(): string[] {
  try {
    const raw = localStorage.getItem(STAFF_LIST_KEY);
    if (!raw) {
      localStorage.setItem(STAFF_LIST_KEY, JSON.stringify(DEFAULT_STAFF_LIST));
      return DEFAULT_STAFF_LIST;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_STAFF_LIST;
  } catch {
    return DEFAULT_STAFF_LIST;
  }
}

export function saveStaffList(list: string[]): void {
  localStorage.setItem(STAFF_LIST_KEY, JSON.stringify(list));
}

export function addStaffName(name: string): string[] {
  const trimmed = name.trim();
  if (!trimmed) return getStaffList();
  const current = getStaffList();
  if (!current.includes(trimmed)) {
    const updated = [...current, trimmed];
    saveStaffList(updated);
    return updated;
  }
  return current;
}

export function removeStaffName(name: string): string[] {
  const current = getStaffList();
  const updated = current.filter((s) => s !== name);
  saveStaffList(updated);
  return updated;
}

export interface RunningConfig {
  prefix: string; // e.g. "MS"
  yearFormat: 'YYYY' | 'YY' | 'TH_YYYY'; // e.g. 2026 or 2569
  digits: number; // e.g. 4 -> 0001
  lastNumber: number;
}

const DEFAULT_RUNNING_CONFIG: RunningConfig = {
  prefix: 'MS',
  yearFormat: 'YYYY',
  digits: 4,
  lastNumber: 0,
};

export function getCompanyInfo(): CompanyInfo {
  try {
    const raw = localStorage.getItem(COMPANY_KEY);
    if (!raw) {
      localStorage.setItem(COMPANY_KEY, JSON.stringify(DEFAULT_COMPANY_INFO));
      return DEFAULT_COMPANY_INFO;
    }
    const info = JSON.parse(raw);
    let changed = false;

    // Migrate old marketing email to receptionist@venturetec.co.th
    if (!info.email || info.email === 'marketing@venturetec.co.th') {
      info.email = 'receptionist@venturetec.co.th';
      changed = true;
    }

    if (
      !info.logoUrl ||
      info.logoUrl.includes('drive.google.com') ||
      info.logoUrl.includes('googleusercontent.com') ||
      info.logoUrl.includes('1zaz9sF4cf0M2OXB4pOa639AqTAuwS-52') ||
      info.logoUrl.includes('1si2CEFUfIJ8qdhiy27PYXqIgJ7IZSW8Y')
    ) {
      info.logoUrl = DEFAULT_COMPANY_INFO.logoUrl;
      changed = true;
    }

    if (changed) {
      localStorage.setItem(COMPANY_KEY, JSON.stringify(info));
    }
    return info;
  } catch {
    return DEFAULT_COMPANY_INFO;
  }
}

export function saveCompanyInfo(info: CompanyInfo): void {
  localStorage.setItem(COMPANY_KEY, JSON.stringify(info));
}

export function getProducts(): Product[] {
  try {
    const raw = localStorage.getItem(PRODUCTS_KEY);
    if (!raw) {
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }
    const list: Product[] = JSON.parse(raw);
    let changed = false;
    // Upgrade existing storage items if missing image or using previous SVG illustration
    const enriched = list.map((p) => {
      const init = INITIAL_PRODUCTS.find((i) => i.id === p.id || i.code === p.code);
      if (init && (!p.image || p.image.startsWith('data:image/svg+xml') || p.image.includes('placeholder'))) {
        changed = true;
        return { ...p, image: init.image };
      }
      return p;
    });
    if (changed) {
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(enriched));
    }
    return enriched;
  } catch {
    return INITIAL_PRODUCTS;
  }
}

export function saveProducts(products: Product[]): void {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
}

export function getRunningConfig(): RunningConfig {
  try {
    const raw = localStorage.getItem(RUNNING_CONFIG_KEY);
    return raw ? { ...DEFAULT_RUNNING_CONFIG, ...JSON.parse(raw) } : DEFAULT_RUNNING_CONFIG;
  } catch {
    return DEFAULT_RUNNING_CONFIG;
  }
}

export function saveRunningConfig(config: RunningConfig): void {
  localStorage.setItem(RUNNING_CONFIG_KEY, JSON.stringify(config));
}

export function getReceipts(): Receipt[] {
  try {
    const raw = localStorage.getItem(RECEIPTS_KEY);
    if (!raw) {
      const seeded = generateSeedReceipts();
      localStorage.setItem(RECEIPTS_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveReceipts(receipts: Receipt[]): void {
  localStorage.setItem(RECEIPTS_KEY, JSON.stringify(receipts));
}

/**
 * Calculates next non-duplicate running receipt number
 * e.g. MS-2026-0001
 */
export function getNextReceiptNumber(): string {
  const receipts = getReceipts();
  const config = getRunningConfig();
  const currentYear = new Date().getFullYear();

  // Find max sequence number for current prefix and year
  const prefixPattern = `${config.prefix}-${currentYear}-`;
  let maxSeq = config.lastNumber || 0;

  receipts.forEach((r) => {
    if (r.receiptNo && r.receiptNo.startsWith(prefixPattern)) {
      const part = r.receiptNo.replace(prefixPattern, '');
      const parsed = parseInt(part, 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }
  });

  const nextSeq = maxSeq + 1;
  const padded = String(nextSeq).padStart(config.digits, '0');
  return `${prefixPattern}${padded}`;
}

/**
 * Save new receipt with duplicate verification
 */
export function createReceipt(newReceipt: Omit<Receipt, 'id' | 'createdAt'>): Receipt {
  const receipts = getReceipts();
  let receiptNo = newReceipt.receiptNo;

  // Verify non-duplicate
  const isDuplicate = receipts.some((r) => r.receiptNo.toLowerCase() === receiptNo.toLowerCase());
  if (isDuplicate) {
    receiptNo = getNextReceiptNumber();
  }

  const receipt: Receipt = {
    ...newReceipt,
    id: 'rcpt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    receiptNo,
    createdAt: new Date().toISOString(),
  };

  receipts.unshift(receipt);
  saveReceipts(receipts);

  // Update running number config
  const config = getRunningConfig();
  const match = receiptNo.match(/-(\d+)$/);
  if (match) {
    const seq = parseInt(match[1], 10);
    if (!isNaN(seq) && seq > config.lastNumber) {
      config.lastNumber = seq;
      saveRunningConfig(config);
    }
  }

  return receipt;
}

export function updateReceipt(id: string, updates: Partial<Receipt>): Receipt | null {
  const receipts = getReceipts();
  const idx = receipts.findIndex((r) => r.id === id);
  if (idx === -1) return null;

  receipts[idx] = { ...receipts[idx], ...updates };
  saveReceipts(receipts);
  return receipts[idx];
}

export function deleteReceipt(id: string): boolean {
  const receipts = getReceipts();
  const filtered = receipts.filter((r) => r.id !== id);
  if (filtered.length !== receipts.length) {
    saveReceipts(filtered);
    return true;
  }
  return false;
}

export function clearAllReceipts(resetCounter: boolean = false): void {
  localStorage.setItem(RECEIPTS_KEY, JSON.stringify([]));
  if (resetCounter) {
    const config = getRunningConfig();
    config.lastNumber = 0;
    saveRunningConfig(config);
  }
}

export function resetReceiptsToDefault(): Receipt[] {
  const seeded = generateSeedReceipts();
  localStorage.setItem(RECEIPTS_KEY, JSON.stringify(seeded));
  const config = getRunningConfig();
  config.lastNumber = 2;
  saveRunningConfig(config);
  return seeded;
}

/**
 * Merges receipts pulled from Google Sheet into local storage.
 * If a receipt already exists locally, updates drive links & sync status.
 * If a receipt is new (e.g. issued from another computer), inserts it.
 * Also synchronizes the running number counter with the highest number found.
 */
export function mergeRemoteReceipts(remoteReceipts: Receipt[]): {
  merged: Receipt[];
  addedCount: number;
  updatedCount: number;
} {
  const localReceipts = getReceipts();
  let addedCount = 0;
  let updatedCount = 0;

  const receiptMap = new Map<string, Receipt>();
  
  // 1. Populate map with existing local receipts
  localReceipts.forEach((r) => {
    receiptMap.set(r.receiptNo.trim().toLowerCase(), r);
  });

  // 2. Merge remote receipts
  remoteReceipts.forEach((remote) => {
    const key = remote.receiptNo.trim().toLowerCase();
    const existing = receiptMap.get(key);

    if (existing) {
      let changed = false;
      // If remote has Drive PDF link that local lacks
      if (remote.driveViewLink && existing.driveViewLink !== remote.driveViewLink) {
        existing.driveViewLink = remote.driveViewLink;
        existing.driveFileId = remote.driveFileId || existing.driveFileId;
        changed = true;
      }
      if (!existing.syncedToSheet) {
        existing.syncedToSheet = true;
        changed = true;
      }
      if (changed) {
        updatedCount++;
        receiptMap.set(key, existing);
      }
    } else {
      // New receipt from another device!
      receiptMap.set(key, remote);
      addedCount++;
    }
  });

  // 3. Convert back to array, sorted by date descending then receiptNo descending
  const merged = Array.from(receiptMap.values()).sort((a, b) => {
    const dateComp = b.date.localeCompare(a.date);
    if (dateComp !== 0) return dateComp;
    return b.receiptNo.localeCompare(a.receiptNo);
  });

  saveReceipts(merged);

  // 4. Synchronize running number config with highest found sequence number
  const config = getRunningConfig();
  const currentYear = new Date().getFullYear();
  const prefixPattern = `${config.prefix}-${currentYear}-`;
  let maxSeq = config.lastNumber || 0;

  merged.forEach((r) => {
    if (r.receiptNo && r.receiptNo.startsWith(prefixPattern)) {
      const part = r.receiptNo.replace(prefixPattern, '');
      const parsed = parseInt(part, 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }
  });

  if (maxSeq > (config.lastNumber || 0)) {
    config.lastNumber = maxSeq;
    saveRunningConfig(config);
  }

  return { merged, addedCount, updatedCount };
}

function generateSeedReceipts(): Receipt[] {
  const today = new Date().toISOString().split('T')[0];
  const sample1: Receipt = {
    id: 'seed-01',
    receiptNo: 'MS-2026-0001',
    date: today,
    time: '10:30',
    customer: {
      name: 'คุณสมชาย ใจดี (ร้านอาหารญี่ปุ่น ซากุระ)',
      company: 'บริษัท ซากุระ เทรดดิ้ง จำกัด',
      address: '99/12 ถนนรัชดาภิเษก แขวงดินแดง เขตดินแดง กทม. 10400',
      phone: '081-999-8877',
      email: 'somchai@sakura-japan.com',
      taxId: '0105559876543',
    },
    items: [
      {
        id: 'item-1',
        productId: 'prod-01',
        code: 'WB-01',
        description: 'Wasabi-O Plum Wine (750 ml)',
        quantity: 2,
        unitPrice: 990,
        amount: 1980,
      },
      {
        id: 'item-2',
        productId: 'prod-15',
        code: 'WB-15',
        description: 'Wasabi Paste (150 g)',
        quantity: 5,
        unitPrice: 79,
        amount: 395,
      },
    ],
    subtotal: 2375,
    discountType: 'fixed',
    discountValue: 0,
    discountAmount: 0,
    netSubtotal: 2375,
    vatRate: 7,
    vatAmount: 166.25,
    serviceCharge: 0,
    grandTotal: 2541.25,
    bahtText: thaiBahtText(2541.25),
    paymentStatus: 'PAID',
    paymentMethod: 'TRANSFER',
    bankAccount: '800-0-003433',
    bankName: 'ธนาคารกรุงศรีอยุธยา',
    staffName: 'เจ้าหน้าที่ฝ่ายขาย 01',
    remarks: 'จัดส่งพร้อมใบกำกับภาษี',
    syncedToSheet: false,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  };

  const sample2: Receipt = {
    id: 'seed-02',
    receiptNo: 'MS-2026-0002',
    date: today,
    time: '11:45',
    customer: {
      name: 'คุณวิภาวรรณ สดใส (Mini Mart)',
      address: '15/4 ซอยพหลโยธิน 8 แขวงสามเสนใน เขตพญาไท กทม.',
      phone: '089-123-4567',
      email: 'wipawan@gmail.com',
    },
    items: [
      {
        id: 'item-3',
        productId: 'prod-02',
        code: 'WB-02',
        description: 'Wasabi Cashews Nut Seaweed (190 g)',
        quantity: 3,
        unitPrice: 199,
        amount: 597,
      },
      {
        id: 'item-4',
        productId: 'prod-05',
        code: 'WB-05',
        description: 'Wasabi Mayonnaise (Buy 1 Free 1 170 g)',
        quantity: 2,
        unitPrice: 130,
        amount: 260,
      },
      {
        id: 'item-5',
        productId: 'prod-11',
        code: 'WB-11',
        description: 'Crab Sticks Formula A1 (500 g)',
        quantity: 4,
        unitPrice: 80,
        amount: 320,
      },
    ],
    subtotal: 1177,
    discountType: 'percent',
    discountValue: 5,
    discountAmount: 58.85,
    netSubtotal: 1118.15,
    vatRate: 7,
    vatAmount: 78.27,
    serviceCharge: 50,
    grandTotal: 1246.42,
    bahtText: thaiBahtText(1246.42),
    paymentStatus: 'PAID',
    paymentMethod: 'PROMPTPAY',
    bankAccount: '800-0-003433',
    bankName: 'ธนาคารกรุงศรีอยุธยา',
    staffName: 'เจ้าหน้าที่ฝ่ายขาย 02',
    remarks: 'ค่าส่งด่วน 50 บาท',
    syncedToSheet: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  };

  return [sample2, sample1];
}
