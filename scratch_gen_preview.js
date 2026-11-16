const fs = require('fs');

const fullHtml = fs.readFileSync('D:/Projects/System_Excel/index.html', 'utf8');

// We create an interactive standalone preview by injecting sample mock data into AppState
let previewHtml = fullHtml;

// Modify auto-init in preview to load mock data immediately
const mockDataInjection = `
    <script>
    window.addEventListener('DOMContentLoaded', () => {
        // Mock data for previewing refined UI
        AppState.products = [
            { id: '1', sku: 'PRD-001', name: 'قاطع كهربائي ثلاثي شنايدر 63A', unit: 'قطعة', purchase_price: 450, sale_price: 580, current_stock: 45, min_stock_level: 10, is_active: true },
            { id: '2', sku: 'PRD-002', name: 'كابل نحاس معزول سويدي 4 مم (لفة)', unit: 'متر', purchase_price: 1800, sale_price: 2250, current_stock: 4, min_stock_level: 10, is_active: true },
            { id: '3', sku: 'PRD-003', name: 'لوحة توزيع 12 خط فينوس داخل الحائط', unit: 'قطعة', purchase_price: 620, sale_price: 850, current_stock: 0, min_stock_level: 5, is_active: true }
        ];
        AppState.invoices = [
            { id: '101', invoice_number: 'INV-2026-001', invoice_date: '2026-11-16', customer_id: 'c1', total_amount: 5800, discount_amount: 290, tax_amount: 0, final_total: 5510, status: 'approved', items: [] },
            { id: '102', invoice_number: 'INV-2026-002', invoice_date: '2026-11-16', customer_id: 'c2', total_amount: 11250, discount_amount: 0, tax_amount: 0, final_total: 11250, status: 'approved', items: [] }
        ];
        AppState.receipts = [
            { id: '201', receipt_number: 'REC-2026-001', receipt_date: '2026-11-15', supplier_id: 's1', total_amount: 18500, status: 'approved', items: [] }
        ];
        AppState.movements = [
            { id: 'm1', movement_type: 'sale', source_doc_number: 'INV-2026-002', product_id: '1', quantity_in: 0, quantity_out: 10, stock_balance_after: 45, notes: 'مبيعات معتمدة' },
            { id: 'm2', movement_type: 'receipt', source_doc_number: 'REC-2026-001', product_id: '1', quantity_in: 50, quantity_out: 0, stock_balance_after: 55, notes: 'توريد معتمد' }
        ];
        AppState.customers = [
            { id: 'c1', name: 'مؤسسة النور للمقاولات', phone: '01012345678', address: 'القاهرة - مدينة نصر' }
        ];
        AppState.suppliers = [
            { id: 's1', name: 'شركة السويدي للكابلات', phone: '01223456789', address: 'العاشر من رمضان' }
        ];
        AppState.lastBackupTime = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(); // >24h to demonstrate compact alert

        // Render modules
        if (window.DashboardModule) DashboardModule.render();
        if (window.App) {
            App.checkBackupWarning();
            const dateEl = document.getElementById('current-arabic-date');
            if (dateEl) dateEl.innerText = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }
    });
    </script>
`;

previewHtml = previewHtml.replace('</body>', mockDataInjection + '</body>');
fs.writeFileSync('D:/Projects/System_Excel/final_ui_production_preview.html', previewHtml, 'utf8');
console.log('final_ui_production_preview.html generated successfully!');
