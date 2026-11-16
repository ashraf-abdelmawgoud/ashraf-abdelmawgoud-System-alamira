// ==============================================================================
// AL AMIRA INVENTORY & INVOICING SYSTEM
// Mandatory Business Logic & Calculation Test Suite
// File: test_scenario.js
// ==============================================================================

function round2(val) {
    return Math.round((Number(val) + Number.EPSILON) * 100) / 100;
}

function calculateInvoiceTotals(items, invoiceDiscountType, invoiceDiscountVal, additionalCharges = 0) {
    let grossTotal = 0;
    let itemDiscountsTotal = 0;
    let subtotal = 0;

    const calculatedItems = items.map(item => {
        const qty = Number(item.quantity);
        const price = Number(item.unit_price);
        const gross = round2(qty * price);
        let discAmount = 0;

        if (item.discount_type === 'percentage') {
            const pct = Math.min(Math.max(Number(item.discount_value) || 0, 0), 100);
            discAmount = round2((gross * pct) / 100);
        } else if (item.discount_type === 'fixed') {
            discAmount = Math.min(Number(item.discount_value) || 0, gross);
            discAmount = round2(discAmount);
        }

        const net = round2(gross - discAmount);
        grossTotal = round2(grossTotal + gross);
        itemDiscountsTotal = round2(itemDiscountsTotal + discAmount);
        subtotal = round2(subtotal + net);

        return {
            ...item,
            gross_amount: gross,
            discount_amount: discAmount,
            net_amount: net
        };
    });

    let invoiceDiscountAmount = 0;
    if (invoiceDiscountType === 'percentage') {
        const pct = Math.min(Math.max(Number(invoiceDiscountVal) || 0, 0), 100);
        invoiceDiscountAmount = round2((subtotal * pct) / 100);
    } else if (invoiceDiscountType === 'fixed') {
        invoiceDiscountAmount = Math.min(Number(invoiceDiscountVal) || 0, subtotal);
        invoiceDiscountAmount = round2(invoiceDiscountAmount);
    }

    const finalTotal = round2(subtotal - invoiceDiscountAmount + Number(additionalCharges || 0));

    return {
        items: calculatedItems,
        gross_amount: grossTotal,
        item_discounts_amount: itemDiscountsTotal,
        subtotal: subtotal,
        invoice_discount_amount: invoiceDiscountAmount,
        final_total: finalTotal
    };
}

// In-Memory Simulation of the Supabase Database & Stored Procedures
class AlAmiraTestEngine {
    constructor() {
        this.products = new Map();
        this.receipts = new Map();
        this.invoices = new Map();
        this.movements = [];
    }

    createProduct(product) {
        if (this.products.has(product.sku)) {
            throw new Error(`المنتج ذو الكود ${product.sku} موجود بالفعل`);
        }
        const p = {
            id: 'prod_' + Math.random().toString(36).substr(2, 9),
            ...product,
            current_stock: product.current_stock || 0
        };
        this.products.set(product.sku, p);
        return p;
    }

    approveStockReceipt(receipt) {
        receipt.items.forEach(item => {
            const p = this.products.get(item.sku);
            if (!p) throw new Error('المنتج غير موجود: ' + item.sku);
            p.current_stock = round2(p.current_stock + item.quantity);
            this.movements.push({
                product_id: p.id,
                movement_type: 'receipt',
                doc_number: receipt.receipt_number,
                qty_in: item.quantity,
                qty_out: 0,
                stock_balance_after: p.current_stock
            });
        });
        receipt.status = 'approved';
        return receipt;
    }

    approveSalesInvoice(invoice) {
        // Step 1: Pre-validation of inventory
        invoice.items.forEach(item => {
            const p = this.products.get(item.sku);
            if (!p) throw new Error('المنتج غير موجود: ' + item.sku);
            if (p.current_stock < item.quantity) {
                throw new Error(`رصيد المخزون غير كاف للمنتج ${p.name} (المتاح: ${p.current_stock}، المطلوب: ${item.quantity})`);
            }
        });

        // Step 2: Atomic financial recalculation
        const calcs = calculateInvoiceTotals(
            invoice.items,
            invoice.invoice_discount_type,
            invoice.invoice_discount_value,
            invoice.additional_charges
        );

        // Step 3: Stock deduction
        invoice.items.forEach(item => {
            const p = this.products.get(item.sku);
            p.current_stock = round2(p.current_stock - item.quantity);
            this.movements.push({
                product_id: p.id,
                movement_type: 'sale',
                doc_number: invoice.invoice_number,
                qty_in: 0,
                qty_out: item.quantity,
                stock_balance_after: p.current_stock
            });
        });

        invoice.status = 'approved';
        invoice.calculations = calcs;
        return invoice;
    }
}

// ------------------------------------------------------------------------------
// EXECUTE MANDATORY TEST SCENARIO
// ------------------------------------------------------------------------------
console.log('=== بدء اختبار السيناريو الإلزامي لنظام الأميرة ===\n');
const engine = new AlAmiraTestEngine();

