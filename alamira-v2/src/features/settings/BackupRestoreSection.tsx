import React, { useState, useEffect } from 'react';
import { Database, Download, Upload, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { mockDataService } from '../../services/mockDataService';

interface BackupRestoreSectionProps {
  onNotification?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const BackupRestoreSection: React.FC<BackupRestoreSectionProps> = ({
  onNotification,
}) => {
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [restoreStats, setRestoreStats] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('alamira_last_backup_time');
    if (saved) setLastBackupTime(saved);
  }, []);

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const [products, categories, customers, suppliers, invoices, receipts, movements] =
        await Promise.all([
          mockDataService.getProducts(),
          mockDataService.getCategories(),
          mockDataService.getCustomers(),
          mockDataService.getSuppliers(),
          mockDataService.getInvoices(),
          mockDataService.getReceipts(),
          mockDataService.getInventoryMovements(),
        ]);

      const now = new Date().toISOString();
      const backupPayload = {
        metadata: {
          system: 'Al-Amira ERP V2 Modernization Snapshot',
          version: '2.0.0-mock',
          export_date: now,
          source: 'local_isolated_memory',
          notice:
            'هذا الملف يمثل لقطة بيانات محلية تجريبية ولا يُعد بديلاً عن النسخ الاحتياطي السحابي الخادم (PostgreSQL Dump).',
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

      if (onNotification) {
        onNotification(
          `تم استخراج وتنزيل النسخة الاحتياطية المحلية (${filename}) بنجاح`,
          'success'
        );
      }
    } catch (err) {
      console.error('Backup export error:', err);
      if (onNotification) {
        onNotification('فشل استخراج ملف النسخة الاحتياطية', 'error');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (!parsed.metadata || !parsed.data) {
          throw new Error('الملف المحدد لا يتطابق مع بنية النسخ الاحتياطي لمنظومة الأميرة');
        }

        const prodsCount = parsed.data.products?.length || 0;
        const invsCount = parsed.data.sales_invoices?.length || 0;
        const custsCount = parsed.data.customers?.length || 0;

        setRestoreStats(
          `تم فحص الملف بنجاح: يتضمن ${prodsCount} صنف، و${invsCount} فاتورة، و${custsCount} عميل.`
        );

        if (onNotification) {
          onNotification(
            'تم فحص واختبار سلامة بنية ملف النسخة الاحتياطية بنجاح دون أي مساس بقواعد الإنتاج.',
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
      <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
        <Database className="w-5 h-5 text-emerald-600" />
        <div>
          <h3 className="text-sm font-extrabold text-[#0a192f]">
            النسخ الاحتياطي واستخراج البيانات
          </h3>
          <p className="text-xs text-slate-500">
            تصدير واستخراج بيانات النظام المحلية والتحقق من سلامة البنية
          </p>
        </div>
      </div>

      {/* Safety Alert Disclaimer */}
      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <strong className="block font-bold mb-0.5">ضوابط السلامة المعمارية:</strong>
          تصدير النسخ الاحتياطية هنا يعمل في بيئة الذاكرة المحلية المعزولة (Isolated Mock Environment)
          ولا يُعد بديلاً عن النسخ الاحتياطي السحابي التلقائي لقاعدة بيانات PostgreSQL الإنتاجية. المنظومة
          محمية بالكامل ولا تطلب أي مفاتيح سرية أو صلاحيات خادم.
        </div>
      </div>

      {/* Status Card */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-slate-500" />
          <span className="text-xs text-slate-600">توقيت آخر نسخة احتياطية محلية:</span>
          <strong className="text-xs font-mono font-bold text-[#0a192f]">
            {lastBackupTime ? new Date(lastBackupTime).toLocaleString('ar-EG') : 'لم يتم استخراج نسخة بعد'}
          </strong>
        </div>

        <Button
          variant="primary"
          onClick={handleExportBackup}
          disabled={isExporting}
          className="bg-[#0a192f] hover:bg-[#0f2b5c] text-white gap-2 text-xs font-bold"
        >
          <Download className="w-3.5 h-3.5 text-[#d4af37]" />
          <span>{isExporting ? 'جاري الاستخراج...' : 'استخراج نسخة محلية (JSON)'}</span>
        </Button>
      </div>

      {/* Backup Inspection / Dry-Run Validation */}
      <div className="p-4 bg-white rounded-xl border border-slate-200/80 space-y-3">
        <h4 className="text-xs font-bold text-slate-800">
          فحص واختبار بنية ملف نسخة احتياطية (Validation Check)
        </h4>
        <p className="text-xs text-slate-500 leading-normal">
          يمكنك فحص سلامة وتكامل أي ملف JSON صادر للتأكد من احتوائه على الجداول والأصناف والفواتير دون
          تعديل قاعدة البيانات.
        </p>

        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5 text-slate-500" />
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
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{restoreStats}</span>
          </div>
        )}
      </div>
    </div>
  );
};
