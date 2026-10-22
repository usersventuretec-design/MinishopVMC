import React, { useState } from 'react';
import {
  Search,
  Calendar,
  Download,
  Eye,
  Trash2,
  CloudUpload,
  ExternalLink,
  CheckCircle2,
  Clock,
  Printer,
  FileSpreadsheet,
  RefreshCw,
  TrendingUp,
  Receipt as ReceiptIcon,
  FolderSync,
  AlertTriangle,
  CloudDownload,
} from 'lucide-react';
import { Receipt } from '../types';
import { formatCurrency } from '../utils/thaiBaht';
import { SPREADSHEET_URL } from '../services/googleSheets';
import { DRIVE_FOLDER_URL } from '../services/googleDrive';

interface SalesHistoryProps {
  receipts: Receipt[];
  onViewReceipt: (receipt: Receipt) => void;
  onPrintReceipt: (receipt: Receipt) => void;
  onDeleteReceipt: (id: string) => void;
  onClearAllReceipts: (resetCounter: boolean) => void;
  onSyncReceiptToSheet: (receipt: Receipt) => void;
  onUploadReceiptToDriveAndSheet: (receipt: Receipt) => void;
  onSyncAllPending: () => void;
  onPullFromSheet?: () => void;
  isSyncing: boolean;
  isPulling?: boolean;
  googleUser: any;
}

