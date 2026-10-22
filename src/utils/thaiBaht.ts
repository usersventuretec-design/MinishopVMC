/**
 * Convert numerical baht amount to Thai Text
 * e.g. 199.00 -> หนึ่งร้อยเก้าสิบเก้าบาทถ้วน
 */
export function thaiBahtText(num: number | string): string {
  if (num === null || num === undefined) return 'ศูนย์บาทถ้วน';
  
  const parsed = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : num;
  if (isNaN(parsed) || parsed === 0) return 'ศูนย์บาทถ้วน';
  
  const isNegative = parsed < 0;
  const absNum = Math.abs(parsed);
  
  // Round to 2 decimal places
  const fixed = absNum.toFixed(2);
  const [bahtStr, satangStr] = fixed.split('.');
  
  const numbers = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const units = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];
  
  const readGroup = (groupStr: string): string => {
    let result = '';
    const len = groupStr.length;
    for (let i = 0; i < len; i++) {
      const digit = parseInt(groupStr[i], 10);
      const pos = len - i - 1;
      
      if (digit !== 0) {
        if (pos === 0 && digit === 1 && len > 1 && groupStr[len - 2] !== '0') {
          result += 'เอ็ด';
        } else if (pos === 1 && digit === 2) {
          result += 'ยี่สิบ';
        } else if (pos === 1 && digit === 1) {
          result += 'สิบ';
        } else {
          result += numbers[digit] + (pos === 1 ? '' : units[pos]);
          if (pos === 1) result += 'สิบ';
        }
      }
    }
    return result;
  };

  const readMillions = (str: string): string => {
    if (str.length <= 6) {
      return readGroup(str);
    }
    const right = str.slice(-6);
    const left = str.slice(0, -6);
    return readMillions(left) + 'ล้าน' + readGroup(right);
  };

  let bahtText = readMillions(bahtStr);
  if (!bahtText) bahtText = 'ศูนย์';
  bahtText += 'บาท';

  const satang = parseInt(satangStr, 10);
  let satangText = '';
  if (satang === 0) {
    satangText = 'ถ้วน';
  } else {
    satangText = readGroup(satangStr) + 'สตางค์';
  }

  return (isNegative ? 'ลบ' : '') + bahtText + satangText;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}
