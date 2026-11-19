/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseClient } from './supabaseClient'
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
  DashboardSummary,
  CompanyProfile,
  SystemPreferences,
} from '@/types'
import { QENA_TIMEZONE } from '@/lib/formatters'

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
    const supabase = getSupabaseClient()
    const isSalesOperator = currentUserRole === 'SALES_OPERATOR'

    // Query products_secure_view (with server-side cost/stock masking) with fallback to products table
    let { data, error } = await supabase
      .from('products_secure_view')
      .select('*')
      .order('name', { ascending: true })

    if (error && (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation'))) {
      const fallback = await supabase
        .from('products')
        .select('*, categories(name)')
        .order('name', { ascending: true })
      data = fallback.data
      error = fallback.error
    }

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
  },

  async getCategories(): Promise<string[]> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('categories')
      .select('name')
      .order('name', { ascending: true })

    if (error || !data || data.length === 0) {
      // Fallback: extract distinct categories from products
      const { data: pData } = await supabase.from('products').select('categories(name)')
      if (pData) {
        const unique = Array.from(new Set(pData.map((p: any) => p.categories?.name).filter(Boolean)))
        if (unique.length > 0) return unique as string[]
      }
      return ['حلويات شرقية', 'حلويات غربية', 'مخبوزات وطواجن', 'مشروبات', 'عام']
    }
    return data.map((c: any) => c.name)
  },

  async getProductById(id: string, currentUserRole?: string): Promise<Product | null> {
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
      cancellation_reason: row.cancellation_reason || '',
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
  },

  async createInvoice(data: SalesInvoiceFormData, actor: User): Promise<SalesInvoice> {
    const supabase = getSupabaseClient()
    if (!data.customer_id) throw new Error('العميل مطلوب لإصدار الفاتورة')
    if (!data.items || data.items.length === 0) throw new Error('يجب إضافة بند صنف واحد على الأقل')

    // Fetch customer snapshot
    const { data: cust } = await supabase
      .from('customers')
      .select('name, phone')
      .eq('id', data.customer_id)
      .single()

    // Generate invoice sequence
    const dateStr = (data.invoice_date || new Date().toISOString().split('T')[0]).replace(/-/g, '')
    const randSeq = Math.floor(1000 + Math.random() * 9000)
    const invoiceNumber = `INV-${dateStr}-${randSeq}`

    // Calculate preliminary amounts
    let grossAmount = 0
    let itemDiscounts = 0
    let subtotal = 0

    const itemsToInsert = []
    for (const item of data.items) {
      const { data: prod } = await supabase
        .from('products')
        .select('name, sku, unit, selling_price')
        .eq('id', item.product_id)
        .single()

      if (!prod) throw new Error(`الصنف ${item.product_id} غير موجود`)

      const qty = Number(item.quantity)
      const price = Number(item.unit_price || prod.selling_price)
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
    if (itemsError) throw new Error(`فشل إدراج بنود الفاتورة: ${itemsError.message}`)

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

    return (await this.getInvoices()).find((i) => i.id === invHeader.id)!
  },

  async updateDraftInvoice(id: string, data: SalesInvoiceFormData, actor: User): Promise<SalesInvoice> {
    const supabase = getSupabaseClient()
    const isSalesOperator = actor.role === 'SALES_OPERATOR'

    // Verify invoice exists and is draft
    const existing = (await this.getInvoices()).find((i) => i.id === id)
    if (!existing) throw new Error('مسودة الفاتورة غير موجودة')
    if (existing.status !== 'draft') throw new Error('لا يمكن تعديل فاتورة معتمدة أو ملغاة')

    // Ownership check for SALES_OPERATOR
    if (isSalesOperator && existing.created_by && existing.created_by !== actor.id) {
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

    // Customer validation
    let cust: Customer | undefined
    if (data.customer_id) {
      const customers = await this.getCustomers()
      cust = customers.find((c) => c.id === data.customer_id)
    }

    // Calculations
    const allProducts = await this.getProducts(undefined, 'ADMIN')
    let grossAmount = 0
    let itemDiscounts = 0
    let subtotal = 0

    const itemsToInsert = (data.items || []).map((it) => {
      const prod = allProducts.find((p) => p.id === it.product_id)
      const qty = Number(it.quantity || 1)
      const price = Number(it.unit_price || prod?.selling_price || 0)
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
    const { error: updateError } = await supabase
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

    if (updateError) throw new Error(`فشل تحديث مسودة الفاتورة: ${updateError.message}`)

    // Replace items
    await supabase.from('sales_invoice_items').delete().eq('invoice_id', id)
    const itemsWithInvId = itemsToInsert.map((it) => ({ ...it, invoice_id: id }))
    await supabase.from('sales_invoice_items').insert(itemsWithInvId)

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

    return (await this.getInvoices()).find((i) => i.id === id)!
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

    const inv = (await this.getInvoices()).find((i) => i.id === invoiceId)
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

    const inv = (await this.getInvoices()).find((i) => i.id === invoiceId)
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
  // INVENTORY MOVEMENTS
  // =========================================================================
  async getInventoryMovements(): Promise<InventoryMovementLog[]> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('*, products(name, sku, unit)')
      .order('created_at', { ascending: false })
      .limit(200)

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
  async getDashboardSummary(): Promise<DashboardSummary> {
    const invoices = await this.getInvoices()
    const products = await this.getProducts(undefined, 'ADMIN')
    const movements = await this.getInventoryMovements()
    const customers = await this.getCustomers()

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
      activeCustomersCount: customers.filter((c) => c.is_active).length,
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
      recentMovements: movements.slice(0, 6).map((m) => ({
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
      })),
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
        name: 'الأميرة للتوريدات العامة والتجارة',
        activity: 'توريدات عمومية وتجارة - استيراد وتصدير وتوكيلات',
        phone: '01012345678',
        address: 'قنا – الوقف – بجوار مركز شباب عزبة علام',
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
  },

  async toggleUserActive(userId: string, actor: User): Promise<User> {
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

  async createUser(data: Partial<User>, actor: User): Promise<User> {
    const supabase = getSupabaseClient()
    if (actor.role !== 'ADMIN') {
      throw new Error('غير مصرح: إضافة مستخدمين جدد مقتصرة على مدير النظام فقط')
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
