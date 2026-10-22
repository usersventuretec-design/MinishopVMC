import React from 'react';
import {
  ExternalLink,
  CheckCircle,
  FileSpreadsheet,
  FolderSync,
  LogOut,
  RefreshCw,
  CloudDownload,
} from 'lucide-react';
import { SPREADSHEET_URL } from '../services/googleSheets';
import { DRIVE_FOLDER_URL } from '../services/googleDrive';

interface GoogleWorkspaceBarProps {
  user: any;
  accessToken?: string | null;
  isLoggingIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onSyncAll: () => void;
  onPullFromSheet?: () => void;
  isSyncing: boolean;
  isPulling?: boolean;
  pendingCount: number;
}

export const GoogleWorkspaceBar: React.FC<GoogleWorkspaceBarProps> = ({
  user,
  accessToken,
  isLoggingIn,
  onLogin,
  onLogout,
  onSyncAll,
  onPullFromSheet,
  isSyncing,
  isPulling = false,
  pendingCount,
}) => {
  return (
    <div className="bg-white border-b border-slate-200 px-3 sm:px-4 py-2 sm:py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 text-xs shadow-xs">
      {/* Left: Google Workspace Connection Badges */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Google Sheet badge */}
        <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-900 border border-emerald-200 px-2 sm:px-2.5 py-1 rounded-lg">
          <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold text-[11px] sm:text-xs">Google Sheet:</span>
          <span className="text-[10px] sm:text-[11px] text-emerald-800 font-mono hidden md:inline">
            1SDuEa3...BtnTr24o
          </span>
          <a
            href={SPREADSHEET_URL}
            target="_blank"
            rel="noreferrer"
            title="เปิด Google Sheet บันทึกการขาย"
            className="text-emerald-700 hover:text-emerald-900 p-0.5 hover:bg-emerald-100 rounded flex items-center"
          >
            <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </a>
        </div>

        {/* Google Drive Folder badge */}
        <div className="flex items-center gap-1.5 bg-blue-50 text-blue-900 border border-blue-200 px-2 sm:px-2.5 py-1 rounded-lg">
          <FolderSync className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
          <span className="font-semibold text-[11px] sm:text-xs">Google Drive:</span>
          <span className="text-[10px] sm:text-[11px] text-blue-800 font-mono hidden md:inline">
            1vDmg8E2...EQqBNbD
          </span>
          <a
            href={DRIVE_FOLDER_URL}
            target="_blank"
            rel="noreferrer"
            title="เปิดโฟลเดอร์เก็บ PDF ใน Google Drive"
            className="text-blue-700 hover:text-blue-900 p-0.5 hover:bg-blue-100 rounded flex items-center"
          >
            <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </a>
        </div>

        {/* Sync status indicator & Pull button */}
        {user && (
          <div className="flex items-center gap-1.5 text-slate-600">
            {onPullFromSheet && (
              <button
                type="button"
                onClick={onPullFromSheet}
                disabled={isPulling}
                title="ดึงข้อมูลประวัติการขายและลิงก์ PDF ล่าสุดจาก Google Sheet เข้าสู่เครื่องนี้"
                className="text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2 py-0.5 rounded flex items-center gap-1 font-medium text-[11px] transition"
              >
                <CloudDownload className={`w-3 h-3 ${isPulling ? 'animate-spin' : ''}`} />
                <span>{isPulling ? 'กำลังดึงข้อมูล...' : 'ดึงข้อมูลจาก Sheet'}</span>
              </button>
            )}

            {pendingCount === 0 ? (
              <span className="text-emerald-600 flex items-center gap-1 font-medium text-[11px]">
                <CheckCircle className="w-3.5 h-3.5" /> ซิงก์เรียบร้อย
              </span>
            ) : (
              <button
                type="button"
                onClick={onSyncAll}
                disabled={isSyncing}
                className="text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1 font-medium text-[11px] transition"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                รอส่งซิงก์ {pendingCount} รายการ
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right: Auth Status / Sign-in */}
      <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
        {user ? (
          <div className="flex items-center gap-2">
            {!accessToken && (
              <button
                type="button"
                onClick={onLogin}
                disabled={isLoggingIn}
                className="text-[11px] bg-amber-500 hover:bg-amber-600 text-white font-medium px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs transition animate-pulse"
                title="Google Token หมดอายุ กดเพื่อต่ออายุและซิงก์ข้อมูล"
              >
                <RefreshCw className="w-3 h-3" />
                <span>ต่ออายุสิทธิ์ Google</span>
              </button>
            )}

            <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg max-w-[200px]">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Google User'}
                  className="w-4 h-4 sm:w-5 sm:h-5 rounded-full shrink-0"
                />
              ) : (
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center font-bold shrink-0">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <span className="font-medium text-slate-800 text-[11px] sm:text-xs truncate">
                {user.displayName || user.email}
              </span>
            </div>

            <button
              type="button"
              onClick={onLogout}
              title="ออกจากระบบ Google"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onLogin}
            disabled={isLoggingIn}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg font-medium text-xs shadow-xs transition"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
            </svg>
            <span className="truncate">{isLoggingIn ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ Google เพื่อซิงก์'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
