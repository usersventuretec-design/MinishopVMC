import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Eye,
  FileCheck,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  Calculator,
  UserCheck,
  CreditCard,
  Image as ImageIcon,
  Camera,
  Upload,
  ZoomIn,
  X,
  Check,
  Layers,
  ChevronDown,
  ChevronUp,
  Search,
  Users,
  Bot,
  Zap,
  MessageSquare,
} from 'lucide-react';
import { CompanyInfo, CustomerInfo, PaymentMethod, PaymentStatus, Product, Receipt, ReceiptItem } from '../types';
import { formatCurrency, thaiBahtText } from '../utils/thaiBaht';
import { getNextReceiptNumber } from '../services/storage';
import { getProductDisplayImage, compressImageFile } from '../data/productImages';
import { parseOrderWithAI } from '../services/aiService';

interface ReceiptFormProps {
  products: Product[];
  companyInfo: CompanyInfo;
  onSaveReceipt: (receipt: Omit<Receipt, 'id' | 'createdAt'>, printAfter: boolean) => void;
  onPreview: (receipt: Receipt) => void;
  initialReceipt?: Receipt | null;
  googleAccessToken?: string | null;
  receipts?: Receipt[];
}

export const ReceiptForm: React.FC<ReceiptFormProps> = ({
  products,
  companyInfo,
  onSaveReceipt,
  onPreview,
  initialReceipt,
  googleAccessToken,
  receipts = [],
}) => {
  const [receiptNo, setReceiptNo] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  
  // Customer info
  const [customer, setCustomer] = useState<CustomerInfo>({
    name: '',
    company: '',
    address: '',
    phone: '',
    email: '',
    fax: '',
    taxId: '',
  });

  // Items
  const [items, setItems] = useState<ReceiptItem[]>([]);

  // Calculations
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('percent');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [vatRate, setVatRate] = useState<number>(7);
  const [serviceCharge, setServiceCharge] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('PAID');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TRANSFER');
  const [staffName, setStaffName] = useState<string>('ฝ่ายขาย Mini Shop');
  const [remarks, setRemarks] = useState<string>('');
  
  // Quick product shelf (POS Style)
  const [showQuickShelf, setShowQuickShelf] = useState<boolean>(true);
  const [shelfCategory, setShelfCategory] = useState<string>('all');
  const [shelfSearch, setShelfSearch] = useState<string>('');

  // Image lightbox & attach modal states
  const [previewImageModal, setPreviewImageModal] = useState<{
    url: string;
    title: string;
    code?: string;
    size?: string;
    price?: number;
  } | null>(null);

  const [attachImageModal, setAttachImageModal] = useState<{
    itemIndex: number;
    title: string;
    currentImage?: string;
  } | null>(null);
  const [tempAttachUrl, setTempAttachUrl] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);

  // Quick product drawer / selector modal
  const [showCatalog, setShowCatalog] = useState<boolean>(false);
  const [productSearch, setProductSearch] = useState<string>('');

  // Customer Autocomplete & History
  const [showCustomerDropdown, setShowCustomerDropdown] = useState<boolean>(false);
  const [showCustomerHistoryModal, setShowCustomerHistoryModal] = useState<boolean>(false);
  const [customerSearchKeyword, setCustomerSearchKeyword] = useState<string>('');

  // AI Order Parsing Modal
  const [showAiOrderModal, setShowAiOrderModal] = useState<boolean>(false);
  const [aiChatInput, setAiChatInput] = useState<string>('');
  const [isParsingAi, setIsParsingAi] = useState<boolean>(false);
  const [aiParseNotice, setAiParseNotice] = useState<string | null>(null);

  // Extract unique past customers from receipts
  const pastCustomers = useMemo(() => {
    if (!receipts || receipts.length === 0) return [];
    const map = new Map<string, CustomerInfo & { lastDate?: string; orderCount: number }>();
    receipts.forEach((r) => {
      if (!r.customer || !r.customer.name || r.customer.name === 'ลูกค้าทั่วไป') return;
      const key = (r.customer.phone || r.customer.name).trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, { ...r.customer, lastDate: r.date, orderCount: 1 });
      } else {
        const existing = map.get(key)!;
        existing.orderCount += 1;
        if (!existing.address && r.customer.address) existing.address = r.customer.address;
        if (!existing.phone && r.customer.phone) existing.phone = r.customer.phone;
        if (!existing.company && r.customer.company) existing.company = r.customer.company;
        if (!existing.taxId && r.customer.taxId) existing.taxId = r.customer.taxId;
        if (!existing.email && r.customer.email) existing.email = r.customer.email;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.orderCount - a.orderCount);
  }, [receipts]);

  // Filtered customer suggestions when typing
  const customerSuggestions = useMemo(() => {
    const q = customer.name.trim().toLowerCase();
    if (!q || q.length < 1) return [];
    return pastCustomers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(q)) ||
          (c.company && c.company.toLowerCase().includes(q))
      )
      .slice(0, 5);
  }, [pastCustomers, customer.name]);

  const handleSelectCustomer = (c: CustomerInfo) => {
    setCustomer({
      name: c.name || '',
      company: c.company || '',
      address: c.address || '',
      phone: c.phone || '',
      email: c.email || '',
      fax: c.fax || '',
      taxId: c.taxId || '',
    });
    setShowCustomerDropdown(false);
    setShowCustomerHistoryModal(false);
  };

  const handleParseOrderWithAi = async () => {
    if (!aiChatInput.trim()) return;
    setIsParsingAi(true);
    setAiParseNotice(null);
    try {
      const parsed = await parseOrderWithAI(aiChatInput, products);
      if (parsed) {
        setCustomer((prev) => ({
          ...prev,
          name: parsed.customerName || prev.name,
          company: parsed.company || prev.company,
          phone: parsed.phone || prev.phone,
          address: parsed.address || prev.address,
          taxId: parsed.taxId || prev.taxId,
          email: parsed.email || prev.email,
        }));

        if (parsed.paymentMethod) {
          setPaymentMethod(parsed.paymentMethod);
        }

        if (parsed.matchedItems && parsed.matchedItems.length > 0) {
          const newItems: ReceiptItem[] = parsed.matchedItems.map((item, idx) => {
            const cat = products.find((p) => p.id === item.productId || p.nameEn === item.description || p.nameTh === item.description);
            return {
              id: `item_ai_${Date.now()}_${idx}`,
              productId: cat?.id || item.productId,
              code: cat?.code || 'WASABI-00',
              description: cat ? `${cat.nameEn} (${cat.size})` : item.description,
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || cat?.price || 0,
              amount: (item.quantity || 1) * (item.unitPrice || cat?.price || 0),
              image: cat?.image || (cat ? getProductDisplayImage(cat) : undefined),
            };
          });
          setItems(newItems);
        }

        if (parsed.remarks) {
          setRemarks(parsed.remarks);
        }

        setShowAiOrderModal(false);
        setAiChatInput('');
      }
    } catch (err: any) {
      console.error('AI parse failed:', err);
      setAiParseNotice('ไม่สามารถถอดข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsParsingAi(false);
    }
  };

  // Reset or initialize
  const resetForm = () => {
    const nextNo = getNextReceiptNumber();
    const now = new Date();
    setReceiptNo(nextNo);
    setDate(now.toISOString().split('T')[0]);
    setTime(
      now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })
    );
    setCustomer({
      name: '',
      company: '',
      address: '',
      phone: '',
      email: '',
      fax: '',
      taxId: '',
    });
    // Default 1 blank or popular item with image
    const firstProd = products[0];
    if (firstProd) {
      setItems([
        {
          id: 'item_' + Date.now(),
          productId: firstProd.id,
          code: firstProd.code,
          description: `${firstProd.nameEn} (${firstProd.size})`,
          quantity: 1,
          unitPrice: firstProd.price,
          amount: firstProd.price,
          image: firstProd.image || getProductDisplayImage(firstProd),
        },
      ]);
    } else {
      setItems([]);
    }
    setDiscountType('percent');
    setDiscountValue(0);
    setVatRate(7);
    setServiceCharge(0);
    setPaymentStatus('PAID');
    setPaymentMethod('TRANSFER');
    setRemarks('');
  };

  useEffect(() => {
    if (initialReceipt) {
      setReceiptNo(initialReceipt.receiptNo);
      setDate(initialReceipt.date);
      setTime(initialReceipt.time || '');
      setCustomer(initialReceipt.customer);
      setItems(
        initialReceipt.items.map((it) => {
          if (!it.image && it.productId) {
            const p = products.find((prod) => prod.id === it.productId);
            if (p) return { ...it, image: p.image || getProductDisplayImage(p) };
          }
          return it;
        })
      );
      setDiscountType(initialReceipt.discountType);
      setDiscountValue(initialReceipt.discountValue);
      setVatRate(initialReceipt.vatRate);
      setServiceCharge(initialReceipt.serviceCharge);
      setPaymentStatus(initialReceipt.paymentStatus);
      setPaymentMethod(initialReceipt.paymentMethod);
      setStaffName(initialReceipt.staffName);
      setRemarks(initialReceipt.remarks || '');
    } else {
      resetForm();
    }
  }, [initialReceipt]);

  // Handle item change
  const handleItemProductSelect = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        productId: prod.id,
        code: prod.code,
        description: `${prod.nameEn} (${prod.size})`,
        unitPrice: prod.price,
        amount: copy[index].quantity * prod.price,
        image: prod.image || getProductDisplayImage(prod),
      };
      return copy;
    });
  };

  const handleItemQtyChange = (index: number, qty: number) => {
    const safeQty = Math.max(1, qty || 1);
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        quantity: safeQty,
        amount: safeQty * copy[index].unitPrice,
      };
      return copy;
    });
  };

  const handleItemPriceChange = (index: number, price: number) => {
    const safePrice = Math.max(0, price || 0);
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        unitPrice: safePrice,
        amount: copy[index].quantity * safePrice,
      };
      return copy;
    });
  };

  const handleItemDescChange = (index: number, desc: string) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], description: desc };
      return copy;
    });
  };

  const handleAddItem = (prod?: Product) => {
    const p = prod || products[0];
    const newItem: ReceiptItem = {
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      productId: p ? p.id : undefined,
      code: p ? p.code : 'CUSTOM',
      description: p ? `${p.nameEn} (${p.size})` : 'รายการสินค้าใหม่',
      quantity: 1,
      unitPrice: p ? p.price : 0,
      amount: p ? p.price : 0,
      image: p ? (p.image || getProductDisplayImage(p)) : undefined,
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Quick add / increment from shelf
  const handleQuickAddProduct = (prod: Product) => {
    setItems((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.productId === prod.id || (item.code && item.code === prod.code)
      );
      if (existingIdx >= 0) {
        const copy = [...prev];
        const newQty = copy[existingIdx].quantity + 1;
        copy[existingIdx] = {
          ...copy[existingIdx],
          quantity: newQty,
          amount: newQty * copy[existingIdx].unitPrice,
          image: copy[existingIdx].image || prod.image || getProductDisplayImage(prod),
        };
        return copy;
      } else {
        return [
          ...prev,
          {
            id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
            productId: prod.id,
            code: prod.code,
            description: `${prod.nameEn} (${prod.size})`,
            quantity: 1,
            unitPrice: prod.price,
            amount: prod.price,
            image: prod.image || getProductDisplayImage(prod),
          },
        ];
      }
    });
  };

  // Quick decrement from shelf - allows removing completely when 1 -> 0
  const handleQuickDecProduct = (prod: Product) => {
    setItems((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.productId === prod.id || (item.code && item.code === prod.code)
      );
      if (existingIdx < 0) return prev;
      const copy = [...prev];
      if (copy[existingIdx].quantity > 1) {
        const newQty = copy[existingIdx].quantity - 1;
        copy[existingIdx] = {
          ...copy[existingIdx],
          quantity: newQty,
          amount: newQty * copy[existingIdx].unitPrice,
        };
        return copy;
      } else {
        // Can be removed even if it's the last remaining item
        return copy.filter((_, i) => i !== existingIdx);
      }
    });
  };

  const getProductQtyInReceipt = (prodId?: string, prodCode?: string): number => {
    return items
      .filter((i) => (prodId && i.productId === prodId) || (prodCode && i.code === prodCode))
      .reduce((sum, curr) => sum + (curr.quantity || 0), 0);
  };

  const handleAttachImageToItem = (itemIndex: number, newImageUrl: string) => {
    setItems((prev) => {
      const copy = [...prev];
      if (copy[itemIndex]) {
        copy[itemIndex] = { ...copy[itemIndex], image: newImageUrl };
      }
      return copy;
    });
    setAttachImageModal(null);
    setTempAttachUrl('');
  };

  const handleFileUploadForAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingImage(true);
      const dataUrl = await compressImageFile(file, 400, 400);
      setTempAttachUrl(dataUrl);

      // If Google token available, upload to Drive in background
      if (googleAccessToken) {
        try {
          const { uploadProductImageToDrive } = await import('../services/googleDrive');
          const res = await uploadProductImageToDrive(dataUrl, `item_${Date.now()}`, googleAccessToken);
          if (res.directLink) {
            setTempAttachUrl(res.directLink);
          }
        } catch (dErr) {
          console.warn('Drive attach backup notice:', dErr);
        }
      }
    } catch (err) {
      console.error('Image upload error:', err);
      alert('ไม่สามารถอัปโหลดรูปภาพได้');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Remove item - allows removing any item even when only 1 is left
  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = items.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const discountAmount =
    discountType === 'percent'
      ? Math.round((subtotal * (discountValue || 0)) / 100 * 100) / 100
      : Math.min(subtotal, discountValue || 0);

  const netSubtotal = Math.max(0, subtotal - discountAmount);
  const vatAmount =
    vatRate > 0 ? Math.round(((netSubtotal * vatRate) / 100) * 100) / 100 : 0;
  const grandTotal = Math.round((netSubtotal + vatAmount + (serviceCharge || 0)) * 100) / 100;
  const bahtText = thaiBahtText(grandTotal);

  const assembleCurrentReceipt = (): Omit<Receipt, 'id' | 'createdAt'> => {
    return {
      receiptNo,
      date,
      time,
      customer,
      items,
      subtotal,
      discountType,
      discountValue,
      discountAmount,
      netSubtotal,
      vatRate,
      vatAmount,
      serviceCharge: serviceCharge || 0,
      grandTotal,
      bahtText,
      paymentStatus,
      paymentMethod,
      bankAccount: companyInfo.bankAccount,
      bankName: companyInfo.bankName,
      staffName,
      remarks,
      syncedToSheet: false,
    };
  };

  const handleSubmit = (printAfter: boolean = false) => {
    if (!customer.name.trim()) {
      alert('กรุณากรอกชื่อลูกค้าหรือผู้สั่งซื้อ');
      return;
    }
    if (items.length === 0) {
      alert('กรุณาเลือกรายการสินค้าอย่างน้อย 1 รายการ');
      return;
    }

    const payload = assembleCurrentReceipt();
    onSaveReceipt(payload, printAfter);
  };

  const handleOpenPreview = () => {
    const tempReceipt: Receipt = {
      ...assembleCurrentReceipt(),
      id: 'preview_temp',
      createdAt: new Date().toISOString(),
    };
    onPreview(tempReceipt);
  };

  // Filtered products for drawer
  const filteredProducts = products.filter(
    (p) =>
      p.nameTh.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.nameEn.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.code.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-5 sm:space-y-6 pb-24 md:pb-6">
      {/* Top Banner with Running Number Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-teal-50 text-teal-700 rounded-lg shrink-0">
              <Calculator className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                ออกใบเสร็จรับเงิน (New Receipt)
              </h2>
              <p className="text-xs text-slate-500 hidden sm:block">
                ระบบคำนวณอัตโนมัติ รันเลขที่เอกสารต่อเนื่อง และเชื่อมต่อฐานข้อมูล
              </p>
            </div>
          </div>
        </div>

        {/* Running Number Pill & Date */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-lg flex items-center gap-2 flex-1 sm:flex-none">
            <span className="text-xs font-semibold text-teal-800 shrink-0">เลขที่:</span>
            <input
              type="text"
              value={receiptNo}
              onChange={(e) => setReceiptNo(e.target.value)}
              className="font-mono font-bold text-teal-900 bg-transparent border-b border-teal-300 focus:outline-none focus:border-teal-600 text-xs sm:text-sm w-full sm:w-32"
            />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2 sm:px-2.5 py-1.5 sm:py-2 font-mono text-slate-700 focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={resetForm}
              title="รีเซ็ตฟอร์ม / รับเลขที่ใหม่"
              className="p-1.5 sm:p-2 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600 transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Customer Information Section */}
      <div className="bg-slate-50/70 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 space-y-3 relative">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-teal-600" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-800">
              ข้อมูลลูกค้า / ผู้สั่งซื้อ
            </h3>
          </div>

          {/* Quick Action Buttons: AI Chat Parser & Past Customer History */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAiOrderModal(true)}
              className="text-xs bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition"
              title="วางข้อความแชตจาก LINE/FB ให้ AI แยกชื่อ ที่อยู่ และสินค้าอัตโนมัติ"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>AI แยกข้อมูลจากแชต</span>
            </button>

            {pastCustomers.length > 0 && (
              <button
                type="button"
                onClick={() => setShowCustomerHistoryModal(true)}
                className="text-xs bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition shadow-2xs"
                title="เลือกลูกค้าเดิมจากประวัติการขาย"
              >
                <Users className="w-3.5 h-3.5 text-teal-600" />
                <span>ลูกค้าเก่า ({pastCustomers.length})</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {/* Customer Name with Autocomplete Dropdown */}
          <div className="relative">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              ชื่อลูกค้า / ผู้สั่งซื้อ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="พิมพ์ชื่อหรือเลือกจากประวัติ..."
              value={customer.name}
              onChange={(e) => {
                setCustomer({ ...customer, name: e.target.value });
                setShowCustomerDropdown(true);
              }}
              onFocus={() => setShowCustomerDropdown(true)}
              className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
              required
            />

            {/* Autocomplete Dropdown Suggestions */}
            {showCustomerDropdown && customerSuggestions.length > 0 && (
              <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in-50">
                <div className="p-1.5 bg-slate-50 text-[10px] text-slate-500 font-semibold flex items-center justify-between">
                  <span>ลูกค้าเก่าที่ตรงกัน (คลิกเพื่อกรอกอัตโนมัติ)</span>
                  <button
                    type="button"
                    onClick={() => setShowCustomerDropdown(false)}
                    className="text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                {customerSuggestions.map((c, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectCustomer(c)}
                    className="w-full text-left p-2.5 hover:bg-teal-50/70 transition flex items-start justify-between gap-2"
                  >
                    <div>
                      <div className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                        <span>{c.name}</span>
                        {c.company && (
                          <span className="text-[10px] text-slate-500 font-normal">
                            ({c.company})
                          </span>
                        )}
                      </div>
                      {c.address && (
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {c.address}
                        </p>
                      )}
                      {c.phone && (
                        <p className="text-[10px] font-mono text-teal-700 mt-0.5">
                          📞 {c.phone}
                        </p>
                      )}
                    </div>
                    {c.orderCount && (
                      <span className="text-[9px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded-full font-bold shrink-0">
                        {c.orderCount} บิล
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              บริษัท / ร้านค้า (ถ้ามี)
            </label>
            <input
              type="text"
              placeholder="เช่น บริษัท ซากุระ เทรดดิ้ง จำกัด"
              value={customer.company || ''}
              onChange={(e) => setCustomer({ ...customer, company: e.target.value })}
              className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              เบอร์โทรศัพท์
            </label>
            <input
              type="text"
              placeholder="08X-XXX-XXXX"
              value={customer.phone}
              onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
              className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2 md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              ที่อยู่จัดส่ง / ที่อยู่ออกใบเสร็จ
            </label>
            <input
              type="text"
              placeholder="เลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
              value={customer.address}
              onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
              className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              เลขประจำตัวผู้เสียภาษี (ถ้ามี)
            </label>
            <input
              type="text"
              placeholder="13 หลัก เช่น 0105559876543"
              value={customer.taxId || ''}
              onChange={(e) => setCustomer({ ...customer, taxId: e.target.value })}
              className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Product Items Section */}
      <div className="space-y-4">
        {/* Quick Product Shelf Header & Controls */}
        <div className="bg-gradient-to-r from-teal-50 to-emerald-50/50 p-3.5 sm:p-4 rounded-xl border border-teal-200/90 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-teal-600 text-white rounded-lg shadow-2xs">
                <ShoppingBag className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-teal-950 flex items-center gap-1.5">
                  แผงเลือกสินค้าด่วน (Quick POS Shelf)
                  <span className="text-[10px] font-mono bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded-full font-bold">
                    {products.length} รายการ
                  </span>
                </h3>
                <p className="text-[11px] text-teal-700 hidden sm:block">
                  แตะที่รูปหรือปุ่มเพื่อเพิ่มสินค้าลงใบเสร็จได้ทันที พร้อมรูปภาพและปรับจำนวนได้สะดวกรวดเร็ว
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowQuickShelf(!showQuickShelf)}
                className="text-xs bg-white hover:bg-slate-50 text-teal-800 border border-teal-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition shadow-2xs"
              >
                {showQuickShelf ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5 text-teal-600" />
                    <span>ซ่อนแผงสินค้าด่วน</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5 text-teal-600" />
                    <span>แสดงแผงสินค้าด่วน ({products.length})</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleAddItem()}
                className="text-xs bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มแถวเปล่า</span>
              </button>
            </div>
          </div>

          {/* Collapsible Shelf Content */}
          {showQuickShelf && (
            <div className="space-y-3 pt-1">
              {/* Category Pills & Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                {/* Categories */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'all', label: '🌟 ทั้งหมด', count: products.length },
                    { id: 'wasabi', label: '🌿 วาซาบิ', count: products.filter(p => p.category === 'wasabi').length },
                    { id: 'cashew', label: '🥜 เม็ดมะม่วง', count: products.filter(p => p.category === 'cashew').length },
                    { id: 'sauce', label: '🥫 ซอส & มายองเนส', count: products.filter(p => p.category === 'sauce').length },
                    { id: 'seafood', label: '🦀 ซีฟู้ด & ปูอัด', count: products.filter(p => p.category === 'seafood').length },
                    { id: 'dough', label: '🥐 แป้งโดว์', count: products.filter(p => p.category === 'dough').length },
                    { id: 'soap', label: '🧼 สบู่', count: products.filter(p => p.category === 'soap').length },
                  ].map((cat) => {
                    const isActive = shelfCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setShelfCategory(cat.id)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
                          isActive
                            ? 'bg-[#007A87] text-white shadow-2xs font-semibold'
                            : 'bg-white hover:bg-teal-50 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <span>{cat.label}</span>
                        <span className={`text-[10px] px-1 py-0.2 rounded-full ${isActive ? 'bg-teal-900/40 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          {cat.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Search in shelf */}
                <div className="relative w-full sm:w-56 shrink-0">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อหรือรหัส..."
                    value={shelfSearch}
                    onChange={(e) => setShelfSearch(e.target.value)}
                    className="w-full text-xs pl-8 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  {shelfSearch && (
                    <button
                      type="button"
                      onClick={() => setShelfSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Product Cards Shelf Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3 max-h-[380px] overflow-y-auto p-1">
                {products
                  .filter((p) => {
                    if (!p.active) return false;
                    const matchCat = shelfCategory === 'all' || p.category === shelfCategory;
                    const q = shelfSearch.trim().toLowerCase();
                    const matchSearch =
                      !q ||
                      p.code.toLowerCase().includes(q) ||
                      p.nameEn.toLowerCase().includes(q) ||
                      p.nameTh.toLowerCase().includes(q);
                    return matchCat && matchSearch;
                  })
                  .map((p) => {
                    const qtyInReceipt = getProductQtyInReceipt(p.id, p.code);
                    const isInReceipt = qtyInReceipt > 0;
                    const imgSrc = p.image || getProductDisplayImage(p);

                    return (
                      <div
                        key={p.id}
                        className={`rounded-xl border transition flex flex-col justify-between overflow-hidden bg-white text-left shadow-2xs group ${
                          isInReceipt
                            ? 'border-teal-500 ring-2 ring-teal-400/40 bg-teal-50/20'
                            : 'border-slate-200 hover:border-teal-400 hover:shadow-md'
                        }`}
                      >
                        {/* Image Container with Zoom Preview - Clicking image adds product directly */}
                        <div
                          onClick={() => handleQuickAddProduct(p)}
                          className="relative aspect-4/3 sm:aspect-square bg-slate-50 border-b border-slate-100 overflow-hidden flex items-center justify-center cursor-pointer group/img hover:bg-teal-50/50 active:scale-[0.98] transition select-none"
                          title="แตะที่รูปภาพเพื่อเพิ่มสินค้านี้ลงในบิล (+1)"
                        >
                          <img
                            src={imgSrc}
                            alt={p.nameEn}
                            className="w-full h-full object-contain p-2 group-hover/img:scale-108 transition duration-200 pointer-events-none"
                            loading="lazy"
                          />
                          {/* Code Tag */}
                          <span className="absolute top-1.5 left-1.5 text-[9px] font-mono font-bold bg-teal-800 text-white px-1.5 py-0.5 rounded shadow-xs pointer-events-none">
                            {p.code}
                          </span>

                          {/* Quick Click Hint Tag */}
                          <span className="absolute bottom-1.5 left-1.5 text-[8.5px] bg-teal-700/90 text-white px-1.5 py-0.5 rounded font-medium opacity-0 group-hover/img:opacity-100 transition shadow-xs pointer-events-none flex items-center gap-0.5">
                            <Plus className="w-2.5 h-2.5" /> แตะรูปเพื่อเพิ่ม
                          </span>

                          {/* Zoom Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewImageModal({
                                url: imgSrc,
                                title: `${p.nameEn} (${p.nameTh})`,
                                code: p.code,
                                size: p.size,
                                price: p.price,
                              });
                            }}
                            title="ดูรูปภาพขนาดใหญ่"
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-black/45 hover:bg-black/75 text-white flex items-center justify-center opacity-80 sm:opacity-0 group-hover/img:opacity-100 transition shadow-xs z-10"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                          </button>
                          {/* Size tag */}
                          <span className="absolute bottom-1 right-1.5 text-[9px] bg-slate-800/80 text-white px-1.5 py-0.5 rounded font-medium pointer-events-none">
                            {p.size}
                          </span>
                        </div>

                        {/* Product Info */}
                        <div className="p-2.5 flex-1 flex flex-col justify-between space-y-1.5">
                          <div
                            onClick={() => handleQuickAddProduct(p)}
                            className="cursor-pointer"
                            title="แตะเพื่อเพิ่มสินค้าลงในบิล"
                          >
                            <h4 className="font-bold text-xs text-slate-800 line-clamp-1 group-hover:text-teal-700 transition" title={p.nameEn}>
                              {p.nameEn}
                            </h4>
                            <p className="text-[10px] text-slate-500 truncate" title={p.nameTh}>
                              {p.nameTh}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="font-mono font-bold text-xs sm:text-sm text-teal-900">
                              ฿{p.price}
                            </span>

                            {/* In-Bill Stepper or + Add Button */}
                            {isInReceipt ? (
                              <div className="flex items-center gap-1 bg-teal-100 rounded-lg p-0.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickDecProduct(p);
                                  }}
                                  title="ลดจำนวน"
                                  className="w-5 h-5 flex items-center justify-center bg-white text-teal-900 hover:bg-teal-200 rounded font-bold text-xs shadow-2xs active:scale-95"
                                >
                                  -
                                </button>
                                <span className="font-mono font-bold text-[11px] text-teal-900 px-1">
                                  {qtyInReceipt}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickAddProduct(p);
                                  }}
                                  title="เพิ่มจำนวน"
                                  className="w-5 h-5 flex items-center justify-center bg-teal-600 text-white hover:bg-teal-700 rounded font-bold text-xs shadow-2xs active:scale-95"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleQuickAddProduct(p)}
                                className="text-[11px] bg-teal-600 hover:bg-teal-700 text-white font-medium px-2 py-1 rounded-lg flex items-center gap-1 shadow-2xs transition active:scale-95"
                              >
                                <Plus className="w-3 h-3" />
                                <span>เพิ่ม</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Current Items in Receipt Table Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs sm:text-sm text-slate-800">
              รายการสินค้าในใบเสร็จ ({items.length} รายการ)
            </span>
            <span className="text-xs text-slate-400">
              (สามารถแก้ไขชื่อ จำนวน หรือราคาได้โดยตรง)
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleAddItem()}
            className="text-xs text-teal-700 hover:text-teal-900 hover:bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg flex items-center gap-1 font-medium transition"
          >
            <Plus className="w-3.5 h-3.5" />
            เพิ่มแถวสินค้า
          </button>
        </div>

        {/* Desktop Table (Visible on md and up: PC view with product image) */}
        <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#007A87] text-white uppercase text-[11px] font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-2 w-10 text-center">#</th>
                <th className="py-3 px-3 w-16 text-center">รูปสินค้า</th>
                <th className="py-3 px-4 min-w-[240px]">เลือกสินค้า / รายละเอียด</th>
                <th className="py-3 px-3 w-28 text-center">จำนวน</th>
                <th className="py-3 px-3 w-32 text-right">ราคา/หน่วย (฿)</th>
                <th className="py-3 px-4 w-36 text-right">รวมเงิน (฿)</th>
                <th className="py-3 px-3 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500 bg-slate-50/50">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 mb-1">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">ยังไม่มีรายการสินค้าในใบเสร็จนี้</p>
                      <p className="text-xs text-slate-500 max-w-sm">
                        แตะที่รูปภาพสินค้าในแผงเลือกสินค้าด่วนด้านบนเพื่อเพิ่มสินค้าได้ทันที หรือกดปุ่มเพิ่มแถวด้านล่าง
                      </p>
                      <button
                        type="button"
                        onClick={() => handleAddItem()}
                        className="mt-2 text-xs bg-teal-600 hover:bg-teal-700 text-white font-medium px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>เพิ่มรายการสินค้า</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const itemImg = item.image || getProductDisplayImage(item);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-2 text-center text-slate-500 font-medium">
                        {idx + 1}
                      </td>

                      {/* Product Image Thumbnail with Lightbox click & attach button */}
                      <td className="py-3 px-2 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div
                            onClick={() =>
                              setPreviewImageModal({
                                url: itemImg,
                                title: item.description,
                                code: item.code,
                                price: item.unitPrice,
                              })
                            }
                            title="คลิกเพื่อดูรูปภาพขนาดใหญ่"
                            className="w-10 h-10 rounded-lg border border-slate-200 bg-white overflow-hidden cursor-pointer hover:border-teal-500 hover:shadow-xs transition relative group shrink-0"
                          >
                            <img
                              src={itemImg}
                              alt={item.description}
                              className="w-full h-full object-contain p-0.5"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                              <ZoomIn className="w-3.5 h-3.5" />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setAttachImageModal({
                                itemIndex: idx,
                                title: item.description,
                                currentImage: item.image,
                              });
                              setTempAttachUrl(item.image || '');
                            }}
                            title="แนบหรือเปลี่ยนรูปภาพสินค้า"
                            className="text-[10px] text-teal-700 hover:text-teal-900 hover:underline flex items-center gap-0.5"
                          >
                            <Camera className="w-2.5 h-2.5" />
                            <span>แนบรูป</span>
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-1.5">
                          <select
                            value={item.productId || ''}
                            onChange={(e) => handleItemProductSelect(idx, e.target.value)}
                            className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-800 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                          >
                            <option value="" disabled>-- เลือกสินค้า WASABI-O --</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                [{p.code}] {p.nameEn} ({p.size}) - ฿{p.price}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleItemDescChange(idx, e.target.value)}
                            placeholder="คำอธิบายเพิ่มเติมหรือชื่อเฉพาะ"
                            className="w-full text-[11px] text-slate-600 border border-slate-200 rounded px-2 py-1 bg-white"
                          />
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleItemQtyChange(idx, item.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center rounded border border-slate-300 bg-white hover:bg-slate-100 font-bold text-slate-600"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemQtyChange(idx, parseInt(e.target.value, 10))}
                            className="w-12 text-center font-bold text-slate-900 border border-slate-300 rounded py-1 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleItemQtyChange(idx, item.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center rounded border border-slate-300 bg-white hover:bg-slate-100 font-bold text-slate-600"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => handleItemPriceChange(idx, parseFloat(e.target.value))}
                          className="w-24 text-right font-mono font-medium text-slate-800 border border-slate-300 rounded px-2 py-1 text-xs"
                        />
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                        ฿{formatCurrency(item.amount)}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          title="ลบรายการนี้"
                          className="p-1.5 rounded transition text-slate-400 hover:text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards (Visible ONLY on mobile devices < md) */}
        <div className="block md:hidden space-y-3">
          {items.length === 0 ? (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-6 text-center space-y-3">
              <ShoppingBag className="w-8 h-8 text-teal-600 mx-auto" />
              <div>
                <p className="text-xs font-bold text-slate-700">ยังไม่มีรายการสินค้าในบิล</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  แตะที่รูปภาพสินค้าในแผงด้านบนเพื่อเพิ่มลงบิล หรือกดปุ่มเพิ่มด้านล่าง
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleAddItem()}
                className="text-xs bg-teal-600 hover:bg-teal-700 text-white font-medium px-3.5 py-2 rounded-lg inline-flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ เพิ่มรายการแรก</span>
              </button>
            </div>
          ) : (
            items.map((item, idx) => {
              const itemImg = item.image || getProductDisplayImage(item);
              return (
                <div
                  key={item.id}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5 shadow-xs"
                >
                  {/* Top Row: Index + Image Thumbnail + Delete Button */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>

                      {/* Image Thumbnail with zoom & attach on mobile */}
                      <div className="flex items-center gap-2">
                        <div
                          onClick={() =>
                            setPreviewImageModal({
                              url: itemImg,
                              title: item.description,
                              code: item.code,
                              price: item.unitPrice,
                            })
                          }
                          className="w-11 h-11 rounded-lg border border-slate-300 bg-white overflow-hidden shrink-0 relative cursor-pointer"
                          title="แตะเพื่อดูรูปภาพ"
                        >
                          <img
                            src={itemImg}
                            alt={item.description}
                            className="w-full h-full object-contain p-0.5"
                          />
                          <div className="absolute bottom-0 right-0 bg-black/50 text-white p-0.5 rounded-tl">
                            <ZoomIn className="w-2.5 h-2.5" />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setAttachImageModal({
                              itemIndex: idx,
                              title: item.description,
                              currentImage: item.image,
                            });
                            setTempAttachUrl(item.image || '');
                          }}
                          className="text-[11px] text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 px-2 py-1 rounded-md flex items-center gap-1 font-medium transition"
                        >
                          <Camera className="w-3 h-3 text-teal-600" />
                          <span>แนบรูป</span>
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      title="ลบรายการนี้"
                      className="p-1 text-slate-400 hover:text-red-500 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">
                    เลือกสินค้า WASABI-O
                  </label>
                  <select
                    value={item.productId || ''}
                    onChange={(e) => handleItemProductSelect(idx, e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white font-medium text-slate-800"
                  >
                    <option value="" disabled>-- เลือกสินค้า --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.code}] {p.nameEn} ({p.size}) - ฿{p.price}
                      </option>
                    ))}
                  </select>
                </div>

                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => handleItemDescChange(idx, e.target.value)}
                  placeholder="คำอธิบายเพิ่มเติมหรือชื่อเฉพาะ"
                  className="w-full text-[11px] text-slate-600 border border-slate-200 rounded px-2.5 py-1.5 bg-white"
                />

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">
                      จำนวน
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleItemQtyChange(idx, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-300 bg-white font-bold text-slate-700 active:bg-slate-200"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemQtyChange(idx, parseInt(e.target.value, 10))}
                        className="w-12 h-8 text-center font-bold text-slate-900 border border-slate-300 rounded-lg text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleItemQtyChange(idx, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-300 bg-white font-bold text-slate-700 active:bg-slate-200"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">
                      ราคา/หน่วย (฿)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) => handleItemPriceChange(idx, parseFloat(e.target.value))}
                      className="w-full h-8 text-right font-mono font-medium text-slate-800 border border-slate-300 rounded-lg px-2 text-xs"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">รวมรายการนี้:</span>
                  <span className="font-mono font-bold text-teal-900 text-sm">
                    ฿{formatCurrency(item.amount)}
                  </span>
                </div>
              </div>
            );
          }))}
        </div>
      </div>

      {/* Calculations & Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 pt-2">
        {/* Left Side: Payment Details, Bank, Staff, Notes */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-teal-600" />
              การชำระเงินและข้อมูลธนาคาร
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  สถานะการชำระ
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white font-medium"
                >
                  <option value="PAID">ชำระแล้ว (Paid)</option>
                  <option value="PENDING">รอชำระ (Pending)</option>
                  <option value="CANCELLED">ยกเลิก (Cancelled)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  วิธีการชำระ
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white font-medium"
                >
                  <option value="TRANSFER">โอนเงินเข้าบัญชี (Krungsri)</option>
                  <option value="PROMPTPAY">สแกนพร้อมเพย์ (PromptPay)</option>
                  <option value="CASH">เงินสด (Cash)</option>
                  <option value="CREDIT_CARD">บัตรเครดิต</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  พนักงานขาย / ผู้บันทึก
                </label>
                <input
                  type="text"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  บัญชีรับเงินของบริษัท
                </label>
                <div className="text-xs font-medium text-teal-900 bg-white border border-slate-200 rounded-lg px-3 py-2 truncate">
                  {companyInfo.bankAccount} {companyInfo.bankName}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                หมายเหตุใบเสร็จ (ถ้ามี)
              </label>
              <input
                type="text"
                placeholder="เช่น ส่งด่วน Flash Express, แนบเอกสารรับสินค้า"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Right Side: Totals, Discounts, VAT */}
        <div className="lg:col-span-5">
          <div className="bg-white border border-teal-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100">
              <span className="text-slate-600 font-medium">ผลรวมย่อย (Subtotal):</span>
              <span className="font-mono font-bold text-slate-800 text-sm">
                ฿{formatCurrency(subtotal)}
              </span>
            </div>

            {/* Discount Row */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600 font-medium">ส่วนลด:</span>
                <div className="flex rounded border border-slate-200 bg-slate-50 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setDiscountType('percent')}
                    className={`px-1.5 py-0.5 rounded-l ${
                      discountType === 'percent'
                        ? 'bg-teal-600 text-white font-bold'
                        : 'text-slate-600'
                    }`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('fixed')}
                    className={`px-1.5 py-0.5 rounded-r ${
                      discountType === 'fixed'
                        ? 'bg-teal-600 text-white font-bold'
                        : 'text-slate-600'
                    }`}
                  >
                    ฿
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  className="w-16 sm:w-20 text-right font-mono border border-slate-300 rounded px-2 py-1 text-xs"
                />
                <span className="font-mono text-red-600 font-medium w-20 sm:w-24 text-right">
                  -{formatCurrency(discountAmount)}
                </span>
              </div>
            </div>

            {/* VAT Rate */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-600 font-medium">ภาษีมูลค่าเพิ่ม:</span>
                <select
                  value={vatRate}
                  onChange={(e) => setVatRate(parseFloat(e.target.value))}
                  className="text-[11px] border border-slate-200 rounded px-1.5 py-0.5 bg-slate-50"
                >
                  <option value={7}>VAT 7%</option>
                  <option value={0}>ไม่มี VAT (0%)</option>
                </select>
              </div>
              <span className="font-mono text-slate-800 font-medium">
                ฿{formatCurrency(vatAmount)}
              </span>
            </div>

            {/* Additional Charge */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">ค่าบริการ / ค่าจัดส่ง:</span>
              <input
                type="number"
                min="0"
                step="any"
                value={serviceCharge}
                onChange={(e) => setServiceCharge(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-20 sm:w-24 text-right font-mono border border-slate-300 rounded px-2 py-1 text-xs"
              />
            </div>

            {/* Grand Total Bar */}
            <div className="pt-2 border-t-2 border-teal-500">
              <div className="bg-[#B9E5A8]/50 p-3 rounded-lg border border-green-300 flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-teal-950 block">ยอดรวมสุทธิ (Grand Total)</span>
                  <span className="text-[11px] text-teal-800 font-normal hidden sm:block">
                    {bahtText}
                  </span>
                </div>
                <span className="text-lg sm:text-xl font-bold font-mono text-teal-950">
                  ฿{formatCurrency(grandTotal)}
                </span>
              </div>
              <p className="text-[10px] text-teal-800 mt-1 sm:hidden">
                ({bahtText})
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Action Buttons (Preserved for PC) */}
      <div className="hidden md:flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={handleOpenPreview}
          className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs flex items-center gap-2 transition"
        >
          <Eye className="w-4 h-4 text-slate-500" />
          ดูตัวอย่างใบเสร็จ (Preview)
        </button>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            className="px-5 py-2.5 rounded-xl border border-teal-600 text-teal-700 hover:bg-teal-50 font-medium text-xs flex items-center gap-2 transition"
          >
            <FileCheck className="w-4 h-4" />
            บันทึกและพิมพ์ใบเสร็จ (Save & Print)
          </button>
          
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            className="px-6 py-2.5 rounded-xl bg-[#007A87] hover:bg-[#00646e] text-white font-medium text-xs flex items-center gap-2 shadow-sm transition"
          >
            <FileCheck className="w-4 h-4" />
            บันทึกและออกใบเสร็จ (Save Receipt)
          </button>
        </div>
      </div>

      {/* Mobile Sticky Floating Bottom Bar (Only on mobile < md) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-xl flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] text-slate-500 block">ยอดรวมสุทธิ</span>
          <span className="text-base font-bold font-mono text-teal-950">
            ฿{formatCurrency(grandTotal)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenPreview}
            className="p-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
            title="ดูตัวอย่าง"
          >
            <Eye className="w-4 h-4 text-slate-600" />
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            className="px-4 py-2.5 rounded-xl bg-[#007A87] hover:bg-[#00646e] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition active:scale-98"
          >
            <FileCheck className="w-4 h-4" />
            ออกใบเสร็จ
          </button>
        </div>
      </div>

      {/* Quick Catalog Modal / Drawer */}
      {showCatalog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-3.5 sm:p-4 bg-teal-800 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm sm:text-base">รายการสินค้า WASABI-O</h3>
                <p className="text-[11px] sm:text-xs text-teal-200">
                  คลิกเพื่อเพิ่มสินค้าลงในใบเสร็จได้ทันที (16 รายการ)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCatalog(false)}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-teal-900/50 hover:bg-teal-900 flex items-center justify-center text-white"
              >
                ✕
              </button>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-slate-200 bg-slate-50">
              <input
                type="text"
                placeholder="ค้นหารหัส หรือชื่อสินค้า WASABI-O..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Grid */}
            <div className="p-3 sm:p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
              {filteredProducts.map((p) => {
                const prodImg = p.image || getProductDisplayImage(p);
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      handleAddItem(p);
                      setShowCatalog(false);
                    }}
                    className="p-3 rounded-xl border border-slate-200 hover:border-teal-500 hover:shadow-md cursor-pointer transition bg-white flex flex-col justify-between group"
                  >
                    <div className="flex gap-2.5 items-start">
                      <div className="w-12 h-12 rounded-lg border border-slate-200 bg-slate-50 shrink-0 overflow-hidden flex items-center justify-center">
                        <img
                          src={prodImg}
                          alt={p.nameEn}
                          className="w-full h-full object-contain p-0.5 group-hover:scale-105 transition"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                          <span className="text-[10px] font-mono font-bold bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded">
                            {p.code}
                          </span>
                          <span className="text-[10px] text-slate-500">{p.size}</span>
                        </div>
                        <h5 className="font-bold text-xs text-slate-800 group-hover:text-teal-700 transition truncate">
                          {p.nameEn}
                        </h5>
                        <p className="text-[10px] text-slate-500 truncate">{p.nameTh}</p>
                      </div>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-between items-center">
                      <span className="font-mono font-bold text-sm text-teal-900">
                        ฿{p.price}
                      </span>
                      <span className="text-[10px] bg-teal-600 text-white px-2 py-0.5 rounded group-hover:bg-teal-700 transition font-medium">
                        + เลือก
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Product Image Lightbox Modal */}
      {previewImageModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewImageModal(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-teal-400" />
                <span className="font-bold text-xs sm:text-sm truncate">
                  รูปภาพสินค้า: {previewImageModal.code ? `[${previewImageModal.code}]` : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImageModal(null)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Image View */}
            <div className="p-4 bg-slate-100 flex items-center justify-center min-h-[260px] max-h-[380px] overflow-hidden">
              <img
                src={previewImageModal.url}
                alt={previewImageModal.title}
                className="max-h-[340px] max-w-full object-contain drop-shadow-md rounded-lg"
              />
            </div>

            {/* Modal Footer with details */}
            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{previewImageModal.title}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  {previewImageModal.code && (
                    <span className="font-mono text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200 px-1.5 py-0.5 rounded">
                      {previewImageModal.code}
                    </span>
                  )}
                  {previewImageModal.size && (
                    <span className="text-xs text-slate-500">{previewImageModal.size}</span>
                  )}
                </div>
              </div>

              {previewImageModal.price !== undefined && (
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">ราคาขาย</span>
                  <span className="font-mono font-bold text-base text-teal-900">
                    ฿{previewImageModal.price}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Attach / Upload Custom Image Modal */}
      {attachImageModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setAttachImageModal(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 bg-[#007A87] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                <h3 className="font-bold text-sm">แนบรูปภาพสินค้า</h3>
              </div>
              <button
                type="button"
                onClick={() => setAttachImageModal(null)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              <p className="text-xs text-slate-600 font-medium">
                รายการ: <span className="font-bold text-slate-900">{attachImageModal.title}</span>
              </p>

              {/* Preview Current / Selected Image */}
              <div className="flex items-center justify-center p-3 bg-slate-50 border border-slate-200 rounded-xl min-h-[140px]">
                {tempAttachUrl ? (
                  <div className="relative group">
                    <img
                      src={tempAttachUrl}
                      alt="Preview"
                      className="max-h-[130px] rounded-lg object-contain shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setTempAttachUrl('')}
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center shadow transition"
                      title="ลบรูปภาพนี้"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center text-slate-400 py-3">
                    <ImageIcon className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                    <span className="text-xs">ยังไม่ได้เลือกรูปภาพใหม่</span>
                  </div>
                )}
              </div>

              {/* File upload from mobile camera or PC */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  1. ถ่ายรูปหรือเลือกรูปจากเครื่อง / มือถือ
                </label>
                <label className="flex items-center justify-center gap-2 w-full p-2.5 border-2 border-dashed border-teal-300 hover:border-teal-500 rounded-xl cursor-pointer bg-teal-50/40 hover:bg-teal-50 text-teal-800 text-xs font-medium transition">
                  <Upload className="w-4 h-4 text-teal-600" />
                  <span>{isUploadingImage ? 'กำลังโหลดรูปภาพ...' : 'แตะเพื่อเลือกรูปภาพ / ถ่ายภาพ'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUploadForAttach}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Or paste Image URL */}
              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700">
                  2. หรือระบุลิงก์รูปภาพ (Image URL)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={tempAttachUrl.startsWith('data:') ? '' : tempAttachUrl}
                  onChange={(e) => setTempAttachUrl(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  const defaultImg = getProductDisplayImage(items[attachImageModal.itemIndex]);
                  setTempAttachUrl(defaultImg);
                }}
                className="text-xs text-slate-600 hover:text-slate-800 underline"
              >
                ใช้รูปภาพเริ่มต้น
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAttachImageModal(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => handleAttachImageToItem(attachImageModal.itemIndex, tempAttachUrl)}
                  className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>บันทึกรูปภาพ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer History Selection Modal */}
      {showCustomerHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in-50 zoom-in-95">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    ประวัติลูกค้าประจำ (Customer Database)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    เลือกลูกค้าจากประวัติเพื่อกรอกข้อมูลลงบิลอัตโนมัติ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomerHistoryModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-slate-100 bg-slate-50">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ, เบอร์โทร หรือบริษัท..."
                  value={customerSearchKeyword}
                  onChange={(e) => setCustomerSearchKeyword(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Customers List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-slate-100">
              {pastCustomers
                .filter((c) => {
                  const kw = customerSearchKeyword.trim().toLowerCase();
                  if (!kw) return true;
                  return (
                    c.name.toLowerCase().includes(kw) ||
                    (c.phone && c.phone.includes(kw)) ||
                    (c.company && c.company.toLowerCase().includes(kw)) ||
                    (c.address && c.address.toLowerCase().includes(kw))
                  );
                })
                .map((c, idx) => (
                  <div
                    key={idx}
                    className="pt-2 first:pt-0 flex items-start justify-between gap-3 p-2 rounded-xl hover:bg-teal-50/50 transition group"
                  >
                    <div className="space-y-0.5 text-xs">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{c.name}</span>
                        {c.company && (
                          <span className="text-[10px] text-slate-500 font-normal">
                            ({c.company})
                          </span>
                        )}
                        <span className="text-[9px] bg-teal-100 text-teal-800 font-bold px-1.5 py-0.2 rounded-full">
                          {c.orderCount} บิล
                        </span>
                      </div>
                      {c.address && (
                        <p className="text-[11px] text-slate-600 line-clamp-1">{c.address}</p>
                      )}
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-0.5">
                        {c.phone && <span className="font-mono text-teal-700">📞 {c.phone}</span>}
                        {c.taxId && <span>เลขผู้เสียภาษี: {c.taxId}</span>}
                        {c.lastDate && <span>สั่งล่าสุด: {c.lastDate}</span>}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectCustomer(c)}
                      className="shrink-0 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-2xs transition"
                    >
                      เลือก
                    </button>
                  </div>
                ))}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 text-right">
              <button
                type="button"
                onClick={() => setShowCustomerHistoryModal(false)}
                className="px-4 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 text-xs font-medium"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Smart Chat Order & Address Parser Modal */}
      {showAiOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full flex flex-col shadow-2xl border border-teal-200 animate-in fade-in-50 zoom-in-95">
            <div className="p-4 border-b border-teal-100 bg-gradient-to-r from-teal-50 to-emerald-50/50 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center shadow-xs">
                  <Zap className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    AI แยกข้อมูลคำสั่งซื้อจากแชต (Smart Order Parser)
                  </h3>
                  <p className="text-[11px] text-teal-900/80">
                    วางข้อความแชตจาก LINE / Facebook แล้วให้ AI กรอกลงบิลให้อัตโนมัติ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAiOrderModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  ข้อความแชตจากลูกค้า:
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setAiChatInput(
                      'ส่งที่: คุณกมลวรรณ สุขประเสริฐ 089-1122334\n88/12 ซอยอารีย์ ถนนพหลโยธิน แขวงสามเสนใน เขตพญาไท กทม. 10400\nเอา วาซาบิสดแท้ 2 หลอด กับ ผงวาซาบิ 2 ซอง โอนเงินเรียบร้อยนะคะ'
                    );
                  }}
                  className="text-[11px] text-teal-700 hover:underline font-medium"
                >
                  ลองใส่ข้อความตัวอย่าง
                </button>
              </div>

              <textarea
                rows={5}
                value={aiChatInput}
                onChange={(e) => setAiChatInput(e.target.value)}
                placeholder="วางข้อความที่ลูกค้าพิมพ์ส่งมา เช่น:&#10;ส่งที่: คุณสมชาย 081-234-5678&#10;123/45 ซ.สุขุมวิท 55 แขวงคลองตันเหนือ เขตวัฒนา กทม. 10110&#10;สั่ง วาซาบิสด 3 หลอด บะหมี่ 2 ซอง โอนเงิน"
                className="w-full text-xs border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-teal-500 focus:outline-none font-sans leading-relaxed bg-slate-50/50"
              />

              {aiParseNotice && (
                <div className="p-2.5 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs">
                  {aiParseNotice}
                </div>
              )}

              <div className="bg-teal-50/60 p-3 rounded-xl border border-teal-200/60 text-[11px] text-teal-900 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-teal-700" /> AI จะช่วยทำสิ่งต่อไปนี้:
                </span>
                <ul className="list-disc list-inside text-slate-600 space-y-0.5 pl-1">
                  <li>ถอดแยก ชื่อ, เบอร์โทร, และที่อยู่จัดส่ง ให้สะอาดเรียบร้อย</li>
                  <li>ค้นหาและจับคู่สินค้า WASABI-O พร้อมใส่ราคาและจำนวน</li>
                  <li>เลือกรูปแบบการชำระเงินตามที่ลูกค้าแจ้งในแชต</li>
                </ul>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setShowAiOrderModal(false)}
                className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 text-xs font-medium"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                onClick={handleParseOrderWithAi}
                disabled={isParsingAi || !aiChatInput.trim()}
                className="bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-xs transition disabled:opacity-50"
              >
                <Sparkles className={`w-4 h-4 text-amber-300 ${isParsingAi ? 'animate-spin' : ''}`} />
                <span>{isParsingAi ? 'AI กำลังแยกข้อมูล...' : 'ให้ AI แยกข้อมูลลงใบเสร็จ'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
