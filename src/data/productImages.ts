// High quality, lightweight SVG data URIs for default WASABI-O products
// These provide instant, zero-latency visual representation on both desktop and mobile

function createProductSvg(
  bgGradient: [string, string],
  accentColor: string,
  badgeText: string,
  iconSvg: string,
  categoryLabel: string
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bgGradient[0]}"/>
      <stop offset="100%" stop-color="${bgGradient[1]}"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.15"/>
    </filter>
  </defs>
  <!-- Background Card -->
  <rect width="200" height="200" rx="24" fill="url(#bg)"/>
  <circle cx="100" cy="95" r="56" fill="#ffffff" opacity="0.9" filter="url(#shadow)"/>
  
  <!-- Icon Graphics -->
  <g transform="translate(100, 95)">
    ${iconSvg}
  </g>

  <!-- Product Code Tag -->
  <rect x="18" y="14" width="62" height="22" rx="6" fill="#007A87"/>
  <text x="49" y="29" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" text-anchor="middle">${badgeText}</text>
  
  <!-- Category Pill -->
  <rect x="18" y="162" width="164" height="24" rx="12" fill="${accentColor}" opacity="0.92"/>
  <text x="100" y="178" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" text-anchor="middle">${categoryLabel}</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// 1. Plum Wine (ขวดไวน์)
const svgPlumWine = `<g transform="translate(-16, -32)">
  <path d="M12 0 L20 0 L20 16 L28 26 L28 58 L4 58 L4 26 L12 16 Z" fill="#7C2D12" rx="2"/>
  <rect x="10" y="32" width="12" height="18" rx="2" fill="#FEF08A"/>
  <circle x="16" y="41" r="3" fill="#65A30D"/>
</g>`;

// 2. Cashew Nuts Seaweed (เม็ดมะม่วงสาหร่าย)
const svgCashewSeaweed = `<g transform="translate(-20, -22)">
  <path d="M10 20 C10 8 30 6 36 16 C42 26 28 36 18 34 C12 32 10 26 10 20 Z" fill="#CA8A04"/>
  <path d="M6 10 Q14 2 12 18 Q20 28 14 36" stroke="#166534" stroke-width="3" fill="none" stroke-linecap="round"/>
</g>`;

// 3. Cashew Nuts Truffle (เม็ดมะม่วงทรัฟเฟิล)
const svgCashewTruffle = `<g transform="translate(-20, -22)">
  <path d="M10 20 C10 8 30 6 36 16 C42 26 28 36 18 34 C12 32 10 26 10 20 Z" fill="#A16207"/>
  <circle cx="30" cy="14" r="8" fill="#1C1917" opacity="0.8"/>
  <path d="M26 14 L34 14 M30 10 L30 18" stroke="#EAB308" stroke-width="1.5"/>
</g>`;

// 4. Cashew Nuts Choco (เม็ดมะม่วงช็อกโก้)
const svgCashewChoco = `<g transform="translate(-20, -22)">
  <path d="M10 20 C10 8 30 6 36 16 C42 26 28 36 18 34 C12 32 10 26 10 20 Z" fill="#78350F"/>
  <rect x="18" y="10" width="14" height="14" rx="2" fill="#451A03" transform="rotate(15 25 17)"/>
</g>`;

// 5. Wasabi Mayo (มายองเนส 1 แถม 1)
const svgWasabiMayo = `<g transform="translate(-24, -28)">
  <rect x="8" y="12" width="18" height="36" rx="6" fill="#FEF9C3" stroke="#FACC15" stroke-width="2"/>
  <rect x="12" y="4" width="10" height="8" rx="2" fill="#EAB308"/>
  <rect x="24" y="8" width="18" height="40" rx="6" fill="#ECFDF5" stroke="#10B981" stroke-width="2"/>
  <rect x="28" y="0" width="10" height="8" rx="2" fill="#059669"/>
  <circle cx="33" cy="28" r="4" fill="#047857"/>
</g>`;

