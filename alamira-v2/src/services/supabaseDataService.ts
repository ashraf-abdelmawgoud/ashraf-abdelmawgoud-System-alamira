/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseClient, isAtomicInvoiceRpcEnabled } from './supabaseClient'
import { cacheService } from './cacheService'
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
  StockReceipt,
  InventoryMovementLog,
  AuditLogEntry,
  User,
  DashboardSummary,
  CompanyProfile,
  SystemPreferences,
} from '@/types'
import { QENA_TIMEZONE } from '@/lib/formatters'
import { isPrimaryAdmin } from '@/auth/rbac'
import { validateInvoiceWrite } from '@/domain/validateInvoiceWrite'

/**
 * Real Supabase Production Data Service Adapter
 * Interacts with PostgreSQL tables, views, and RPCs with full RBAC enforcement.
 */
export const supabaseDataService = {
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
    const cacheKey = cacheService.createKey('products', filters, currentUserRole)
    return cacheService.getOrFetch(cacheKey, async () => {
      const supabase = getSupabaseClient()
      const isSalesOperator = currentUserRole === 'SALES_OPERATOR'

      // Query products_secure_view (with server-side cost/stock masking)
      // A missing secure view is a configuration error, never permission to read the base table.
      const { data, error } = await supabase
        .from('products_secure_view')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        throw new Error(`فشل جلب قائمة الأصناف من الخادم: ${error.message}`)
      }

      let prods: Product[] = (data || []).map((row: any) => {
        const currentStock = isSalesOperator ? 0 : Number(row.current_stock || 0)
        const purchasePrice = isSalesOperator ? 0 : Number(row.purchase_price || 0)
        const sellingPrice = Number(row.selling_price || 0)
        const minStockLevel = Number(row.min_stock_level || 0)
        const realStock = Number(row.current_stock || 0)

        return {
          id: row.id,
          sku: row.sku,
          code: row.sku,
          name: row.name,
          category: row.category_name || row.categories?.name || 'عام',
          unit: row.unit || 'قطعة',
          allows_decimal_quantity: Boolean(row.allows_decimal_quantity),
          purchase_price: purchasePrice,
          costPrice: purchasePrice,
          selling_price: sellingPrice,
          sellingPrice: sellingPrice,
          current_stock: currentStock,
          currentStock: currentStock,
          min_stock_level: minStockLevel,
          minStockLevel: minStockLevel,
          isLowStock: realStock <= minStockLevel,
          description: row.description || '',
          is_active: row.is_active !== false,
          createdAt: row.created_at,
        }
      })

      if (filters?.search) {
        const q = filters.search.trim().toLowerCase()
        prods = prods.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            (p.description && p.description.toLowerCase().includes(q))
        )
      }

      if (filters?.category && filters.category !== 'all') {
        prods = prods.filter((p) => p.category === filters.category)
      }

      if (filters?.status && filters.status !== 'all') {
        if (filters.status === 'in_stock') {
          prods = prods.filter((p) => p.current_stock > p.min_stock_level)
        } else if (filters.status === 'low_stock') {
          prods = prods.filter((p) => p.current_stock > 0 && p.current_stock <= p.min_stock_level)
        } else if (filters.status === 'out_of_stock') {
          prods = prods.filter((p) => p.current_stock <= 0)
        }
      }

      return prods
    }, 60_000)
  },

  async getCategories(): Promise<string[]> {
    return cacheService.getOrFetch('categories', async () => {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('categories')
        .select('name')
        .order('name', { ascending: true })

      if (error) {
        throw new Error(`فشل جلب قائمة الأقسام والتصنيفات من الخادم: ${error.message}`)
      }

      if (!data || data.length === 0) {
        // If categories table has no rows, check if products have assigned category names
        const { data: pData, error: pError } = await supabase.from('products').select('categories(name)')
        if (!pError && pData) {
          const unique = Array.from(new Set(pData.map((p: any) => p.categories?.name).filter(Boolean)))
          if (unique.length > 0) return unique as string[]
        }
        return []
      }
      return data.map((c: any) => c.name)
    }, 5 * 60_000)
  },

  async getProductById(id: string, currentUserRole?: string): Promise<Product | null> {
    const isSalesOperator = currentUserRole === 'SALES_OPERATOR'
    try {
      const supabase = getSupabaseClient()
      const query: any = supabase.from('products_secure_view').select('*')
      if (typeof query?.eq === 'function') {
        const eqQuery = query.eq('id', id)
        let data: any = null
        if (typeof eqQuery?.maybeSingle === 'function') {
          const res = await eqQuery.maybeSingle()
          data = res.data
        } else if (typeof eqQuery?.single === 'function') {
          const res = await eqQuery.single()
          data = res.data
        }

        if (data) {
          const currentStock = isSalesOperator ? 0 : Number(data.current_stock || 0)
          const purchasePrice = isSalesOperator ? 0 : Number(data.purchase_price || 0)
          const sellingPrice = Number(data.selling_price || 0)
          const minStockLevel = Number(data.min_stock_level || 0)
          const realStock = Number(data.current_stock || 0)

          return {
            id: data.id,
            sku: data.sku,
            code: data.sku,
            name: data.name,
            category: data.category_name || data.categories?.name || 'عام',
            unit: data.unit || 'قطعة',
            allows_decimal_quantity: Boolean(data.allows_decimal_quantity),
            purchase_price: purchasePrice,
            costPrice: purchasePrice,
            selling_price: sellingPrice,
            sellingPrice: sellingPrice,
            current_stock: currentStock,
            currentStock: currentStock,
            min_stock_level: minStockLevel,
            minStockLevel: minStockLevel,
            isLowStock: realStock <= minStockLevel,
            description: data.description || '',
            is_active: data.is_active !== false,
            createdAt: data.created_at,
          }
        }
      }
    } catch {
      // Fallback to searching the products list
    }

    const prods = await this.getProducts(undefined, currentUserRole)
    return prods.find((p) => p.id === id) || null
  },

  async createProduct(data: ProductFormData, actor: User): Promise<Product> {
    const supabase = getSupabaseClient()
    const openingStock = Math.max(0, Number(data.opening_quantity || 0))
    const isSalesOperator = actor.role === 'SALES_OPERATOR'
    const safePurchasePrice = isSalesOperator ? 0 : Math.max(0, Number(data.purchase_price || 0))
    const sellingPrice = Math.max(0, Number(data.selling_price || 0))

    if (!data.name?.trim()) throw new Error('اسم المنتج والبيان مطلوب')
    if (!data.sku?.trim()) throw new Error('كود الصنف (SKU) مطلوب')

    // Call atomic RPC: register_product_with_opening_stock
    const { data: result, error } = await supabase.rpc('register_product_with_opening_stock', {
      p_sku: data.sku.trim(),
      p_name: data.name.trim(),
      p_unit: data.unit || 'قطعة',
      p_opening_quantity: openingStock,
      p_allows_decimal_quantity: Boolean(data.allows_decimal_quantity),
      p_category_id: null,
      p_purchase_price: safePurchasePrice,
      p_selling_price: sellingPrice,
      p_min_stock_level: Math.max(0, Number(data.min_stock_level || 5)),
      p_description: data.description?.trim() || null,
    })

    if (error) {
      throw new Error(`فشل تسجيل الصنف في قاعدة البيانات: ${error.message}`)
    }

    const newProductId = result?.product_id || result?.id

    // Invalidate product cache
    cacheService.invalidateNamespace('products')
    cacheService.invalidateNamespace('dashboard')

    // Record audit event
    await this.recordAuditLog({
      action: 'PRODUCT_CREATE',
      category: 'inventory',
      entity_type: 'product',
      entity_id: newProductId || data.sku,
      entity_name_or_number: data.name,
      performed_by: actor.name,
      performed_by_id: actor.id,
      performed_by_role: actor.role,
      outcome: 'success',
      details: {
        sku: data.sku,
        selling_price: sellingPrice,
        initial_stock: openingStock,
        allows_decimal: Boolean(data.allows_decimal_quantity),
      },
      timestamp: new Date().toISOString(),
    })

    const created = await this.getProductById(newProductId, actor.role)
    cacheService.invalidateNamespace('products')
    cacheService.invalidateNamespace('dashboard')
    if (!created) {
      return {
        id: newProductId,
        sku: data.sku,
        code: data.sku,
        name: data.name,
        category: data.category || 'عام',
        unit: data.unit,
        allows_decimal_quantity: Boolean(data.allows_decimal_quantity),
        purchase_price: safePurchasePrice,
        costPrice: safePurchasePrice,
        selling_price: sellingPrice,
        sellingPrice: sellingPrice,
        current_stock: isSalesOperator ? 0 : openingStock,
        currentStock: isSalesOperator ? 0 : openingStock,
        min_stock_level: Number(data.min_stock_level || 5),
        minStockLevel: Number(data.min_stock_level || 5),
        isLowStock: false,
        is_active: true,
      }
    }
    return created
  },

  async updateProduct(id: string, data: Partial<ProductFormData>, actor: User): Promise<Product> {
    const supabase = getSupabaseClient()
    const isSalesOperator = actor.role === 'SALES_OPERATOR'

    const updatePayload: Record<string, any> = {
      name: data.name?.trim(),
      sku: data.sku?.trim(),
      unit: data.unit,
      selling_price: data.selling_price !== undefined ? Number(data.selling_price) : undefined,
      min_stock_level: data.min_stock_level !== undefined ? Number(data.min_stock_level) : undefined,
      description: data.description?.trim(),
      updated_at: new Date().toISOString(),
    }

    // Only ADMIN can update purchase_price
    if (!isSalesOperator && data.purchase_price !== undefined) {
      updatePayload.purchase_price = Number(data.purchase_price)
    }

    // Clean undefined values
    Object.keys(updatePayload).forEach((k) => updatePayload[k] === undefined && delete updatePayload[k])

    const { error } = await supabase.from('products').update(updatePayload).eq('id', id)
    if (error) throw new Error(`فشل تحديث بيانات الصنف: ${error.message}`)

    cacheService.invalidateNamespace('products')
    cacheService.invalidateNamespace('dashboard')

    await this.recordAuditLog({
      action: 'PRODUCT_UPDATE',
      category: 'inventory',
      entity_type: 'product',
      entity_id: id,
      entity_name_or_number: data.name || id,
      performed_by: actor.name,
      performed_by_id: actor.id,
      performed_by_role: actor.role,
      outcome: 'success',
      timestamp: new Date().toISOString(),
    })

    const updated = await this.getProductById(id, actor.role)
    if (!updated) throw new Error('الصنف غير موجود بعد التحديث')
    return updated
  },

  async toggleProductStatus(id: string, isActive: boolean, actor: User): Promise<Product> {
    const supabase = getSupabaseClient()
    const { error } = await supabase.rpc('set_product_active_status', {
      p_product_id: id,
      p_is_active: isActive,
    })

    if (error) throw new Error(`فشل تغيير حالة تفعيل الصنف: ${error.message}`)

    cacheService.invalidateNamespace('products')
    cacheService.invalidateNamespace('dashboard')

    await this.recordAuditLog({
      action: 'PRODUCT_STATUS_CHANGE',
      category: 'products',
      entity_type: 'product',
      entity_id: id,
      entity_name_or_number: id,
      performed_by: actor.name,
      performed_by_id: actor.id,
      performed_by_role: actor.role,
      outcome: 'success',
      details: { is_active: isActive },
      timestamp: new Date().toISOString(),
    })

    const prod = await this.getProductById(id, actor.role)
    if (!prod) throw new Error('الصنف غير موجود')
    return prod
  },

  async deleteProduct(id: string, actor: User): Promise<void> {
    const supabase = getSupabaseClient()
    const { error } = await supabase.rpc('delete_product', { p_product_id: id })
    if (error) throw new Error(`فشل حذف الصنف: ${error.message}`)

    cacheService.invalidateNamespace('products')
    cacheService.invalidateNamespace('dashboard')

    await this.recordAuditLog({
      action: 'PRODUCT_DELETE',
      category: 'products',
      entity_type: 'product',
      entity_id: id,
      entity_name_or_number: id,
      performed_by: actor.name,
      performed_by_id: actor.id,
      performed_by_role: actor.role,
      outcome: 'success',
      timestamp: new Date().toISOString(),
    })
  },

  // =========================================================================
  // CUSTOMERS
  // =========================================================================
  async getCustomers(filters?: { search?: string; status?: CustomerStatus }): Promise<Customer[]> {
    const cacheKey = cacheService.createKey('customers', filters)
    return cacheService.getOrFetch(cacheKey, async () => {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw new Error(`فشل جلب قائمة العملاء: ${error.message}`)

      let customers: Customer[] = (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        phone: row.phone || '',
        address: row.address || '',
        city: row.address || '',
        notes: row.notes || '',
        is_active: row.is_active !== false,
        created_by: row.created_by,
        createdAt: row.created_at,
        balance: 0,
        invoices_count: 0,
      }))

      if (filters?.search) {
        const q = filters.search.trim().toLowerCase()
        customers = customers.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.phone?.includes(q) ||
            (c.address && c.address.toLowerCase().includes(q))
        )
      }

      if (filters?.status && filters.status !== 'all') {
        const isActive = filters.status === 'active'
        customers = customers.filter((c) => c.is_active === isActive)
      }

      return customers
    }, 60_000)
  },

  async createCustomer(data: CustomerFormData, actor: User): Promise<Customer> {
    const supabase = getSupabaseClient()
    if (!data.name?.trim()) throw new Error('اسم العميل مطلوب')

    const insertPayload = {
      name: data.name.trim(),
      phone: data.phone?.trim() || null,
      address: data.address?.trim() || null,
      notes: data.notes?.trim() || null,
      created_by: actor.id,
    }

    const { data: created, error } = await supabase
      .from('customers')
      .insert(insertPayload)
      .select('*')
      .single()

    if (error) throw new Error(`فشل إضافة العميل: ${error.message}`)

    cacheService.invalidateNamespace('customers')
    cacheService.invalidateNamespace('dashboard')

    await this.recordAuditLog({
      action: 'CUSTOMER_CREATE',
      category: 'customers',
      entity_type: 'customer',
      entity_id: created.id,
      entity_name_or_number: created.name,
      performed_by: actor.name,
      performed_by_id: actor.id,
      performed_by_role: actor.role,
      outcome: 'success',
      timestamp: new Date().toISOString(),
    })

    return {
      id: created.id,
      name: created.name,
      phone: created.phone || '',
      address: created.address || '',
      city: created.address || '',
      notes: created.notes || '',
      is_active: created.is_active !== false,
      created_by: created.created_by,
      createdAt: created.created_at,
      balance: 0,
      invoices_count: 0,
    }
  },

  async updateCustomer(id: string, data: CustomerFormData, actor: User): Promise<Customer> {
    const supabase = getSupabaseClient()
    const updatePayload = {
      name: data.name.trim(),
      phone: data.phone?.trim() || null,
      address: data.address?.trim() || null,
      notes: data.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    }

    const { data: updated, error } = await supabase
      .from('customers')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw new Error(`فشل تعديل بيانات العميل: ${error.message}`)

    cacheService.invalidateNamespace('customers')
    cacheService.invalidateNamespace('dashboard')

    await this.recordAuditLog({
      action: 'CUSTOMER_UPDATE',
      category: 'customers',
      entity_type: 'customer',
      entity_id: id,
      entity_name_or_number: data.name,
      performed_by: actor.name,
      performed_by_id: actor.id,
      performed_by_role: actor.role,
      outcome: 'success',
      timestamp: new Date().toISOString(),
    })

    return {
      id: updated.id,
      name: updated.name,
      phone: updated.phone || '',
      address: updated.address || '',
      city: updated.address || '',
      notes: updated.notes || '',
      is_active: updated.is_active !== false,
      created_by: updated.created_by,
      createdAt: updated.created_at,
      balance: 0,
      invoices_count: 0,
    }
  },

  async deleteCustomer(id: string, actor: User): Promise<boolean> {
    const supabase = getSupabaseClient()
    if (actor.role === 'SALES_OPERATOR') {
      throw new Error('غير مصرح: حذف العملاء متاح لمدير النظام فقط')
    }

    const { count, error: countError } = await supabase
      .from('sales_invoices')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', id)

    if (countError) {
      throw new Error(`فشل التحقق من ارتباطات العميل: ${countError.message}`)
    }

    if (count && count > 0) {
      throw new Error('لا يمكن حذف العميل لوجود فواتير مبيعات مسجلة باسمه في النظام')
    }

    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) throw new Error(`فشل حذف العميل: ${error.message}`)

    cacheService.invalidateNamespace('customers')
    cacheService.invalidateNamespace('dashboard')

    await this.recordAuditLog({
      action: 'CUSTOMER_DELETE',
      category: 'customers',
      entity_type: 'customer',
      entity_id: id,
      entity_name_or_number: id,
      performed_by: actor.name,
      performed_by_id: actor.id,
      performed_by_role: actor.role,
      outcome: 'success',
      timestamp: new Date().toISOString(),
    })

    return true
  },

  // =========================================================================
  // SUPPLIERS
  // =========================================================================
  async getSuppliers(filters?: { search?: string; status?: SupplierStatus }): Promise<Supplier[]> {
    const cacheKey = cacheService.createKey('suppliers', filters)
    return cacheService.getOrFetch(cacheKey, async () => {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw new Error(`فشل جلب قائمة الموردين: ${error.message}`)

      let suppliers: Supplier[] = (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        phone: row.phone || '',
        address: row.address || '',
        city: row.address || '',
        notes: row.notes || '',
        is_active: row.is_active !== false,
        balance: 0,
        receipts_count: 0,
        createdAt: row.created_at,
      }))

      if (filters?.search) {
        const q = filters.search.trim().toLowerCase()
        suppliers = suppliers.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.phone?.includes(q) ||
            (s.address && s.address.toLowerCase().includes(q))
        )
      }

      if (filters?.status && filters.status !== 'all') {
        const isActive = filters.status === 'active'
        suppliers = suppliers.filter((s) => s.is_active === isActive)
      }

      return suppliers
    }, 60_000)
  },

  async createSupplier(data: SupplierFormData, actor: User): Promise<Supplier> {
    const supabase = getSupabaseClient()
    if (!data.name?.trim()) throw new Error('اسم المورد مطلوب')

    const { data: created, error } = await supabase
      .from('suppliers')
      .insert({
        name: data.name.trim(),
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        notes: data.notes?.trim() || null,
      })
      .select('*')
      .single()

    if (error) throw new Error(`فشل إضافة المورد: ${error.message}`)

    cacheService.invalidateNamespace('suppliers')

    await this.recordAuditLog({
      action: 'SUPPLIER_CREATE',
      category: 'suppliers',
      entity_type: 'supplier',
      entity_id: created.id,
      entity_name_or_number: created.name,
      performed_by: actor.name,
      performed_by_id: actor.id,
      performed_by_role: actor.role,
      outcome: 'success',
      timestamp: new Date().toISOString(),
    })

    return {
      id: created.id,
      name: created.name,
      phone: created.phone || '',
      address: created.address || '',
      city: created.address || '',
      notes: created.notes || '',
      is_active: created.is_active !== false,
      balance: 0,
      receipts_count: 0,
      createdAt: created.created_at,
    }
  },

  async updateSupplier(id: string, data: SupplierFormData, actor: User): Promise<Supplier> {
    const supabase = getSupabaseClient()
    const { data: updated, error } = await supabase
      .from('suppliers')
      .update({
        name: data.name.trim(),
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        notes: data.notes?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw new Error(`فشل تحديث بيانات المورد: ${error.message}`)

    cacheService.invalidateNamespace('suppliers')

    await this.recordAuditLog({
      action: 'SUPPLIER_UPDATE',
      category: 'suppliers',
      entity_type: 'supplier',
      entity_id: id,
      entity_name_or_number: data.name,
      performed_by: actor.name,
      performed_by_id: actor.id,
      performed_by_role: actor.role,
      outcome: 'success',
      timestamp: new Date().toISOString(),
    })

    return {
      id: updated.id,
      name: updated.name,
      phone: updated.phone || '',
      address: updated.address || '',
      city: updated.address || '',
      notes: updated.notes || '',
      is_active: updated.is_active !== false,
      balance: 0,
      receipts_count: 0,
      createdAt: updated.created_at,
    }
  },

  async deleteSupplier(id: string, actor: User): Promise<boolean> {
    const supabase = getSupabaseClient()
    if (actor.role === 'SALES_OPERATOR') {
      throw new Error('غير مصرح: إدارة وحذف الموردين متاحة لمدير النظام فقط')
    }

    const { error } = await supabase.from('suppliers').delete().eq('id', id)
    if (error) throw new Error(`فشل حذف المورد: ${error.message}`)

    cacheService.invalidateNamespace('suppliers')

    await this.recordAuditLog({
      action: 'SUPPLIER_DELETE',
      category: 'suppliers',
      entity_type: 'supplier',
      entity_id: id,
      entity_name_or_number: id,
      performed_by: actor.name,
      performed_by_id: actor.id,
      performed_by_role: actor.role,
      outcome: 'success',
      timestamp: new Date().toISOString(),
    })

    return true
  },

  // =========================================================================
  // SALES INVOICES & ATOMIC TRANSACTIONS
  // =========================================================================
  async getInvoices(): Promise<SalesInvoice[]> {
    const cacheKey = cacheService.createKey('invoices')
    return cacheService.getOrFetch(cacheKey, async () => {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('sales_invoices')
        .select('*, items:sales_invoice_items(*), customers(name, phone)')
        .order('created_at', { ascending: false })

      if (error) throw new Error(`فشل جلب فواتير المبيعات: ${error.message}`)

      return (data || []).map((row: any) => ({
        id: row.id,
        invoice_number: row.invoice_number,
        invoice_date: row.invoice_date,
        customer_id: row.customer_id,
        customer_name_snapshot: row.customer_name_snapshot || row.customers?.name || 'عميل نقدي',
        customer_phone_snapshot: row.customer_phone_snapshot || row.customers?.phone || '',
        gross_amount: Number(row.gross_amount || 0),
        item_discounts_amount: Number(row.item_discounts_amount || 0),
        subtotal: Number(row.subtotal || 0),
        invoice_discount_type: row.invoice_discount_type || 'none',
        invoice_discount_value: Number(row.invoice_discount_value || 0),
        invoice_discount_amount: Number(row.invoice_discount_amount || 0),
        additional_charges: Number(row.additional_charges || 0),
        final_total: Number(row.final_total || 0),
        status: row.status,
        payment_terms: row.payment_terms || 'cash',
        notes: row.notes || '',
        cancel_reason: row.cancel_reason || row.cancellation_reason || null,
        created_by: row.created_by,
        approved_by: row.approved_by,
        approved_at: row.approved_at,
        cancelled_by: row.cancelled_by,
        cancelled_at: row.cancelled_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
        items: (row.items || []).map((item: any) => ({
          id: item.id,
          invoice_id: item.invoice_id,
          product_id: item.product_id,
          product_sku_snapshot: item.product_sku_snapshot,
          product_name_snapshot: item.product_name_snapshot,
          unit_snapshot: item.unit_snapshot,
          quantity: Number(item.quantity || 0),
          unit_price: Number(item.unit_price || 0),
          gross_amount: Number(item.gross_amount || 0),
          discount_type: item.discount_type || 'none',
          discount_value: Number(item.discount_value || 0),
          discount_amount: Number(item.discount_amount || 0),
          net_amount: Number(item.net_amount || 0),
        })),
      }))
    }, 30_000)
  },

  async getInvoiceById(id: string): Promise<SalesInvoice | null> {
    try {
      const supabase = getSupabaseClient()
      const query: any = supabase
        .from('sales_invoices')
        .select('*, items:sales_invoice_items(*), customers(name, phone)')

      if (typeof query?.eq === 'function') {
        const eqQuery = query.eq('id', id)
        let data: any = null
        if (typeof eqQuery?.maybeSingle === 'function') {
          const res = await eqQuery.maybeSingle()
          data = res.data
        } else if (typeof eqQuery?.single === 'function') {
          const res = await eqQuery.single()
          data = res.data
        }

        if (data) {
          return {
            id: data.id,
            invoice_number: data.invoice_number,
            invoice_date: data.invoice_date,
            customer_id: data.customer_id,
            customer_name_snapshot: data.customer_name_snapshot || data.customers?.name || 'عميل نقدي',
            customer_phone_snapshot: data.customer_phone_snapshot || data.customers?.phone || '',
            gross_amount: Number(data.gross_amount || 0),
            item_discounts_amount: Number(data.item_discounts_amount || 0),
            subtotal: Number(data.subtotal || 0),
            invoice_discount_type: data.invoice_discount_type || 'none',
            invoice_discount_value: Number(data.invoice_discount_value || 0),
            invoice_discount_amount: Number(data.invoice_discount_amount || 0),
            additional_charges: Number(data.additional_charges || 0),
            final_total: Number(data.final_total || 0),
            status: data.status,
            payment_terms: data.payment_terms || 'cash',
            notes: data.notes || '',
            cancel_reason: data.cancel_reason || data.cancellation_reason || null,
            created_by: data.created_by,
            approved_by: data.approved_by,
            approved_at: data.approved_at,
            cancelled_by: data.cancelled_by,
            cancelled_at: data.cancelled_at,
            created_at: data.created_at,
            updated_at: data.updated_at,
            items: (data.items || []).map((item: any) => ({
              id: item.id,
              invoice_id: item.invoice_id,
              product_id: item.product_id,
              product_sku_snapshot: item.product_sku_snapshot,
              product_name_snapshot: item.product_name_snapshot,
              unit_snapshot: item.unit_snapshot,
              quantity: Number(item.quantity || 0),
              unit_price: Number(item.unit_price || 0),
              gross_amount: Number(item.gross_amount || 0),
              discount_type: item.discount_type || 'none',
              discount_value: Number(item.discount_value || 0),
              discount_amount: Number(item.discount_amount || 0),
              net_amount: Number(item.net_amount || 0),
            })),
          }
        }
      }
    } catch {
      // Fallback below
    }

    // Fallback: search cached invoice list
    const all = await this.getInvoices()
    return all.find((i) => i.id === id) || null
  },

  /**
   * Atomic RPC Save: Unified draft invoice creation and modification inside a single PostgreSQL transaction.
   * Active only when VITE_ENABLE_ATOMIC_INVOICE_RPC === 'true'.
   */
  async saveInvoiceDraftViaRpc(
    data: SalesInvoiceFormData,
    actor: User,
    existingId?: string,
    expectedUpdatedAt?: string
  ): Promise<SalesInvoice> {
    validateInvoiceWrite(data)
    const supabase = getSupabaseClient()

    const rpcPayload = {
      p_invoice_id: existingId || null,
      p_customer_id: data.customer_id,
      p_invoice_date: data.invoice_date || new Date().toISOString().split('T')[0],
      p_invoice_discount_type: data.invoice_discount_type || 'none',
      p_invoice_discount_value: Number(data.invoice_discount_value || 0),
      p_additional_charges: Number(data.additional_charges || 0),
      p_notes: data.notes || null,
      p_items: (data.items || []).map((it) => ({
        product_id: it.product_id,
        quantity: Number(it.quantity),
        unit_price: it.unit_price !== undefined && it.unit_price !== null ? Number(it.unit_price) : null,
        discount_type: it.discount_type || 'none',
        discount_value: Number(it.discount_value || 0),
      })),
      p_expected_updated_at: expectedUpdatedAt || null,
      p_payment_terms: data.payment_terms || null,
    }

    const { data: result, error: rpcError } = await supabase.rpc('save_sales_invoice_draft', rpcPayload)

    if (rpcError) {
      if (rpcError.message?.includes('تزامناً') || rpcError.message?.includes('concurrency')) {
        throw new Error('تم تعديل الفاتورة بواسطة مستخدم آخر تزامناً؛ يرجى إعادة تحميل الفاتورة ومراجعتها')
      }
      if (rpcError.message?.includes('غير مصرح')) {
        throw new Error('غير مصرح: يمكن لمسؤول المبيعات تعديل مسودات الفواتير التي أنشأها بنفسه فقط')
      }
      throw new Error(`فشل حفظ مسودة الفاتورة عبر الإجراء الذري: ${rpcError.message}`)
    }

    if (!result || !result.invoice_id) {
      throw new Error('فشل حفظ مسودة الفاتورة: لم يُرجع الخادم بيانات صالحة')
    }

    // Invalidate caches
    cacheService.invalidateNamespace('invoices')
    cacheService.invalidateNamespace('dashboard')

    const savedId = result.invoice_id

    // If auto-approve was requested by user form
    if (data.action === 'approve') {
      return await this.approveInvoice(savedId, actor)
    }

    // Return the fresh invoice record
    const inv = await this.getInvoiceById(savedId)
    if (!inv) throw new Error('تم حفظ المسودة بنجاح ولكن تعذر قراءة سجلها المحدث')
    return inv
  },

  async createInvoice(data: SalesInvoiceFormData, actor: User): Promise<SalesInvoice> {
    if (isAtomicInvoiceRpcEnabled()) {
      return await this.saveInvoiceDraftViaRpc(data, actor)
    }
    validateInvoiceWrite(data)
    const supabase = getSupabaseClient()
    if (!data.customer_id) throw new Error('العميل مطلوب لإصدار الفاتورة')
    if (!data.items || data.items.length === 0) throw new Error('يجب إضافة بند صنف واحد على الأقل')

    // Fetch customer snapshot
    const { data: cust, error: customerError } = await supabase
      .from('customers')
      .select('name, phone')
      .eq('id', data.customer_id)
      .single()

    if (customerError || !cust) throw new Error('تعذر التحقق من بيانات العميل؛ لم تُحفظ الفاتورة')

    // Generate invoice sequence
    const dateStr = (data.invoice_date || new Date().toISOString().split('T')[0]).replace(/-/g, '')
    const randSeq = Math.floor(1000 + Math.random() * 9000)
    const invoiceNumber = `INV-${dateStr}-${randSeq}`

    // Calculate preliminary amounts
    let grossAmount = 0
    let itemDiscounts = 0
    let subtotal = 0

    // Batch fetch product details in a single query instead of N sequential loop queries
    const productIds = Array.from(new Set(data.items.map((i) => i.product_id)))
    const { data: dbProducts, error: prodErr } = await supabase
      .from('products')
      .select('id, name, sku, unit, selling_price')
      .in('id', productIds)

    if (prodErr || !dbProducts) {
      throw new Error(`فشل استعلام بيانات الأصناف في الفاتورة: ${prodErr?.message || 'غير موجودة'}`)
    }

    const productMap = new Map<string, any>(dbProducts.map((p: any) => [p.id, p]))

    const itemsToInsert = []
    for (const item of data.items) {
      const prod = productMap.get(item.product_id)
      if (!prod) throw new Error(`الصنف ${item.product_id} غير موجود في قاعدة البيانات`)

      const qty = Number(item.quantity)
      const price = Number(item.unit_price ?? prod.selling_price)
      const lineGross = Math.round(qty * price * 100) / 100
      let lineDisc = 0

      if (item.discount_type === 'percentage') {
        lineDisc = Math.round(((lineGross * Number(item.discount_value || 0)) / 100) * 100) / 100
      } else if (item.discount_type === 'fixed') {
        lineDisc = Math.round(Number(item.discount_value || 0) * 100) / 100
      }
      const lineNet = Math.max(0, lineGross - lineDisc)

      grossAmount += lineGross
      itemDiscounts += lineDisc
      subtotal += lineNet

      itemsToInsert.push({
        product_id: item.product_id,
        product_sku_snapshot: prod.sku,
        product_name_snapshot: prod.name,
        unit_snapshot: prod.unit,
        quantity: qty,
        unit_price: price,
        gross_amount: lineGross,
        discount_type: item.discount_type || 'none',
        discount_value: item.discount_value || 0,
        discount_amount: lineDisc,
        net_amount: lineNet,
      })
    }

    let invDisc = 0
    if (data.invoice_discount_type === 'percentage') {
      invDisc = Math.round(((subtotal * Number(data.invoice_discount_value || 0)) / 100) * 100) / 100
    } else if (data.invoice_discount_type === 'fixed') {
      invDisc = Math.round(Number(data.invoice_discount_value || 0) * 100) / 100
    }
    const additional = Math.max(0, Number(data.additional_charges || 0))
    const finalTotal = Math.max(0, subtotal - invDisc + additional)

    // Insert invoice header as draft
    const { data: invHeader, error: invError } = await supabase
      .from('sales_invoices')
      .insert({
        invoice_number: invoiceNumber,
        invoice_date: data.invoice_date || new Date().toISOString().split('T')[0],
        customer_id: data.customer_id,
        customer_name_snapshot: cust?.name || 'عميل',
        customer_phone_snapshot: cust?.phone || null,
        gross_amount: grossAmount,
        item_discounts_amount: itemDiscounts,
        subtotal: subtotal,
        invoice_discount_type: data.invoice_discount_type || 'none',
        invoice_discount_value: data.invoice_discount_value || 0,
        invoice_discount_amount: invDisc,
        additional_charges: additional,
        final_total: finalTotal,
        payment_terms: data.payment_terms || 'cash',
        notes: data.notes?.trim() || null,
        status: 'draft',
        created_by: actor.id,
      })
      .select('*')
      .single()

    if (invError) throw new Error(`فشل إنشاء الفاتورة: ${invError.message}`)

    // Insert items
    const itemsWithInvId = itemsToInsert.map((it) => ({
      ...it,
      invoice_id: invHeader.id,
    }))

    const { error: itemsError } = await supabase.from('sales_invoice_items').insert(itemsWithInvId)
    if (itemsError) {
      cacheService.invalidateNamespace('invoices')
      throw new Error(`أُنشئت المسودة ${invoiceNumber} ولكن فشل حفظ بنودها. راجع المسودة قبل إنشاء فاتورة أخرى. ${itemsError.message}`)
    }

    // Invalidate caches
    cacheService.invalidateNamespace('invoices')
    cacheService.invalidateNamespace('products')
    cacheService.invalidateNamespace('dashboard')

    // If action is approve, call atomic approve RPC
    if (data.action === 'approve') {
      return this.approveInvoice(invHeader.id, actor)
    }

    await this.recordAuditLog({
      action: 'INVOICE_CREATE',
      category: 'sales',
      entity_type: 'sales_invoice',
      entity_id: invHeader.id,
      entity_name_or_number: invHeader.invoice_number,
      performed_by: actor.name,
      performed_by_id: actor.id,
      performed_by_role: actor.role,
      outcome: 'success',
      details: { total: finalTotal, customer: cust?.name },
      timestamp: new Date().toISOString(),
    })

    const createdInv = await this.getInvoiceById(invHeader.id)
    if (!createdInv) throw new Error('فشل استرجاع الفاتورة المنشأة')
    return createdInv
  },

  async updateDraftInvoice(id: string, data: SalesInvoiceFormData, actor: User): Promise<SalesInvoice> {
    if (isAtomicInvoiceRpcEnabled()) {
      const existing = await this.getInvoiceById(id)
      if (!existing) throw new Error('مسودة الفاتورة غير موجودة')
      if (existing.status !== 'draft') throw new Error('لا يمكن تعديل فاتورة معتمدة أو ملغاة')
      return await this.saveInvoiceDraftViaRpc(data, actor, id, existing.updated_at)
    }
    const supabase = getSupabaseClient()
    const isSalesOperator = actor.role === 'SALES_OPERATOR'

    // Verify invoice exists and is draft
    const existing = await this.getInvoiceById(id)
    if (!existing) throw new Error('مسودة الفاتورة غير موجودة')
    if (existing.status !== 'draft') throw new Error('لا يمكن تعديل فاتورة معتمدة أو ملغاة')

    // Ownership check for SALES_OPERATOR
    if (isSalesOperator && existing.created_by !== actor.id) {
      await this.recordAuditLog({
        action: 'ACCESS_DENIED',
        category: 'security',
        entity_type: 'sales_invoice',
        entity_id: id,
        entity_name_or_number: existing.invoice_number,
        performed_by: actor.name,
        performed_by_id: actor.id,
        performed_by_role: actor.role,
        outcome: 'denied',
        reason: 'محاولة تعديل مسودة فاتورة منشأة بواسطة مستخدم آخر',
        timestamp: new Date().toISOString(),
      })
      throw new Error('غير مصرح: يمكن لمسؤول المبيعات تعديل مسودات الفواتير التي أنشأها بنفسه فقط')
    }

    validateInvoiceWrite(data)

    // Customer validation
    let cust: Customer | undefined
    if (data.customer_id) {
      const customers = await this.getCustomers()
      cust = customers.find((c) => c.id === data.customer_id)
    }
    if (!cust) throw new Error('تعذر التحقق من بيانات العميل؛ لم تُحفظ الفاتورة')

    // Calculations
    const allProducts = await this.getProducts(undefined, actor.role)
    let grossAmount = 0
    let itemDiscounts = 0
    let subtotal = 0

    const itemsToInsert = (data.items || []).map((it) => {
      const prod = allProducts.find((p) => p.id === it.product_id)
      if (!prod) throw new Error(`الصنف ${it.product_id} غير موجود في قاعدة البيانات`)
      const qty = Number(it.quantity)
      const price = Number(it.unit_price ?? prod.selling_price)
      const lineGross = Math.round(qty * price * 100) / 100
      let lineDisc = 0
      if (it.discount_type === 'percentage') {
        lineDisc = Math.round(((lineGross * Number(it.discount_value || 0)) / 100) * 100) / 100
      } else if (it.discount_type === 'fixed') {
        lineDisc = Math.round(Number(it.discount_value || 0) * 100) / 100
      }
      const lineNet = Math.max(0, lineGross - lineDisc)

      grossAmount += lineGross
      itemDiscounts += lineDisc
      subtotal += lineNet

      return {
        product_id: it.product_id,
        product_sku_snapshot: prod?.sku || '',
        product_name_snapshot: prod?.name || '',
        unit_snapshot: prod?.unit || 'قطعة',
        quantity: qty,
        unit_price: price,
        gross_amount: lineGross,
        discount_type: it.discount_type || 'none',
        discount_value: it.discount_value || 0,
        discount_amount: lineDisc,
        net_amount: lineNet,
      }
    })

    let invDisc = 0
    if (data.invoice_discount_type === 'percentage') {
      invDisc = Math.round(((subtotal * Number(data.invoice_discount_value || 0)) / 100) * 100) / 100
    } else if (data.invoice_discount_type === 'fixed') {
      invDisc = Math.round(Number(data.invoice_discount_value || 0) * 100) / 100
    }
    const additional = Math.max(0, Number(data.additional_charges || 0))
    const finalTotal = Math.max(0, subtotal - invDisc + additional)

    // Update header
    const { data: updatedHeader, error: updateError } = await supabase
      .from('sales_invoices')
      .update({
        customer_id: data.customer_id || null,
        customer_name_snapshot: cust?.name || existing.customer_name_snapshot,
        customer_phone_snapshot: cust?.phone || existing.customer_phone_snapshot || null,
        invoice_date: data.invoice_date || existing.invoice_date,
        gross_amount: grossAmount,
        item_discounts_amount: itemDiscounts,
        subtotal: subtotal,
        invoice_discount_type: data.invoice_discount_type || 'none',
        invoice_discount_value: Number(data.invoice_discount_value || 0),
        invoice_discount_amount: invDisc,
        additional_charges: additional,
        final_total: finalTotal,
        payment_terms: data.payment_terms || existing.payment_terms || 'cash',
        notes: data.notes?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'draft')
      .select('id')
      .maybeSingle()

    if (updateError) throw new Error(`فشل تحديث مسودة الفاتورة: ${updateError.message}`)
    if (!updatedHeader) throw new Error('لم تُحدّث المسودة: تغيرت حالتها أو صلاحية الوصول إليها. أعد تحميل الفاتورة.')

    // Replace items
    const { error: removeError } = await supabase.from('sales_invoice_items').delete().eq('invoice_id', id)
    if (removeError) {
      cacheService.invalidateNamespace('invoices')
      throw new Error(`توقف حفظ المسودة ${existing.invoice_number}: فشل حذف البنود السابقة. قد تكون بيانات الرأس تغيرت؛ أعد تحميل الفاتورة وراجعها قبل المحاولة مجدداً. ${removeError.message}`)
    }
    const itemsWithInvId = itemsToInsert.map((it) => ({ ...it, invoice_id: id }))
    const { error: insertError } = await supabase.from('sales_invoice_items').insert(itemsWithInvId)
    if (insertError) {
      cacheService.invalidateNamespace('invoices')
      throw new Error(`توقف حفظ المسودة ${existing.invoice_number}: حُذفت البنود السابقة وتعذر حفظ البديلة. أعد تحميل الفاتورة وراجعها قبل المحاولة مجدداً. ${insertError.message}`)
    }

    // Invalidate caches
    cacheService.invalidateNamespace('invoices')
    cacheService.invalidateNamespace('products')
    cacheService.invalidateNamespace('dashboard')

    if (data.action === 'approve') {
      return this.approveInvoice(id, actor)
    }

    await this.recordAuditLog({
      action: 'INVOICE_DRAFT_UPDATE',
      category: 'sales',
      entity_type: 'sales_invoice',
      entity_id: id,
      entity_name_or_number: existing.invoice_number,
      performed_by: actor.name,
      performed_by_id: actor.id,
      performed_by_role: actor.role,
      outcome: 'success',
      details: { total: finalTotal, customer: cust?.name },
      timestamp: new Date().toISOString(),
    })

    const updatedInv = await this.getInvoiceById(id)
    if (!updatedInv) throw new Error('فشل استرجاع الفاتورة المحدثة')
    return updatedInv
  },

  async approveInvoice(invoiceId: string, actor: User): Promise<SalesInvoice> {
    const supabase = getSupabaseClient()

    // Call atomic RPC: approve_sales_invoice
    const { data: result, error } = await supabase.rpc('approve_sales_invoice', {
      p_invoice_id: invoiceId,
    })

    if (error) {
      await this.recordAuditLog({
        action: 'INVOICE_APPROVE',
        category: 'sales',
        entity_type: 'sales_invoice',
        entity_id: invoiceId,
        entity_name_or_number: invoiceId,
        performed_by: actor.name,
        performed_by_id: actor.id,
        performed_by_role: actor.role,
        outcome: 'failure',
        reason: error.message,
        timestamp: new Date().toISOString(),
      })
      throw new Error(`فشل اعتماد الفاتورة: ${error.message}`)
    }

    // Invalidate caches (stock and sales changed)
    cacheService.invalidateNamespace('invoices')
    cacheService.invalidateNamespace('products')
    cacheService.invalidateNamespace('dashboard')

    await this.recordAuditLog({
      action: 'INVOICE_APPROVE',
      category: 'sales',
      entity_type: 'sales_invoice',
      entity_id: invoiceId,
      entity_name_or_number: result?.invoice_number || invoiceId,
      performed_by: actor.name,
      performed_by_id: actor.id,
      performed_by_role: actor.role,
      outcome: 'success',
      details: { total: result?.final_total },
      timestamp: new Date().toISOString(),
    })

    const inv = await this.getInvoiceById(invoiceId)
    if (!inv) throw new Error('الفاتورة غير موجودة بعد الاعتماد')
    return inv
  },

  async cancelApprovedInvoice(invoiceId: string, reason: string, actor: User): Promise<SalesInvoice> {
    const supabase = getSupabaseClient()
    const cleanReason = reason?.trim()
    if (!cleanReason) throw new Error('يجب كتابة سبب الإلغاء لتوثيق الحركة الرقابية في سجل الحركات')

    // Call atomic RPC: cancel_sales_invoice
    const { data: result, error } = await supabase.rpc('cancel_sales_invoice', {
      p_invoice_id: invoiceId,
      p_reason: cleanReason,
    })

    if (error) {
      await this.recordAuditLog({
        action: 'INVOICE_CANCEL',
        category: 'sales',
        entity_type: 'sales_invoice',
        entity_id: invoiceId,
        entity_name_or_number: invoiceId,
        performed_by: actor.name,
        performed_by_id: actor.id,
        performed_by_role: actor.role,
        outcome: 'failure',
        reason: error.message,
        timestamp: new Date().toISOString(),
      })
      throw new Error(`فشل إلغاء الفاتورة: ${error.message}`)
    }

    // Invalidate caches (stock restored and sales reversed)
    cacheService.invalidateNamespace('invoices')
    cacheService.invalidateNamespace('products')
    cacheService.invalidateNamespace('dashboard')

    await this.recordAuditLog({
      action: 'INVOICE_CANCEL',
      category: 'sales',
      entity_type: 'sales_invoice',
      entity_id: invoiceId,
      entity_name_or_number: result?.invoice_number || invoiceId,
      performed_by: actor.name,
      performed_by_id: actor.id,
      performed_by_role: actor.role,
      outcome: 'success',
      reason: cleanReason,
      timestamp: new Date().toISOString(),
    })

    const inv = await this.getInvoiceById(invoiceId)
    if (!inv) throw new Error('الفاتورة غير موجودة بعد الإلغاء')
    return inv
  },

  async deleteDraftInvoice(invoiceId: string, actor: User): Promise<boolean> {
    const supabase = getSupabaseClient()

    const { data: inv, error: fetchError } = await supabase
      .from('sales_invoices')
      .select('id, invoice_number, status, created_by')
      .eq('id', invoiceId)
      .single()

    if (fetchError || !inv) {
      throw new Error('فاتورة المبيعات غير موجودة')
    }

    if (inv.status !== 'draft') {
      throw new Error(`لا يمكن حذف سوى مسودات الفواتير فقط (حالة الفاتورة الحالية: ${inv.status})`)
    }

    if (actor.role === 'SALES_OPERATOR' && inv.created_by && inv.created_by !== actor.id) {
      throw new Error('غير مصرح: يمكن لمسؤول المبيعات حذف مسودات الفواتير التي أنشأها بنفسه فقط')
    }

    await supabase.from('sales_invoice_items').delete().eq('invoice_id', invoiceId)
    const { error: deleteError } = await supabase.from('sales_invoices').delete().eq('id', invoiceId)

    if (deleteError) {
      throw new Error(`فشل حذف مسودة الفاتورة: ${deleteError.message}`)
    }

    await this.recordAuditLog({
      action: 'INVOICE_DRAFT_DELETE',
      category: 'sales',
      entity_type: 'sales_invoice',
      entity_id: invoiceId,
      entity_name_or_number: inv.invoice_number,
      performed_by: actor.name,
      performed_by_id: actor.id,
      performed_by_role: actor.role,
      outcome: 'success',
      timestamp: new Date().toISOString(),
    })

    return true
  },

  async logInvoicePrint(invoiceId: string, invoiceNumber: string, actor: User): Promise<void> {
    await this.recordAuditLog({
      action: 'INVOICE_PRINT',
      category: 'sales',
      entity_type: 'invoice',
      entity_id: invoiceId,
      entity_name_or_number: invoiceNumber,
      performed_by: actor.name,
      performed_by_id: actor.id,
      performed_by_role: actor.role,
      outcome: 'success',
      timestamp: new Date().toISOString(),
    })
  },

  async logInvoiceExportPng(invoiceId: string, invoiceNumber: string, actor: User): Promise<void> {
    await this.recordAuditLog({
      action: 'INVOICE_EXPORT_PNG',
      category: 'sales',
      entity_type: 'invoice',
      entity_id: invoiceId,
      entity_name_or_number: invoiceNumber,
      performed_by: actor.name,
      performed_by_id: actor.id,
      performed_by_role: actor.role,
      outcome: 'success',
      timestamp: new Date().toISOString(),
    })
  },

  // =========================================================================
  // STOCK RECEIPTS (أذون الاستلام)
  // =========================================================================
  async getReceipts(): Promise<StockReceipt[]> {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('stock_receipts')
        .select(`
          *,
          suppliers(name),
          stock_receipt_items(
            id,
            receipt_id,
            product_id,
            quantity,
            unit_price,
            line_total,
            products(sku, name, unit, allows_decimal_quantity)
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        // Return empty array gracefully if table is empty or unpopulated
        console.warn('Could not query stock_receipts:', error.message)
        return []
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        receipt_number: row.receipt_number,
        receipt_date: row.receipt_date,
        supplier_id: row.supplier_id,
        supplier_name: row.suppliers?.name || 'مورد عام',
        supplier_invoice_number: row.supplier_invoice_number || '',
        notes: row.notes || '',
        total_amount: Number(row.total_amount || 0),
        status: row.status,
        approved_by: row.approved_by,
        approved_at: row.approved_at,
        cancelled_by: row.cancelled_by,
        cancelled_at: row.cancelled_at,
        cancel_reason: row.cancel_reason,
        created_by: row.created_by,
        created_at: row.created_at,
        items: (row.stock_receipt_items || []).map((item: any) => ({
          id: item.id,
          receipt_id: item.receipt_id,
          product_id: item.product_id,
          product_sku: item.products?.sku,
          product_name: item.products?.name,
          unit: item.products?.unit,
          allows_decimal_quantity: item.products?.allows_decimal_quantity,
          quantity: Number(item.quantity || 0),
          unit_price: Number(item.unit_price || 0),
          line_total: Number(item.line_total || 0),
        })),
      }))
    } catch {
      return []
    }
  },

  // =========================================================================
  // INVENTORY MOVEMENTS
  // =========================================================================
  async getInventoryMovements(limit = 200): Promise<InventoryMovementLog[]> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('*, products(name, sku, unit)')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw new Error(`فشل جلب سجل حركات المخزن: ${error.message}`)

    return (data || []).map((row: any) => ({
      id: row.id,
      product_id: row.product_id,
      product_sku: row.products?.sku,
      product_name: row.products?.name,
      unit: row.products?.unit,
      movement_type: row.movement_type,
      source_doc_type: row.source_doc_type,
      source_doc_id: row.source_doc_id,
      source_doc_number: row.source_doc_number,
      quantity_in: Number(row.quantity_in || 0),
      quantity_out: Number(row.quantity_out || 0),
      stock_balance_after: Number(row.stock_balance_after || 0),
      unit_cost_or_price: Number(row.unit_cost_or_price || 0),
      notes: row.notes || '',
      created_by: row.created_by,
      created_at: row.created_at,
    }))
  },

  // =========================================================================
  // AUDIT LOGS
  // =========================================================================
  async getAuditLogs(): Promise<AuditLogEntry[]> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(300)

    if (error) throw new Error(`فشل جلب سجل النشاط والرقابة: ${error.message}`)

    return (data || []).map((row: any) => ({
      id: row.id,
      action: row.action,
      category: row.category,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      entity_name_or_number: row.entity_name_or_number,
      performed_by: row.performed_by,
      performed_by_id: row.performed_by_id,
      performed_by_role: row.performed_by_role,
      details: row.details,
      reason: row.reason,
      outcome: row.outcome,
      timestamp: row.timestamp,
    }))
  },

  async recordAuditLog(
    entry: Omit<AuditLogEntry, 'id'> & { timestamp?: string }
  ): Promise<void> {
    try {
      const supabase = getSupabaseClient()
      await supabase.from('audit_logs').insert({
        action: entry.action,
        category: entry.category,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        entity_name_or_number: entry.entity_name_or_number,
        performed_by: entry.performed_by,
        performed_by_id: entry.performed_by_id || null,
        performed_by_role: entry.performed_by_role || 'ADMIN',
        details: entry.details || null,
        reason: entry.reason || null,
        outcome: entry.outcome || 'success',
        timestamp: entry.timestamp || new Date().toISOString(),
      })
    } catch {
      // Non-blocking audit logging fail-safe
    }
  },

  // =========================================================================
  // DASHBOARD SUMMARY (AFRICA/CAIRO TIMEZONE)
  // =========================================================================
  async getDashboardSummary(options?: {
    invoices?: SalesInvoice[]
    products?: Product[]
    currentUserRole?: string
  }): Promise<DashboardSummary> {
    const supabase = getSupabaseClient()
    const isSalesOperator = options?.currentUserRole === 'SALES_OPERATOR'

    // 1. Invoices: reuse if provided, otherwise fetch
    const invoices = options?.invoices ?? (await this.getInvoices())

    // 2. Products: reuse if provided, otherwise fetch only if not sales operator or if needed
    let products = options?.products
    if (!products) {
      products = isSalesOperator ? [] : await this.getProducts(undefined, options?.currentUserRole)
    }

    // 3. Inventory movements: bounded fetch (limit 6) and safe error handling
    let recentMovements: DashboardSummary['recentMovements'] = []
    if (!isSalesOperator) {
      try {
        const movements = await this.getInventoryMovements(6)
        recentMovements = movements.slice(0, 6).map((m) => ({
          id: m.id,
          productId: m.product_id,
          productCode: m.product_sku || '',
          productName: m.product_name || '',
          movementType: m.movement_type,
          movementNumber: m.source_doc_number,
          quantity: m.quantity_in > 0 ? m.quantity_in : m.quantity_out,
          unit: m.unit || 'قطعة',
          reference: m.source_doc_number,
          performedBy: m.created_by || 'النظام',
          date: m.created_at || new Date().toISOString(),
        }))
      } catch (movErr) {
        console.warn('Could not fetch recent inventory movements for dashboard:', movErr)
      }
    }

    // 4. Active customers count: lightweight head count query to avoid fetching all customer rows
    let activeCustomersCount = 0
    try {
      const { count, error: countErr } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      if (!countErr && typeof count === 'number') {
        activeCustomersCount = count
      } else {
        const custs = await this.getCustomers()
        activeCustomersCount = custs.filter((c) => c.is_active).length
      }
    } catch {
      // Fallback in case of count error
      const custs = await this.getCustomers()
      activeCustomersCount = custs.filter((c) => c.is_active).length
    }

    // Determine current day in Africa/Cairo
    const now = new Date()
    const cairoDateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: QENA_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now)

    const approvedInvoices = invoices.filter((i) => i.status === 'approved')
    const todayInvoices = approvedInvoices.filter((i) => {
      const invDate = i.created_at ? i.created_at.split('T')[0] : i.invoice_date
      return invDate === cairoDateStr
    })

    const todaySales = todayInvoices.reduce((sum, i) => sum + i.final_total, 0)
    const totalSales = approvedInvoices.reduce((sum, i) => sum + i.final_total, 0)
    const lowStockCount = products.filter((p) => p.isLowStock).length

    return {
      todaySales,
      todayInvoicesCount: todayInvoices.length,
      totalSales,
      totalProductsCount: products.filter((p) => p.is_active).length,
      lowStockProductsCount: lowStockCount,
      activeCustomersCount,
      salesTrends: [],
      recentInvoices: approvedInvoices.slice(0, 5).map((i) => ({
        id: i.id,
        invoiceNumber: i.invoice_number,
        date: i.invoice_date,
        customerId: i.customer_id || '',
        customerName: i.customer_name_snapshot || 'عميل',
        status: i.status,
        itemsCount: i.items?.length || 0,
        subtotal: i.subtotal,
        discount: i.invoice_discount_amount + i.item_discounts_amount,
        tax: 0,
        total: i.final_total,
        paidAmount: i.final_total,
        remainingAmount: 0,
      })),
      recentMovements,
    }
  },

  // =========================================================================
  // SETTINGS & PROFILE
  // =========================================================================
  async getCompanyProfile(): Promise<CompanyProfile> {
    const supabase = getSupabaseClient()
    const { data } = await supabase
      .from('application_settings')
      .select('value')
      .eq('key', 'company_profile')
      .single()

    return (
      data?.value || {
        name: 'الأميرة للتوريدات والتجارة العامة',
        activity: 'توريدات عمومية وتجارة - استيراد وتصدير وتوكيلات',
        phone: '01012345678',
        address: 'قنا - م الوقف',
        commercial_reg: '105423',
        tax_id: '450-892-110',
        notes: 'نسعد دائماً بخدمتكم وتوفير أفضل العروض والمنتجات المعمارية والتجارية.',
      }
    )
  },

  async getSystemPreferences(): Promise<SystemPreferences> {
    const supabase = getSupabaseClient()
    const { data } = await supabase
      .from('application_settings')
      .select('value')
      .eq('key', 'system_preferences')
      .single()

    return (
      data?.value || {
        defaultPaymentTerms: 'cash',
        lowStockThreshold: 5,
        currencySymbol: 'ج.م',
        allowDecimalsForMetric: true,
      }
    )
  },

  async updateCompanyProfile(profile: CompanyProfile, actor: User): Promise<CompanyProfile> {
    const supabase = getSupabaseClient()
    if (actor.role !== 'ADMIN') {
      throw new Error('غير مصرح: تعديل بيانات وهوية المنشأة مقتصر على مدير النظام فقط')
    }

    const { data, error } = await supabase
      .from('application_settings')
      .upsert({
        key: 'company_profile',
        value: profile,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' })
      .select('value')
      .single()

    if (error) throw new Error(`فشل تحديث بيانات وهوية المنشأة: ${error.message}`)

    await this.logSettingsUpdate('company_profile', 'بيانات وهوية المنشأة', { name: profile.name }, actor)
    return data?.value || profile
  },

  async updateSystemPreferences(prefs: SystemPreferences, actor: User): Promise<SystemPreferences> {
    const supabase = getSupabaseClient()
    if (actor.role !== 'ADMIN') {
      throw new Error('غير مصرح: تعديل تفضيلات النظام مقتصر على مدير النظام فقط')
    }

    const { data, error } = await supabase
      .from('application_settings')
      .upsert({
        key: 'system_preferences',
        value: prefs,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' })
      .select('value')
      .single()

    if (error) throw new Error(`فشل تحديث تفضيلات النظام: ${error.message}`)

    await this.logSettingsUpdate('system_preferences', 'تفضيلات النظام والتشغيل', { defaultPaymentTerms: prefs.defaultPaymentTerms }, actor)
    return data?.value || prefs
  },

  async logSettingsUpdate(
    settingKey: string,
    settingLabel: string,
    details?: Record<string, any>,
    actor?: User
  ): Promise<void> {
    await this.recordAuditLog({
      action: 'SETTINGS_UPDATE',
      category: 'admin',
      entity_type: 'settings',
      entity_id: settingKey,
      entity_name_or_number: settingLabel,
      performed_by: actor?.name || 'مدير النظام',
      performed_by_id: actor?.id,
      performed_by_role: actor?.role || 'ADMIN',
      outcome: 'success',
      details,
      timestamp: new Date().toISOString(),
    })
  },

  // =========================================================================
  // USER ACCOUNTS
  // =========================================================================
  async getUsers(): Promise<User[]> {
    return cacheService.getOrFetch<User[]>('users:all', async () => {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('authorized_users')
        .select('*')
        .order('full_name', { ascending: true })

      if (error) throw new Error(`فشل جلب قائمة المستخدمين: ${error.message}`)

      return (data || []).map((row: any) => ({
        id: row.user_id,
        name: row.full_name,
        email: row.email,
        role: (row.role as 'ADMIN' | 'SALES_OPERATOR') || 'ADMIN',
        username: row.username || (row.email ? row.email.split('@')[0] : 'user'),
        title: row.role === 'SALES_OPERATOR' ? 'مسؤول مبيعات' : 'مدير النظام',
        is_active: row.is_active !== false,
      }))
    }, 30000)
  },

  async toggleUserActive(userId: string, actor: User): Promise<User> {
    if (isPrimaryAdmin(userId)) {
      throw new Error('لا يمكن تعطيل أو حذف حساب المدير الأساسي.')
    }

    const supabase = getSupabaseClient()
    if (actor.role !== 'ADMIN') {
      throw new Error('غير مصرح: إدارة وتعديل حالة المستخدمين مقتصرة على مدير النظام فقط')
    }

    const { data: userRow, error: fetchErr } = await supabase
      .from('authorized_users')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (fetchErr || !userRow) throw new Error('المستخدم غير موجود')

    const newStatus = !userRow.is_active
    const { data: updated, error: updateErr } = await supabase
      .from('authorized_users')
      .update({ is_active: newStatus, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select('*')
      .single()

    if (updateErr) throw new Error(`فشل تعديل حالة المستخدم: ${updateErr.message}`)

    cacheService.invalidateNamespace('users')

    await this.recordAuditLog({
      action: 'USER_STATUS_CHANGE',
      category: 'admin',
      entity_type: 'user',
      entity_id: userId,
      entity_name_or_number: updated.full_name,
      performed_by: actor.name,
      performed_by_id: actor.id,
      performed_by_role: actor.role,
      outcome: 'success',
      details: { is_active: newStatus },
      timestamp: new Date().toISOString(),
    })

    return {
      id: updated.user_id,
      name: updated.full_name,
      email: updated.email,
      role: updated.role,
      username: updated.username || updated.email?.split('@')[0] || 'user',
      title: updated.role === 'SALES_OPERATOR' ? 'مسؤول مبيعات' : 'مدير النظام',
      is_active: updated.is_active !== false,
    }
  },

  async createSalesOperator(
    data: { email: string; password?: string; full_name: string; username?: string; phone?: string },
    actor: User
  ): Promise<User> {
    if (actor.role !== 'ADMIN') {
      throw new Error('غير مصرح: إضافة مسؤولي المبيعات مقتصرة على مدير النظام فقط')
    }

    const cleanEmail = (data.email || '').trim().toLowerCase()
    const cleanName = (data.full_name || '').trim()
    const cleanPassword = (data.password || '').trim()

    if (!cleanEmail || !cleanName) {
      throw new Error('الاسم والبريد الإلكتروني مطلوبان لإنشاء حساب مسؤول المبيعات')
    }

    if (!cleanPassword || cleanPassword.length < 8) {
      throw new Error('كلمة المرور مطلوبة ويجب أن تتكون من 8 أحرف على الأقل')
    }

    const supabase = getSupabaseClient()

    // Invoke server-side Supabase Edge Function to create identity in auth.users + authorized_users
    const { data: result, error: funcError } = await supabase.functions.invoke(
      'create-sales-operator',
      {
        body: {
          email: cleanEmail,
          password: cleanPassword,
          full_name: cleanName,
          username: data.username?.trim().toLowerCase() || cleanEmail.split('@')[0],
          phone: data.phone?.trim() || null,
        },
      }
    )

    if (funcError) {
      let customError = funcError.message
      try {
        const contextResponse = (funcError as { context?: Response }).context
        if (contextResponse && typeof contextResponse.json === 'function') {
          const body = await contextResponse.json()
          if (body?.error) {
            customError = body.error
          }
        }
      } catch {
        // Fall back to funcError.message
      }
      throw new Error(customError)
    }

    if (!result || !result.success || !result.user) {
      throw new Error(result?.error || result?.message || 'فشل إنشاء حساب مسؤول المبيعات عبر الخادم')
    }

    const created = result.user
    cacheService.invalidateNamespace('users')

    await this.recordAuditLog({
      action: 'USER_CREATE',
      category: 'admin',
      entity_type: 'user',
      entity_id: created.id,
      entity_name_or_number: created.name || created.full_name,
      performed_by: actor.name,
      performed_by_id: actor.id,
      performed_by_role: actor.role,
      outcome: 'success',
      details: { role: 'SALES_OPERATOR', email: cleanEmail },
      timestamp: new Date().toISOString(),
    })

    return {
      id: created.id,
      name: created.name || created.full_name,
      email: created.email,
      role: 'SALES_OPERATOR',
      username: created.username || cleanEmail.split('@')[0],
      title: 'مسؤول مبيعات',
      is_active: created.is_active !== false,
    }
  },

  async createUser(data: Partial<User>, actor: User): Promise<User> {
    const supabase = getSupabaseClient()
    if (actor.role !== 'ADMIN') {
      throw new Error('غير مصرح: إضافة مستخدمين جدد مقتصرة على مدير النظام فقط')
    }

    // If sales operator with email and name, delegate to edge function
    if (data.role === 'SALES_OPERATOR' && data.email && data.name) {
      try {
        return await this.createSalesOperator(
          {
            email: data.email,
            full_name: data.name,
            username: data.username,
          },
          actor
        )
      } catch (err: unknown) {
        // If function not yet deployed or in local tests, proceed to direct insert fallback
        console.warn('Edge Function fallback to direct insert:', err)
      }
    }

    const newId = crypto.randomUUID()
    const { data: created, error } = await supabase
      .from('authorized_users')
      .insert({
        user_id: newId,
        email: data.email || null,
        full_name: data.name,
        role: data.role || 'SALES_OPERATOR',
        username: data.username || null,
        is_active: data.is_active !== false,
      })
      .select('*')
      .single()

    if (error) throw new Error(`فشل إضافة المستخدم إلى قائمة المستخدمين المصرح لهم: ${error.message}`)

    cacheService.invalidateNamespace('users')

    await this.recordAuditLog({
      action: 'USER_CREATE',
      category: 'admin',
      entity_type: 'user',
      entity_id: created.user_id,
      entity_name_or_number: created.full_name,
      performed_by: actor.name,
      performed_by_id: actor.id,
      performed_by_role: actor.role,
      outcome: 'success',
      timestamp: new Date().toISOString(),
    })

    return {
      id: created.user_id,
      name: created.full_name,
      email: created.email,
      role: created.role,
      username: created.username || 'user',
      title: created.role === 'SALES_OPERATOR' ? 'مسؤول مبيعات' : 'مدير النظام',
      is_active: created.is_active !== false,
    }
  },

  async updateUser(userId: string, data: Partial<User>, actor: User): Promise<User> {
    if (isPrimaryAdmin(userId)) {
      if (data.is_active === false) {
        throw new Error('لا يمكن تعطيل أو حذف حساب المدير الأساسي.')
      }
      if (data.role && data.role !== 'ADMIN') {
        throw new Error('لا يمكن تغيير دور أو خفض صلاحيات حساب المدير الأساسي.')
      }
    }

    const supabase = getSupabaseClient()
    if (actor.role !== 'ADMIN') {
      throw new Error('غير مصرح: تعديل بيانات المستخدمين مقتصر على مدير النظام فقط')
    }

    const { data: updated, error } = await supabase
      .from('authorized_users')
      .update({
        full_name: data.name,
        email: data.email || null,
        role: data.role,
        username: data.username || null,
        is_active: data.is_active !== false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select('*')
      .single()

    if (error) throw new Error(`فشل تعديل بيانات المستخدم: ${error.message}`)

    cacheService.invalidateNamespace('users')

    await this.recordAuditLog({
      action: 'USER_UPDATE',
      category: 'admin',
      entity_type: 'user',
      entity_id: userId,
      entity_name_or_number: updated.full_name,
      performed_by: actor.name,
      performed_by_id: actor.id,
      performed_by_role: actor.role,
      outcome: 'success',
      timestamp: new Date().toISOString(),
    })

    return {
      id: updated.user_id,
      name: updated.full_name,
      email: updated.email,
      role: updated.role,
      username: updated.username || 'user',
      title: updated.role === 'SALES_OPERATOR' ? 'مسؤول مبيعات' : 'مدير النظام',
      is_active: updated.is_active !== false,
    }
  },

  async toggleUserStatus(userId: string, isActive: boolean, actor: User): Promise<void> {
    if (isPrimaryAdmin(userId) && !isActive) {
      throw new Error('لا يمكن تعطيل أو حذف حساب المدير الأساسي.')
    }
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('authorized_users')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('user_id', userId)

    if (error) throw new Error(`فشل تحديث حالة المستخدم: ${error.message}`)

    await this.recordAuditLog({
      action: 'USER_STATUS_CHANGE',
      category: 'admin',
      entity_type: 'user',
      entity_id: userId,
      entity_name_or_number: userId,
      performed_by: actor.name,
      performed_by_id: actor.id,
      performed_by_role: actor.role,
      outcome: 'success',
      details: { is_active: isActive },
      timestamp: new Date().toISOString(),
    })
  },
}
