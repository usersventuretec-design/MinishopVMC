import React, { useState } from 'react';
import {
  Package,
  Plus,
  Edit2,
  Check,
  RotateCcw,
  Search,
  Tag,
  ShieldCheck,
  Image as ImageIcon,
  Upload,
  Camera,
  ZoomIn,
  X,
  Trash2,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Product, ProductColorOption } from '../types';
import { INITIAL_PRODUCTS } from '../data/defaultProducts';
import { getProductDisplayImage, compressImageFile } from '../data/productImages';

interface ProductMasterProps {
  products: Product[];
  onUpdateProducts: (products: Product[]) => void;
  googleAccessToken?: string | null;
}

const COMMON_SIZES = ['Freesize', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

export const ProductMaster: React.FC<ProductMasterProps> = ({
  products,
  onUpdateProducts,
  googleAccessToken,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [driveUploadStatus, setDriveUploadStatus] = useState<string>('');

  // Lightbox preview
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    title: string;
    code?: string;
    size?: string;
    price?: number;
  } | null>(null);

  // New product form state
  const [newProd, setNewProd] = useState<Partial<Product>>({
    code: '',
    nameTh: '',
    nameEn: '',
    size: 'ชิ้น',
    price: 0,
    category: 'wasabi',
    image: '',
    active: true,
    hasOptions: false,
    sizes: ['Freesize', 'M', 'L', 'XL', '2XL'],
    colors: [],
  });

  // Helpers for adding color & custom size in New Product Modal
  const [newColorName, setNewColorName] = useState('');
  const [newColorLabel, setNewColorLabel] = useState('');
  const [newColorImage, setNewColorImage] = useState('');
  const [newCustomSize, setNewCustomSize] = useState('');

  // Helpers for adding color & custom size in Edit Product Modal
  const [editColorName, setEditColorName] = useState('');
  const [editColorLabel, setEditColorLabel] = useState('');
  const [editColorImage, setEditColorImage] = useState('');
  const [editCustomSize, setEditCustomSize] = useState('');

  const filtered = products.filter(
    (p) =>
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nameTh.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startEdit = (p: Product) => {
    setEditingProduct({
      ...p,
      hasOptions: Boolean(p.hasOptions || p.category === 'apparel' || (p.sizes && p.sizes.length > 0)),
      sizes: p.sizes && p.sizes.length > 0 ? [...p.sizes] : (p.category === 'apparel' || p.code === 'WB-17' ? ['Freesize', 'M', 'L', 'XL', '2XL'] : []),
      colors: p.colors && p.colors.length > 0 ? [...p.colors] : (p.code === 'WB-17' ? [
        { name: 'Green', label: 'เขียวซากุระ (Green)', image: '/assets/products/WB-17-green.png' },
        { name: 'Latte', label: 'ลาเต้/ครีม (Latte)', image: '/assets/products/WB-17-latte.png' },
      ] : []),
    });
    setEditColorName('');
    setEditColorLabel('');
    setEditColorImage('');
    setEditCustomSize('');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const updated = products.map((p) => {
      if (p.id === editingProduct.id) {
        return {
          ...editingProduct,
          code: editingProduct.code.toUpperCase(),
          price: Number(editingProduct.price) || 0,
          hasOptions: Boolean(editingProduct.hasOptions || editingProduct.category === 'apparel'),
        };
      }
      return p;
    });
    onUpdateProducts(updated);
    setEditingProduct(null);
  };

  const toggleActive = (id: string) => {
    const updated = products.map((p) => {
      if (p.id === id) {
        return { ...p, active: !p.active };
      }
      return p;
    });
    onUpdateProducts(updated);
  };

  const handleResetToDefault = () => {
    if (confirm('คุณต้องการรีเซ็ตรายการสินค้ากลับไปเป็นค่าเริ่มต้นของ WASABI-O หรือไม่?')) {
      onUpdateProducts(INITIAL_PRODUCTS);
    }
  };

  const handleFileUpload = async (
    file: File | undefined,
    onSuccess: (url: string) => void
  ) => {
    if (!file) return;
    try {
      setIsUploading(true);
      setDriveUploadStatus('');
      const dataUrl = await compressImageFile(file, 400, 400);
      onSuccess(dataUrl);

      // If user is connected to Google Workspace, back up image to Google Drive!
      if (googleAccessToken) {
        setDriveUploadStatus('กำลังสำรองรูปภาพเข้า Google Drive...');
        try {
          const { uploadProductImageToDrive } = await import('../services/googleDrive');
          const driveRes = await uploadProductImageToDrive(dataUrl, `product_${Date.now()}`, googleAccessToken);
          if (driveRes.directLink) {
            onSuccess(driveRes.directLink);
          }
          setDriveUploadStatus('สำรองรูปภาพลง Drive เรียบร้อย!');
        } catch (dErr) {
          console.warn('Drive product image backup warning:', dErr);
          setDriveUploadStatus('บันทึกรูปภาพในเครื่องเรียบร้อย (Drive ออฟไลน์)');
        }
      }
    } catch (err) {
      console.error('File compression error:', err);
      alert('ไม่สามารถอัปโหลดรูปภาพได้');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProd.nameEn || !newProd.code || !newProd.price) {
      alert('กรุณากรอกรหัสสินค้า ชื่อสินค้า และราคา');
      return;
    }

    const isApparelOrOptions = Boolean(newProd.hasOptions || newProd.category === 'apparel');

    const created: Product = {
      id: 'prod_' + Date.now(),
      code: newProd.code.toUpperCase(),
      nameTh: newProd.nameTh || newProd.nameEn,
      nameEn: newProd.nameEn,
      size: newProd.size || (isApparelOrOptions ? 'หลายไซส์' : 'ชิ้น'),
      price: Number(newProd.price),
      category: (newProd.category as any) || 'other',
      image: newProd.image || undefined,
      active: true,
      hasOptions: isApparelOrOptions,
      sizes: isApparelOrOptions ? (newProd.sizes && newProd.sizes.length > 0 ? newProd.sizes : ['Freesize', 'M', 'L', 'XL', '2XL']) : undefined,
      colors: isApparelOrOptions ? (newProd.colors || []) : undefined,
    };

    onUpdateProducts([...products, created]);
    setShowAddModal(false);
    setNewProd({
      code: '',
      nameTh: '',
      nameEn: '',
      size: 'ชิ้น',
      price: 0,
      category: 'wasabi',
      image: '',
      active: true,
      hasOptions: false,
      sizes: ['Freesize', 'M', 'L', 'XL', '2XL'],
      colors: [],
    });
    setNewColorName('');
    setNewColorLabel('');
    setNewColorImage('');
    setNewCustomSize('');
  };

  return (
    <div className="space-y-6">
      {/* Notice header */}
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-600 text-white rounded-lg">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-teal-950">
              ฐานข้อมูลสินค้า WASABI-O Mini Shop (Product Master)
            </h3>
            <p className="text-xs text-teal-800">
              จัดการสินค้า เพิ่มเสื้อผ้า กำหนดไซส์ (Freesize, S, M, L, XL, 2XL) และสีต่างๆ พร้อมรูปภาพได้เองโดยตรง
            </p>
          </div>
        </div>

        <div className="w-full sm:w-auto grid grid-cols-2 sm:flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="text-xs bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium px-3 py-2 sm:py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition text-center"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">รีเซ็ตสินค้าเริ่มต้น</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setNewProd({
                code: `WB-${(products.length + 1).toString().padStart(2, '0')}`,
                nameTh: '',
                nameEn: '',
                size: 'ชิ้น',
                price: 0,
                category: 'apparel',
                image: '',
                active: true,
                hasOptions: true,
                sizes: ['Freesize', 'M', 'L', 'XL', '2XL'],
                colors: [],
              });
              setShowAddModal(true);
            }}
            className="text-xs bg-[#007A87] hover:bg-[#00646e] text-white font-medium px-3.5 py-2 sm:py-1.5 rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition text-center"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">เพิ่มสินค้าใหม่ / เสื้อผ้า</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 ml-2" />
        <input
          type="text"
          placeholder="ค้นหารหัสสินค้า, ชื่อไทย, หรือชื่ออังกฤษ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs text-slate-800 focus:outline-none"
        />
        <span className="text-xs text-slate-400 mr-2 whitespace-nowrap">
          พบ {filtered.length} จาก {products.length} รายการ
        </span>
      </div>

      {/* Products Grid & Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#007A87] text-white uppercase text-[11px] font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-3 w-12 text-center">ลำดับ</th>
                <th className="py-3 px-3 w-16 text-center">รูปสินค้า</th>
                <th className="py-3 px-3 w-24">รหัส</th>
                <th className="py-3 px-4">ชื่อสินค้า (English & ภาษาไทย)</th>
                <th className="py-3 px-3 w-36">ขนาด / ตัวเลือก</th>
                <th className="py-3 px-4 w-32 text-right">ราคาต่อหน่วย (฿)</th>
                <th className="py-3 px-3 w-28 text-center">สถานะ</th>
                <th className="py-3 px-4 w-28 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((prod, idx) => {
                const imgSrc = prod.image || getProductDisplayImage(prod);
                const hasVariantOptions = prod.hasOptions || prod.category === 'apparel' || (prod.sizes && prod.sizes.length > 0) || (prod.colors && prod.colors.length > 0);

                return (
                  <tr key={prod.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3 text-center font-medium text-slate-400">
                      {idx + 1}
                    </td>

                    {/* Product Image Thumbnail */}
                    <td className="py-3 px-3 text-center">
                      <div
                        onClick={() =>
                          setPreviewImage({
                            url: imgSrc,
                            title: prod.nameEn,
                            code: prod.code,
                            size: prod.size,
                            price: prod.price,
                          })
                        }
                        title="คลิกเพื่อดูรูปภาพขนาดใหญ่"
                        className="w-10 h-10 rounded-lg border border-slate-200 bg-white overflow-hidden cursor-pointer hover:border-teal-500 hover:shadow-xs transition relative group mx-auto shrink-0"
                      >
                        <img
                          src={imgSrc}
                          alt={prod.nameEn}
                          className="w-full h-full object-contain p-0.5"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                          <ZoomIn className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-teal-900">
                      {prod.code}
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <span>{prod.nameEn}</span>
                          {prod.category === 'apparel' && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-semibold">
                              👕 เสื้อผ้า
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">{prod.nameTh}</div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {hasVariantOptions ? (
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap gap-1">
                            {(prod.sizes || ['Freesize', 'M', 'L', 'XL', '2XL']).slice(0, 3).map((s) => (
                              <span key={s} className="bg-teal-50 text-teal-800 border border-teal-200 px-1.5 py-0.2 rounded text-[10px] font-bold">
                                {s}
                              </span>
                            ))}
                            {(prod.sizes?.length || 5) > 3 && (
                              <span className="text-[10px] text-slate-400">+{ (prod.sizes?.length || 5) - 3 }</span>
                            )}
                          </div>
                          {prod.colors && prod.colors.length > 0 && (
                            <div className="text-[10px] text-slate-500">
                              {prod.colors.length} สี ({prod.colors.map(c => c.name).join(', ')})
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                          {prod.size}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        ฿{prod.price}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleActive(prod.id)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition ${
                          prod.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {prod.active ? 'พร้อมขาย' : 'ระงับชั่วคราว'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => startEdit(prod)}
                        className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-800 rounded-lg transition inline-flex items-center gap-1 border border-slate-200 font-medium"
                        title="แก้ไขข้อมูลและตัวเลือกสินค้า"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-teal-600" />
                        <span>แก้ไข</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List View */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              ไม่พบสินค้าตามคำค้นหา
            </div>
          ) : (
            filtered.map((prod) => {
              const imgSrc = prod.image || getProductDisplayImage(prod);
              const hasVariantOptions = prod.hasOptions || prod.category === 'apparel' || (prod.sizes && prod.sizes.length > 0);

              return (
                <div key={prod.id} className="p-4 space-y-2.5 bg-white hover:bg-slate-50/50 transition">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        onClick={() =>
                          setPreviewImage({
                            url: imgSrc,
                            title: prod.nameEn,
                            code: prod.code,
                            size: prod.size,
                            price: prod.price,
                          })
                        }
                        className="w-11 h-11 rounded-lg border border-slate-200 bg-white overflow-hidden shrink-0 relative cursor-pointer"
                      >
                        <img
                          src={imgSrc}
                          alt={prod.nameEn}
                          className="w-full h-full object-contain p-0.5"
                        />
                        <div className="absolute bottom-0 right-0 bg-black/50 text-white p-0.5 rounded-tl">
                          <ZoomIn className="w-2.5 h-2.5" />
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded">
                            {prod.code}
                          </span>
                          {hasVariantOptions ? (
                            <span className="text-[10px] bg-purple-50 text-purple-700 font-semibold px-1.5 py-0.5 rounded">
                              👕 มีไซส์ & สี
                            </span>
                          ) : (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              {prod.size}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleActive(prod.id)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition ${
                          prod.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {prod.active ? 'พร้อมขาย' : 'ระงับ'}
                      </button>

                      <button
                        type="button"
                        onClick={() => startEdit(prod)}
                        className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition"
                        title="แก้ไข"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-900 text-xs">
                        {prod.nameEn}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {prod.nameTh}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-base text-teal-950">
                        ฿{prod.price}
                      </div>
                      <div className="text-[10px] text-slate-400">ต่อหน่วย</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add New Product Modal with Size & Color Options */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateProduct}
            className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col"
          >
            <div className="p-4 bg-[#007A87] text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm sm:text-base">เพิ่มรายการสินค้าใหม่</h3>
                <p className="text-[11px] text-teal-100">สามารถสร้างสินค้าทั่วไป หรือกำหนดไซส์และสีสำหรับเสื้อผ้าได้</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-teal-900/50 hover:bg-teal-900 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              {/* Product Photo Upload Section */}
              <div>
                <label className="block font-medium text-slate-700 mb-1.5">
                  รูปภาพหลักของสินค้า (Main Picture)
                </label>
                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="w-16 h-16 rounded-lg border border-slate-300 bg-white overflow-hidden shrink-0 flex items-center justify-center">
                    {newProd.image ? (
                      <img
                        src={newProd.image}
                        alt="Preview"
                        className="w-full h-full object-contain p-0.5"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <label className="flex items-center justify-center gap-1.5 w-full p-2 border border-dashed border-teal-300 rounded-lg cursor-pointer bg-teal-50/60 hover:bg-teal-50 text-teal-800 text-[11px] font-medium transition">
                      <Upload className="w-3.5 h-3.5 text-teal-600" />
                      <span>{isUploading ? 'กำลังโหลด...' : 'เลือกรูปหรือถ่ายภาพ'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e.target.files?.[0], (url) => setNewProd((prev) => ({ ...prev, image: url })))}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="text"
                      placeholder="หรือระบุพาธ/ลิงก์รูปภาพ เช่น /assets/... หรือ https://..."
                      value={newProd.image && newProd.image.startsWith('data:') ? '' : newProd.image || ''}
                      onChange={(e) => setNewProd({ ...newProd, image: e.target.value })}
                      className="w-full text-[11px] border border-slate-300 rounded px-2 py-1 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    รหัสสินค้า (เช่น WB-18) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="WB-18"
                    value={newProd.code}
                    onChange={(e) => setNewProd({ ...newProd, code: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono uppercase focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    หมวดหมู่สินค้า (Category) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newProd.category || 'wasabi'}
                    onChange={(e) => {
                      const cat = e.target.value as any;
                      const isApparel = cat === 'apparel';
                      setNewProd({
                        ...newProd,
                        category: cat,
                        hasOptions: isApparel ? true : newProd.hasOptions,
                        size: isApparel ? 'หลายไซส์' : newProd.size,
                      });
                    }}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="apparel">👕 เสื้อผ้า / เครื่องแต่งกาย (Apparel)</option>
                    <option value="wasabi">🌿 วาซาบิ (Wasabi)</option>
                    <option value="cashew">🥜 เม็ดมะม่วงหิมพานต์</option>
                    <option value="sauce">🥫 ซอส & มายองเนส</option>
                    <option value="seafood">🦀 ซีฟู้ด & ปูอัด</option>
                    <option value="dough">🥐 แป้งโดว์</option>
                    <option value="soap">🧼 สบู่</option>
                    <option value="other">📦 อื่นๆ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  ชื่อสินค้าภาษาอังกฤษ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WASABI-O Polo Shirt 2026"
                  value={newProd.nameEn}
                  onChange={(e) => setNewProd({ ...newProd, nameEn: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  ชื่อสินค้าภาษาไทย
                </label>
                <input
                  type="text"
                  placeholder="เช่น เสื้อโปโลวาซาบิโอ 2026"
                  value={newProd.nameTh}
                  onChange={(e) => setNewProd({ ...newProd, nameTh: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    ขนาดพื้นฐาน / หน่วย
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ตัว, ชิ้น, 100 g"
                    value={newProd.size}
                    onChange={(e) => setNewProd({ ...newProd, size: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    ราคาขายต่อหน่วย (บาท) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={newProd.price || ''}
                    onChange={(e) => setNewProd({ ...newProd, price: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono"
                  />
                </div>
              </div>

              {/* Options Toggle for Apparel / Sizes / Colors */}
              <div className="pt-2 border-t border-slate-200">
                <label className="flex items-center gap-2 p-3 bg-teal-50/70 border border-teal-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(newProd.hasOptions || newProd.category === 'apparel')}
                    onChange={(e) => setNewProd({ ...newProd, hasOptions: e.target.checked })}
                    className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                  />
                  <div>
                    <span className="font-bold text-teal-950 block">
                      👕 สินค้านี้มีตัวเลือก (ไซส์ & สี เช่น เสื้อผ้า / Apparel)
                    </span>
                    <span className="text-[11px] text-teal-700">
                      เมื่อเปิดแล้ว เวลาขายบน POS จะมีปุ่มให้เลือก Size และ สี ของสินค้านี้โดยอัตโนมัติ
                    </span>
                  </div>
                </label>
              </div>

              {/* Size & Color Configuration Section */}
              {(newProd.hasOptions || newProd.category === 'apparel') && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3.5 animate-in fade-in">
                  {/* Sizes */}
                  <div>
                    <label className="block font-bold text-slate-800 mb-1.5">
                      1. ไซส์ที่มีให้เลือก (Sizes)
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {(newProd.sizes || []).map((sz, i) => (
                        <span
                          key={i}
                          className="bg-teal-700 text-white font-bold text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs"
                        >
                          <span>{sz}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updatedSizes = (newProd.sizes || []).filter((_, idx) => idx !== i);
                              setNewProd({ ...newProd, sizes: updatedSizes });
                            }}
                            className="hover:text-red-200 p-0.5"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>

                    {/* Quick Add Size Presets */}
                    <div className="flex flex-wrap items-center gap-1 text-[11px] pt-1">
                      <span className="text-slate-500">แตะเพื่อเพิ่มไซส์ยอดนิยม:</span>
                      {COMMON_SIZES.map((sz) => {
                        const hasIt = (newProd.sizes || []).includes(sz);
                        return (
                          <button
                            key={sz}
                            type="button"
                            disabled={hasIt}
                            onClick={() => {
                              setNewProd({
                                ...newProd,
                                sizes: [...(newProd.sizes || []), sz],
                              });
                            }}
                            className={`px-2 py-0.5 rounded border transition ${
                              hasIt
                                ? 'bg-slate-200 text-slate-400 border-slate-200 cursor-not-allowed'
                                : 'bg-white hover:bg-teal-50 text-slate-700 border-slate-300'
                            }`}
                          >
                            + {sz}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Size input */}
                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        placeholder="เพิ่มไซส์อื่น เช่น 4XL, 130..."
                        value={newCustomSize}
                        onChange={(e) => setNewCustomSize(e.target.value)}
                        className="flex-1 text-xs border border-slate-300 rounded-lg px-2.5 py-1 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newCustomSize.trim() && !(newProd.sizes || []).includes(newCustomSize.trim())) {
                            setNewProd({
                              ...newProd,
                              sizes: [...(newProd.sizes || []), newCustomSize.trim()],
                            });
                            setNewCustomSize('');
                          }
                        }}
                        className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium"
                      >
                        + เพิ่มไซส์
                      </button>
                    </div>
                  </div>

                  {/* Colors */}
                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <label className="block font-bold text-slate-800">
                      2. สีสินค้าและรูปภาพแต่ละสี (Color Variants)
                    </label>

                    {/* Color List */}
                    <div className="space-y-1.5">
                      {(newProd.colors || []).map((col, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            {col.image ? (
                              <img
                                src={col.image}
                                alt={col.name}
                                className="w-8 h-8 rounded border border-slate-200 object-contain p-0.5 bg-slate-50"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-[10px]">
                                {col.name.slice(0, 2)}
                              </div>
                            )}
                            <div>
                              <span className="font-bold text-slate-900">{col.name}</span>
                              {col.label && <span className="text-slate-500 ml-1">({col.label})</span>}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const updatedColors = (newProd.colors || []).filter((_, i) => i !== idx);
                              setNewProd({ ...newProd, colors: updatedColors });
                            }}
                            className="p-1 text-slate-400 hover:text-red-500 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Form to add a color */}
                    <div className="p-3 bg-white border border-teal-200 rounded-xl space-y-2">
                      <span className="font-semibold text-teal-900 block text-[11px]">
                        + เพิ่มตัวเลือกสีใหม่:
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="ชื่อสีภาษาอังกฤษ เช่น Navy, Black..."
                          value={newColorName}
                          onChange={(e) => setNewColorName(e.target.value)}
                          className="border border-slate-300 rounded px-2.5 py-1 text-xs"
                        />
                        <input
                          type="text"
                          placeholder="ชื่อสีภาษาไทย เช่น สีกรม, สีดำ..."
                          value={newColorLabel}
                          onChange={(e) => setNewColorLabel(e.target.value)}
                          className="border border-slate-300 rounded px-2.5 py-1 text-xs"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded cursor-pointer text-xs">
                          <Camera className="w-3.5 h-3.5" />
                          <span>{newColorImage ? '✓ มีรูปแล้ว' : 'แนบรูปสีนี้'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e.target.files?.[0], (url) => setNewColorImage(url))}
                            className="hidden"
                          />
                        </label>
                        <input
                          type="text"
                          placeholder="หรือระบุพาธ/ลิงก์รูปภาพสีนี้ เช่น /assets/... หรือ https://..."
                          value={newColorImage.startsWith('data:') ? '' : newColorImage}
                          onChange={(e) => setNewColorImage(e.target.value)}
                          className="flex-1 border border-slate-300 rounded px-2 py-1 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newColorName.trim()) {
                              const newColorObj: ProductColorOption = {
                                name: newColorName.trim(),
                                label: newColorLabel.trim() || newColorName.trim(),
                                image: newColorImage || newProd.image || '',
                              };
                              setNewProd({
                                ...newProd,
                                colors: [...(newProd.colors || []), newColorObj],
                              });
                              setNewColorName('');
                              setNewColorLabel('');
                              setNewColorImage('');
                            }
                          }}
                          disabled={!newColorName.trim()}
                          className="px-3 py-1 bg-[#007A87] hover:bg-[#00646e] text-white rounded text-xs font-semibold disabled:opacity-50"
                        >
                          เพิ่มสี
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#007A87] hover:bg-[#00646e] text-white rounded-lg font-medium shadow-xs"
              >
                บันทึกสินค้าใหม่
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Product & Variant Options Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEdit}
            className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col"
          >
            <div className="p-4 bg-[#007A87] text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm sm:text-base">แก้ไขข้อมูลสินค้า [{editingProduct.code}]</h3>
                <p className="text-[11px] text-teal-100">ปรับราคา รูปภาพ หรือกำหนดตัวเลือกไซส์และสี</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="w-7 h-7 rounded-full bg-teal-900/50 hover:bg-teal-900 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              {/* Product Photo Upload Section */}
              <div>
                <label className="block font-medium text-slate-700 mb-1.5">
                  รูปภาพหลักของสินค้า (Main Picture)
                </label>
                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="w-16 h-16 rounded-lg border border-slate-300 bg-white overflow-hidden shrink-0 flex items-center justify-center">
                    {editingProduct.image ? (
                      <img
                        src={editingProduct.image}
                        alt="Preview"
                        className="w-full h-full object-contain p-0.5"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <label className="flex items-center justify-center gap-1.5 w-full p-2 border border-dashed border-teal-300 rounded-lg cursor-pointer bg-teal-50/60 hover:bg-teal-50 text-teal-800 text-[11px] font-medium transition">
                      <Upload className="w-3.5 h-3.5 text-teal-600" />
                      <span>{isUploading ? 'กำลังโหลด...' : 'เปลี่ยนรูปภาพหลัก'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e.target.files?.[0], (url) => setEditingProduct((prev) => prev ? ({ ...prev, image: url }) : null))}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="text"
                      placeholder="หรือระบุพาธ/ลิงก์รูปภาพ เช่น /assets/... หรือ https://..."
                      value={editingProduct.image && editingProduct.image.startsWith('data:') ? '' : editingProduct.image || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                      className="w-full text-[11px] border border-slate-300 rounded px-2 py-1 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    รหัสสินค้า <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.code}
                    onChange={(e) => setEditingProduct({ ...editingProduct, code: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono uppercase focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    หมวดหมู่สินค้า (Category)
                  </label>
                  <select
                    value={editingProduct.category || 'wasabi'}
                    onChange={(e) => {
                      const cat = e.target.value as any;
                      const isApparel = cat === 'apparel';
                      setEditingProduct({
                        ...editingProduct,
                        category: cat,
                        hasOptions: isApparel ? true : editingProduct.hasOptions,
                      });
                    }}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="apparel">👕 เสื้อผ้า / เครื่องแต่งกาย (Apparel)</option>
                    <option value="wasabi">🌿 วาซาบิ (Wasabi)</option>
                    <option value="cashew">🥜 เม็ดมะม่วงหิมพานต์</option>
                    <option value="sauce">🥫 ซอส & มายองเนส</option>
                    <option value="seafood">🦀 ซีฟู้ด & ปูอัด</option>
                    <option value="dough">🥐 แป้งโดว์</option>
                    <option value="soap">🧼 สบู่</option>
                    <option value="other">📦 อื่นๆ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  ชื่อสินค้าภาษาอังกฤษ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingProduct.nameEn}
                  onChange={(e) => setEditingProduct({ ...editingProduct, nameEn: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  ชื่อสินค้าภาษาไทย
                </label>
                <input
                  type="text"
                  value={editingProduct.nameTh}
                  onChange={(e) => setEditingProduct({ ...editingProduct, nameTh: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    ขนาดพื้นฐาน / หน่วย
                  </label>
                  <input
                    type="text"
                    value={editingProduct.size}
                    onChange={(e) => setEditingProduct({ ...editingProduct, size: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    ราคาขายต่อหน่วย (บาท) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Options Toggle */}
              <div className="pt-2 border-t border-slate-200">
                <label className="flex items-center gap-2 p-3 bg-teal-50/70 border border-teal-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingProduct.hasOptions || editingProduct.category === 'apparel')}
                    onChange={(e) => setEditingProduct({ ...editingProduct, hasOptions: e.target.checked })}
                    className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                  />
                  <div>
                    <span className="font-bold text-teal-950 block">
                      👕 สินค้านี้มีตัวเลือก (ไซส์ & สี เช่น เสื้อผ้า / Apparel)
                    </span>
                    <span className="text-[11px] text-teal-700">
                      เมื่อเปิดแล้ว เวลาขายบน POS จะมีปุ่มให้เลือก Size และ สี ของสินค้านี้โดยอัตโนมัติ
                    </span>
                  </div>
                </label>
              </div>

              {/* Sizes & Colors in Edit Mode */}
              {(editingProduct.hasOptions || editingProduct.category === 'apparel') && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3.5 animate-in fade-in">
                  {/* Sizes */}
                  <div>
                    <label className="block font-bold text-slate-800 mb-1.5">
                      1. ไซส์ที่มีให้เลือก (Sizes)
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {(editingProduct.sizes || []).map((sz, i) => (
                        <span
                          key={i}
                          className="bg-teal-700 text-white font-bold text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs"
                        >
                          <span>{sz}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updatedSizes = (editingProduct.sizes || []).filter((_, idx) => idx !== i);
                              setEditingProduct({ ...editingProduct, sizes: updatedSizes });
                            }}
                            className="hover:text-red-200 p-0.5"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>

                    {/* Quick Add Presets */}
                    <div className="flex flex-wrap items-center gap-1 text-[11px] pt-1">
                      <span className="text-slate-500">แตะเพื่อเพิ่มไซส์:</span>
                      {COMMON_SIZES.map((sz) => {
                        const hasIt = (editingProduct.sizes || []).includes(sz);
                        return (
                          <button
                            key={sz}
                            type="button"
                            disabled={hasIt}
                            onClick={() => {
                              setEditingProduct({
                                ...editingProduct,
                                sizes: [...(editingProduct.sizes || []), sz],
                              });
                            }}
                            className={`px-2 py-0.5 rounded border transition ${
                              hasIt
                                ? 'bg-slate-200 text-slate-400 border-slate-200 cursor-not-allowed'
                                : 'bg-white hover:bg-teal-50 text-slate-700 border-slate-300'
                            }`}
                          >
                            + {sz}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        placeholder="เพิ่มไซส์อื่น เช่น 4XL, 130..."
                        value={editCustomSize}
                        onChange={(e) => setEditCustomSize(e.target.value)}
                        className="flex-1 text-xs border border-slate-300 rounded-lg px-2.5 py-1 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (editCustomSize.trim() && !(editingProduct.sizes || []).includes(editCustomSize.trim())) {
                            setEditingProduct({
                              ...editingProduct,
                              sizes: [...(editingProduct.sizes || []), editCustomSize.trim()],
                            });
                            setEditCustomSize('');
                          }
                        }}
                        className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium"
                      >
                        + เพิ่มไซส์
                      </button>
                    </div>
                  </div>

                  {/* Colors */}
                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <label className="block font-bold text-slate-800">
                      2. สีสินค้าและรูปภาพแต่ละสี (Color Variants)
                    </label>

                    <div className="space-y-1.5">
                      {(editingProduct.colors || []).map((col, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            {col.image ? (
                              <img
                                src={col.image}
                                alt={col.name}
                                className="w-8 h-8 rounded border border-slate-200 object-contain p-0.5 bg-slate-50"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-[10px]">
                                {col.name.slice(0, 2)}
                              </div>
                            )}
                            <div>
                              <span className="font-bold text-slate-900">{col.name}</span>
                              {col.label && <span className="text-slate-500 ml-1">({col.label})</span>}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const updatedColors = (editingProduct.colors || []).filter((_, i) => i !== idx);
                              setEditingProduct({ ...editingProduct, colors: updatedColors });
                            }}
                            className="p-1 text-slate-400 hover:text-red-500 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="p-3 bg-white border border-teal-200 rounded-xl space-y-2">
                      <span className="font-semibold text-teal-900 block text-[11px]">
                        + เพิ่มตัวเลือกสีใหม่:
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="ชื่อสีภาษาอังกฤษ เช่น Navy, Black..."
                          value={editColorName}
                          onChange={(e) => setEditColorName(e.target.value)}
                          className="border border-slate-300 rounded px-2.5 py-1 text-xs"
                        />
                        <input
                          type="text"
                          placeholder="ชื่อสีภาษาไทย เช่น สีกรม, สีดำ..."
                          value={editColorLabel}
                          onChange={(e) => setEditColorLabel(e.target.value)}
                          className="border border-slate-300 rounded px-2.5 py-1 text-xs"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded cursor-pointer text-xs">
                          <Camera className="w-3.5 h-3.5" />
                          <span>{editColorImage ? '✓ มีรูปแล้ว' : 'แนบรูปสีนี้'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e.target.files?.[0], (url) => setEditColorImage(url))}
                            className="hidden"
                          />
                        </label>
                        <input
                          type="text"
                          placeholder="หรือระบุพาธ/ลิงก์รูปภาพสีนี้ เช่น /assets/... หรือ https://..."
                          value={editColorImage.startsWith('data:') ? '' : editColorImage}
                          onChange={(e) => setEditColorImage(e.target.value)}
                          className="flex-1 border border-slate-300 rounded px-2 py-1 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (editColorName.trim()) {
                              const newColorObj: ProductColorOption = {
                                name: editColorName.trim(),
                                label: editColorLabel.trim() || editColorName.trim(),
                                image: editColorImage || editingProduct.image || '',
                              };
                              setEditingProduct({
                                ...editingProduct,
                                colors: [...(editingProduct.colors || []), newColorObj],
                              });
                              setEditColorName('');
                              setEditColorLabel('');
                              setEditColorImage('');
                            }
                          }}
                          disabled={!editColorName.trim()}
                          className="px-3 py-1 bg-[#007A87] hover:bg-[#00646e] text-white rounded text-xs font-semibold disabled:opacity-50"
                        >
                          เพิ่มสี
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#007A87] hover:bg-[#00646e] text-white rounded-lg font-medium shadow-xs"
              >
                บันทึกการแก้ไข
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lightbox Modal for Full Size Photo Preview */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-teal-400" />
                <span className="font-bold text-xs sm:text-sm truncate">
                  รูปภาพสินค้า: {previewImage.code ? `[${previewImage.code}]` : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-100 flex items-center justify-center min-h-[260px] max-h-[380px] overflow-hidden">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[340px] max-w-full object-contain drop-shadow-md rounded-lg"
              />
            </div>

            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{previewImage.title}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  {previewImage.code && (
                    <span className="font-mono text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200 px-1.5 py-0.5 rounded">
                      {previewImage.code}
                    </span>
                  )}
                  {previewImage.size && (
                    <span className="text-xs text-slate-500">{previewImage.size}</span>
                  )}
                </div>
              </div>

              {previewImage.price !== undefined && (
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">ราคาต่อหน่วย</span>
                  <span className="font-mono font-bold text-base text-teal-900">
                    ฿{previewImage.price}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
