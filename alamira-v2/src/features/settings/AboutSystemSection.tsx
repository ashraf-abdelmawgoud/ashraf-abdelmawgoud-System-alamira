import React from 'react';
import { Info, ShieldCheck, CheckCircle } from 'lucide-react';

export const AboutSystemSection: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
        <Info className="w-5 h-5 text-emerald-600" />
        <div>
          <h3 className="text-sm font-extrabold text-[#0a192f]">
            حول منظومة الأميرة ERP V2 المطورة
          </h3>
          <p className="text-xs text-slate-500">
            الجيل الثاني من نظام إدارة المبيعات، المخازن، والعمليات التجارية
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-4 bg-white rounded-xl border border-slate-200/80 space-y-2">
          <span className="text-[11px] font-bold text-slate-400 block">إصدار المنظومة الحالية</span>
          <strong className="text-sm text-[#0a192f] font-mono block">
            Al-Amira ERP V2.0.0 (Modern React 19 + TypeScript)
          </strong>
          <p className="text-slate-600 leading-relaxed">
            تمت إعادة بناء الواجهات والمنطق المحاسبي وفق أحدث معايير هندسة البرمجيات لتوفير تجربة
            مستخدم فائقة السرعة، استجابة تامة للهواتف، وطباعة معيارية للمستندات.
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/80 space-y-2">
          <span className="text-[11px] font-bold text-slate-400 block">حالة العزل وسلامة الإنتاج</span>
          <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>بيئة تطوير معزولة محلياً (Zero-Risk Architecture)</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            المنظومة الحية V1 وقاعدة بيانات Supabase محمية بنسبة 100% ولا يتم الاتصال بها أو تعديل
            جداولها خلال هذه المرحلة.
          </p>
        </div>
      </div>

      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
        <h4 className="text-xs font-bold text-slate-800 mb-2">المراحل المنجزة في الإصدار الثاني:</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>المرحلة 1: التأسيس المعماري، الهوية الزمردية، ولوحة المؤشرات</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>المرحلة 2: إدارة الأصناف، العملاء، والموردين</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>المرحلة 3A: أذون الاستلام، الصرف، والتسويات الجردية</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>المرحلة 3B: منشئ فواتير المبيعات ودورة حياة الفاتورة</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>المرحلة 3C: طباعة الفواتير A4 وتصدير صور PNG عالية الدقة</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>المرحلة 4: التقارير المتكاملة، التحليلات، تصدير الإكسل، والإعدادات</span>
          </div>
        </div>
      </div>
    </div>
  );
};
