import React, { forwardRef } from 'react';
import { CompanyInfo, Receipt } from '../types';
import { formatCurrency } from '../utils/thaiBaht';
import { VENTURETEC_LOGO_SRC } from '../data/logoBase64';

interface ReceiptDocumentProps {
  receipt: Receipt;
  companyInfo: CompanyInfo;
  isPrintMode?: boolean;
}

export const ReceiptDocument = forwardRef<HTMLDivElement, ReceiptDocumentProps>(
  ({ receipt, companyInfo, isPrintMode = false }, ref) => {
    // Fill minimum rows to match professional corporate look (min 8 rows)
    const minRows = 8;
    const emptyRowsCount = Math.max(0, minRows - receipt.items.length);
    const emptyRows = Array.from({ length: emptyRowsCount });

    return (
      <div
        ref={ref}
        id="receipt-print-area"
        className={`bg-[#ffffff] font-['Sarabun',sans-serif] text-[#0f172a] border border-[#cbd5e1] shadow-sm mx-auto flex flex-col justify-between receipt-sheet ${
          isPrintMode ? 'shadow-none border-none p-4' : 'p-6 sm:p-8'
        }`}
        style={{
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
          color: '#0f172a',
          width: '794px',
          minWidth: '794px',
          maxWidth: '794px',
          minHeight: '1123px',
          margin: '0 auto',
        }}
      >
        <div>
          {/* Header Banner - Official Corporate Logo Header */}
          <div
            className="px-6 pt-2 pb-3.5 flex items-start justify-between border-b-2 gap-4"
            style={{ backgroundColor: '#ffffff', borderColor: '#007A87' }}
          >
            {/* Left: Prominent Official Corporate Brand Logo */}
            <div className="flex-1 min-w-0 flex flex-col justify-start">
              <img
                src={companyInfo.logoUrl || VENTURETEC_LOGO_SRC}
                alt={companyInfo.name || 'Venturetec Marketing CO., LTD.'}
                className="h-16 max-h-[64px] w-auto max-w-[320px] object-contain object-left filter drop-shadow-2xs"
                style={{ maxHeight: '64px', maxWidth: '320px', width: 'auto', height: '64px' }}
                crossOrigin="anonymous"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = VENTURETEC_LOGO_SRC;
                }}
              />
            </div>

            {/* Right: Official Corporate Document Title & Classification */}
            <div className="shrink-0" style={{ minWidth: '220px' }}>
              <table style={{ borderCollapse: 'separate', borderSpacing: 0, marginLeft: 'auto' }}>
                <tbody>
                  <tr>
                    <td style={{ textAlign: 'right', paddingBottom: '8px' }}>
                      <div
                        className="shadow-xs"
                        style={{
                          backgroundColor: '#007A87',
                          color: '#ffffff',
                          fontWeight: 'bold',
                          fontSize: '13px',
                          letterSpacing: '0.025em',
                          padding: '6px 16px',
                          borderRadius: '6px',
                          display: 'inline-block',
                          whiteSpace: 'nowrap',
                          lineHeight: '1.4',
                        }}
                      >
                        ใบเสร็จรับเงิน / ใบแจ้งหนี้
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ textAlign: 'right', paddingBottom: '12px' }}>
                      <div
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 'bold',
                          fontSize: '12px',
                          letterSpacing: '0.08em',
                          color: '#007A87',
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap',
                          lineHeight: '1.4',
                        }}
                      >
                        RECEIPT / TAX INVOICE
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          fontWeight: 500,
                          fontSize: '11px',
                          padding: '4px 14px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          display: 'inline-block',
                          whiteSpace: 'nowrap',
                          lineHeight: '1.4',
                        }}
                      >
                        ต้นฉบับ / ORIGINAL
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Subheader info block - 7 / 5 Grid for spacious, uniform typography */}
          <div
            className="grid grid-cols-12 gap-4 text-[12px] py-3.5 px-1 border-b"
            style={{ borderColor: '#e2e8f0' }}
          >
            {/* Left Section (7 columns): Company Address, Tax ID, and Bill To */}
            <div className="col-span-7 space-y-2">
              {/* Company contact summary with uniform 12px text */}
              <div className="space-y-1 text-[#334155] pr-2 text-[12px] leading-relaxed">
                <p>
                  <span className="font-bold text-[#0f172a]">ที่อยู่:</span>{' '}
                  {companyInfo.address} {companyInfo.postalCode}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5">
                  <p>
                    <span className="font-bold text-[#0f172a]">เลขประจำตัวผู้เสียภาษี:</span>{' '}
                    <span className="font-mono font-medium">{companyInfo.taxId}</span>
                  </p>
                  <p>
                    <span className="font-bold text-[#0f172a]">โทรศัพท์:</span>{' '}
                    <span className="font-mono font-medium">{companyInfo.phone}</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5">
                  <p>
                    <span className="font-bold text-[#0f172a]">อีเมล:</span> {companyInfo.email}
                  </p>
                  <p>
                    <span className="font-bold text-[#0f172a]">เว็บไซต์:</span> {companyInfo.website}
                  </p>
                </div>
              </div>

              {/* Bill To Customer Box - Standardized 12px Font */}
              <div
                className="p-3 rounded border space-y-1 mt-2 text-[#334155] text-[12px]"
                style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}
              >
                <div className="flex items-center gap-2 border-b pb-1 mb-1.5" style={{ borderColor: '#e2e8f0' }}>
                  <span className="font-bold text-[#007A87] text-[12px] shrink-0">
                    เรียกเก็บ / ข้อมูลลูกค้า (BILL TO):
                  </span>
                  <span className="text-[12px] font-bold text-[#0f172a]">
                    {receipt.customer.name || '-'}
                  </span>
                </div>

                {receipt.customer.company && (
                  <p>
                    <span className="font-medium text-[#475569]">บริษัท/ร้าน:</span>{' '}
                    <span className="font-semibold text-[#0f172a]">{receipt.customer.company}</span>
                  </p>
                )}

                <p className="leading-relaxed">
                  <span className="font-medium text-[#475569]">ที่อยู่จัดส่ง:</span>{' '}
                  {receipt.customer.address || '-'}
                </p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 pt-0.5 text-[12px]">
                  {receipt.customer.phone && (
                    <p>
                      <span className="font-medium text-[#475569]">โทรศัพท์:</span>{' '}
                      <span className="font-mono font-medium">{receipt.customer.phone}</span>
                    </p>
                  )}
                  {receipt.customer.taxId && (
                    <p>
                      <span className="font-medium text-[#475569]">เลขผู้เสียภาษี:</span>{' '}
                      <span className="font-mono font-medium">{receipt.customer.taxId}</span>
                    </p>
                  )}
                  {receipt.customer.email && (
                    <p>
                      <span className="font-medium text-[#475569]">อีเมล:</span> {receipt.customer.email}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Section (5 columns): Receipt Meta Information Box */}
            <div className="col-span-5 flex flex-col justify-start">
              <div
                className="p-3.5 rounded border space-y-2 text-[12px]"
                style={{
                  backgroundColor: '#f0fdfa',
                  borderColor: '#007A87',
                }}
              >
                {/* Receipt Number Highlight */}
                <div className="border-b pb-2" style={{ borderColor: '#ccfbf1' }}>
                  <span className="text-[12px] text-[#004e57] font-semibold block uppercase">
                    เลขที่ใบเสร็จ (Receipt No.)
                  </span>
                  <span className="text-base font-mono font-bold text-[#004e57] tracking-wider block mt-0.5">
                    {receipt.receiptNo}
                  </span>
                </div>

                {/* Date & Time */}
                <div className="flex items-center justify-between text-[#1e293b] leading-normal py-0.5 text-[12px]">
                  <span className="font-medium text-[#475569] shrink-0">วันที่ออกเอกสาร:</span>
                  <span className="font-mono font-semibold text-[#0f172a]">{receipt.date}</span>
                </div>

                {receipt.time && (
                  <div className="flex items-center justify-between text-[#1e293b] leading-normal py-0.5 text-[12px]">
                    <span className="font-medium text-[#475569] shrink-0">เวลา:</span>
                    <span className="font-mono text-[#0f172a]">{receipt.time} น.</span>
                  </div>
                )}

                {/* Staff name */}
                <div className="flex items-center justify-between text-[#1e293b] leading-normal py-0.5 text-[12px]">
                  <span className="font-medium text-[#475569] shrink-0">ผู้บันทึก:</span>
                  <span className="font-medium text-[#0f172a] text-right ml-2">
                    {receipt.staffName || 'ฝ่ายขาย Mini Shop'}
                  </span>
                </div>

                {/* Payment status badge */}
                <div className="pt-2 border-t flex items-center justify-between py-0.5 leading-normal" style={{ borderColor: '#ccfbf1' }}>
                  <span className="font-medium text-[#475569] shrink-0">สถานะการชำระ:</span>
                  <span
                    className="px-2 py-0.5 rounded text-[11px] font-bold"
                    style={{
                      backgroundColor: receipt.paymentStatus === 'PAID' ? '#dcfce7' : '#fef3c7',
                      color: receipt.paymentStatus === 'PAID' ? '#166534' : '#92400e',
                    }}
                  >
                    {receipt.paymentStatus === 'PAID' ? 'ชำระแล้ว (PAID)' : 'รอชำระ (PENDING)'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Table matching clean cyan/white alternating rows with uniform 12px text */}
          <div className="mt-3.5">
            <table
              className="w-full text-[12px] border border-collapse"
              style={{ borderColor: '#007A87', tableLayout: 'fixed' }}
            >
              <thead>
                <tr
                  className="border-b-2 font-bold text-[12px]"
                  style={{ backgroundColor: '#f0fdfa', color: '#004e57', borderColor: '#007A87' }}
                >
                  <th
                    className="py-2.5 px-2 text-center border-r"
                    style={{ borderColor: '#99f6e4', width: '50px' }}
                  >
                    ลำดับ
                  </th>
                  <th
                    className="py-2.5 px-3 text-left border-r"
                    style={{ borderColor: '#99f6e4', width: '380px' }}
                  >
                    รายการสินค้า / คำอธิบาย (Description)
                  </th>
                  <th
                    className="py-2.5 px-2 text-center border-r"
                    style={{ borderColor: '#99f6e4', width: '70px' }}
                  >
                    จำนวน
                  </th>
                  <th
                    className="py-2.5 px-3 text-right border-r"
                    style={{ borderColor: '#99f6e4', width: '110px' }}
                  >
                    ราคา/หน่วย
                  </th>
                  <th className="py-2.5 px-3 text-right" style={{ width: '130px' }}>
                    จำนวนเงิน (฿)
                  </th>
                </tr>
              </thead>
              <tbody>
                {receipt.items.map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    className="border-b text-[12px]"
                    style={{
                      backgroundColor: idx % 2 === 1 ? '#e6f7f9' : '#ffffff',
                      borderColor: '#ccfbf1',
                    }}
                  >
                    <td
                      className="py-2 px-2 text-center border-r font-medium text-[#0f172a]"
                      style={{ borderColor: '#99f6e4' }}
                    >
                      {idx + 1}
                    </td>
                    <td
                      className="py-2 px-3 border-r overflow-hidden"
                      style={{ borderColor: '#99f6e4', wordBreak: 'break-word' }}
                    >
                      <span className="font-semibold text-[#0f172a]">{item.description}</span>
                      {item.code && (
                        <span className="ml-2 text-[11px] text-[#007A87] font-mono font-semibold">
                          ({item.code})
                        </span>
                      )}
                    </td>
                    <td
                      className="py-2 px-2 text-center border-r text-[#0f172a] font-mono font-medium"
                      style={{ borderColor: '#99f6e4' }}
                    >
                      {item.quantity}
                    </td>
                    <td
                      className="py-2 px-3 text-right border-r font-mono text-[#0f172a]"
                      style={{ borderColor: '#99f6e4' }}
                    >
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-[#0f172a]">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}

                {/* Blank padded rows to match layout height */}
                {emptyRows.map((_, i) => {
                  const rowIdx = receipt.items.length + i;
                  return (
                    <tr
                      key={`empty-${i}`}
                      className="border-b h-7 text-[12px]"
                      style={{
                        backgroundColor: rowIdx % 2 === 1 ? '#e6f7f9' : '#ffffff',
                        borderColor: '#ccfbf1',
                      }}
                    >
                      <td className="border-r" style={{ borderColor: '#99f6e4' }}></td>
                      <td className="border-r" style={{ borderColor: '#99f6e4' }}></td>
                      <td className="border-r" style={{ borderColor: '#99f6e4' }}></td>
                      <td className="border-r" style={{ borderColor: '#99f6e4' }}></td>
                      <td></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom section: Payment Instructions & Totals with uniform 12px text */}
          <div className="grid grid-cols-12 gap-4 mt-3 pt-1">
            {/* Left Payment Info (7 columns) */}
            <div className="col-span-7 flex flex-col justify-between py-1 text-[12px]">
              <div
                className="p-3 rounded border text-[12px]"
                style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}
              >
                <p className="text-[#1e293b] font-medium text-[12px]">
                  สั่งจ่ายเงินทั้งหมดให้กับ:{' '}
                  <span className="font-bold text-[#004e57]">{companyInfo.accountName}</span>
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: '#007A87' }}
                  ></div>
                  <p className="font-bold font-mono text-[#0f172a] text-[13px]">
                    {companyInfo.bankAccount}{' '}
                    <span className="text-[12px] font-normal text-[#475569]">
                      ({companyInfo.bankName})
                    </span>
                  </p>
                </div>
                {receipt.remarks && (
                  <p className="text-[12px] text-[#475569] mt-1.5">
                    <span className="font-semibold text-[#0f172a]">หมายเหตุ:</span> {receipt.remarks}
                  </p>
                )}
              </div>

              {/* Baht Text Box */}
              <div
                className="mt-2.5 p-2.5 rounded text-[12px] border"
                style={{
                  backgroundColor: '#f0fdfa',
                  borderColor: '#99f6e4',
                  color: '#004e57',
                }}
              >
                <span className="font-bold">จำนวนเงินตัวอักษร:</span>{' '}
                <span className="font-semibold underline decoration-[#2dd4bf] decoration-1 underline-offset-2">
                  {receipt.bahtText}
                </span>
              </div>
            </div>

            {/* Right Totals Table (5 columns) */}
            <div className="col-span-5">
              <table
                className="w-full text-[12px] border border-collapse"
                style={{ borderColor: '#007A87', tableLayout: 'fixed' }}
              >
                <tbody>
                  <tr
                    className="border-b"
                    style={{ backgroundColor: '#ffffff', borderColor: '#99f6e4' }}
                  >
                    <td
                      className="py-1.5 px-3 text-right font-medium text-[#475569] border-r text-[12px]"
                      style={{ borderColor: '#99f6e4', width: '58%' }}
                    >
                      ผลรวมย่อยของใบแจ้งหนี้:
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono font-medium text-[#0f172a] text-[12px]" style={{ width: '42%' }}>
                      {formatCurrency(receipt.subtotal)}
                    </td>
                  </tr>

                  {receipt.discountAmount > 0 && (
                    <tr
                      className="border-b"
                      style={{ backgroundColor: '#e6f7f9', borderColor: '#99f6e4' }}
                    >
                      <td
                        className="py-1.5 px-3 text-right font-medium text-[#475569] border-r text-[12px]"
                        style={{ borderColor: '#99f6e4' }}
                      >
                        ส่วนลด {receipt.discountType === 'percent' ? `(${receipt.discountValue}%)` : ''}:
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono font-medium text-[#dc2626] text-[12px]">
                        -{formatCurrency(receipt.discountAmount)}
                      </td>
                    </tr>
                  )}

                  <tr
                    className="border-b"
                    style={{ backgroundColor: '#ffffff', borderColor: '#99f6e4' }}
                  >
                    <td
                      className="py-1.5 px-3 text-right font-medium text-[#475569] border-r text-[12px]"
                      style={{ borderColor: '#99f6e4' }}
                    >
                      อัตราภาษี:
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono font-medium text-[#475569] text-[12px]">
                      {receipt.vatRate > 0 ? `${receipt.vatRate}%` : '0% (ไม่มี VAT)'}
                    </td>
                  </tr>

                  <tr
                    className="border-b"
                    style={{ backgroundColor: '#e6f7f9', borderColor: '#99f6e4' }}
                  >
                    <td
                      className="py-1.5 px-3 text-right font-medium text-[#475569] border-r text-[12px]"
                      style={{ borderColor: '#99f6e4' }}
                    >
                      ภาษีการขาย (VAT):
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono font-medium text-[#0f172a] text-[12px]">
                      {formatCurrency(receipt.vatAmount)}
                    </td>
                  </tr>

                  {receipt.serviceCharge > 0 && (
                    <tr
                      className="border-b"
                      style={{ backgroundColor: '#ffffff', borderColor: '#99f6e4' }}
                    >
                      <td
                        className="py-1.5 px-3 text-right font-medium text-[#475569] border-r text-[12px]"
                        style={{ borderColor: '#99f6e4' }}
                      >
                        ค่าบริการ / ค่าจัดส่ง:
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono font-medium text-[#0f172a] text-[12px]">
                        {formatCurrency(receipt.serviceCharge)}
                      </td>
                    </tr>
                  )}

                  {/* Grand Total row highlighted with balanced typography */}
                  <tr
                    className="border-t-2 font-bold text-[#0f172a]"
                    style={{
                      backgroundColor: '#e6f7f9',
                      borderColor: '#007A87',
                    }}
                  >
                    <td
                      className="py-2.5 px-3 text-right text-[13px] font-bold text-[#004e57] border-r"
                      style={{ borderColor: '#007A87' }}
                    >
                      รวม (Total):
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[14px] text-[#004e57]">
                      ฿{formatCurrency(receipt.grandTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Bottom Signatures Block */}
        <div className="pt-6 mt-4 border-t" style={{ borderColor: '#cbd5e1' }}>
          <div className="flex justify-end pr-8 text-center text-[12px]">
            <div className="w-56">
              <div
                className="h-10 border-b border-dashed mx-2"
                style={{ borderColor: '#94a3b8' }}
              ></div>
              <p className="mt-1.5 font-semibold text-[#1e293b] text-[12px]">ผู้รับเงิน / พนักงานขาย</p>
              <p className="text-[12px] font-mono text-[#007A87] font-semibold">{receipt.staffName || 'ฝ่ายขาย Mini Shop'}</p>
              <p className="text-[11px] text-[#64748b]">วันที่ {receipt.date}</p>
            </div>
          </div>
          <div className="mt-3 text-left text-[11px] text-[#94a3b8]">
            <span>เอกสารนี้ออกโดยระบบบริหารจัดการใบเสร็จ Venturetec Marketing CO.,LTD.</span>
          </div>
        </div>
      </div>
    );
  }
);

ReceiptDocument.displayName = 'ReceiptDocument';
