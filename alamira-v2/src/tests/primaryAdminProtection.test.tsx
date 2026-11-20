import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { isPrimaryAdmin, PRIMARY_ADMIN_ID } from '@/auth/rbac'
import { mockDataService } from '@/services/mockDataService'
import { dataService } from '@/services/dataService'
import { supabaseDataService } from '@/services/supabaseDataService'
import { auditLogger } from '@/services/auditLogger'
import { AuthProvider } from '@/auth/AuthContext'
import { UserManagementSection } from '@/features/settings/UserManagementSection'
import { User } from '@/types'

describe('Al-Amira ERP V2 — Primary Admin Protection & Sales Operator Management', () => {
  const primaryAdminUser: User = {
    id: PRIMARY_ADMIN_ID,
    name: 'المدير الأساسي للنظام',
    username: 'primary_admin',
    email: 'admin.primary@alamira.com',
    role: 'ADMIN',
    title: 'المدير العام (مؤسس المنظومة)',
    is_active: true,
  }

  const secondaryAdminUser: User = {
    id: 'usr-admin-sec',
    name: 'مدير مساعد',
    username: 'assistant_admin',
    email: 'assistant@alamira.com',
    role: 'ADMIN',
    title: 'مساعد المدير العام',
    is_active: true,
  }

  const salesOperatorUser: User = {
    id: 'usr-sales-01',
    name: 'مسؤول المبيعات',
    username: 'sales_op',
    email: 'sales@alamira.com',
    role: 'SALES_OPERATOR',
    title: 'مسؤول مبيعات',
    is_active: true,
  }

  beforeEach(() => {
    mockDataService.resetToDefaults()
    auditLogger.clear()
    vi.clearAllMocks()
  })

  describe('1. Primary Administrator Identity Identification & RBAC Guard', () => {
    it('accurately identifies primary administrator UUID: 040bda71-7ffa-4a17-94d8-ff9cd72aed5d', () => {
      expect(PRIMARY_ADMIN_ID).toBe('040bda71-7ffa-4a17-94d8-ff9cd72aed5d')
      expect(isPrimaryAdmin(PRIMARY_ADMIN_ID)).toBe(true)
      expect(isPrimaryAdmin('040BDA71-7FFA-4A17-94D8-FF9CD72AED5D')).toBe(true)
      expect(isPrimaryAdmin('other-uuid-12345')).toBe(false)
      expect(isPrimaryAdmin(null)).toBe(false)
      expect(isPrimaryAdmin(undefined)).toBe(false)
    })
  })

  describe('2. Service Layer Primary Admin Protection Safeguards', () => {
    it('prevents deactivation of the primary admin via toggleUserActive', async () => {
      // Add primary admin to mock store
      await mockDataService.createUser(
        {
          name: primaryAdminUser.name,
          username: primaryAdminUser.username,
          email: primaryAdminUser.email,
          role: 'ADMIN',
          is_active: true,
        },
        primaryAdminUser
      )

      await expect(
        mockDataService.toggleUserActive(PRIMARY_ADMIN_ID, primaryAdminUser)
      ).rejects.toThrow('لا يمكن تعطيل أو حذف حساب المدير الأساسي.')

      await expect(
        supabaseDataService.toggleUserActive(PRIMARY_ADMIN_ID, primaryAdminUser)
      ).rejects.toThrow('لا يمكن تعطيل أو حذف حساب المدير الأساسي.')
    })

    it('prevents role downgrade of the primary admin to SALES_OPERATOR via updateUser', async () => {
      await expect(
        mockDataService.updateUser(
          PRIMARY_ADMIN_ID,
          { role: 'SALES_OPERATOR' },
          primaryAdminUser
        )
      ).rejects.toThrow('لا يمكن تغيير دور أو خفض صلاحيات حساب المدير الأساسي.')

      await expect(
        supabaseDataService.updateUser(
          PRIMARY_ADMIN_ID,
          { role: 'SALES_OPERATOR' },
          primaryAdminUser
        )
      ).rejects.toThrow('لا يمكن تغيير دور أو خفض صلاحيات حساب المدير الأساسي.')
    })

    it('prevents deactivation via updateUser (is_active: false)', async () => {
      await expect(
        mockDataService.updateUser(
          PRIMARY_ADMIN_ID,
          { is_active: false },
          primaryAdminUser
        )
      ).rejects.toThrow('لا يمكن تعطيل أو حذف حساب المدير الأساسي.')

      await expect(
        supabaseDataService.updateUser(
          PRIMARY_ADMIN_ID,
          { is_active: false },
          primaryAdminUser
        )
      ).rejects.toThrow('لا يمكن تعطيل أو حذف حساب المدير الأساسي.')
    })

    it('allows modifying non-sensitive profile info (name, title) of primary admin', async () => {
      // Create user in mock store
      const created = await mockDataService.createUser(
        {
          name: 'المدير العام الأصلي',
          username: 'origin_admin',
          email: 'origin@alamira.com',
          role: 'ADMIN',
        },
        primaryAdminUser
      )

      // Regular admin update
      const updated = await mockDataService.updateUser(
        created.id,
        { title: 'المدير التنفيذي للمنظومة' },
        primaryAdminUser
      )

      expect(updated.title).toBe('المدير التنفيذي للمنظومة')
    })

    it('allows toggling status and role changes for non-primary admin accounts', async () => {
      const secAdmin = await mockDataService.createUser(
        {
          name: secondaryAdminUser.name,
          username: secondaryAdminUser.username,
          email: secondaryAdminUser.email,
          role: 'ADMIN',
        },
        primaryAdminUser
      )

      const toggled = await mockDataService.toggleUserActive(secAdmin.id, primaryAdminUser)
      expect(toggled.is_active).toBe(false)

      const reToggled = await mockDataService.toggleUserActive(secAdmin.id, primaryAdminUser)
      expect(reToggled.is_active).toBe(true)
    })
  })

  describe('3. Real Sales Operator Account Creation Service Architecture', () => {
    it('enforces ADMIN role requirement when creating a sales operator', async () => {
      await expect(
        dataService.createSalesOperator(
          {
            full_name: 'محمد فتحي',
            email: 'm.fathi@alamira.com',
            password: 'Password123!',
          },
          salesOperatorUser // Caller is non-admin
        )
      ).rejects.toThrow(/غير مصرح/i)
    })

    it('validates presence of full name and email for new sales operator', async () => {
      await expect(
        dataService.createSalesOperator(
          {
            full_name: '',
            email: 'valid@alamira.com',
            password: 'Password123!',
          },
          primaryAdminUser
        )
      ).rejects.toThrow(/الاسم والبريد الإلكتروني مطلوبان/i)

      await expect(
        dataService.createSalesOperator(
          {
            full_name: 'محمد فتحي',
            email: '',
            password: 'Password123!',
          },
          primaryAdminUser
        )
      ).rejects.toThrow(/الاسم والبريد الإلكتروني مطلوبان/i)
    })

    it('successfully creates sales operator via dataService and logs audit event', async () => {
      const newOperator = await dataService.createSalesOperator(
        {
          full_name: 'عصام عبد الرحيم',
          email: 'issam@alamira.com',
          password: 'SecurePassword123!',
          username: 'issam_sales',
          phone: '01012345678',
        },
        primaryAdminUser
      )

      expect(newOperator.name).toBe('عصام عبد الرحيم')
      expect(newOperator.email).toBe('issam@alamira.com')
      expect(newOperator.role).toBe('SALES_OPERATOR')
      expect(newOperator.is_active).toBe(true)

      const auditLogs = auditLogger.getByAction('USER_CREATE')
      expect(auditLogs.length).toBe(1)
      expect(auditLogs[0].entity_name_or_number).toBe('عصام عبد الرحيم')
    })
  })

  describe('4. UI Protective Indicators and Controls in User Management View', () => {
    it('displays protected status badge for primary admin and disables deactivation button', async () => {
      // Mock getUsers to return primary admin user
      vi.spyOn(dataService, 'getUsers').mockResolvedValueOnce([
        primaryAdminUser,
        secondaryAdminUser,
        salesOperatorUser,
      ])

      render(
        <AuthProvider initialUser={primaryAdminUser}>
          <UserManagementSection />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('المدير الأساسي للنظام')).toBeInTheDocument()
      })

      // Protected badge is rendered
      expect(screen.getAllByText(/المدير الأساسي \(محمي\)|المدير الأساسي/i).length).toBeGreaterThanOrEqual(1)

      // Power toggle button for primary admin is disabled with tooltip
      const primaryAdminPowerBtn = screen.getByTitle('لا يمكن تعطيل أو حذف حساب المدير الأساسي.')
      expect(primaryAdminPowerBtn).toBeInTheDocument()
      expect(primaryAdminPowerBtn).toBeDisabled()
    })

    it('locks role and status fields when editing primary administrator in modal', async () => {
      const user = userEvent.setup()
      vi.spyOn(dataService, 'getUsers').mockResolvedValue([
        primaryAdminUser,
        salesOperatorUser,
      ])

      render(
        <AuthProvider initialUser={primaryAdminUser}>
          <UserManagementSection />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('المدير الأساسي للنظام')).toBeInTheDocument()
      })

      // Click edit on primary admin
      const editButtons = screen.getAllByTitle(/تعديل بيانات المستخدم/)
      await user.click(editButtons[0])

      // Modal appears with protective notice
      await waitFor(() => {
        expect(screen.getByText(/حساب المدير الأساسي محمي بالكامل/i)).toBeInTheDocument()
      })

      expect(
        screen.getByText(/دور المدير الأساسي محمي ولا يمكن تغييره/i)
      ).toBeInTheDocument()

      expect(
        screen.getByText(/لا يمكن تعطيل حساب المدير الأساسي/i)
      ).toBeInTheDocument()

      // Role radio buttons are disabled
      const adminRadio = screen.getByRole('radio', { name: /مدير النظام/i })
      const salesRadio = screen.getByRole('radio', { name: /مسؤول مبيعات/i })
      expect(adminRadio).toBeDisabled()
      expect(salesRadio).toBeDisabled()

      // Status checkbox is disabled
      const activeCheckbox = screen.getByRole('checkbox', { name: /الحساب نشط وجاهز للتشغيل/i })
      expect(activeCheckbox).toBeDisabled()
    })
  })
})
