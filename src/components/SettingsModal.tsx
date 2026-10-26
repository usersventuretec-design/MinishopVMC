import React, { useState } from 'react';
import { CompanyInfo } from '../types';
import { RunningConfig } from '../services/storage';
import { DEFAULT_COMPANY_INFO } from '../data/defaultProducts';
import { VENTURETEC_LOGO_SRC } from '../data/logoBase64';
import {
  Building2,
  Hash,
  Save,
  X,
  ExternalLink,
  RotateCcw,
  FileSpreadsheet,
  FolderSync,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import {
  DEFAULT_TARGET_SPREADSHEET_ID,
  getTargetSpreadsheetId,
  setTargetSpreadsheetId,
  getSpreadsheetUrl,
} from '../services/googleSheets';
import {
  DEFAULT_TARGET_FOLDER_ID,
  getTargetFolderId,
  setTargetFolderId,
  getDriveFolderUrl,
} from '../services/googleDrive';

interface SettingsModalProps {
  companyInfo: CompanyInfo;
  runningConfig: RunningConfig;
  onSaveCompany: (info: CompanyInfo) => void;
  onSaveRunning: (config: RunningConfig) => void;
  onSaveWorkspace?: (sheetId: string, folderId: string) => void;
  onResetReceipts?: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  companyInfo,
  runningConfig,
  onSaveCompany,
  onSaveRunning,
  onSaveWorkspace,
  onResetReceipts,
  onClose,
}) => {
  const [info, setInfo] = useState<CompanyInfo>({ ...companyInfo });
  const [config, setConfig] = useState<RunningConfig>({ ...runningConfig });
  const [sheetId, setSheetId] = useState<string>(getTargetSpreadsheetId());
  const [folderId, setFolderId] = useState<string>(getTargetFolderId());
  const [resetSuccess, setResetSuccess] = useState<boolean>(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveCompany(info);
    onSaveRunning(config);
    setTargetSpreadsheetId(sheetId);
    setTargetFolderId(folderId);
    if (onSaveWorkspace) {
      onSaveWorkspace(sheetId, folderId);
    }
    onClose();
  };

  const handleResetAllToDefaults = () => {
    if (window.confirm('คุณต้องการรีเซ็ตการตั้งค่าทั้งหมดกลับเป็นค่าเริ่มต้นเดิมของระบบใช่หรือไม่?')) {
      setInfo({ ...DEFAULT_COMPANY_INFO });
      setConfig({
        prefix: 'MS',
        yearFormat: 'YYYY',
        digits: 4,
        lastNumber: 0,
      });
      setSheetId(DEFAULT_TARGET_SPREADSHEET_ID);
      setFolderId(DEFAULT_TARGET_FOLDER_ID);
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 my-8"
      >
        <div className="p-4 bg-[#007A87] text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            <h3 className="font-bold text-base">การตั้งค่าระบบและบริษัท (Settings)</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-teal-900/50 hover:bg-teal-900 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
          {resetSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>คืนค่าการตั้งค่าเริ่มต้นเดิมของระบบทั้งหมดเรียบร้อยแล้ว (กดบันทึกเพื่อยืนยัน)</span>
            </div>
          )}

          {/* Running number settings */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
              <Hash className="w-4 h-4 text-teal-600" />
              การกำหนดเลขที่ใบเสร็จ (Running Number System)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  คำนำหน้า (Prefix)
                </label>
                <input
                  type="text"
                  value={config.prefix}
                  onChange={(e) => setConfig({ ...config, prefix: e.target.value.toUpperCase() })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono uppercase bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  จำนวนหลักลำดับ (Digits)
                </label>
                <input
                  type="number"
                  min="3"
                  max="6"
                  value={config.digits}
                  onChange={(e) => setConfig({ ...config, digits: parseInt(e.target.value, 10) || 4 })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  ลำดับล่าสุด (Current Seq)
                </label>
                <input
                  type="number"
                  min="0"
                  value={config.lastNumber}
                  onChange={(e) => setConfig({ ...config, lastNumber: parseInt(e.target.value, 10) || 0 })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono bg-white"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              ตัวอย่างรูปแบบเลขที่ใบเสร็จ:{' '}
              <span className="font-mono font-bold text-teal-800">
                {config.prefix}-{new Date().getFullYear()}-
                {String((config.lastNumber || 0) + 1).padStart(config.digits, '0')}
              </span>
            </p>
          </div>

          {/* Reset Receipts Section */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
            <h4 className="font-bold text-amber-900 text-sm flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-amber-600" />
              ย้อนคืนใบเสร็จและประวัติการขาย
            </h4>
            <p className="text-[11px] text-amber-800">
              หากต้องการย้อนคืนใบเสร็จตัวอย่างเริ่มต้น (2 รายการ) สามารถกดปุ่มด้านล่างนี้ได้ทันที
            </p>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('คุณต้องการย้อนคืนใบเสร็จทั้งหมดกลับสู่ค่าเริ่มต้นของระบบใช่หรือไม่?')) {
                  if (onResetReceipts) onResetReceipts();
                  alert('ย้อนคืนใบเสร็จกลับสู่ค่าเริ่มต้นเรียบร้อยแล้ว');
                }
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-xs transition shadow-sm flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ย้อนคืนใบเสร็จกลับสู่ค่าเริ่มต้น</span>
            </button>
          </div>

          {/* Company Info */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 text-sm">ข้อมูลบริษัท & โลโก้ในหัวใบเสร็จ</h4>

            {/* Logo Upload & URL Box */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 sm:col-span-2">
              <label className="block text-slate-700 font-bold mb-1">
                โลโก้บริษัท / WASABI-O Logo (URL หรืออัปโหลดจากเครื่อง)
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="w-24 h-16 bg-white border border-slate-200 rounded-lg flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-2xs">
                  <img
                    src={info.logoUrl || VENTURETEC_LOGO_SRC}
                    alt="Logo Preview"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = VENTURETEC_LOGO_SRC;
                    }}
                  />
                </div>
                <div className="flex-1 w-full space-y-2">
                  <input
                    type="text"
                    value={info.logoUrl || ''}
                    onChange={(e) => setInfo({ ...info, logoUrl: e.target.value })}
                    placeholder="ใส่ลิงก์รูปภาพโลโก้ (เช่น Google Drive link หรือ URL ตรง)"
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-[11px] font-mono bg-white"
                  />
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer px-3 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-lg text-[11px] font-medium flex items-center gap-1 transition">
                      <span>อัปโหลดรูปโลโก้จากเครื่อง</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const { compressImageFile } = await import('../data/productImages');
                            const base64 = await compressImageFile(file, 600, 300);
                            setInfo({ ...info, logoUrl: base64 });
                          } catch (err) {
                            console.error('Logo upload error:', err);
                            alert('ไม่สามารถอัปโหลดรูปโลโก้ได้');
                          }
                        }}
                      />
                    </label>
                    <span className="text-[10px] text-slate-500">
                      (แนะนำ: ลิงก์ Google Drive ต้องตั้งค่าการแชร์เป็น <span className="text-teal-800 font-semibold">&quot;ทุกคนที่มีลิงก์สามารถดูได้&quot;</span>)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-medium mb-1">ชื่อบริษัท (อังกฤษ)</label>
                <input
                  type="text"
                  value={info.name}
                  onChange={(e) => setInfo({ ...info, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-medium mb-1">ที่อยู่บริษัท</label>
                <input
                  type="text"
                  value={info.address}
                  onChange={(e) => setInfo({ ...info, address: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">รหัสไปรษณีย์</label>
                <input
                  type="text"
                  value={info.postalCode}
                  onChange={(e) => setInfo({ ...info, postalCode: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  เลขประจำตัวผู้เสียภาษี
                </label>
                <input
                  type="text"
                  value={info.taxId}
                  onChange={(e) => setInfo({ ...info, taxId: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">เบอร์โทรศัพท์</label>
                <input
                  type="text"
                  value={info.phone}
                  onChange={(e) => setInfo({ ...info, phone: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">เบอร์โทรสาร (Fax)</label>
                <input
                  type="text"
                  value={info.fax}
                  onChange={(e) => setInfo({ ...info, fax: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">อีเมล</label>
                <input
                  type="email"
                  value={info.email}
                  onChange={(e) => setInfo({ ...info, email: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">เว็บไซต์</label>
                <input
                  type="text"
                  value={info.website}
                  onChange={(e) => setInfo({ ...info, website: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">เลขบัญชีธนาคาร</label>
                <input
                  type="text"
                  value={info.bankAccount}
                  onChange={(e) => setInfo({ ...info, bankAccount: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">ธนาคาร</label>
                <input
                  type="text"
                  value={info.bankName}
                  onChange={(e) => setInfo({ ...info, bankName: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Connected Google Links & ID Configuration */}
          <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl space-y-4 text-slate-700">
            <div className="flex items-center justify-between">
              <h5 className="font-bold text-teal-900 text-sm flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                การเชื่อมต่อ Google Workspace & ID หลัก
              </h5>
              <span className="text-[10px] text-teal-700 bg-teal-100/70 px-2 py-0.5 rounded font-medium">
                รองรับการเปลี่ยนเป็น ID หลัก
              </span>
            </div>

            {/* Google Sheet ID input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-medium text-slate-700 flex items-center gap-1">
                  <span>Google Sheet ID (ตารางบันทึกการขาย):</span>
                </label>
                <div className="flex items-center gap-2">
                  {sheetId !== DEFAULT_TARGET_SPREADSHEET_ID && (
                    <button
                      type="button"
                      onClick={() => setSheetId(DEFAULT_TARGET_SPREADSHEET_ID)}
                      className="text-[10px] text-teal-700 hover:text-teal-900 underline flex items-center gap-0.5"
                      title="คืนค่าเป็น ID เริ่มต้นเดิม"
                    >
                      <RotateCcw className="w-2.5 h-2.5" /> คืนค่าเดิม
                    </button>
                  )}
                  <a
                    href={getSpreadsheetUrl(sheetId)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-teal-700 hover:text-teal-900 flex items-center gap-0.5 text-[11px] underline"
                  >
                    เปิด Sheet <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <input
                type="text"
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value.trim())}
                placeholder="ระบุ Google Spreadsheet ID เช่น 1SDuEa3IZapuQtnHUH9QGxA8kjfz4JlpyiX0BtnTr24o"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono text-[11px] bg-white text-slate-800"
              />
              <p className="text-[10px] text-slate-500">
                ค่าเริ่มต้นเดิม: <span className="font-mono text-slate-600">{DEFAULT_TARGET_SPREADSHEET_ID}</span>
              </p>
            </div>

            {/* Google Drive Folder ID input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-medium text-slate-700 flex items-center gap-1">
                  <span>Google Drive Folder ID (โฟลเดอร์เก็บ PDF):</span>
                </label>
                <div className="flex items-center gap-2">
                  {folderId !== DEFAULT_TARGET_FOLDER_ID && (
                    <button
                      type="button"
                      onClick={() => setFolderId(DEFAULT_TARGET_FOLDER_ID)}
                      className="text-[10px] text-blue-700 hover:text-blue-900 underline flex items-center gap-0.5"
                      title="คืนค่าเป็น ID เริ่มต้นเดิม"
                    >
                      <RotateCcw className="w-2.5 h-2.5" /> คืนค่าเดิม
                    </button>
                  )}
                  <a
                    href={getDriveFolderUrl(folderId)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-700 hover:text-blue-900 flex items-center gap-0.5 text-[11px] underline"
                  >
                    เปิด Drive <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <input
                type="text"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value.trim())}
                placeholder="ระบุ Google Drive Folder ID เช่น 1vDmg8E2TWD67uvmN-mtz9VT84EQqBNbD"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono text-[11px] bg-white text-slate-800"
              />
              <p className="text-[10px] text-slate-500">
                ค่าเริ่มต้นเดิม: <span className="font-mono text-slate-600">{DEFAULT_TARGET_FOLDER_ID}</span>
              </p>
            </div>

            {/* Main Firebase Project Reference Notice */}
            <div className="p-2.5 bg-white/80 border border-teal-100 rounded-lg text-[11px] text-slate-600 space-y-1">
              <div className="font-medium text-slate-800 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-teal-700" />
                <span>สำหรับนำไปเชื่อมต่อ ID หลัก / Firebase หลัก:</span>
              </div>
              <p>
                • การตั้งค่า Firebase & Google OAuth บันทึกอยู่ที่ไฟล์ <code className="bg-slate-100 px-1 py-0.5 rounded text-teal-800 font-mono">firebase-applet-config.json</code>
              </p>
              <p>
                • หากต้องการผูกกับ Google Cloud / Firebase หลักของคุณ สามารถแก้ไขไฟล์ดังกล่าว หรือใส่ Google Sheet ID / Drive Folder ID ของคุณข้างต้นได้โดยตรง
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <button
            type="button"
            onClick={handleResetAllToDefaults}
            className="px-3 py-2 border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-700 rounded-lg font-medium flex items-center gap-1.5 transition"
            title="คืนค่าการตั้งค่าทั้งหมดกลับเป็นค่าเริ่มต้นเดิมของโครงการ"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            คืนค่าเดิมทั้งหมด
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 font-medium text-slate-700 transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#007A87] hover:bg-[#00646e] text-white rounded-lg font-medium flex items-center gap-1.5 shadow-xs transition"
            >
              <Save className="w-3.5 h-3.5" />
              บันทึกการตั้งค่า
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