export const SalesHistory: React.FC<SalesHistoryProps> = ({
  receipts,
  onViewReceipt,
  onPrintReceipt,
  onDeleteReceipt,
  onClearAllReceipts,
  onSyncReceiptToSheet,
  onUploadReceiptToDriveAndSheet,
  onSyncAllPending,
  onPullFromSheet,
  isSyncing,
  isPulling = false,
  googleUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Clear modal state
  const [showClearModal, setShowClearModal] = useState(false);
  const [resetRunningCounter, setResetRunningCounter] = useState(true);

  const todayStr = new Date().toISOString().split('T')[0];

  // Filtering
  const filteredReceipts = receipts.filter((r) => {
    // Search term matching
    const matchSearch =
      r.receiptNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.customer.company && r.customer.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
      r.staffName.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchSearch) return false;

    // Status filter
    if (statusFilter !== 'all' && r.paymentStatus !== statusFilter) {
      return false;
    }

    // Date filter
    if (dateFilter === 'today') {
      return r.date === todayStr;
    }
    if (dateFilter === 'custom') {
      if (startDate && r.date < startDate) return false;
      if (endDate && r.date > endDate) return false;
    }
    if (dateFilter === 'week') {
      const receiptDate = new Date(r.date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return receiptDate >= weekAgo;
    }
    if (dateFilter === 'month') {
      const receiptDate = new Date(r.date);
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return receiptDate >= monthAgo;
    }

    return true;
  });

  // KPI calculations
  const totalSales = filteredReceipts
    .filter((r) => r.paymentStatus !== 'CANCELLED')
    .reduce((sum, r) => sum + r.grandTotal, 0);

  const totalVat = filteredReceipts
    .filter((r) => r.paymentStatus !== 'CANCELLED')
    .reduce((sum, r) => sum + r.vatAmount, 0);

  const totalDiscount = filteredReceipts
    .filter((r) => r.paymentStatus !== 'CANCELLED')
    .reduce((sum, r) => sum + r.discountAmount, 0);

  const pendingCount = filteredReceipts.filter((r) => r.paymentStatus === 'PENDING').length;
  const pendingSyncCount = receipts.filter((r) => !r.syncedToSheet || !r.driveViewLink).length;

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'เลขที่ใบเสร็จ',
      'วันที่',
      'ลูกค้า',
      'เบอร์โทร',
      'รายการสินค้า',
      'ยอดก่อนภาษี',
      'ส่วนลด',
      'ภาษี 7%',
      'ค่าบริการ',
      'ยอดสุทธิ',
      'สถานะชำระ',
      'วิธีชำระ',
      'ผู้บันทึก',
      'โฟลเดอร์วันที่ในไดรฟ์',
      'ลิงก์ไดรฟ์ PDF',
    ];

    const rows = filteredReceipts.map((r) => [
      `"${r.receiptNo}"`,
      `"${r.date}"`,
      `"${r.customer.name}"`,
      `"${r.customer.phone || ''}"`,
      `"${r.items.map((i) => `${i.description} x${i.quantity}`).join(', ')}"`,
      r.subtotal,
      r.discountAmount,
      r.vatAmount,
      r.serviceCharge,
      r.grandTotal,
      `"${r.paymentStatus}"`,
      `"${r.paymentMethod}"`,
      `"${r.staffName}"`,
      `"${r.date}"`,
      `"${r.driveViewLink || ''}"`,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Venturetec_Sales_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* KPI Cards: 2x2 grid on mobile, 4 columns on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] sm:text-xs font-medium text-slate-500">ยอดขายรวม</p>
            <h3 className="text-base sm:text-xl font-bold font-mono text-teal-900 mt-0.5 sm:mt-1">
              ฿{formatCurrency(totalSales)}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">
              ภาษี ฿{formatCurrency(totalVat)} | ลด ฿{formatCurrency(totalDiscount)}
            </p>
          </div>
          <div className="p-2 sm:p-3 bg-teal-50 text-teal-700 rounded-xl shrink-0">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] sm:text-xs font-medium text-slate-500">จำนวนใบเสร็จ</p>
            <h3 className="text-base sm:text-xl font-bold font-mono text-slate-800 mt-0.5 sm:mt-1">
              {filteredReceipts.length} <span className="text-xs font-normal text-slate-500">รายการ</span>
            </h3>
            <p className="text-[10px] text-teal-600 mt-0.5 hidden sm:block">
              เฉลี่ย ฿{filteredReceipts.length ? formatCurrency(totalSales / filteredReceipts.length) : '0'}/บิล
            </p>
          </div>
          <div className="p-2 sm:p-3 bg-blue-50 text-blue-700 rounded-xl shrink-0">
            <ReceiptIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] sm:text-xs font-medium text-slate-500">รอชำระเงิน</p>
            <h3 className="text-base sm:text-xl font-bold font-mono text-amber-700 mt-0.5 sm:mt-1">
              {pendingCount} <span className="text-xs font-normal text-slate-500">บิล</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">
              {pendingCount > 0 ? 'ต้องติดตามยอด' : 'ชำระครบแล้ว'}
            </p>
          </div>
          <div className="p-2 sm:p-3 bg-amber-50 text-amber-700 rounded-xl shrink-0">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] sm:text-xs font-medium text-slate-500">คลาวด์ ซิงก์</p>
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5 sm:mt-1">
              {pendingSyncCount === 0 ? (
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ซิงก์ครบแล้ว
                </span>
              ) : (
                <span className="text-amber-600 flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5" /> ค้าง {pendingSyncCount} บิล
                </span>
              )}
            </h3>
            <div className="mt-1 flex items-center gap-2 text-[10px] sm:text-[11px]">
              <a href={SPREADSHEET_URL} target="_blank" rel="noreferrer" className="text-teal-700 hover:underline">
                ชีต
              </a>
              <span className="text-slate-300">|</span>
              <a href={DRIVE_FOLDER_URL} target="_blank" rel="noreferrer" className="text-teal-700 hover:underline">
                ไดรฟ์
              </a>
            </div>
          </div>
          <div className="p-2 sm:p-3 bg-emerald-50 text-emerald-700 rounded-xl shrink-0">
            <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>

      {/* Control bar: Search, Filters, CSV Export, Clear Data */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาเลขที่ใบเสร็จ, ชื่อลูกค้า..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Quick Date Filters */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium mr-1 hidden sm:flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> ช่วงเวลา:
            </span>
            {(['all', 'today', 'week', 'month', 'custom'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setDateFilter(filter)}
                className={`px-2.5 py-1 rounded-lg font-medium text-xs transition ${
                  dateFilter === filter
                    ? 'bg-[#007A87] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filter === 'all'
                  ? 'ทั้งหมด'
                  : filter === 'today'
                  ? 'วันนี้'
                  : filter === 'week'
                  ? '7 วัน'
                  : filter === 'month'
                  ? 'เดือนนี้'
                  : 'กำหนดเอง'}
              </button>
            ))}
          </div>

          {/* Actions: Pull from Sheet, Sync All, Export CSV, Clear All Data */}
          <div className="flex flex-wrap items-center gap-2">
            {googleUser && (
              <>
                {onPullFromSheet && (
                  <button
                    type="button"
                    onClick={onPullFromSheet}
                    disabled={isPulling}
                    title="ดึงข้อมูลประวัติการขายและลิงก์ไฟล์ PDF จาก Google Sheet เพื่อซิงก์ข้อมูลข้ามเครื่อง"
                    className="text-xs bg-[#007A87] hover:bg-[#00646e] text-white font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition"
                  >
                    <CloudDownload className={`w-3.5 h-3.5 ${isPulling ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">ดึงข้อมูลจาก Google Sheet</span>
                    <span className="sm:hidden">ดึงข้อมูล</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onSyncAllPending}
                  disabled={isSyncing}
                  title="อัปโหลด PDF เข้าโฟลเดอร์แยกตามวันใน Drive และบันทึกลง Google Sheet"
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition"
                >
                  <CloudUpload className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">ซิงก์ส่งออก Drive ({pendingSyncCount})</span>
                  <span className="sm:hidden">ส่งซิงก์ ({pendingSyncCount})</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-2.5 sm:px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ส่งออก CSV</span>
              <span className="sm:hidden">CSV</span>
            </button>

            {/* Clear All Data Button */}
            <button
              type="button"
              onClick={() => setShowClearModal(true)}
              className="text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-medium px-2.5 sm:px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
              title="ล้างประวัติการขายทั้งหมด"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ล้างข้อมูล</span>
            </button>
          </div>
        </div>

        {/* Custom date range picker if active */}
        {dateFilter === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-600 font-medium">ตั้งแต่:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1"
            />
            <span className="text-slate-600 font-medium">ถึง:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1"
            />
          </div>
        )}
      </div>

      {/* Main Records: Desktop Table (md and up) & Mobile Card List (< md) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Desktop Table View (Identical to original for PC) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#007A87] text-white uppercase text-[11px] font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-3">เลขที่ใบเสร็จ</th>
                <th className="py-3 px-3">วันที่ / โฟลเดอร์ Drive</th>
                <th className="py-3 px-4">ลูกค้า / ผู้สั่งซื้อ</th>
                <th className="py-3 px-4">รายการสินค้า</th>
                <th className="py-3 px-3 text-right">ยอดก่อนลด</th>
                <th className="py-3 px-3 text-right">ส่วนลด</th>
                <th className="py-3 px-3 text-right">ยอดสุทธิ (บาท)</th>
                <th className="py-3 px-3 text-center">สถานะชำระ</th>
                <th className="py-3 px-3 text-center">ชีต / ไดรฟ์ PDF</th>
                <th className="py-3 px-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    ไม่พบข้อมูลประวัติการสั่งซื้อ (คุณสามารถออกใบเสร็จใหม่ได้ที่แท็บ "ออกใบเสร็จรับเงิน")
                  </td>
                </tr>
              ) : (
                filteredReceipts.map((rcpt) => (
                  <tr key={rcpt.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3 font-mono font-bold text-teal-900">
                      {rcpt.receiptNo}
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      <div className="font-medium text-slate-800">{rcpt.date}</div>
                      <div className="text-[10px] text-teal-700 flex items-center gap-1 mt-0.5">
                        <FolderSync className="w-3 h-3" />
                        <span>โฟลเดอร์: {rcpt.date}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{rcpt.customer.name}</div>
                      {rcpt.customer.company && (
                        <div className="text-[11px] text-slate-500">{rcpt.customer.company}</div>
                      )}
                      {rcpt.customer.phone && (
                        <div className="text-[10px] text-slate-400">{rcpt.customer.phone}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="truncate text-slate-700" title={rcpt.items.map(i => `${i.description} x${i.quantity}`).join(', ')}>
                        {rcpt.items.map((i) => `${i.description} (x${i.quantity})`).join(', ')}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {rcpt.items.length} รายการ | ผู้บันทึก: {rcpt.staffName}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600">
                      {formatCurrency(rcpt.subtotal)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-red-500">
                      {rcpt.discountAmount > 0 ? `-${formatCurrency(rcpt.discountAmount)}` : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-teal-950 text-sm whitespace-nowrap">
                      ฿{formatCurrency(rcpt.grandTotal)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rcpt.paymentStatus === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rcpt.paymentStatus === 'CANCELLED'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {rcpt.paymentStatus === 'PAID'
                          ? 'ชำระแล้ว'
                          : rcpt.paymentStatus === 'CANCELLED'
                          ? 'ยกเลิก'
                          : 'รอชำระ'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {rcpt.syncedToSheet ? (
                          <span
                            title="บันทึกลง Google Sheet เรียบร้อยแล้ว"
                            className="text-green-600 p-1 bg-green-50 rounded"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSyncReceiptToSheet(rcpt)}
                            title="คลิกเพื่อบันทึกลง Google Sheet"
                            className="text-amber-600 p-1 bg-amber-50 hover:bg-amber-100 rounded"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {rcpt.driveViewLink ? (
                          <a
                            href={rcpt.driveViewLink}
                            target="_blank"
                            rel="noreferrer"
                            title={`เปิดไฟล์ PDF ในโฟลเดอร์ ${rcpt.date} บน Google Drive`}
                            className="text-blue-600 p-1 bg-blue-50 rounded hover:bg-blue-100 flex items-center gap-0.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onUploadReceiptToDriveAndSheet(rcpt)}
                            title="อัปโหลด PDF เข้าโฟลเดอร์แยกวันใน Drive และบันทึกชีต"
                            className="text-teal-700 bg-teal-50 hover:bg-teal-100 p-1 rounded transition"
                          >
                            <CloudUpload className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onViewReceipt(rcpt)}
                          title="ดูและดาวน์โหลดใบเสร็จ PDF"
                          className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onPrintReceipt(rcpt)}
                          title="พิมพ์ใบเสร็จ"
                          className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`คุณต้องการลบใบเสร็จ ${rcpt.receiptNo} หรือไม่?`)) {
                              onDeleteReceipt(rcpt.id);
                            }
                          }}
                          title="ลบใบเสร็จนี้"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Order Cards View (Exclusively on mobile < md) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredReceipts.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              ไม่พบประวัติการสั่งซื้อ
            </div>
          ) : (
            filteredReceipts.map((rcpt) => (
              <div key={rcpt.id} className="p-3.5 space-y-2.5">
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-xs text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {rcpt.receiptNo}
                    </span>
                    <span className="text-[11px] text-slate-500">{rcpt.date}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      rcpt.paymentStatus === 'PAID'
                        ? 'bg-emerald-100 text-emerald-800'
                        : rcpt.paymentStatus === 'CANCELLED'
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {rcpt.paymentStatus === 'PAID' ? 'ชำระแล้ว' : rcpt.paymentStatus === 'CANCELLED' ? 'ยกเลิก' : 'รอชำระ'}
                  </span>
                </div>

                {/* Customer and Items */}
                <div>
                  <div className="font-semibold text-xs text-slate-900">{rcpt.customer.name}</div>
                  {rcpt.customer.phone && (
                    <div className="text-[11px] text-slate-400">{rcpt.customer.phone}</div>
                  )}
                  <p className="text-[11px] text-slate-600 truncate mt-1">
                    {rcpt.items.map((i) => `${i.description} (x${i.quantity})`).join(', ')}
                  </p>
                </div>

                {/* Amount and Action bar */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">ยอดรวมสุทธิ</span>
                    <span className="text-base font-bold font-mono text-teal-950">
                      ฿{formatCurrency(rcpt.grandTotal)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {rcpt.driveViewLink ? (
                      <a
                        href={rcpt.driveViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg"
                        title="เปิด PDF ใน Drive"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onUploadReceiptToDriveAndSheet(rcpt)}
                        className="p-1.5 text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg"
                        title="อัปโหลดเข้า Drive & Sheet"
                      >
                        <CloudUpload className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onViewReceipt(rcpt)}
                      className="p-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                      title="ดูใบเสร็จ"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onPrintReceipt(rcpt)}
                      className="p-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                      title="พิมพ์"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`คุณต้องการลบใบเสร็จ ${rcpt.receiptNo} หรือไม่?`)) {
                          onDeleteReceipt(rcpt.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="ลบ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Clear All Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 sm:p-3 bg-red-100 rounded-xl">
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900">ยืนยันการล้างข้อมูลทั้งหมด</h3>
                <p className="text-xs text-slate-500">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              คุณกำลังจะลบประวัติการขายและใบเสร็จทั้งหมดจำนวน <span className="font-bold text-red-600">{receipts.length} รายการ</span> ออกจากระบบ
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={resetRunningCounter}
                  onChange={(e) => setResetRunningCounter(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
                <span>รีเซ็ตเลข Running Number ให้เริ่มนับใหม่จาก 0001 (เช่น MS-2026-0001)</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-100 text-xs font-medium text-slate-700"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearAllReceipts(resetRunningCounter);
                  setShowClearModal(false);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-medium shadow-sm"
              >
                ยืนยันล้างข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
