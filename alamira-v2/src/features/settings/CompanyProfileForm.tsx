import React, { useState, useEffect } from 'react';
import { Building2, Save, RotateCcw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { CompanyProfile, OFFICIAL_COMPANY_PROFILE_DEFAULT } from './types';

interface CompanyProfileFormProps {
  onSaveNotification?: (msg: string) => void;
}

export const CompanyProfileForm: React.FC<CompanyProfileFormProps> = ({
  onSaveNotification,
}) => {
  const [profile, setProfile] = useState<CompanyProfile>(OFFICIAL_COMPANY_PROFILE_DEFAULT);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('alamira_company_profile');
      if (saved) {
        setProfile(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Could not read saved profile:', e);
    }
  }, []);

  const handleChange = (field: keyof CompanyProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('alamira_company_profile', JSON.stringify(profile));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
    if (onSaveNotification) {
      onSaveNotification('تم حفظ بيانات وهوية المنشأة بنجاح في الإعدادات المحلية');
    }
  };

  const handleReset = () => {
    setProfile(OFFICIAL_COMPANY_PROFILE_DEFAULT);
    localStorage.setItem(
      'alamira_company_profile',
      JSON.stringify(OFFICIAL_COMPANY_PROFILE_DEFAULT)
    );
    if (onSaveNotification) {
      onSaveNotification('تمت استعادة الهوية الرسمية المعتمدة لشركة الأميرة');
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-emerald-600" />
          <div>
            <h3 className="text-sm font-extrabold text-[#0a192f]">بيانات وهوية المنشأة الرسمية</h3>
            <p className="text-xs text-slate-500">
              تظهر هذه البيانات تلقائياً في ترويسات الفواتير، التقارير، والبانرات الرسمية
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg font-bold cursor-pointer transition-colors"
          title="استعادة القيم الرسمية الافتراضية"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>استعادة الهوية الرسمية</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            اسم المنشأة / الشركة <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={profile.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full h-9.5 px-3 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            النشاط التجاري والمهني
          </label>
          <input
            type="text"
            value={profile.activity}
            onChange={(e) => handleChange('activity', e.target.value)}
            className="w-full h-9.5 px-3 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            العنوان الرئيسي المقر <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={profile.address}
            onChange={(e) => handleChange('address', e.target.value)}
            className="w-full h-9.5 px-3 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            رقم الهاتف والتواصل الرسمي
          </label>
          <input
            type="text"
            value={profile.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className="w-full h-9.5 px-3 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            رقم السجل التجاري
          </label>
          <input
            type="text"
            value={profile.commercial_reg}
            onChange={(e) => handleChange('commercial_reg', e.target.value)}
            className="w-full h-9.5 px-3 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            رقم البطاقة / التسجيل الضريبي
          </label>
          <input
            type="text"
            value={profile.tax_id}
            onChange={(e) => handleChange('tax_id', e.target.value)}
            className="w-full h-9.5 px-3 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">
          شعار / الملاحظة الختامية للوثائق الرسمية
        </label>
        <textarea
          rows={2}
          value={profile.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          className="w-full p-2.5 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="pt-2 flex items-center justify-between">
        {savedSuccess && (
          <span className="text-xs text-emerald-700 font-bold animate-in fade-in">
            ✓ تم حفظ البيانات بنجاح
          </span>
        )}
        <div className="mr-auto">
          <Button
            type="submit"
            variant="primary"
            className="bg-[#0a192f] hover:bg-[#0f2b5c] text-white gap-2 text-xs font-bold px-5"
          >
            <Save className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>حفظ إعدادات الهوية</span>
          </Button>
        </div>
      </div>
    </form>
  );
};
