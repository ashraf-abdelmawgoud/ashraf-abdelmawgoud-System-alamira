import { AuditLogEntry, AuditLogFilters, AuditOutcome } from '@/types'
import { getActionCategory } from '@/domain/auditMetadata'

/**
 * Realistic initial seed audit records for development demonstration and inspection.
 * Gives the Super Admin immediate visibility into activity across the ERP.
 */
export const INITIAL_SEED_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'audit-seed-01',
    action: 'INVOICE_APPROVE',
    category: 'sales',
    entity_type: 'sales_invoice',
    entity_id: 'inv-101',
    entity_name_or_number: 'INV-20261119-001',
    performed_by: 'المدير العام',
    performed_by_id: 'usr-admin-01',
    performed_by_role: 'ADMIN',
    timestamp: '2026-11-19T11:30:00.000Z',
    outcome: 'success',
    details: {
      customer_name: 'شركة النيل للمقاولات العامة',
      total_amount: 14500,
      items_count: 3,
    },
  },
  {
    id: 'audit-seed-02',
    action: 'ACCESS_DENIED',
    category: 'security',
    entity_type: 'security_access',
    entity_id: '/suppliers',
    entity_name_or_number: 'دليل الموردين',
    performed_by: 'مسؤول المبيعات',
    performed_by_id: 'usr-sales-01',
    performed_by_role: 'SALES_OPERATOR',
    timestamp: '2026-11-19T10:15:20.000Z',
    outcome: 'denied',
    reason: 'محاولة وصول غير مصرحة: دليل الموردين مخصص لمدير النظام فقط',
    details: {
      attempted_path: '/suppliers',
      required_permission: 'suppliers:view',
    },
  },
  {
    id: 'audit-seed-03',
    action: 'STOCK_RECEIPT_APPROVE',
    category: 'inventory',
    entity_type: 'stock_receipt',
    entity_id: 'rec-002',
    entity_name_or_number: 'REC-20261119-002',
    performed_by: 'المدير العام',
    performed_by_id: 'usr-admin-01',
    performed_by_role: 'ADMIN',
    timestamp: '2026-11-19T09:45:00.000Z',
    outcome: 'success',
    details: {
      supplier_name: 'شركة السويدي للكابلات',
      total_amount: 32000,
      items_count: 2,
    },
  },
  {
    id: 'audit-seed-04',
    action: 'CUSTOMER_CREATE',
    category: 'customers',
    entity_type: 'customer',
    entity_id: 'cust-105',
    entity_name_or_number: 'مؤسسة قنا لمواد البناء',
    performed_by: 'مسؤول المبيعات',
    performed_by_id: 'usr-sales-01',
    performed_by_role: 'SALES_OPERATOR',
    timestamp: '2026-11-19T08:20:10.000Z',
    outcome: 'success',
    details: {
      phone: '01011223344',
      city: 'قنا',
      address: 'قنا - شارع 23 يوليو',
    },
  },
  {
    id: 'audit-seed-05',
    action: 'INVOICE_CREATE',
    category: 'sales',
    entity_type: 'sales_invoice',
    entity_id: 'inv-100',
    entity_name_or_number: 'INV-20261118-005',
    performed_by: 'مسؤول المبيعات',
    performed_by_id: 'usr-sales-01',
    performed_by_role: 'SALES_OPERATOR',
    timestamp: '2026-11-18T16:10:00.000Z',
    outcome: 'success',
    details: {
      customer_id: 'cust-102',
      items_count: 2,
      total: 5800,
      status: 'draft',
    },
  },
  {
    id: 'audit-seed-06',
    action: 'PRODUCT_UPDATE',
    category: 'products',
    entity_type: 'product',
    entity_id: 'prod-001',
    entity_name_or_number: 'كابل سويدي نحاس معزول 4 مم (لفة 100م)',
    performed_by: 'المدير العام',
    performed_by_id: 'usr-admin-01',
    performed_by_role: 'ADMIN',
    timestamp: '2026-11-18T14:05:00.000Z',
    outcome: 'success',
    before_state: {
      selling_price: 320,
      purchase_price: 250,
    },
    after_state: {
      selling_price: 340,
      purchase_price: 260,
    },
    details: {
      price_difference: 20,
    },
  },
  {
    id: 'audit-seed-07',
    action: 'AUTH_SWITCH_USER',
    category: 'security',
    entity_type: 'security_access',
    entity_id: 'usr-sales-01',
    entity_name_or_number: 'تبديل الحساب الحالي',
    performed_by: 'المدير العام',
    performed_by_id: 'usr-admin-01',
    performed_by_role: 'ADMIN',
    timestamp: '2026-11-18T12:00:00.000Z',
    outcome: 'success',
    details: {
      switched_to: 'مسؤول المبيعات',
      target_role: 'SALES_OPERATOR',
      note: 'محاكاة تشغيلية لأغراض التدقيق وفحص الصلاحيات',
    },
  },
  {
    id: 'audit-seed-08',
    action: 'BACKUP_EXPORT_JSON',
    category: 'admin',
    entity_type: 'system_backup',
    entity_id: 'backup-20261117',
    entity_name_or_number: 'نسخة احتياطية كاملة JSON',
    performed_by: 'المدير العام',
    performed_by_id: 'usr-admin-01',
    performed_by_role: 'ADMIN',
    timestamp: '2026-11-17T18:00:00.000Z',
    outcome: 'success',
    details: {
      format: 'JSON',
      tables_included: ['products', 'customers', 'invoices', 'inventory'],
    },
  },
]