// 6. Wasabi Sauce (ขวดซอสวาซาบิ)
const svgWasabiSauce = `<g transform="translate(-16, -30)">
  <rect x="8" y="16" width="16" height="38" rx="5" fill="#059669"/>
  <path d="M12 4 L20 4 L22 16 L10 16 Z" fill="#047857"/>
  <rect x="10" y="24" width="12" height="16" rx="2" fill="#A7F3D0"/>
</g>`;

// 7. Wasabi Paste Tube (หลอดวาซาบิบด)
const svgWasabiPaste = `<g transform="translate(-24, -20) rotate(-25)">
  <path d="M6 10 L38 4 L42 24 L8 28 Z" fill="#10B981"/>
  <rect x="0" y="14" width="6" height="10" rx="2" fill="#065F46"/>
  <path d="M14 12 L30 10 L31 22 L15 24 Z" fill="#D1FAE5"/>
</g>`;

// 8. Wasabi Coconut Soap (สบู่โคโคนัท)
const svgCoconutSoap = `<g transform="translate(-24, -20)">
  <rect x="4" y="6" width="38" height="26" rx="7" fill="#F1F5F9" stroke="#0D9488" stroke-width="2"/>
  <circle cx="16" cy="19" r="6" fill="#0F766E"/>
  <circle cx="28" cy="14" r="3" fill="#99F6E4"/>
  <circle cx="32" cy="22" r="2" fill="#99F6E4"/>
</g>`;

// 9. Wasabi Rice Milk Soap (สบู่ไรซ์มิลค์)
const svgRiceSoap = `<g transform="translate(-24, -20)">
  <rect x="4" y="6" width="38" height="26" rx="7" fill="#FEFCE8" stroke="#CA8A04" stroke-width="2"/>
  <path d="M14 26 C12 14 22 10 26 14 C30 18 20 26 14 26 Z" fill="#FACC15"/>
  <circle cx="30" cy="13" r="2.5" fill="#FEF08A"/>
</g>`;

// 10. King Crab Leg (ก้ามปูหิมะ)
const svgKingCrab = `<g transform="translate(-24, -22)">
  <path d="M6 30 C10 16 26 6 42 12 C36 22 24 36 6 30 Z" fill="#EF4444"/>
  <path d="M12 28 C16 18 24 14 34 16 C30 22 22 30 12 28 Z" fill="#FFFFFF"/>
  <path d="M38 10 L44 4 L46 12 Z" fill="#DC2626"/>
</g>`;

// 11. Crab Sticks Formula A1 (ปูอัด A1)
const svgCrabSticks = `<g transform="translate(-22, -22)">
  <rect x="4" y="6" width="36" height="12" rx="3" fill="#EF4444"/>
  <rect x="4" y="10" width="36" height="5" fill="#FFFFFF"/>
  <rect x="4" y="22" width="36" height="12" rx="3" fill="#EF4444"/>
  <rect x="4" y="26" width="36" height="5" fill="#FFFFFF"/>
</g>`;

// 12. Hippo Dough (แป้งพัฟฮิปโป)
const svgHippoDough = `<g transform="translate(-24, -20)">
  <ellipse cx="24" cy="18" rx="22" ry="14" fill="#FDE047" stroke="#CA8A04" stroke-width="2"/>
  <path d="M10 16 Q24 24 38 16" stroke="#B45309" stroke-width="2" fill="none"/>
  <circle cx="16" cy="14" r="2" fill="#78350F"/>
  <circle cx="32" cy="14" r="2" fill="#78350F"/>
</g>`;

// 13. Pickled Wasabi (วาซาบิดอง ซอง)
const svgPickledWasabi = `<g transform="translate(-20, -26)">
  <rect x="4" y="4" width="32" height="42" rx="4" fill="#065F46"/>
  <rect x="8" y="12" width="24" height="24" rx="3" fill="#34D399"/>
  <circle cx="20" cy="24" r="6" fill="#064E3B"/>
</g>`;

// 14. Wasabi Paste Small (หลอดเล็ก 15g)
const svgWasabiSmall = `<g transform="translate(-18, -16) rotate(-20)">
  <rect x="4" y="6" width="28" height="12" rx="3" fill="#10B981"/>
  <rect x="0" y="8" width="5" height="8" rx="1" fill="#047857"/>
</g>`;

