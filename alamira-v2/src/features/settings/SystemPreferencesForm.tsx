import React, { useState, useEffect } from 'react';
import { Sliders } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { SystemPreferences, DEFAULT_PREFERENCES } from './types';
import { dataService } from '@/services/dataService';

interface SystemPreferencesFormProps {
  onSaveNotification?: (msg: string) => void;
}

export const SystemPreferencesForm: React.FC<SystemPreferencesFormProps> = ({
  onSaveNotification,
}) => {
  const [prefs, setPrefs] = useState<SystemPreferences>(DEFAULT_PREFERENCES);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('alamira_system_preferences');
      if (saved) setPrefs(JSON.parse(saved));
    } catch (e) {
      console.warn('Could not read saved preferences:', e);
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('alamira_system_preferences', JSON.stringify(prefs));
    dataService.logSettingsUpdate('system_preferences', 'تفضيلات النظام والتشغيل', {
      defaultPaymentTerms: prefs.defaultPaymentTerms,
      currencySymbol: prefs.currencySymbol,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
    if (onSaveNotification) {
      onSaveNotification('تم حفظ تفضيلات النظام والتشغيل بنجاح');
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
        <Sliders className="w-5 h-5 text-emerald-600" />
        <div>
          <h3 className="text-sm font-extrabold text-[#0a192f]">تفضيلات التشغيل والواجهة</h3>
          <p className="text-xs text-slate-500">
            تخصيص السلوك الافتراضي لمنشئ الفواتير ومؤشرات النواقص بالمخزن
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            طريقة السداد الافتراضية للفواتير
          </label>
          <select
            value={prefs.defaultPaymentTerms}
            onChange={(e) =>
              setPrefs((prev) => ({
                ...prev,
                defaultPaymentTerms: e.target.value as 'cash' | 'credit',
              }))
            }
            className="w-full h-9.5 px-3 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          >
            <option value="cash">سداد نقدي فوري (Cash)</option>
            <option value="credit">سداد آجل / حساب عميل (Credit)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            الحد الأدنى الافتراضي لتنبيهات المخزون
          </label>
          <input
            type="number"
            min={1}
            max={100}
            value={prefs.lowStockThreshold}
            onChange={(e) =>
              setPrefs((prev) => ({
                ...prev,
                lowStockThreshold: Number(e.target.value) || 5,
              }))
            }
            className="w-full h-9.5 px-3 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 tabular-nums font-semibold"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            رمز العملة الوطنية المعروضة
          </label>
          <input
            type="text"
            value={prefs.currencySymbol}
            disabled
            className="w-full h-9.5 px-3 border border-slate-200 rounded-lg text-xs text-slate-500 bg-slate-100 font-bold cursor-not-allowed"
          />
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            معتمد وفقاً للجنيه المصري (EGP / ج.م)
          </span>
        </div>

        <div className="flex items-center pt-5">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-bold select-none">
            <input
              type="checkbox"
              checked={prefs.allowDecimalsForMetric}
              onChange={(e) =>
                setPrefs((prev) => ({
                  ...prev,
                  allowDecimalsForMetric: e.target.checked,
                }))
              }
              className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500"
            />
            <span>السماح بإدخال كميات كسرية للأصناف المترية والوزنية (3 خانات)</span>
          </label>
        </div>
      </div>

      <div className="pt-2 flex items-center justify-between">
        {savedSuccess && (
          <span className="text-xs text-emerald-700 font-bold animate-in fade-in">
            ✓ تم حفظ التفضيلات بنجاح
          </span>
        )}
        <div className="mr-auto">
          <Button
            type="submit"
            variant="primary"
            className="bg-[#11243A] hover:bg-[#1E3A5F] text-white text-xs font-bold px-5"
          >
            <span>حفظ التفضيلات</span>
          </Button>
        </div>
      </div>
    </form>
  );
};
