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
} from 'lucide-react';
import { Product } from '../types';
import { INITIAL_PRODUCTS } from '../data/defaultProducts';
import { getProductDisplayImage, compressImageFile } from '../data/productImages';

interface ProductMasterProps {
  products: Product[];
  onUpdateProducts: (products: Product[]) => void;
  googleAccessToken?: string | null;
}

export const ProductMaster: React.FC<ProductMasterProps> = ({
  products,
  onUpdateProducts,
  googleAccessToken,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editSize, setEditSize] = useState<string>('');
  const [editNameEn, setEditNameEn] = useState<string>('');
  const [editImage, setEditImage] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
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

  // New product form
  const [newProd, setNewProd] = useState<Partial<Product>>({
    code: '',
    nameTh: '',
    nameEn: '',
    size: '',
    price: 0,
    category: 'wasabi',
    image: '',
    active: true,
  });

  const filtered = products.filter(
    (p) =>
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nameTh.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setEditPrice(p.price);
    setEditSize(p.size);
    setEditNameEn(p.nameEn);
    setEditImage(p.image || '');
  };

  const saveEdit = (id: string) => {
    const updated = products.map((p) => {
      if (p.id === id) {
        return {
          ...p,
          price: editPrice,
          size: editSize,
          nameEn: editNameEn,
          image: editImage || p.image,
        };
      }
      return p;
    });
    onUpdateProducts(updated);
    setEditingId(null);
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
    if (confirm('คุณต้องการรีเซ็ตรายการสินค้ากลับไปเป็นค่าเริ่มต้น 16 รายการของ WASABI-O หรือไม่?')) {
      onUpdateProducts(INITIAL_PRODUCTS);
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'new' | 'edit'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      setDriveUploadStatus('');
      const dataUrl = await compressImageFile(file, 400, 400);
      if (target === 'new') {
        setNewProd((prev) => ({ ...prev, image: dataUrl }));
      } else {
        setEditImage(dataUrl);
      }

      // If user is connected to Google Workspace, back up image to Google Drive!
      if (googleAccessToken) {
        setDriveUploadStatus('กำลังสำรองรูปภาพเข้า Google Drive...');
        try {
          const { uploadProductImageToDrive } = await import('../services/googleDrive');
          const codeName = target === 'new' ? (newProd.code || 'product') : (editingId || 'product');
          const driveRes = await uploadProductImageToDrive(dataUrl, `product_${codeName}_${Date.now()}`, googleAccessToken);
          if (driveRes.directLink) {
            if (target === 'new') {
              setNewProd((prev) => ({ ...prev, image: driveRes.directLink }));
            } else {
              setEditImage(driveRes.directLink);
            }
          }
          setDriveUploadStatus('สำรองรูปภาพลงโฟลเดอร์ WASABI-O Product Images ใน Drive เรียบร้อย!');
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

    const created: Product = {
      id: 'prod_' + Date.now(),
      code: newProd.code.toUpperCase(),
      nameTh: newProd.nameTh || newProd.nameEn,
      nameEn: newProd.nameEn,
      size: newProd.size || 'ชิ้น',
      price: Number(newProd.price),
      category: (newProd.category as any) || 'other',
      image: newProd.image || undefined,
      active: true,
    };

    onUpdateProducts([...products, created]);
    setShowAddModal(false);
    setNewProd({
      code: '',
      nameTh: '',
      nameEn: '',
      size: '',
      price: 0,
      category: 'wasabi',
      image: '',
      active: true,
    });
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
              เมื่อมีการเปลี่ยนแปลงราคาขาย ระบบจะใช้ราคาใหม่กับใบเสร็จในอนาคตเท่านั้น โดยคงราคาเดิมในใบเสร็จย้อนหลังทั้งหมด
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
            <span className="truncate">รีเซ็ต 16 รายการ</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="text-xs bg-[#007A87] hover:bg-[#00646e] text-white font-medium px-3.5 py-2 sm:py-1.5 rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition text-center"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">เพิ่มสินค้าใหม่</span>
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
        {/* Desktop Table View (With Product Images) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#007A87] text-white uppercase text-[11px] font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-3 w-12 text-center">ลำดับ</th>
                <th className="py-3 px-3 w-16 text-center">รูปสินค้า</th>
                <th className="py-3 px-3 w-24">รหัส</th>
                <th className="py-3 px-4">ชื่อสินค้า (English & ภาษาไทย)</th>
                <th className="py-3 px-3 w-32">ขนาด / น้ำหนัก</th>
                <th className="py-3 px-4 w-36 text-right">ราคาต่อหน่วย (฿)</th>
                <th className="py-3 px-3 w-28 text-center">สถานะ</th>
                <th className="py-3 px-4 w-28 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((prod, idx) => {
                const isEditing = editingId === prod.id;
                const imgSrc = (isEditing && editImage) ? editImage : (prod.image || getProductDisplayImage(prod));

                return (
                  <tr key={prod.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3 text-center font-medium text-slate-400">
                      {idx + 1}
                    </td>

                    {/* Product Image Thumbnail */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex flex-col items-center gap-1">
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
                          className="w-10 h-10 rounded-lg border border-slate-200 bg-white overflow-hidden cursor-pointer hover:border-teal-500 hover:shadow-xs transition relative group shrink-0"
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

                        {isEditing && (
                          <label className="text-[10px] text-teal-700 hover:text-teal-900 cursor-pointer flex items-center gap-0.5">
                            <Camera className="w-2.5 h-2.5" />
                            <span>เปลี่ยนรูป</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileUpload(e, 'edit')}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-teal-900">
                      {prod.code}
                    </td>
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={editNameEn}
                            onChange={(e) => setEditNameEn(e.target.value)}
                            className="w-full text-xs border border-teal-500 rounded px-2 py-1"
                            placeholder="English Name"
                          />
                          <input
                            type="url"
                            value={editImage.startsWith('data:') ? '' : editImage}
                            onChange={(e) => setEditImage(e.target.value)}
                            className="w-full text-[10px] border border-slate-200 rounded px-2 py-0.5"
                            placeholder="หรือวางลิงก์รูปภาพ (Image URL)..."
                          />
                        </div>
                      ) : (
                        <div>
                          <div className="font-bold text-slate-800 text-xs">{prod.nameEn}</div>
                          <div className="text-[11px] text-slate-500">{prod.nameTh}</div>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editSize}
                          onChange={(e) => setEditSize(e.target.value)}
                          className="w-24 text-xs border border-teal-500 rounded px-2 py-1"
                        />
                      ) : (
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                          {prod.size}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editPrice}
                          onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                          className="w-24 text-right font-mono border border-teal-500 rounded px-2 py-1 text-xs"
                        />
                      ) : (
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          ฿{prod.price}
                        </span>
                      )}
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
                      {isEditing ? (
                        <button
                          type="button"
                          onClick={() => saveEdit(prod.id)}
                          className="text-xs bg-teal-600 hover:bg-teal-700 text-white px-2.5 py-1 rounded flex items-center gap-1 mx-auto transition"
                        >
                          <Check className="w-3.5 h-3.5" /> บันทึก
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(prod)}
                          className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition mx-auto"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List View (Optimized for smartphones < md) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              ไม่พบสินค้าตามคำค้นหา
            </div>
          ) : (
            filtered.map((prod, idx) => {
              const isEditing = editingId === prod.id;
              const imgSrc = (isEditing && editImage) ? editImage : (prod.image || getProductDisplayImage(prod));

              return (
                <div key={prod.id} className="p-4 space-y-2.5 bg-white hover:bg-slate-50/50 transition">
                  {/* Top: Image + Sequence + Code Badge + Status + Edit */}
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
                        className="w-10 h-10 rounded-lg border border-slate-200 bg-white overflow-hidden shrink-0 relative cursor-pointer"
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
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {prod.size}
                          </span>
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

                      {isEditing ? (
                        <button
                          type="button"
                          onClick={() => saveEdit(prod.id)}
                          className="text-xs bg-teal-600 text-white px-2.5 py-1 rounded-md font-semibold flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" /> บันทึก
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(prod)}
                          className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition"
                          title="แก้ไข"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Middle: Names */}
                  {isEditing ? (
                    <div className="space-y-2 pt-1 border-t border-slate-100">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">ชื่อภาษาอังกฤษ:</label>
                        <input
                          type="text"
                          value={editNameEn}
                          onChange={(e) => setEditNameEn(e.target.value)}
                          className="w-full text-xs border border-teal-500 rounded px-2.5 py-1.5"
                        />
                      </div>

                      {/* Photo upload in edit mode */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 block mb-0.5">เปลี่ยนรูปภาพสินค้า:</label>
                        <label className="flex items-center justify-center gap-1.5 p-2 border border-dashed border-teal-400 rounded-lg bg-teal-50/50 text-teal-800 text-[11px] cursor-pointer">
                          <Camera className="w-3.5 h-3.5" />
                          <span>{isUploading ? 'กำลังประมวลผล...' : 'ถ่ายภาพ / เลือกไฟล์รูป'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, 'edit')}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5">ขนาด/น้ำหนัก:</label>
                          <input
                            type="text"
                            value={editSize}
                            onChange={(e) => setEditSize(e.target.value)}
                            className="w-full text-xs border border-teal-500 rounded px-2.5 py-1.5"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5">ราคาขาย (฿):</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editPrice}
                            onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                            className="w-full text-xs font-mono font-bold text-right border border-teal-500 rounded px-2.5 py-1.5"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
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
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add New Product Modal with Photo Attachment */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateProduct}
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col"
          >
            <div className="p-4 bg-[#007A87] text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">เพิ่มรายการสินค้าใหม่ (WASABI-O)</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-teal-900/50 hover:bg-teal-900 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs overflow-y-auto flex-1">
              {/* Product Photo Upload Section */}
              <div>
                <label className="block font-medium text-slate-700 mb-1.5">
                  รูปภาพสินค้า (Product Picture)
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
                        onChange={(e) => handleFileUpload(e, 'new')}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="url"
                      placeholder="หรือวางลิงก์รูปภาพ (Image URL)..."
                      value={newProd.image && newProd.image.startsWith('data:') ? '' : newProd.image || ''}
                      onChange={(e) => setNewProd({ ...newProd, image: e.target.value })}
                      className="w-full text-[11px] border border-slate-300 rounded px-2 py-1 bg-white"
                    />
                    {driveUploadStatus && (
                      <p className="text-[10px] text-teal-700 bg-teal-50 px-2 py-1 rounded font-medium flex items-center gap-1">
                        <Check className="w-3 h-3 text-teal-600 shrink-0" />
                        <span>{driveUploadStatus}</span>
                      </p>
                    )}
                    {!driveUploadStatus && googleAccessToken && (
                      <p className="text-[10px] text-teal-600">
                        ☁️ รูปภาพจะถูกสำรองเข้าโฟลเดอร์ Google Drive อัตโนมัติ
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  รหัสสินค้า (เช่น WB-17) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="WB-17"
                  value={newProd.code}
                  onChange={(e) => setNewProd({ ...newProd, code: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono uppercase focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  ชื่อสินค้าภาษาอังกฤษ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wasabi Roasted Seaweed"
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
                  placeholder="เช่น สาหร่ายย่างรสวาซาบิ"
                  value={newProd.nameTh}
                  onChange={(e) => setNewProd({ ...newProd, nameTh: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    ขนาด / ปริมาณ
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น 100 g หรือ 250 ml"
                    value={newProd.size}
                    onChange={(e) => setNewProd({ ...newProd, size: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    ราคาขาย (บาท) <span className="text-red-500">*</span>
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
                className="px-4 py-2 bg-[#007A87] hover:bg-[#00646e] text-white rounded-lg font-medium"
              >
                เพิ่มรายการ
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
