import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  CreditCard,
  Calendar,
  Sparkles,
  Award,
  ArrowUpRight,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  Users,
  Copy,
  Check,
  Send,
  Coins,
  Building,
  QrCode,
  Wallet,
} from 'lucide-react';
import { Receipt, Product } from '../types';
import { formatCurrency } from '../utils/thaiBaht';
import { getSalesInsightsWithAI, getDailyShiftReportWithAI } from '../services/aiService';

interface SalesDashboardProps {
  receipts: Receipt[];
  products: Product[];
  onViewReceiptsTab: () => void;
}

type PeriodFilter = 'today' | 'this_week' | 'this_month' | 'all';

export const SalesDashboard: React.FC<SalesDashboardProps> = ({
  receipts,
  products,
  onViewReceiptsTab,
}) => {
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  // Daily Shift Report Modal State
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftReportText, setShiftReportText] = useState<string>('');
  const [isLoadingShiftReport, setIsLoadingShiftReport] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);

  // Date constants
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM

  // Calculate 7-day cutoff for "This Week"
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  // 1. Permanent 3-Period Overview Stats (Always visible side-by-side)
  const todayReceipts = useMemo(
    () => receipts.filter((r) => r.paymentStatus !== 'CANCELLED' && r.date === todayStr),
    [receipts, todayStr]
  );
  const todayRevenue = useMemo(
    () => todayReceipts.reduce((sum, r) => sum + (r.grandTotal || 0), 0),
    [todayReceipts]
  );

  const weekReceipts = useMemo(
    () => receipts.filter((r) => r.paymentStatus !== 'CANCELLED' && r.date >= sevenDaysAgoStr && r.date <= todayStr),
    [receipts, sevenDaysAgoStr, todayStr]
  );
  const weekRevenue = useMemo(
    () => weekReceipts.reduce((sum, r) => sum + (r.grandTotal || 0), 0),
    [weekReceipts]
  );

  const monthReceipts = useMemo(
    () => receipts.filter((r) => r.paymentStatus !== 'CANCELLED' && r.date.startsWith(currentMonthStr)),
    [receipts, currentMonthStr]
  );
  const monthRevenue = useMemo(
    () => monthReceipts.reduce((sum, r) => sum + (r.grandTotal || 0), 0),
    [monthReceipts]
  );

  // 2. Filtered receipts based on active tab
  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      if (r.paymentStatus === 'CANCELLED') return false;
      if (period === 'today') return r.date === todayStr;
      if (period === 'this_week') return r.date >= sevenDaysAgoStr && r.date <= todayStr;
      if (period === 'this_month') return r.date.startsWith(currentMonthStr);
      return true;
    });
  }, [receipts, period, todayStr, sevenDaysAgoStr, currentMonthStr]);

  // Overall Statistics for current active period
  const totalRevenue = useMemo(
    () => filteredReceipts.reduce((sum, r) => sum + (r.grandTotal || 0), 0),
    [filteredReceipts]
  );

  const totalVat = useMemo(
    () => filteredReceipts.reduce((sum, r) => sum + (r.vatAmount || 0), 0),
    [filteredReceipts]
  );

  const avgTicket = filteredReceipts.length > 0 ? totalRevenue / filteredReceipts.length : 0;

  // Best Selling Products Calculation (Top 5)
  const topProducts = useMemo(() => {
    const productStats: Record<string, { name: string; code?: string; qty: number; revenue: number; image?: string }> = {};

    filteredReceipts.forEach((r) => {
      r.items.forEach((item) => {
        const key = item.productId || item.description;
        if (!productStats[key]) {
          const catalogProd = products.find(
            (p) => p.id === item.productId || p.nameEn === item.description || p.nameTh === item.description
          );
          productStats[key] = {
            name: item.description,
            code: catalogProd?.code,
            qty: 0,
            revenue: 0,
            image: catalogProd?.image,
          };
        }
        productStats[key].qty += item.quantity || 1;
        productStats[key].revenue += item.amount || 0;
      });
    });

    return Object.values(productStats)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [filteredReceipts, products]);

  // Payment Breakdown for current period
  const paymentBreakdown = useMemo(() => {
    const stats: Record<
      string,
      { count: number; total: number; label: string; icon: React.ReactNode; color: string; bg: string }
    > = {
      CASH: {
        count: 0,
        total: 0,
        label: 'เงินสดหน้าร้าน (Cash In Drawer)',
        icon: <Coins className="w-4 h-4 text-emerald-600" />,
        color: 'text-emerald-700',
        bg: 'bg-emerald-50 border-emerald-200',
      },
      TRANSFER: {
        count: 0,
        total: 0,
        label: 'โอนเงิน (ธ.กรุงศรี 800-0-003433)',
        icon: <Building className="w-4 h-4 text-blue-600" />,
        color: 'text-blue-700',
        bg: 'bg-blue-50 border-blue-200',
      },
      PROMPTPAY: {
        count: 0,
        total: 0,
        label: 'พร้อมเพย์ QR (PromptPay)',
        icon: <QrCode className="w-4 h-4 text-teal-600" />,
        color: 'text-teal-700',
        bg: 'bg-teal-50 border-teal-200',
      },
      CREDIT_CARD: {
        count: 0,
        total: 0,
        label: 'บัตรเครดิต (Credit Card)',
        icon: <CreditCard className="w-4 h-4 text-purple-600" />,
        color: 'text-purple-700',
        bg: 'bg-purple-50 border-purple-200',
      },
    };

    filteredReceipts.forEach((r) => {
      const method = r.paymentMethod || 'TRANSFER';
      if (stats[method]) {
        stats[method].count += 1;
        stats[method].total += r.grandTotal || 0;
      }
    });

    return stats;
  }, [filteredReceipts]);

  // Today-specific shift closing data
  const todayShiftData = useMemo(() => {
    const cashReceipts = todayReceipts.filter((r) => r.paymentMethod === 'CASH');
    const transferReceipts = todayReceipts.filter((r) => r.paymentMethod === 'TRANSFER');
    const promptpayReceipts = todayReceipts.filter((r) => r.paymentMethod === 'PROMPTPAY');
    const cardReceipts = todayReceipts.filter((r) => r.paymentMethod === 'CREDIT_CARD');

    return {
      date: todayStr,
      totalRevenue: todayRevenue,
      totalReceipts: todayReceipts.length,
      cashTotal: cashReceipts.reduce((s, r) => s + (r.grandTotal || 0), 0),
      cashCount: cashReceipts.length,
      transferTotal: transferReceipts.reduce((s, r) => s + (r.grandTotal || 0), 0),
      transferCount: transferReceipts.length,
      promptpayTotal: promptpayReceipts.reduce((s, r) => s + (r.grandTotal || 0), 0),
      promptpayCount: promptpayReceipts.length,
      cardTotal: cardReceipts.reduce((s, r) => s + (r.grandTotal || 0), 0),
      cardCount: cardReceipts.length,
      topProducts: topProducts.slice(0, 3).map((p) => ({ name: p.name, qty: p.qty })),
    };
  }, [todayReceipts, todayRevenue, todayStr, topProducts]);

  // Last 7 Days Daily Trend
  const last7DaysTrend = useMemo(() => {
    const days: { date: string; display: string; total: number; count: number }[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' });

      const dayReceipts = receipts.filter((r) => r.date === dateKey && r.paymentStatus !== 'CANCELLED');
      const total = dayReceipts.reduce((sum, r) => sum + (r.grandTotal || 0), 0);

      days.push({
        date: dateKey,
        display: dayName,
        total,
        count: dayReceipts.length,
      });
    }

    const maxVal = Math.max(...days.map((d) => d.total), 100);
    return { days, maxVal };
  }, [receipts]);

  // Unique Customers Count
  const uniqueCustomersCount = useMemo(() => {
    const set = new Set<string>();
    filteredReceipts.forEach((r) => {
      const id = r.customer.phone || r.customer.name;
      if (id && id !== 'ลูกค้าทั่วไป') set.add(id);
    });
    return set.size;
  }, [filteredReceipts]);

  // Handle AI Insights Request
  const handleGenerateAiInsights = async () => {
    setIsLoadingAi(true);
    try {
      const summaryPayload = {
        period,
        totalRevenue,
        totalReceipts: filteredReceipts.length,
        avgTicket,
        topProducts: topProducts.map((p) => ({ name: p.name, qty: p.qty, revenue: p.revenue })),
        paymentStats: Object.entries(paymentBreakdown).map(([k, v]) => ({ method: k, total: v.total, count: v.count })),
        recentDays: last7DaysTrend.days,
      };

      const result = await getSalesInsightsWithAI(summaryPayload);
      setAiInsights(result);
    } catch (err) {
      console.error('Failed to get AI insights:', err);
    } finally {
      setIsLoadingAi(false);
    }
  };

  // Handle AI Daily Shift Report (for LINE)
  const handleGenerateShiftReport = async () => {
    setIsLoadingShiftReport(true);
    setShowShiftModal(true);
    setCopiedReport(false);
    try {
      const report = await getDailyShiftReportWithAI(todayStr, todayShiftData);
      setShiftReportText(report);
    } catch (err) {
      console.error('Failed to generate shift report:', err);
    } finally {
      setIsLoadingShiftReport(false);
    }
  };

  const handleCopyReport = () => {
    if (!shiftReportText) return;
    navigator.clipboard.writeText(shiftReportText);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* 3 Prominent Period Sales Summary Cards (วันนี้ / สัปดาห์นี้ / เดือนนี้) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Today Card */}
        <div
          onClick={() => setPeriod('today')}
          className={`cursor-pointer p-4 rounded-2xl border transition shadow-xs flex flex-col justify-between ${
            period === 'today'
              ? 'bg-gradient-to-br from-emerald-700 to-teal-800 text-white border-emerald-600 ring-2 ring-emerald-500'
              : 'bg-white hover:bg-emerald-50/40 border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                period === 'today' ? 'text-emerald-100' : 'text-emerald-700'
              }`}
            >
              🌅 ยอดขายวันนี้ (Today)
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                period === 'today' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {todayReceipts.length} บิล
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight">
              ฿{formatCurrency(todayRevenue)}
            </div>
            <p className={`text-[11px] mt-1 ${period === 'today' ? 'text-emerald-100' : 'text-slate-500'}`}>
              {todayReceipts.length > 0
                ? `เฉลี่ย ฿${formatCurrency(todayRevenue / todayReceipts.length)}/บิล`
                : 'ยังไม่มีรายการขายวันนี้'}
            </p>
          </div>
        </div>

        {/* This Week Card */}
        <div
          onClick={() => setPeriod('this_week')}
          className={`cursor-pointer p-4 rounded-2xl border transition shadow-xs flex flex-col justify-between ${
            period === 'this_week'
              ? 'bg-gradient-to-br from-teal-700 to-teal-900 text-white border-teal-600 ring-2 ring-teal-500'
              : 'bg-white hover:bg-teal-50/40 border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                period === 'this_week' ? 'text-teal-100' : 'text-teal-700'
              }`}
            >
              📅 ยอดขายสัปดาห์นี้ (This Week)
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                period === 'this_week' ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-800'
              }`}
            >
              {weekReceipts.length} บิล
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight">
              ฿{formatCurrency(weekRevenue)}
            </div>
            <p className={`text-[11px] mt-1 ${period === 'this_week' ? 'text-teal-100' : 'text-slate-500'}`}>
              ย้อนหลัง 7 วันล่าสุด (เฉลี่ย ฿{formatCurrency(weekReceipts.length > 0 ? weekRevenue / weekReceipts.length : 0)}/บิล)
            </p>
          </div>
        </div>

        {/* This Month Card */}
        <div
          onClick={() => setPeriod('this_month')}
          className={`cursor-pointer p-4 rounded-2xl border transition shadow-xs flex flex-col justify-between ${
            period === 'this_month'
              ? 'bg-gradient-to-br from-[#005f69] to-[#004249] text-white border-teal-700 ring-2 ring-teal-500'
              : 'bg-white hover:bg-teal-50/40 border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                period === 'this_month' ? 'text-teal-200' : 'text-teal-800'
              }`}
            >
              🗓️ ยอดขายเดือนนี้ (This Month)
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                period === 'this_month' ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-800'
              }`}
            >
              {monthReceipts.length} บิล
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight">
              ฿{formatCurrency(monthRevenue)}
            </div>
            <p className={`text-[11px] mt-1 ${period === 'this_month' ? 'text-teal-200' : 'text-slate-500'}`}>
              ประจำเดือน {new Date().toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Top Header & Filter Controls & Daily Shift Closing Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-700" />
            แดชบอร์ดสรุปยอดขาย & สถิติสินค้า (Sales Analytics)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ภาพรวมผลประกอบการ สินค้าขายดี 5 อันดับแรก WASABI-O และตรวจนับเงินปิดกะประจำวัน
          </p>
        </div>

        {/* Action Buttons: Shift Closing Report with AI & Period Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Daily Shift Closing Button */}
          <button
            type="button"
            onClick={handleGenerateShiftReport}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xs transition"
            title="สรุปยอดปิดกะวันนี้ (เงินสด/เงินโอน/พร้อมเพย์) พร้อมสร้างข้อความส่ง LINE"
          >
            <Send className="w-3.5 h-3.5 text-emerald-100" />
            <span>AI สรุปปิดกะส่ง LINE</span>
          </button>

          {/* Period Filter Pill Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => setPeriod('today')}
              className={`px-2.5 py-1 rounded-lg transition ${
                period === 'today'
                  ? 'bg-teal-700 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              วันนี้
            </button>
            <button
              type="button"
              onClick={() => setPeriod('this_week')}
              className={`px-2.5 py-1 rounded-lg transition ${
                period === 'this_week'
                  ? 'bg-teal-700 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              สัปดาห์นี้
            </button>
            <button
              type="button"
              onClick={() => setPeriod('this_month')}
              className={`px-2.5 py-1 rounded-lg transition ${
                period === 'this_month'
                  ? 'bg-teal-700 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              เดือนนี้
            </button>
            <button
              type="button"
              onClick={() => setPeriod('all')}
              className={`px-2.5 py-1 rounded-lg transition ${
                period === 'all'
                  ? 'bg-teal-700 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ทั้งหมด ({receipts.length})
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards for Selected Period */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Revenue */}
        <div className="bg-gradient-to-br from-teal-700 to-teal-900 text-white p-4 sm:p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <span className="text-teal-200 text-xs font-medium block">
              ยอดขายสุทธิ (
              {period === 'today'
                ? 'วันนี้'
                : period === 'this_week'
                ? 'สัปดาห์นี้'
                : period === 'this_month'
                ? 'เดือนนี้'
                : 'ทั้งหมด'}
              )
            </span>
            <div className="text-xl sm:text-2xl lg:text-3xl font-black font-mono mt-1 tracking-tight">
              ฿{formatCurrency(totalRevenue)}
            </div>
            <span className="text-[11px] text-teal-100/90 mt-2 block">
              {filteredReceipts.length} ใบเสร็จ (เฉลี่ย ฿{formatCurrency(avgTicket)}/บิล)
            </span>
          </div>
          <DollarSign className="absolute -right-3 -bottom-3 w-20 h-20 text-white/10" />
        </div>

        {/* Orders Count */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">จำนวนใบเสร็จ</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {filteredReceipts.length}
            </span>
            <span className="text-xs text-slate-400 ml-1.5">รายการ</span>
          </div>
          <button
            type="button"
            onClick={onViewReceiptsTab}
            className="text-[11px] text-teal-700 font-semibold hover:underline flex items-center gap-0.5 mt-2"
          >
            ดูประวัติการขาย <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        {/* Unique Customers */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">ลูกค้าที่ซื้อ</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {uniqueCustomersCount}
            </span>
            <span className="text-xs text-slate-400 ml-1.5">ราย</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">
            ฐานข้อมูลลูกค้าประจำ
          </span>
        </div>

        {/* VAT Collected */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">ภาษีมูลค่าเพิ่ม 7% (VAT)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900">
              ฿{formatCurrency(totalVat)}
            </span>
          </div>
          <span className="text-[11px] text-emerald-700 font-medium mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> ภาษีขายตามกฎหมาย
          </span>
        </div>
      </div>

      {/* Main Grid: 7-Day Trend + Best Selling Top 5 Products */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 7-Day Sales Trend Bar Chart (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-700" />
                แนวโน้มยอดขายย้อนหลัง 7 วัน (7-Day Sales Trend)
              </h3>
              <p className="text-[11px] text-slate-500">
                ยอดขายรายวันเพื่อติดตามการเติบโตและการเปิดบิล
              </p>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="pt-4 pb-2">
            <div className="grid grid-cols-7 gap-2 sm:gap-3 items-end h-44 border-b border-slate-200 pb-2">
              {last7DaysTrend.days.map((d) => {
                const heightPercent = Math.max(8, Math.round((d.total / last7DaysTrend.maxVal) * 100));
                const isToday = d.date === todayStr;

                return (
                  <div key={d.date} className="flex flex-col items-center justify-end h-full group">
                    <span className="text-[10px] font-mono font-semibold text-slate-600 mb-1 group-hover:text-teal-700 transition">
                      {d.total > 0 ? `฿${Math.round(d.total)}` : '-'}
                    </span>

                    <div className="w-full max-w-[36px] bg-slate-100 rounded-t-lg overflow-hidden h-full flex items-end">
                      <div
                        className={`w-full rounded-t-lg transition-all duration-500 ${
                          isToday
                            ? 'bg-gradient-to-t from-teal-700 to-teal-500'
                            : d.total > 0
                            ? 'bg-gradient-to-t from-slate-400 to-slate-500 group-hover:from-teal-600 group-hover:to-teal-400'
                            : 'bg-slate-200'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      ></div>
                    </div>

                    <span
                      className={`text-[10px] mt-2 font-medium text-center truncate max-w-full ${
                        isToday ? 'text-teal-800 font-bold' : 'text-slate-500'
                      }`}
                    >
                      {d.display.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top 5 Products (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              สินค้าขายดี Top 5 (Best Sellers)
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">ตามจำนวนชิ้น</span>
          </div>

          <div className="space-y-3">
            {topProducts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                ยังไม่มีข้อมูลการขายในรอบเวลานี้
              </div>
            ) : (
              topProducts.map((p, idx) => {
                const maxQty = topProducts[0]?.qty || 1;
                const percent = Math.round((p.qty / maxQty) * 100);

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 max-w-[70%]">
                        <span
                          className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                            idx === 0
                              ? 'bg-amber-400 text-amber-950 ring-1 ring-amber-500'
                              : idx === 1
                              ? 'bg-slate-200 text-slate-800'
                              : idx === 2
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                        </span>
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-6 h-6 object-cover rounded shrink-0 border border-slate-200"
                          />
                        ) : null}
                        <span className="font-medium text-slate-800 truncate" title={p.name}>
                          {p.name}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-slate-900 font-mono">{p.qty}</span>
                        <span className="text-[10px] text-slate-500 ml-1">ชิ้น</span>
                        <span className="text-[11px] text-teal-700 font-mono ml-2 font-semibold">
                          ฿{formatCurrency(p.revenue)}
                        </span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-teal-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Payment Methods & Daily Shift Closing Audit Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-600" />
              สรุปยอดตามช่องทางชำระเงิน & ตรวจนับปิดกะ (Payment & Shift Reconciliation)
            </h3>
            <p className="text-[11px] text-slate-500">
              แยกยอดเงินสดในลิ้นชัก vs เงินโอนเข้าบัญชีกรุงศรี vs พร้อมเพย์ ช่วยให้ตรวจนับเงินปิดกะประจำวันได้รวดเร็ว
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerateShiftReport}
            className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition self-start sm:self-auto"
          >
            <Send className="w-3.5 h-3.5 text-emerald-600" />
            <span>สร้างสรุปส่ง LINE ปิดกะ</span>
          </button>
        </div>

        {/* 4 Payment Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(paymentBreakdown).map(([key, data]) => {
            const pct = totalRevenue > 0 ? Math.round((data.total / totalRevenue) * 100) : 0;

            return (
              <div
                key={key}
                className={`p-3.5 rounded-xl border ${data.bg} transition shadow-2xs space-y-2`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {data.icon}
                    <span className="font-bold text-xs text-slate-800">{data.label}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-white/80 text-slate-700">
                    {data.count} บิล
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <span className={`text-xl font-bold font-mono ${data.color}`}>
                    ฿{formatCurrency(data.total)}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500">
                    {pct}% ของยอด
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ✨ AI Sales Advisor & Growth Strategies */}
      <div className="bg-gradient-to-br from-teal-50/70 via-white to-emerald-50/40 p-5 rounded-2xl border border-teal-200/80 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-teal-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-700 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  AI ผู้ช่วยวิเคราะห์ยอดขายและกลยุทธ์ (AI Sales Advisor)
                </h3>
                <p className="text-[11px] text-teal-900/80">
                  ขับเคลื่อนโดย Gemini 3.8 Flash วิเคราะห์พฤติกรรมการซื้อและเสนอแนะโปรโมชั่น WASABI-O
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateAiInsights}
              disabled={isLoadingAi || filteredReceipts.length === 0}
              className="self-start sm:self-auto bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAi ? 'animate-spin' : ''}`} />
              <span>{isLoadingAi ? 'กำลังวิเคราะห์...' : 'ให้ AI วิเคราะห์ยอดขาย'}</span>
            </button>
          </div>

          {/* AI Result Container */}
          <div className="mt-4">
            {aiInsights ? (
              <div className="bg-white p-4 rounded-xl border border-teal-200/60 text-xs text-slate-700 leading-relaxed space-y-2 whitespace-pre-line max-h-80 overflow-y-auto">
                {aiInsights}
              </div>
            ) : (
              <div className="text-center py-8 px-4 bg-white/70 rounded-xl border border-dashed border-teal-200 text-slate-500 text-xs space-y-2">
                <Sparkles className="w-6 h-6 text-teal-600 mx-auto" />
                <p className="font-medium text-slate-700">
                  กดปุ่ม <span className="text-teal-700 font-bold">"ให้ AI วิเคราะห์ยอดขาย"</span> ด้านบน
                </p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  AI จะสรุปพฤติกรรมลูกค้า แนะนำการจัดเซ็ตคู่สินค้ายอดนิยม (Bundle Deals) และเคล็ดลับเพิ่มยอดขายสำหรับร้านคุณ
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-teal-100 flex items-center justify-between text-[11px] text-teal-800">
          <span>ฐานข้อมูลซิงก์ตรงกับ Google Sheets & Firestore</span>
          <span className="font-medium">Venturetec Sales AI (Gemini)</span>
        </div>
      </div>

      {/* Daily Shift Closing Report Modal (LINE Message Ready) */}
      {showShiftModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 bg-emerald-700 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                <h3 className="font-bold text-sm">สรุปปิดกะประจำวันพร้อมส่ง LINE (Daily Closing)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowShiftModal(false)}
                className="w-7 h-7 rounded-full bg-emerald-800 hover:bg-emerald-900 flex items-center justify-center text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-600">
                ข้อความสรุปยอดเงินสด, ยอดโอน และยอดขายรวมประจำวันที่ {todayStr} ที่จัดรูปแบบพร้อมคัดลอกส่งเข้า LINE กลุ่มร้านค้า:
              </p>

              {isLoadingShiftReport ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
                  <p>AI กำลังจัดทำสรุปรายงานปิดกะประจำวัน...</p>
                </div>
              ) : (
                <div className="relative">
                  <textarea
                    rows={12}
                    readOnly
                    value={shiftReportText}
                    className="w-full font-mono text-[11px] p-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                  />
                  <button
                    type="button"
                    onClick={handleCopyReport}
                    className="absolute top-2 right-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-xs transition"
                  >
                    {copiedReport ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>คัดลอกแล้ว!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>คัดลอกข้อความ</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {copiedReport && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-center font-medium">
                  ✅ คัดลอกข้อความเรียบร้อย! สามารถนำไปวาง (Paste) ในแอป LINE ได้ทันที
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowShiftModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700 font-medium"
              >
                ปิดหน้าต่าง
              </button>
              <button
                type="button"
                onClick={handleCopyReport}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center gap-1.5 shadow-xs transition"
              >
                <Copy className="w-3.5 h-3.5" />
                คัดลอกข้อความส่ง LINE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
