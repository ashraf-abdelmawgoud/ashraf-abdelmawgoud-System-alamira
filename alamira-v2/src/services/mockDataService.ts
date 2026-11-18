import {
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_SUPPLIERS,
  INITIAL_STOCK_RECEIPTS,
  INITIAL_STOCK_ISSUES,
  INITIAL_STOCK_ADJUSTMENTS,
  INITIAL_MOVEMENT_LOGS,
  INITIAL_SALES_INVOICES,
  MOCK_DASHBOARD_SUMMARY,
  MOCK_INVOICES,
  MOCK_INVENTORY_MOVEMENTS,
} from '@/mocks'
import {
  Product,
  ProductFormData,
  ProductStatus,
  Customer,
  CustomerFormData,
  Supplier,
  SupplierFormData,
  DashboardSummary,
  Invoice,
  SalesInvoice,
  SalesInvoiceItem,
  SalesInvoiceFormData,
  InventoryMovement,
  StockReceipt,
  StockReceiptFormData,
  StockIssue,
  StockIssueFormData,
  StockAdjustment,
  StockAdjustmentFormData,
  InventoryMovementLog,
  InventoryMovementType,
} from '@/types'
import { calculateInvoiceTotals } from '@/domain/invoiceCalculations'

/**
 * State store for mock data during the current user session.
 * Fully isolated from production Supabase backend.
 */
let productsStore: Product[] = JSON.parse(JSON.stringify(INITIAL_PRODUCTS))
let customersStore: Customer[] = JSON.parse(JSON.stringify(INITIAL_CUSTOMERS))
let suppliersStore: Supplier[] = JSON.parse(JSON.stringify(INITIAL_SUPPLIERS))
let receiptsStore: StockReceipt[] = JSON.parse(JSON.stringify(INITIAL_STOCK_RECEIPTS))
let issuesStore: StockIssue[] = JSON.parse(JSON.stringify(INITIAL_STOCK_ISSUES))
let adjustmentsStore: StockAdjustment[] = JSON.parse(JSON.stringify(INITIAL_STOCK_ADJUSTMENTS))
let movementsStore: InventoryMovementLog[] = JSON.parse(JSON.stringify(INITIAL_MOVEMENT_LOGS))
let invoicesStore: SalesInvoice[] = JSON.parse(JSON.stringify(INITIAL_SALES_INVOICES))

let simulateFailure = false

// Helper to simulate minor network latency
const delay = (ms: number = 80): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, process.env.NODE_ENV === 'test' ? 0 : ms))