/**
 * In-memory Audit Logger for regulatory tracking, compliance, and user actions.
 * Centralized business activity tracking isolated from production backends.
 */
let auditLogsStore: AuditLogEntry[] = JSON.parse(JSON.stringify(INITIAL_SEED_AUDIT_LOGS))
let lastLoggedEvent: { key: string; time: number } | null = null

export const auditLogger = {
  /**
   * Records a new audit log entry.
   * Auto-populates ID, Cairo timestamp, category, and outcome.
   * De-duplicates identical consecutive calls within 300ms.
   */
  record(
    entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'outcome'> & {
      outcome?: AuditOutcome
      timestamp?: string
    }
  ): AuditLogEntry {
    const now = Date.now()
    const dedupeKey = `${entry.action}_${entry.entity_id}_${entry.performed_by}_${entry.outcome || 'success'}`

    if (lastLoggedEvent && lastLoggedEvent.key === dedupeKey && now - lastLoggedEvent.time < 300) {
      // Duplicate event within threshold, return most recent
      return auditLogsStore[0]
    }

    lastLoggedEvent = { key: dedupeKey, time: now }

    const category = entry.category || getActionCategory(entry.action)
    const log: AuditLogEntry = {
      ...entry,
      id: `audit-${now}-${Math.random().toString(36).substring(2, 7)}`,
      category,
      outcome: entry.outcome || 'success',
      timestamp: entry.timestamp || new Date().toISOString(),
    }

    auditLogsStore.unshift(log)
    return log
  },

  /**
   * Returns all recorded audit log entries.
   */
  getAll(): AuditLogEntry[] {
    return JSON.parse(JSON.stringify(auditLogsStore))
  },

  /**
   * Advanced filter search across audit records.
   */
  getFiltered(filters?: AuditLogFilters): AuditLogEntry[] {
    let result = [...auditLogsStore]

    if (!filters) return result

    // 1. Text search
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase()
      result = result.filter((entry) => {
        const matchName = entry.entity_name_or_number?.toLowerCase().includes(q)
        const matchEntityId = entry.entity_id.toLowerCase().includes(q)
        const matchPerformer = entry.performed_by.toLowerCase().includes(q)
        const matchAction = entry.action.toLowerCase().includes(q)
        const matchReason = entry.reason?.toLowerCase().includes(q)
        const matchDetails = entry.details
          ? JSON.stringify(entry.details).toLowerCase().includes(q)
          : false

        return (
          matchName ||
          matchEntityId ||
          matchPerformer ||
          matchAction ||
          matchReason ||
          matchDetails
        )
      })
    }

    // 2. Action category filter
    if (filters.category && filters.category !== 'all') {
      result = result.filter((entry) => entry.category === filters.category)
    }

    // 3. Action filter
    if (filters.action && filters.action !== 'all') {
      result = result.filter((entry) => entry.action === filters.action)
    }

    // 4. Outcome filter
    if (filters.outcome && filters.outcome !== 'all') {
      result = result.filter((entry) => entry.outcome === filters.outcome)
    }

    // 5. Performer filter
    if (filters.performedBy && filters.performedBy !== 'all') {
      const p = filters.performedBy.toLowerCase()
      result = result.filter(
        (entry) =>
          entry.performed_by.toLowerCase() === p ||
          entry.performed_by_id?.toLowerCase() === p
      )
    }

    // 6. Date range filter
    if (filters.startDate) {
      const start = new Date(filters.startDate)
      start.setHours(0, 0, 0, 0)
      result = result.filter((entry) => new Date(entry.timestamp) >= start)
    }

    if (filters.endDate) {
      const end = new Date(filters.endDate)
      end.setHours(23, 59, 59, 999)
      result = result.filter((entry) => new Date(entry.timestamp) <= end)
    }

    return JSON.parse(JSON.stringify(result))
  },

  /**
   * Filters audit logs by target entity type and entity ID.
   */
  getByEntity(entityType: AuditLogEntry['entity_type'], entityId: string): AuditLogEntry[] {
    return auditLogsStore.filter(
      (entry) => entry.entity_type === entityType && entry.entity_id === entityId
    )
  },

  /**
   * Filters audit logs by action.
   */
  getByAction(action: AuditLogEntry['action']): AuditLogEntry[] {
    return auditLogsStore.filter((entry) => entry.action === action)
  },

  /**
   * Returns audit logs performed by a specific user or role.
   */
  getByPerformer(performedBy: string): AuditLogEntry[] {
    return auditLogsStore.filter((entry) => entry.performed_by === performedBy)
  },

  /**
   * Clears the in-memory audit log store (useful for clean unit tests).
   */
  clear() {
    auditLogsStore = []
    lastLoggedEvent = null
  },

  /**
   * Resets audit log store back to initial seed mock records.
   */
  resetToInitial() {
    auditLogsStore = JSON.parse(JSON.stringify(INITIAL_SEED_AUDIT_LOGS))
    lastLoggedEvent = null
  },
}
