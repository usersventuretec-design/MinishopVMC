import { Receipt } from '../types';
import { thaiBahtText } from '../utils/thaiBaht';
import { setAccessTokenManually } from './firebaseAuth';

export const DEFAULT_TARGET_SPREADSHEET_ID = '1SDuEa3IZapuQtnHUH9QGxA8kjfz4JlpyiX0BtnTr24o';

export function getTargetSpreadsheetId(): string {
  try {
    const custom = localStorage.getItem('venturetec_custom_spreadsheet_id');
    return custom && custom.trim() ? custom.trim() : DEFAULT_TARGET_SPREADSHEET_ID;
  } catch {
    return DEFAULT_TARGET_SPREADSHEET_ID;
  }
}

export function setTargetSpreadsheetId(id: string): void {
  try {
    if (!id || !id.trim() || id.trim() === DEFAULT_TARGET_SPREADSHEET_ID) {
      localStorage.removeItem('venturetec_custom_spreadsheet_id');
    } else {
      localStorage.setItem('venturetec_custom_spreadsheet_id', id.trim());
    }
  } catch {}
}

export const TARGET_SPREADSHEET_ID = DEFAULT_TARGET_SPREADSHEET_ID;
export const getSpreadsheetUrl = (id?: string) =>
  `https://docs.google.com/spreadsheets/d/${id || getTargetSpreadsheetId()}/edit`;
export const SPREADSHEET_URL = getSpreadsheetUrl();

const HEADERS = [
  'เลขที่ใบเสร็จ',
  'วันที่ออกใบเสร็จ',
  'ชื่อลูกค้า',
  'เบอร์โทร',
  'รายการสินค้า',
  'ยอดรวมก่อนหักส่วนลด (THB)',
  'ส่วนลด (THB)',
  'ภาษีมูลค่าเพิ่ม (THB)',
  'ค่าบริการ/ขนส่ง (THB)',
  'ยอดรวมสุทธิ (THB)',
  'สถานะการชำระ',
  'วิธีชำระเงิน',
  'ผู้บันทึก',
  'ลิงก์ PDF (Google Drive)',
  'เวลาที่บันทึกระบบ',
];

export async function ensureSheetInitialized(
  spreadsheetId: string,
  accessToken: string
): Promise<string> {
  try {
    // 1. Get spreadsheet info to find first sheet name
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!metaRes.ok) {
      if (metaRes.status === 401) {
        setAccessTokenManually(null);
        throw new Error('GOOGLE_AUTH_EXPIRED');
      }
      const err = await metaRes.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to access spreadsheet (${metaRes.status})`);
    }

    const meta = await metaRes.json();
    const firstSheetTitle = meta.sheets?.[0]?.properties?.title || 'Sheet1';

    // 2. Check if header row exists
    const checkRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${firstSheetTitle}'!A1:O1`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (checkRes.ok) {
      const checkData = await checkRes.json();
      if (!checkData.values || checkData.values.length === 0) {
        // Write headers
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${firstSheetTitle}'!A1:O1?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              range: `'${firstSheetTitle}'!A1:O1`,
              majorDimension: 'ROWS',
              values: [HEADERS],
            }),
          }
        );
      }
    }

    return firstSheetTitle;
  } catch (error: any) {
    if (error?.message === 'GOOGLE_AUTH_EXPIRED') {
      console.warn('Google Auth token expired in ensureSheetInitialized');
      throw error;
    }
    console.error('Error ensuring sheet initialized:', error);
    throw error;
  }
}

/**
 * Appends a new receipt row or updates an existing receipt row (e.g. updating the PDF link)
 */
