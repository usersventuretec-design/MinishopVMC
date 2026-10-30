export interface ProductColorOption {
  name: string; // e.g. 'Green' | 'Latte'
  label: string; // e.g. 'Green (เขียว)'
  image: string; // e.g. '/assets/products/WB-17-green.png'
}

export interface Product {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string;
  size: string;
  price: number;
  category: 'wasabi' | 'cashew' | 'sauce' | 'soap' | 'seafood' | 'dough' | 'apparel' | 'other';
  image?: string;
  active: boolean;
  hasOptions?: boolean;
  sizes?: string[];
  colors?: ProductColorOption[];
}

export interface ReceiptItem {
  id: string;
  productId?: string;
  code: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  image?: string;
  selectedSize?: string;
  selectedColor?: string;
}

export type PaymentMethod = 'TRANSFER' | 'CASH' | 'PROMPTPAY' | 'CREDIT_CARD';
export type PaymentStatus = 'PAID' | 'PENDING' | 'CANCELLED';

export interface CustomerInfo {
  name: string;
  company?: string;
  address: string;
  phone: string;
  email: string;
  fax?: string;
  taxId?: string;
}

export interface Receipt {
  id: string;
  receiptNo: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  customer: CustomerInfo;
  items: ReceiptItem[];
  subtotal: number;
  discountType: 'fixed' | 'percent';
  discountValue: number;
  discountAmount: number;
  netSubtotal: number;
  vatRate: number; // usually 7 or 0
  vatAmount: number;
  serviceCharge: number;
  grandTotal: number;
  bahtText: string;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  bankAccount: string;
  bankName: string;
  staffName: string;
  remarks?: string;
  driveFileId?: string;
  driveViewLink?: string;
  syncedToSheet: boolean;
  syncedAt?: string;
  createdAt: string;
}

export interface CompanyInfo {
  name: string;
  nameTh: string;
  address: string;
  postalCode: string;
  phone: string;
  fax: string;
  email: string;
  website: string;
  taxId: string;
  bankAccount: string;
  bankName: string;
  accountName: string;
  logoUrl?: string;
}
