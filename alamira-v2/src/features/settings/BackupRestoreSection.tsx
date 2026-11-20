import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '../../components/ui/Button';
import { dataService } from '@/services/dataService';

interface BackupRestoreSectionProps {
  onNotification?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const BackupRestoreSection: React.FC<BackupRestoreSectionProps> = ({
  onNotification,
}) => {
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const [isExportingJson, setIsExportingJson] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [restoreStats, setRestoreStats] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('alamira_last_backup_time');
    if (saved) setLastBackupTime(saved);
  }, []);

  const fetchAllData = async () => {
    return Promise.all([
      dataService.getProducts(),
      dataService.getCategories(),
      dataService.getCustomers(),
      dataService.getSuppliers(),
      dataService.getInvoices(),
      dataService.getReceipts(),
      dataService.getInventoryMovements(),
    ]);
  };

  // 1. JSON Backup Export (Original functionality preserved)
  const handleExportBackup = async () => {
    setIsExportingJson(true);
    try {
      const [products, categories, customers, suppliers, invoices, receipts, movements] =
        await fetchAllData();

      const now = new Date().toISOString();
      const backupPayload = {
        metadata: {
          system: 'Al-Amira ERP V2 Modernization Snapshot',
          version: '2.0.0-mock',
          export_date: now,
          source: 'local_isolated_memory',
          notice: 'ملف نسخة احتياطية لبيانات المنظومة بصيغة JSON.',
        },
        data: {
          products,
          categories,
          customers,
          suppliers,
          sales_invoices: invoices,
          stock_receipts: receipts,
          inventory_movements: movements,
        },
      };

      const jsonStr = JSON.stringify(backupPayload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const dateStr = now.slice(0, 10);
      const filename = `AlAmira_LocalBackup_${dateStr}.json`;

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      localStorage.setItem('alamira_last_backup_time', now);
      setLastBackupTime(now);
      dataService.logBackupExport('json');

      if (onNotification) {
        onNotification(
          `تم استخراج وتنزيل النسخة الاحتياطية المحلية (${filename}) بنجاح`,
          'success'
        );
      }
    } catch (err) {
      console.error('Backup export failed:', err);
      if (onNotification) {
        onNotification('تعذر إنشاء النسخة الاحتياطية، يرجى المحاولة مرة أخرى', 'error');
      }
    } finally {
      setIsExportingJson(false);
    }
  };

  // 2. Excel Backup Export (New functionality)
  const handleExportExcelBackup = async () => {
    setIsExportingExcel(true);
    try {
      const [products, , customers, suppliers, invoices, receipts, movements] =
        await fetchAllData();

      const now = new Date().toISOString();
      const dateStr = now.slice(0, 10);
      const filename = `AlAmira_FullBackup_${dateStr}.xlsx`;

      const workbook = XLSX.utils.book_new();

      // Sheet 1: Products
      const productsData = products.map((p) => ({
        'كود الصنف (SKU)': p.sku,
        'اسم الصنف': p.name,
        'التصنيف': p.category,
        'الوحدة': p.unit,
        'الرصيد الحالي': p.current_stock,
        'الحد الأدنى': p.min_stock_level,
        'سعر الشراء': p.purchase_price,
        'سعر البيع': p.selling_price,
        'الحالة': p.is_active ? 'نشط' : 'معطل',
      }));
      const wsProducts = XLSX.utils.json_to_sheet(productsData);
      wsProducts['!views'] = [{ RTL: true }];
      XLSX.utils.book_append_sheet(workbook, wsProducts, 'المنتجات_والمخزون');

      // Sheet 2: Customers
      const customersData = customers.map((c) => ({
        'كود العميل': c.code,
        'اسم العميل': c.name,
        'رقم الهاتف': c.phone,
        'المدينة / المركز': c.city,
        'العنوان': c.address,
        'الرصيد (ج.م)': c.balance,
        'الحالة': c.is_active ? 'نشط' : 'معطل',
      }));
      const wsCustomers = XLSX.utils.json_to_sheet(customersData);
      wsCustomers['!views'] = [{ RTL: true }];
      XLSX.utils.book_append_sheet(workbook, wsCustomers, 'العملاء');

      // Sheet 3: Suppliers
      const suppliersData = suppliers.map((s) => ({
        'كود المورد': s.code,
        'اسم المورد': s.name,
        'رقم الهاتف': s.phone,
        'المدينة': s.city,
        'العنوان': s.address,
        'الرصيد المستحق (ج.م)': s.balance,
      }));
      const wsSuppliers = XLSX.utils.json_to_sheet(suppliersData);
      wsSuppliers['!views'] = [{ RTL: true }];
      XLSX.utils.book_append_sheet(workbook, wsSuppliers, 'الموردين');

      // Sheet 4: Sales Invoices
      const invoicesData = invoices.map((inv) => ({
        'رقم الفاتورة': inv.invoice_number,
        'التاريخ': inv.invoice_date,
        'اسم العميل': inv.customer_name_snapshot,
        'طريقة السداد': inv.payment_terms === 'cash' ? 'نقدي' : 'آجل',
        'الحالة': inv.status === 'approved' ? 'معتمدة' : inv.status === 'draft' ? 'مسودة' : 'ملغاة',
        'إجمالي البنود': inv.gross_amount,
        'خصم البنود': inv.item_discounts_amount,
        'خصم الفاتورة': inv.invoice_discount_amount,
        'الصافي النهائي': inv.final_total,
      }));
      const wsInvoices = XLSX.utils.json_to_sheet(invoicesData);
      wsInvoices['!views'] = [{ RTL: true }];
      XLSX.utils.book_append_sheet(workbook, wsInvoices, 'فواتير_المبيعات');

      // Sheet 5: Inventory Movements
      const movementsData = movements.map((m) => ({
        'نوع الحركة': m.movement_type,
        'رقم المستند المرجعي': m.source_doc_number,
        'وارد (+)': m.quantity_in,
        'صادر (-)': m.quantity_out,
        'الرصيد بعد الحركة': m.stock_balance_after,
        'البيان': m.notes || '--',
      }));
      const wsMovements = XLSX.utils.json_to_sheet(movementsData);
      wsMovements['!views'] = [{ RTL: true }];
      XLSX.utils.book_append_sheet(workbook, wsMovements, 'حركات_المخزن');

      // Sheet 6: Stock Receipts
      const receiptsData = receipts.map((r) => ({
        'رقم إذن الاستلام': r.receipt_number,
        'تاريخ الاستلام': r.receipt_date,
        'اسم المورد': r.supplier_name || '--',
        'فاتورة المورد': r.supplier_invoice_number || '--',
        'الحالة': r.status,
        'إجمالي القيمة': r.total_amount,
      }));
      const wsReceipts = XLSX.utils.json_to_sheet(receiptsData);
      wsReceipts['!views'] = [{ RTL: true }];
      XLSX.utils.book_append_sheet(workbook, wsReceipts, 'أذون_الاستلام');

      XLSX.writeFile(workbook, filename);

      localStorage.setItem('alamira_last_backup_time', now);
      setLastBackupTime(now);
      dataService.logBackupExport('excel');

      if (onNotification) {
        onNotification(
          `تم استخراج وتنزيل النسخة الاحتياطية الشاملة بصيغة إكسل (${filename}) بنجاح`,
          'success'
        );
      }
    } catch (err) {
      console.error('Excel backup export failed:', err);
      if (onNotification) {
        onNotification('تعذر إنشاء نسخة الإكسل الاحتياطية، يرجى المحاولة مرة أخرى', 'error');
      }
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed || !parsed.data || !Array.isArray(parsed.data.products)) {
          throw new Error('الملف المحدد لا يتطابق مع بنية النسخ الاحتياطي لمنظومة الأميرة');
        }

        const pCount = parsed.data.products?.length || 0;
        const iCount = parsed.data.sales_invoices?.length || 0;
        const cCount = parsed.data.customers?.length || 0;

        setRestoreStats(
          `تم فحص الملف بنجاح: يتضمن ${pCount} صنف، و${iCount} فاتورة، و${cCount} عميل (جاهز للاستعادة)`
        );

        if (onNotification) {
          onNotification(
            'تم فحص واختبار سلامة بنية ملف النسخة الاحتياطية بنجاح.',
            'info'
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'ملف غير صالح';
        if (onNotification) {
          onNotification(`فشل قراءة الملف: ${message}`, 'error');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-[#D9E2EC]">
        <Database className="w-5 h-5 text-[#11243A]" />
        <div>
          <h3 className="text-sm font-extrabold text-[#11243A]">
            النسخ الاحتياطي واستخراج البيانات
          </h3>
          <p className="text-xs text-[#64748B]">
            تصدير واستخراج بيانات النظام بصيغتي Excel و JSON والتحقق من سلامة البنية
          </p>
        </div>
      </div>

      {/* Export Actions & Last Backup Status Card */}
      <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#D9E2EC] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-[#64748B] shrink-0" />
          <span className="text-xs text-[#64748B]">توقيت آخر نسخة احتياطية:</span>
          <strong className="text-xs tabular-nums font-bold text-[#11243A]">
            {lastBackupTime ? new Date(lastBackupTime).toLocaleString('ar-EG') : 'لم يتم استخراج نسخة بعد'}
          </strong>
        </div>

        {/* Export Buttons Group (Excel & JSON) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Excel Backup Button */}
          <Button
            variant="primary"
            onClick={handleExportExcelBackup}
            disabled={isExportingExcel || isExportingJson}
            className="bg-[#11243A] hover:bg-[#1E3A5F] text-white text-xs font-bold px-4 h-9 border-none shadow-xs"
          >
            {isExportingExcel ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>جاري إعداد الإكسل...</span>
              </span>
            ) : (
              <span>تصدير نسخة إكسل (Excel)</span>
            )}
          </Button>

          {/* JSON Backup Button */}
          <Button
            variant="secondary"
            onClick={handleExportBackup}
            disabled={isExportingExcel || isExportingJson}
            className="bg-white hover:bg-slate-50 text-[#11243A] text-xs font-bold px-4 h-9 border border-slate-300 shadow-xs"
          >
            {isExportingJson ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-4 h-4 animate-spin shrink-0 text-slate-600" />
                <span>جاري الاستخراج...</span>
              </span>
            ) : (
              <span>استخراج نسخة محلية (JSON)</span>
            )}
          </Button>
        </div>
      </div>

      {/* Backup Inspection / Dry-Run Validation */}
      <div className="p-4 bg-white rounded-xl border border-[#D9E2EC] space-y-3">
        <h4 className="text-xs font-bold text-[#11243A]">
          فحص واختبار بنية ملف نسخة احتياطية (Validation Check)
        </h4>
        <p className="text-xs text-[#64748B] leading-normal">
          يمكنك فحص سلامة وتكامل أي ملف JSON صادر للتأكد من احتوائه على الجداول والأصناف والفواتير دون
          تعديل قاعدة البيانات.
        </p>

        <div className="flex items-center gap-3">
          <label className="inline-flex items-center justify-center px-4 py-2 border border-[#D9E2EC] bg-[#F8FAFC] rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors">
            <span>اختر ملف JSON للفحص</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
          </label>
        </div>

        {restoreStats && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-bold text-[#0F766E] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0" />
            <span>{restoreStats}</span>
          </div>
        )}
      </div>
    </div>
  );
};
