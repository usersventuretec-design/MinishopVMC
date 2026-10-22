import React, { useState } from 'react';
import { CompanyInfo } from '../types';
import { RunningConfig } from '../services/storage';
import { Building2, Hash, Save, X, ExternalLink } from 'lucide-react';
import { SPREADSHEET_URL, TARGET_SPREADSHEET_ID } from '../services/googleSheets';
import { DRIVE_FOLDER_URL, TARGET_FOLDER_ID } from '../services/googleDrive';

interface SettingsModalProps {
  companyInfo: CompanyInfo;
  runningConfig: RunningConfig;
  onSaveCompany: (info: CompanyInfo) => void;
  onSaveRunning: (config: RunningConfig) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  companyInfo,
  runningConfig,
  onSaveCompany,
  onSaveRunning,
  onClose,
}) => {
  const [info, setInfo] = useState<CompanyInfo>({ ...companyInfo });
  const [config, setConfig] = useState<RunningConfig>({ ...runningConfig });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveCompany(info);
    onSaveRunning(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95"
      >
        <div className="p-4 bg-[#007A87] text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            <h3 className="font-bold text-base">การตั้งค่าระบบและบริษัท (Settings)</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-teal-900/50 hover:bg-teal-900 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs max-h-[80vh] overflow-y-auto">
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
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono uppercase"
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
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono"
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
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono"
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

          {/* Company Info */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 text-sm">ข้อมูลบริษัทในหัวใบเสร็จ</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-medium mb-1">ชื่อบริษัท (อังกฤษ)</label>
                <input
                  type="text"
                  value={info.name}
                  onChange={(e) => setInfo({ ...info, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-medium mb-1">ที่อยู่บริษัท</label>
                <input
                  type="text"
                  value={info.address}
                  onChange={(e) => setInfo({ ...info, address: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">รหัสไปรษณีย์</label>
                <input
                  type="text"
                  value={info.postalCode}
                  onChange={(e) => setInfo({ ...info, postalCode: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono"
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
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">เบอร์โทรศัพท์</label>
                <input
                  type="text"
                  value={info.phone}
                  onChange={(e) => setInfo({ ...info, phone: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">เบอร์โทรสาร (Fax)</label>
                <input
                  type="text"
                  value={info.fax}
                  onChange={(e) => setInfo({ ...info, fax: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">อีเมล</label>
                <input
                  type="email"
                  value={info.email}
                  onChange={(e) => setInfo({ ...info, email: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">เว็บไซต์</label>
                <input
                  type="text"
                  value={info.website}
                  onChange={(e) => setInfo({ ...info, website: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">เลขบัญชีธนาคาร</label>
                <input
                  type="text"
                  value={info.bankAccount}
                  onChange={(e) => setInfo({ ...info, bankAccount: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">ธนาคาร</label>
                <input
                  type="text"
                  value={info.bankName}
                  onChange={(e) => setInfo({ ...info, bankName: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>
          </div>

          {/* Connected Google Links */}
          <div className="p-3 bg-teal-50/60 border border-teal-200 rounded-xl space-y-1 text-slate-700">
            <h5 className="font-bold text-teal-900">การเชื่อมต่อ Google Workspace</h5>
            <p className="text-[11px] text-slate-600">
              • Google Drive Folder ID:{' '}
              <a
                href={DRIVE_FOLDER_URL}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-teal-700 underline"
              >
                {TARGET_FOLDER_ID}
              </a>
            </p>
            <p className="text-[11px] text-slate-600">
              • Google Sheet ID:{' '}
              <a
                href={SPREADSHEET_URL}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-teal-700 underline"
              >
                {TARGET_SPREADSHEET_ID}
              </a>
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 font-medium text-slate-700"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            className="px-5 py-2 bg-[#007A87] hover:bg-[#00646e] text-white rounded-lg font-medium flex items-center gap-1.5 shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            บันทึกการตั้งค่า
          </button>
        </div>
      </form>
    </div>
  );
};
