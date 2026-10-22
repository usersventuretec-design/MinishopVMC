import React, { useRef, useState } from 'react';
import {
  Printer,
  Download,
  CloudUpload,
  ExternalLink,
  X,
  CheckCircle,
  FileText,
  Edit3,
} from 'lucide-react';
import { CompanyInfo, Receipt } from '../types';
import { ReceiptDocument } from './ReceiptDocument';
import { downloadReceiptPdf, generateReceiptPdfBlob } from '../utils/pdfGenerator';
import { uploadReceiptPdfToDrive, TARGET_FOLDER_ID } from '../services/googleDrive';
import { appendReceiptToGoogleSheet } from '../services/googleSheets';

interface ReceiptModalProps {
  receipt: Receipt;
  companyInfo: CompanyInfo;
  onClose: () => void;
  onEdit?: (receipt: Receipt) => void;
  onReceiptUpdated?: (receipt: Receipt) => void;
  googleAccessToken: string | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  receipt,
  companyInfo,
  onClose,
  onEdit,
  onReceiptUpdated,
  googleAccessToken,
}) => {
  const documentRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(receipt.driveViewLink || null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (!documentRef.current) return;
    try {
      setIsGeneratingPdf(true);
      await downloadReceiptPdf(documentRef.current, `Receipt_${receipt.receiptNo}.pdf`);
    } catch (err: any) {
      console.error('Download PDF error:', err);
      alert('เกิดข้อผิดพลาดในการดาวน์โหลด PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleUploadDrive = async () => {
    if (!documentRef.current) return;
    if (!googleAccessToken) {
      alert('กรุณาลงชื่อเข้าใช้ Google เพื่ออัปโหลดไฟล์ไปยัง Google Drive');
      return;
    }

    try {
      setIsUploadingDrive(true);
      setErrorMessage(null);
      const pdfBlob = await generateReceiptPdfBlob(documentRef.current);
      const filename = `Receipt_${receipt.receiptNo}_${receipt.customer.name.replace(/\s+/g, '_')}.pdf`;
      const result = await uploadReceiptPdfToDrive(
        pdfBlob,
        filename,
        googleAccessToken,
        receipt.date,
        TARGET_FOLDER_ID
      );

      setUploadSuccess(result.webViewLink);

      // Also update receipt with link
      const updatedReceipt: Receipt = {
        ...receipt,
        driveFileId: result.fileId,
        driveViewLink: result.webViewLink,
      };

      // Also append or update in Google Sheet with the Drive link!
      try {
        await appendReceiptToGoogleSheet(updatedReceipt, googleAccessToken, undefined, result.webViewLink);
        updatedReceipt.syncedToSheet = true;
      } catch (sheetErr) {
        console.warn('Sheet sync warning:', sheetErr);
      }

      if (onReceiptUpdated) {
        onReceiptUpdated(updatedReceipt);
      }
    } catch (err: any) {
      console.error('Upload to Drive failed:', err);
      setErrorMessage(err.message || 'ไม่สามารถอัปโหลดไปยัง Google Drive ได้');
    } finally {
      setIsUploadingDrive(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-100 rounded-2xl max-w-4xl w-full max-h-[96vh] flex flex-col shadow-2xl overflow-hidden border border-slate-300">
        {/* Action Header (No-print) */}
        <div className="no-print p-3 sm:p-4 bg-white border-b border-slate-200">
          {/* Top row: Title & Close Button */}
          <div className="flex items-center justify-between gap-2 mb-2 sm:mb-0 sm:float-none">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-teal-50 text-teal-800 rounded-lg shrink-0">
                <FileText className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <span>ใบเสร็จรับเงิน</span>
                  <span className="font-mono text-teal-900">{receipt.receiptNo}</span>
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 truncate max-w-[200px] sm:max-w-none">
                  {receipt.customer.name} | {receipt.date}
                </p>
              </div>
            </div>

            <div className="flex items-center sm:hidden">
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Action buttons: Desktop flex row & Mobile 2x2 grid */}
          <div className="mt-2.5 sm:mt-0 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(receipt)}
                  className="px-3 py-2 sm:py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center justify-center gap-1.5 transition text-center"
                >
                  <Edit3 className="w-3.5 h-3.5 shrink-0" />
                  <span>แก้ไขข้อมูล</span>
                </button>
              )}

              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-2 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium flex items-center justify-center gap-1.5 shadow-xs transition text-center"
              >
                <Printer className="w-3.5 h-3.5 shrink-0" />
                <span>พิมพ์ (Print)</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                disabled={isGeneratingPdf}
                className="px-3.5 py-2 sm:py-1.5 rounded-lg border border-teal-600 text-teal-700 hover:bg-teal-50 text-xs font-medium flex items-center justify-center gap-1.5 transition text-center"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{isGeneratingPdf ? 'กำลังสร้าง...' : 'ดาวน์โหลด PDF'}</span>
              </button>

              <button
                type="button"
                onClick={handleUploadDrive}
                disabled={isUploadingDrive}
                className="px-3.5 py-2 sm:py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium flex items-center justify-center gap-1.5 shadow-xs transition text-center col-span-2 sm:col-span-1"
              >
                <CloudUpload className={`w-3.5 h-3.5 shrink-0 ${isUploadingDrive ? 'animate-spin' : ''}`} />
                <span className="truncate">{isUploadingDrive ? 'กำลังอัปโหลด...' : 'อัปโหลดไป Drive'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="hidden sm:inline-flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition ml-1"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Swipe Hint Banner */}
        <div className="md:hidden bg-teal-50/90 border-b border-teal-200 px-3 py-1.5 text-[11px] text-teal-800 flex items-center justify-center gap-1.5 font-medium">
          <span>👈 เลื่อนซ้าย-ขวา เพื่อดูเอกสาร A4 ฉบับเต็ม 👉</span>
        </div>

        {/* Status banner for upload/error */}
        {uploadSuccess && (
          <div className="no-print bg-emerald-50 border-b border-emerald-200 px-4 py-2 flex items-center justify-between text-xs text-emerald-900">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate">บันทึกไฟล์ PDF ไปยัง Drive สำเร็จ</span>
            </span>
            <a
              href={uploadSuccess}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-700 hover:underline flex items-center gap-1 font-bold shrink-0 ml-2"
            >
              เปิดไฟล์ <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {errorMessage && (
          <div className="no-print bg-red-50 border-b border-red-200 px-4 py-2 text-xs text-red-700">
            {errorMessage}
          </div>
        )}

        {/* Scrollable Document Area with touch-scrolling */}
        <div className="p-2 sm:p-6 overflow-x-auto overflow-y-auto flex-1 bg-slate-200/70" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="min-w-[794px] mx-auto flex justify-center py-2 sm:py-0">
            <ReceiptDocument
              ref={documentRef}
              receipt={receipt}
              companyInfo={companyInfo}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
