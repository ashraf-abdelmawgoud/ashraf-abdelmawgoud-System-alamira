import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout'
import {
  DashboardPage,
  ProductsPage,
  CustomersPage,
  InvoicesPage,
  InventoryPage,
  ReportsPage,
  NotFoundPage,
} from '@/pages'
import { RoleGuard } from '@/auth'

const SuppliersPage = lazy(() => import('@/pages/SuppliersPage').then(m => ({ default: m.SuppliersPage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const AuditLogPage = lazy(() => import('@/pages/AuditLogPage').then(m => ({ default: m.AuditLogPage })))

const loadingPage = (page: React.ReactNode) => (
  <Suspense fallback={<div role="status" className="p-6 text-sm text-slate-600">جارٍ تحميل الصفحة...</div>}>
    {page}
  </Suspense>
)

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'dashboard',
        element: <Navigate to="/" replace />,
      },
      {
        path: 'products',
        element: <ProductsPage />,
      },
      {
        path: 'customers',
        element: (
          <RoleGuard requiredPermission="customers:view">
            <CustomersPage />
          </RoleGuard>
        ),
      },
      {
        path: 'suppliers',
        element: (
          <RoleGuard
            requiredPermission="suppliers:view"
            fallbackTitle="صلاحية الموردين غير ممنوحة"
            fallbackMessage="غير مصرح لمسؤول المبيعات بالوصول إلى إدارة الموردين وحساباتهم وفقاً لسياسة الصلاحيات المعتمدة."
          >
            {loadingPage(<SuppliersPage />)}
          </RoleGuard>
        ),
      },
      {
        path: 'invoices',
        element: <InvoicesPage />,
      },
      {
        path: 'inventory',
        element: (
          <RoleGuard
            requiredPermission="inventory:manage"
            fallbackTitle="صلاحية حركات المخزن غير ممنوحة"
            fallbackMessage="حركات وأذون المخزن مخصصة لأمناء المخازن ومدير النظام فقط."
          >
            <InventoryPage />
          </RoleGuard>
        ),
      },
      {
        path: 'reports',
        element: (
          <RoleGuard
            requiredPermission="reports:view"
            fallbackTitle="التقارير والمؤشرات العامة غير مصرح بها"
            fallbackMessage="عرض التقارير المحاسبية والمخزنية العامة مقصور على إدارة النظام."
          >
            <ReportsPage />
          </RoleGuard>
        ),
      },
      {
        path: 'settings',
        element: (
          <RoleGuard
            requiredPermission="settings:manage"
            fallbackTitle="إعدادات النظام والنسخ الاحتياطي"
            fallbackMessage="هذه الشاشة مخصصة لمدير النظام فقط للتحكم في الإعدادات وإجراء النسخ الاحتياطي."
          >
            {loadingPage(<SettingsPage />)}
          </RoleGuard>
        ),
      },
      {
        path: 'audit-log',
        element: (
          <RoleGuard
            requiredPermission="audit:view"
            fallbackTitle="سجل النشاط والرقابة غير مصرح به"
            fallbackMessage="سجل النشاط والرقابة الإدارية مخصص لمدير النظام (Super Admin) فقط لمراقبة الأمان والعمليات."
          >
            {loadingPage(<AuditLogPage />)}
          </RoleGuard>
        ),
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
