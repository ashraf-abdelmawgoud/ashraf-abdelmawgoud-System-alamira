/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { mockDataService } from './mockDataService'
import { supabaseDataService } from './supabaseDataService'
import { isMockMode, isSupabaseConfigured } from './supabaseClient'
import { auditLogger } from './auditLogger'
import {
  OFFICIAL_COMPANY_PROFILE_DEFAULT,
  DEFAULT_PREFERENCES,
} from '@/features/settings/types'
import {
  Product,
  ProductFormData,
  ProductStatus,
  Customer,
  CustomerFormData,
  CustomerStatus,
  Supplier,
  SupplierFormData,
  SupplierStatus,
  SalesInvoice,
  SalesInvoiceFormData,
  InventoryMovementLog,
  AuditLogEntry,
  User,
  Role,
  DashboardSummary,
  CompanyProfile,
  SystemPreferences,
} from '@/types'

/**
 * Unified Application Data Service Gateway
 * Automatically selects real Supabase adapter in production or Mock Service in development/testing.
 * Strictly guarantees: NEVER silently falls back to mock data on real backend errors.
 */
export const dataService = {
  isMock(): boolean {
    return isMockMode()
  },

  isRealBackendActive(): boolean {
    return !isMockMode() && isSupabaseConfigured()
  },

  // =========================================================================
  // PRODUCTS
  // =========================================================================
  async getProducts(
    filters?: {
      search?: string
      category?: string
      status?: ProductStatus
    },
    currentUserRole?: string
  ): Promise<Product[]> {
    if (this.isMock()) {
      return mockDataService.getProducts(filters)
    }
    return supabaseDataService.getProducts(filters, currentUserRole)
  },

  async getCategories(): Promise<string[]> {
    if (this.isMock()) {
      return mockDataService.getCategories()
    }
    return supabaseDataService.getCategories()
  },

  async getProductById(id: string, currentUserRole?: string): Promise<Product | null> {
    if (this.isMock()) {
      return mockDataService.getProductById(id)
    }
    return supabaseDataService.getProductById(id, currentUserRole)
  },

  async createProduct(data: ProductFormData, actor: User): Promise<Product> {
    if (this.isMock()) {
      return mockDataService.createProduct(data, actor)
    }
    return supabaseDataService.createProduct(data, actor)
  },

  async updateProduct(id: string, data: ProductFormData, actor: User): Promise<Product> {
    if (this.isMock()) {
      return mockDataService.updateProduct(id, data, actor)
    }
    return supabaseDataService.updateProduct(id, data, actor)
  },

  async toggleProductStatus(id: string, isActive: boolean, actor: User): Promise<Product> {
    if (this.isMock()) {
      const prod = await mockDataService.getProductById(id)
      if (!prod) throw new Error('الصنف غير موجود')
      const updatedFormData: ProductFormData = {
        sku: prod.sku,
        name: prod.name,
        category: prod.category,
        unit: prod.unit,
        allows_decimal_quantity: prod.allows_decimal_quantity,
        purchase_price: prod.purchase_price,
        selling_price: prod.selling_price,
        min_stock_level: prod.min_stock_level,
        description: prod.description,
        is_active: isActive,
      }
      return mockDataService.updateProduct(id, updatedFormData, actor)
    }
    return supabaseDataService.toggleProductStatus(id, isActive, actor)
  },

  async deleteProduct(id: string, actor: User): Promise<void> {
    if (this.isMock()) {
      await mockDataService.deleteProduct(id, actor)
      return
    }
    return supabaseDataService.deleteProduct(id, actor)
  },

  // =========================================================================
  // CUSTOMERS
  // =========================================================================
  async getCustomers(filters?: { search?: string; status?: CustomerStatus }): Promise<Customer[]> {
    if (this.isMock()) {
      return mockDataService.getCustomers(filters)
    }
    return supabaseDataService.getCustomers(filters)
  },

  async createCustomer(data: CustomerFormData, actor: User): Promise<Customer> {
    if (this.isMock()) {
      return mockDataService.createCustomer(data, actor)
    }
    return supabaseDataService.createCustomer(data, actor)
  },

  async updateCustomer(id: string, data: CustomerFormData, actor: User): Promise<Customer> {
    if (this.isMock()) {
      return mockDataService.updateCustomer(id, data, actor)
    }
    return supabaseDataService.updateCustomer(id, data, actor)
  },

  async deleteCustomer(id: string, actor: User): Promise<boolean> {
    if (this.isMock()) {
      return mockDataService.deleteCustomer(id, actor)
    }
    return supabaseDataService.deleteCustomer(id, actor)
  },

  // =========================================================================
  // SUPPLIERS
  // =========================================================================
  async getSuppliers(filters?: { search?: string; status?: SupplierStatus }): Promise<Supplier[]> {
    if (this.isMock()) {
      return mockDataService.getSuppliers(filters)
    }
    return supabaseDataService.getSuppliers(filters)
  },

  async createSupplier(data: SupplierFormData, actor: User): Promise<Supplier> {
    if (this.isMock()) {
      return mockDataService.createSupplier(data, actor)
    }
    return supabaseDataService.createSupplier(data, actor)
  },

  async updateSupplier(id: string, data: SupplierFormData, actor: User): Promise<Supplier> {
    if (this.isMock()) {
      return mockDataService.updateSupplier(id, data, actor)
    }
    return supabaseDataService.updateSupplier(id, data, actor)
  },

  async deleteSupplier(id: string, actor: User): Promise<boolean> {
    if (this.isMock()) {
      return mockDataService.deleteSupplier(id, actor)
    }
    return supabaseDataService.deleteSupplier(id, actor)
  },

  // =========================================================================
  // SALES INVOICES & ATOMIC ACTIONS
  // =========================================================================
  async getInvoices(): Promise<SalesInvoice[]> {
    if (this.isMock()) {
      return mockDataService.getInvoices()
    }
    return supabaseDataService.getInvoices()
  },

  async createInvoice(data: SalesInvoiceFormData, actor: User): Promise<SalesInvoice> {
    if (this.isMock()) {
      return mockDataService.createInvoice(data, actor)
    }
    return supabaseDataService.createInvoice(data, actor)
  },

  async updateDraftInvoice(id: string, data: SalesInvoiceFormData, actor: User): Promise<SalesInvoice> {
    if (this.isMock()) {
      return mockDataService.updateDraftInvoice(id, data, actor)
    }
    return supabaseDataService.updateDraftInvoice(id, data, actor)
  },

  async approveInvoice(invoiceId: string, actor: User): Promise<SalesInvoice> {
    if (this.isMock()) {
      return mockDataService.approveInvoice(invoiceId, actor)
    }
    return supabaseDataService.approveInvoice(invoiceId, actor)
  },

  async cancelApprovedInvoice(invoiceId: string, reason: string, actor: User): Promise<SalesInvoice> {
    if (this.isMock()) {
      return mockDataService.cancelApprovedInvoice(invoiceId, reason, actor)
    }
    return supabaseDataService.cancelApprovedInvoice(invoiceId, reason, actor)
  },

  async deleteDraftInvoice(invoiceId: string, actor: User): Promise<boolean> {
    if (this.isMock()) {
      return mockDataService.deleteDraftInvoice(invoiceId, actor)
    }
    return supabaseDataService.deleteDraftInvoice(invoiceId, actor)
  },

  async logInvoicePrint(invoiceId: string, invoiceNumber: string, actor?: User): Promise<void> {
    if (this.isMock()) {
      mockDataService.logInvoicePrint(invoiceId, invoiceNumber, actor)
      return
    }
    return supabaseDataService.logInvoicePrint(invoiceId, invoiceNumber, actor!)
  },

  async logInvoiceExportPng(invoiceId: string, invoiceNumber: string, actor?: User): Promise<void> {
    if (this.isMock()) {
      mockDataService.logInvoiceExportPng(invoiceId, invoiceNumber, actor)
      return
    }
    return supabaseDataService.logInvoiceExportPng(invoiceId, invoiceNumber, actor!)
  },

  // =========================================================================
  // MOVEMENTS
  // =========================================================================
  async getInventoryMovements(): Promise<InventoryMovementLog[]> {
    if (this.isMock()) {
      return mockDataService.getInventoryMovements()
    }
    return supabaseDataService.getInventoryMovements()
  },

  // =========================================================================
  // AUDIT LOGS
  // =========================================================================
  async getAuditLogs(): Promise<AuditLogEntry[]> {
    if (this.isMock()) {
      return mockDataService.getAuditLogs()
    }
    return supabaseDataService.getAuditLogs()
  },

  async recordAuditLog(entry: Omit<AuditLogEntry, 'id'> & { timestamp?: string }): Promise<void> {
    if (this.isMock()) {
      auditLogger.record({
        ...entry,
        timestamp: entry.timestamp || new Date().toISOString(),
      })
      return
    }
    return supabaseDataService.recordAuditLog(entry)
  },

  // =========================================================================
  // INVENTORY OPERATIONS (RECEIPTS, ISSUES, ADJUSTMENTS)
  // =========================================================================
  async getReceipts(): Promise<any[]> {
    if (this.isMock()) return mockDataService.getReceipts()
    throw new Error('عمليات أذون استلام المخزن الحقيقية غير مكتملة في طبقة الربط الحالية (PARTIALLY WIRED)')
  },

  async approveReceipt(receiptId: string): Promise<any> {
    if (this.isMock()) return mockDataService.approveReceipt(receiptId)
    throw new Error('اعتماد أذون استلام المخزن الحقيقية غير مكتمل في طبقة الربط الحالية (PARTIALLY WIRED)')
  },

  async createReceipt(data: any): Promise<any> {
    if (this.isMock()) return mockDataService.createReceipt(data)
    throw new Error('إنشاء أذون استلام المخزن الحقيقية غير مكتمل في طبقة الربط الحالية (PARTIALLY WIRED)')
  },

  async getIssues(): Promise<any[]> {
    if (this.isMock()) return mockDataService.getIssues()
    throw new Error('عمليات أذون صرف المخزن الحقيقية غير مكتملة في طبقة الربط الحالية (PARTIALLY WIRED)')
  },

  async approveIssue(issueId: string): Promise<any> {
    if (this.isMock()) return mockDataService.approveIssue(issueId)
    throw new Error('اعتماد أذون صرف المخزن الحقيقية غير مكتمل في طبقة الربط الحالية (PARTIALLY WIRED)')
  },

  async createIssue(data: any): Promise<any> {
    if (this.isMock()) return mockDataService.createIssue(data)
    throw new Error('إنشاء أذون صرف المخزن الحقيقية غير مكتمل في طبقة الربط الحالية (PARTIALLY WIRED)')
  },

  async getAdjustments(): Promise<any[]> {
    if (this.isMock()) return mockDataService.getAdjustments()
    throw new Error('عمليات تسويات الجرد الحقيقية غير مكتملة في طبقة الربط الحالية (PARTIALLY WIRED)')
  },

  async createAdjustment(data: any): Promise<any> {
    if (this.isMock()) return mockDataService.createAdjustment(data)
    throw new Error('إنشاء تسويات الجرد الحقيقية غير مكتمل في طبقة الربط الحالية (PARTIALLY WIRED)')
  },

  async getMovementLogs(): Promise<any[]> {
    return this.getInventoryMovements()
  },

  // =========================================================================
  // DASHBOARD SUMMARY
  // =========================================================================
  async getDashboardSummary(): Promise<DashboardSummary> {
    if (this.isMock()) {
      return mockDataService.getDashboardSummary()
    }
    return supabaseDataService.getDashboardSummary()
  },

  // =========================================================================
  // SETTINGS & PROFILE
  // =========================================================================
  async getCompanyProfile(): Promise<CompanyProfile> {
    if (this.isMock()) {
      try {
        const saved = localStorage.getItem('alamira_company_profile')
        return saved ? JSON.parse(saved) : OFFICIAL_COMPANY_PROFILE_DEFAULT
      } catch {
        return OFFICIAL_COMPANY_PROFILE_DEFAULT
      }
    }
    return supabaseDataService.getCompanyProfile()
  },

  async updateCompanyProfile(profile: CompanyProfile, actor: User): Promise<CompanyProfile> {
    if (this.isMock()) {
      localStorage.setItem('alamira_company_profile', JSON.stringify(profile))
      this.logSettingsUpdate('company_profile', 'بيانات وهوية المنشأة', { name: profile.name }, actor)
      return profile
    }
    return supabaseDataService.updateCompanyProfile(profile, actor)
  },

  async getSystemPreferences(): Promise<SystemPreferences> {
    if (this.isMock()) {
      try {
        const saved = localStorage.getItem('alamira_system_preferences')
        return saved ? JSON.parse(saved) : DEFAULT_PREFERENCES
      } catch {
        return DEFAULT_PREFERENCES
      }
    }
    return supabaseDataService.getSystemPreferences()
  },

  async updateSystemPreferences(prefs: SystemPreferences, actor: User): Promise<SystemPreferences> {
    if (this.isMock()) {
      localStorage.setItem('alamira_system_preferences', JSON.stringify(prefs))
      this.logSettingsUpdate('system_preferences', 'تفضيلات النظام والتشغيل', { defaultPaymentTerms: prefs.defaultPaymentTerms }, actor)
      return prefs
    }
    return supabaseDataService.updateSystemPreferences(prefs, actor)
  },

  async logSettingsUpdate(
    settingKey: string,
    settingLabel: string,
    details?: Record<string, any>,
    actor?: User
  ): Promise<void> {
    if (this.isMock()) {
      mockDataService.logSettingsUpdate(settingKey, settingLabel, details)
      return
    }
    return supabaseDataService.logSettingsUpdate(settingKey, settingLabel, details, actor)
  },

  // =========================================================================
  // BACKUP & RESTORE
  // =========================================================================
  async restoreFromBackup(_payload: unknown, _actor?: User): Promise<boolean> {
    throw new Error(
      'استعادة البيانات عبر ملفات JSON المحلية مقتصرة على وضع المحاكاة والتطوير فقط. لاستعادة قاعدة بيانات الإنتاج أو بيئة الاختبار، يرجى استخدام أدوات النسخ الاحتياطي الخاصة بـ PostgreSQL / Supabase.'
    )
  },

  async logBackupExport(format: 'excel' | 'json', actor?: User): Promise<void> {
    if (this.isMock()) {
      mockDataService.logBackupExport(format, actor)
      return
    }
    await this.recordAuditLog({
      action: format === 'excel' ? 'BACKUP_EXPORT_EXCEL' : 'BACKUP_EXPORT_JSON',
      category: 'admin',
      entity_type: 'backup',
      entity_id: `backup-${format}-${Date.now()}`,
      entity_name_or_number: `نسخة احتياطية ${format.toUpperCase()}`,
      performed_by: actor?.name || 'مدير النظام',
      performed_by_id: actor?.id,
      performed_by_role: actor?.role || 'ADMIN',
      outcome: 'success',
      timestamp: new Date().toISOString(),
    })
  },

  // =========================================================================
  // USERS
  // =========================================================================
  async getUsers(): Promise<User[]> {
    if (this.isMock()) {
      return mockDataService.getUsers()
    }
    return supabaseDataService.getUsers()
  },

  async toggleUserActive(userId: string, actor: User): Promise<User> {
    if (this.isMock()) {
      return mockDataService.toggleUserActive(userId, actor)
    }
    return supabaseDataService.toggleUserActive(userId, actor)
  },

  async createUser(
    data: {
      name: string
      username: string
      email?: string
      role: Role
      title?: string
      is_active?: boolean
    },
    actor: User
  ): Promise<User> {
    if (this.isMock()) {
      return mockDataService.createUser(data, actor)
    }
    return supabaseDataService.createUser(data, actor)
  },

  async updateUser(userId: string, data: Partial<User>, actor: User): Promise<User> {
    if (this.isMock()) {
      return mockDataService.updateUser(userId, data, actor)
    }
    return supabaseDataService.updateUser(userId, data, actor)
  },

  async toggleUserStatus(userId: string, isActive: boolean, actor: User): Promise<void> {
    if (this.isMock()) {
      await mockDataService.toggleUserActive(userId, actor)
      return
    }
    return supabaseDataService.toggleUserStatus(userId, isActive, actor)
  },
}