export async function appendReceiptToGoogleSheet(
  receipt: Receipt,
  accessToken: string,
  spreadsheetId: string = getTargetSpreadsheetId(),
  driveWebViewLink?: string
): Promise<boolean> {
  try {
    const sheetTitle = await ensureSheetInitialized(spreadsheetId, accessToken);

    // 1. Check if receipt already exists in Column A to update in place
    let existingRowNumber: number | null = null;
    try {
      const colRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${sheetTitle}'!A:A`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (colRes.ok) {
        const colData = await colRes.json();
        if (colData.values && Array.isArray(colData.values)) {
          const idx = colData.values.findIndex(
            (r: string[]) => r[0] && r[0].toString().trim().toLowerCase() === receipt.receiptNo.trim().toLowerCase()
          );
          if (idx !== -1) {
            existingRowNumber = idx + 1; // 1-indexed row number in sheets
          }
        }
      }
    } catch (findErr) {
      console.warn('Could not inspect existing rows in sheet:', findErr);
    }

    const itemsSummary = receipt.items
      .map((item) => `${item.description} (x${item.quantity})`)
      .join('; ');

    const paymentStatusTh =
      receipt.paymentStatus === 'PAID'
        ? 'ชำระแล้ว'
        : receipt.paymentStatus === 'CANCELLED'
        ? 'ยกเลิก'
        : 'รอชำระ';

    const paymentMethodTh =
      receipt.paymentMethod === 'TRANSFER'
        ? 'โอนเงิน (กรุงศรี)'
        : receipt.paymentMethod === 'PROMPTPAY'
        ? 'พร้อมเพย์'
        : receipt.paymentMethod === 'CREDIT_CARD'
        ? 'บัตรเครดิต'
        : 'เงินสด';

    // Prioritize explicit driveWebViewLink passed in, fallback to receipt.driveViewLink
    const effectiveDriveLink = driveWebViewLink || receipt.driveViewLink || '';
    if (driveWebViewLink && !receipt.driveViewLink) {
      receipt.driveViewLink = driveWebViewLink;
    }

    // Format Drive PDF link as an active clickable formula in Google Sheets
    const drivePdfCell = effectiveDriveLink
      ? `=HYPERLINK("${effectiveDriveLink}", "เปิดไฟล์ PDF (${receipt.receiptNo})")`
      : '-';

    const row = [
      receipt.receiptNo,
      receipt.date,
      receipt.customer.name,
      receipt.customer.phone || '-',
      itemsSummary,
      receipt.subtotal,
      receipt.discountAmount,
      receipt.vatAmount,
      receipt.serviceCharge,
      receipt.grandTotal,
      paymentStatusTh,
      paymentMethodTh,
      receipt.staffName,
      drivePdfCell,
      receipt.createdAt,
    ];

    if (existingRowNumber && existingRowNumber > 1) {
      // Update existing row
      const updateRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${sheetTitle}'!A${existingRowNumber}:O${existingRowNumber}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            range: `'${sheetTitle}'!A${existingRowNumber}:O${existingRowNumber}`,
            majorDimension: 'ROWS',
            values: [row],
          }),
        }
      );

      if (!updateRes.ok) {
        if (updateRes.status === 401) {
          setAccessTokenManually(null);
          throw new Error('GOOGLE_AUTH_EXPIRED');
        }
        const err = await updateRes.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Failed to update row in Google Sheet');
      }
      return true;
    } else {
      // Append brand new row
      const appendRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${sheetTitle}'!A:O:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [row],
          }),
        }
      );

      if (!appendRes.ok) {
        if (appendRes.status === 401) {
          setAccessTokenManually(null);
          throw new Error('GOOGLE_AUTH_EXPIRED');
        }
        const err = await appendRes.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Failed to append row to Google Sheet');
      }

      return true;
    }
  } catch (err: any) {
    console.error('appendReceiptToGoogleSheet failed:', err);
    throw err;
  }
}

export async function fetchSheetRows(
  accessToken: string,
  spreadsheetId: string = getTargetSpreadsheetId()
): Promise<any[]> {
  try {
    const sheetTitle = await ensureSheetInitialized(spreadsheetId, accessToken);
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${sheetTitle}'!A2:O500`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.values || [];
  } catch (err) {
    console.warn('fetchSheetRows error:', err);
    return [];
  }
}

/**
 * Pull and parse all receipts stored in Google Sheet (including customer info, items, and Drive PDF links)
 * Enables multi-device synchronization so any device can load past orders and PDFs.
 */