// 15. Wasabi Paste Pocket (ซองพกพา 150g)
const svgWasabiPocket = `<g transform="translate(-20, -24)">
  <rect x="4" y="6" width="32" height="38" rx="4" fill="#059669"/>
  <circle cx="20" cy="22" r="9" fill="#A7F3D0"/>
  <text x="20" y="26" font-size="10" font-weight="bold" fill="#065F46" text-anchor="middle">W</text>
</g>`;

// 16. Wasabi Paste Bulk (กระปุกใหญ่ 500g)
const svgWasabiBulk = `<g transform="translate(-24, -22)">
  <rect x="6" y="10" width="36" height="30" rx="4" fill="#047857"/>
  <rect x="4" y="4" width="40" height="8" rx="2" fill="#10B981"/>
  <rect x="10" y="16" width="28" height="16" rx="2" fill="#D1FAE5"/>
</g>`;

export const PRODUCT_IMAGE_MAP: Record<string, string> = {
  'prod-01': '/assets/products/WB-01.jpg',
  'prod-02': '/assets/products/WB-02.jpg',
  'prod-03': '/assets/products/WB-03.jpg',
  'prod-04': '/assets/products/WB-04.jpg',
  'prod-05': '/assets/products/WB-05.jpg',
  'prod-06': '/assets/products/WB-06.jpg',
  'prod-07': '/assets/products/WB-07.jpg',
  'prod-08': '/assets/products/WB-08.jpg',
  'prod-09': '/assets/products/WB-09.jpg',
  'prod-10': '/assets/products/WB-10.jpg',
  'prod-11': '/assets/products/WB-11.jpg',
  'prod-12': '/assets/products/WB-12.jpg',
  'prod-13': '/assets/products/WB-13.jpg',
  'prod-14': '/assets/products/WB-14.jpg',
  'prod-15': '/assets/products/WB-15.jpg',
  'prod-16': '/assets/products/WB-16.jpg',
  'WB-01': '/assets/products/WB-01.jpg',
  'WB-02': '/assets/products/WB-02.jpg',
  'WB-03': '/assets/products/WB-03.jpg',
  'WB-04': '/assets/products/WB-04.jpg',
  'WB-05': '/assets/products/WB-05.jpg',
  'WB-06': '/assets/products/WB-06.jpg',
  'WB-07': '/assets/products/WB-07.jpg',
  'WB-08': '/assets/products/WB-08.jpg',
  'WB-09': '/assets/products/WB-09.jpg',
  'WB-10': '/assets/products/WB-10.jpg',
  'WB-11': '/assets/products/WB-11.jpg',
  'WB-12': '/assets/products/WB-12.jpg',
  'WB-13': '/assets/products/WB-13.jpg',
  'WB-14': '/assets/products/WB-14.jpg',
  'WB-15': '/assets/products/WB-15.jpg',
  'WB-16': '/assets/products/WB-16.jpg',
};

/**
 * Get product image: returns embedded authentic photo or custom upload
 */
export function getProductDisplayImage(
  itemOrProd?: { id?: string; code?: string; image?: string; category?: string } | null
): string {
  if (!itemOrProd) {
    return PRODUCT_IMAGE_MAP['prod-07'];
  }
  if (
    itemOrProd.image &&
    itemOrProd.image.trim().length > 0 &&
    !itemOrProd.image.startsWith('data:image/svg+xml')
  ) {
    return itemOrProd.image;
  }
  if (itemOrProd.code && PRODUCT_IMAGE_MAP[itemOrProd.code]) {
    return PRODUCT_IMAGE_MAP[itemOrProd.code];
  }
  if (itemOrProd.id && PRODUCT_IMAGE_MAP[itemOrProd.id]) {
    return PRODUCT_IMAGE_MAP[itemOrProd.id];
  }
  return PRODUCT_IMAGE_MAP['prod-07'];
}

/**
 * Client-side file compressor: converts uploaded image to optimized Data URL
 * to avoid exceeding localStorage limits
 */
export async function compressImageFile(file: File, maxWidth = 400, maxHeight = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Compress as JPEG 0.8
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve(compressedDataUrl);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
