import React, { useState, useEffect } from 'react';
import {
  FileText,
  History,
  Package,
  Settings as SettingsIcon,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FolderSync,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  TrendingUp,
} from 'lucide-react';
import { CompanyInfo, Product, Receipt } from './types';
import {
  getCompanyInfo,
  saveCompanyInfo,
  getProducts,
  saveProducts,
  getReceipts,
  createReceipt,
  updateReceipt,
  deleteReceipt,
  clearAllReceipts,
  getRunningConfig,
  saveRunningConfig,
  RunningConfig,
  mergeRemoteReceipts,
} from './services/storage';
import {
  initAuth,
  googleSignIn,
  logout as authLogout,
  getAccessToken,
} from './services/firebaseAuth';
import {
  appendReceiptToGoogleSheet,
  pullReceiptsFromGoogleSheet,
  TARGET_SPREADSHEET_ID,
  SPREADSHEET_URL,
} from './services/googleSheets';
import { uploadReceiptPdfToDrive, TARGET_FOLDER_ID, DRIVE_FOLDER_URL } from './services/googleDrive';
import { generateReceiptPdfBlob } from './utils/pdfGenerator';
import { GoogleWorkspaceBar } from './components/GoogleWorkspaceBar';
import { ReceiptForm } from './components/ReceiptForm';
import { ReceiptModal } from './components/ReceiptModal';
import { ReceiptDocument } from './components/ReceiptDocument';
import { SalesHistory } from './components/SalesHistory';
import { SalesDashboard } from './components/SalesDashboard';
import { ProductMaster } from './components/ProductMaster';
import { SettingsModal } from './components/SettingsModal';

