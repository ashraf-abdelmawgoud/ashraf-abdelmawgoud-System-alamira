/**
 * Arabic Currency Tafqeet Utility for Al-Amira ERP V2
 * Converts numbers to formal Arabic text representation for Egyptian Pounds (EGP)
 * Preserves 100% behavioral parity with Al-Amira V1.
 */

const ONES = [
  '',
  'واحد',
  'اثنان',
  'ثلاثة',
  'أربعة',
  'خمسة',
  'ستة',
  'سبعة',
  'ثمانية',
  'تسعة',
  'عشرة',
  'أحد عشر',
  'اثنا عشر',
  'ثلاثة عشر',
  'أربعة عشر',
  'خمسة عشر',
  'ستة عشر',
  'سبعة عشر',
  'ثمانية عشر',
  'تسعة عشر',
];

const TENS = [
  '',
  '',
  'عشرون',
  'ثلاثون',
  'أربعون',
  'خمسون',
  'ستون',
  'سبعون',
  'ثمانون',
  'تسعون',
];

const HUNDREDS = [
  '',
  'مائة',
  'مائتان',
  'ثلاثمائة',
  'أربعمائة',
  'خمسمائة',
  'ستمائة',
  'سبعمائة',
  'ثمانمائة',
  'تسعمائة',
];

function convertGroup(n: number): string {
  if (n === 0) return '';
  let res = '';
  const h = Math.floor(n / 100);
  const rem = n % 100;
  if (h > 0) res += HUNDREDS[h];
  if (rem > 0) {
    if (res) res += ' و';
    if (rem < 20) {
      res += ONES[rem];
    } else {
      const o = rem % 10;
      const t = Math.floor(rem / 10);
      if (o > 0) res += ONES[o] + ' و' + TENS[t];
      else res += TENS[t];
    }
  }
  return res;
}

/**
 * Converts a numeric amount into Arabic currency words (Egyptian Pounds & Piastres)
 * Example: 1540.50 => "فقط وقدره ألف وخمسمائة وأربعون جنيهاً مصرياً وخمسون قرشاً لا غير."
 */
export function tafqeetArabic(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount) || Number(amount) === 0) {
    return 'صفر جنيه مصري لا غير';
  }

  const numAmount = Math.abs(Number(amount));
  const whole = Math.floor(numAmount);
  const piastres = Math.round((numAmount - whole) * 100);
  const parts: string[] = [];

  const millions = Math.floor(whole / 1000000);
  const thousands = Math.floor((whole % 1000000) / 1000);
  const rest = whole % 1000;

  if (millions > 0) {
    if (millions === 1) parts.push('مليون');
    else if (millions === 2) parts.push('مليونان');
    else if (millions >= 3 && millions <= 10) parts.push(convertGroup(millions) + ' ملايين');
    else parts.push(convertGroup(millions) + ' مليون');
  }

  if (thousands > 0) {
    if (thousands === 1) parts.push('ألف');
    else if (thousands === 2) parts.push('ألفان');
    else if (thousands >= 3 && thousands <= 10) parts.push(convertGroup(thousands) + ' آلاف');
    else parts.push(convertGroup(thousands) + ' ألف');
  }

  if (rest > 0) {
    parts.push(convertGroup(rest));
  }

  let result = 'فقط وقدره ' + (parts.join(' و') || 'صفر') + ' جنيهاً مصرياً';
  if (piastres > 0) {
    result += ' و' + convertGroup(piastres) + ' قرشاً';
  }
  result += ' لا غير.';

  return result;
}
