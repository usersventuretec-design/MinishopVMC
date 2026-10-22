import React, { useState } from 'react';
import {
  ShieldAlert,
  Copy,
  Check,
  ExternalLink,
  X,
  RefreshCw,
  KeyRound,
  Sparkles,
} from 'lucide-react';

interface UnauthorizedDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  onDirectGisLogin?: () => Promise<void> | void;
  onSetManualToken?: (token: string) => void;
  projectId?: string;
}

export const UnauthorizedDomainModal: React.FC<UnauthorizedDomainModalProps> = ({
  isOpen,
  onClose,
  onRetry,
  onDirectGisLogin,
  onSetManualToken,
  projectId = 'gen-lang-client-0741774253',
}) => {
  const [copiedCurrent, setCopiedCurrent] = useState(false);
  const [copiedShared, setCopiedShared] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [isGisWorking, setIsGisWorking] = useState(false);

  if (!isOpen) return null;

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const sharedHostname = currentHostname.replace('ais-dev-', 'ais-pre-');
  const firebaseSettingsUrl = `https://console.firebase.google.com/project/${projectId}/authentication/settings`;

  const copyToClipboard = async (text: string, isShared: boolean = false) => {
    try {
      await navigator.clipboard.writeText(text);
      if (isShared) {
        setCopiedShared(true);
        setTimeout(() => setCopiedShared(false), 2000);
      } else {
        setCopiedCurrent(true);
        setTimeout(() => setCopiedCurrent(false), 2000);
      }
    } catch (e) {
      console.warn('Copy failed', e);
    }
  };

  const handleApplyManualToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualToken.trim() && onSetManualToken) {
      onSetManualToken(manualToken.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 my-6 border border-slate-200">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/20 rounded-lg">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                แจ้งเตือน: โดเมนยังไม่ได้รับอนุญาตใน Firebase
              </h3>
              <p className="text-[11px] text-amber-100">
                Firebase Error (auth/unauthorized-domain)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs text-slate-700">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900 leading-relaxed">
            <p className="font-semibold text-[13px] text-amber-950 mb-1">
              สาเหตุที่พบข้อผิดพลาดนี้:
            </p>
            ระบบความปลอดภัยของ Firebase กำหนดให้ต้องเพิ่มชื่อโดเมนของเว็บไซต์นี้ลงในรายชื่อ{' '}
            <span className="font-semibold underline">"Authorized domains" (โดเมนที่ได้รับอนุญาต)</span>{' '}
            ก่อน ถึงจะยอมให้เข้าสู่ระบบด้วย Google ผ่านหน้านี้ได้ครับ
          </div>

          {/* Copy domain boxes */}
          <div className="space-y-2.5">
            <p className="font-semibold text-slate-800 text-xs">
              ชื่อโดเมนที่ต้องนำไปเพิ่มใน Firebase Console:
            </p>

            {/* Current dev domain */}
            <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-300 rounded-lg">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  โดเมนปัจจุบัน (Development):
                </span>
                <span className="font-mono text-xs font-semibold text-teal-800 break-all select-all">
                  {currentHostname}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(currentHostname, false)}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-medium transition shrink-0 ${
                  copiedCurrent
                    ? 'bg-emerald-600 text-white'
                    : 'bg-teal-700 hover:bg-teal-800 text-white shadow-xs'
                }`}
              >
                {copiedCurrent ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCurrent ? 'คัดลอกแล้ว!' : 'คัดลอก'}</span>
              </button>
            </div>

            {/* Shared domain if different */}
            {sharedHostname !== currentHostname && (
              <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    โดเมนพรีวิวแชร์ (Shared / Preview):
                  </span>
                  <span className="font-mono text-[11px] text-slate-700 break-all select-all">
                    {sharedHostname}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(sharedHostname, true)}
                  className={`px-2.5 py-1 rounded-md flex items-center gap-1 text-[11px] font-medium transition shrink-0 ${
                    copiedShared
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  {copiedShared ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedShared ? 'คัดลอกแล้ว!' : 'คัดลอก'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Steps */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <p className="font-bold text-slate-800 text-xs">วิธีแก้ไขง่ายๆ ใน 3 ขั้นตอน:</p>
            <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-600 leading-relaxed">
              <li>
                คลิกปุ่มสีน้ำเงินด้านล่างเพื่อเปิดหน้าตั้งค่า <strong>Firebase Settings</strong>
              </li>
              <li>
                เลื่อนลงไปที่หัวข้อ <strong>"Authorized domains" (โดเมนที่ได้รับอนุญาต)</strong> แล้วคลิกปุ่ม <strong>"Add domain"</strong>
              </li>
              <li>
                วางชื่อโดเมนที่คัดลอกไว้ แล้วกด <strong>Add (บันทึก)</strong>
              </li>
            </ol>
          </div>

          {/* Direct Firebase link button */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <a
              href={firebaseSettingsUrl}
              target="_blank"
              rel="noreferrer"
              className="bg-[#007A87] hover:bg-[#00606a] text-white py-2.5 px-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition shadow-xs text-xs text-center"
            >
              <span>ไปที่ Firebase Settings</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </a>

            {onDirectGisLogin && (
              <button
                type="button"
                disabled={isGisWorking}
                onClick={async () => {
                  try {
                    setIsGisWorking(true);
                    await onDirectGisLogin();
                    onClose();
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setIsGisWorking(false);
                  }
                }}
                className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white py-2.5 px-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition shadow-xs text-xs"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>{isGisWorking ? 'กำลังเชื่อมต่อ...' : 'เข้าสู่ระบบตรง (GIS Login)'}</span>
              </button>
            )}
          </div>

          {/* Fallback: Direct Access Token Manual Input */}
          <div className="pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowManualInput(!showManualInput)}
              className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{showManualInput ? 'ซ่อนช่องทางเลือก' : 'หรือใช้ Google Access Token สำรองโดยตรง'}</span>
            </button>

            {showManualInput && (
              <form onSubmit={handleApplyManualToken} className="mt-2.5 space-y-2">
                <p className="text-[11px] text-slate-600">
                  หากคุณมี Google OAuth Access Token หรือต้องการทดสอบการเชื่อมต่อ Google Sheets & Drive โดยไม่ต้องรอเพิ่มโดเมน สามารถวาง Token ที่นี่ได้ครับ:
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="ya29.a0Ac..."
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-xs focus:ring-1 focus:ring-teal-500 outline-hidden"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-slate-800 hover:bg-black text-white font-medium rounded-lg text-xs"
                  >
                    ใช้งาน
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-200 text-slate-700 font-medium rounded-lg border border-slate-300 text-xs transition"
          >
            ปิดหน้าต่าง
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onRetry();
            }}
            className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-lg text-xs flex items-center gap-1.5 transition shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>เพิ่มโดเมนแล้ว ลองล็อกอินใหม่</span>
          </button>
        </div>
      </div>
    </div>
  );
};
