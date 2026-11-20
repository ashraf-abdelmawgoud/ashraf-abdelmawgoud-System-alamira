export interface CompanyProfile {
  name: string;
  activity: string;
  phone: string;
  address: string;
  commercial_reg: string;
  tax_id: string;
  notes: string;
}

export const OFFICIAL_COMPANY_PROFILE_DEFAULT: CompanyProfile = {
  name: 'الأميرة للتوريدات والتجارة العامة',
  activity: 'توريدات عمومية وتجارة - استيراد وتصدير وتوكيلات',
  phone: '01012345678',
  address: 'قنا - م الوقف',
  commercial_reg: '105423',
  tax_id: '450-892-110',
  notes: 'نسعد دائماً بخدمتكم وتوفير أفضل العروض والمنتجات المعمارية والتجارية.',
};

export interface SystemPreferences {
  defaultPaymentTerms: 'cash' | 'credit';
  lowStockThreshold: number;
  currencySymbol: string;
  allowDecimalsForMetric: boolean;
}

export const DEFAULT_PREFERENCES: SystemPreferences = {
  defaultPaymentTerms: 'cash',
  lowStockThreshold: 5,
  currencySymbol: 'ج.م',
  allowDecimalsForMetric: true,
};