export const mockDataService = {
  /**
   * Diagnostic helper for testing failure states
   */
  setSimulateFailure(fail: boolean) {
    simulateFailure = fail
  },

  /**
   * Resets in-memory stores back to initial mock datasets
   */
  resetToDefaults() {
    productsStore = JSON.parse(JSON.stringify(INITIAL_PRODUCTS))
    customersStore = JSON.parse(JSON.stringify(INITIAL_CUSTOMERS))
    suppliersStore = JSON.parse(JSON.stringify(INITIAL_SUPPLIERS))
    receiptsStore = JSON.parse(JSON.stringify(INITIAL_STOCK_RECEIPTS))
    issuesStore = JSON.parse(JSON.stringify(INITIAL_STOCK_ISSUES))
    adjustmentsStore = JSON.parse(JSON.stringify(INITIAL_STOCK_ADJUSTMENTS))
    movementsStore = JSON.parse(JSON.stringify(INITIAL_MOVEMENT_LOGS))
    invoicesStore = JSON.parse(JSON.stringify(INITIAL_SALES_INVOICES))
    simulateFailure = false
  },

  // -------------------------------------------------------------
  // PRODUCTS MANAGEMENT
  // -------------------------------------------------------------
  async getProducts(filters?: {
    search?: string
    category?: string
    status?: ProductStatus
  }): Promise<Product[]> {
    await delay()
    if (simulateFailure) throw new Error('فشل محاكاة استرجاع قائمة المنتجات')

    let result = [...productsStore]

    if (filters?.search) {
      const q = filters.search.trim().toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      )
    }

    if (filters?.category && filters.category !== 'all') {
      result = result.filter((p) => p.category === filters.category)
    }

    if (filters?.status && filters.status !== 'all') {
      if (filters.status === 'in_stock') {
        result = result.filter((p) => p.current_stock > p.min_stock_level)
      } else if (filters.status === 'low_stock') {
        result = result.filter((p) => p.current_stock > 0 && p.current_stock <= p.min_stock_level)
      } else if (filters.status === 'out_of_stock') {
        result = result.filter((p) => p.current_stock <= 0)
      }
    }

    return JSON.parse(JSON.stringify(result))
  },

  async getProductById(id: string): Promise<Product | null> {
    await delay()
    if (simulateFailure) throw new Error('فشل محاكاة استرجاع بيانات الصنف')
    const item = productsStore.find((p) => p.id === id)
    return item ? JSON.parse(JSON.stringify(item)) : null
  },

  async getCategories(): Promise<string[]> {
    await delay()
    const categories = Array.from(new Set(productsStore.map((p) => p.category)))
    return categories
  },

  async createProduct(data: ProductFormData): Promise<Product> {
    await delay(120)
    if (simulateFailure) throw new Error('فشل محاكاة إضافة الصنف الجديد')

    // 1. Validation
    const cleanSku = data.sku.trim().toUpperCase()
    const cleanName = data.name.trim()

    if (!cleanSku) throw new Error('يرجى إدخال كود الصنف (SKU) المطلوب')
    if (!cleanName) throw new Error('يرجى إدخال اسم المنتج أو الصنف')

    const existingSku = productsStore.find((p) => p.sku.toUpperCase() === cleanSku)
    if (existingSku) throw new Error(`كود الصنف (${cleanSku}) مسجل مسبقاً لصنف آخر`)

    if (data.purchase_price < 0) throw new Error('سعر الشراء الافتراضي لا يمكن أن يكون سالباً')
    if (data.selling_price < 0) throw new Error('سعر البيع الافتراضي لا يمكن أن يكون سالباً')
    if (data.min_stock_level < 0) throw new Error('حد الطلب الأدنى لا يمكن أن يكون سالباً')

    const openingStock = Number(data.opening_quantity || 0)
    if (isNaN(openingStock) || openingStock < 0) {
      throw new Error('الرصيد الافتتاحي يجب أن يكون رقماً صفرياً أو موجباً')
    }

    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      sku: cleanSku,
      code: cleanSku,
      name: cleanName,
      category: data.category || 'عام',
      unit: data.unit || 'قطعة',
      allows_decimal_quantity: Boolean(data.allows_decimal_quantity),
      purchase_price: Number(data.purchase_price),
      costPrice: Number(data.purchase_price),
      selling_price: Number(data.selling_price),
      sellingPrice: Number(data.selling_price),
      current_stock: openingStock,
      currentStock: openingStock,
      min_stock_level: Number(data.min_stock_level),
      minStockLevel: Number(data.min_stock_level),
      isLowStock: openingStock <= Number(data.min_stock_level),
      description: data.description?.trim() || '',
      notes: data.description?.trim() || '',
      is_active: data.is_active !== false,
      createdAt: new Date().toISOString(),
    }

    productsStore.unshift(newProduct)
    return JSON.parse(JSON.stringify(newProduct))
  },

  async updateProduct(id: string, data: ProductFormData): Promise<Product> {
    await delay(120)
    if (simulateFailure) throw new Error('فشل محاكاة تعديل الصنف')

    const index = productsStore.findIndex((p) => p.id === id)
    if (index === -1) throw new Error('الصنف المطلوب غير موجود')

    const cleanSku = data.sku.trim().toUpperCase()
    const cleanName = data.name.trim()

    if (!cleanSku) throw new Error('يرجى إدخال كود الصنف (SKU)')
    if (!cleanName) throw new Error('يرجى إدخال اسم المنتج')

    const duplicateSku = productsStore.find(
      (p) => p.id !== id && p.sku.toUpperCase() === cleanSku
    )
    if (duplicateSku) throw new Error(`كود الصنف (${cleanSku}) مسجل مسبقاً لصنف آخر`)

    const existing = productsStore[index]
    const updated: Product = {
      ...existing,
      sku: cleanSku,
      code: cleanSku,
      name: cleanName,
      category: data.category || existing.category,
      unit: data.unit || existing.unit,
      allows_decimal_quantity: Boolean(data.allows_decimal_quantity),
      purchase_price: Number(data.purchase_price),
      costPrice: Number(data.purchase_price),
      selling_price: Number(data.selling_price),
      sellingPrice: Number(data.selling_price),
      min_stock_level: Number(data.min_stock_level),
      minStockLevel: Number(data.min_stock_level),
      isLowStock: existing.current_stock <= Number(data.min_stock_level),
      description: data.description?.trim() || '',
      notes: data.description?.trim() || '',
      is_active: data.is_active !== undefined ? data.is_active : existing.is_active,
    }

    productsStore[index] = updated
    return JSON.parse(JSON.stringify(updated))
  },

  async deleteProduct(id: string): Promise<boolean> {
    await delay(100)
    if (simulateFailure) throw new Error('فشل محاكاة حذف الصنف')
    const initialLen = productsStore.length
    productsStore = productsStore.filter((p) => p.id !== id)
    return productsStore.length < initialLen
  },

  // -------------------------------------------------------------
  // CUSTOMERS MANAGEMENT
  // -------------------------------------------------------------
  async getCustomers(filters?: { search?: string; status?: string }): Promise<Customer[]> {
    await delay()
    if (simulateFailure) throw new Error('فشل محاكاة استرجاع قائمة العملاء')

    let result = [...customersStore]
    if (filters?.search) {
      const q = filters.search.trim().toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.code && c.code.toLowerCase().includes(q)) ||
          c.address.toLowerCase().includes(q)
      )
    }

    if (filters?.status && filters.status !== 'all') {
      if (filters.status === 'active') {
        result = result.filter((c) => c.is_active)
      } else if (filters.status === 'inactive') {
        result = result.filter((c) => !c.is_active)
      }
    }

    return JSON.parse(JSON.stringify(result))
  },

  async getCustomerById(id: string): Promise<Customer | null> {
    await delay()
    const item = customersStore.find((c) => c.id === id)
    return item ? JSON.parse(JSON.stringify(item)) : null
  },

  async createCustomer(data: CustomerFormData): Promise<Customer> {
    await delay(120)
    if (simulateFailure) throw new Error('فشل محاكاة إضافة العميل')

    const cleanName = data.name.trim()
    if (!cleanName) throw new Error('يرجى إدخال اسم العميل أو الشركة')

    const nextCode = `CUST-${String(customersStore.length + 1).padStart(3, '0')}`
    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      code: nextCode,
      name: cleanName,
      phone: data.phone?.trim() || '',
      address: data.address?.trim() || 'قنا',
      city: data.address?.trim() || 'قنا',
      notes: data.notes?.trim() || '',
      balance: 0,
      is_active: data.is_active !== false,
      invoices_count: 0,
      createdAt: new Date().toISOString(),
    }

    customersStore.unshift(newCustomer)
    return JSON.parse(JSON.stringify(newCustomer))
  },

  async updateCustomer(id: string, data: CustomerFormData): Promise<Customer> {
    await delay(120)
    if (simulateFailure) throw new Error('فشل محاكاة تعديل بيانات العميل')

    const index = customersStore.findIndex((c) => c.id === id)
    if (index === -1) throw new Error('العميل غير موجود')

    const cleanName = data.name.trim()
    if (!cleanName) throw new Error('يرجى إدخال اسم العميل')

    const existing = customersStore[index]
    const updated: Customer = {
      ...existing,
      name: cleanName,
      phone: data.phone?.trim() || '',
      address: data.address?.trim() || existing.address,
      city: data.address?.trim() || existing.city,
      notes: data.notes?.trim() || '',
      is_active: data.is_active !== undefined ? data.is_active : existing.is_active,
    }

    customersStore[index] = updated
    return JSON.parse(JSON.stringify(updated))
  },

  async deleteCustomer(id: string): Promise<boolean> {
    await delay(100)
    if (simulateFailure) throw new Error('فشل محاكاة حذف العميل')
    const initialLen = customersStore.length
    customersStore = customersStore.filter((c) => c.id !== id)
    return customersStore.length < initialLen
  },

  // -------------------------------------------------------------
  // SUPPLIERS MANAGEMENT
  // -------------------------------------------------------------
  async getSuppliers(filters?: { search?: string; status?: string }): Promise<Supplier[]> {
    await delay()
    if (simulateFailure) throw new Error('فشل محاكاة استرجاع قائمة الموردين')

    let result = [...suppliersStore]
    if (filters?.search) {
      const q = filters.search.trim().toLowerCase()
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.phone.includes(q) ||
          (s.code && s.code.toLowerCase().includes(q)) ||
          s.address.toLowerCase().includes(q)
      )
    }

    if (filters?.status && filters.status !== 'all') {
      if (filters.status === 'active') {
        result = result.filter((s) => s.is_active)
      } else if (filters.status === 'inactive') {
        result = result.filter((s) => !s.is_active)
      }
    }

    return JSON.parse(JSON.stringify(result))
  },

  async getSupplierById(id: string): Promise<Supplier | null> {
    await delay()
    const item = suppliersStore.find((s) => s.id === id)
    return item ? JSON.parse(JSON.stringify(item)) : null
  },

  async createSupplier(data: SupplierFormData): Promise<Supplier> {
    await delay(120)
    if (simulateFailure) throw new Error('فشل محاكاة إضافة المورد')

    const cleanName = data.name.trim()
    if (!cleanName) throw new Error('يرجى إدخال اسم المورد أو الشركة')

    const nextCode = `SUP-${String(suppliersStore.length + 1).padStart(3, '0')}`
    const newSupplier: Supplier = {
      id: `sup-${Date.now()}`,
      code: nextCode,
      name: cleanName,
      phone: data.phone?.trim() || '',
      address: data.address?.trim() || 'القاهرة',
      city: data.address?.trim() || 'القاهرة',
      notes: data.notes?.trim() || '',
      balance: 0,
      is_active: data.is_active !== false,
      receipts_count: 0,
      createdAt: new Date().toISOString(),
    }

    suppliersStore.unshift(newSupplier)
    return JSON.parse(JSON.stringify(newSupplier))
  },

  async updateSupplier(id: string, data: SupplierFormData): Promise<Supplier> {
    await delay(120)
    if (simulateFailure) throw new Error('فشل محاكاة تعديل بيانات المورد')

    const index = suppliersStore.findIndex((s) => s.id === id)
    if (index === -1) throw new Error('المورد غير موجود')

    const cleanName = data.name.trim()
    if (!cleanName) throw new Error('يرجى إدخال اسم المورد')

    const existing = suppliersStore[index]
    const updated: Supplier = {
      ...existing,
      name: cleanName,
      phone: data.phone?.trim() || '',
      address: data.address?.trim() || existing.address,
      city: data.address?.trim() || existing.city,
      notes: data.notes?.trim() || '',
      is_active: data.is_active !== undefined ? data.is_active : existing.is_active,
    }

    suppliersStore[index] = updated
    return JSON.parse(JSON.stringify(updated))
  },

  async deleteSupplier(id: string): Promise<boolean> {
    await delay(100)
    if (simulateFailure) throw new Error('فشل محاكاة حذف المورد')
    const initialLen = suppliersStore.length
    suppliersStore = suppliersStore.filter((s) => s.id !== id)
    return suppliersStore.length < initialLen
  },

  // -------------------------------------------------------------
  // STOCK RECEIPTS MANAGEMENT (أذون الاستلام)
  // -------------------------------------------------------------
  async getReceipts(filters?: { search?: string; status?: string }): Promise<StockReceipt[]> {
    await delay()
    if (simulateFailure) throw new Error('فشل محاكاة استرجاع أذون الاستلام')

    let list = [...receiptsStore]
    if (filters?.search) {
      const q = filters.search.trim().toLowerCase()
      list = list.filter(
        (r) =>
          r.receipt_number.toLowerCase().includes(q) ||
          (r.supplier_name && r.supplier_name.toLowerCase().includes(q)) ||
          (r.supplier_invoice_number && r.supplier_invoice_number.toLowerCase().includes(q)) ||
          (r.notes && r.notes.toLowerCase().includes(q))
      )
    }

    if (filters?.status && filters.status !== 'all') {
      list = list.filter((r) => r.status === filters.status)
    }

    return JSON.parse(JSON.stringify(list))
  },

  async getReceiptById(id: string): Promise<StockReceipt | null> {
    await delay()
    const found = receiptsStore.find((r) => r.id === id)
    return found ? JSON.parse(JSON.stringify(found)) : null
  },

  async createReceipt(data: StockReceiptFormData): Promise<StockReceipt> {
    await delay(120)
    if (simulateFailure) throw new Error('فشل محاكاة إنشاء إذن الاستلام')

    if (!data.items || data.items.length === 0) {
      throw new Error('يجب إضافة صنف واحد على الأقل في إذن الاستلام')
    }

    const todayStr = new Date().toISOString().slice(0, 10)
    const receiptNumber =
      data.receipt_number ||
      `REC-${todayStr.replace(/-/g, '')}-${String(receiptsStore.length + 1).padStart(3, '0')}`

    let supName = ''
    if (data.supplier_id) {
      const sup = suppliersStore.find((s) => s.id === data.supplier_id)
      if (sup) supName = sup.name
    }

    let calculatedTotal = 0
    const processedItems = data.items.map((it, idx) => {
      const prod = productsStore.find((p) => p.id === it.product_id)
      if (!prod) throw new Error(`الصنف رقم (${idx + 1}) غير موجود في دليل الأصناف`)
      if (!prod.is_active) {
        throw new Error(`الصنف "${prod.name}" موقوف/مؤرشف ولا يمكن استلام بضاعة جديدة له`)
      }

      const qty = Number(it.quantity)
      if (isNaN(qty) || qty <= 0) {
        throw new Error(`الكمية يجب أن تكون أكبر من الصفر في البند رقم (${idx + 1})`)
      }

      if (!prod.allows_decimal_quantity && qty % 1 !== 0) {
        throw new Error(
          `الصنف "${prod.name}" يباع بالعدد الصحيح فقط ولا يقبل كميات كسرية (الكمية المدخلة: ${qty})`
        )
      }

      const unitPrice = Number(it.unit_price) >= 0 ? Number(it.unit_price) : prod.purchase_price
      const lineTotal = Math.round(qty * unitPrice * 100) / 100
      calculatedTotal = Math.round((calculatedTotal + lineTotal) * 100) / 100

      return {
        id: `rec-item-${Date.now()}-${idx}`,
        product_id: prod.id,
        product_sku: prod.sku,
        product_name: prod.name,
        unit: prod.unit,
        allows_decimal_quantity: prod.allows_decimal_quantity,
        quantity: qty,
        unit_price: unitPrice,
        line_total: lineTotal,
      }
    })

    const receiptId = `rec-${Date.now()}`
    const newReceipt: StockReceipt = {
      id: receiptId,
      receipt_number: receiptNumber,
      receipt_date: data.receipt_date || todayStr,
      supplier_id: data.supplier_id || null,
      supplier_name: supName,
      supplier_invoice_number: data.supplier_invoice_number?.trim() || '',
      notes: data.notes?.trim() || '',
      total_amount: calculatedTotal,
      status: 'draft',
      approved_by: null,
      approved_at: null,
      created_by: 'أمين المخزن',
      created_at: new Date().toISOString(),
      items: processedItems,
    }

    receiptsStore.unshift(newReceipt)

    if (data.action === 'approve') {
      return this.approveReceipt(receiptId)
    }

    return JSON.parse(JSON.stringify(newReceipt))
  },

  async approveReceipt(receiptId: string): Promise<StockReceipt> {
    await delay(150)
    if (simulateFailure) throw new Error('فشل محاكاة اعتماد إذن الاستلام')

    const idx = receiptsStore.findIndex((r) => r.id === receiptId)
    if (idx === -1) throw new Error('إذن الاستلام غير موجود')

    const receipt = receiptsStore[idx]
    if (receipt.status === 'approved') {
      throw new Error(`إذن الإضافة رقم ${receipt.receipt_number} معتمد مسبقاً ولا يمكن اعتماده مرة أخرى`)
    }
    if (receipt.status === 'cancelled') {
      throw new Error(`لا يمكن اعتماد إذن إضافة ملغى (رقم ${receipt.receipt_number})`)
    }

    // Atomically update products and append audit movements
    for (const item of receipt.items) {
      const pIdx = productsStore.findIndex((p) => p.id === item.product_id)
      if (pIdx === -1) continue
      const prod = productsStore[pIdx]

      const newStock = Math.round((prod.current_stock + item.quantity) * 1000) / 1000
      productsStore[pIdx] = {
        ...prod,
        current_stock: newStock,
        currentStock: newStock,
        isLowStock: newStock <= prod.min_stock_level,
      }

      // Add audit log
      const logEntry: InventoryMovementLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        product_id: prod.id,
        product_sku: prod.sku,
        product_name: prod.name,
        unit: prod.unit,
        movement_type: 'receipt',
        source_doc_type: 'stock_receipt',
        source_doc_id: receipt.id,
        source_doc_number: receipt.receipt_number,
        quantity_in: item.quantity,
        quantity_out: 0,
        stock_balance_after: newStock,
        unit_cost_or_price: item.unit_price,
        notes: receipt.notes || `إذن إضافة بضاعة: ${receipt.supplier_name || 'توريد'}`,
        created_by: 'مدير المشتريات والمخازن',
        created_at: new Date().toISOString(),
      }
      movementsStore.unshift(logEntry)
    }

    receipt.status = 'approved'
    receipt.approved_by = 'مدير المشتريات والمخازن'
    receipt.approved_at = new Date().toISOString()
    receiptsStore[idx] = receipt

    return JSON.parse(JSON.stringify(receipt))
  },

  // -------------------------------------------------------------
  // STOCK ISSUES MANAGEMENT (أذون الصرف)
  // -------------------------------------------------------------
  async getIssues(filters?: { search?: string; status?: string }): Promise<StockIssue[]> {
    await delay()
    if (simulateFailure) throw new Error('فشل محاكاة استرجاع أذون الصرف')

    let list = [...issuesStore]
    if (filters?.search) {
      const q = filters.search.trim().toLowerCase()
      list = list.filter(
        (i) =>
          i.issue_number.toLowerCase().includes(q) ||
          i.recipient_name.toLowerCase().includes(q) ||
          (i.reason && i.reason.toLowerCase().includes(q)) ||
          (i.notes && i.notes.toLowerCase().includes(q))
      )
    }

    if (filters?.status && filters.status !== 'all') {
      list = list.filter((i) => i.status === filters.status)
    }

    return JSON.parse(JSON.stringify(list))
  },

  async getIssueById(id: string): Promise<StockIssue | null> {
    await delay()
    const found = issuesStore.find((i) => i.id === id)
    return found ? JSON.parse(JSON.stringify(found)) : null
  },

  async createIssue(data: StockIssueFormData): Promise<StockIssue> {
    await delay(120)
    if (simulateFailure) throw new Error('فشل محاكاة إنشاء إذن الصرف')

    const cleanRecipient = data.recipient_name.trim()
    if (!cleanRecipient) {
      throw new Error('يرجى إدخال اسم المستلم أو الجهة المستلمة للبضاعة')
    }

    if (!data.items || data.items.length === 0) {
      throw new Error('يجب إضافة صنف واحد على الأقل في إذن الصرف')
    }

    const todayStr = new Date().toISOString().slice(0, 10)
    const issueNumber =
      data.issue_number ||
      `ISS-${todayStr.replace(/-/g, '')}-${String(issuesStore.length + 1).padStart(3, '0')}`

    const processedItems = data.items.map((it, idx) => {
      const prod = productsStore.find((p) => p.id === it.product_id)
      if (!prod) throw new Error(`الصنف رقم (${idx + 1}) غير موجود بالمخزن`)
      if (!prod.is_active) {
        throw new Error(`الصنف "${prod.name}" موقوف/مؤرشف ولا يمكن صرف بضاعة له من المخزن`)
      }

      const qty = Number(it.quantity)
      if (isNaN(qty) || qty <= 0) {
        throw new Error(`الكمية المنصرفة يجب أن تكون أكبر من الصفر في البند رقم (${idx + 1})`)
      }

      if (!prod.allows_decimal_quantity && qty % 1 !== 0) {
        throw new Error(
          `الصنف "${prod.name}" يباع بالعدد الصحيح فقط ولا يقبل كميات كسرية (الكمية المنصرفة: ${qty})`
        )
      }

      return {
        id: `iss-item-${Date.now()}-${idx}`,
        product_id: prod.id,
        product_sku: prod.sku,
        product_name: prod.name,
        unit: prod.unit,
        allows_decimal_quantity: prod.allows_decimal_quantity,
        available_stock: prod.current_stock,
        quantity: qty,
      }
    })

    const issueId = `iss-${Date.now()}`
    const newIssue: StockIssue = {
      id: issueId,
      issue_number: issueNumber,
      issue_date: data.issue_date || todayStr,
      recipient_name: cleanRecipient,
      reason: data.reason?.trim() || '',
      notes: data.notes?.trim() || '',
      status: 'draft',
      approved_by: null,
      approved_at: null,
      created_by: 'أمين المخزن',
      created_at: new Date().toISOString(),
      items: processedItems,
    }

    issuesStore.unshift(newIssue)

    if (data.action === 'approve') {
      return this.approveIssue(issueId)
    }

    return JSON.parse(JSON.stringify(newIssue))
  },

  async approveIssue(issueId: string): Promise<StockIssue> {
    await delay(150)
    if (simulateFailure) throw new Error('فشل محاكاة اعتماد إذن الصرف')

    const idx = issuesStore.findIndex((i) => i.id === issueId)
    if (idx === -1) throw new Error('إذن الصرف غير موجود')

    const issue = issuesStore[idx]
    if (issue.status === 'approved') {
      throw new Error(`إذن الصرف رقم ${issue.issue_number} معتمد مسبقاً ولا يمكن اعتماده مرة أخرى`)
    }
    if (issue.status === 'cancelled') {
      throw new Error(`لا يمكن اعتماد إذن صرف ملغى (رقم ${issue.issue_number})`)
    }

    // Check available stock first
    for (const item of issue.items) {
      const prod = productsStore.find((p) => p.id === item.product_id)
      if (!prod) throw new Error(`الصنف ${item.product_name || item.product_id} غير موجود`)
      if (prod.current_stock < item.quantity) {
        throw new Error(
          `عفواً، رصيد المخزون غير كاف للمنتج "${prod.name}" (المتاح: ${prod.current_stock} ${prod.unit}، المطلوب صرفه: ${item.quantity} ${prod.unit})`
        )
      }
    }

    // Deduct stock and record audit movements
    for (const item of issue.items) {
      const pIdx = productsStore.findIndex((p) => p.id === item.product_id)
      if (pIdx === -1) continue
      const prod = productsStore[pIdx]

      const newStock = Math.round((prod.current_stock - item.quantity) * 1000) / 1000
      productsStore[pIdx] = {
        ...prod,
        current_stock: newStock,
        currentStock: newStock,
        isLowStock: newStock <= prod.min_stock_level,
      }

      // Add audit log
      const logEntry: InventoryMovementLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        product_id: prod.id,
        product_sku: prod.sku,
        product_name: prod.name,
        unit: prod.unit,
        movement_type: 'issue',
        source_doc_type: 'stock_issue',
        source_doc_id: issue.id,
        source_doc_number: issue.issue_number,
        quantity_in: 0,
        quantity_out: item.quantity,
        stock_balance_after: newStock,
        unit_cost_or_price: prod.purchase_price,
        notes: `إذن صرف بضاعة: ${issue.recipient_name} ${issue.reason ? `(${issue.reason})` : ''}`.trim(),
        created_by: 'أمين المخزن',
        created_at: new Date().toISOString(),
      }
      movementsStore.unshift(logEntry)
    }

    issue.status = 'approved'
    issue.approved_by = 'أمين المخزن'
    issue.approved_at = new Date().toISOString()
    issuesStore[idx] = issue

    return JSON.parse(JSON.stringify(issue))
  },

  // -------------------------------------------------------------
  // STOCK ADJUSTMENTS (تسويات الجرد الفعلي)
  // -------------------------------------------------------------
  async getAdjustments(filters?: { search?: string }): Promise<StockAdjustment[]> {
    await delay()
    if (simulateFailure) throw new Error('فشل محاكاة استرجاع تسويات الجرد')

    let list = [...adjustmentsStore]
    if (filters?.search) {
      const q = filters.search.trim().toLowerCase()
      list = list.filter(
        (a) =>
          a.adjustment_number.toLowerCase().includes(q) ||
          a.reason.toLowerCase().includes(q) ||
          a.items.some(
            (it) =>
              (it.product_name && it.product_name.toLowerCase().includes(q)) ||
              (it.product_sku && it.product_sku.toLowerCase().includes(q))
          )
      )
    }

    return JSON.parse(JSON.stringify(list))
  },

  async createAdjustment(data: StockAdjustmentFormData): Promise<StockAdjustment> {
    await delay(150)
    if (simulateFailure) throw new Error('فشل محاكاة تنفيذ تسوية الجرد')

    const cleanReason = data.reason.trim()
    if (!cleanReason) throw new Error('يرجى ذكر سبب تسوية الجرد وتوثيق الفارق المخزني')

    const prod = productsStore.find((p) => p.id === data.product_id)
    if (!prod) throw new Error('الصنف المختار غير موجود')
    if (!prod.is_active) {
      throw new Error(`لا يمكن اعتماد تسوية جردية لصنف موقوف/مؤرشف ("${prod.name}")`)
    }

    const actualQty = Number(data.actual_quantity)
    if (isNaN(actualQty) || actualQty < 0) {
      throw new Error('الكمية الفعلية المحصورة بالجرد لا يمكن أن تكون سالبة')
    }

    if (!prod.allows_decimal_quantity && actualQty % 1 !== 0) {
      throw new Error(
        `الصنف "${prod.name}" يباع بالعدد الصحيح فقط ولا يقبل كميات كسرية (الكمية الفعلية: ${actualQty})`
      )
    }

    const recordedQty = prod.current_stock
    const difference = Math.round((actualQty - recordedQty) * 1000) / 1000

    const todayStr = new Date().toISOString().slice(0, 10)
    const adjustmentNumber =
      data.adjustment_number ||
      `ADJ-${todayStr.replace(/-/g, '')}-${String(adjustmentsStore.length + 1).padStart(3, '0')}`

    const adjId = `adj-${Date.now()}`
    const newAdjustment: StockAdjustment = {
      id: adjId,
      adjustment_number: adjustmentNumber,
      adjustment_date: data.adjustment_date || todayStr,
      reason: cleanReason,
      status: 'approved', // Adjustments execute and approve in single atomic transaction like V1 RPC
      approved_by: 'لجنة الجرد المخزني',
      approved_at: new Date().toISOString(),
      created_by: 'لجنة الجرد المخزني',
      created_at: new Date().toISOString(),
      items: [
        {
          id: `adj-item-${Date.now()}`,
          product_id: prod.id,
          product_sku: prod.sku,
          product_name: prod.name,
          unit: prod.unit,
          allows_decimal_quantity: prod.allows_decimal_quantity,
          recorded_quantity: recordedQty,
          actual_quantity: actualQty,
          difference: difference,
        },
      ],
    }

    // Update product stock balance to verified actual quantity
    const pIdx = productsStore.findIndex((p) => p.id === prod.id)
    if (pIdx !== -1) {
      productsStore[pIdx] = {
        ...prod,
        current_stock: actualQty,
        currentStock: actualQty,
        isLowStock: actualQty <= prod.min_stock_level,
      }
    }

    // Add movement audit trail
    const logEntry: InventoryMovementLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      product_id: prod.id,
      product_sku: prod.sku,
      product_name: prod.name,
      unit: prod.unit,
      movement_type: 'adjustment',
      source_doc_type: 'inventory_adjustment',
      source_doc_id: adjId,
      source_doc_number: adjustmentNumber,
      quantity_in: difference > 0 ? difference : 0,
      quantity_out: difference < 0 ? Math.abs(difference) : 0,
      stock_balance_after: actualQty,
      unit_cost_or_price: prod.purchase_price,
      notes: `تسوية جردية: ${cleanReason} (الفارق: ${difference > 0 ? `+${difference}` : difference})`,
      created_by: 'لجنة الجرد المخزني',
      created_at: new Date().toISOString(),
    }
    movementsStore.unshift(logEntry)

    adjustmentsStore.unshift(newAdjustment)
    return JSON.parse(JSON.stringify(newAdjustment))
  },

  // -------------------------------------------------------------
  // INVENTORY MOVEMENTS AUDIT TRAIL (سجل الحركات)
  // -------------------------------------------------------------
  async getMovementLogs(filters?: {
    search?: string
    movement_type?: InventoryMovementType | ''
    product_id?: string
  }): Promise<InventoryMovementLog[]> {
    await delay()
    if (simulateFailure) throw new Error('فشل محاكاة استرجاع سجل الحركات')

    let list = [...movementsStore]

    if (filters?.product_id) {
      list = list.filter((m) => m.product_id === filters.product_id)
    }

    if (filters?.movement_type) {
      list = list.filter((m) => m.movement_type === filters.movement_type)
    }

    if (filters?.search) {
      const q = filters.search.trim().toLowerCase()
      list = list.filter(
        (m) =>
          m.source_doc_number.toLowerCase().includes(q) ||
          (m.product_name && m.product_name.toLowerCase().includes(q)) ||
          (m.product_sku && m.product_sku.toLowerCase().includes(q)) ||
          (m.notes && m.notes.toLowerCase().includes(q))
      )
    }

    return JSON.parse(JSON.stringify(list))
  },

  // -------------------------------------------------------------
  // SALES INVOICES MANAGEMENT (فواتير المبيعات)
  // -------------------------------------------------------------
  async getInvoices(filters?: {
    search?: string
    status?: string
    customerId?: string
  }): Promise<SalesInvoice[]> {
    await delay()
    if (simulateFailure) throw new Error('فشل محاكاة استرجاع قائمة فواتير المبيعات')

    let list = [...invoicesStore]

    if (filters?.customerId) {
      list = list.filter((i) => i.customer_id === filters.customerId)
    }

    if (filters?.status && filters.status !== 'all') {
      list = list.filter((i) => i.status === filters.status)
    }

    if (filters?.search) {
      const q = filters.search.trim().toLowerCase()
      list = list.filter(
        (i) =>
          i.invoice_number.toLowerCase().includes(q) ||
          (i.customer_name_snapshot && i.customer_name_snapshot.toLowerCase().includes(q)) ||
          (i.customer_phone_snapshot && i.customer_phone_snapshot.includes(q)) ||
          (i.notes && i.notes.toLowerCase().includes(q))
      )
    }

    return JSON.parse(JSON.stringify(list))
  },

  async getInvoiceById(id: string): Promise<SalesInvoice | null> {
    await delay()
    if (simulateFailure) throw new Error('فشل محاكاة استرجاع بيانات الفاتورة')
    const found = invoicesStore.find((i) => i.id === id)
    return found ? JSON.parse(JSON.stringify(found)) : null
  },

  async createInvoice(data: SalesInvoiceFormData): Promise<SalesInvoice> {
    await delay(120)
    if (simulateFailure) throw new Error('فشل محاكاة إنشاء فاتورة المبيعات')

    // 1. Customer validation
    if (!data.customer_id) {
      throw new Error('يرجى اختيار العميل أولاً لحفظ الفاتورة')
    }
    const cust = customersStore.find((c) => c.id === data.customer_id)

    // 2. Date validation
    const invoiceDate = data.invoice_date || new Date().toISOString().slice(0, 10)

    // 3. Line items validation
    if (!data.items || data.items.length === 0) {
      throw new Error('يجب إضافة صنف واحد على الأقل في الفاتورة')
    }

    const calculatedInputItems = data.items.map((it, idx) => {
      const prod = productsStore.find((p) => p.id === it.product_id)
      if (!prod) throw new Error(`الصنف في البند رقم (${idx + 1}) غير موجود`)

      const qty = Number(it.quantity)
      if (isNaN(qty) || qty <= 0) {
        throw new Error(`الكمية يجب أن تكون أكبر من الصفر في البند رقم (${idx + 1})`)
      }

      if (isNaN(it.unit_price) || it.unit_price < 0) {
        throw new Error(`سعر الوحدة لا يمكن أن يكون بالسالب في البند رقم (${idx + 1})`)
      }

      if (!prod.allows_decimal_quantity && qty % 1 !== 0) {
        throw new Error(
          `الصنف "${prod.name}" يباع بالعدد الصحيح فقط ولا يقبل كميات كسرية (الكمية المطلوبة: ${qty})`
        )
      }

      if (data.action === 'approve') {
        if (!prod.is_active) {
          throw new Error(`الصنف "${prod.name}" موقوف/مؤرشف ولا يمكن بيعه أو إدراجه في فواتير معتمدة`)
        }
        if (qty > prod.current_stock) {
          throw new Error(
            `تعذر الاعتماد: رصيد الصنف "${prod.name}" في المخزن غير كافٍ لإتمام البيع (المتاح بالمخزن: ${prod.current_stock} ${prod.unit}، المطلوب: ${qty} ${prod.unit}). يمكنك حفظ الفاتورة كمسودة.`
          )
        }
      }

      return {
        productId: it.product_id,
        quantity: qty,
        unitPrice: Number(it.unit_price),
        discountType: it.discount_type || 'none',
        discountValue: Number(it.discount_value) || 0,
      }
    })

    const calcs = calculateInvoiceTotals({
      items: calculatedInputItems,
      discountType: data.invoice_discount_type || 'none',
      discountValue: data.invoice_discount_value || 0,
      additionalCharges: data.additional_charges || 0,
    })

    const invoiceNumber =
      data.invoice_number ||
      `INV-${invoiceDate.replace(/-/g, '')}-${String(invoicesStore.length + 1).padStart(3, '0')}`

    const newInvoiceId = `inv-${Date.now()}`

    const processedItems: SalesInvoiceItem[] = calcs.items.map((cIt, idx) => {
      const prod = productsStore.find((p) => p.id === cIt.productId)
      return {
        id: `inv-item-${Date.now()}-${idx}`,
        invoice_id: newInvoiceId,
        product_id: cIt.productId,
        product_sku_snapshot: prod ? prod.sku : '',
        product_name_snapshot: prod ? prod.name : '',
        unit_snapshot: prod ? prod.unit : '',
        allows_decimal_quantity: Boolean(prod?.allows_decimal_quantity),
        quantity: cIt.quantity,
        unit_price: cIt.unitPrice,
        gross_amount: cIt.grossAmount,
        discount_type: cIt.discountType,
        discount_value: cIt.discountValue,
        discount_amount: cIt.discountAmount,
        net_amount: cIt.netAmount,
      }
    })

    const newInvoice: SalesInvoice = {
      id: newInvoiceId,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      customer_id: data.customer_id,
      customer_name_snapshot: cust ? cust.name : 'عميل نقدي',
      customer_phone_snapshot: data.customer_phone?.trim() || (cust ? cust.phone : ''),
      gross_amount: calcs.grossTotal,
      item_discounts_amount: calcs.itemDiscountsTotal,
      subtotal: calcs.subtotal,
      invoice_discount_type: data.invoice_discount_type || 'none',
      invoice_discount_value: Number(data.invoice_discount_value) || 0,
      invoice_discount_amount: calcs.invoiceDiscountAmount,
      additional_charges: calcs.additionalCharges,
      final_total: calcs.finalTotal,
      status: 'draft',
      notes: data.notes?.trim() || '',
      approved_by: null,
      approved_at: null,
      created_by: 'مسؤول المبيعات',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: processedItems,
    }

    invoicesStore.unshift(newInvoice)

    if (data.action === 'approve') {
      return this.approveInvoice(newInvoiceId)
    }

    return JSON.parse(JSON.stringify(newInvoice))
  },

  async updateDraftInvoice(id: string, data: SalesInvoiceFormData): Promise<SalesInvoice> {
    await delay(120)
    if (simulateFailure) throw new Error('فشل محاكاة تعديل مسودة الفاتورة')

    const idx = invoicesStore.findIndex((i) => i.id === id)
    if (idx === -1) throw new Error('الفاتورة غير موجودة')

    const existing = invoicesStore[idx]
    if (existing.status !== 'draft') {
      throw new Error('الفواتير المعتمدة أو الملغاة لا يمكن تعديلها مباشرة')
    }

    // Customer validation
    if (!data.customer_id) {
      throw new Error('يرجى اختيار العميل أولاً لحفظ الفاتورة')
    }
    const cust = customersStore.find((c) => c.id === data.customer_id)

    // Items validation
    if (!data.items || data.items.length === 0) {
      throw new Error('يجب إضافة صنف واحد على الأقل في الفاتورة')
    }

    const calculatedInputItems = data.items.map((it, itemIdx) => {
      const prod = productsStore.find((p) => p.id === it.product_id)
      if (!prod) throw new Error(`الصنف في البند رقم (${itemIdx + 1}) غير موجود`)

      const qty = Number(it.quantity)
      if (isNaN(qty) || qty <= 0) {
        throw new Error(`الكمية يجب أن تكون أكبر من الصفر في البند رقم (${itemIdx + 1})`)
      }
      if (isNaN(it.unit_price) || it.unit_price < 0) {
        throw new Error(`سعر الوحدة لا يمكن أن يكون بالسالب في البند رقم (${itemIdx + 1})`)
      }
      if (!prod.allows_decimal_quantity && qty % 1 !== 0) {
        throw new Error(
          `الصنف "${prod.name}" يباع بالعدد الصحيح فقط ولا يقبل كميات كسرية (الكمية المطلوبة: ${qty})`
        )
      }

      if (data.action === 'approve') {
        if (!prod.is_active) {
          throw new Error(`الصنف "${prod.name}" موقوف/مؤرشف ولا يمكن بيعه`)
        }
        if (qty > prod.current_stock) {
          throw new Error(
            `تعذر الاعتماد: رصيد الصنف "${prod.name}" غير كافٍ (المتاح: ${prod.current_stock}، المطلوب: ${qty})`
          )
        }
      }

      return {
        productId: it.product_id,
        quantity: qty,
        unitPrice: Number(it.unit_price),
        discountType: it.discount_type || 'none',
        discountValue: Number(it.discount_value) || 0,
      }
    })

    const calcs = calculateInvoiceTotals({
      items: calculatedInputItems,
      discountType: data.invoice_discount_type || 'none',
      discountValue: data.invoice_discount_value || 0,
      additionalCharges: data.additional_charges || 0,
    })

    const processedItems: SalesInvoiceItem[] = calcs.items.map((cIt, itemIdx) => {
      const prod = productsStore.find((p) => p.id === cIt.productId)
      return {
        id: `inv-item-${Date.now()}-${itemIdx}`,
        invoice_id: id,
        product_id: cIt.productId,
        product_sku_snapshot: prod ? prod.sku : '',
        product_name_snapshot: prod ? prod.name : '',
        unit_snapshot: prod ? prod.unit : '',
        allows_decimal_quantity: Boolean(prod?.allows_decimal_quantity),
        quantity: cIt.quantity,
        unit_price: cIt.unitPrice,
        gross_amount: cIt.grossAmount,
        discount_type: cIt.discountType,
        discount_value: cIt.discountValue,
        discount_amount: cIt.discountAmount,
        net_amount: cIt.netAmount,
      }
    })

    const updatedInvoice: SalesInvoice = {
      ...existing,
      invoice_date: data.invoice_date || existing.invoice_date,
      customer_id: data.customer_id,
      customer_name_snapshot: cust ? cust.name : existing.customer_name_snapshot,
      customer_phone_snapshot: data.customer_phone?.trim() || existing.customer_phone_snapshot,
      gross_amount: calcs.grossTotal,
      item_discounts_amount: calcs.itemDiscountsTotal,
      subtotal: calcs.subtotal,
      invoice_discount_type: data.invoice_discount_type || 'none',
      invoice_discount_value: Number(data.invoice_discount_value) || 0,
      invoice_discount_amount: calcs.invoiceDiscountAmount,
      additional_charges: calcs.additionalCharges,
      final_total: calcs.finalTotal,
      notes: data.notes !== undefined ? data.notes.trim() : existing.notes,
      updated_at: new Date().toISOString(),
      items: processedItems,
    }

    invoicesStore[idx] = updatedInvoice

    if (data.action === 'approve') {
      return this.approveInvoice(id)
    }

    return JSON.parse(JSON.stringify(updatedInvoice))
  },

  async approveInvoice(invoiceId: string): Promise<SalesInvoice> {
    await delay(150)
    if (simulateFailure) throw new Error('فشل محاكاة اعتماد فاتورة المبيعات')

    const idx = invoicesStore.findIndex((i) => i.id === invoiceId)
    if (idx === -1) throw new Error('فاتورة المبيعات غير موجودة')

    const inv = invoicesStore[idx]
    if (inv.status === 'approved') {
      throw new Error(`فاتورة المبيعات رقم ${inv.invoice_number} معتمدة مسبقاً ولا يمكن اعتمادها مرة أخرى`)
    }
    if (inv.status === 'cancelled') {
      throw new Error(`لا يمكن اعتماد فاتورة مبيعات ملغاة (رقم ${inv.invoice_number})`)
    }

    const items = inv.items || []
    if (items.length === 0) {
      throw new Error('لا يمكن اعتماد فاتورة مبيعات بدون بنود أصناف')
    }

    // Verify stock availability
    for (const item of items) {
      const prod = productsStore.find((p) => p.id === item.product_id)
      if (!prod) throw new Error(`الصنف ${item.product_name_snapshot || item.product_id} غير موجود`)
      if (!prod.is_active) {
        throw new Error(`الصنف "${prod.name}" موقوف/مؤرشف ولا يمكن بيعه أو إدراجه في فواتير معتمدة`)
      }
      if (prod.current_stock < item.quantity) {
        throw new Error(
          `عفواً، رصيد المخزون غير كاف للمنتج "${prod.name}" (المتاح: ${prod.current_stock} ${prod.unit}، المطلوب: ${item.quantity} ${prod.unit})`
        )
      }
    }

    // Deduct stock atomically and record immutable movement history
    for (const item of items) {
      const pIdx = productsStore.findIndex((p) => p.id === item.product_id)
      if (pIdx === -1) continue
      const prod = productsStore[pIdx]

      const newStock = Math.round((prod.current_stock - item.quantity) * 1000) / 1000
      productsStore[pIdx] = {
        ...prod,
        current_stock: newStock,
        currentStock: newStock,
        isLowStock: newStock <= prod.min_stock_level,
      }

      // Add movement log
      const logEntry: InventoryMovementLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        product_id: prod.id,
        product_sku: prod.sku,
        product_name: prod.name,
        unit: prod.unit,
        movement_type: 'sale',
        source_doc_type: 'sales_invoice',
        source_doc_id: inv.id,
        source_doc_number: inv.invoice_number,
        quantity_in: 0,
        quantity_out: item.quantity,
        stock_balance_after: newStock,
        unit_cost_or_price: item.unit_price,
        notes: `فاتورة مبيعات: ${inv.customer_name_snapshot || 'عميل'}`,
        created_by: 'مدير المبيعات',
        created_at: new Date().toISOString(),
      }
      movementsStore.unshift(logEntry)
    }

    // Update customer invoices count if customer exists
    if (inv.customer_id) {
      const cIdx = customersStore.findIndex((c) => c.id === inv.customer_id)
      if (cIdx !== -1) {
        customersStore[cIdx] = {
          ...customersStore[cIdx],
          invoices_count: (customersStore[cIdx].invoices_count || 0) + 1,
        }
      }
    }

    inv.status = 'approved'
    inv.approved_by = 'مدير المبيعات'
    inv.approved_at = new Date().toISOString()
    inv.updated_at = new Date().toISOString()
    invoicesStore[idx] = inv

    return JSON.parse(JSON.stringify(inv))
  },

  async cancelApprovedInvoice(invoiceId: string, reason: string): Promise<SalesInvoice> {
    await delay(150)
    if (simulateFailure) throw new Error('فشل محاكاة إلغاء فاتورة المبيعات')

    const cleanReason = reason.trim()
    if (!cleanReason) {
      throw new Error('يجب كتابة سبب الإلغاء لتوثيق الحركة الرقابية في سجل الحركات')
    }

    const idx = invoicesStore.findIndex((i) => i.id === invoiceId)
    if (idx === -1) throw new Error('فاتورة المبيعات غير موجودة')

    const inv = invoicesStore[idx]
    if (inv.status !== 'approved') {
      throw new Error(`لا يمكن إلغاء سوى الفواتير المعتمدة فقط (حالة الفاتورة الحالية: ${inv.status})`)
    }

    // Return items to stock and record reversal movements
    const items = inv.items || []
    for (const item of items) {
      const pIdx = productsStore.findIndex((p) => p.id === item.product_id)
      if (pIdx === -1) continue
      const prod = productsStore[pIdx]

      const newStock = Math.round((prod.current_stock + item.quantity) * 1000) / 1000
      productsStore[pIdx] = {
        ...prod,
        current_stock: newStock,
        currentStock: newStock,
        isLowStock: newStock <= prod.min_stock_level,
      }

      // Add reversal movement
      const logEntry: InventoryMovementLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        product_id: prod.id,
        product_sku: prod.sku,
        product_name: prod.name,
        unit: prod.unit,
        movement_type: 'reversal',
        source_doc_type: 'sales_invoice',
        source_doc_id: inv.id,
        source_doc_number: inv.invoice_number,
        quantity_in: item.quantity,
        quantity_out: 0,
        stock_balance_after: newStock,
        unit_cost_or_price: item.unit_price,
        notes: `إلغاء فاتورة مبيعات معتمدة. السبب: ${cleanReason}`,
        created_by: 'المدير العام',
        created_at: new Date().toISOString(),
      }
      movementsStore.unshift(logEntry)
    }

    inv.status = 'cancelled'
    inv.notes = inv.notes
      ? `${inv.notes} | ملغاة: ${cleanReason}`
      : `تم الإلغاء: ${cleanReason}`
    inv.updated_at = new Date().toISOString()
    invoicesStore[idx] = inv

    return JSON.parse(JSON.stringify(inv))
  },

  async deleteDraftInvoice(invoiceId: string): Promise<boolean> {
    await delay(100)
    if (simulateFailure) throw new Error('فشل محاكاة حذف مسودة الفاتورة')

    const inv = invoicesStore.find((i) => i.id === invoiceId)
    if (!inv) return false

    if (inv.status !== 'draft') {
      throw new Error('لا يمكن حذف الفواتير المعتمدة أو الملغاة. الحذف متاح للمسودات فقط.')
    }

    const prevLen = invoicesStore.length
    invoicesStore = invoicesStore.filter((i) => i.id !== invoiceId)
    return invoicesStore.length < prevLen
  },

  // -------------------------------------------------------------
  // DASHBOARD & COMMON (Dynamically derived from active mock stores)
  // -------------------------------------------------------------
  async getDashboardSummary(): Promise<DashboardSummary> {
    await delay()
    const approvedInvoices = invoicesStore.filter((i) => i.status === 'approved')
    const totalSales = approvedInvoices.reduce((sum, inv) => sum + Number(inv.final_total || 0), 0)
    const today = new Date().toISOString().slice(0, 10)
    const todayInvoices = approvedInvoices.filter(
      (i) => i.invoice_date === today || i.invoice_date === '2026-11-17'
    )
    const todaySales = todayInvoices.reduce((sum, inv) => sum + Number(inv.final_total || 0), 0)

    const activeCustomersCount = customersStore.filter((c) => c.is_active).length
    const lowStockProductsCount = productsStore.filter(
      (p) =>
        Number(p.current_stock || 0) > 0 &&
        Number(p.current_stock || 0) <= Number(p.min_stock_level || 5)
    ).length

    const recentInvoices: Invoice[] = invoicesStore.slice(0, 5).map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      date: inv.invoice_date,
      customerId: inv.customer_id || '',
      customerName: inv.customer_name_snapshot || 'عميل',
      status: inv.status,
      itemsCount: inv.items?.length || 0,
      subtotal: inv.subtotal,
      discount: inv.invoice_discount_amount + inv.item_discounts_amount,
      tax: 0,
      total: inv.final_total,
      paidAmount: inv.final_total,
      remainingAmount: 0,
      notes: inv.notes,
    }))

    const recentMovements: InventoryMovement[] = movementsStore.slice(0, 5).map((m) => {
      const prod = productsStore.find((p) => p.id === m.product_id)
      return {
        id: m.id,
        date: m.created_at,
        movementType:
          m.movement_type === 'receipt'
            ? 'receipt'
            : m.movement_type === 'sale'
              ? 'sale'
              : 'issue',
        movementNumber: m.source_doc_number,
        productId: m.product_id,
        productName: prod?.name || m.product_name || 'صنف',
        productCode: prod?.sku || m.product_sku || '',
        quantity: m.quantity_in > 0 ? m.quantity_in : m.quantity_out,
        unit: m.unit || 'وحدة',
        reference: m.source_doc_number,
        performedBy: m.created_by || 'أمين المخزن',
      }
    })

    return {
      todaySales: todaySales || (totalSales > 0 ? totalSales : MOCK_DASHBOARD_SUMMARY.todaySales),
      todayInvoicesCount: todayInvoices.length || approvedInvoices.length,
      totalSales: totalSales > 0 ? totalSales : MOCK_DASHBOARD_SUMMARY.totalSales,
      totalProductsCount: productsStore.length,
      lowStockProductsCount,
      activeCustomersCount,
      recentInvoices:
        recentInvoices.length > 0 ? recentInvoices : MOCK_DASHBOARD_SUMMARY.recentInvoices,
      recentMovements:
        recentMovements.length > 0 ? recentMovements : MOCK_DASHBOARD_SUMMARY.recentMovements,
      salesTrends: MOCK_DASHBOARD_SUMMARY.salesTrends,
    }
  },

  async getRecentInvoices(): Promise<Invoice[]> {
    await delay()
    return JSON.parse(JSON.stringify(MOCK_INVOICES))
  },

  async getRecentInventoryMovements(): Promise<InventoryMovement[]> {
    await delay()
    return JSON.parse(JSON.stringify(MOCK_INVENTORY_MOVEMENTS))
  },

  async getInventoryMovements(): Promise<InventoryMovementLog[]> {
    await delay()
    return JSON.parse(JSON.stringify(movementsStore))
  },
}
