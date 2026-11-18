import React from 'react'
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  FileText,
  RotateCcw,
  Boxes,
  BarChart3,
  Settings,
} from 'lucide-react'

export interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  disabled?: boolean
  disabledReason?: string
}

export const navigationItems: NavItem[] = [
  {
    name: 'لوحة التحكم',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'المنتجات والمخزون',
    href: '/products',
    icon: Package,
  },
  {
    name: 'العملاء',
    href: '/customers',
    icon: Users,
  },
  {
    name: 'الموردين',
    href: '/suppliers',
    icon: Truck,
  },
  {
    name: 'فواتير المبيعات',
    href: '/invoices',
    icon: FileText,
  },
  {
    name: 'مردودات المبيعات',
    href: '#sales-returns',
    icon: RotateCcw,
    disabled: true,
    disabledReason: 'زر استرشادي - غير مفعل حالياً وفقاً لسياسة الترحيل',
  },
  {
    name: 'حركات المخزن',
    href: '/inventory',
    icon: Boxes,
  },
  {
    name: 'التقارير والمؤشرات',
    href: '/reports',
    icon: BarChart3,
  },
  {
    name: 'الإعدادات',
    href: '/settings',
    icon: Settings,
  },
]
