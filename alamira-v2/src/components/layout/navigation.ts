import React from 'react'
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  Receipt,
  RotateCcw,
  Boxes,
  BarChart3,
  Settings,
  ShieldAlert,
} from 'lucide-react'
import { Permission, canAccessRoute } from '@/auth/rbac'
import { User } from '@/types'

export interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  disabled?: boolean
  disabledReason?: string
  requiredPermission?: Permission
}

export const navigationItems: NavItem[] = [
  {
    name: 'لوحة التحكم',
    href: '/',
    icon: LayoutDashboard,
    requiredPermission: 'route:dashboard',
  },
  {
    name: 'المنتجات والمخزون',
    href: '/products',
    icon: Package,
    requiredPermission: 'route:products',
  },
  {
    name: 'العملاء',
    href: '/customers',
    icon: Users,
    requiredPermission: 'route:customers',
  },
  {
    name: 'الموردين',
    href: '/suppliers',
    icon: Truck,
    requiredPermission: 'route:suppliers',
  },
  {
    name: 'فواتير المبيعات',
    href: '/invoices',
    icon: Receipt,
    requiredPermission: 'route:invoices',
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
    requiredPermission: 'route:inventory',
  },
  {
    name: 'التقارير والمؤشرات',
    href: '/reports',
    icon: BarChart3,
    requiredPermission: 'route:reports',
  },
  {
    name: 'سجل النشاط والرقابة',
    href: '/audit-log',
    icon: ShieldAlert,
    requiredPermission: 'route:audit_log',
  },
  {
    name: 'الإعدادات',
    href: '/settings',
    icon: Settings,
    requiredPermission: 'route:settings',
  },
]

/**
 * Filters navigation items according to user permissions and role
 */
export function getNavigationItemsForUser(user: User): NavItem[] {
  return navigationItems.filter((item) => {
    if (item.href.startsWith('#')) return true
    return canAccessRoute(user, item.href)
  })
}
