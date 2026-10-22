import { Product } from '../types';

export interface ParsedOrderResult {
  customerName?: string;
  company?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  email?: string;
  paymentMethod?: 'TRANSFER' | 'PROMPTPAY' | 'CASH' | 'CREDIT_CARD';
  matchedItems?: {
    productId?: string;
    description: string;
    quantity: number;
    unitPrice: number;
  }[];
  remarks?: string;
}

/**
 * Local intelligent fallback parser for Thai chat messages / addresses
 * Used when offline or if server API is unavailable
 */
export function parseOrderLocally(text: string, catalog: Product[]): ParsedOrderResult {
  const result: ParsedOrderResult = {
    matchedItems: [],
  };

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // 1. Extract Phone (e.g. 081-234-5678, 0812345678, 09x, 06x)
  const phoneMatch = text.match(/(?:0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{3,4})/);
  if (phoneMatch) {
    result.phone = phoneMatch[0].replace(/[-\s]/g, '');
  }

  // 2. Extract Postal Code (5 digits)
  const postalMatch = text.match(/\b\d{5}\b/);
  const postalCode = postalMatch ? postalMatch[0] : '';

  // 3. Extract Name (Look for "ชื่อ", "คุณ", "ผู้รับ" or first line without numbers)
  for (const line of lines) {
    const clean = line.replace(/^(ชื่อ|ผู้รับ|ส่งที่|ลูกค้า|คุณ)\s*[:\s-]?\s*/i, '').trim();
    if (/^(ชื่อ|ผู้รับ|คุณ)/.test(line) && clean) {
      result.customerName = clean;
      break;
    }
  }

  if (!result.customerName && lines.length > 0) {
    // Check first line if not phone or address
    const firstLine = lines[0].replace(/^(ส่ง|ส่งที่|คุณ)\s*[:\s-]?\s*/i, '').trim();
    if (!/\d{3,}/.test(firstLine) && firstLine.length < 50) {
      result.customerName = firstLine;
    }
  }

  // 4. Extract Address
  const addressLines: string[] = [];
  for (const line of lines) {
    // Lines that contain address keywords (บ้านเลขที่, ซอย, ถนน, ต., อ., จ., แขวง, เขต, เลขที่, รหัสไปรษณีย์)
    if (
      /(ต\.|อ\.|จ\.|แขวง|เขต|ถนน|ซอย|ม\.|หมู่|บ้านเลขที่|\/|\b\d{5}\b)/i.test(line) &&
      !line.startsWith('โทร') &&
      !line.startsWith('tel')
    ) {
      addressLines.push(line.replace(/^(ที่อยู่|ที่อยู่จัดส่ง|ส่งที่)\s*[:\s-]?\s*/i, '').trim());
    }
  }
  if (addressLines.length > 0) {
    result.address = addressLines.join(' ');
  } else if (postalCode) {
    // Fallback: take line with postal code
    const lineWithPostal = lines.find((l) => l.includes(postalCode));
    if (lineWithPostal) result.address = lineWithPostal;
  }

  // 5. Payment method detection
  if (/โอน|transfer|บัญชี|สลิป/i.test(text)) {
    result.paymentMethod = 'TRANSFER';
  } else if (/พร้อมเพย์|promptpay|qr/i.test(text)) {
    result.paymentMethod = 'PROMPTPAY';
  } else if (/สด|cash/i.test(text)) {
    result.paymentMethod = 'CASH';
  } else if (/บัตร|credit/i.test(text)) {
    result.paymentMethod = 'CREDIT_CARD';
  }

  // 6. Match catalog items
  for (const product of catalog) {
    const code = product.code.toLowerCase();

    // Look for product name or code in text
    let matched = false;
    let qty = 1;

    // Check if product keywords are mentioned
    const keywords = [
      product.code,
      product.nameTh,
      product.nameEn,
      ...product.nameTh.split(' ').filter((w: string) => w.length > 3),
      ...product.nameEn.split(' ').filter((w: string) => w.length > 3),
    ];

    for (const kw of keywords) {
      const lowerKw = kw.toLowerCase();
      const idx = text.toLowerCase().indexOf(lowerKw);
      if (idx !== -1) {
        matched = true;
        // Check for quantity near the keyword e.g. "วาซาบิสด 3 หลอด", "x 2", "จำนวน 2"
        const sub = text.slice(idx, idx + lowerKw.length + 20);
        const qtyM = sub.match(/(?:x|\*|\s|จำนวน)?\s*(\d{1,2})\s*(?:ชิ้น|หลอด|ซอง|กระปุก|ขวด|กล่อง)?/i);
        if (qtyM && parseInt(qtyM[1], 10) > 0) {
          qty = parseInt(qtyM[1], 10);
        }
        break;
      }
    }

    if (matched) {
      result.matchedItems?.push({
        productId: product.id,
        description: `${product.nameEn} (${product.size})`,
        quantity: qty,
        unitPrice: product.price,
      });
    }
  }

  return result;
}

/**
 * Call Gemini AI to parse natural Thai order text
 */
export async function parseOrderWithAI(
  text: string,
  catalog: Product[]
): Promise<ParsedOrderResult> {
  try {
    const res = await fetch('/api/ai/parse-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, products: catalog }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && (data.customerName || data.phone || data.address || data.matchedItems?.length > 0)) {
        return data;
      }
    }
  } catch (err) {
    console.warn('AI order parser server request failed, falling back to local parser:', err);
  }

  // Fallback to local heuristic parser
  return parseOrderLocally(text, catalog);
}

/**
 * Request Gemini AI Sales Insights
 */
export async function getSalesInsightsWithAI(summaryData: any): Promise<string> {
  try {
    const res = await fetch('/api/ai/sales-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summaryData }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.insights) return data.insights;
    }
  } catch (err) {
    console.warn('AI sales insights server call failed:', err);
  }

  // Local analytical fallback if AI service is unreachable
  return `### 📈 สรุปภาพรวมยอดขาย (Local Summary)
- ยอดขายรวมทั้งหมด: **฿${(summaryData.totalRevenue || 0).toLocaleString()}** จากทั้งหมด **${summaryData.totalReceipts || 0} ใบเสร็จ**
- ยอดขายเฉลี่ยต่อบิล: **฿${(summaryData.avgTicket || 0).toLocaleString()}**
- สินค้าขายดีอันดับ 1: **${summaryData.topProducts?.[0]?.name || 'สินค้า WASABI-O'}** (${summaryData.topProducts?.[0]?.qty || 0} ชิ้น)

### 💡 ข้อเสนอแนะสำหรับร้าน
1. **จัดเซ็ตคู่สินค้ายอดนิยม:** นำสินค้าขายดีอันดับ 1 จับคู่กับน้ำสลัดหรือบะหมี่ เพื่อดันยอดต่อบิล (Basket Size) ให้เกิน 500 บาท
2. **โปรโมทช่องทางพร้อมเพย์:** เพื่อเพิ่มความสะดวกให้ลูกค้าสแกนจ่ายได้รวดเร็วหน้าร้าน`;
}
