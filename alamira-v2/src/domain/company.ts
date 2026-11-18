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
  name: 'الأميرة للتوريدات العامة والتجارة',
  subTitle: 'نظام إدارة المبيعات والمخزون المطور',
  address: 'قنا – الوقف – بجوار مركز شباب عزبة علام',
  city: 'قنا',
  country: 'جمهورية مصر العربية',
}