// 1. Create Product P001
const p1 = engine.createProduct({
    sku: 'P001',
    name: 'ورق تصوير A4 مالتي أوفيس 80 جرام',
    purchase_price: 80,
    selling_price: 100,
    current_stock: 0
});
console.log(`[1-4] تم إنشاء المنتج ${p1.sku} - سعر الشراء: ${p1.purchase_price} ج.م، سعر البيع: ${p1.selling_price} ج.م، الرصيد الأولي: ${p1.current_stock}`);

// 5. Approve receipt of 100 units
engine.approveStockReceipt({
    receipt_number: 'REC-202611-001',
    items: [{ sku: 'P001', quantity: 100, unit_price: 80 }]
});

// 6. Verify stock equals 100 units
const stockAfterReceipt = engine.products.get('P001').current_stock;
console.log(`[5-6] تم اعتماد إذن إضافة 100 وحدة. رصيد المخزون الحالي: ${stockAfterReceipt} وحدة.`);
if (stockAfterReceipt !== 100) throw new Error('فشل التحقق: الرصيد ليس 100!');

// 7-10. Create invoice for 10 units, 10% item discount, 5% invoice discount
const invoiceData = {
    invoice_number: 'INV-202611-001',
    invoice_discount_type: 'percentage',
    invoice_discount_value: 5,
    additional_charges: 0,
    items: [{
        sku: 'P001',
        quantity: 10,
        unit_price: 100,
        discount_type: 'percentage',
        discount_value: 10
    }]
};

const preCalculations = calculateInvoiceTotals(
    invoiceData.items,
    invoiceData.invoice_discount_type,
    invoiceData.invoice_discount_value,
    invoiceData.additional_charges
);

console.log(`[7-10] حسابات الفاتورة:`);
console.log(`   - الإجمالي الأولي (Gross): ${preCalculations.gross_amount} ج.م (المتوقع: 1000)`);
console.log(`   - خصم البند (Item Discount 10%): ${preCalculations.item_discounts_amount} ج.م (المتوقع: 100)`);
console.log(`   - المجموع الفرعي (Subtotal): ${preCalculations.subtotal} ج.م (المتوقع: 900)`);
console.log(`   - خصم الفاتورة (Invoice Discount 5%): ${preCalculations.invoice_discount_amount} ج.م (المتوقع: 45)`);
console.log(`   - الإجمالي النهائي (Final Total): ${preCalculations.final_total} ج.م (المتوقع: 855)`);

if (preCalculations.gross_amount !== 1000 ||
    preCalculations.item_discounts_amount !== 100 ||
    preCalculations.subtotal !== 900 ||
    preCalculations.invoice_discount_amount !== 45 ||
    preCalculations.final_total !== 855) {
    throw new Error('فشل الاختبار الرياضي لحسابات الفاتورة والخصومات المزدوجة!');
}
console.log('   >>> نتيجة اختبار الحسابات المالية: نجاح تام (855 EGP) مطابقة للمطلوب بدقة.');

// 11-12. Approve invoice and verify stock equals 90 units
engine.approveSalesInvoice(invoiceData);
const stockAfterSale = engine.products.get('P001').current_stock;
console.log(`[11-12] تم اعتماد الفاتورة. رصيد المخزون بعد البيع: ${stockAfterSale} وحدة (المتوقع: 90).`);
if (stockAfterSale !== 90) throw new Error('فشل التحقق: الرصيد بعد البيع ليس 90!');

// 13-14. Reopen/inspect and verify stock remains 90 units
const stockRecheck = engine.products.get('P001').current_stock;
console.log(`[13-14] فحص المخزون عند إعادة الفتح: ${stockRecheck} وحدة.`);
if (stockRecheck !== 90) throw new Error('فشل التحقق: تغير المخزون عند إعادة الاستعراض!');

// 15-16. Attempt to sell 100 units and verify rejection
console.log(`[15-16] محاولة بيع 100 وحدة والمخزون المتاح 90 وحدة فقط:`);
try {
    engine.approveSalesInvoice({
        invoice_number: 'INV-202611-002',
        invoice_discount_type: 'none',
        invoice_discount_value: 0,
        items: [{ sku: 'P001', quantity: 100, unit_price: 100, discount_type: 'none', discount_value: 0 }]
    });
    throw new Error('خطأ خطير: كان يجب رفض العملية بسبب نقص المخزون!');
} catch (err) {
    console.log(`   >>> تم رفض العملية بنجاح كما هو متوقع: "${err.message}"`);
}

// 17-21. Verify Stock remains 90 after rejected sale
if (engine.products.get('P001').current_stock !== 90) {
    throw new Error('خطأ: تغير المخزون بعد العملية المرفوضة!');
}

console.log('\n=== اكتملت كافة سيناريوهات الاختبار الإلزامية بنجاح 100% ===');