type ActiveTab = 'new-receipt' | 'history' | 'dashboard' | 'products' | 'workflow';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('new-receipt');
  const [products, setProducts] = useState<Product[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(getCompanyInfo());
  const [runningConfig, setRunningConfig] = useState<RunningConfig>(getRunningConfig());

  // Modal states
  const [activeReceiptForModal, setActiveReceiptForModal] = useState<Receipt | null>(null);
  const [editingReceiptForForm, setEditingReceiptForForm] = useState<Receipt | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Background receipt for PDF generation
  const [backgroundReceipt, setBackgroundReceipt] = useState<Receipt | null>(null);

  // Google Workspace Auth
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Collapsible Header Mode (persisted in localStorage)
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('wasabi_header_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleHeaderCollapse = () => {
    setIsHeaderCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('wasabi_header_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Initialize data
  useEffect(() => {
    setProducts(getProducts());
    setReceipts(getReceipts());
    setCompanyInfo(getCompanyInfo());
    setRunningConfig(getRunningConfig());

    // Init Firebase Auth listener
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleAccessToken(token);
        if (token) {
          // Auto-pull remote receipts in background so cross-device data appears immediately
          handlePullFromGoogleSheet(token, true);
        }
      },
      () => {
        setGoogleUser(null);
        setGoogleAccessToken(null);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const showNotify = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  // Pull / Sync data from Google Sheet to this machine/device
  const handlePullFromGoogleSheet = async (overrideToken?: string, silent: boolean = false) => {
    const token = overrideToken || googleAccessToken || (await getAccessToken());
    if (!token) {
      if (!silent) {
        showNotify('info', 'กรุณาลงชื่อเข้าใช้ Google เพื่อดึงข้อมูล');
        handleGoogleSignIn();
      }
      return;
    }

    try {
      setIsPulling(true);
      if (!silent) {
        showNotify('info', 'กำลังดึงข้อมูลประวัติการขายและลิงก์ไฟล์ PDF จาก Google Sheet...');
      }

      const remoteReceipts = await pullReceiptsFromGoogleSheet(token, TARGET_SPREADSHEET_ID);
      if (remoteReceipts.length === 0) {
        if (!silent) {
          showNotify('info', 'ยังไม่มีรายการข้อมูลใน Google Sheet');
        }
        return;
      }

      const { merged, addedCount, updatedCount } = mergeRemoteReceipts(remoteReceipts);
      setReceipts(merged);
      setRunningConfig(getRunningConfig());

      if (!silent) {
        if (addedCount > 0 || updatedCount > 0) {
          showNotify(
            'success',
            `ดึงข้อมูลสำเร็จ! พบรายการใหม่ ${addedCount} รายการ และอัปเดตลิงก์ PDF ${updatedCount} รายการ (รวมทั้งหมด ${merged.length} รายการ)`
          );
        } else {
          showNotify('success', `ข้อมูลบนเครื่องตรงกับ Google Sheet ล่าสุดแล้ว (${merged.length} รายการ)`);
        }
      }
    } catch (err: any) {
      if (err?.message === 'GOOGLE_AUTH_EXPIRED' || err?.message?.includes('invalid authentication credentials')) {
        setGoogleAccessToken(null);
        if (!silent) {
          showNotify('error', 'เซสชัน Google หมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
          handleGoogleSignIn();
        } else {
          console.info('Google token expired on background pull; user can re-auth via top bar');
        }
      } else {
        if (!silent) {
          console.error('Pull from sheet error:', err);
          showNotify('error', `ไม่สามารถดึงข้อมูลจาก Google Sheet ได้: ${err?.message || 'โปรดตรวจสอบสิทธิ์'}`);
        } else {
          console.warn('Background pull notice:', err?.message);
        }
      }
    } finally {
      setIsPulling(false);
    }
  };

  // Google Sign In
  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setGoogleAccessToken(res.accessToken);
        showNotify('success', `ยินดีต้อนรับ ${res.user.displayName || res.user.email} เชื่อมต่อ Google Workspace สำเร็จ!`);
        // Automatically sync and pull existing receipts from Google Sheet!
        handlePullFromGoogleSheet(res.accessToken, false);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      showNotify('error', 'การเข้าสู่ระบบ Google ขัดข้อง กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    await authLogout();
    setGoogleUser(null);
    setGoogleAccessToken(null);
    showNotify('info', 'ออกจากระบบ Google เรียบร้อยแล้ว');
  };

  // Helper to render PDF offscreen for any receipt
  const generatePdfFor = async (rcpt: Receipt): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      setBackgroundReceipt(rcpt);
      setTimeout(async () => {
        try {
          const el = document.getElementById('receipt-background-print-area');
          if (!el) throw new Error('Receipt render container missing');
          const blob = await generateReceiptPdfBlob(el);
          resolve(blob);
        } catch (e) {
          reject(e);
        } finally {
          setBackgroundReceipt(null);
        }
      }, 300);
    });
  };

  // Save new receipt (with auto PDF upload to date subfolder in Drive + write to Google Sheet)
  const handleSaveReceipt = async (
    receiptData: Omit<Receipt, 'id' | 'createdAt'>,
    printAfter: boolean
  ) => {
    try {
      let created = createReceipt(receiptData);
      setReceipts(getReceipts());
      showNotify('success', `บันทึกใบเสร็จ ${created.receiptNo} สำเร็จแล้ว`);

      // If logged in to Google, automatically generate PDF, upload to date folder in Drive, and write to Google Sheet
      const token = googleAccessToken || (await getAccessToken());
      if (token) {
        try {
          const pdfBlob = await generatePdfFor(created);
          const filename = `Receipt_${created.receiptNo}_${created.customer.name.replace(/\s+/g, '_')}.pdf`;
          const driveResult = await uploadReceiptPdfToDrive(
            pdfBlob,
            filename,
            token,
            created.date,
            TARGET_FOLDER_ID
          );

          // Update receipt with drive links
          const updated = updateReceipt(created.id, {
            driveFileId: driveResult.fileId,
            driveViewLink: driveResult.webViewLink,
          }) || { ...created, driveFileId: driveResult.fileId, driveViewLink: driveResult.webViewLink };

          // Record to Google Sheet with Drive link (formatted as HYPERLINK)
          await appendReceiptToGoogleSheet(updated, token, TARGET_SPREADSHEET_ID, driveResult.webViewLink);
          const finalReceipt = updateReceipt(created.id, { syncedToSheet: true }) || updated;
          created = finalReceipt;
          setReceipts(getReceipts());
          showNotify('success', `อัปโหลด PDF เข้าโฟลเดอร์ "${driveResult.folderName || created.date}" ใน Drive และแนบลิงก์ใน Google Sheet เรียบร้อย!`);
        } catch (cloudErr: any) {
          console.warn('Auto cloud upload/sync notice:', cloudErr);
        }
      }

      // Open Modal to view/print/manage
      setActiveReceiptForModal(created);
      setEditingReceiptForForm(null);

      if (printAfter) {
        setTimeout(() => {
          window.print();
        }, 500);
      }
    } catch (err: any) {
      console.error('Save receipt error:', err);
      showNotify('error', 'เกิดข้อผิดพลาดในการบันทึกใบเสร็จ');
    }
  };

  // Upload single receipt PDF to date folder in Drive + sync Sheet with link
  const handleUploadReceiptToDriveAndSheet = async (receipt: Receipt) => {
    const token = googleAccessToken || (await getAccessToken());
    if (!token) {
      showNotify('info', 'กรุณาลงชื่อเข้าใช้ Google เพื่ออัปโหลดและซิงก์');
      handleGoogleSignIn();
      return;
    }

    try {
      setIsSyncing(true);
      showNotify('info', `กำลังสร้าง PDF และอัปโหลดเข้าโฟลเดอร์ "${receipt.date}" ใน Google Drive...`);
      const blob = await generatePdfFor(receipt);
      const filename = `Receipt_${receipt.receiptNo}_${receipt.customer.name.replace(/\s+/g, '_')}.pdf`;
      const driveRes = await uploadReceiptPdfToDrive(blob, filename, token, receipt.date, TARGET_FOLDER_ID);

      const updated = updateReceipt(receipt.id, {
        driveFileId: driveRes.fileId,
        driveViewLink: driveRes.webViewLink,
      }) || { ...receipt, driveFileId: driveRes.fileId, driveViewLink: driveRes.webViewLink };

      await appendReceiptToGoogleSheet(updated, token, TARGET_SPREADSHEET_ID, driveRes.webViewLink);
      updateReceipt(receipt.id, { syncedToSheet: true });
      setReceipts(getReceipts());

      showNotify(
        'success',
        `อัปโหลด PDF เข้าโฟลเดอร์ "${driveRes.folderName || receipt.date}" ใน Drive และแนบลิงก์ใน Google Sheet สำเร็จ!`
      );
    } catch (err: any) {
      console.error('Upload & sync error:', err);
      showNotify('error', `เกิดข้อผิดพลาด: ${err.message || 'โปรดตรวจสอบการเชื่อมต่อ'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync single receipt to Google Sheet
  const handleSyncReceiptToSheet = async (receipt: Receipt) => {
    const token = googleAccessToken || (await getAccessToken());
    if (!token) {
      showNotify('info', 'กรุณาลงชื่อเข้าใช้ Google เพื่อซิงก์ข้อมูล');
      handleGoogleSignIn();
      return;
    }

    try {
      setIsSyncing(true);
      await appendReceiptToGoogleSheet(receipt, token, TARGET_SPREADSHEET_ID, receipt.driveViewLink);
      const updated = updateReceipt(receipt.id, { syncedToSheet: true });
      if (updated) setReceipts(getReceipts());
      showNotify('success', `ซิงก์ใบเสร็จ ${receipt.receiptNo} ไปยัง Google Sheet สำเร็จ!`);
    } catch (err: any) {
      console.error('Sync error:', err);
      showNotify('error', `การซิงก์ขัดข้อง: ${err.message || 'โปรดตรวจสอบสิทธิ์'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Batch sync all pending receipts: generates PDF, uploads to date subfolders in Drive, and appends to Google Sheet
  const handleSyncAllPending = async () => {
    const token = googleAccessToken || (await getAccessToken());
    if (!token) {
      showNotify('info', 'กรุณาลงชื่อเข้าใช้ Google เพื่อซิงก์ข้อมูล');
      handleGoogleSignIn();
      return;
    }

    const pending = receipts.filter((r) => !r.syncedToSheet || !r.driveViewLink);
    if (pending.length === 0) {
      showNotify('info', 'ไม่มีรายการที่ต้องซิงก์ ข้อมูลเป็นปัจจุบันแล้ว');
      return;
    }

    try {
      setIsSyncing(true);
      let successCount = 0;
      for (const r of pending) {
        showNotify('info', `กำลังดำเนินการ ${r.receiptNo} (${successCount + 1}/${pending.length})...`);
        
        let currentRecord = r;
        let drivePdfLink = r.driveViewLink;
        // If PDF not in drive, upload to date folder
        if (!r.driveViewLink) {
          try {
            const blob = await generatePdfFor(r);
            const filename = `Receipt_${r.receiptNo}_${r.customer.name.replace(/\s+/g, '_')}.pdf`;
            const driveRes = await uploadReceiptPdfToDrive(blob, filename, token, r.date, TARGET_FOLDER_ID);
            drivePdfLink = driveRes.webViewLink;
            currentRecord = updateReceipt(r.id, {
              driveFileId: driveRes.fileId,
              driveViewLink: driveRes.webViewLink,
            }) || { ...r, driveFileId: driveRes.fileId, driveViewLink: driveRes.webViewLink };
          } catch (uploadErr) {
            console.warn(`Drive upload failed for ${r.receiptNo}:`, uploadErr);
          }
        }

        // Now append or update in Google Sheet with the Drive link
        await appendReceiptToGoogleSheet(currentRecord, token, TARGET_SPREADSHEET_ID, drivePdfLink || currentRecord.driveViewLink);
        updateReceipt(r.id, { syncedToSheet: true });

        successCount++;
      }
      setReceipts(getReceipts());
      showNotify('success', `ซิงก์และอัปโหลดไฟล์แยกโฟลเดอร์ตามวันสำเร็จทั้งหมด ${successCount} รายการ!`);
    } catch (err: any) {
      console.error('Batch sync error:', err);
      showNotify('error', 'การซิงก์ขัดข้องบางรายการ โปรดลองอีกครั้ง');
    } finally {
      setIsSyncing(false);
    }
  };

  // Delete single receipt
  const handleDeleteReceipt = (id: string) => {
    deleteReceipt(id);
    setReceipts(getReceipts());
    showNotify('info', 'ลบรายการใบเสร็จเรียบร้อยแล้ว');
  };

  // Clear all receipts
  const handleClearAllReceipts = (resetCounter: boolean) => {
    clearAllReceipts(resetCounter);
    setReceipts([]);
    if (resetCounter) {
      setRunningConfig(getRunningConfig());
    }
    showNotify('info', 'ล้างข้อมูลประวัติการขายทั้งหมดเรียบร้อยแล้ว');
  };

  // Products update
  const handleUpdateProducts = (updatedProds: Product[]) => {
    saveProducts(updatedProds);
    setProducts(updatedProds);
    showNotify('success', 'บันทึกการเปลี่ยนแปลงรายการสินค้าเรียบร้อย');
  };

  // Company info update
  const handleSaveCompany = (info: CompanyInfo) => {
    saveCompanyInfo(info);
    setCompanyInfo(info);
    showNotify('success', 'บันทึกข้อมูลบริษัทเรียบร้อย');
  };

  // Running number config update
  const handleSaveRunning = (config: RunningConfig) => {
    saveRunningConfig(config);
    setRunningConfig(config);
    showNotify('success', 'บันทึกการตั้งค่า Running Number เรียบร้อย');
  };

  const pendingCount = receipts.filter((r) => !r.syncedToSheet || !r.driveViewLink).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Prompt',sans-serif]">
      {/* Background container for PDF snapshot rendering */}
      <div style={{ position: 'fixed', left: 0, top: 0, zIndex: -100, pointerEvents: 'none', width: '794px', minWidth: '794px' }}>
        {backgroundReceipt && (
          <div id="receipt-background-print-area">
            <ReceiptDocument
              receipt={backgroundReceipt}
              companyInfo={companyInfo}
              isPrintMode={false}
            />
          </div>
        )}
      </div>

      {/* Google Workspace Bar (Fixed or Top Banner) */}
      <div className="no-print sticky top-0 z-40 bg-white shadow-xs">
        {/* Full Google Workspace Bar (Hidden in compact/collapsed mode) */}
        {!isHeaderCollapsed && (
          <GoogleWorkspaceBar
            user={googleUser}
            accessToken={googleAccessToken}
            isLoggingIn={isLoggingIn}
            onLogin={handleGoogleSignIn}
            onLogout={handleGoogleLogout}
            onSyncAll={handleSyncAllPending}
            onPullFromSheet={handlePullFromGoogleSheet}
            isSyncing={isSyncing}
            isPulling={isPulling}
            pendingCount={pendingCount}
          />
        )}

        {/* Main App Navigation Header (Adapts to compact/collapsed mode) */}
        <header
          className={`border-b border-slate-200 px-3 sm:px-6 bg-white transition-all duration-150 ${
            isHeaderCollapsed ? 'py-1.5' : 'py-3'
          }`}
        >
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5 md:gap-4">
            {/* Left Header Section */}
            {!isHeaderCollapsed ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#007A87] text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                    V
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                        {companyInfo.name}
                      </h1>
                      <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-full">
                        WASABI-O
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      ระบบบริหารจัดการใบเสร็จรับเงิน & ประวัติการขาย Mini Shop
                    </p>
                  </div>
                </div>

                {/* Quick Collapse Button visible on mobile screens */}
                <button
                  type="button"
                  onClick={toggleHeaderCollapse}
                  title="ย่อเมนูเพื่อเพิ่มพื้นที่ทำงาน"
                  className="md:hidden p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 text-xs flex items-center gap-1 shrink-0"
                >
                  <ChevronUp className="w-4 h-4 text-teal-700" />
                  <span className="text-[11px] font-medium">ย่อ</span>
                </button>
              </div>
            ) : (
              /* Compact Brand & Quick Status in Collapsed Mode */
              <div className="flex items-center justify-between md:justify-start gap-2 sm:gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#007A87] text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                    V
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs sm:text-sm text-slate-900 tracking-tight">
                      WASABI-O
                    </span>
                    <span className="text-[9px] font-mono bg-teal-100 text-teal-800 font-semibold px-1.5 py-0.2 rounded hidden sm:inline">
                      Mini Shop
                    </span>
                  </div>
                </div>

                {/* Quick Google Workspace Indicators in Collapsed Mode */}
                <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
                  {googleUser ? (
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title={`เชื่อมต่อ Google: ${googleUser.email || googleUser.displayName}`}></span>
                      <a
                        href={SPREADSHEET_URL}
                        target="_blank"
                        rel="noreferrer"
                        title="เปิด Google Sheet บันทึกการขาย"
                        className="text-emerald-700 hover:text-emerald-900 p-1 hover:bg-emerald-50 rounded flex items-center"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={DRIVE_FOLDER_URL}
                        target="_blank"
                        rel="noreferrer"
                        title="เปิดโฟลเดอร์ Google Drive"
                        className="text-blue-700 hover:text-blue-900 p-1 hover:bg-blue-50 rounded flex items-center"
                      >
                        <FolderSync className="w-3.5 h-3.5" />
                      </a>
                      {pendingCount > 0 && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-mono font-bold px-1.5 py-0.2 rounded-full">
                          รอซิงก์ {pendingCount}
                        </span>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      title="เข้าสู่ระบบ Google"
                      className="text-[10px] text-teal-700 hover:text-teal-900 hover:underline px-1 py-0.5"
                    >
                      เข้าสู่ระบบ Google
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Tabs (Seamlessly compact in collapsed mode) */}
            <div
              className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar pb-0.5 md:pb-0"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <button
                type="button"
                onClick={() => {
                  setEditingReceiptForForm(null);
                  setActiveTab('new-receipt');
                }}
                className={`shrink-0 px-2.5 sm:px-3 ${
                  isHeaderCollapsed ? 'py-1 text-[11px]' : 'py-2 text-xs'
                } rounded-xl font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
                  activeTab === 'new-receipt'
                    ? 'bg-[#007A87] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <FileText className={`${isHeaderCollapsed ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                <span>{isHeaderCollapsed ? 'ออกใบเสร็จ' : 'ออกใบเสร็จรับเงิน'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`shrink-0 px-2.5 sm:px-3 ${
                  isHeaderCollapsed ? 'py-1 text-[11px]' : 'py-2 text-xs'
                } rounded-xl font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
                  activeTab === 'history'
                    ? 'bg-[#007A87] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <History className={`${isHeaderCollapsed ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                <span>ประวัติ</span>
                <span className="ml-0.5 px-1.5 py-0.2 bg-teal-900/30 text-[10px] rounded-full">
                  {receipts.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`shrink-0 px-2.5 sm:px-3 ${
                  isHeaderCollapsed ? 'py-1 text-[11px]' : 'py-2 text-xs'
                } rounded-xl font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
                  activeTab === 'dashboard'
                    ? 'bg-[#007A87] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <TrendingUp className={`${isHeaderCollapsed ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                <span>แดชบอร์ด</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('products')}
                className={`shrink-0 px-2.5 sm:px-3 ${
                  isHeaderCollapsed ? 'py-1 text-[11px]' : 'py-2 text-xs'
                } rounded-xl font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
                  activeTab === 'products'
                    ? 'bg-[#007A87] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Package className={`${isHeaderCollapsed ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                <span>สินค้า</span>
                <span className="ml-0.5 px-1.5 py-0.2 bg-slate-300 text-[10px] rounded-full text-slate-800">
                  {products.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('workflow')}
                className={`shrink-0 px-2.5 sm:px-3 ${
                  isHeaderCollapsed ? 'py-1 text-[11px]' : 'py-2 text-xs'
                } rounded-xl font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
                  activeTab === 'workflow'
                    ? 'bg-[#007A87] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <HelpCircle className={`${isHeaderCollapsed ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                <span>Flow</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSettings(true)}
                title="ตั้งค่าบริษัทและ Running Number"
                className={`shrink-0 ${
                  isHeaderCollapsed ? 'p-1.5' : 'p-2'
                } border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 transition ml-0.5`}
              >
                <SettingsIcon className={`${isHeaderCollapsed ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
              </button>

              {/* The Header Collapse / Expand Toggle Button */}
              <button
                type="button"
                onClick={toggleHeaderCollapse}
                title={isHeaderCollapsed ? 'ขยายแถบเมนูด้านบน' : 'ย่อแถบเมนูด้านบนเพื่อเพิ่มพื้นที่การทำงาน'}
                className={`shrink-0 px-2 sm:px-2.5 ${
                  isHeaderCollapsed ? 'py-1' : 'py-1.5'
                } rounded-xl text-xs font-semibold border transition flex items-center gap-1 ml-1 ${
                  isHeaderCollapsed
                    ? 'bg-teal-50 border-teal-300 text-teal-800 hover:bg-teal-100 shadow-2xs'
                    : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {isHeaderCollapsed ? (
                  <>
                    <ChevronDown className="w-3.5 h-3.5 text-teal-700" />
                    <span className="text-[11px] font-bold hidden sm:inline">ขยายเมนู</span>
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
                    <span className="text-[11px] font-bold hidden sm:inline">ย่อเมนู</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </header>
      </div>

      {/* Floating Notifications */}
      {notification && (
        <div className="no-print fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg border text-xs font-medium flex items-center gap-2 max-w-md ${
              notification.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : notification.type === 'error'
                ? 'bg-red-600 text-white border-red-500'
                : 'bg-slate-800 text-white border-slate-700'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Container Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 no-print">
        {activeTab === 'new-receipt' && (
          <ReceiptForm
            products={products}
            companyInfo={companyInfo}
            onSaveReceipt={handleSaveReceipt}
            onPreview={(temp) => setActiveReceiptForModal(temp)}
            initialReceipt={editingReceiptForForm}
            googleAccessToken={googleAccessToken}
            receipts={receipts}
          />
        )}

        {activeTab === 'history' && (
          <SalesHistory
            receipts={receipts}
            onViewReceipt={(r) => setActiveReceiptForModal(r)}
            onPrintReceipt={(r) => {
              setActiveReceiptForModal(r);
              setTimeout(() => window.print(), 400);
            }}
            onDeleteReceipt={handleDeleteReceipt}
            onClearAllReceipts={handleClearAllReceipts}
            onSyncReceiptToSheet={handleSyncReceiptToSheet}
            onUploadReceiptToDriveAndSheet={handleUploadReceiptToDriveAndSheet}
            onSyncAllPending={handleSyncAllPending}
            onPullFromSheet={handlePullFromGoogleSheet}
            isSyncing={isSyncing}
            isPulling={isPulling}
            googleUser={googleUser}
          />
        )}

        {activeTab === 'dashboard' && (
          <SalesDashboard
            receipts={receipts}
            products={products}
            onViewReceiptsTab={() => setActiveTab('history')}
          />
        )}

        {activeTab === 'products' && (
          <ProductMaster
            products={products}
            onUpdateProducts={handleUpdateProducts}
            googleAccessToken={googleAccessToken}
          />
        )}

        {activeTab === 'workflow' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-8">
            <div>
              <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md uppercase tracking-wider">
                System Workflow
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-2">
                ผังกระบวนการทำงานของระบบใบเสร็จรับเงิน (Venturetec Mini Shop)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                ออกแบบตามขั้นตอนมาตรฐาน 4 ขั้นตอน พร้อมการจัดเก็บไฟล์ PDF แยกโฟลเดอร์ตามวันที่ใน Google Drive
              </p>
            </div>

            {/* Step-by-step Cards matching the user's diagram screenshot */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              {/* Step 1 */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between relative group hover:border-teal-500 hover:shadow-md transition">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-base">
                    1
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    กรอกข้อมูลการสั่งซื้อ
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    ระบุชื่อลูกค้า เลือกสินค้าจาก 16 รายการ WASABI-O กำหนดจำนวน และข้อมูลการชำระเงิน
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/80 text-[11px] text-teal-700 font-medium">
                  ระบบช่วยกรอกราคาให้อัตโนมัติ
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between relative group hover:border-teal-500 hover:shadow-md transition">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-base">
                    2
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    ระบบคำนวณและสร้างเลขที่ใบเสร็จ
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    คำนวณยอดเงินแต่ละรายการ ส่วนลด ภาษีมูลค่าเพิ่ม 7% และออก Running Number อัตโนมัติ (เช่น MS-2026-0001)
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/80 text-[11px] text-teal-700 font-medium">
                  เลขไม่ซ้ำและรันต่อเนื่อง
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between relative group hover:border-teal-500 hover:shadow-md transition">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-base">
                    3
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    สร้างใบเสร็จ & PDF
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    จัดรูปแบบตามตัวอย่างใบเสร็จ Venturetec Marketing CO.,LTD. พร้อมพิมพ์หรือดาวน์โหลด PDF ได้ทันที
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/80 text-[11px] text-teal-700 font-medium">
                  ตรงตามแบบฟอร์มเอกสารทางการ
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between relative group hover:border-teal-500 hover:shadow-md transition">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-base">
                    4
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    บันทึกประวัติการขาย & ไดรฟ์แยกวัน
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    สร้างโฟลเดอร์แยกตามวันที่ใน Google Drive บันทึกไฟล์ PDF พร้อมส่งยอดขายและลิงก์เข้า Google Sheet
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/80 text-[11px] text-teal-700 font-medium">
                  ค้นหาและตรวจสอบย้อนหลังได้ตลอดเวลา
                </div>
              </div>
            </div>

            {/* Cloud Sync Reference Card */}
            <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-5">
              <h4 className="font-bold text-teal-950 text-sm mb-3">
                การเชื่อมโยงระบบจัดเก็บคลาวด์ (Cloud Integrations)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-white p-4 rounded-xl border border-teal-200/60 flex items-start gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-slate-900">Google Sheet (ฐานข้อมูลยอดขาย)</h5>
                    <p className="text-slate-600 mt-1">
                      บันทึกรายการขาย เลขที่ใบเสร็จ ยอดเงิน ภาษี ลิงก์ PDF และสถานะการชำระเงินลงชีตกลาง
                    </p>
                    <a
                      href="https://docs.google.com/spreadsheets/d/1SDuEa3IZapuQtnHUH9QGxA8kjfz4JlpyiX0BtnTr24o/edit?usp=drivesdk"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-teal-700 font-bold mt-2 hover:underline"
                    >
                      เปิด Google Sheet <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-teal-200/60 flex items-start gap-3">
                  <FolderSync className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-slate-900">Google Drive (โฟลเดอร์แยกตามวัน)</h5>
                    <p className="text-slate-600 mt-1">
                      สร้างโฟลเดอร์ย่อยตามวันที่ (เช่น 2026-10-21) ภายในไดรฟ์หลักโดยอัตโนมัติ เพื่อให้ค้นหาไฟล์ใบเสร็จ PDF ในแต่ละวันได้สะดวก รวดเร็ว
                    </p>
                    <a
                      href="https://drive.google.com/drive/folders/1vDmg8E2TWD67uvmN-mtz9VT84EQqBNbD"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-teal-700 font-bold mt-2 hover:underline"
                    >
                      เปิด Google Drive Folder <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Printable Receipt Area when window.print() is executed */}
      {activeReceiptForModal && (
        <div className="print-only hidden">
          <div className="receipt-sheet">
            <ReceiptDocument
              receipt={activeReceiptForModal}
              companyInfo={companyInfo}
              isPrintMode={true}
            />
          </div>
        </div>
      )}

      {/* Receipt Modal (View / Download / Upload / Print) */}
      {activeReceiptForModal && (
        <ReceiptModal
          receipt={activeReceiptForModal}
          companyInfo={companyInfo}
          onClose={() => setActiveReceiptForModal(null)}
          onEdit={(r) => {
            setEditingReceiptForForm(r);
            setActiveReceiptForModal(null);
            setActiveTab('new-receipt');
          }}
          onReceiptUpdated={(updated) => {
            setReceipts(getReceipts());
            setActiveReceiptForModal(updated);
          }}
          googleAccessToken={googleAccessToken}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          companyInfo={companyInfo}
          runningConfig={runningConfig}
          onSaveCompany={handleSaveCompany}
          onSaveRunning={handleSaveRunning}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