export async function pullReceiptsFromGoogleSheet(
  accessToken: string,
  spreadsheetId: string = getTargetSpreadsheetId()
): Promise<Receipt[]> {
  try {
    const sheetTitle = await ensureSheetInitialized(spreadsheetId, accessToken);
    
    // Fetch values with FORMULA so we get the exact HYPERLINK url for PDF files
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${sheetTitle}'!A2:O1000?valueRenderOption=FORMULA`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!res.ok) {
      if (res.status === 401) {
        setAccessTokenManually(null);
        throw new Error('GOOGLE_AUTH_EXPIRED');
      }
      console.warn('Failed to fetch rows from Google Sheet:', res.status);
      return [];
    }

    const data = await res.json();
    const rows = data.values || [];
    const receipts: Receipt[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r || !r[0] || !r[0].toString().trim()) continue; // Skip empty rows

      const receiptNo = r[0].toString().trim();
      let date = r[1] ? r[1].toString().trim() : new Date().toISOString().split('T')[0];
      // Convert Excel/Sheet serial number date (e.g. 46316 -> 2026-10-21)
      if (/^\d{5}$/.test(date)) {
        const serial = parseInt(date, 10);
        if (serial > 30000 && serial < 70000) {
          const jsDate = new Date((serial - 25569) * 86400 * 1000);
          if (!isNaN(jsDate.getTime())) {
            date = jsDate.toISOString().split('T')[0];
          }
        }
      }
      const customerName = r[2] ? r[2].toString().trim() : 'ลูกค้าทั่วไป';
      const phone = r[3] && r[3] !== '-' ? r[3].toString().trim() : '';
      const itemsRaw = r[4] ? r[4].toString().trim() : '';
      const subtotal = parseFloat(r[5]) || 0;
      const discountAmount = parseFloat(r[6]) || 0;
      const vatAmount = parseFloat(r[7]) || 0;
      const serviceCharge = parseFloat(r[8]) || 0;
      const grandTotal = parseFloat(r[9]) || 0;
      const statusRaw = r[10] ? r[10].toString().trim() : '';
      const methodRaw = r[11] ? r[11].toString().trim() : '';
      const staffName = r[12] ? r[12].toString().trim() : 'ฝ่ายขาย Mini Shop';
      const linkRaw = r[13] ? r[13].toString().trim() : '';
      const createdAtRaw = r[14] ? r[14].toString().trim() : '';

      // Extract Drive link from HYPERLINK formula or plain text
      let driveViewLink: string | undefined = undefined;
      if (linkRaw) {
        const urlMatch = linkRaw.match(/https:\/\/[^\s",\)]+/);
        if (urlMatch) {
          driveViewLink = urlMatch[0];
        } else if (linkRaw.startsWith('http')) {
          driveViewLink = linkRaw;
        }
      }

      // Extract Drive file ID if present
      let driveFileId: string | undefined = undefined;
      if (driveViewLink) {
        const fileIdMatch = driveViewLink.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (fileIdMatch) {
          driveFileId = fileIdMatch[1];
        }
      }

      // Map Payment Status
      let paymentStatus: 'PAID' | 'PENDING' | 'CANCELLED' = 'PAID';
      if (statusRaw.includes('ยกเลิก') || statusRaw === 'CANCELLED') {
        paymentStatus = 'CANCELLED';
      } else if (statusRaw.includes('รอ') || statusRaw === 'PENDING') {
        paymentStatus = 'PENDING';
      }

      // Map Payment Method
      let paymentMethod: 'TRANSFER' | 'PROMPTPAY' | 'CREDIT_CARD' | 'CASH' = 'TRANSFER';
      if (methodRaw.includes('พร้อมเพย์') || methodRaw === 'PROMPTPAY') {
        paymentMethod = 'PROMPTPAY';
      } else if (methodRaw.includes('บัตร') || methodRaw === 'CREDIT_CARD') {
        paymentMethod = 'CREDIT_CARD';
      } else if (methodRaw.includes('สด') || methodRaw === 'CASH') {
        paymentMethod = 'CASH';
      }

      // Parse items summary
      const itemsList = itemsRaw ? itemsRaw.split(';') : [];
      const parsedItems = itemsList.map((itemStr: string, idx: number) => {
        const trimmed = itemStr.trim();
        const qtyMatch = trimmed.match(/\(x(\d+)\)/i);
        const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
        const desc = trimmed.replace(/\(x\d+\)/i, '').trim();
        const itemAmount = qty > 0 ? Math.round((subtotal / Math.max(1, itemsList.length)) * 100) / 100 : subtotal;
        const unitPrice = qty > 0 ? Math.round((itemAmount / qty) * 100) / 100 : itemAmount;
        return {
          id: `item_sheet_${i}_${idx}`,
          description: desc || 'สินค้า',
          quantity: qty,
          unitPrice,
          amount: itemAmount,
        };
      });

      receipts.push({
        id: `rcpt_sheet_${receiptNo.replace(/[^a-zA-Z0-9]/g, '_')}`,
        receiptNo,
        date,
        time: '',
        customer: {
          name: customerName,
          phone,
          address: '',
          email: '',
        },
        items: parsedItems.length > 0 ? parsedItems : [{
          id: `item_sheet_${i}_0`,
          description: itemsRaw || 'รายการสินค้า',
          quantity: 1,
          unitPrice: subtotal,
          amount: subtotal,
        }],
        subtotal,
        discountType: 'fixed',
        discountValue: discountAmount,
        discountAmount,
        netSubtotal: Math.max(0, subtotal - discountAmount),
        vatRate: vatAmount > 0 ? 7 : 0,
        vatAmount,
        serviceCharge,
        grandTotal,
        bahtText: thaiBahtText(grandTotal),
        paymentStatus,
        paymentMethod,
        bankAccount: '800-0-003433',
        bankName: 'ธนาคารกรุงศรีอยุธยา',
        staffName,
        driveFileId,
        driveViewLink,
        syncedToSheet: true,
        createdAt: createdAtRaw && createdAtRaw.includes('T') ? createdAtRaw : `${date}T12:00:00.000Z`,
      });
    }

    return receipts;
  } catch (err: any) {
    if (err?.message === 'GOOGLE_AUTH_EXPIRED') {
      console.warn('Google Auth token expired in pullReceiptsFromGoogleSheet');
      throw err;
    }
    console.error('Error pulling receipts from Google Sheet:', err);
    throw err;
  }
}
