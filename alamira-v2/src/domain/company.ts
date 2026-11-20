export interface CompanyProfile {
  name: string
  subTitle: string
  address: string
  city: string
  country: string
  phone?: string
  taxNumber?: string
  commercialRecord?: string
}

export const AL_AMIRA_COMPANY: CompanyProfile = {
  name: 'الأميرة للتوريدات والتجارة العامة',
  subTitle: 'نظام إدارة المبيعات والمخزون المطور',
  address: 'قنا - م الوقف',
  city: 'قنا',
  country: 'جمهورية مصر العربية',
}
